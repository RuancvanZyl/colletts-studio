/**
 * huntFilm — makes a short cinematic film from a hunter's own photos, inside the app (no server, nothing uploaded).
 *
 *   title card (logo, name, place, dates)  →  the photos in story order, slow zoom and drift, soft cross-fades,
 *   captions, warm colour, film grain  →  closing card (logo, app details)  +  original ambient music made on the phone.
 *
 * `play` shows it on a canvas (the free preview stops after PREVIEW_SECONDS and carries a watermark).
 * `record` plays the full film in real time and records it to a video file the hunter can save and share.
 */

export const W = 720;
export const H = 1280;
export const PREVIEW_SECONDS = 12;

/** The story, in the order the film tells it. The hunter files each photo under a part. */
export const STORY_PARTS: { key: string; label: string; hint: string }[] = [
  { key: 'land',     label: 'The land',        hint: 'Wide shots of the bush, big skies, sunrise or sunset. Hold the phone sideways for these.' },
  { key: 'camp',     label: 'The camp',        hint: 'The lodge, the fire, the table, the vehicle, the little details of the place.' },
  { key: 'team',     label: 'The team',        hint: 'You, your friends, the professional hunter and the trackers.' },
  { key: 'tracking', label: 'The tracking',    hint: 'Walking, glassing, waiting, the shooting sticks, the moment before.' },
  { key: 'animal',   label: 'Your animal',     hint: 'A clean, dignified photo of the animal, from the front and from the side.' },
  { key: 'moment',   label: 'The moment',      hint: 'The handshake, the smiles, the celebration with your team.' },
  { key: 'other',    label: 'Anything else',   hint: 'Anything that is part of your hunt.' },
];
const PART_LABEL: Record<string, string> = Object.fromEntries(STORY_PARTS.map(p => [p.key, p.label]));
const PART_ORDER: Record<string, number> = Object.fromEntries(STORY_PARTS.map((p, i) => [p.key, i]));

export interface StoryPhoto { id: string; blob: Blob; part: string | null; caption: string | null; takenAt?: string }
export interface StoryMeta { hunterName: string; dates: string; place: string; species: string[]; appUrl: string; logo: Blob | null }

export function sortStory<T extends { part: string | null; takenAt?: string }>(photos: T[]): T[] {
  return [...photos].sort((a, b) => (PART_ORDER[a.part ?? 'other'] ?? 99) - (PART_ORDER[b.part ?? 'other'] ?? 99) || (a.takenAt ?? '').localeCompare(b.takenAt ?? ''));
}

const INTRO = 5.2, PER_PHOTO = 3.9, FADE = 0.9, OUTRO = 6.5;

interface Slide { kind: 'intro' | 'photo' | 'outro'; start: number; dur: number; index: number }

export function buildTimeline(photoCount: number): { slides: Slide[]; total: number } {
  const slides: Slide[] = [{ kind: 'intro', start: 0, dur: INTRO, index: 0 }];
  let end = INTRO;
  for (let i = 0; i < photoCount; i++) { const start = end - FADE; slides.push({ kind: 'photo', start, dur: PER_PHOTO, index: i }); end = start + PER_PHOTO; }
  const start = end - FADE;
  slides.push({ kind: 'outro', start, dur: OUTRO, index: 0 });
  return { slides, total: start + OUTRO };
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const ease = (x: number) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
const SERIF = 'Georgia, "Times New Roman", serif';
const SANS = '-apple-system, "Helvetica Neue", Arial, sans-serif';
const GOLD = '#d9b36c';

async function bitmap(blob: Blob): Promise<ImageBitmap> {
  try { return await createImageBitmap(blob, { imageOrientation: 'from-image' } as any); }
  catch { return await createImageBitmap(blob); }
}

function spaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number) {
  // letter-spaced text, centred on x
  const chars = [...text];
  const widths = chars.map(c => ctx.measureText(c).width);
  const total = widths.reduce((s, w) => s + w, 0) + spacing * (chars.length - 1);
  let cx = x - total / 2;
  const align = ctx.textAlign; ctx.textAlign = 'left';
  chars.forEach((c, i) => { ctx.fillText(c, cx, y); cx += widths[i] + spacing; });
  ctx.textAlign = align;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/).filter(Boolean); const lines: string[] = []; let line = '';
  for (const w of words) { const t = line ? `${line} ${w}` : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line);
  return lines;
}

export class HuntFilm {
  readonly timeline: { slides: Slide[]; total: number };
  private imgs: ImageBitmap[] = [];
  private logo: ImageBitmap | null = null;
  private ctx: CanvasRenderingContext2D;
  private grain: HTMLCanvasElement[] = [];
  private vignette!: CanvasGradient;
  private raf = 0;
  private audio: AmbientMusic | null = null;
  private stopped = false;

  constructor(private canvas: HTMLCanvasElement, private photos: StoryPhoto[], private meta: StoryMeta) {
    canvas.width = W; canvas.height = H;
    this.ctx = canvas.getContext('2d')!;
    this.timeline = buildTimeline(photos.length);
  }

  get duration() { return this.timeline.total; }

  async load() {
    this.imgs = await Promise.all(this.photos.map(p => bitmap(p.blob)));
    if (this.meta.logo) { try { this.logo = await bitmap(this.meta.logo); } catch { this.logo = null; } }
    // film grain: a few small noise tiles that are shuffled around
    for (let k = 0; k < 4; k++) {
      const g = document.createElement('canvas'); g.width = 192; g.height = 192;
      const gx = g.getContext('2d')!; const id = gx.createImageData(192, 192);
      for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
      gx.putImageData(id, 0, 0); this.grain.push(g);
    }
    this.vignette = this.ctx.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.78);
    this.vignette.addColorStop(0, 'rgba(0,0,0,0)'); this.vignette.addColorStop(1, 'rgba(0,0,0,0.62)');
  }

  dispose() { this.stopped = true; cancelAnimationFrame(this.raf); this.audio?.stop(); this.imgs.forEach(b => b.close?.()); this.logo?.close?.(); }

  // ── drawing ──────────────────────────────────────────────────────────────────
  /** one photo, cover-fitted, with a slow zoom and drift */
  private drawPhoto(img: ImageBitmap, u: number, dur: number, index: number, alpha: number, dim = 0) {
    const { ctx } = this;
    const p = ease(u / dur);
    const zoomIn = index % 2 === 0;
    const zoom = 1.06 + 0.12 * (zoomIn ? p : 1 - p);
    const base = Math.max(W / img.width, H / img.height) * zoom;
    const sw = W / base, sh = H / base;
    const dir = index % 3 === 0 ? 1 : index % 3 === 1 ? -1 : 0;
    const panX = dir * (p - 0.5) * 2, panY = (index % 2 === 0 ? 1 : -1) * (p - 0.5) * 0.6;
    const sx = clamp(img.width / 2 + panX * (img.width - sw) / 2 - sw / 2, 0, img.width - sw);
    const sy = clamp(img.height / 2 + panY * (img.height - sh) / 2 - sh / 2, 0, img.height - sh);
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
    if (dim > 0) { ctx.fillStyle = `rgba(0,0,0,${dim})`; ctx.fillRect(0, 0, W, H); }
    ctx.globalAlpha = 1;
  }

  private grade(alpha: number) {
    const { ctx } = this;
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = 'rgba(255,176,86,0.30)'; ctx.fillRect(0, 0, W, H);   // warm
    ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = this.vignette; ctx.fillRect(0, 0, W, H);              // vignette
    ctx.restore();
  }

  private grainOverlay(t: number) {
    const { ctx } = this;
    const g = this.grain[Math.floor(t * 12) % this.grain.length];
    ctx.save(); ctx.globalAlpha = 0.07; ctx.globalCompositeOperation = 'overlay';
    const ox = -Math.floor(Math.random() * 192), oy = -Math.floor(Math.random() * 192);
    for (let x = ox; x < W; x += 192) for (let y = oy; y < H; y += 192) ctx.drawImage(g, x, y);
    ctx.restore();
  }

  private caption(label: string, sub: string | null, u: number, dur: number, alpha: number) {
    const { ctx } = this;
    const a = Math.min(ease((u - 0.5) / 0.8), ease((dur - u - 0.5) / 0.6)) * alpha;
    if (a <= 0) return;
    const g = ctx.createLinearGradient(0, H * 0.72, 0, H);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${0.72 * a})`);
    ctx.fillStyle = g; ctx.fillRect(0, H * 0.72, W, H * 0.28);
    ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.fillStyle = GOLD;
    ctx.font = `600 22px ${SANS}`; spaced(ctx, label.toUpperCase(), W / 2, H - 150 + (1 - ease((u - 0.5) / 0.8)) * 14, 7);
    const lineW = 70 * ease((u - 0.7) / 0.8); ctx.fillRect(W / 2 - lineW / 2, H - 128, lineW, 2);
    if (sub) { ctx.fillStyle = '#fff'; ctx.font = `italic 32px ${SERIF}`; wrap(ctx, sub, W - 140).slice(0, 2).forEach((l, i) => ctx.fillText(l, W / 2, H - 82 + i * 40)); }
    ctx.globalAlpha = 1;
  }

  private drawLogo(cx: number, y: number, width: number, alpha: number) {
    if (!this.logo || alpha <= 0) return;
    const { ctx } = this; const h = width * this.logo.height / this.logo.width;
    // the logo file has a black background: 'screen' lets only the lit part of the logo show on top of the picture
    ctx.save(); ctx.globalAlpha = alpha; ctx.globalCompositeOperation = 'screen'; ctx.drawImage(this.logo, cx - width / 2, y, width, h); ctx.restore();
  }

  private intro(u: number) {
    const { ctx } = this; const first = this.imgs[0];
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    if (first) this.drawPhoto(first, u, INTRO + 2, 1, 0.5 * ease(u / 1.4), 0.25);
    this.grade(0.9);
    const a = (d: number, s = 0.9) => ease((u - d) / s);
    ctx.textAlign = 'center';
    this.drawLogo(W / 2, 100, 340, a(0.4, 1.2));
    ctx.fillStyle = GOLD; ctx.globalAlpha = a(1.2); ctx.font = `600 22px ${SANS}`; spaced(ctx, 'A HUNT STORY', W / 2, 590, 9);
    ctx.globalAlpha = a(1.5); ctx.fillRect(W / 2 - 40 * a(1.5, 1.2), 612, 80 * a(1.5, 1.2), 2);
    ctx.fillStyle = '#fff'; ctx.globalAlpha = a(1.9, 1.1);
    ctx.font = `bold 66px ${SERIF}`; wrap(ctx, this.meta.hunterName, W - 100).slice(0, 2).forEach((l, i) => ctx.fillText(l, W / 2, 705 + i * 74));
    ctx.globalAlpha = a(2.8, 1.0); ctx.fillStyle = 'rgba(255,255,255,0.86)'; ctx.font = `italic 30px ${SERIF}`;
    const sub = [this.meta.place, this.meta.dates].filter(Boolean).join('  ·  '); if (sub) wrap(ctx, sub, W - 120).slice(0, 2).forEach((l, i) => ctx.fillText(l, W / 2, 830 + i * 40));
    if (this.meta.species.length) { ctx.globalAlpha = a(3.4, 1.0) * 0.8; ctx.fillStyle = GOLD; ctx.font = `500 20px ${SANS}`; spaced(ctx, this.meta.species.slice(0, 4).join('  ·  ').toUpperCase(), W / 2, 930, 4); }
    ctx.globalAlpha = 1;
  }

  private outro(u: number) {
    const { ctx } = this; const last = this.imgs[this.imgs.length - 1];
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    if (last) this.drawPhoto(last, u, OUTRO + 2, 0, 0.35, 0.35);
    this.grade(0.8);
    const a = (d: number, s = 0.9) => ease((u - d) / s);
    ctx.textAlign = 'center';
    this.drawLogo(W / 2, 180, 460, a(0.3, 1.2));
    ctx.fillStyle = '#fff'; ctx.globalAlpha = a(1.3, 1.0); ctx.font = `italic 40px ${SERIF}`;
    ctx.fillText('Your hunt, preserved', W / 2, 720); ctx.fillText('for ever.', W / 2, 770);
    ctx.fillStyle = GOLD; ctx.globalAlpha = a(1.9); ctx.fillRect(W / 2 - 45, 810, 90, 2);
    ctx.globalAlpha = a(2.3, 1.0); ctx.font = `600 24px ${SANS}`; spaced(ctx, 'TROPHIES BY APEX TROPHY SOLUTIONS', W / 2, 870, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.88)'; ctx.globalAlpha = a(3.0, 1.0); ctx.font = `400 25px ${SANS}`;
    ctx.fillText('Follow every step of your trophies', W / 2, 960); ctx.fillText('in the Apex app', W / 2, 996);
    ctx.fillStyle = GOLD; ctx.font = `600 27px ${SANS}`; ctx.fillText(this.meta.appUrl.replace(/^https?:\/\//, ''), W / 2, 1060);
    ctx.globalAlpha = 1;
  }

  private watermark() {
    const { ctx } = this;
    ctx.save(); ctx.globalAlpha = 0.22; ctx.fillStyle = '#fff'; ctx.font = `bold 54px ${SANS}`; ctx.textAlign = 'center';
    ctx.translate(W / 2, H / 2); ctx.rotate(-Math.PI / 5);
    for (let y = -H; y <= H; y += 230) for (let x = -W; x <= W; x += 520) ctx.fillText('APEX PREVIEW', x + (Math.round(y / 230) % 2 ? 260 : 0), y);
    ctx.restore();
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(24, 24, 190, 40); ctx.fillStyle = '#fff'; ctx.font = `600 20px ${SANS}`; ctx.textAlign = 'left'; ctx.fillText('FREE PREVIEW', 40, 51); ctx.restore();
  }

  /** draw the picture at time t (seconds) */
  draw(t: number, preview = false) {
    const { ctx } = this;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    for (const s of this.timeline.slides) {
      if (t < s.start || t > s.start + s.dur) continue;
      const u = t - s.start;
      const alpha = s.kind === 'intro' ? clamp((s.dur - u) / FADE, 0, 1) : s.kind === 'outro' ? clamp(u / FADE, 0, 1) : Math.min(clamp(u / FADE, 0, 1), clamp((s.dur - u) / FADE, 0, 1));
      if (alpha <= 0) continue;
      ctx.globalAlpha = alpha;
      if (s.kind === 'intro') this.intro(u);
      else if (s.kind === 'outro') this.outro(u);
      else {
        this.drawPhoto(this.imgs[s.index], u, s.dur, s.index, 1);
        this.grade(1);
        const ph = this.photos[s.index];
        this.caption(PART_LABEL[ph.part ?? 'other'] ?? 'Your hunt', ph.caption, u, s.dur, 1);
      }
      ctx.globalAlpha = 1;
    }
    this.grainOverlay(t);
    // fade in from black at the very start, out to black at the very end
    const edge = Math.min(clamp(t / 0.8, 0, 1), clamp((this.duration - t) / 1.2, 0, 1));
    if (edge < 1) { ctx.fillStyle = `rgba(0,0,0,${1 - edge})`; ctx.fillRect(0, 0, W, H); }
    if (preview) this.watermark();
  }

  // ── playing and recording ────────────────────────────────────────────────────
  /** watch it on the canvas. A preview stops after PREVIEW_SECONDS and calls onLimit. */
  play(opts: { preview: boolean; music: boolean; onTime?: (t: number) => void; onEnd?: (reachedLimit: boolean) => void }) {
    this.stopped = false;
    const limit = opts.preview ? Math.min(PREVIEW_SECONDS, this.duration) : this.duration;
    if (opts.music) { this.audio = new AmbientMusic(this.duration); this.audio.start(true); }
    const t0 = performance.now();
    const tick = () => {
      if (this.stopped) return;
      const t = (performance.now() - t0) / 1000;
      if (t >= limit) {
        this.draw(Math.min(limit, this.duration - 0.01), opts.preview);
        this.audio?.stop(); this.audio = null;
        opts.onEnd?.(opts.preview && limit < this.duration); return;
      }
      this.draw(t, opts.preview); opts.onTime?.(t);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop() { this.stopped = true; cancelAnimationFrame(this.raf); this.audio?.stop(); this.audio = null; }

  /** play the whole film in real time and record it. The app has to stay open while this runs. */
  record(opts: { music: boolean; onProgress?: (fraction: number) => void }): Promise<{ blob: Blob; ext: string; mime: string }> {
    return new Promise((resolve, reject) => {
      try {
        if (typeof MediaRecorder === 'undefined' || !(this.canvas as any).captureStream) throw new Error('This phone or browser cannot make videos. Please use Safari on an iPhone or Chrome on Android.');
        this.stopped = false;
        const stream: MediaStream = (this.canvas as any).captureStream(30);
        if (opts.music) { this.audio = new AmbientMusic(this.duration); const track = this.audio.start(false); track?.forEach(tr => stream.addTrack(tr)); }
        const candidates = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
        const mime = candidates.find(m => (MediaRecorder as any).isTypeSupported?.(m)) ?? '';
        const rec = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond: 3_500_000 });
        const chunks: Blob[] = [];
        rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
        rec.onerror = () => reject(new Error('The video could not be made. Please try again.'));
        rec.onstop = () => {
          this.audio?.stop(); this.audio = null; stream.getTracks().forEach(t => t.stop());
          const type = rec.mimeType || mime || 'video/webm';
          resolve({ blob: new Blob(chunks, { type }), ext: type.includes('mp4') ? 'mp4' : 'webm', mime: type });
        };
        rec.start(1000);
        const t0 = performance.now();
        const tick = () => {
          if (this.stopped) { try { rec.stop(); } catch { /* already stopped */ } return; }
          const t = (performance.now() - t0) / 1000;
          if (t >= this.duration) { this.draw(this.duration - 0.01); opts.onProgress?.(1); setTimeout(() => { try { rec.stop(); } catch { /* already stopped */ } }, 400); return; }
          this.draw(t); opts.onProgress?.(t / this.duration);
          this.raf = requestAnimationFrame(tick);
        };
        this.raf = requestAnimationFrame(tick);
      } catch (e) { reject(e); }
    });
  }
}

/** Original ambient music, made on the phone (so there is nothing to license): slow warm chords, a soft pulse and bell notes. */
class AmbientMusic {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  constructor(private seconds: number) {}

  /** starts the music; when `speakers` is false it is only sent to the recording. Returns the audio tracks for the recording. */
  start(speakers: boolean): MediaStreamTrack[] | null {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    const ctx: AudioContext = new AC(); this.ctx = ctx;
    ctx.resume?.();
    const master = ctx.createGain(); this.master = master;
    const t0 = ctx.currentTime + 0.1;
    master.gain.setValueAtTime(0, t0);
    master.gain.linearRampToValueAtTime(0.5, t0 + 2.5);
    master.gain.setValueAtTime(0.5, t0 + Math.max(3, this.seconds - 3));
    master.gain.linearRampToValueAtTime(0, t0 + this.seconds);

    // a simple room: noise that fades away, mixed in behind the chords
    const len = Math.floor(ctx.sampleRate * 2.8); const imp = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = imp.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    const reverb = ctx.createConvolver(); reverb.buffer = imp;
    const wet = ctx.createGain(); wet.gain.value = 0.55; const dry = ctx.createGain(); dry.gain.value = 0.8;
    reverb.connect(wet); wet.connect(master); dry.connect(master);

    const chords = [[110.0, 220.0, 261.63, 329.63], [87.31, 174.61, 261.63, 349.23], [130.81, 196.0, 261.63, 329.63], [98.0, 196.0, 246.94, 293.66]];
    const span = 8; const count = Math.ceil(this.seconds / span) + 1;
    for (let i = 0; i < count; i++) {
      const start = t0 + i * span; const chord = chords[i % chords.length];
      const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 900; filter.Q.value = 0.6;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.12; const lfoGain = ctx.createGain(); lfoGain.gain.value = 260; lfo.connect(lfoGain); lfoGain.connect(filter.frequency); lfo.start(start); lfo.stop(start + span + 3);
      const env = ctx.createGain(); env.gain.setValueAtTime(0, start); env.gain.linearRampToValueAtTime(0.32, start + 2.4); env.gain.setValueAtTime(0.32, start + span - 0.4); env.gain.linearRampToValueAtTime(0, start + span + 2.6);
      filter.connect(env); env.connect(dry); env.connect(reverb);
      chord.forEach((f, k) => {
        for (const [type, detune, level] of [['sine', 0, 0.5], ['triangle', k % 2 ? 6 : -6, 0.22]] as const) {
          const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = detune;
          const g = ctx.createGain(); g.gain.value = level / chord.length * 2.2; o.connect(g); g.connect(filter); o.start(start); o.stop(start + span + 3);
        }
      });
      // a soft bell on the first beat of every chord, and a low pulse
      const bell = ctx.createOscillator(); bell.type = 'sine'; bell.frequency.value = chord[2] * 4;
      const bg = ctx.createGain(); bg.gain.setValueAtTime(0, start + 0.5); bg.gain.linearRampToValueAtTime(0.09, start + 0.52); bg.gain.exponentialRampToValueAtTime(0.0008, start + 4.5);
      bell.connect(bg); bg.connect(reverb); bg.connect(dry); bell.start(start + 0.5); bell.stop(start + 5);
      for (let b = 0; b < 4; b++) {
        const when = start + b * 2; const k = ctx.createOscillator(); k.type = 'sine'; k.frequency.setValueAtTime(70, when); k.frequency.exponentialRampToValueAtTime(38, when + 0.35);
        const kg = ctx.createGain(); kg.gain.setValueAtTime(0.0001, when); kg.gain.exponentialRampToValueAtTime(0.28, when + 0.02); kg.gain.exponentialRampToValueAtTime(0.0001, when + 0.7);
        k.connect(kg); kg.connect(dry); k.start(when); k.stop(when + 0.8);
      }
    }
    if (speakers) master.connect(ctx.destination);
    let tracks: MediaStreamTrack[] | null = null;
    if (!speakers) { const dest = ctx.createMediaStreamDestination(); master.connect(dest); tracks = dest.stream.getAudioTracks(); }
    return tracks;
  }

  stop() {
    try { this.master?.gain.cancelScheduledValues(0); this.master?.gain.setTargetAtTime(0, this.ctx?.currentTime ?? 0, 0.15); } catch { /* already closed */ }
    const c = this.ctx; this.ctx = null;
    setTimeout(() => { try { c?.close(); } catch { /* already closed */ } }, 600);
  }
}
