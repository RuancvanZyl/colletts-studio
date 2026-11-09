/**
 * The animals Safari Club International (SCI) officially recognises in Africa: the categories of its World Hunting Awards
 * ("Animals of Africa", "Spiral-horned Antelope of Africa", "Introduced Animals of Africa", "Predators of the World", "Wild Pigs of the World"),
 * written exactly as SCI names them. SCI defines each category (often a regional type); it does not publish scientific names,
 * so those are the standard scientific names of the type. A "?" marks a scientific name that should be confirmed by someone
 * who knows SCI's maps, and "=" means a regional category that shares the scientific name of another one.
 *
 * Line: our animal | our name for the type | SCI's category name | scientific name | group | flags
 * When our name already exists in the animal list it is only marked as an SCI category; otherwise it is added.
 */
export interface SciCategory { family: string; name: string; sci: string; category: string; group: string; guess: boolean; shared: boolean }

const TABLE = `
Lion | Lion | African lion | Panthera leo | Predators |
Leopard | Leopard | African leopard | Panthera pardus | Predators |
Cheetah | Cheetah | African cheetah | Acinonyx jubatus | Predators |
Serval | Serval | Serval | Leptailurus serval | Predators |
Caracal | Caracal | Caracal | Caracal caracal | Predators |
Wild Cat | Wild Cat | African wild cat | Felis lybica | Predators |
Golden cat | Golden cat (African) | African golden cat | Caracal aurata | Predators |
Civet | Civet | African civet | Civettictis civetta | Small carnivores |
Genet | Genet (Small-spotted) | Genet cat | Genetta genetta | Small carnivores |
Hyena | Hyena (Spotted) | Spotted hyena | Crocuta crocuta | Predators |
Hyena | Hyena (Brown) | Brown hyena | Parahyaena brunnea | Predators |
Hyena | Hyena (Striped) | African striped hyena | Hyaena hyaena | Predators |
Jackal | Jackal (Black-backed) | Jackal | Lupulella mesomelas | Predators |
Fox | Fox (Bat-eared) | Bat-eared fox | Otocyon megalotis | Predators |
Elephant | Elephant | African elephant | Loxodonta africana | Buffalo and big game |
Rhinoceros | Rhinoceros (Black) | Black rhinoceros | Diceros bicornis | Buffalo and big game |
Rhinoceros | Rhinoceros (White) | Southern white rhinoceros | Ceratotherium simum simum | Buffalo and big game |
Buffalo | Buffalo (Cape) | Cape buffalo | Syncerus caffer caffer | Buffalo and big game |
Buffalo | Buffalo (Nile) | Nile buffalo | Syncerus caffer aequinoctialis | Buffalo and big game |
Buffalo | Buffalo (Central African savanna) | Central African savanna buffalo | Syncerus caffer aequinoctialis | Buffalo and big game | ?=
Buffalo | Buffalo (West African) | West African savanna buffalo | Syncerus caffer brachyceros | Buffalo and big game |
Buffalo | Buffalo (Forest) | Dwarf forest buffalo | Syncerus caffer nanus | Buffalo and big game |
Hippo | Hippo | Hippopotamus | Hippopotamus amphibius | Buffalo and big game |
Crocodile | Crocodile (Nile) | Nile crocodile | Crocodylus niloticus | Reptiles |
Warthog | Warthog | Warthog | Phacochoerus africanus | Pigs and warthogs |
Giant forest hog | Giant forest hog | Giant forest hog | Hylochoerus meinertzhageni | Pigs and warthogs |
Bushpig | Bushpig | Bushpig | Potamochoerus larvatus | Pigs and warthogs |
Red river hog | Red river hog | Red river hog | Potamochoerus porcus | Pigs and warthogs |
Barbary wild boar | Barbary wild boar | Barbary wild boar | Sus scrofa algira | Pigs and warthogs | ?
Eland | Eland (Giant)| Central African giant eland | Taurotragus derbianus gigas | Antelope |
Eland | Eland | Cape eland | Taurotragus oryx oryx | Antelope |
Eland | Eland (Livingstone's) | Livingstone eland | Taurotragus oryx livingstonii | Antelope |
Eland | Eland (East African) | East African eland | Taurotragus oryx pattersonianus | Antelope |
Bongo | Bongo | Western bongo | Tragelaphus eurycerus eurycerus | Antelope |
Bongo | Bongo (Central African) | Central African bongo | Tragelaphus eurycerus eurycerus | Antelope | ?=
Bongo | Bongo (Eastern, Kenya) | Eastern bongo (Kenya) | Tragelaphus eurycerus isaaci | Antelope |
Kudu | Kudu | Southern greater kudu | Tragelaphus strepsiceros strepsiceros | Antelope |
Kudu | Kudu (Eastern Cape greater) | Eastern Cape greater kudu | Tragelaphus strepsiceros strepsiceros | Antelope | =
Kudu | Kudu (East African greater) | East African greater kudu | Tragelaphus strepsiceros bea | Antelope |
Kudu | Kudu (Abyssinian greater) | Abyssinian greater kudu | Tragelaphus strepsiceros chora | Antelope |
Kudu | Kudu (Western greater) | Western greater kudu | Tragelaphus strepsiceros cottoni | Antelope |
Kudu | Kudu (Lesser) | Lesser kudu | Tragelaphus imberbis | Antelope |
Nyala | Nyala (Mountain) | Mountain nyala | Tragelaphus buxtoni | Antelope |
Nyala | Nyala | Common nyala | Tragelaphus angasii | Antelope |
Sitatunga | Sitatunga | Zambezi sitatunga | Tragelaphus spekii selousi | Antelope |
Sitatunga | Sitatunga (Forest) | Forest sitatunga | Tragelaphus spekii gratus | Antelope |
Sitatunga | Sitatunga (East African) | East African sitatunga | Tragelaphus spekii spekii | Antelope |
Sitatunga | Sitatunga (Sesse Islands) | Sesse Islands sitatunga | Tragelaphus spekii sylvestris | Antelope |
Bushbuck | Bushbuck (Harnessed) | Harnessed bushbuck | Tragelaphus scriptus scriptus | Antelope |
Bushbuck | Bushbuck (Nile) | Nile bushbuck | Tragelaphus scriptus bor | Antelope |
Bushbuck | Bushbuck (Abyssinian) | Abyssinian bushbuck | Tragelaphus scriptus decula | Antelope | ?
Bushbuck | Bushbuck (Menelik's) | Menelik bushbuck | Tragelaphus scriptus meneliki | Antelope |
Bushbuck | Bushbuck (East African) | East African bushbuck | Tragelaphus scriptus delamerei | Antelope | ?
Bushbuck | Bushbuck (Chobe) | Chobe bushbuck | Tragelaphus scriptus ornatus | Antelope |
Bushbuck | Bushbuck (Limpopo) | Limpopo bushbuck | Tragelaphus scriptus roualeyni | Antelope |
Bushbuck | Bushbuck (Cape) | Cape bushbuck | Tragelaphus scriptus sylvaticus | Antelope |
Sable | Sable | Common sable antelope | Hippotragus niger niger | Antelope |
Sable | Sable (Eastern) | Roosevelt sable antelope | Hippotragus niger roosevelti | Antelope |
Roan | Roan (Western) | Western roan antelope | Hippotragus equinus koba | Antelope |
Roan | Roan (Sudan) | Sudan roan antelope | Hippotragus equinus bakeri | Antelope | ?
Roan | Roan (Eastern) | East African roan antelope | Hippotragus equinus langheldi | Antelope |
Roan | Roan | Southern roan antelope | Hippotragus equinus equinus | Antelope |
Gemsbok | Gemsbok | Kalahari gemsbok | Oryx gazella gazella | Antelope |
Gemsbok | Gemsbok (Angolan) | Angolan gemsbok | Oryx gazella gazella | Antelope | ?=
Oryx | Oryx (Beisa) | Beisa oryx | Oryx beisa beisa | Antelope |
Oryx | Oryx (Scimitar-horned) | Scimitar-horned oryx | Oryx dammah | Antelope |
Oryx | Oryx (Fringe-eared) | Fringe-eared oryx | Oryx beisa callotis | Antelope |
Waterbuck | Waterbuck | Common waterbuck (or ringed) | Kobus ellipsiprymnus ellipsiprymnus | Antelope |
Waterbuck | Waterbuck (Sing-sing) | Sing-sing waterbuck | Kobus ellipsiprymnus ellipsiprymnus | Antelope | ?=
Waterbuck | Waterbuck (Defassa) | E. African defassa waterbuck | Kobus ellipsiprymnus defassa | Antelope |
Waterbuck | Waterbuck (Crawshay's) | Crawshay defassa waterbuck | Kobus ellipsiprymnus crawshayi | Antelope |
Waterbuck | Waterbuck (Angolan defassa) | Angolan defassa waterbuck | Kobus ellipsiprymnus penricei | Antelope | ?
Lechwe | Lechwe (Common) | Common lechwe | Kobus leche | Antelope | ?
Lechwe | Lechwe (Kafue) | Kafue Flats lechwe | Kobus leche kafuensis | Antelope |
Lechwe | Lechwe | Red lechwe | Kobus leche leche | Antelope |
Lechwe | Lechwe (Black) | Black lechwe | Kobus smithemani | Antelope |
Lechwe | Lechwe (Nile) | Nile lechwe | Kobus megaceros | Antelope |
Kob | Kob (White-eared) | White-eared kob | Kobus kob leucotis | Antelope |
Kob | Kob (Uganda) | Uganda kob | Kobus kob thomasi | Antelope |
Kob | Kob (Central African) | Central African kob | Kobus kob alurae | Antelope | ?
Kob | Kob (Western) | Western kob (Buffon) | Kobus kob kob | Antelope |
Puku | Puku | Puku | Kobus vardonii | Antelope |
Reedbuck | Reedbuck (Common) | Common reedbuck | Redunca arundinum | Antelope |
Reedbuck | Reedbuck (Bohor, Eastern) | Eastern bohor reedbuck | Redunca redunca wardi | Antelope | ?
Reedbuck | Reedbuck (Bohor) | Abyssinian bohor reedbuck | Redunca redunca bohor | Antelope | ?
Reedbuck | Reedbuck (Bohor, Sudan) | Sudan bohor reedbuck | Redunca redunca cottoni | Antelope | ?
Reedbuck | Reedbuck (Bohor, Nigerian) | Nigerian bohor reedbuck | Redunca redunca nigeriensis | Antelope | ?
Reedbuck | Reedbuck (Nagor) | Nagor reedbuck | Redunca redunca nagor | Antelope | ?
Reedbuck | Reedbuck (Mountain) | Southern mountain reedbuck | Redunca fulvorufula fulvorufula | Antelope |
Reedbuck | Reedbuck (Mountain, Chanler's) | Chanler mountain reedbuck | Redunca fulvorufula chanleri | Antelope |
Reedbuck | Reedbuck (Mountain, Western) | Western mountain reedbuck | Redunca fulvorufula adamauae | Antelope | ?
Rhebok | Rhebok (Grey / Vaal) | Vaal rhebok | Pelea capreolus | Antelope |
Wildebeest | Wildebeest (Black) | Black wildebeest | Connochaetes gnou | Antelope |
Wildebeest | Wildebeest (Blue) | Blue wildebeest | Connochaetes taurinus taurinus | Antelope |
Wildebeest | Wildebeest (Cookson's) | Cookson wildebeest | Connochaetes taurinus cooksoni | Antelope |
Wildebeest | Wildebeest (Nyassa) | Nyasa wildebeest | Connochaetes taurinus johnstoni | Antelope |
Wildebeest | Wildebeest (Eastern white-bearded) | White-bearded wildebeest | Connochaetes taurinus albojubatus | Antelope |
Wildebeest | Wildebeest (Western white-bearded) | White-bearded wildebeest | Connochaetes taurinus mearnsi | Antelope |
Hartebeest | Hartebeest | Cape or red hartebeest | Alcelaphus buselaphus caama | Antelope |
Hartebeest | Hartebeest (Coke's) | Coke hartebeest | Alcelaphus buselaphus cokii | Antelope |
Hartebeest | Hartebeest (Jackson's) | Jackson's hartebeest | Alcelaphus buselaphus jacksoni | Antelope |
Hartebeest | Hartebeest (Kenya highland) | Kenya highland hartebeest | Alcelaphus buselaphus kenyae | Antelope | ?
Hartebeest | Hartebeest (Neumann's) | Neumann hartebeest | Alcelaphus buselaphus neumanni | Antelope | ?
Hartebeest | Hartebeest (Lelwel) | Lelwel hartebeest | Alcelaphus buselaphus lelwel | Antelope |
Hartebeest | Hartebeest (Western) | Western hartebeest | Alcelaphus buselaphus major | Antelope |
Hartebeest | Hartebeest (Lichtenstein's) | Lichtenstein hartebeest | Alcelaphus lichtensteinii | Antelope |
Hartebeest | Hartebeest (Swayne's) | Swayne hartebeest | Alcelaphus buselaphus swaynei | Antelope | ?
Damalisc | Korrigum | Korrigum | Damaliscus lunatus korrigum | Antelope |
Damalisc | Tiang | Tiang | Damaliscus lunatus tiang | Antelope |
Damalisc | Topi | Topi | Damaliscus lunatus jimela | Antelope |
Damalisc | Tsessebe | Tsessebe | Damaliscus lunatus lunatus | Antelope |
Damalisc | Hirola | Hirola or Hunter antelope | Beatragus hunteri | Antelope |
Damalisc | Blesbok | Blesbok | Damaliscus pygargus phillipsi | Antelope |
Damalisc | Bontebok | Bontebok | Damaliscus pygargus pygargus | Antelope |
Impala | Impala (Black-faced) | Black faced impala | Aepyceros melampus petersi | Antelope |
Impala | Impala (East African) | East African impala | Aepyceros melampus rendilis | Antelope | ?
Impala | Impala | Southern impala | Aepyceros melampus melampus | Antelope |
Gazelle | Gazelle (Southern Grant's) | Southern Grant gazelle | Nanger granti granti | Antelope | ?
Gazelle | Gazelle (Roberts') | Roberts gazelle | Nanger granti robertsi | Antelope | ?
Gazelle | Gazelle (Grant's) | Northern Grant gazelle | Nanger granti notata | Antelope | ?
Gazelle | Gazelle (Bright's) | Bright gazelle | Nanger granti brighti | Antelope | ?
Gazelle | Gazelle (Peters') | Peters gazelle (or Tana) | Nanger granti petersii | Antelope | ?
Gazelle | Gazelle (Soemmerring's) | Soemmerring gazelle | Nanger soemmerringii | Antelope |
Gazelle | Gazelle (Red-fronted) | Red-fronted gazelle (or Korin) | Eudorcas rufifrons | Antelope |
Gazelle | Gazelle (Heuglin's) | Heuglin gazelle | Eudorcas rufifrons tilonura | Antelope | ?
Gazelle | Gazelle (Thomson's) | Thomson gazelle | Eudorcas thomsonii | Antelope |
Gazelle | Gazelle (Mongalla) | Mongalla gazelle | Eudorcas albonotata | Antelope |
Gazelle | Gazelle (Dorcas) | Sahara dorcas gazelle | Gazella dorcas | Antelope |
Gazelle | Gazelle (Egyptian dorcas) | Egyptian dorcas gazelle | Gazella dorcas dorcas | Antelope | ?
Gazelle | Gazelle (Eritrean) | Eritrean gazelle | Gazella erlangeri | Antelope | ?
Gazelle | Gazelle (Isabelline) | Isabelline gazelle | Gazella isabella | Antelope | ?
Springbok | Springbok (Kalahari) | Kalahari springbok | Antidorcas marsupialis hofmeyri | Antelope |
Springbok | Springbok (Angolan) | Angolan springbok | Antidorcas marsupialis angolensis | Antelope |
Springbok | Springbok | South African springbok | Antidorcas marsupialis marsupialis | Antelope |
Gerenuk | Gerenuk | Southern gerenuk | Litocranius walleri walleri | Antelope |
Gerenuk | Gerenuk (Northern) | Northern gerenuk | Litocranius walleri sclateri | Antelope |
Klipspringer | Klipspringer | Klipspringer | Oreotragus oreotragus | Antelope |
Oribi | Oribi | Common oribi | Ourebia ourebi | Antelope |
Oribi | Oribi (Haggard's) | Haggard oribi | Ourebia ourebi haggardi | Antelope |
Steenbok | Steenbok | Steenbok | Raphicerus campestris | Antelope |
Grysbok | Grysbok (Cape) | Cape grysbok | Raphicerus melanotis | Antelope |
Grysbok | Grysbok (Sharpe's) | Sharpe grysbok | Raphicerus sharpei | Antelope |
Suni | Suni (Livingstone's) | Livingstone suni | Nesotragus moschatus livingstonianus | Antelope |
Suni | Suni | East African suni | Nesotragus moschatus moschatus | Antelope |
Suni | Suni (Zanzibar) | Zanzibar suni | Nesotragus moschatus moschatus | Antelope | ?=
Royal antelope | Royal antelope | Royal antelope | Neotragus pygmaeus | Antelope |
Bates pygmy antelope | Bates's pygmy antelope | Bates pygmy antelope | Nesotragus batesi | Antelope |
Dik-dik | Dik-dik (Salt's) | Salt dik-dik | Madoqua saltiana | Antelope |
Dik-dik | Dik-dik (Harar) | Harar dik-dik | Madoqua saltiana hararensis | Antelope | ?
Dik-dik | Dik-dik (Guenther's) | Guenther dik-dik | Madoqua guentheri | Antelope |
Dik-dik | Dik-dik (Kirk's) | Kirk dik-dik | Madoqua kirkii | Antelope |
Dik-dik | Dik-dik (Damara) | Damara dik-dik | Madoqua damarensis | Antelope |
Dik-dik | Dik-dik (Phillips's) | Phillips dik-dik | Madoqua phillipsi | Antelope |
Duiker | Duiker (Common) | Southern bush duiker | Sylvicapra grimmia | Antelope |
Duiker | Duiker (Angolan bush) | Angolan bush duiker | Sylvicapra grimmia angolae | Antelope | ?
Duiker | Duiker (East African bush) | East African bush duiker | Sylvicapra grimmia altivallis | Antelope | ?
Duiker | Duiker (Western bush) | Western bush duiker | Sylvicapra grimmia coronata | Antelope | ?
Duiker | Duiker (Yellow-backed) | Yellow-backed duiker | Cephalophus silvicultor | Antelope |
Duiker | Duiker (Abbott's) | Abbott duiker | Cephalophus spadix | Antelope |
Duiker | Duiker (Bay) | Bay duiker | Cephalophus dorsalis | Antelope |
Duiker | Duiker (Peters') | Peters duiker | Cephalophus callipygus | Antelope |
Duiker | Duiker (Weyns's) | Weyns duiker | Cephalophus weynsi | Antelope |
Duiker | Duiker (White-bellied) | Gabon duiker (or white-bellied) | Cephalophus leucogaster | Antelope |
Duiker | Duiker (Black-fronted) | Black-fronted duiker | Cephalophus nigrifrons | Antelope |
Duiker | Duiker (Ogilby's) | Ogilby duiker | Cephalophus ogilbyi | Antelope |
Duiker | Duiker (Zebra) | Zebra duiker | Cephalophus zebra | Antelope |
Duiker | Duiker (Black) | Black duiker | Cephalophus niger | Antelope |
Duiker | Duiker (Harvey's) | Harvey red duiker | Cephalophus harveyi | Antelope |
Duiker | Duiker (Red) | Natal red duiker | Cephalophus natalensis | Antelope |
Duiker | Duiker (Red-flanked) | Red-flanked duiker | Cephalophus rufilatus | Antelope |
Duiker | Duiker (Maxwell's) | Maxwell duiker | Philantomba maxwellii | Antelope |
Duiker | Duiker (Blue) | Blue duiker | Philantomba monticola | Antelope |
Duiker | Duiker (Ader's) | Ader duiker | Cephalophus adersi | Antelope |
Water chevrotain | Water chevrotain | Water chevrotain | Hyemoschus aquaticus | Antelope |
Nubian ibex | Nubian ibex | Nubian ibex | Capra nubiana | Introduced game |
Aoudad | Aoudad (Barbary sheep) | Aoudad or Barbary sheep | Ammotragus lervia | Introduced game |
Fallow Deer | Fallow Deer | European fallow deer | Dama dama | Introduced game |
Himalayan tahr | Himalayan tahr | Himalayan tahr | Hemitragus jemlahicus | Introduced game |
Mouflon | Mouflon | European mouflon sheep | Ovis aries musimon | Introduced game |
Red Deer | Red Deer | Red deer | Cervus elaphus | Introduced game |
Blackbuck | Blackbuck | Blackbuck | Antilope cervicapra | Introduced game |
Axis Deer | Axis Deer | Axis deer | Axis axis | Introduced game |
Water buffalo | Water buffalo | Water buffalo | Bubalus bubalis | Introduced game |
Hog deer | Hog deer | Hog deer | Axis porcinus | Introduced game |
Arabian oryx | Arabian oryx | Arabian oryx | Oryx leucoryx | Introduced game |
Javan rusa | Javan rusa | Javan rusa | Cervus timorensis | Introduced game |
American bison | American bison | American bison | Bison bison | Introduced game |
Feral goat | Feral goat | Feral goat | Capra hircus | Introduced game |
Addax | Addax | Addax | Addax nasomaculatus | Introduced game |
Pere David's deer | Père David's deer | Père David deer | Elaphurus davidianus | Introduced game |
`;

export const SCI_CATEGORIES: SciCategory[] = TABLE.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
  const [family, name, category, sci, group, flags = ''] = l.split('|').map(x => x.trim());
  return { family, name, category, sci, group, guess: flags.includes('?'), shared: flags.includes('=') };
});

/** Colours that SCI lists as categories of their own (all other colours, golden, king, royal ..., are not SCI categories). */
export const SCI_COLOURS: Record<string, string[]> = {
  Springbok: ['Black', 'White', 'Copper'],
  Blesbok: ['White'],
};
