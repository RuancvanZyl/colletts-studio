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

// every number here is a whole number of beats (120 beats a minute), so photos change on the beat
const INTRO = 5.4, PER_PHOTO = 3.9, FADE = 0.9, OUTRO = 6.5;

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
  private audio: FilmMusic | null = null;
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
  play(opts: { preview: boolean; music: boolean; audioCtx?: AudioContext | null; onTime?: (t: number) => void; onEnd?: (reachedLimit: boolean) => void }) {
    this.audio?.stop(); this.audio = null;   // never two tunes at once
    this.stopped = false;
    const limit = opts.preview ? Math.min(PREVIEW_SECONDS, this.duration) : this.duration;
    if (opts.music) { this.audio = new FilmMusic(this.duration, opts.audioCtx); this.audio.start(true); }
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
  record(opts: { music: boolean; audioCtx?: AudioContext | null; onProgress?: (fraction: number) => void }): Promise<{ blob: Blob; ext: string; mime: string }> {
    return new Promise((resolve, reject) => {
      try {
        if (typeof MediaRecorder === 'undefined' || !(this.canvas as any).captureStream) throw new Error('This phone or browser cannot make videos. Please use Safari on an iPhone or Chrome on Android.');
        this.stopped = false;
        const stream: MediaStream = (this.canvas as any).captureStream(30);
        if (opts.music) { this.audio = new FilmMusic(this.duration, opts.audioCtx); const track = this.audio.start(false); track?.forEach(tr => stream.addTrack(tr)); }
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

/**
 * Original music, made on the phone (so there is nothing to license): an African-flavoured track at 120 beats a minute.
 * Dawn on the savanna (birds, a warm choir, a soft thumb piano) then, as the first photo appears, hand drums, a shaker, a bell
 * pattern, a deep log-drum bass, a bouncing thumb piano and a marimba tune over the choir's I - IV - I - V chords. It settles for
 * the closing card. Every photo change falls on a beat; the groove is felt in twelve pulses to the bar (four beats of three).
 */
const BPM = 120, BEAT = 60 / BPM, PULSE = BEAT / 3, BAR = BEAT * 4;
const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
// C – F – C – G, one bar each. choir: voices; bass: log-drum note; mb: two interlocking thumb-piano lines of six notes (one note every other pulse)
const CHORDS: { choir: number[]; bass: number; mbA: number[]; mbB: number[]; tune: [number, number][] }[] = [
  { choir: [55, 60, 64], bass: 36, mbA: [72, 76, 79, 76, 72, 79], mbB: [84, 79, 76, 79, 84, 76], tune: [[0, 76], [3, 79], [6, 81], [9, 79], [10, 76]] },
  { choir: [57, 60, 65], bass: 41, mbA: [69, 72, 77, 72, 69, 77], mbB: [81, 77, 72, 77, 81, 72], tune: [[0, 77], [3, 81], [6, 84], [9, 81], [11, 79]] },
  { choir: [55, 60, 64], bass: 36, mbA: [72, 76, 79, 76, 72, 79], mbB: [84, 79, 76, 79, 84, 76], tune: [[0, 76], [2, 79], [4, 81], [6, 84], [9, 81], [11, 79]] },
  { choir: [59, 62, 67], bass: 31, mbA: [67, 71, 74, 71, 67, 74], mbB: [79, 74, 71, 74, 79, 71], tune: [[0, 79], [3, 83], [6, 79], [8, 76], [10, 74]] },
];
const BELL_PULSES = [0, 2, 4, 5, 7, 9, 11];   // the standard African bell timeline

/** write the whole track into `out`, starting at time t0 on `ctx` */
export function buildMusic(ctx: BaseAudioContext, out: AudioNode, seconds: number, t0: number) {
  const grooveStart = INTRO - FADE, outroStart = Math.max(grooveStart + 2, seconds - OUTRO);
  const mix = ctx.createGain(); mix.gain.value = 0.9;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -22; comp.ratio.value = 5; comp.attack.value = 0.01; comp.release.value = 0.2;
  mix.connect(comp); comp.connect(out);

  // the open air: a short, bright room for the thumb piano, marimba, choir and birds
  const len = Math.floor(ctx.sampleRate * 1.6); const imp = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = imp.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
  const reverb = ctx.createConvolver(); reverb.buffer = imp; const wet = ctx.createGain(); wet.gain.value = 0.38; reverb.connect(wet); wet.connect(mix);
  const noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); { const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }

  const env = (g: GainNode, when: number, vol: number, attack: number, dur: number) => {
    g.gain.setValueAtTime(0.0001, t0 + when); g.gain.linearRampToValueAtTime(vol, t0 + when + attack); g.gain.exponentialRampToValueAtTime(0.0001, t0 + when + dur);
  };
  const osc = (type: OscillatorType, freq: number, when: number, dur: number, dest: AudioNode, vol: number, attack: number, glideTo?: number, glideTime = 0.05, detune = 0) => {
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t0 + when); if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t0 + when + glideTime); o.detune.value = detune;
    const g = ctx.createGain(); env(g, when, vol, attack, dur); o.connect(g); g.connect(dest); o.start(t0 + when); o.stop(t0 + when + dur + 0.05);
    return g;
  };
  const send = (g: AudioNode, amount: number) => { const r = ctx.createGain(); r.gain.value = amount; g.connect(r); r.connect(reverb); };
  const noise = (when: number, dur: number, vol: number, type: BiquadFilterType, freq: number, q = 0.8) => {
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t0 + when); g.gain.exponentialRampToValueAtTime(0.0001, t0 + when + dur);
    src.connect(f); f.connect(g); g.connect(mix); src.start(t0 + when, Math.random() * 0.5); src.stop(t0 + when + dur + 0.05);
    return g;
  };

  // the instruments ---------------------------------------------------------------------------
  /** thumb piano (mbira): a bright metallic pluck with a little buzz */
  const mbira = (midi: number, when: number, vol: number) => {
    const f = mtof(midi); const g = ctx.createGain(); g.connect(mix);
    osc('sine', f, when, 0.65, g, vol, 0.002); osc('sine', f * 2.76, when, 0.3, g, vol * 0.3, 0.002);
    noise(when, 0.03, vol * 0.12, 'highpass', 6000); send(g, 0.55);
  };
  /** marimba: a round wooden note */
  const marimba = (midi: number, when: number, vol: number, dur = 0.55) => {
    const f = mtof(midi); const g = ctx.createGain(); g.connect(mix);
    osc('sine', f, when, dur, g, vol, 0.003); osc('sine', f * 4, when, 0.12, g, vol * 0.3, 0.002); send(g, 0.5);
  };
  /** log drum: the deep, round, bubbling bass note that follows the chords */
  const logDrum = (midi: number, when: number, vol: number) => {
    const f = mtof(midi); const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700; lp.connect(mix);
    osc('sine', f * 2.2, when, 0.3, lp, vol, 0.002, f, 0.06); osc('sine', f * 2, when, 0.12, lp, vol * 0.25, 0.002);
  };
  const boom = (when: number, vol: number) => { osc('sine', 150, when, 0.4, mix, vol, 0.002, 62, 0.12); noise(when, 0.06, vol * 0.25, 'lowpass', 400); };
  const tonehit = (when: number, vol: number) => { osc('triangle', 340, when, 0.16, mix, vol, 0.002, 215, 0.08); noise(when, 0.07, vol * 0.5, 'bandpass', 900, 1.2); };
  const slap = (when: number, vol: number) => noise(when, 0.09, vol, 'bandpass', 2600, 1.1);
  const bell = (when: number, vol: number) => { const g = ctx.createGain(); g.connect(mix); osc('sine', 1180, when, 0.2, g, vol, 0.001); osc('sine', 1770, when, 0.12, g, vol * 0.5, 0.001); send(g, 0.25); };
  const shaker = (when: number, vol: number) => noise(when, 0.05, vol, 'highpass', 8000, 0.6);
  const clap = (when: number, vol: number) => { noise(when, 0.11, vol, 'bandpass', 1500, 1.0); noise(when + 0.012, 0.09, vol * 0.7, 'bandpass', 1900, 1.0); };
  const crash = (when: number, vol: number) => noise(when, 1.6, vol, 'highpass', 4200, 0.6);
  /** a warm choir on "ah": the vowel filters and the gentle wobble are shared by every note, so it stays light */
  const choirBus = ctx.createGain(); choirBus.gain.value = 0.34;
  const choirOut = ctx.createGain(); choirOut.connect(mix); send(choirOut, 0.6);
  for (const [fr, q, lv] of [[700, 6, 1], [1150, 7, 0.55]] as const) { const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fr; bp.Q.value = q; const l = ctx.createGain(); l.gain.value = lv; choirBus.connect(bp); bp.connect(l); l.connect(choirOut); }
  const wobble = ctx.createOscillator(); wobble.frequency.value = 5.2; const wobbleGain = ctx.createGain(); wobbleGain.gain.value = 14; wobble.connect(wobbleGain); wobble.start(t0); wobble.stop(t0 + seconds + 1);
  const choir = (midis: number[], when: number, dur: number, vol: number) => {
    const g = ctx.createGain(); g.connect(choirBus);
    g.gain.setValueAtTime(0.0001, t0 + when); g.gain.linearRampToValueAtTime(vol, t0 + when + 0.45); g.gain.setValueAtTime(vol, t0 + when + dur - 0.5); g.gain.linearRampToValueAtTime(0.0001, t0 + when + dur + 0.3);
    midis.forEach((m, i) => {
      for (const d of [-9, 8]) {
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m + 12); o.detune.value = d + i * 3;
        wobbleGain.connect(o.detune); o.connect(g); o.start(t0 + when); o.stop(t0 + when + dur + 0.4);
      }
    });
  };
  const chirp = (when: number) => {   // a little bird: a quick rising whistle, two or three times
    const base = 2600 + Math.random() * 1600; const n = 2 + Math.floor(Math.random() * 2);
    for (let k = 0; k < n; k++) { const g = ctx.createGain(); g.connect(mix); send(g, 0.8); osc('sine', base, when + k * 0.13, 0.1, g, 0.028, 0.008, base * 1.45, 0.08); }
  };

  // the rise into the first photo
  { const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.4;
    f.frequency.setValueAtTime(400, t0 + grooveStart - 2); f.frequency.exponentialRampToValueAtTime(6500, t0 + grooveStart);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0 + grooveStart - 2); g.gain.exponentialRampToValueAtTime(0.14, t0 + grooveStart - 0.05); g.gain.linearRampToValueAtTime(0, t0 + grooveStart);
    src.connect(f); f.connect(g); g.connect(mix); src.start(t0 + grooveStart - 2); src.stop(t0 + grooveStart + 0.05); }
  crash(grooveStart, 0.18); crash(outroStart, 0.1);
  // birds over the opening and again over the closing card
  for (const [a, b] of [[0.6, grooveStart - 1.5], [outroStart + 0.5, seconds - 2]] as const) for (let t = a; t < b; t += 0.9 + Math.random() * 1.3) chirp(t);

  const bars = Math.ceil(seconds / BAR);
  const scheduleBar = (bar: number) => {
    const bt = bar * BAR, ch = CHORDS[bar % 4], loop = Math.floor(bar / 4);
    // the choir holds the chord for the whole bar
    choir(ch.choir, bt, BAR, bt < grooveStart ? 0.07 : 0.09);
    for (let p = 0; p < 12; p++) {
      const t = bt + p * PULSE;
      if (t >= seconds - 0.1) break;
      const inGroove = t >= grooveStart - 0.01 && t < outroStart - 0.01;
      const buildup = clamp((t - grooveStart) / 4, 0, 1);
      const quiet = t < grooveStart ? 0.55 : t >= outroStart ? 0.6 : 1;
      // thumb piano: two lines that interlock, one note every other pulse. In the opening only the first line, softly.
      if (p % 2 === 0) mbira(ch.mbA[p / 2], t, 0.07 * quiet); else if (t >= grooveStart - 0.01 && t < outroStart) mbira(ch.mbB[(p - 1) / 2], t, 0.055);
      if (t < grooveStart && p % 3 === 0 && t > 2) shaker(t, 0.03);
      if (inGroove) {
        const lift = 0.55 + 0.45 * buildup;
        shaker(t, p % 3 === 0 ? 0.075 * lift : 0.04 * lift);
        if (BELL_PULSES.includes(p)) bell(t, 0.06 * lift);
        if (p === 0 || p === 6) boom(t, 0.5 * lift);
        if (p === 3 || p === 9) { tonehit(t, 0.3 * lift); if (buildup > 0.2) clap(t, 0.13 * lift); }
        if (p === 4 || p === 10) slap(t, 0.16 * lift);
        if (p === 2 || p === 8) tonehit(t, 0.12 * lift);
        if (p === 11 && buildup > 0.6) slap(t, 0.08);
        // log drum bass follows the chord root, with a jump on the last pulses of the bar
        if (p === 0 || p === 3 || p === 6 || p === 9) logDrum(ch.bass + (p === 9 && bar % 2 === 1 ? 12 : 0), t, 0.42 * lift);
        if (p === 11 && buildup > 0.4) logDrum(ch.bass + 7, t, 0.3);
      } else if (t >= outroStart && (p === 0 || p === 6) && bar % 2 === 0) logDrum(ch.bass, t, 0.3);   // a soft heartbeat under the closing card
    }
    // the marimba tune: enters with the groove and answers itself an octave higher the second time round
    if (bt >= grooveStart - 0.01 && bt < outroStart - 0.01) {
      const lift = 0.6 + 0.4 * clamp((bt - grooveStart) / 4, 0, 1);
      for (const [p, m] of ch.tune) {
        marimba(m + (loop % 2 === 1 ? 12 : 0), bt + p * PULSE, 0.16 * lift);
        if (loop % 2 === 1) marimba(m, bt + p * PULSE, 0.07 * lift);
      }
    }
  };
  let next = 0;
  return {
    /** write every bar that starts before `limit` seconds (call it again as the music plays) */
    scheduleUntil(limit: number) { while (next < bars && next * BAR < limit) scheduleBar(next++); },
    done: () => next >= bars,
  };
}

/**
 * Call this straight from the tap (before anything is awaited). An iPhone only lets a page make sound if the sound is switched on
 * inside the tap itself, and by default it stays silent when the side switch is on silent: telling the phone this is "playback"
 * (like a video) makes the music play either way.
 */
export function makeAudioContext(): AudioContext | null {
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    try { const session = (navigator as any).audioSession; if (session) session.type = 'playback'; } catch { /* older phones */ }
    const ctx: AudioContext = new AC();
    ctx.resume?.();
    const src = ctx.createBufferSource(); src.buffer = ctx.createBuffer(1, 1, 22050); src.connect(ctx.destination); src.start(0);   // a silent blip finishes unlocking it
    return ctx;
  } catch { return null; }
}

class FilmMusic {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | undefined;
  constructor(private seconds: number, private ready?: AudioContext | null) {}

  /** starts the music; when `speakers` is false it is only sent to the recording. Returns the audio tracks for the recording. */
  start(speakers: boolean): MediaStreamTrack[] | null {
    const ctx: AudioContext | null = this.ready ?? makeAudioContext();
    if (!ctx) return null;
    this.ctx = ctx;
    ctx.resume?.();
    const master = ctx.createGain(); this.master = master;
    const t0 = ctx.currentTime + 0.1;
    master.gain.setValueAtTime(0, t0);
    master.gain.linearRampToValueAtTime(0.85, t0 + 1.2);
    master.gain.setValueAtTime(0.85, t0 + Math.max(2, this.seconds - 3));
    master.gain.linearRampToValueAtTime(0, t0 + this.seconds);
    // only the next few seconds are written at any time: writing the whole track at once can make a phone stutter
    const track = buildMusic(ctx, master, this.seconds, t0);
    const feed = () => { if (!this.ctx) return; track.scheduleUntil(ctx.currentTime - t0 + 4); if (track.done() && this.timer) clearInterval(this.timer); };
    feed(); this.timer = setInterval(feed, 400);
    if (speakers) master.connect(ctx.destination);
    let tracks: MediaStreamTrack[] | null = null;
    if (!speakers) { const dest = ctx.createMediaStreamDestination(); master.connect(dest); tracks = dest.stream.getAudioTracks(); }
    return tracks;
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    try { this.master?.gain.cancelScheduledValues(0); this.master?.gain.setTargetAtTime(0, this.ctx?.currentTime ?? 0, 0.15); } catch { /* already closed */ }
    const c = this.ctx; this.ctx = null;
    setTimeout(() => { try { c?.close(); } catch { /* already closed */ } }, 600);
  }
}
