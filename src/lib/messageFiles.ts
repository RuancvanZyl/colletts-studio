/** Photos and PDFs inside messages. They live in a private folder named after the client, so only that client and the workshop can open them. */
import { supabase } from './supabase';
import { shrinkPhoto } from './offline/photos';

export async function uploadMessageFiles(clientId: string, files: File[]): Promise<string[]> {
  const out: string[] = [];
  for (const f of files) {
    const isPdf = f.type === 'application/pdf';
    const body: Blob = isPdf ? f : await shrinkPhoto(f, 2000, 0.85);
    const path = `${clientId}/${crypto.randomUUID()}.${isPdf ? 'pdf' : 'jpg'}`;
    const { error } = await (supabase as any).storage.from('message-files').upload(path, body, { contentType: isPdf ? 'application/pdf' : 'image/jpeg' });
    if (error) throw new Error(error.message);
    out.push(path);
  }
  return out;
}

export async function messageFileUrl(path: string): Promise<string | null> {
  const { data } = await (supabase as any).storage.from('message-files').createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}
