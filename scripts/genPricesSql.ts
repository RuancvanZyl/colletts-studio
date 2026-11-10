// Writes the SQL that loads the price list into the database (migration 075), from the same data the screens use.
// Run: node scripts/genPricesSql.ts > /tmp/prices.sql   (a unit test checks the migration still matches this)
import { SPECIES } from '../src/lib/species.ts';
import { mountsFor, MOUNT_OPTIONS } from '../src/lib/pricing.ts';

export function priceRows(): string[] {
  const rows: string[] = [];
  const names = new Set<string>();
  for (const s of SPECIES) { names.add(s.name); for (const a of s.aliases ?? []) names.add(a); }
  for (const name of [...names].sort()) {
    for (const type of ['export', 'local']) {
      for (const m of mountsFor(name, type)) {
        if (m.price && !m.special) rows.push(`('${name.replace(/'/g, "''")}','${m.name.replace(/'/g, "''")}','${type}',${m.price})`);
      }
    }
  }
  return rows;
}
if (process.argv[1]?.endsWith('genPricesSql.ts')) {
  const rows = priceRows();
  console.log(`insert into mount_prices (species, mount, client_type, price) values\n${rows.join(',\n')}\non conflict (species, mount, client_type) do update set price = excluded.price;`);
  console.error(rows.length + ' rows, ' + MOUNT_OPTIONS.length + ' mount types');
}
