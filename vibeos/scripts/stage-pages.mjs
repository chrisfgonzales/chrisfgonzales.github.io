import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..', '..');
const output = resolve(root, 'vibeos', '.pages');

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const path of ['.nojekyll', 'index.html', 'robots.txt', 'sitemap.xml']) {
  await cp(resolve(root, path), resolve(output, path));
}

await cp(resolve(root, 'book'), resolve(output, 'book'), { recursive: true });
await cp(resolve(root, 'vibeos', 'src', 'web'), resolve(output, 'vibeos'), { recursive: true });
