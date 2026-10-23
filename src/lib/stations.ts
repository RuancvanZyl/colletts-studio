/** The workstations: which screen, which department. One list used by the menu, the Stations page and the overview. */
export const STATIONS: { view: string; label: string; dept: string }[] = [
  { view: 'skinning',         label: 'Skinning',          dept: 'skinning' },
  { view: 'salting',          label: 'Salting',           dept: 'salting' },
  { view: 'tannery',          label: 'Tannery',           dept: 'tannery' },
  { view: 'skin-processing',  label: 'Cleaning & bleach', dept: 'cleaning_bleach' },
  { view: 'skull-processing', label: 'Skull processing',  dept: 'cleaning_bleach' },
  { view: 'dip-pack',         label: 'Dip & pack',        dept: 'dip_pack' },
  { view: 'storage',          label: 'Storage',           dept: 'storage' },
  { view: 'mounting',         label: 'Mounting',          dept: 'mounting' },
  { view: 'finishing',        label: 'Finishing',         dept: 'finishing' },
  { view: 'quality',          label: 'Quality check',     dept: 'quality_check' },
];

/** Where to go when someone taps a department name. */
export const DEPT_TO_VIEW: Record<string, string> = {
  receiving: 'workshop-brief', skinning: 'skinning', salting: 'salting', tannery: 'tannery',
  cleaning_bleach: 'skin-processing', dip_pack: 'dip-pack', storage: 'storage', mounting: 'mounting',
  finishing: 'finishing', quality_check: 'quality', photos: 'photos-admin', packing: 'packing',
  administration: 'ready-to-ship',
};
