import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

const BUCKET = 'trophy-type-images';

const TROPHY_TYPE_IDS = [
  'shoulder-mount',
  'full-body-mount',
  'pedestal-mount',
  'euro-mount',
  'tan-to-fur',
  'custom-design',
];

// Unsplash fallback images — shown when no admin-uploaded image exists
const FALLBACK_IMAGES: Record<string, string> = {
  'shoulder-mount':
    'https://images.unsplash.com/photo-1715532176267-9f62e4650c9e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=800',
  'euro-mount':
    'https://images.unsplash.com/photo-1577964723545-2ee160c50431?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=800',
  'tan-to-fur':
    'https://images.unsplash.com/photo-1713860752281-9bc6ba194346?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=800',
  'full-body-mount':
    'https://images.unsplash.com/photo-1612540136494-fc3b9d7a11e6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=800',
  'pedestal-mount':
    'https://images.unsplash.com/photo-1481833761820-0509d3217039?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=800',
  'custom-design':
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=800',
};

export type TrophyTypeImageMap = Record<string, string>;

export function useTrophyTypeImages() {
  const [images, setImages] = useState<TrophyTypeImageMap>(FALLBACK_IMAGES);
  const [uploading, setUploading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      // List files in bucket
      const { data } = await supabase.storage.from(BUCKET).list('', { limit: 50 });
      if (data && data.length > 0) {
        const uploadedIds = data.map(f => f.name.replace(/\.[^.]+$/, ''));
        const updated: TrophyTypeImageMap = { ...FALLBACK_IMAGES };
        for (const id of TROPHY_TYPE_IDS) {
          if (uploadedIds.includes(id)) {
            const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(`${id}.jpg`);
            // Bust cache with timestamp stored in file metadata or just use cache-bust param
            updated[id] = urlData.publicUrl + `?t=${data.find(f => f.name.startsWith(id))?.updated_at ?? ''}`;
          }
        }
        setImages(updated);
      }
    } catch {
      // Bucket may not exist yet — fall back to Unsplash images silently
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function uploadImage(trophyTypeId: string, file: File) {
    setUploading(trophyTypeId);
    try {
      // Always use .jpg extension for simplicity
      const path = `${trophyTypeId}.jpg`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      await load();
    } catch (err: any) {
      throw err;
    } finally {
      setUploading(null);
    }
  }

  return { images, loading, uploading, reload: load, uploadImage };
}

export { FALLBACK_IMAGES, TROPHY_TYPE_IDS };
