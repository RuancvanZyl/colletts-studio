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

export interface Species { name: string; sci: string; group: SpeciesGroup; priceKey?: string; aliases?: string[]; variants?: string[] }

const A = (name: string, sci: string, group: SpeciesGroup, priceKey?: string, aliases?: string[], variants?: string[]): Species => ({ name, sci, group, priceKey, aliases, variants });

export const SPECIES: Species[] = [
  // ── Antelope: spiral-horned ──
  A('Kudu', 'Tragelaphus strepsiceros', 'Antelope', 'Kudu', ['Kudu (Greater)']),
  A('Kudu (Lesser)', 'Tragelaphus imberbis', 'Antelope'),
  A('Nyala', 'Tragelaphus angasii', 'Antelope', 'Nyala'),
  A('Nyala (Mountain)', 'Tragelaphus buxtoni', 'Antelope'),
  A('Eland', 'Taurotragus oryx', 'Antelope', 'Eland', ['Eland (Common)']),
  A('Eland (Giant)', 'Taurotragus derbianus', 'Antelope'),
  A('Bushbuck', 'Tragelaphus scriptus', 'Antelope', 'Bushbuck'),
  A('Sitatunga', 'Tragelaphus spekii', 'Antelope'),
  A('Bongo', 'Tragelaphus eurycerus', 'Antelope'),
  // ── Horse antelope and oryx ──
  A('Sable', 'Hippotragus niger', 'Antelope', 'Sable'),
  A('Roan', 'Hippotragus equinus', 'Antelope', undefined, ['Roan Antelope']),
  A('Gemsbok', 'Oryx gazella', 'Antelope', 'Gemsbok', undefined, ['Golden']),
  A('Oryx (Beisa)', 'Oryx beisa', 'Antelope'),
  A('Oryx (Fringe-eared)', 'Oryx callotis', 'Antelope'),
  // ── Hartebeest, wildebeest and relatives ──
  A('Hartebeest', 'Alcelaphus buselaphus caama', 'Antelope', 'Hartebeest', ['Hartebeest (Red)']),
  A('Hartebeest (Lichtenstein\'s)', 'Alcelaphus lichtensteinii', 'Antelope'),
  A('Hartebeest (Coke\'s)', 'Alcelaphus buselaphus cokii', 'Antelope'),
  A('Hartebeest (Jackson\'s)', 'Alcelaphus buselaphus jacksoni', 'Antelope'),
  A('Hartebeest (Lelwel)', 'Alcelaphus buselaphus lelwel', 'Antelope'),
  A('Tsessebe', 'Damaliscus lunatus lunatus', 'Antelope', 'Tsessebe'),
  A('Topi', 'Damaliscus lunatus jimela', 'Antelope'),
  A('Blesbok', 'Damaliscus pygargus phillipsi', 'Antelope', 'Blesbok', undefined, ['White', 'Yellow']),
  A('Bontebok', 'Damaliscus pygargus pygargus', 'Antelope', 'Bontebok'),
  A('Wildebeest (Blue)', 'Connochaetes taurinus', 'Antelope', 'Wildebeest (Blue)', undefined, ['Golden']),
  A('Wildebeest (Black)', 'Connochaetes gnou', 'Antelope', 'Wildebeest (Black)'),
  // ── Waterbuck, lechwe, kob and reedbuck ──
  A('Waterbuck', 'Kobus ellipsiprymnus ellipsiprymnus', 'Antelope', 'Waterbuck', ['Waterbuck (Common)']),
  A('Waterbuck (Defassa)', 'Kobus ellipsiprymnus defassa', 'Antelope'),
  A('Lechwe', 'Kobus leche leche', 'Antelope', 'Lechwe', ['Lechwe (Red)']),
  A('Lechwe (Kafue)', 'Kobus leche kafuensis', 'Antelope'),
  A('Lechwe (Black)', 'Kobus smithemani', 'Antelope'),
  A('Lechwe (Nile)', 'Kobus megaceros', 'Antelope'),
  A('Puku', 'Kobus vardonii', 'Antelope'),
  A('Kob (Uganda)', 'Kobus kob thomasi', 'Antelope'),
  A('Kob (Western)', 'Kobus kob kob', 'Antelope'),
  A('Reedbuck (Common)', 'Redunca arundinum', 'Antelope', 'Reedbuck (Common)'),
  A('Reedbuck (Mountain)', 'Redunca fulvorufula', 'Antelope', 'Reedbuck (Mountain)'),
  A('Reedbuck (Bohor)', 'Redunca redunca', 'Antelope'),
  A('Rhebok (Grey / Vaal)', 'Pelea capreolus', 'Antelope', 'Reedbuck (Vaal)', ['Reedbuck (Vaal)', 'Vaal Rhebok', 'Grey Rhebok']),
  // ── Gazelles, springbok and impala ──
  A('Impala', 'Aepyceros melampus melampus', 'Antelope', 'Impala', undefined, ['Black', 'White']),
  A('Impala (Black-faced)', 'Aepyceros melampus petersi', 'Antelope'),
  A('Springbok', 'Antidorcas marsupialis', 'Antelope', 'Springbok', undefined, ['Black', 'White', 'Copper']),
  A('Gazelle (Thomson\'s)', 'Eudorcas thomsonii', 'Antelope'),
  A('Gazelle (Grant\'s)', 'Nanger granti', 'Antelope'),
  A('Gazelle (Dorcas)', 'Gazella dorcas', 'Antelope'),
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
  A('Duiker (Common)', 'Sylvicapra grimmia', 'Antelope', 'Duiker', ['Duiker', 'Duiker (Grey)']),
  A('Duiker (Blue)', 'Philantomba monticola', 'Antelope'),
  A('Duiker (Red)', 'Cephalophus natalensis', 'Antelope'),
  A('Duiker (Yellow-backed)', 'Cephalophus silvicultor', 'Antelope'),
  A('Duiker (Bay)', 'Cephalophus dorsalis', 'Antelope'),
  A('Duiker (Harvey\'s)', 'Cephalophus harveyi', 'Antelope'),
  // ── Buffalo and big game ──
  A('Buffalo (Cape)', 'Syncerus caffer caffer', 'Buffalo and big game', 'Buffalo', ['Buffalo']),
  A('Buffalo (Forest)', 'Syncerus caffer nanus', 'Buffalo and big game'),
  A('Buffalo (Nile)', 'Syncerus caffer aequinoctialis', 'Buffalo and big game'),
  A('Buffalo (West African)', 'Syncerus caffer brachyceros', 'Buffalo and big game'),
  A('Elephant', 'Loxodonta africana', 'Buffalo and big game', 'Elephant'),
  A('Hippo', 'Hippopotamus amphibius', 'Buffalo and big game', 'Hippo'),
  A('Giraffe', 'Giraffa camelopardalis', 'Buffalo and big game', 'Giraffe'),
  A('Zebra (Burchell\'s)', 'Equus quagga burchellii', 'Buffalo and big game', 'Zebra', ['Zebra', 'Zebra (Cape)'], ['Golden']),
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
  A('Wild Cat', 'Felis lybica', 'Predators', 'Wild Cat', ['Wild cat (African)']),
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
  A('Blackbuck', 'Antilope cervicapra', 'Introduced game'),
  A('Himalayan tahr', 'Hemitragus jemlahicus', 'Introduced game'),
  A('Mouflon', 'Ovis aries musimon', 'Introduced game'),
  A('Aoudad (Barbary sheep)', 'Ammotragus lervia', 'Introduced game'),
  A('Nubian ibex', 'Capra nubiana', 'Introduced game'),
  A('Nguni', 'Bos taurus', 'Introduced game'),
  A('Other', '', 'Small game'),
];

export const SPECIES_NAMES = SPECIES.map(s => s.name);
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
