#!/usr/bin/env node
/**
 * Bridges the local (venue, offline) Supabase Postgres and the cloud
 * Supabase Postgres, since the app runs against whichever one is closest
 * on race day and the two need to be reconciled around it:
 *
 *   pull  — run before you lose signal (setup week / morning of, while
 *           still online). Copies events/races/swimmers/registrations/chips
 *           DOWN from cloud to local, so the venue laptop has every
 *           pre-registered swimmer even with zero internet on race day.
 *
 *   push  — run once you're back on signal after the race. Copies
 *           scan_events, race_sessions, and any registrations/chips changed
 *           at the venue UP from local to cloud, so results and the audit
 *           trail end up in the permanent project.
 *
 * Usage:
 *   LOCAL_DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres \
 *   CLOUD_DB_URL=postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres \
 *   node scripts/sync-race-data.mjs pull
 */
import pg from 'pg';

const PULL_TABLES = ['events', 'age_groups', 'race_categories', 'swimmers', 'registrations', 'timing_chips'];
const PUSH_TABLES = ['swimmers', 'registrations', 'timing_chips', 'race_sessions', 'scan_events'];

const direction = process.argv[2];
if (direction !== 'pull' && direction !== 'push') {
  console.error('Usage: node sync-race-data.mjs <pull|push>');
  process.exit(1);
}

const localUrl = process.env.LOCAL_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const cloudUrl = process.env.CLOUD_DB_URL;
if (!cloudUrl) {
  console.error('Set CLOUD_DB_URL to your cloud project\'s connection string (Supabase dashboard → Settings → Database).');
  process.exit(1);
}

const [sourceUrl, targetUrl] = direction === 'pull' ? [cloudUrl, localUrl] : [localUrl, cloudUrl];
const tables = direction === 'pull' ? PULL_TABLES : PUSH_TABLES;

const source = new pg.Client({ connectionString: sourceUrl });
const target = new pg.Client({ connectionString: targetUrl });

async function columnsFor(client, table) {
  const { rows } = await client.query(
    `select column_name from information_schema.columns where table_schema = 'public' and table_name = $1 order by ordinal_position`,
    [table],
  );
  return rows.map((r) => r.column_name);
}

async function syncTable(table) {
  const cols = await columnsFor(source, table);
  const { rows } = await source.query(`select ${cols.map((c) => `"${c}"`).join(', ')} from ${table}`);
  if (rows.length === 0) {
    console.log(`  ${table}: nothing to sync`);
    return;
  }

  const colList = cols.map((c) => `"${c}"`).join(', ');
  const updateList = cols.filter((c) => c !== 'id').map((c) => `"${c}" = excluded."${c}"`).join(', ');

  let count = 0;
  for (const row of rows) {
    const values = cols.map((c) => row[c]);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
    await target.query(
      `insert into ${table} (${colList}) values (${placeholders})
       on conflict (id) do update set ${updateList}`,
      values,
    );
    count++;
  }
  console.log(`  ${table}: synced ${count} row(s)`);
}

async function main() {
  await source.connect();
  await target.connect();
  console.log(`Syncing ${direction.toUpperCase()}: ${tables.join(', ')}`);
  for (const table of tables) {
    await syncTable(table);
  }
  await source.end();
  await target.end();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
