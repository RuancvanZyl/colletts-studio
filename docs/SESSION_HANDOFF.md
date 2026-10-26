
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
