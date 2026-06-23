import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Textarea } from '../../ui/textarea';
import { Label } from '../../ui/label';
import { Badge } from '../../ui/badge';
import { Camera, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../lib/auth';
import type { JobPhase } from '../../../../lib/database.types';

const PHASE_LABELS: Record<JobPhase, string> = {
  intake: 'Intake',
  skin_processing: 'Skin Cleaning & Salting',
  skull_processing: 'Skull Processing',
  storage_pre: 'Pre-Tannery Storage',
  tannery: 'Tannery',
  storage_post: 'Post-Tannery Storage',
  mounting: 'Mounting',
  finishing: 'Finishing',
  quality_check: 'Quality Check',
  packing: 'Packing',
  shipped: 'Shipped',
  delivered: 'Delivered',
};

interface PhaseAdvanceDialogProps {
  open: boolean;
  onClose: () => void;
  jobId: string;
  currentPhase: JobPhase;
  nextPhase: JobPhase;
  jobLabel: string;
  onConfirm: (jobId: string, nextPhase: JobPhase, staffId: string, proof: { comment?: string; attachment_id?: string }) => Promise<{ error: string | null }>;
}

export function PhaseAdvanceDialog({ open, onClose, jobId, currentPhase, nextPhase, jobLabel, onConfirm }: PhaseAdvanceDialogProps) {
  const { user } = useAuth();
  const [comment, setComment] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attachmentId, setAttachmentId] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const hasProof = comment.trim().length > 0 || attachmentId !== null;

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `jobs/${jobId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('attachments').upload(path, file);
    if (error) { toast.error(error.message); setUploading(false); return; }

    const { data: att, error: attErr } = await supabase
      .from('attachments')
      .insert({ entity_type: 'job', entity_id: jobId, storage_path: path, caption: `${PHASE_LABELS[currentPhase]} photo`, uploaded_by: user.id })
      .select()
      .single();
    if (attErr) { toast.error(attErr.message); setUploading(false); return; }

    setAttachmentId(att.id);
    setPhotoPreview(URL.createObjectURL(file));
    setUploading(false);
    toast.success('Photo uploaded');
  }

  async function handleSubmit() {
    if (!user) { toast.error('Not logged in'); return; }
    if (!hasProof) { toast.error('Add a comment or photo before advancing'); return; }
    setSaving(true);
    const result = await onConfirm(jobId, nextPhase, user.id, {
      comment: comment.trim() || undefined,
      attachment_id: attachmentId ?? undefined,
    });
    setSaving(false);
    if (result.error) { toast.error(result.error); return; }
    toast.success(`Moved to ${PHASE_LABELS[nextPhase]}`);
    handleClose();
  }

  function handleClose() {
    setComment('');
    setAttachmentId(null);
    setPhotoPreview(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Advance Job Phase</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">{jobLabel}</p>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="secondary">{PHASE_LABELS[currentPhase]}</Badge>
              <ArrowRight className="w-4 h-4 text-slate-400" />
              <Badge className="bg-blue-600">{PHASE_LABELS[nextPhase]}</Badge>
            </div>
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg flex gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 dark:text-amber-200">
              A photo or comment is required to advance. This creates an audit trail.
            </p>
          </div>

          {/* Photo upload */}
          <div>
            <Label>Photo evidence</Label>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            {photoPreview ? (
              <div className="mt-2 relative">
                <img src={photoPreview} alt="Preview" className="w-full h-32 object-cover rounded-lg border border-slate-200 dark:border-slate-700" />
                <Button size="sm" variant="outline" className="absolute top-2 right-2" onClick={() => { setAttachmentId(null); setPhotoPreview(null); }}>
                  Remove
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="mt-2 w-full border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-4 text-center hover:border-blue-400 dark:hover:border-blue-600 transition-colors"
              >
                {uploading ? (
                  <Loader2 className="w-5 h-5 text-slate-400 mx-auto animate-spin" />
                ) : (
                  <>
                    <Camera className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                    <p className="text-xs text-slate-500">Click to upload photo</p>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Comment */}
          <div>
            <Label htmlFor="advance-comment">Comment{!photoPreview && ' (required if no photo)'}</Label>
            <Textarea
              id="advance-comment"
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Describe the work completed, any notes..."
              rows={3}
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || !hasProof} className="bg-green-600 hover:bg-green-700">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
            Advance Phase
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { PHASE_LABELS };
