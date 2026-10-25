import { e, type GuideEntry } from './types';

/** Buffalo, elephant, hippo, giraffe, zebra, rhino, ostrich, pigs and warthogs. */
export const BIG_GAME: Record<string, GuideEntry> = {
  'Buffalo (Cape)': e(
    "The Cape buffalo is Africa's great bovine, a heavy, black animal with massive, curved horns joined by a solid boss across the forehead.",
    ["Herds can number in the hundreds, and the herd will often rally around a wounded or threatened animal.", "Old bulls that leave the herd are called \"dugga boys\" after the mud they love to lie in."],
    ["Bulls can weigh over 700 kg. Both sexes carry horns, but the bull's boss is much broader.", "Found in woodland and grassland near water across southern and eastern Africa."],
    ["Rowland Ward's minimum for entry in its record book has long been 42 inches of horn spread. A bull with 40 inches or more is considered a very good head.", "Dangerous game: a bull needs respect and an experienced professional hunter."],
    "Large, broad, rounded cloven hooves, wider than eland, with a heavy, deep print."),
  'Buffalo (Forest)': e(
    "The smaller, reddish buffalo of the rainforests of west and central Africa.",
    ["It is much smaller than the Cape buffalo, often only around half the weight.", "Its horns sweep backwards rather than outwards."],
    ["Found in the dense forests of the Congo basin and West Africa.", "A red-brown coat with fringed ears."],
    ["Hunted in thick forest, often at close range.", "Hunting needs permits and local trackers."],
    "Smaller, rounded cloven hooves than the Cape buffalo."),
  'Buffalo (Nile)': e(
    "A buffalo of the savannas of central Africa and Uganda, between the Cape buffalo and the forest buffalo in size.",
    ["Nile buffalo are sometimes grouped with the Cape buffalo.", "Found in Uganda, South Sudan and the Central African Republic."],
    ["Both sexes carry horns.", "Often found in swamps and woodland near water."],
    ["Hunted on safari in the savannas of central Africa.", "Dangerous game, so an experienced professional hunter is essential."],
    "Large, rounded cloven hooves."),
  'Buffalo (West African)': e(
    "The savanna buffalo of West Africa, reddish-brown and smaller than the Cape buffalo.",
    ["Its horns often point upwards and inwards, in a shape different from the Cape buffalo.", "Found in the savannas of Senegal, Mali, Burkina Faso and surrounding countries."],
    ["A lighter, redder animal than the Cape buffalo.", "Both sexes carry horns."],
    ["Hunted in a few west African countries under strict permits.", "Dangerous game."],
    "Rounded cloven hooves."),
  'Elephant': e(
    "The largest land animal on earth. A highly intelligent, social animal, led by a matriarch.",
    ["An elephant's tusks are enlarged front teeth that keep growing for life.", "Elephants live to around 60 or 70 years and can recognise each other from far away by sound and smell."],
    ["Bulls can weigh around six tonnes. Both sexes can have tusks.", "Found in savanna and forest in many parts of Africa."],
    ["Elephant hunting is permitted only in a few countries and needs strict permits. Ivory is controlled under CITES.", "Check your country's import rules before you plan. This is dangerous game."],
    "Huge, round tracks, with the front foot round and the hind oval. A large bull's print can be around half a metre across."),
  'Hippo': e(
    "A huge, semi-aquatic animal that spends the day in water and comes out to graze at night.",
    ["A hippo's skin makes a red, oily fluid that works like a sunscreen.", "The long lower canines and incisors keep growing throughout the animal's life."],
    ["Hippos can weigh well over a tonne and live in rivers and lakes across Africa.", "They graze up to several kilometres from the water."],
    ["Often hunted from the bank or boat near rivers, or on land at night with great care.", "Dangerous game. Hippo ivory is controlled under CITES."],
    "Broad, four-toed prints, wide, with a clear drag in the mud."),
  'Giraffe': e(
    "The tallest animal on earth. A giraffe's long neck has seven vertebrae, the same number as a human.",
    ["A giraffe's tongue can be around 45 cm long and is dark in colour.", "The coat pattern is as unique as a fingerprint."],
    ["Bulls can be over five metres tall. Both sexes carry horn-like ossicones.", "Found in savanna and open woodland across Africa."],
    ["Giraffe hunting is only allowed in a few countries and is strictly limited.", "A mature bull is dark, heavy and often shows scarring on the head."],
    "Large, two-toed cloven hooves, long and oval."),
  'Zebra (Burchell\'s)': e(
    "The common zebra of southern and eastern Africa, with bold black-and-white stripes that are as individual as fingerprints.",
    ["Each zebra's stripe pattern is unique.", "Foals can stand and walk soon after birth."],
    ["A grazer found in open grassland and woodland.", "Often seen alongside wildebeest."],
    ["Zebra are alert, often in herds with a lookout.", "A good stallion is a mature, heavy animal with a clear stripe pattern."],
    "A single round hoof, like a horse, not cloven."),
  'Zebra (Hartmann\'s Mountain)': e(
    "A mountain zebra of the escarpment of Namibia and south-west Angola, with a grid-iron pattern on the rump and a dewlap under the throat.",
    ["It is built for steep, rocky ground and is a sure-footed climber.", "It has white underparts, unlike Burchell's zebra."],
    ["A grazer of dry, rocky mountain country.", "Found in Namibia and Angola."],
    ["Hunted in rough, rocky mountains, so fitness matters.", "Permits are needed and quotas are small."],
    "A single round hoof, narrower than Burchell's zebra."),
  'Zebra (Cape Mountain)': e(
    "The smallest of the zebras, found on the mountains of the Western Cape and Eastern Cape.",
    ["The Cape mountain zebra was reduced to a very small number in the 20th century and has since recovered.", "It has a dewlap and a gridiron pattern on the rump."],
    ["A grazer of mountain and fynbos country.", "Found only in the Cape mountains."],
    ["A protected species, mainly taken on a few game farms and under strict quotas.", "Check permits."],
    "A single hoof, narrow and upright."),
  'Rhinoceros (White)': e(
    "The second largest land animal. A grazer with a wide, square lip, a long head and two horns.",
    ["Its name may come from the Afrikaans \"wyd\", meaning wide, for its mouth.", "A calf will often walk in front of its mother."],
    ["Bulls can weigh over two tonnes.", "Found on grassland and open woodland in southern Africa."],
    ["A small number of white rhino can be hunted under strict permits in South Africa and Namibia.", "Rhino horn is controlled under CITES. Check the permits before you plan."],
    "Large, three-toed prints, rounded, larger than black rhino."),
  'Rhinoceros (Black)': e(
    "A smaller, more agile rhino than the white, with a hooked upper lip used to browse bushes and trees.",
    ["The hooked lip is perfect for pulling leaves and twigs.", "Black rhino are critically endangered."],
    ["A browser of thick bush and thorn.", "Found in parts of Namibia, South Africa, Kenya and Zimbabwe."],
    ["Only a very small annual quota is allowed under CITES.", "A tightly controlled hunt, with strict permits."],
    "Three-toed prints, smaller and more pointed than white rhino."),
  'Ostrich': e(
    "The largest bird in the world. A flightless runner of dry plains.",
    ["An ostrich can run at about 70 km/h.", "An ostrich egg is the largest of any living bird."],
    ["Males are black and white, females are grey-brown.", "Found in open savanna and semi-desert."],
    ["Hunted for the feathers, the skin and the bird itself. Often taken on game farms.", "Check the local rules."],
    "A two-toed print, unique among birds, with a large toe and a smaller one."),
  'Warthog': e(
    "A tough, bristly wild pig with big curved tusks and warts on its face. It kneels on its front legs to feed.",
    ["Warthogs run with their tails held straight up like an aerial.", "They sleep in burrows and back in, tusks facing out."],
    ["Both sexes have tusks; the boar's are the longest.", "Found in savanna and open woodland across Africa."],
    ["Warthog are alert and run fast, so a careful stalk is needed.", "Long, thick, evenly curved tusks make the best trophy."],
    "Cloven prints with two toes, narrow and pointed, with the dew claws often visible."),
  'Warthog (Desert)': e(
    "A warthog of the dry Horn of Africa, with a more rounded head and large warts on its face.",
    ["It lacks incisor teeth, which the common warthog has.", "Found in Somalia, Kenya and Ethiopia."],
    ["Both sexes have tusks.", "A grazer of dry savanna."],
    ["Hunted in the dry bush of East Africa.", "Check permits."],
    "Cloven prints, similar to common warthog."),
  'Bushpig': e(
    "A shy, nocturnal wild pig with a reddish coat and a crest of white hair along the back.",
    ["Bushpig have an excellent sense of smell and hearing.", "They live in family groups called sounders."],
    ["Found in forest and thick bush in southern and eastern Africa.", "Smaller tusks than a warthog."],
    ["Most active at night. Often hunted from a blind over bait where this is allowed.", "A mature boar is a rewarding trophy."],
    "Cloven prints, rounder than a warthog's."),
  'Red river hog': e(
    "A brightly coloured wild pig of the forests of west and central Africa, with a red coat and white ear tufts.",
    ["It is one of the most colourful pigs in the world.", "Tassels on the ears give the animal a distinctive look."],
    ["Found in the forests of West and Central Africa.", "A smaller pig than the giant forest hog."],
    ["Hunted in forest with trackers.", "A prized trophy of the rainforest."],
    "Cloven prints."),
  'Giant forest hog': e(
    "The largest wild pig in the world. A big, dark, shaggy pig of the equatorial forests.",
    ["It is the biggest of all the wild pigs.", "Its tusks are long and curved."],
    ["Found in the forests of Central and West Africa and parts of East Africa.", "Both sexes have tusks."],
    ["Hunted in forest with trackers.", "A rare trophy that needs careful planning and permits."],
    "Large cloven prints."),
}
