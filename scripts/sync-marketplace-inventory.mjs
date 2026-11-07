import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

function loadEnvFile(filePath, override = false) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf8');

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
    if (override || process.env[key] == null) {
      process.env[key] = value;
    }
  });
}

async function main() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const root = path.resolve(__dirname, '..');

  loadEnvFile(path.join(root, '.env'));
  loadEnvFile(path.join(root, '.env.local'), true);

  const includeInactive = process.argv.includes('--all');
  const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : null;

  const { syncAllTcgStockToMarketplace } = await import('../src/lib/sync/marketplaceSyncClient.js');
  const result = await syncAllTcgStockToMarketplace({ activeOnly: !includeInactive, limit });

  if (result.skipped) {
    console.error('Sync skipped:', result.reason);
    console.error('Configure INTERNAL_SYNC_SECRET and MARKETPLACE_SYNC_URL in .env.local');
    process.exit(1);
  }

  console.log(`Synced ${result.synced} of ${result.total} TCG products (${result.failed} failed)`);

  const failures = (result.results || []).filter((item) => !item.ok);
  if (failures.length > 0) {
    console.log('Failures:');
    failures.slice(0, 20).forEach((item) => {
      console.log(`- ${item.productId} (tcg ${item.tcg_product_id}): ${item.error || item.status}`);
    });
    if (failures.length > 20) {
      console.log(`... and ${failures.length - 20} more`);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
