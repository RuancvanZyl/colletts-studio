// Trophy production pipeline — defines stage order per mount type

export const PIPELINE_STAGES: Record<string, string[]> = {
  'Shoulder Mount':        ['receiving', 'cleaning_bleach', 'tannery', 'mounting', 'finishing', 'quality_check', 'photos', 'administration'],
  'Offset Shoulder Mount': ['receiving', 'cleaning_bleach', 'tannery', 'mounting', 'finishing', 'quality_check', 'photos', 'administration'],
  'Pedestal Mount':        ['receiving', 'cleaning_bleach', 'tannery', 'mounting', 'finishing', 'quality_check', 'photos', 'administration'],
  'Full Mount':            ['receiving', 'tannery', 'mounting', 'finishing', 'quality_check', 'photos', 'administration'],
  'Flat Skin':             ['receiving', 'tannery', 'storage', 'administration'],
  'Euro Mount':            ['receiving', 'cleaning_bleach', 'mounting', 'finishing', 'quality_check', 'photos', 'administration'],
  'Bleach Mount':          ['receiving', 'cleaning_bleach', 'mounting', 'finishing', 'quality_check', 'photos', 'administration'],
};

const DEFAULT_PIPELINE = ['receiving', 'cleaning_bleach', 'tannery', 'mounting', 'finishing', 'quality_check', 'photos', 'administration'];

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
  'Abri':    ['receiving', 'quality_check', 'administration'],
  'Steve':   ['receiving', 'quality_check', 'photos'],
  'Vince':   ['receiving', 'cleaning_bleach', 'storage'],
  'Ruan':    ['receiving', 'photos'],
  'Divine':  ['tannery'],
  'Emanuel': ['mounting'],
  'Kyle':    ['finishing'],
  'Cecilia': ['administration'],
};

export function getStaffDepartments(fullName: string): string[] {
  // Match by first name or full name
  const firstName = fullName.split(' ')[0];
  return STAFF_DEPARTMENTS[fullName] ?? STAFF_DEPARTMENTS[firstName] ?? [];
}

export const DEPT_LABELS: Record<string, string> = {
  receiving:       'Receiving',
  cleaning_bleach: 'Cleaning & Bleach',
  storage:         'Storage',
  tannery:         'Tannery',
  mounting:        'Mounting',
  finishing:       'Finishing',
  quality_check:   'Quality Check',
  photos:          'Photos',
  administration:  'Administration',
};

export const DEPT_COLORS: Record<string, string> = {
  receiving:       'bg-blue-600',
  cleaning_bleach: 'bg-purple-600',
  storage:         'bg-slate-600',
  tannery:         'bg-amber-600',
  mounting:        'bg-green-600',
  finishing:       'bg-orange-600',
  quality_check:   'bg-red-600',
  photos:          'bg-cyan-600',
  administration:  'bg-indigo-600',
};
