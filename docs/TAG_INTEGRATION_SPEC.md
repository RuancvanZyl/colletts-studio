# Tag tracking: what the Apex app needs from the tag system

For the developer building the Bluetooth (BLE) tags and gateways. One page, so the two systems can connect at handover.

## The idea
Every trophy part carries a BLE tag. Gateways in the workshop read the tags automatically. The Apex app shows where each part is, and clients who want it can see the location.

## What we need from the tag system (any of these two ways, in order of preference)

### A. It sends Apex an event whenever a tag moves (preferred)
One HTTPS POST per change of place, to an Apex address we give you:

```
POST https://<apex>/functions/v1/tag-event
Authorization: Bearer <workshop key>        (one secret key per workshop)
{
  "event_id":   "unique id, so a retry is not counted twice",
  "tag_id":     "the tag's own id (MAC or serial)",
  "zone":       "name of the place the gateway covers, e.g. Tannery",
  "gateway_id": "which gateway saw it",
  "seen_at":    "2026-11-05T14:20:00Z",
  "signal":     -62,
  "battery":    87
}
```
- Send only a change of zone (and one "still here" per tag every 15 minutes), not every raw reading.
- Retry until we answer 200. Keep readings while the internet is down and send them later.
- Also send "tag lost" (not seen for N minutes) and "battery low".

### B. Or: Apex reads from it
A read-only address that returns, per tag: current zone, last seen, battery. Plus a list of zones and gateways.

### C. Fallback: a link
If neither is possible in time, Apex shows a "See live location" button that opens the tag system for that trophy (`https://<tag-system>/part/<tag_id>`), signed in automatically. Works, but staff and clients leave the app.

## Pairing a tag to a trophy part
- Each part already has a printed QR label with a code. Pairing = scan the part's QR and the tag in one step ("This tag is this skull").
- We need: a way to give each tag a name we can match (tag id printed on or readable from the tag), and the same id in every event.
- Tags are reused: a tag is released when the trophy ships and can be paired again.

## Zones
A short list per workshop that the owner can rename: Receiving, Fleshing, Salting, Tannery, Mounting, Finishing, Packing, Shipping. Each gateway belongs to one zone. We map zone names to job-card stations.

## Several workshops
The app will serve many workshops. Every event must carry the workshop (one key per workshop) so one workshop never sees another's tags.

## Questions for the developer
1. Who owns the code and hardware designs after handover, and where is it hosted and by whom?
2. Which of A, B or C can you deliver, and when?
3. How accurate is the location: just which zone, or a position inside it?
4. Battery life, range, and what a gateway costs. What happens if a gateway is offline?
5. Is there documentation we can keep, and a test setup we can try before handover?
6. Who supports it after handover, and at what cost?
