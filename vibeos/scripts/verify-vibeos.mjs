import { access, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { lookup } from 'node:dns/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..', 'src');
const web = resolve(root, 'web');
const assets = ['app.js', 'icon.svg', 'index.html', 'manifest.webmanifest', 'privacy.html', 'styles.css', 'sw.js'];
const androidPluginMarkerUrl = 'https://dl.google.com/dl/android/maven2/com/android/application/com.android.application.gradle.plugin/8.5.2/com.android.application.gradle.plugin-8.5.2.pom';

async function assertAndroidRepositoryReachable() {
  try {
    await lookup('dl.google.com');
  } catch (error) {
    throw new Error('Android preflight failed: unable to resolve dl.google.com, so Android Gradle Plugin artifacts cannot be downloaded.');
  }

  let response;
  try {
    response = await fetch(androidPluginMarkerUrl, { method: 'HEAD', signal: AbortSignal.timeout(10000) });
  } catch (error) {
    throw new Error(`Android preflight failed: could not reach Google Maven (${androidPluginMarkerUrl}).`);
  }

  if (!response.ok) {
    throw new Error(`Android preflight failed: Google Maven returned HTTP ${response.status} for ${androidPluginMarkerUrl}.`);
  }
}

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
if (
  parsedManifest.name !== 'VibeOS' ||
  parsedManifest.start_url !== './' ||
  parsedManifest.display !== 'standalone' ||
  !parsedManifest.theme_color ||
  !parsedManifest.background_color ||
  !Array.isArray(parsedManifest.icons) ||
  !parsedManifest.icons.some(icon => icon.src === 'icon.svg')
) {
  throw new Error('The web manifest must define VibeOS identity, standalone launch, theme, background, and icon.');
}

for (const requiredMarkup of ['<main id="main"', 'id="installBtn"', 'id="dialog"', 'id="quickAction"']) {
  if (!html.includes(requiredMarkup)) {
    throw new Error(`The app shell is missing required markup: ${requiredMarkup}`);
  }
}

for (const requiredWorkerFeature of [
  /addEventListener\(\s*['"]install['"]/,
  /addEventListener\(\s*['"]activate['"]/,
  /addEventListener\(\s*['"]fetch['"]/,
  /caches\.open/,
]) {
  if (!requiredWorkerFeature.test(serviceWorker)) {
    throw new Error(`The service worker is missing required offline behavior: ${requiredWorkerFeature}`);
  }
}

await assertAndroidRepositoryReachable();

for (const script of ['app.js', 'sw.js']) {
  const syntaxCheck = spawnSync(process.execPath, ['--check', resolve(web, script)], { stdio: 'inherit' });
  if (syntaxCheck.status !== 0) {
    process.exit(syntaxCheck.status ?? 1);
  }
}

console.log('VibeOS web source validation passed.');
