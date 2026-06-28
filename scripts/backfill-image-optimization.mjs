/**
 * Backfill: re-compress images already stored in Firebase Storage.
 *
 * Each object is downloaded, resized to a max width, and re-encoded in its
 * ORIGINAL format, then overwritten IN PLACE (same path + content-type). This
 * keeps every existing URL valid, so no Firestore documents need updating.
 *
 * Idempotent: a file is only rewritten when the optimized version is at least
 * 5% smaller, so running it twice does nothing the second time.
 *
 * Usage:
 *   node scripts/backfill-image-optimization.mjs                 # dry run (no writes)
 *   node scripts/backfill-image-optimization.mjs --apply         # perform the rewrite
 *   node scripts/backfill-image-optimization.mjs --prefix=products/ --max-width=1600 --quality=80
 *   node scripts/backfill-image-optimization.mjs --apply --limit=50
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const DEFAULTS = {
  apply: false,
  maxWidth: 1600,
  quality: 80,
  limit: Infinity,
  prefixes: ['products/', 'banners/', 'categories/', 'brands/', 'reviews/']
};

function parseArgs(argv) {
  const config = { ...DEFAULTS };
  const customPrefixes = [];
  argv.forEach((arg) => {
    if (arg === '--apply') config.apply = true;
    else if (arg.startsWith('--max-width=')) config.maxWidth = Number(arg.split('=')[1]) || DEFAULTS.maxWidth;
    else if (arg.startsWith('--quality=')) config.quality = Number(arg.split('=')[1]) || DEFAULTS.quality;
    else if (arg.startsWith('--limit=')) config.limit = Number(arg.split('=')[1]) || Infinity;
    else if (arg.startsWith('--prefix=')) customPrefixes.push(arg.split('=').slice(1).join('='));
  });
  if (customPrefixes.length) config.prefixes = customPrefixes;
  return config;
}

function loadDotEnv() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const envPath = path.resolve(__dirname, '../.env');
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, 'utf8');
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) return;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] == null) process.env[key] = value;
  });
}

const KB = 1024;
const fmtKb = (bytes) => `${(bytes / KB).toFixed(1)} KB`;

function encodeForFormat(pipeline, format, quality) {
  switch (format) {
    case 'jpeg':
    case 'jpg':
      return pipeline.jpeg({ quality, mozjpeg: true });
    case 'png':
      return pipeline.png({ compressionLevel: 9, palette: true });
    case 'webp':
      return pipeline.webp({ quality });
    default:
      return null; // unsupported (gif/svg/avif/etc.) — leave untouched
  }
}

async function optimizeBuffer(buffer, format, { maxWidth, quality }) {
  const pipeline = sharp(buffer, { failOn: 'none' })
    .rotate()
    .resize({ width: maxWidth, withoutEnlargement: true });
  const encoded = encodeForFormat(pipeline, format, quality);
  if (!encoded) return null;
  return encoded.toBuffer();
}

async function main() {
  const config = parseArgs(process.argv.slice(2));
  loadDotEnv();

  const { storage } = await import('../src/lib/firebaseAdmin.js');
  const bucket = storage.bucket();

  console.log(
    `\n${config.apply ? 'APPLY' : 'DRY RUN'} · maxWidth=${config.maxWidth} · quality=${config.quality} · prefixes=[${config.prefixes.join(', ')}]\n`
  );

  let processed = 0;
  let rewritten = 0;
  let skipped = 0;
  let failed = 0;
  let bytesBefore = 0;
  let bytesAfter = 0;

  for (const prefix of config.prefixes) {
    const [files] = await bucket.getFiles({ prefix });
    for (const file of files) {
      if (processed >= config.limit) break;
      if (file.name.endsWith('/')) continue; // folder placeholder

      processed += 1;
      try {
        const [buffer] = await file.download();
        const meta = await sharp(buffer, { failOn: 'none' }).metadata();
        const optimized = await optimizeBuffer(buffer, meta.format, config);

        if (!optimized) {
          skipped += 1;
          console.log(`  skip (unsupported ${meta.format || 'format'}): ${file.name}`);
          continue;
        }

        const before = buffer.length;
        const after = optimized.length;

        if (after >= before * 0.95) {
          skipped += 1;
          continue; // already near-optimal
        }

        bytesBefore += before;
        bytesAfter += after;
        rewritten += 1;
        const saved = (((before - after) / before) * 100).toFixed(0);
        console.log(`  ${config.apply ? 'rewrote' : 'would rewrite'} ${file.name}: ${fmtKb(before)} -> ${fmtKb(after)} (-${saved}%)`);

        if (config.apply) {
          await file.save(optimized, {
            contentType: file.metadata.contentType || `image/${meta.format}`,
            metadata: { cacheControl: 'public, max-age=31536000' },
            resumable: false
          });
          await file.makePublic();
        }
      } catch (error) {
        failed += 1;
        console.error(`  FAILED ${file.name}: ${error.message}`);
      }
    }
    if (processed >= config.limit) break;
  }

  const totalSavedKb = (bytesBefore - bytesAfter) / KB;
  console.log(`\nProcessed ${processed} · ${config.apply ? 'rewrote' : 'would rewrite'} ${rewritten} · skipped ${skipped} · failed ${failed}`);
  console.log(`Total ${config.apply ? 'saved' : 'savings'}: ${totalSavedKb.toFixed(0)} KB (${(totalSavedKb / KB).toFixed(2)} MB)`);
  if (!config.apply && rewritten > 0) {
    console.log('\nRe-run with --apply to write these changes.\n');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
