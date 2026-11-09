/**
 * Every animal that is hunted in Africa (plus the introduced game found on SA game farms),
 * with its scientific name (shown small). `name` is what is stored on job cards.
 * `priceKey` points at the 2026 price list when we have a fixed price; everything else is quoted.
 * `aliases` are older spellings already on job cards, so they still resolve (scientific name, prices).
 * Scientific names follow common hunting-trade usage — check anything the workshop disagrees with.
 */
export type SpeciesGroup =
  | 'Antelope' | 'Buffalo and big game' | 'Pigs and warthogs'
  | 'Predators' | 'Small carnivores' | 'Primates' | 'Small game' | 'Birds' | 'Reptiles' | 'Introduced game';

export interface Species { name: string; sci: string; group: SpeciesGroup; priceKey?: string; aliases?: string[]; variants?: string[]; note?: string }

const A = (name: string, sci: string, group: SpeciesGroup, priceKey?: string, aliases?: string[], variants?: string[]): Species => ({ name, sci, group, priceKey, aliases, variants });

export const SPECIES: Species[] = [
  // ── Antelope: spiral-horned ──
  A('Kudu', 'Tragelaphus strepsiceros', 'Antelope', 'Kudu', ['Kudu (Greater)']),
  A('Kudu (Lesser)', 'Tragelaphus imberbis', 'Antelope'),
  A('Nyala', 'Tragelaphus angasii', 'Antelope', 'Nyala'),
  A('Nyala (Mountain)', 'Tragelaphus buxtoni', 'Antelope'),
  A('Eland', 'Taurotragus oryx', 'Antelope', 'Eland', ['Eland (Common)']),
  A('Eland (Giant)', 'Taurotragus derbianus', 'Antelope'),
  A('Eland (Livingstone\'s)', 'Taurotragus oryx livingstonii', 'Antelope'),
  A('Bushbuck', 'Tragelaphus scriptus', 'Antelope', 'Bushbuck'),
  A('Bushbuck (Cape)', 'Tragelaphus scriptus sylvaticus', 'Antelope'),
  A('Bushbuck (Chobe)', 'Tragelaphus scriptus ornatus', 'Antelope'),
  A('Bushbuck (Limpopo)', 'Tragelaphus scriptus roualeyni', 'Antelope'),
  A('Bushbuck (Harnessed)', 'Tragelaphus scriptus scriptus', 'Antelope'),
  A('Bushbuck (Nile)', 'Tragelaphus scriptus bor', 'Antelope'),
  A('Bushbuck (Menelik\'s)', 'Tragelaphus scriptus meneliki', 'Antelope'),
  A('Sitatunga', 'Tragelaphus spekii', 'Antelope'),
  A('Bongo', 'Tragelaphus eurycerus', 'Antelope'),
  // ── Horse antelope and oryx ──
  A('Sable', 'Hippotragus niger', 'Antelope', 'Sable'),
  A('Sable (Zambezi)', 'Hippotragus niger kirkii', 'Antelope'),
  A('Sable (Giant)', 'Hippotragus niger variani', 'Antelope'),
  A('Sable (Eastern)', 'Hippotragus niger roosevelti', 'Antelope'),
  A('Roan', 'Hippotragus equinus', 'Antelope', undefined, ['Roan Antelope']),
  A('Roan (Western)', 'Hippotragus equinus koba', 'Antelope'),
  A('Roan (Eastern)', 'Hippotragus equinus langheldi', 'Antelope'),
  A('Gemsbok', 'Oryx gazella', 'Antelope', 'Gemsbok', undefined, ['Golden', 'King', 'Black', 'Red', 'White']),
  A('Oryx (Beisa)', 'Oryx beisa', 'Antelope'),
  A('Oryx (Fringe-eared)', 'Oryx callotis', 'Antelope'),
  // ── Hartebeest, wildebeest and relatives ──
  A('Hartebeest', 'Alcelaphus buselaphus caama', 'Antelope', 'Hartebeest', ['Hartebeest (Red)']),
  A('Hartebeest (Lichtenstein\'s)', 'Alcelaphus lichtensteinii', 'Antelope'),
  A('Hartebeest (Coke\'s)', 'Alcelaphus buselaphus cokii', 'Antelope'),
  A('Hartebeest (Jackson\'s)', 'Alcelaphus buselaphus jacksoni', 'Antelope'),
  A('Hartebeest (Western)', 'Alcelaphus buselaphus major', 'Antelope'),
  A('Hartebeest (Tora)', 'Alcelaphus buselaphus tora', 'Antelope'),
  A('Hartebeest (Lelwel)', 'Alcelaphus buselaphus lelwel', 'Antelope'),
  A('Tsessebe', 'Damaliscus lunatus lunatus', 'Antelope', 'Tsessebe'),
  A('Topi', 'Damaliscus lunatus jimela', 'Antelope'),
  A('Tiang', 'Damaliscus lunatus tiang', 'Antelope'),
  A('Korrigum', 'Damaliscus lunatus korrigum', 'Antelope'),
  A('Blesbok', 'Damaliscus pygargus phillipsi', 'Antelope', 'Blesbok', undefined, ['White', 'Yellow', 'Copper', 'Saddleback']),
  A('Bontebok', 'Damaliscus pygargus pygargus', 'Antelope', 'Bontebok'),
  A('Wildebeest (Blue)', 'Connochaetes taurinus taurinus', 'Antelope', 'Wildebeest (Blue)', undefined, ['Golden', 'King', 'Royal']),
  A('Wildebeest (Black)', 'Connochaetes gnou', 'Antelope', 'Wildebeest (Black)'),
  A('Wildebeest (Nyassa)', 'Connochaetes taurinus johnstoni', 'Antelope'),
  A('Wildebeest (Cookson\'s)', 'Connochaetes taurinus cooksoni', 'Antelope'),
  A('Wildebeest (Eastern white-bearded)', 'Connochaetes taurinus albojubatus', 'Antelope'),
  A('Wildebeest (Western white-bearded)', 'Connochaetes taurinus mearnsi', 'Antelope'),
  // ── Waterbuck, lechwe, kob and reedbuck ──
  A('Waterbuck', 'Kobus ellipsiprymnus ellipsiprymnus', 'Antelope', 'Waterbuck', ['Waterbuck (Common)']),
  A('Waterbuck (Defassa)', 'Kobus ellipsiprymnus defassa', 'Antelope'),
  A('Waterbuck (Crawshay\'s)', 'Kobus ellipsiprymnus crawshayi', 'Antelope'),
  A('Lechwe', 'Kobus leche leche', 'Antelope', 'Lechwe', ['Lechwe (Red)']),
  A('Lechwe (Kafue)', 'Kobus leche kafuensis', 'Antelope'),
  A('Lechwe (Black)', 'Kobus smithemani', 'Antelope'),
  A('Lechwe (Nile)', 'Kobus megaceros', 'Antelope'),
  A('Puku', 'Kobus vardonii', 'Antelope'),
  A('Kob (Uganda)', 'Kobus kob thomasi', 'Antelope'),
  A('Kob (Western)', 'Kobus kob kob', 'Antelope'),
  A('Kob (White-eared)', 'Kobus kob leucotis', 'Antelope'),
  A('Reedbuck (Common)', 'Redunca arundinum', 'Antelope', 'Reedbuck (Common)'),
  A('Reedbuck (Mountain)', 'Redunca fulvorufula', 'Antelope', 'Reedbuck (Mountain)'),
  A('Reedbuck (Bohor)', 'Redunca redunca', 'Antelope'),
  A('Rhebok (Grey / Vaal)', 'Pelea capreolus', 'Antelope', 'Reedbuck (Vaal)', ['Reedbuck (Vaal)', 'Vaal Rhebok', 'Grey Rhebok']),
  // ── Gazelles, springbok and impala ──
  A('Impala', 'Aepyceros melampus melampus', 'Antelope', 'Impala', undefined, ['Black', 'White', 'White-flanked', 'Saddleback']),
  A('Impala (Black-faced)', 'Aepyceros melampus petersi', 'Antelope'),
  A('Springbok', 'Antidorcas marsupialis', 'Antelope', 'Springbok', undefined, ['Black', 'White', 'Copper', 'King']),
  A('Gazelle (Thomson\'s)', 'Eudorcas thomsonii', 'Antelope'),
  A('Gazelle (Grant\'s)', 'Nanger granti', 'Antelope'),
  A('Gazelle (Dorcas)', 'Gazella dorcas', 'Antelope'),
  A('Gazelle (Soemmerring\'s)', 'Nanger soemmerringii', 'Antelope'),
  A('Gazelle (Red-fronted)', 'Eudorcas rufifrons', 'Antelope'),
  A('Gerenuk', 'Litocranius walleri', 'Antelope'),
  // ── Small antelope ──
  A('Steenbok', 'Raphicerus campestris', 'Antelope', 'Steenbok'),
  A('Grysbok (Cape)', 'Raphicerus melanotis', 'Antelope', 'Grysbok', ['Grysbok']),
  A('Grysbok (Sharpe\'s)', 'Raphicerus sharpei', 'Antelope'),
  A('Oribi', 'Ourebia ourebi', 'Antelope', 'Oribi'),
  A('Klipspringer', 'Oreotragus oreotragus', 'Antelope', 'Klipspringer'),
  A('Suni', 'Neotragus moschatus', 'Antelope'),
  A('Dik-dik (Damara)', 'Madoqua damarensis', 'Antelope'),
  A('Dik-dik (Kirk\'s)', 'Madoqua kirkii', 'Antelope'),
  A('Dik-dik (Guenther\'s)', 'Madoqua guentheri', 'Antelope'),
  A('Dik-dik (Salt\'s)', 'Madoqua saltiana', 'Antelope'),
  A('Duiker (Common)', 'Sylvicapra grimmia', 'Antelope', 'Duiker', ['Duiker', 'Duiker (Grey)']),
  A('Duiker (Blue)', 'Philantomba monticola', 'Antelope'),
  A('Duiker (Red)', 'Cephalophus natalensis', 'Antelope'),
  A('Duiker (Yellow-backed)', 'Cephalophus silvicultor', 'Antelope'),
  A('Duiker (Bay)', 'Cephalophus dorsalis', 'Antelope'),
  A('Duiker (Harvey\'s)', 'Cephalophus harveyi', 'Antelope'),
  A('Duiker (Black)', 'Cephalophus niger', 'Antelope'),
  A('Duiker (Zebra)', 'Cephalophus zebra', 'Antelope'),
  A('Duiker (Peters\')', 'Cephalophus callipygus', 'Antelope'),
  A('Duiker (Ogilby\'s)', 'Cephalophus ogilbyi', 'Antelope'),
  A('Duiker (Black-fronted)', 'Cephalophus nigrifrons', 'Antelope'),
  A('Duiker (White-bellied)', 'Cephalophus leucogaster', 'Antelope'),
  A('Duiker (Red-flanked)', 'Cephalophus rufilatus', 'Antelope'),
  A('Duiker (Maxwell\'s)', 'Philantomba maxwellii', 'Antelope'),
  // ── Buffalo and big game ──
  A('Buffalo (Cape)', 'Syncerus caffer caffer', 'Buffalo and big game', 'Buffalo', ['Buffalo']),
  A('Buffalo (Forest)', 'Syncerus caffer nanus', 'Buffalo and big game'),
  A('Buffalo (Nile)', 'Syncerus caffer aequinoctialis', 'Buffalo and big game'),
  A('Buffalo (West African)', 'Syncerus caffer brachyceros', 'Buffalo and big game'),
  A('Elephant', 'Loxodonta africana', 'Buffalo and big game', 'Elephant'),
  A('Elephant (Forest)', 'Loxodonta cyclotis', 'Buffalo and big game'),
  A('Hippo', 'Hippopotamus amphibius', 'Buffalo and big game', 'Hippo'),
  A('Giraffe', 'Giraffa camelopardalis giraffa', 'Buffalo and big game', 'Giraffe', ['Giraffe (Southern)', 'Giraffe (Cape)']),
  A('Giraffe (Angolan)', 'Giraffa camelopardalis angolensis', 'Buffalo and big game'),
  A('Giraffe (Masai)', 'Giraffa camelopardalis tippelskirchi', 'Buffalo and big game'),
  A('Giraffe (Reticulated)', 'Giraffa camelopardalis reticulata', 'Buffalo and big game'),
  A('Zebra (Burchell\'s)', 'Equus quagga burchellii', 'Buffalo and big game', 'Zebra', ['Zebra', 'Zebra (Cape)', 'Zebra (Plains)', 'Plains Zebra', 'Burchell\'s Zebra'], ['Golden']),
  A('Zebra (Grant\'s)', 'Equus quagga boehmi', 'Buffalo and big game'),
  A('Zebra (Crawshay\'s)', 'Equus quagga crawshayi', 'Buffalo and big game'),
  A('Zebra (Chapman\'s)', 'Equus quagga chapmani', 'Buffalo and big game'),
  A('Zebra (Selous\')', 'Equus quagga selousi', 'Buffalo and big game'),
  A('Zebra (Hartmann\'s Mountain)', 'Equus zebra hartmannae', 'Buffalo and big game'),
  A('Zebra (Cape Mountain)', 'Equus zebra zebra', 'Buffalo and big game'),
  A('Rhinoceros (White)', 'Ceratotherium simum', 'Buffalo and big game'),
  A('Rhinoceros (Black)', 'Diceros bicornis', 'Buffalo and big game'),
  A('Ostrich', 'Struthio camelus', 'Buffalo and big game', 'Ostrich'),
  // ── Pigs and warthogs ──
  A('Warthog', 'Phacochoerus africanus', 'Pigs and warthogs', 'Warthog', ['Warthog (Common)']),
  A('Warthog (Desert)', 'Phacochoerus aethiopicus', 'Pigs and warthogs'),
  A('Bushpig', 'Potamochoerus larvatus', 'Pigs and warthogs', 'Bushpig'),
  A('Red river hog', 'Potamochoerus porcus', 'Pigs and warthogs'),
  A('Giant forest hog', 'Hylochoerus meinertzhageni', 'Pigs and warthogs'),
  // ── Predators ──
  A('Lion', 'Panthera leo', 'Predators', 'Lion', undefined, ['White']),
  A('Leopard', 'Panthera pardus', 'Predators', 'Leopard', undefined, ['Black']),
  A('Cheetah', 'Acinonyx jubatus', 'Predators'),
  A('Caracal', 'Caracal caracal', 'Predators', 'Caracal'),
  A('Serval', 'Leptailurus serval', 'Predators', 'Serval'),
  A('Wild Cat', 'Felis lybica', 'Predators', 'Wild Cat', ['Wild cat (African)', 'African Wild Cat', 'Wildcat']),
  A('Hyena (Spotted)', 'Crocuta crocuta', 'Predators', 'Hyena', ['Hyena']),
  A('Hyena (Brown)', 'Parahyaena brunnea', 'Predators'),
  A('Hyena (Striped)', 'Hyaena hyaena', 'Predators'),
  A('Jackal (Black-backed)', 'Lupulella mesomelas', 'Predators', 'Jackal', ['Jackal']),
  A('Jackal (Side-striped)', 'Lupulella adusta', 'Predators'),
  A('Jackal (African golden wolf)', 'Canis lupaster', 'Predators'),
  A('Fox (Cape)', 'Vulpes chama', 'Predators'),
  A('Fox (Bat-eared)', 'Otocyon megalotis', 'Predators'),
  // ── Small carnivores and other mammals ──
  A('Civet', 'Civettictis civetta', 'Small carnivores', 'Civet', ['Civet (African)']),
  A('Genet (Small-spotted)', 'Genetta genetta', 'Small carnivores', 'Genet Cat', ['Genet Cat', 'Genet']),
  A('Genet (Large-spotted)', 'Genetta tigrina', 'Small carnivores'),
  A('Honey badger', 'Mellivora capensis', 'Small carnivores'),
  A('Aardwolf', 'Proteles cristata', 'Small carnivores'),
  A('Mongoose (Slender)', 'Galerella sanguinea', 'Small carnivores'),
  A('Mongoose (Yellow)', 'Cynictis penicillata', 'Small carnivores'),
  A('Mongoose (White-tailed)', 'Ichneumia albicauda', 'Small carnivores'),
  A('Mongoose (Banded)', 'Mungos mungo', 'Small carnivores'),
  A('Mongoose (Dwarf)', 'Helogale parvula', 'Small carnivores'),
  A('Mongoose (Water)', 'Atilax paludinosus', 'Small carnivores'),
  A('Genet (Rusty-spotted)', 'Genetta maculata', 'Small carnivores'),
  A('Polecat (Striped)', 'Ictonyx striatus', 'Small carnivores'),
  A('Porcupine', 'Hystrix africaeaustralis', 'Small game'),
  A('Springhare', 'Pedetes capensis', 'Small game'),
  A('Hare (Scrub)', 'Lepus saxatilis', 'Small game'),
  A('Hare (Cape)', 'Lepus capensis', 'Small game'),
  A('Rabbit (Red rock)', 'Pronolagus spp.', 'Small game'),
  A('Hyrax (Rock)', 'Procavia capensis', 'Small game'),
  // ── Primates ──
  A('Baboon (Chacma)', 'Papio ursinus', 'Primates', 'Baboon', ['Baboon']),
  A('Baboon (Olive)', 'Papio anubis', 'Primates'),
  A('Baboon (Yellow)', 'Papio cynocephalus', 'Primates'),
  A('Monkey (Samango)', 'Cercopithecus albogularis', 'Primates'),
  A('Monkey (Blue)', 'Cercopithecus mitis', 'Primates'),
  A('Vervet Monkey', 'Chlorocebus pygerythrus', 'Primates', 'Vervet Monkey'),
  // ── Birds ──
  A('Guineafowl (Helmeted)', 'Numida meleagris', 'Birds'),
  A('Guineafowl (Crested)', 'Guttera edouardi', 'Birds'),
  A('Francolin (Natal)', 'Pternistis natalensis', 'Birds'),
  A('Francolin (Swainson\'s)', 'Pternistis swainsonii', 'Birds'),
  A('Francolin (Crested)', 'Dendroperdix sephaena', 'Birds'),
  A('Francolin (Red-necked)', 'Pternistis afer', 'Birds'),
  A('Spurfowl (Red-billed)', 'Pternistis adspersus', 'Birds'),
  A('Quail (Common)', 'Coturnix coturnix', 'Birds'),
  A('Egyptian goose', 'Alopochen aegyptiaca', 'Birds'),
  A('Spur-winged goose', 'Plectropterus gambensis', 'Birds'),
  A('Duck (Yellow-billed)', 'Anas undulata', 'Birds'),
  A('Duck (Red-billed teal)', 'Anas erythrorhyncha', 'Birds'),
  A('Duck (Knob-billed)', 'Sarkidiornis melanotos', 'Birds'),
  A('Sandgrouse (Namaqua)', 'Pterocles namaqua', 'Birds'),
  A('Sandgrouse (Burchell\'s)', 'Pterocles burchelli', 'Birds'),
  A('Pigeon (Rock)', 'Columba guinea', 'Birds'),
  // ── Reptiles ──
  A('Crocodile (Nile)', 'Crocodylus niloticus', 'Reptiles', 'Crocodile', ['Crocodile']),
  A('Python (Rock)', 'Python sebae', 'Reptiles'),
  // ── Introduced game found on game farms ──
  A('Fallow Deer', 'Dama dama', 'Introduced game', 'Fallow Deer', undefined, ['Menil', 'Black', 'White']),
  A('Red Deer', 'Cervus elaphus', 'Introduced game'),
  A('Sika Deer', 'Cervus nippon', 'Introduced game'),
  A('Axis Deer', 'Axis axis', 'Introduced game'),
  A('Blackbuck', 'Antilope cervicapra', 'Introduced game'),
  A('Himalayan tahr', 'Hemitragus jemlahicus', 'Introduced game'),
  A('Mouflon', 'Ovis aries musimon', 'Introduced game'),
  A('Aoudad (Barbary sheep)', 'Ammotragus lervia', 'Introduced game'),
  A('Nubian ibex', 'Capra nubiana', 'Introduced game'),
  A('Nguni', 'Bos taurus', 'Introduced game'),
  A('Other', '', 'Small game'),
];


/** Another name people use for the same animal, shown small under the scientific name (also searchable). */
const NOTES: Record<string, string> = {
  'Kudu': 'Greater kudu', 'Kudu (Lesser)': 'Lesser kudu',
  'Eland': 'Common or Cape eland', 'Roan': 'Southern roan', 'Sable': 'Southern sable',
  'Hartebeest': 'Red hartebeest (Cape)', 'Wildebeest (Blue)': 'Common or southern blue wildebeest. Colours: golden, king, royal', 'Wildebeest (Black)': 'White-tailed gnu',
  'Zebra (Burchell\'s)': 'Plains zebra', 'Zebra (Grant\'s)': 'Plains zebra', 'Zebra (Crawshay\'s)': 'Plains zebra', 'Zebra (Chapman\'s)': 'Plains zebra', 'Zebra (Selous\')': 'Plains zebra',
  'Zebra (Hartmann\'s Mountain)': 'Mountain zebra', 'Zebra (Cape Mountain)': 'Mountain zebra',
  'Waterbuck': 'Common waterbuck', 'Bushbuck': 'Bushbuck (general, price list)',
  'Giraffe': 'South African (Cape) giraffe', 'Buffalo (Cape)': 'Cape buffalo',
  'Wild Cat': 'African wild cat', 'Rhebok (Grey / Vaal)': 'Vaal rhebok', 'Hyena (Spotted)': 'Spotted hyena', 'Hyena (Brown)': 'Brown hyena',
};
for (const sp of SPECIES) if (NOTES[sp.name]) sp.note = NOTES[sp.name];

export const SPECIES_NAMES = SPECIES.map(s => s.name);

/** The animal a type belongs to: "Zebra (Cape Mountain)" and "Zebra (Burchell's)" are both "Zebra". */
export const familyOf = (name: string) => name.split(' (')[0];
/** Every type of one animal, in list order (Zebra: plains and mountain types, each with its own scientific name). */
export const typesOfFamily = (family: string): Species[] => SPECIES.filter(s => familyOf(s.name) === family);
/** Group a list of animals by family, keeping the list's order. */
export function groupFamilies(list: Species[]): { family: string; members: Species[] }[] {
  const out: { family: string; members: Species[] }[] = [];
  for (const sp of list) { const f = familyOf(sp.name); const g = out.find(x => x.family === f); if (g) g.members.push(sp); else out.push({ family: f, members: [sp] }); }
  return out;
}
export const SPECIES_GROUPS: SpeciesGroup[] = ['Antelope', 'Buffalo and big game', 'Pigs and warthogs', 'Predators', 'Small carnivores', 'Primates', 'Small game', 'Birds', 'Reptiles', 'Introduced game'];

const norm = (s: string) => s.trim().toLowerCase();
const INDEX = new Map<string, Species>();
for (const sp of SPECIES) { INDEX.set(norm(sp.name), sp); }
for (const sp of SPECIES) for (const a of sp.aliases ?? []) if (!INDEX.has(norm(a))) INDEX.set(norm(a), sp);
/** The name stored on a job card for an animal in a colour variant: "Springbok, Black". Normal colour = just the name. */
export const composeName = (base: string, variant?: string | null) => (variant && variant !== 'Normal' ? `${base}, ${variant}` : base);
for (const sp of SPECIES) for (const v of sp.variants ?? []) INDEX.set(norm(composeName(sp.name, v)), sp);

/** Split a stored name back into the animal and its colour ("Springbok, Black" → Springbok + Black). */
export function splitVariant(stored: string): { base: string; variant: string } {
  const i = stored.lastIndexOf(', ');
  if (i > 0) { const sp = findSpecies(stored); const v = stored.slice(i + 2); if (sp && sp.variants?.includes(v)) return { base: sp.name, variant: v }; }
  return { base: stored, variant: 'Normal' };
}
/** The colour choices for an animal, "Normal" first — empty when it has none. */
export const variantsOf = (name: string): string[] => { const v = findSpecies(name)?.variants; return v?.length ? ['Normal', ...v] : []; };

/** Find an animal by the name stored on a job card (current or older spelling). */
export const findSpecies = (name: string | null | undefined): Species | undefined => (name ? INDEX.get(norm(name)) : undefined);
/** Scientific name for display ('' when unknown). */
export const sciName = (name: string | null | undefined): string => findSpecies(name)?.sci ?? '';

/**
 * What an animal has, which decides its trophy parts: horns, tusks, antlers or none, and the extras people often ask for.
 * Worked out from the animal's group and name, so every type and variant behaves like its family.
 */
export interface AnimalKind { horns: 'horns' | 'tusks' | 'antlers' | 'none'; bigGame: boolean; bigCat: boolean; elephant: boolean; warthog: boolean }
const BIG_GAME = new Set(['Elephant', 'Hippo', 'Giraffe', 'Kudu', 'Gemsbok', 'Sable', 'Roan', 'Hartebeest', 'Waterbuck', 'Nyala', 'Lion', 'Leopard']);
const BIG_GAME_FAMILY = ['Buffalo', 'Zebra', 'Wildebeest', 'Eland', 'Elephant', 'Giraffe', 'Sable', 'Roan'];
const BIG_CATS = new Set(['Lion', 'Leopard', 'Cheetah', 'Caracal', 'Serval', 'Wild Cat']);
export function animalKind(stored: string | null | undefined): AnimalKind {
  const sp = findSpecies(stored);
  const base = sp?.name ?? (stored ?? '');
  const family = base.split(' (')[0];
  const tusks = sp?.group === 'Pigs and warthogs' || family === 'Elephant' || family === 'Hippo' || family === 'Baboon';
  const antlers = sp?.group === 'Introduced game' && /deer/i.test(base);
  const none = !tusks && !antlers && base !== 'Other' && (!sp
    ? false
    : ['Predators', 'Small carnivores', 'Primates', 'Small game', 'Birds', 'Reptiles'].includes(sp.group) || family === 'Ostrich');
  return {
    horns: tusks ? 'tusks' : antlers ? 'antlers' : none ? 'none' : 'horns',
    bigGame: BIG_GAME.has(base) || BIG_GAME.has(family) && !/Lesser/.test(base) || BIG_GAME_FAMILY.includes(family),
    bigCat: BIG_CATS.has(base) || BIG_CATS.has(family),
    elephant: family === 'Elephant',
    warthog: family === 'Warthog',
  };
}
