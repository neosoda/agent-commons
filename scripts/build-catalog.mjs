import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderPublicCatalogMarkdown } from '../dist/commands/public-catalog.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const target = path.join(root, 'docs', 'skills', 'README.md');
const expected = renderPublicCatalogMarkdown();

if (process.argv.includes('--check')) {
  if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n') !== expected) {
    console.error('Skill Hub documentation is stale. Run npm run catalog:generate and commit the index.');
    process.exitCode = 1;
  } else {
    console.log('Public Skill Hub metadata and generated documentation are valid.');
  }
} else {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, expected, 'utf8');
  console.log('Generated ' + path.relative(root, target));
}
