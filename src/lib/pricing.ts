/**
 * Mount options and price lists (2026) — one place, used by the workshop and by the hunter's mount choice.
 * Export prices are USD, local prices are ZAR (VAT exclusive). 0 / missing = not offered for that animal.
 */

export const SPECIES_LIST = [
  'Baboon','Blesbok','Bontebok','Buffalo','Bushbuck','Bushpig','Caracal','Civet','Crocodile',
  'Duiker','Eland','Elephant','Fallow Deer','Gemsbok','Genet Cat','Giraffe','Grysbok',
  'Hartebeest','Hippo','Hyena','Impala','Jackal','Klipspringer','Kudu','Lechwe','Leopard',
  'Lion','Nguni','Nyala','Oribi','Ostrich','Reedbuck (Common)','Reedbuck (Mountain)',
  'Reedbuck (Vaal)','Sable','Serval','Springbok','Steenbok','Tsessebe','Warthog','Waterbuck',
  'Wild Cat','Wildebeest (Black)','Wildebeest (Blue)','Vervet Monkey','Zebra','Other',
];

// 2026 Export USD prices — from SA Price List 2026.xlsx (Export Prices folder)
export const EXPORT_PRICE_DATA: Record<string, Record<string, number>> = {
  'Baboon':              { shoulder: 695,  offset_shoulder: 800,  pedestal: 830,  full_mount: 1500,  euro_skull: 210, bleach_only: 130 },
  'Blesbok':             { shoulder: 755,  offset_shoulder: 870,  pedestal: 900,  full_mount: 2540,  euro_skull: 235, bleach_only: 130 },
  'Buffalo':             { shoulder: 1390, offset_shoulder: 1595, pedestal: 1665, full_mount: 0,     euro_skull: 395, bleach_only: 230 },
  'Bushbuck':            { shoulder: 695,  offset_shoulder: 800,  pedestal: 830,  full_mount: 1620,  euro_skull: 235, bleach_only: 130 },
  'Bushpig':             { shoulder: 695,  offset_shoulder: 800,  pedestal: 725,  full_mount: 1620,  euro_skull: 315, bleach_only: 200 },
  'Caracal':             { shoulder: 0,    offset_shoulder: 0,    pedestal: 0,    full_mount: 1130,  euro_skull: 175, bleach_only: 95  },
  'Civet':               { shoulder: 0,    offset_shoulder: 0,    pedestal: 0,    full_mount: 925,   euro_skull: 175, bleach_only: 95  },
  'Duiker':              { shoulder: 555,  offset_shoulder: 640,  pedestal: 585,  full_mount: 1130,  euro_skull: 175, bleach_only: 95  },
  'Eland':               { shoulder: 1155, offset_shoulder: 1330, pedestal: 1390, full_mount: 13860, euro_skull: 355, bleach_only: 210 },
  'Elephant':            { shoulder: 15750,offset_shoulder: 0,    pedestal: 0,    full_mount: 0,     euro_skull: 0,   bleach_only: 925 },
  'Fallow Deer':         { shoulder: 695,  offset_shoulder: 800,  pedestal: 830,  full_mount: 2890,  euro_skull: 235, bleach_only: 130 },
  'Gemsbok':             { shoulder: 1040, offset_shoulder: 1195, pedestal: 1250, full_mount: 3700,  euro_skull: 335, bleach_only: 210 },
  'Genet Cat':           { shoulder: 0,    offset_shoulder: 0,    pedestal: 0,    full_mount: 870,   euro_skull: 160, bleach_only: 95  },
  'Giraffe':             { shoulder: 4850, offset_shoulder: 5580, pedestal: 5820, full_mount: 0,     euro_skull: 415, bleach_only: 255 },
  'Grysbok':             { shoulder: 440,  offset_shoulder: 505,  pedestal: 530,  full_mount: 750,   euro_skull: 160, bleach_only: 95  },
  'Hartebeest':          { shoulder: 925,  offset_shoulder: 1060, pedestal: 1110, full_mount: 3696,  euro_skull: 310, bleach_only: 185 },
  'Hippo':               { shoulder: 4465, offset_shoulder: 0,    pedestal: 0,    full_mount: 0,     euro_skull: 750, bleach_only: 390 },
  'Hyena':               { shoulder: 695,  offset_shoulder: 800,  pedestal: 830,  full_mount: 2890,  euro_skull: 290, bleach_only: 185 },
  'Impala':              { shoulder: 750,  offset_shoulder: 865,  pedestal: 900,  full_mount: 1620,  euro_skull: 235, bleach_only: 130 },
  'Bontebok':            { shoulder: 750,  offset_shoulder: 865,  pedestal: 900,  full_mount: 1620,  euro_skull: 235, bleach_only: 130 },
  'Jackal':              { shoulder: 555,  offset_shoulder: 640,  pedestal: 665,  full_mount: 1075,  euro_skull: 175, bleach_only: 95  },
  'Klipspringer':        { shoulder: 555,  offset_shoulder: 640,  pedestal: 665,  full_mount: 1130,  euro_skull: 175, bleach_only: 95  },
  'Kudu':                { shoulder: 1040, offset_shoulder: 1195, pedestal: 1250, full_mount: 5200,  euro_skull: 290, bleach_only: 185 },
  'Leopard':             { shoulder: 1675, offset_shoulder: 0,    pedestal: 0,    full_mount: 4040,  euro_skull: 245, bleach_only: 140 },
  'Lion':                { shoulder: 1675, offset_shoulder: 0,    pedestal: 2010, full_mount: 6355,  euro_skull: 315, bleach_only: 200 },
  'Nyala':               { shoulder: 810,  offset_shoulder: 930,  pedestal: 970,  full_mount: 3465,  euro_skull: 245, bleach_only: 140 },
  'Oribi':               { shoulder: 580,  offset_shoulder: 665,  pedestal: 695,  full_mount: 980,   euro_skull: 175, bleach_only: 95  },
  'Reedbuck (Common)':   { shoulder: 695,  offset_shoulder: 800,  pedestal: 830,  full_mount: 2020,  euro_skull: 235, bleach_only: 130 },
  'Reedbuck (Mountain)': { shoulder: 635,  offset_shoulder: 730,  pedestal: 765,  full_mount: 1100,  euro_skull: 175, bleach_only: 95  },
  'Reedbuck (Vaal)':     { shoulder: 580,  offset_shoulder: 665,  pedestal: 695,  full_mount: 980,   euro_skull: 175, bleach_only: 95  },
  'Sable':               { shoulder: 1040, offset_shoulder: 1195, pedestal: 1250, full_mount: 4390,  euro_skull: 310, bleach_only: 185 },
  'Serval':              { shoulder: 0,    offset_shoulder: 0,    pedestal: 0,    full_mount: 1215,  euro_skull: 175, bleach_only: 95  },
  'Springbok':           { shoulder: 695,  offset_shoulder: 800,  pedestal: 830,  full_mount: 2020,  euro_skull: 235, bleach_only: 130 },
  'Steenbok':            { shoulder: 555,  offset_shoulder: 640,  pedestal: 585,  full_mount: 1130,  euro_skull: 175, bleach_only: 95  },
  'Tsessebe':            { shoulder: 810,  offset_shoulder: 930,  pedestal: 970,  full_mount: 2080,  euro_skull: 290, bleach_only: 185 },
  'Warthog':             { shoulder: 695,  offset_shoulder: 800,  pedestal: 830,  full_mount: 1620,  euro_skull: 315, bleach_only: 200 },
  'Waterbuck':           { shoulder: 1040, offset_shoulder: 1195, pedestal: 1250, full_mount: 4045,  euro_skull: 290, bleach_only: 185 },
  'Wild Cat':            { shoulder: 0,    offset_shoulder: 0,    pedestal: 0,    full_mount: 780,   euro_skull: 160, bleach_only: 95  },
  'Wildebeest (Black)':  { shoulder: 810,  offset_shoulder: 930,  pedestal: 970,  full_mount: 3240,  euro_skull: 290, bleach_only: 185 },
  'Wildebeest (Blue)':   { shoulder: 980,  offset_shoulder: 1130, pedestal: 1180, full_mount: 4045,  euro_skull: 310, bleach_only: 185 },
  'Vervet Monkey':       { shoulder: 0,    offset_shoulder: 0,    pedestal: 0,    full_mount: 665,   euro_skull: 160, bleach_only: 95  },
  'Zebra':               { shoulder: 1100, offset_shoulder: 1265, pedestal: 1315, full_mount: 4390,  euro_skull: 355, bleach_only: 210 },
};

// 2026 Local ZAR prices (VAT exclusive) — from Colletts_Local_Pricelists_2025-2029_FINAL2.xlsx
export const LOCAL_PRICE_DATA: Record<string, Record<string, number>> = {
  'Baboon':              { shoulder: 4585,  pedestal: 5566,  full_mount: 11485, euro_skull: 1880, bleach_only: 1547 },
  'Blesbok':             { shoulder: 6595,  pedestal: 8004,  full_mount: 19489, euro_skull: 1891, bleach_only: 1346 },
  'Buffalo':             { shoulder: 14079, pedestal: 17075, full_mount: 104497,euro_skull: 4033, bleach_only: 3396 },
  'Bushbuck':            { shoulder: 6595,  pedestal: 8004,  full_mount: 19871, euro_skull: 1681, bleach_only: 1346 },
  'Bushpig':             { shoulder: 6295,  pedestal: 7647,  full_mount: 17810, euro_skull: 2389, bleach_only: 1577 },
  'Caracal':             { shoulder: 0,     pedestal: 0,     full_mount: 12128, euro_skull: 1413, bleach_only: 1213 },
  'Civet':               { shoulder: 0,     pedestal: 0,     full_mount: 11472, euro_skull: 1413, bleach_only: 1213 },
  'Crocodile':           { shoulder: 0,     pedestal: 0,     full_mount: 1844,  euro_skull: 4627, bleach_only: 3924 },
  'Duiker':              { shoulder: 4886,  pedestal: 6059,  full_mount: 11848, euro_skull: 1413, bleach_only: 1110 },
  'Eland':               { shoulder: 11804, pedestal: 15748, full_mount: 104497,euro_skull: 3015, bleach_only: 2699 },
  'Elephant':            { shoulder: 114484,pedestal: 138848,full_mount: 809832,euro_skull: 0,    bleach_only: 0    },
  'Fallow Deer':         { shoulder: 6595,  pedestal: 8004,  full_mount: 19476, euro_skull: 1891, bleach_only: 1552 },
  'Gemsbok':             { shoulder: 8547,  pedestal: 10369, full_mount: 41100, euro_skull: 2498, bleach_only: 2231 },
  'Genet Cat':           { shoulder: 0,     pedestal: 0,     full_mount: 8538,  euro_skull: 1256, bleach_only: 1110 },
  'Giraffe':             { shoulder: 25179, pedestal: 30537, full_mount: 130177,euro_skull: 4766, bleach_only: 4191 },
  'Grysbok':             { shoulder: 4678,  pedestal: 5670,  full_mount: 10830, euro_skull: 1413, bleach_only: 1110 },
  'Hartebeest':          { shoulder: 7866,  pedestal: 9539,  full_mount: 36177, euro_skull: 2498, bleach_only: 1547 },
  'Hippo':               { shoulder: 33206, pedestal: 40276, full_mount: 185109,euro_skull: 8526, bleach_only: 5525 },
  'Hyena':               { shoulder: 10314, pedestal: 12516, full_mount: 26561, euro_skull: 2881, bleach_only: 2244 },
  'Impala':              { shoulder: 6595,  pedestal: 8004,  full_mount: 19489, euro_skull: 1891, bleach_only: 1552 },
  'Bontebok':            { shoulder: 6595,  pedestal: 8004,  full_mount: 19489, euro_skull: 1891, bleach_only: 1552 },
  'Jackal':              { shoulder: 4585,  pedestal: 5566,  full_mount: 12625, euro_skull: 1413, bleach_only: 1110 },
  'Klipspringer':        { shoulder: 4886,  pedestal: 5937,  full_mount: 11837, euro_skull: 1413, bleach_only: 1110 },
  'Kudu':                { shoulder: 10614, pedestal: 12874, full_mount: 48668, euro_skull: 2498, bleach_only: 2231 },
  'Lechwe':              { shoulder: 8547,  pedestal: 10369, full_mount: 36177, euro_skull: 2498, bleach_only: 1547 },
  'Leopard':             { shoulder: 12370, pedestal: 15009, full_mount: 40464, euro_skull: 3311, bleach_only: 2881 },
  'Lion':                { shoulder: 17510, pedestal: 21235, full_mount: 58830, euro_skull: 4712, bleach_only: 4184 },
  'Nyala':               { shoulder: 8547,  pedestal: 10369, full_mount: 35607, euro_skull: 2498, bleach_only: 1547 },
  'Oribi':               { shoulder: 5486,  pedestal: 6658,  full_mount: 13098, euro_skull: 1413, bleach_only: 1110 },
  'Ostrich':             { shoulder: 5532,  pedestal: 6713,  full_mount: 31617, euro_skull: 1413, bleach_only: 609  },
  'Reedbuck (Common)':   { shoulder: 7473,  pedestal: 9071,  full_mount: 32763, euro_skull: 1891, bleach_only: 1547 },
  'Reedbuck (Mountain)': { shoulder: 5486,  pedestal: 6658,  full_mount: 13098, euro_skull: 1565, bleach_only: 1346 },
  'Reedbuck (Vaal)':     { shoulder: 5486,  pedestal: 6658,  full_mount: 13098, euro_skull: 1413, bleach_only: 1110 },
  'Sable':               { shoulder: 10614, pedestal: 12874, full_mount: 48668, euro_skull: 2881, bleach_only: 2578 },
  'Serval':              { shoulder: 0,     pedestal: 0,     full_mount: 12874, euro_skull: 1413, bleach_only: 1110 },
  'Springbok':           { shoulder: 5486,  pedestal: 6658,  full_mount: 14415, euro_skull: 1680, bleach_only: 1110 },
  'Steenbok':            { shoulder: 4886,  pedestal: 5937,  full_mount: 11837, euro_skull: 1413, bleach_only: 1110 },
  'Tsessebe':            { shoulder: 6849,  pedestal: 8314,  full_mount: 19786, euro_skull: 2498, bleach_only: 1547 },
  'Warthog':             { shoulder: 5775,  pedestal: 7005,  full_mount: 15051, euro_skull: 2498, bleach_only: 1547 },
  'Waterbuck':           { shoulder: 9009,  pedestal: 10927, full_mount: 41100, euro_skull: 2498, bleach_only: 2226 },
  'Wild Cat':            { shoulder: 0,     pedestal: 0,     full_mount: 7951,  euro_skull: 1413, bleach_only: 1110 },
  'Wildebeest (Black)':  { shoulder: 8547,  pedestal: 10369, full_mount: 36183, euro_skull: 2498, bleach_only: 2226 },
  'Wildebeest (Blue)':   { shoulder: 9009,  pedestal: 10927, full_mount: 41100, euro_skull: 2615, bleach_only: 2226 },
  'Vervet Monkey':       { shoulder: 0,     pedestal: 0,     full_mount: 7951,  euro_skull: 1413, bleach_only: 1110 },
  'Zebra':               { shoulder: 8709,  pedestal: 10563, full_mount: 40731, euro_skull: 2692, bleach_only: 2226 },
};



export const SPECIES_EMOJI: Record<string, string> = {
  'Buffalo': '🦬', 'Elephant': '🐘', 'Lion': '🦁', 'Leopard': '🐆', 'Giraffe': '🦒',
  'Zebra': '🦓', 'Zebra (Cape)': '🦓', 'Hippo': '🦛', 'Crocodile': '🐊', 'Impala': '🦌',
  'Kudu': '🦌', 'Warthog': '🐗', 'Wildebeest (Blue)': '🐃', 'Wildebeest (Black)': '🐃',
};
export const speciesEmoji = (s: string) => SPECIES_EMOJI[s] ?? '🎯';

/** What a hunter can choose to have done with an animal. `key` is the column in the price tables. */
export interface MountOption { name: string; key: string; blurb: string }
export const MOUNT_OPTIONS: MountOption[] = [
  { name: 'Shoulder Mount',        key: 'shoulder',        blurb: 'Head, neck and shoulders on a wall pedestal — the classic trophy.' },
  { name: 'Offset Shoulder Mount', key: 'offset_shoulder', blurb: 'Shoulder mount with the head turned to one side for a more natural look.' },
  { name: 'Pedestal Mount',        key: 'pedestal',        blurb: 'Head and neck standing on a pedestal base, for a table or floor.' },
  { name: 'Full Mount',            key: 'full_mount',      blurb: 'The whole animal, life-size, in a natural pose.' },
  { name: 'Euro Skull',            key: 'euro_skull',      blurb: 'Cleaned, whitened skull and horns, ready to hang.' },
  { name: 'Bleach Only',           key: 'bleach_only',     blurb: 'Skull cleaned and bleached — you finish it yourself.' },
  { name: 'Tan Only',              key: 'tan_only',        blurb: 'Skin tanned and returned to you (rug, wall hanging or your own taxidermist).' },
  { name: 'Rug Mount on Felt',     key: 'rug',             blurb: 'Tanned skin with the head mounted, backed with felt, as a floor or wall rug.' },
  { name: 'Dip & Pack',            key: 'dip_pack',        blurb: 'Skin dipped, dried and packed so you can send it to your own taxidermist.' },
  { name: 'Something else',        key: 'other',           blurb: 'Tell us what you have in mind and we will quote you.' },
];

/** Estimated price for a mount, or null when there is no fixed price (we quote it). */
export function mountPrice(species: string, mountName: string, clientType: string): number | null {
  const opt = MOUNT_OPTIONS.find(m => m.name === mountName);
  if (!opt) return null;
  const table = clientType === 'local' ? LOCAL_PRICE_DATA : EXPORT_PRICE_DATA;
  const val = table[species]?.[opt.key];
  return val && val > 0 ? val : null;
}

/** Mount options that have a fixed price for this animal, plus the ones we always quote on request. */
export function mountsFor(species: string, clientType: string): (MountOption & { price: number | null })[] {
  const table = clientType === 'local' ? LOCAL_PRICE_DATA : EXPORT_PRICE_DATA;
  const row = table[species];
  const priced = MOUNT_OPTIONS.filter(m => row?.[m.key] && row[m.key] > 0).map(m => ({ ...m, price: row[m.key] }));
  const quoted = MOUNT_OPTIONS.filter(m => ['tan_only', 'rug', 'dip_pack', 'other'].includes(m.key)).map(m => ({ ...m, price: null as number | null }));
  return [...priced, ...quoted];
}

export const formatPrice = (n: number, clientType: string) =>
  clientType === 'local' ? `R ${n.toLocaleString('en-ZA')}` : `US$ ${n.toLocaleString('en-US')}`;
