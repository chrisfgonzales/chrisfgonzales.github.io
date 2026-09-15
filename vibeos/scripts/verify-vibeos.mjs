import { access, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..', 'src');
const web = resolve(root, 'web');
const assets = ['app.js', 'icon.svg', 'index.html', 'manifest.webmanifest', 'privacy.html', 'styles.css', 'sw.js'];

for (const asset of assets) {
  await access(resolve(web, asset));
}

const [html, manifest, serviceWorker] = await Promise.all([
  readFile(resolve(web, 'index.html'), 'utf8'),
  readFile(resolve(web, 'manifest.webmanifest'), 'utf8'),
  readFile(resolve(web, 'sw.js'), 'utf8'),
]);

for (const asset of assets.filter(asset => asset !== 'sw.js')) {
  if (!html.includes(asset) && !serviceWorker.includes(asset)) {
    throw new Error(`Web asset "${asset}" is not referenced by the application shell.`);
  }
}

const parsedManifest = JSON.parse(manifest);
if (parsedManifest.name !== 'VibeOS' || parsedManifest.start_url !== './') {
  throw new Error('The web manifest must identify VibeOS and use a relative start URL.');
}

const syntaxCheck = spawnSync(process.execPath, ['--check', resolve(web, 'app.js')], { stdio: 'inherit' });
if (syntaxCheck.status !== 0) {
  process.exit(syntaxCheck.status ?? 1);
}

console.log('VibeOS web source validation passed.');
