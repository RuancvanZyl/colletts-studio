/**
 * Trophy photos — taken on the phone, kept on the device until they can be uploaded.
 * Uploading is safe to repeat: every photo has a fixed id and file name, so a retry never duplicates.
 */
import { supabase } from '../supabase';
import { blobPut, blobGet, blobDelete } from './idb';
import { classify, performActionWith, registerExecutor } from './outbox';
import type { Executor } from './outboxCore';

export type PhotoKind = 'arrival' | 'progress' | 'finished' | 'reference';

export interface PhotoBatch {
  clientId: string;
  huntId: string | null;
  docId: string | null;
  kind: PhotoKind;
  caption: string;
  shared: boolean;
  staffId: string | null;
  staffName: string | null;
  items: { id: string; blobId: string }[];
  takenAt: string;
}

/** Shrink phone photos (often 4–8 MB) so they upload quickly on a weak connection. */
export async function shrinkPhoto(file: File, maxSide = 1800, quality = 0.82): Promise<Blob> {
  try {
    if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as any);
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h);
    bmp.close?.();
    const out: Blob | null = await new Promise(res => canvas.toBlob(res, 'image/jpeg', quality));
    return out && out.size < file.size ? out : file;
  } catch { return file; }
}

/**
 * Print the date, time, department and name onto the picture itself, along the bottom, so it can be seen on the photo wherever it ends up.
 * Used for Mounting and Finishing, where a photo is the proof the stage was done. Falls back to the plain photo if the browser cannot draw it.
 */
export async function stampPhoto(file: Blob, text: string): Promise<Blob> {
  try {
    if (!file.type.startsWith('image/')) return file;
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as any);
    const canvas = document.createElement('canvas');
    canvas.width = bmp.width; canvas.height = bmp.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bmp, 0, 0);
    const size = Math.max(16, Math.round(bmp.height / 34));
    ctx.font = `bold ${size}px sans-serif`;
    const pad = Math.round(size * 0.6);
    ctx.fillStyle = 'rgba(0,0,0,0.62)';
    ctx.fillRect(0, bmp.height - size - pad * 2, bmp.width, size + pad * 2);
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, pad, bmp.height - size / 2 - pad);
    bmp.close?.();
    const out: Blob | null = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.85));
    return out ?? file;
  } catch { return file; }
}

export const photoPath = (clientId: string, id: string) => `trophy-photos/${clientId}/${id}.jpg`;

export const addPhotosExecutor: Executor = async a => {
  const x = a.args as unknown as PhotoBatch;
  try {
    for (const it of x.items) {
      const blob = await blobGet(it.blobId);
      const path = photoPath(x.clientId, it.id);
      if (blob) {
        const { error } = await (supabase as any).storage.from('client-photos')
          .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
        if (error) return classify(error);
      }   // no blob = uploaded on an earlier attempt
      const { error: dbErr } = await (supabase as any).from('trophy_photos').upsert({
        id: it.id, client_id: x.clientId, hunt_id: x.huntId, hunt_doc_id: x.docId, kind: x.kind,
        storage_path: path, caption: x.caption || null, shared_with_client: x.shared,
        taken_by: x.staffId, taken_by_name: x.staffName, taken_at: x.takenAt,
      }, { onConflict: 'id' });
      if (dbErr) return classify(dbErr);
      if (blob) await blobDelete(it.blobId);
    }
    return { ok: true };
  } catch (e: any) {
    return classify({ message: String(e?.message ?? e) });
  }
};
registerExecutor('photo_add', addPhotosExecutor);

/**
 * Save photos on the device and send them now if there is a connection (otherwise later).
 * Resolves quickly either way.
 */
export async function savePhotos(opts: {
  clientId: string; huntId?: string | null; docId?: string | null; kind: PhotoKind; files: Blob[];
  caption?: string; shared?: boolean; staffId: string | null; staffName: string | null;
}) {
  const items: { id: string; blobId: string }[] = [];
  for (const f of opts.files) {
    const blobId = crypto.randomUUID();
    await blobPut(blobId, f);
    items.push({ id: crypto.randomUUID(), blobId });
  }
  const batch: PhotoBatch = {
    clientId: opts.clientId, huntId: opts.huntId ?? null, docId: opts.docId ?? null, kind: opts.kind,
    caption: opts.caption ?? '', shared: opts.shared ?? opts.kind !== 'progress',
    staffId: opts.staffId, staffName: opts.staffName, items, takenAt: new Date().toISOString(),
  };
  return performActionWith('photo_add', batch as unknown as Record<string, unknown>, opts.staffId);
}
