
## 2026-10-23 — Hunter onboarding + simplified arrival (migration 045)
- Arrival Check-In rewritten: find/create hunter → add animals with parts ticked (Skull, Cape, Back skin, Flat skin, Full skin, Feet, Tail, Tusks, Other) → save → print receiving sheet + welcome letter, send invite (WhatsApp / e-mail / copy), print QR labels. Animals are saved with mount "Pending Instructions"; the hunt is flagged awaiting instruction.
- Hunter: invitation link `/?invite=TOKEN` (InviteScreen) → profile → HunterTrophies (what was received, choose mounts via ChooseMounts, progress, photos). Mount stored by RPC `hunter_choose_mount`.
- Sign-up now links to the workshop-made client (invite token or same e-mail) instead of making a blank duplicate (`link_auth_user_to_client`, trigger `handle_new_auth_user`).
- Jobs with mount "Pending Instructions" cannot be moved on by workers (completeStage guard; Receiving keeps them in Receiving).
- Needs: run `supabase/launch/release_045_hunter_onboarding.sql`; deploy edge function `send-hunter-invite` (needs RESEND_API_KEY + verified sending domain for real e-mail; WhatsApp/copy work without).

## 2026-10-25 — Hunter collection, add-animals after the hunt, custom mounts, replicas (migration 046)
- Full African species catalogue with scientific names (`src/lib/species.ts`); colour variants (black springbok, golden wildebeest…) are a choice after the animal is picked — stored as "Springbok, Black", same scientific name and price.
- Hunter portal: "Add my animals" (only once the hunt has ended; enforced in `hunter_register_animals`), collectible card picker, My collection (life list, ranks, badges), pose choice (head direction + neck), prices shown, CUSTOM mount (description, reference photos, combine several animals into one) and REPLICA (type + reasons).
- Staff Arrival Check-In shows "expected" animals the hunter registered; tap "It arrived" and tick the parts instead of creating a duplicate.
- Needs: run `release_045_hunter_onboarding.sql` THEN `release_046_hunter_preregister.sql` in the Supabase SQL Editor.

## 2026-10-25 — Animal guide (migration 047)
- Hunters get a field-guide page for every animal (real photos, tracks, Roland Ward record, facts, hunting notes) from the "i" on picker cards, My collection cards, the mount chooser and a daily fact on My collection.
- Staff fill it in at Setup → Animal guide (admins only). Photos go to the public `species-guide` bucket; add the photographer in Credit. No content is pre-filled — Roland Ward figures must be copied exactly from the record book.
- Release script (044–047 combined, all run): supabase/launch/release_044_to_047_all.sql

## 2026-10-25 — Quote, payment and go-ahead (migration 048)
- Flow: hunter chooses mounts → Today shows "needs a quote" → manager prepares/sends the quote (Money → Quotes) → hunter accepts and chooses to pay a deposit or in full (or the workshop records their acceptance by phone/WhatsApp) → manager taps "Deposit paid" / "Fully paid" (pop-up confirms amount, method, date, reference) → work is authorised. A DB trigger holds animals of a quoted hunt in Receiving until then. Existing hunts are not affected (only hunts with a quote / hunter-registered animals / new check-ins).
- Money is recorded by hand today (works for companies without Xero). `quotes` and `quote_payments` already carry Xero fields (invoice id/number/url, xero_payment_id; `clients.xero_contact_id`); `apply_quote_payment` is the single place a payment lands, so a Xero webhook can call it later.
- Xero link NOT built yet: needs a Xero developer app (client id/secret as Supabase function secrets), the org's sales account code, multi-currency enabled for USD, and an Edge Function (OAuth, create invoice on acceptance, payment webhook).
- Fill in `PAYMENT_DETAILS` in src/lib/workshop.ts (bank details shown to hunters after they accept).
- Run supabase/launch/release_048_quotes.sql.

## 2026-10-25 — Management links (migration 049 + release flow)
- Payment (or an admin start) now starts the existing order timeline (milestones + deadline) via `start_timeline_if_needed`, dated from the day the payment was received (needs 034/035).
- Money → Quotes: once work is authorised, "Start the workshop flow" (also pops up right after a payment is recorded). `lib/releaseHunt.ts` turns the hunt's job cards into working cards: each animal leaves Receiving for its first department (pipelines added for Custom mount / combined / Replica), gets the order deadline as due date, a "received" stage-history entry, and the hunter is notified.
- Job cards and printouts now show scientific name, parts received, condition. Client profile has a Money tab; Money → Payments is a ledger (received this month, still owed, recent); job cards show "On hold" while a quoted hunt is unpaid; Today and the Whiteboard count quotes awaiting payment.
- Run supabase/launch/release_049_start_timeline.sql after 048.

## 2026-10-26 — Outfitter link (migration 050)
- Outfitters get an account tied to their `outfitters` row (invite link `/?invite=o_<token>`; self-registered ones start inactive until staff activate them). Management: Hunters → Outfitters (add/edit, status, commission %, invite via WhatsApp/e-mail/copy, their hunts and what they owe).
- Outfitter portal rewritten on real data: My hunts (animals + where each is, money totals only), Register a hunt (hunter, hunt dates, animals + tag numbers; never mounts — the hunter chooses those), Account. All reads/writes go through functions (`outfitter_overview`, `outfitter_register_hunt`, `outfitter_add_animals`).
- Registered animals arrive as "expected" job cards (awaiting_arrival, tag numbers kept) → Arrival Check-In "It arrived"; the hunter profile is created for them and invited when trophies arrive. Payments record who paid (hunter / outfitter / someone else); outfitter sees total, paid, outstanding and what they paid themselves.
- The `outfitters` table is now readable only by staff and the outfitter themselves.
- Run supabase/launch/release_050_outfitter_link.sql after 049 (and 049 after 048).

## 2026-10-26 — Documents and outfitter chat (migration 051)
- Every hunt gets a checklist of required documents (Setup → Required documents: name, who supplies it, export/local, signed/stamped). New hunts get it automatically via trigger; existing hunts use "Create the checklist" on Hunters → Documents. The list of real documents is still to be supplied by the workshop and loaded.
- A document only counts when staff tick correct, complete, signed (if needed) and stamped. Rejections carry a reason the outfitter/hunter sees. `guard_dispatch` blocks completing/dispatching a job card while required documents are not approved (hunts without a checklist are unaffected).
- Transparency: hunter portal shows "Documents for export" per hunt with wording naming the outfitter ("Waiting for X to send this"), and that the workshop is waiting too. Ready to ship shows "Cannot ship yet: N documents..." and Today lists documents to check, outfitter chat unread, hunts waiting on outfitters.
- Outfitter portal: Documents (upload per document, see rejections) and Messages (one thread per hunter, `outfitter_messages`). Staff side: Messages → Outfitters and a chat on each hunt's Documents page. This is the only chat besides the existing team/hunter ones; hunter-to-outfitter chat is deliberately not built.
- Files go to the private `hunt-documents` bucket (folder = hunt id), opened via signed links.
- Run supabase/launch/release_051_documents_chat.sql after 050.

## 2026-10-26 — Documents per province (migration 052)
- The workshop's list is province-based. Each hunt has a `province` (outfitter picks it when registering; staff set it on Hunters → Documents → the hunt; hunters' own pre-registered hunts need staff to set it). Each document type has `provinces` (empty = every province). Changing a hunt's province swaps its untouched documents (never one that already has a file); a hunt with no province gets only the all-province documents and shows "Province needed" on the board.
- Loaded per the workshop's list: PH Register (all), Hunting rights / permission to hunt (LP, FS, KZN, NC), Hunting permit TOPS/CITES (LP, MP, FS, NW, KZN, EC, WC, GP), Sable permit (FS), Alien invasive species permit Barbary sheep (LP), P3 exemption (LP, NW, KZN), PH / HO licences (LP, NW, KZN, NC), Hunting licence (FS), Certificate of adequate fencing (FS), Game farm permit (NC). All outfitter-supplied, signed + stamped by default (adjust in Setup → Required documents).
- Open questions for the workshop: Northern Cape had a heading that read "VERIFICATION"; species-specific permits (sable, Barbary sheep) are listed for the whole province and marked "Not needed" per hunt when they do not apply; export documents (CITES export, vet certificate, dip and pack, invoices) were not in the list.
- Run supabase/launch/release_052_document_provinces.sql after 051.

## 2026-10-26 — Hunt register capture and cross-checks (migration 053)
- Real forms seen: the South African Professional Hunting Register and Trophy Export Application (fixed layout: province tick, PH / client / hunting outfitter blocks with permit numbers and signatures, then lines of farm, district, land owner, permit No., date killed, species, number, sex, parts to be exported) and the Collett's Trophy Receiving Sheet (parts: Skull, Cape, B/Skin, F/Skin = flat skin, FMT/Skin = full mount skin, Feet, Leg bones, Scrotum, Tail, Tusks, Panel, Other). Receiving parts list now includes Leg bones, Scrotum, Panel.
- Hunters → Documents → hunt → "Type in and check the hunt register": staff type the register in; the DB (`check_hunt_register`) lists every problem and the screen highlights it where it is. Checks: register no. unique; province matches the hunt; dates; PH and outfitter permit numbers vs the numbers on file for that year (Setup → Permit numbers: PH changes yearly, outfitter has one); signatures; each line complete; kill date inside the hunt; line permit numbers vs permits handed in (numbers typed per document); register vs receiving sheet (species/count, parts listed but not received, parts received but not on the register; species matched loosely, "Cape Kudu" = "Kudu"); other documents' PH/outfitter permit numbers vs the register.
- A problem can only be set aside with a recorded reason (`register_overrides`). The "PH Register" document cannot be approved while problems are open. Outfitters see the open problems on their Documents screen.
- Every document type can list "information that must be on it" (Setup → Required documents); staff tick each while checking and approval is blocked until all are ticked. New document "Receiving sheet (signed copy)" (workshop, switch off under Setup if unwanted). Board has a search box.
- Not built yet (stage 2): reading scans automatically (needs an Anthropic key in Supabase secrets and a deployed Edge Function; photos are sent to the AI service). Hunter ID / passport numbers are not stored beyond the passport number typed on the register.
- Run supabase/launch/release_053_hunt_register_checks.sql after 052 (and 051).

## 2026-10-26 — Outfitter-owned permit numbers and the AI reader (migration 054)
- Outfitters keep their own permit number and their professional hunters' numbers (one line per year) in the outfitter portal → Account. `registered_numbers` now has outfitter_id, verified_at/by, updated_at/by and a change log (`registered_number_history`). A number entered or changed by an outfitter is "not verified" until staff verify it against the permit itself (Setup → Permit numbers, or Today); a register using an unverified number shows an error and cannot be approved. Outfitters cannot delete numbers. Staff-entered numbers are verified automatically.
- AI reader: Edge Function `supabase/functions/read-document/index.ts` (staff only; reads the scan from the private bucket, calls the Anthropic Messages API with a forced tool call; model from secret DOC_AI_MODEL, default claude-sonnet-5-5; key in secret ANTHROPIC_API_KEY). "Read with AI" on a document: the register form is prefilled (uncertain fields outlined amber, AI notes shown), permit documents fill the numbers popup. Results stored in `hunt_requirements.ai_extracted`; AI notes also appear as warnings in the checks. Staff always confirm; the DB does the mismatch checks. NOT deployed by me (no Supabase CLI, and the key is the user's): deploy through the Supabase dashboard (Edge Functions → new function → paste code) and add the secret.
- Run supabase/launch/release_054_permit_profiles_and_ai.sql after 053.

## 2026-10-27 — Install the app from the invitation link
- `lib/install.ts` captures the browser's install offer at start-up (`beforeinstallprompt`) and detects iPhone Safari / other iOS browsers / Android / desktop. `shared/InstallApp.tsx`: `InstallCard` (one-tap Install on Android and desktop Chrome; Share → Add to Home Screen steps on iPhone; "open in Safari" help for other iOS browsers) and `InstallBanner` (slim reminder at the top of every portal until installed or dismissed for 14 days).
- Shown on the hunter invitation (details step and check-e-mail step), the outfitter invitation (new "You are in" step after the account is created), and in the hunter, local-hunter, outfitter and staff portals.
- Invitation messages (WhatsApp / copy / e-mail) and the `send-hunter-invite` e-mail now carry the install steps. WhatsApp sending is click-to-chat (staff taps send in WhatsApp); fully automatic WhatsApp would need the WhatsApp Business API through a provider.
- iPhone note: an installed app keeps its own saved sign-in, so the person signs in once inside the installed app (the card says so).
