// Dropbox API helper — uses the token from VITE_DROPBOX_TOKEN env var

const TOKEN = import.meta.env.VITE_DROPBOX_TOKEN as string | undefined;

export type DropboxEntry = {
  '.tag': 'file' | 'folder';
  name: string;
  path_lower: string;
  path_display: string;
  id: string;
  size?: number;
  client_modified?: string;
};

export type DropboxListResult = {
  entries: DropboxEntry[];
  cursor: string;
  has_more: boolean;
};

async function dbx<T>(endpoint: string, body: Record<string, any>): Promise<T> {
  if (!TOKEN) throw new Error('VITE_DROPBOX_TOKEN not set');
  const res = await fetch(`https://api.dropboxapi.com/2/${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Dropbox API error: ${text}`);
  }
  return res.json();
}

export async function listFolder(path: string): Promise<DropboxListResult> {
  return dbx('files/list_folder', { path, recursive: false, limit: 300 });
}

export async function listFolderContinue(cursor: string): Promise<DropboxListResult> {
  return dbx('files/list_folder/continue', { cursor });
}

export async function getAllEntries(path: string): Promise<DropboxEntry[]> {
  const entries: DropboxEntry[] = [];
  let result = await listFolder(path);
  entries.push(...result.entries);
  while (result.has_more) {
    result = await listFolderContinue(result.cursor);
    entries.push(...result.entries);
  }
  return entries;
}

export function getDropboxWebUrl(path: string): string {
  return `https://www.dropbox.com/home${path}`;
}
