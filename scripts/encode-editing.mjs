/* ============================================================================
   encode-editing.mjs: turn editing masters into what /editing actually ships.

     node scripts/encode-editing.mjs                  # encode new or changed masters
     node scripts/encode-editing.mjs --force          # re-encode everything
     node scripts/encode-editing.mjs --no-av1         # H.264 only, half the time
     node scripts/encode-editing.mjs path/to/masters  # a different source folder

   Needs ffmpeg and ffprobe on PATH. Runs on your machine, never on Netlify:
   the build has no ffmpeg, and encoding is minutes of CPU per clip that has no
   business being repeated on every deploy. The OUTPUTS are committed; the
   masters are not.

   Masters live in ../editing-sources, i.e. blogSite/editing-sources, OUTSIDE
   the git repo, next to original-photos/. A master is hundreds of megabytes
   and git keeps every version of a binary forever, so they stay out; that
   folder is under OneDrive, which is the backup. The filename is the slug, and
   the slug becomes the published filename, so name masters descriptively:
   "coffee-chain-lifestyle.mov", not "final_v3_EXPORT.mov".

   Per master, written to src/assets/editing/:

     <slug>.mp4       H.264 High, yuv420p, AAC. Plays everywhere, hardware
                      decoded on every phone made in the last decade.
     <slug>.av1.mp4   AV1 at roughly 40% fewer bytes for the same picture.
                      Listed first in <source>, so browsers that decode AV1
                      take it and everything else falls through to H.264.
     <slug>.jpg       The poster frame, a full-quality JPEG that Astro turns
                      into WebP. It is what paints before anyone presses play.

   and src/data/editing-media.json is rebuilt by probing every output, so it
   always describes the folder as it is rather than the last run.

   Three settings worth knowing before changing them:

   1. +faststart moves the moov atom to the front of the file. Without it the
      browser has to fetch the END of the file before it can show frame one,
      which on a progressive MP4 is the single biggest start-up delay there is.
   2. A keyframe every 2 seconds, so a click on the scrubber lands within 2s
      of decodable video instead of wherever the encoder felt like it.
   3. The short side is capped at 720 px. Cards render a vertical clip at most
      ~270 CSS px wide, and even full-screen on a phone 720 is within a whisker
      of what the screen can show. 1080 would be about twice the bytes for a
      difference nobody sees in a portfolio grid.
   ========================================================================= */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const SOURCE_DIR = resolve(args.find((a) => !a.startsWith('--')) ?? '../editing-sources');
const OUT_DIR = resolve('src/assets/editing');
const MANIFEST = resolve('src/data/editing-media.json');

const FORCE = flag('--force');
const AV1 = !flag('--no-av1');

const SHORT_SIDE = 720;     // see 3. above
const MAX_FPS = 60;
const H264_CRF = 23;        // 18 is visually lossless, 28 starts to smear gradients
const AV1_CRF = 34;         // SVT-AV1's scale is not x264's; 34 lands near CRF 23 here
const AV1_PRESET = 6;       // 4 is slower and ~5% smaller, 8 is fast and visibly worse
const AUDIO_KBPS = 128;
const POSTER_AT = 1.0;      // seconds in; frame 0 of an edit is usually a fade from black

const VIDEO_EXT = new Set(['.mp4', '.mov', '.mkv', '.webm', '.m4v', '.avi', '.mxf']);

/* ── helpers ─────────────────────────────────────────────────────────────── */

function run(cmd, cmdArgs) {
  const res = spawnSync(cmd, cmdArgs, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (res.error) {
    if (res.error.code === 'ENOENT') {
      console.error(`\n${cmd} not found on PATH. Install it (winget install Gyan.FFmpeg) and retry.\n`);
      process.exit(1);
    }
    throw res.error;
  }
  if (res.status !== 0) {
    throw new Error(`${cmd} exited ${res.status}\n${res.stderr.split('\n').slice(-15).join('\n')}`);
  }
  return res.stdout;
}

function probe(file) {
  return JSON.parse(run('ffprobe', [
    '-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file,
  ]));
}

/** Lower-case, hyphenated, ASCII. The slug is the published filename. */
function slugify(name) {
  return name
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const even = (n) => Math.max(2, Math.round(n / 2) * 2);

function parseRate(rate) {
  const [n, d] = String(rate ?? '0/1').split('/').map(Number);
  return d ? n / d : n;
}

/** Display size, which is not the coded size when a phone wrote a rotation
 *  tag. ffmpeg auto-rotates on decode, so the output is the displayed shape. */
function displaySize(stream) {
  const rotation = Math.abs(
    Number(stream.side_data_list?.find((s) => s.rotation !== undefined)?.rotation
      ?? stream.tags?.rotate ?? 0),
  ) % 180;
  return rotation === 90
    ? { w: stream.height, h: stream.width }
    : { w: stream.width, h: stream.height };
}

/** The `codecs=` value for <source type>. A browser that cannot decode the
 *  stream says so from this string alone and never downloads the file. */
function codecString(stream) {
  if (stream.codec_name === 'h264') {
    const profile = { Baseline: 0x42, 'Constrained Baseline': 0x42, Main: 0x4d, High: 0x64 }[stream.profile] ?? 0x64;
    const hex = (n) => n.toString(16).padStart(2, '0');
    return `avc1.${hex(profile)}00${hex(Number(stream.level) || 40)}`;
  }
  if (stream.codec_name === 'av1') {
    // ffprobe reports seq_level_idx as `level`; profile 0 is Main, 8-bit.
    const level = String(Number(stream.level) >= 0 ? Number(stream.level) : 8).padStart(2, '0');
    return `av01.0.${level}M.08`;
  }
  return stream.codec_name;
}

const newer = (out, src) => existsSync(out) && statSync(out).mtimeMs >= statSync(src).mtimeMs;

/* ── encode ──────────────────────────────────────────────────────────────── */

if (!existsSync(SOURCE_DIR)) {
  console.error(`\nNo source folder at ${SOURCE_DIR}. Create it and put the masters in it.\n`);
  process.exit(1);
}
mkdirSync(OUT_DIR, { recursive: true });

const masters = readdirSync(SOURCE_DIR)
  .filter((f) => VIDEO_EXT.has(extname(f).toLowerCase()))
  .sort();

if (!masters.length) console.log(`\nNo video files in ${SOURCE_DIR}.`);

const seen = new Map();
for (const file of masters) {
  const src = join(SOURCE_DIR, file);
  const slug = slugify(basename(file, extname(file)));
  if (seen.has(slug)) {
    console.error(`\n"${file}" and "${seen.get(slug)}" both become "${slug}". Rename one.\n`);
    process.exit(1);
  }
  seen.set(slug, file);

  const out = {
    h264: join(OUT_DIR, `${slug}.mp4`),
    av1: join(OUT_DIR, `${slug}.av1.mp4`),
    poster: join(OUT_DIR, `${slug}.jpg`),
  };

  const upToDate = newer(out.h264, src) && newer(out.poster, src) && (!AV1 || newer(out.av1, src));
  if (upToDate && !FORCE) {
    console.log(`  skip  ${slug}  (outputs newer than master)`);
    continue;
  }

  const info = probe(src);
  const video = info.streams.find((s) => s.codec_type === 'video');
  if (!video) {
    console.error(`  FAIL  ${file}: no video stream`);
    continue;
  }
  const hasAudio = info.streams.some((s) => s.codec_type === 'audio');
  const { w, h } = displaySize(video);
  const scale = Math.min(1, SHORT_SIDE / Math.min(w, h));
  const W = even(w * scale);
  const H = even(h * scale);
  const fps = Math.min(MAX_FPS, parseRate(video.avg_frame_rate) || parseRate(video.r_frame_rate) || 30);
  const gop = String(Math.round(fps * 2));
  const duration = Number(info.format.duration) || 0;

  // out_range=tv: editors often export full-range (yuvj420p); browsers expect
  // limited range and would otherwise crush the blacks and clip the whites.
  const vf = `scale=${W}:${H}:flags=lanczos:out_range=tv,format=yuv420p`;
  const common = [
    '-hide_banner', '-v', 'error', '-stats', '-y', '-i', src,
    '-map', '0:v:0', ...(hasAudio ? ['-map', '0:a:0'] : []),
    '-map_metadata', '-1', '-fpsmax', String(MAX_FPS), '-vf', vf, '-g', gop,
    ...(hasAudio ? ['-c:a', 'aac', '-b:a', `${AUDIO_KBPS}k`, '-ac', '2'] : []),
    '-movflags', '+faststart',
  ];

  const t0 = Date.now();
  console.log(`\n  ${slug}  ${w}x${h} -> ${W}x${H}, ${fps.toFixed(2).replace(/\.00$/, '')} fps, ${duration.toFixed(1)}s${hasAudio ? '' : ', no audio'}`);

  console.log('    H.264');
  run('ffmpeg', [
    ...common,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(H264_CRF),
    '-profile:v', 'high', '-tag:v', 'avc1',
    out.h264,
  ]);

  if (AV1) {
    console.log('    AV1');
    run('ffmpeg', [
      ...common,
      '-c:v', 'libsvtav1', '-preset', String(AV1_PRESET), '-crf', String(AV1_CRF),
      '-svtav1-params', `keyint=${gop}`,
      out.av1,
    ]);
  }

  console.log('    poster');
  run('ffmpeg', [
    '-hide_banner', '-v', 'error', '-y',
    '-ss', String(Math.min(POSTER_AT, Math.max(0, duration - 0.1))), '-i', src,
    '-frames:v', '1', '-vf', `scale=${W}:${H}:flags=lanczos`, '-q:v', '2',
    out.poster,
  ]);

  console.log(`    done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

/* ── manifest ────────────────────────────────────────────────────────────────
   Rebuilt from the outputs, not from this run: a clip encoded last week and
   skipped today is still described, and a deleted one stops being described. */

const manifest = {};
const outputs = readdirSync(OUT_DIR).filter((f) => f.endsWith('.mp4') && !f.endsWith('.av1.mp4')).sort();

for (const file of outputs) {
  const slug = file.replace(/\.mp4$/, '');
  const h264Path = join(OUT_DIR, file);
  const av1Path = join(OUT_DIR, `${slug}.av1.mp4`);
  const info = probe(h264Path);
  const video = info.streams.find((s) => s.codec_type === 'video');

  const entry = {
    width: video.width,
    height: video.height,
    duration: +Number(info.format.duration).toFixed(2),
    fps: +parseRate(video.avg_frame_rate).toFixed(3),
    audio: info.streams.some((s) => s.codec_type === 'audio'),
    h264: { bytes: statSync(h264Path).size, codecs: codecString(video) },
    av1: null,
  };

  if (existsSync(av1Path)) {
    const av1Video = probe(av1Path).streams.find((s) => s.codec_type === 'video');
    entry.av1 = { bytes: statSync(av1Path).size, codecs: codecString(av1Video) };
  }

  if (!existsSync(join(OUT_DIR, `${slug}.jpg`))) {
    console.error(`  WARN  ${slug} has no poster; the build will refuse it`);
  }
  manifest[slug] = entry;
}

writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');

const mb = (n) => (n / 1024 / 1024).toFixed(2);
console.log('\nManifest: src/data/editing-media.json\n');
for (const [slug, e] of Object.entries(manifest)) {
  const av1 = e.av1 ? `  av1 ${mb(e.av1.bytes)} MB` : '';
  console.log(`  ${slug.padEnd(36)} h264 ${mb(e.h264.bytes)} MB${av1}  ${e.width}x${e.height}  ${e.duration}s`);
}
console.log('\nNext: add each new slug to src/data/editing.ts, or it will not render.\n');
