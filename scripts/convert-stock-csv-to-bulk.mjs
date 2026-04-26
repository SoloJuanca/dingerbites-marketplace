import fs from 'node:fs';
import path from 'node:path';

function parseCsvLine(line) {
  // Minimal CSV parsing: handles quoted cells and commas inside quotes.
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        const next = line[i + 1];
        if (next === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ',') {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function escapeCsvCell(value) {
  const text = String(value ?? '');
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function normalizeHeaderKey(h) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

const inputPath = process.argv[2];
const outputPath = process.argv[3];

if (!inputPath || !outputPath) {
  console.error('Usage: node scripts/convert-stock-csv-to-bulk.mjs <input.csv> <output.csv>');
  process.exit(1);
}

const inputAbs = path.resolve(inputPath);
const outputAbs = path.resolve(outputPath);

const raw = fs.readFileSync(inputAbs, 'utf8');
const lines = raw.replace(/\r/g, '').split('\n').filter((l) => l.trim().length > 0);
if (lines.length < 2) {
  console.error('CSV must include header and at least one row');
  process.exit(1);
}

const header = parseCsvLine(lines[0]).map((h) => normalizeHeaderKey(h));
const idxName = header.findIndex((h) => h.startsWith('nombre') || h === 'name');
const idxNormal = header.findIndex((h) => h === 'stocknormal');
const idxFoil = header.findIndex((h) => h === 'stockfoil');

if (idxName === -1 || idxNormal === -1 || idxFoil === -1) {
  console.error('Expected columns: Nombre, Stock Normal, Stock Foil');
  process.exit(1);
}

const out = ['Nombre,Variante,Stock,TCG Product ID'];

for (let i = 1; i < lines.length; i += 1) {
  const cols = parseCsvLine(lines[i]);
  const name = String(cols[idxName] ?? '').trim();
  if (!name) continue;
  const normal = String(cols[idxNormal] ?? '').trim();
  const foil = String(cols[idxFoil] ?? '').trim();

  out.push([escapeCsvCell(name), 'Normal', String(normal === '' ? 0 : normal), ''].join(','));
  out.push([escapeCsvCell(name), 'Foil', String(foil === '' ? 0 : foil), ''].join(','));
}

fs.writeFileSync(outputAbs, out.join('\n'), 'utf8');
console.log(`Wrote ${out.length - 1} rows to ${outputAbs}`);

