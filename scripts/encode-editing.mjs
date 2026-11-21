/* ============================================================================
   encode-editing.mjs: turn editing masters into what /editing actually ships.

     node scripts/encode-editing.mjs                    # encode new or changed clips
     node scripts/encode-editing.mjs --only a,b         # just these slugs
     node scripts/encode-editing.mjs --force            # re-encode regardless
     node scripts/encode-editing.mjs --no-av1           # H.264 only, half the time

   Needs ffmpeg and ffprobe on PATH. Runs on your machine, never on Netlify:
   the build has no ffmpeg, and encoding is minutes of CPU per clip that has no
   business being repeated on every deploy. The OUTPUTS are committed; the
   masters are not.

   The input is scripts/editing-clips.json, one entry per published clip:

     { "slug": "scenarios-until-sunday", "source": "../scenarios-1.mp4",
       "posterAt": 1, "start": 0, "duration": 60, "shortSide": 720, "maxFps": 60,
       "h264Crf": 23, "av1Crf": 34 }

   Only slug and source are required. `source` is relative to the repo root and
   can point anywhere, so masters keep whatever names their owner gave them
   (ch5-75.mp4 is channel 5, video 75, and that numbering is worth keeping);
   the SLUG is what gets published, so the slug is the one that has to be
   descriptive. Masters stay outside the repo: they are hundreds of megabytes
   each and git keeps every version of a binary forever. blogSite/ is under
   OneDrive, which is their backup.

   `start` + `duration` publish an excerpt instead of the whole master, with a
   short fade out so it ends rather than stops. That is how long-form pieces
   ship: eight minutes of 1080p gameplay is hundreds of megabytes, which is a
   video host's job, not a git repo's.

   Per clip, written to src/assets/editing/:

     <slug>.mp4       H.264 High, yuv420p, AAC. Plays everywhere, hardware
                      decoded on every phone made in the last decade.
     <slug>.av1.mp4   AV1, typically 30-60% fewer bytes for the same picture.
                      Listed first in <source>, so browsers that decode AV1
                      take it and everything else falls through to H.264.
     <slug>.jpg       The poster frame, a full-quality JPEG that Astro turns
                      into WebP. It is what paints before anyone presses play.

   and src/data/editing-media.json describes them. Each entry records a hash of
   the recipe that produced it (source file, trim, settings), so an unchanged
   clip is skipped and a changed setting re-encodes exactly the clips it
   touches. Changing only posterAt re-cuts only the poster.

   Settings worth knowing before changing them:

   1. +faststart moves the moov atom to the front of the file. Without it the
      browser has to fetch the END of the file before it can show frame one,
      which on a progressive MP4 is the single biggest start-up delay there is.
   2. A keyframe every 2 seconds, so a click on the scrubber lands within 2s
      of decodable video instead of wherever the encoder felt like it.
   3. The short side is capped at 720 px. Cards render a vertical clip at most
      ~200 CSS px wide, and even full-screen on a phone 720 is within a whisker
      of what the screen can show. 1080 would be about twice the bytes for a
      difference nobody sees in a portfolio grid.
   ========================================================================= */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : args[i + 1];
};

const CONFIG = resolve('scripts/editing-clips.json');
const OUT_DIR = resolve('src/assets/editing');
const MANIFEST = resolve('src/data/editing-media.json');

const FORCE = flag('--force');
const AV1 = !flag('--no-av1');
const ONLY = option('--only')?.split(',').map((s) => s.trim()).filter(Boolean) ?? null;

const SETTINGS = {
  shortSide: 720,     // see 3. above
  maxFps: 60,
  h264Crf: 23,        // 18 is visually lossless, 28 starts to smear gradients
  av1Crf: 34,         // SVT-AV1's scale is not x264's; 34 lands near CRF 23 here
  av1Preset: 6,       // 4 is slower and ~5% smaller, 8 is fast and visibly worse
  audioKbps: 128,
  posterAt: 1.0,      // seconds in; frame 0 of an edit is usually a fade from black
  fadeOut: 0.75,      // seconds, excerpts only
};

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

const even = (n) => Math.max(2, Math.round(n / 2) * 2);
const hash = (value) => createHash('sha1').update(JSON.stringify(value)).digest('hex').slice(0, 12);

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

/* ── load ────────────────────────────────────────────────────────────────── */

const { clips } = JSON.parse(readFileSync(CONFIG, 'utf8'));
const previous = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};
mkdirSync(OUT_DIR, { recursive: true });

const slugs = new Set();
for (const clip of clips) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(clip.slug)) {
    console.error(`\n"${clip.slug}" is not a valid slug: lower-case letters, digits and hyphens only.\n`);
    process.exit(1);
  }
  if (slugs.has(clip.slug)) {
    console.error(`\n"${clip.slug}" is listed twice in editing-clips.json.\n`);
    process.exit(1);
  }
  slugs.add(clip.slug);
}
if (ONLY) {
  const unknown = ONLY.filter((s) => !slugs.has(s));
  if (unknown.length) {
    console.error(`\n--only names slugs that are not in editing-clips.json: ${unknown.join(', ')}\n`);
    process.exit(1);
  }
}

/* ── encode ──────────────────────────────────────────────────────────────── */

const manifest = {};
let failed = 0;

for (const clip of clips) {
  const { slug } = clip;
  const src = resolve(clip.source);
  const out = {
    h264: join(OUT_DIR, `${slug}.mp4`),
    av1: join(OUT_DIR, `${slug}.av1.mp4`),
    poster: join(OUT_DIR, `${slug}.jpg`),
  };
  const old = previous[slug];

  if (!existsSync(src)) {
    // A master that has moved is not a reason to unpublish a clip that was
    // already encoded; keep the outputs and say so.
    if (old && existsSync(out.h264)) {
      console.warn(`  WARN  ${slug}: master not found at ${clip.source}, keeping the existing encode`);
      manifest[slug] = old;
    } else {
      console.error(`  FAIL  ${slug}: master not found at ${clip.source}`);
      failed++;
    }
    continue;
  }

  const shortSide = clip.shortSide ?? SETTINGS.shortSide;
  const maxFps = clip.maxFps ?? SETTINGS.maxFps;
  const posterAt = clip.posterAt ?? SETTINGS.posterAt;
  const h264Crf = clip.h264Crf ?? SETTINGS.h264Crf;
  const av1Crf = clip.av1Crf ?? SETTINGS.av1Crf;
  const stat = statSync(src);
  const master = { path: clip.source, size: stat.size, mtime: Math.round(stat.mtimeMs) };

  const recipe = {
    video: hash({ master, start: clip.start ?? 0, duration: clip.duration ?? null, shortSide, maxFps, h264Crf, av1Crf, s: SETTINGS, av1: AV1, v: 2 }),
    poster: hash({ master, posterAt, shortSide, v: 2 }),
  };

  const targeted = !ONLY || ONLY.includes(slug);
  const haveVideo = existsSync(out.h264) && (!AV1 || existsSync(out.av1));
  // Entries written before recipes existed are trusted if their outputs are
  // newer than the master, so upgrading this script does not re-encode
  // everything it already did.
  const legacyFresh = !old?.recipe && haveVideo && statSync(out.h264).mtimeMs >= stat.mtimeMs;
  const videoFresh = haveVideo && (old?.recipe?.video === recipe.video || legacyFresh);
  const posterFresh = existsSync(out.poster) && (old?.recipe?.poster === recipe.poster || (legacyFresh && posterAt === SETTINGS.posterAt));

  const doVideo = targeted && (FORCE || !videoFresh);
  const doPoster = targeted && (FORCE || !posterFresh);

  const info = probe(src);
  const video = info.streams.find((s) => s.codec_type === 'video');
  if (!video) {
    console.error(`  FAIL  ${slug}: no video stream in ${clip.source}`);
    failed++;
    continue;
  }
  const sourceDuration = Number(info.format.duration) || 0;
  const start = Math.max(0, clip.start ?? 0);
  const duration = Math.min(clip.duration ?? Infinity, sourceDuration - start);
  const excerpt = duration < sourceDuration - 0.5;
  const hasAudio = info.streams.some((s) => s.codec_type === 'audio');
  const { w, h } = displaySize(video);
  const scale = Math.min(1, shortSide / Math.min(w, h));
  const W = even(w * scale);
  const H = even(h * scale);
  const fps = Math.min(maxFps, parseRate(video.avg_frame_rate) || parseRate(video.r_frame_rate) || 30);
  const gop = String(Math.round(fps * 2));

  if (!doVideo && !doPoster) {
    if (existsSync(out.h264)) console.log(`  skip  ${slug}`);
  } else {
    const t0 = Date.now();
    console.log(`\n  ${slug}  ${w}x${h} -> ${W}x${H}, ${+fps.toFixed(2)} fps, `
      + `${excerpt ? `${duration.toFixed(1)}s of ${sourceDuration.toFixed(1)}s` : `${duration.toFixed(1)}s`}`
      + `${hasAudio ? '' : ', no audio'}`);

    if (doVideo) {
      // out_range=tv: editors often export full-range (yuvj420p); browsers
      // expect limited range and would otherwise crush blacks and clip whites.
      const fade = excerpt ? SETTINGS.fadeOut : 0;
      const vf = [
        `scale=${W}:${H}:flags=lanczos:out_range=tv`,
        'format=yuv420p',
        ...(fade ? [`fade=t=out:st=${(duration - fade).toFixed(2)}:d=${fade}`] : []),
      ].join(',');
      const af = fade ? ['-af', `afade=t=out:st=${(duration - fade).toFixed(2)}:d=${fade}`] : [];

      const common = [
        '-hide_banner', '-v', 'error', '-y',
        ...(start ? ['-ss', String(start)] : []),
        '-i', src,
        ...(Number.isFinite(clip.duration) ? ['-t', String(duration)] : []),
        '-map', '0:v:0', ...(hasAudio ? ['-map', '0:a:0'] : []),
        '-map_metadata', '-1', '-fpsmax', String(maxFps), '-vf', vf, '-g', gop,
        ...(hasAudio ? ['-c:a', 'aac', '-b:a', `${SETTINGS.audioKbps}k`, '-ac', '2', ...af] : []),
        '-movflags', '+faststart',
      ];

      process.stdout.write('    H.264 ');
      run('ffmpeg', [
        ...common,
        '-c:v', 'libx264', '-preset', 'slow', '-crf', String(h264Crf),
        '-profile:v', 'high', '-tag:v', 'avc1',
        out.h264,
      ]);
      process.stdout.write(`${(statSync(out.h264).size / 1048576).toFixed(2)} MB\n`);

      if (AV1) {
        process.stdout.write('    AV1   ');
        run('ffmpeg', [
          ...common,
          '-c:v', 'libsvtav1', '-preset', String(SETTINGS.av1Preset), '-crf', String(av1Crf),
          '-svtav1-params', `keyint=${gop}`,
          out.av1,
        ]);
        process.stdout.write(`${(statSync(out.av1).size / 1048576).toFixed(2)} MB\n`);
      }
    }

    if (doPoster) {
      console.log('    poster');
      run('ffmpeg', [
        '-hide_banner', '-v', 'error', '-y',
        '-ss', String(Math.min(start + posterAt, start + duration - 0.1)), '-i', src,
        '-frames:v', '1', '-vf', `scale=${W}:${H}:flags=lanczos`, '-q:v', '2',
        out.poster,
      ]);
    }

    console.log(`    done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }

  /* Describe the outputs as they are on disk, whether or not this run made
     them. A skipped clip from an older run keeps its old recipe hash, so a
     later settings change still catches it. */
  if (!existsSync(out.h264)) {
    if (targeted) {
      console.error(`  FAIL  ${slug}: no encode on disk after encoding`);
      failed++;
    } else {
      console.log(`  todo  ${slug}  (not encoded yet; left out of the manifest)`);
    }
    continue;
  }
  const outInfo = probe(out.h264);
  const outVideo = outInfo.streams.find((s) => s.codec_type === 'video');
  const av1Video = existsSync(out.av1) ? probe(out.av1).streams.find((s) => s.codec_type === 'video') : null;

  manifest[slug] = {
    width: outVideo.width,
    height: outVideo.height,
    duration: +Number(outInfo.format.duration).toFixed(2),
    /** Length of the master, so the page can say an excerpt is one. */
    sourceDuration: +sourceDuration.toFixed(2),
    fps: +parseRate(outVideo.avg_frame_rate).toFixed(3),
    audio: outInfo.streams.some((s) => s.codec_type === 'audio'),
    h264: { bytes: statSync(out.h264).size, codecs: codecString(outVideo) },
    av1: av1Video ? { bytes: statSync(out.av1).size, codecs: codecString(av1Video) } : null,
    recipe: {
      video: doVideo || videoFresh ? recipe.video : old?.recipe?.video ?? null,
      poster: doPoster || posterFresh ? recipe.poster : old?.recipe?.poster ?? null,
    },
  };
}

writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');

/* Files in the output folder that no clip claims still ship, because
   editing.ts globs the folder. Say so rather than delete them. */
const claimed = new Set(Object.keys(manifest).flatMap((s) => [`${s}.mp4`, `${s}.av1.mp4`, `${s}.jpg`]));
const orphans = readdirSync(OUT_DIR).filter((f) => !claimed.has(f));

const mb = (n) => (n / 1048576).toFixed(2);
let totalH264 = 0;
let totalAv1 = 0;
console.log('\nManifest: src/data/editing-media.json\n');
for (const [slug, e] of Object.entries(manifest)) {
  totalH264 += e.h264.bytes;
  totalAv1 += e.av1?.bytes ?? 0;
  const av1 = e.av1 ? `  av1 ${mb(e.av1.bytes).padStart(6)} MB` : '';
  console.log(`  ${slug.padEnd(44)} h264 ${mb(e.h264.bytes).padStart(6)} MB${av1}  ${e.width}x${e.height}  ${e.duration}s`);
}
console.log(`\n  total: h264 ${mb(totalH264)} MB, av1 ${mb(totalAv1)} MB, ${mb(totalH264 + totalAv1)} MB in git`);
if (orphans.length) console.warn(`\n  WARN  unclaimed files in src/assets/editing (they still ship): ${orphans.join(', ')}`);
if (failed) {
  console.error(`\n${failed} clip(s) failed.\n`);
  process.exit(1);
}
console.log('\nNext: every slug needs a block in src/data/editing.ts, or it will not render.\n');
