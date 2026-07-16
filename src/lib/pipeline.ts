// Trophy production pipeline — defines stage order per mount type and process type

// Full in-house taxidermy pipeline
export const PIPELINE_STAGES: Record<string, string[]> = {
  // Cape mounts — skin must be cleaned, salted, tanned before mounting
  'Shoulder Mount':        ['receiving', 'skinning', 'salting', 'cleaning_bleach', 'tannery', 'mounting', 'finishing', 'quality_check', 'photos', 'packing', 'administration'],
  'Offset Shoulder Mount': ['receiving', 'skinning', 'salting', 'cleaning_bleach', 'tannery', 'mounting', 'finishing', 'quality_check', 'photos', 'packing', 'administration'],
  'Pedestal Mount':        ['receiving', 'skinning', 'salting', 'cleaning_bleach', 'tannery', 'mounting', 'finishing', 'quality_check', 'photos', 'packing', 'administration'],
  'Full Mount':            ['receiving', 'skinning', 'salting', 'tannery', 'mounting', 'finishing', 'quality_check', 'photos', 'packing', 'administration'],
  'Half Mount':            ['receiving', 'skinning', 'salting', 'cleaning_bleach', 'tannery', 'mounting', 'finishing', 'quality_check', 'photos', 'packing', 'administration'],
  // Skull / bone work — no skin processing
  'Euro Skull':            ['receiving', 'skinning', 'cleaning_bleach', 'mounting', 'finishing', 'quality_check', 'photos', 'packing', 'administration'],
  'Euro Mount':            ['receiving', 'skinning', 'cleaning_bleach', 'mounting', 'finishing', 'quality_check', 'photos', 'packing', 'administration'],
  'Bleach Only':           ['receiving', 'skinning', 'cleaning_bleach', 'mounting', 'quality_check', 'packing', 'administration'],
  'Artistic Skull':        ['receiving', 'skinning', 'cleaning_bleach', 'mounting', 'finishing', 'quality_check', 'photos', 'packing', 'administration'],
  // Skin / flat work
  'Flat Skin':             ['receiving', 'skinning', 'salting', 'tannery', 'packing', 'administration'],
  'Rug Mount on Felt':     ['receiving', 'skinning', 'salting', 'tannery', 'mounting', 'finishing', 'quality_check', 'photos', 'packing', 'administration'],
  'Tan Only':              ['receiving', 'skinning', 'salting', 'tannery', 'packing', 'administration'],
  // Client ships overseas to mount — we treat & pack
  'Dip & Pack':            ['receiving', 'skinning', 'salting', 'dip_pack', 'packing', 'administration'],
  // Pre-tan only — client mounts overseas, we just tan the skin
  'Life Cast':             ['receiving', 'mounting', 'finishing', 'quality_check', 'photos', 'packing', 'administration'],
};

// Stall thresholds in hours per department (after this → red alert)
export const STALL_HOURS: Record<string, number> = {
  receiving:       24,
  skinning:        48,
  salting:         72,
  cleaning_bleach: 96,
  dip_pack:        48,
  tannery:         336, // tannery can take 2 weeks — alert after 14 days
  storage:         720,
  mounting:        168,
  finishing:       96,
  quality_check:   24,
  photos:          24,
  packing:         48,
  administration:  72,
};

const DEFAULT_PIPELINE = ['receiving', 'skinning', 'salting', 'cleaning_bleach', 'tannery', 'mounting', 'finishing', 'quality_check', 'photos', 'packing', 'administration'];

export function getPipeline(mountType: string): string[] {
  return PIPELINE_STAGES[mountType] ?? DEFAULT_PIPELINE;
}

export function getNextDepartment(mountType: string, currentDept: string): string | null {
  const stages = getPipeline(mountType);
  const idx = stages.indexOf(currentDept);
  if (idx === -1 || idx === stages.length - 1) return null;
  return stages[idx + 1];
}

// Maps each staff member's name to the departments they lead
export const STAFF_DEPARTMENTS: Record<string, string[]> = {
  'Abri':    ['receiving', 'quality_check', 'administration', 'packing'],
  'Steve':   ['receiving', 'quality_check', 'photos', 'administration'],
  'Vince':   ['receiving', 'skinning', 'salting', 'cleaning_bleach', 'storage', 'dip_pack'],
  'Ruan':    ['receiving', 'photos'],
  'Divine':  ['tannery'],
  'Emanuel': ['mounting'],
  'Kyle':    ['finishing'],
  'Cecilia': ['administration'],
};

// Maps DB `departments.name` values to pipeline stage keys
const DB_DEPT_TO_STAGES: Record<string, string[]> = {
  'Receiving':          ['receiving'],
  'Skin Processing':    ['skinning', 'salting', 'cleaning_bleach', 'dip_pack'],
  'Skull Processing':   ['cleaning_bleach'],
  'Storage':            ['storage'],
  'Tannery':            ['tannery'],
  'Mounting':           ['mounting'],
  'Finishing':          ['finishing'],
  'Quality Control':    ['quality_check', 'photos'],
  'Packing & Shipping': ['packing', 'administration'],
};

export function getStaffDepartments(fullName: string, departmentName?: string | null): string[] {
  // 1. Hardcoded map by name (legacy staff)
  const firstName = fullName.split(' ')[0];
  const fromName = STAFF_DEPARTMENTS[fullName] ?? STAFF_DEPARTMENTS[firstName];
  if (fromName) return fromName;
  // 2. Fall back to the department assigned on their staff profile
  if (departmentName && DB_DEPT_TO_STAGES[departmentName]) return DB_DEPT_TO_STAGES[departmentName];
  return [];
}

export const DEPT_LABELS: Record<string, string> = {
  receiving:       'Receiving',
  skinning:        'Skinning',
  salting:         'Salting',
  cleaning_bleach: 'Cleaning & Bleach',
  dip_pack:        'Dip & Pack',
  storage:         'Storage',
  tannery:         'Tannery',
  mounting:        'Mounting',
  finishing:       'Finishing',
  quality_check:   'Quality Check',
  photos:          'Photos',
  packing:         'Packing',
  administration:  'Administration',
};

export const DEPT_COLORS: Record<string, string> = {
  receiving:       'bg-blue-600',
  skinning:        'bg-rose-600',
  salting:         'bg-pink-600',
  cleaning_bleach: 'bg-purple-600',
  dip_pack:        'bg-teal-600',
  storage:         'bg-slate-600',
  tannery:         'bg-amber-600',
  mounting:        'bg-green-600',
  finishing:       'bg-orange-600',
  quality_check:   'bg-red-600',
  photos:          'bg-cyan-600',
  packing:         'bg-lime-600',
  administration:  'bg-indigo-600',
};
