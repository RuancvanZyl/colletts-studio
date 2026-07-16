# Race-day offline mode

Beach venues often have weak or no signal. This platform normally talks to
your cloud Supabase project over the internet — on race day, instead, you
run the **exact same database and app locally** on a laptop, and every
scanning station/tablet talks to that laptop over a local WiFi network that
needs no internet at all. Afterward, once you're back on signal, you sync
the race-day data up to your permanent cloud project.

This works because the local stack (via the Supabase CLI) is the same
Postgres + API + Realtime engine as the cloud project, running the same
migrations — nothing in the app needs to know which one it's talking to.

## What you need on-site

- **One laptop** to act as the venue "server" (needs Docker installed).
- **A travel WiFi router** (or the laptop's own WiFi hotspot) creating a
  local network — it does **not** need an internet uplink, only to let
  devices talk to each other.
- Tablets/phones for each scanning station, all joined to that network.

## 1. Before you lose signal (setup week, or race morning while still online)

Pull all pre-registered swimmers, races, and chip assignments down from the
cloud project to the laptop:

```bash
export PATH=~/.npm-global/bin:$PATH
cd swim-meet
npx supabase start          # first run downloads Docker images — do this
                             # well before race day, not at the venue
npx supabase db push        # applies supabase/migrations/ to the local DB

LOCAL_DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
CLOUD_DB_URL="<your cloud project's connection string, from Supabase dashboard → Settings → Database>" \
pnpm race:pull
```

`npx supabase start` prints a local API URL and anon key — copy those into
a `.env` file for race day:

```
VITE_SUPABASE_URL=http://<laptop-lan-ip>:54321
VITE_SUPABASE_ANON_KEY=<local anon key from `supabase start` output>
```

Use the laptop's **LAN IP** (e.g. `192.168.1.42`), not `127.0.0.1` — other
devices on the venue network need to reach it.

Build and serve the app from the laptop so tablets load it over the LAN:

```bash
pnpm build
pnpm preview --host --port 3002
```

Every station's browser then points at `http://<laptop-lan-ip>:3002`.

## 2. On race day (fully offline)

Everything — registration desk chip assignment, scan-in, start control,
finish scanning, the live results board — runs against the laptop over the
local network. No internet required for any of it.

## 3. After the race (back on signal)

Push the race-day results up to the cloud project permanently:

```bash
LOCAL_DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
CLOUD_DB_URL="<your cloud project's connection string>" \
pnpm race:push
```

This copies `scan_events`, `race_sessions`, and any `registrations` /
`timing_chips` changes made at the venue up to the cloud project — so the
public results board and CSV export at your normal production URL reflect
the race, and the data is safely stored for the long term.

## Rehearse this before race day

Run the full pull → local race → push cycle at least once with fake data a
few days before the event, not the morning of. Verify:
- the laptop's hotspot/router actually reaches every station's location at
  the venue (open water sites can have dead zones even on a local network)
- `pnpm race:push` runs cleanly with real cloud credentials
- the built app (`pnpm preview`) — not just `pnpm dev` — is what's running,
  since `preview` is much closer to how it'll behave under load
