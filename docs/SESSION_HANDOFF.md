
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
