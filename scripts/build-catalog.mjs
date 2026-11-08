import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPublicCatalog, renderPublicCatalogMarkdown } from '../dist/commands/public-catalog.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const target = path.join(root, 'docs', 'skills', 'README.md');
const readmePath = path.join(root, 'README.md');
const expected = renderPublicCatalogMarkdown();
const CREDIT_START = '<!-- BEGIN GENERATED SKILL REPOSITORY CREDITS -->';
const CREDIT_END = '<!-- END GENERATED SKILL REPOSITORY CREDITS -->';

function renderRepositoryCredits() {
  const { catalog } = readPublicCatalog();
  const byRepo = new Map();
  for (const skill of catalog.skills) {
    let record = byRepo.get(skill.repository);
    if (!record) {
      record = { author: skill.author, count: 0, licenses: new Set() };
      byRepo.set(skill.repository, record);
    }
    record.count += 1;
    record.licenses.add(skill.license);
  }
  const escape = (value) => value.replace(/\|/g, '\\|');
  const rows = [...byRepo.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'en'))
    .map(([repository, record]) => {
      const label = repository.replace('https://github.com/', '');
      const licenses = [...record.licenses].sort().join(' / ');
      return '| [' + escape(label) + '](' + repository + ') | ' + escape(record.author) +
        ' | ' + record.count + ' | ' + escape(licenses) + ' |';
    });
  return [
    'The curated public catalog references **' + catalog.skills.length +
      ' skills across ' + byRepo.size + ' upstream repositories**. These are **metadata-only references**: Agent Commons does not bundle or automatically install their skills. Licenses are recorded per pinned skill in [the full index](docs/skills/README.md); repositories with more than one license must be checked per skill.',
    '',
    '| Upstream repository | Author / maintainer | Skill references | Declared license(s) |',
    '|:--|:--|--:|:--|',
    ...rows
  ].join('\n');
}

function withUpdatedCredits(readme) {
  const begin = readme.indexOf(CREDIT_START);
  const end = readme.indexOf(CREDIT_END);
  if (begin < 0 || end < begin + CREDIT_START.length ||
      readme.indexOf(CREDIT_START, begin + CREDIT_START.length) !== -1 ||
      readme.indexOf(CREDIT_END, end + CREDIT_END.length) !== -1) {
    throw new Error('README.md is missing unique upstream credit section markers.');
  }
  return readme.slice(0, begin + CREDIT_START.length) + '\n' +
    renderRepositoryCredits() + '\n' + readme.slice(end);
}

const normalize = (value) => value.replace(/\r\n/g, '\n');
const sourceReadme = normalize(fs.readFileSync(readmePath, 'utf8'));
const updatedReadme = withUpdatedCredits(sourceReadme);

if (process.argv.includes('--check')) {
  let valid = true;
  if (!fs.existsSync(target) || normalize(fs.readFileSync(target, 'utf8')) !== expected) {
    console.error('Skill Hub documentation is stale. Run npm run catalog:generate and commit the index.');
    valid = false;
  }
  if (updatedReadme !== sourceReadme) {
    console.error('README upstream credits are stale. Run npm run catalog:generate and commit README.md.');
    valid = false;
  }
  if (!valid) process.exitCode = 1;
  else console.log('Public Skill Hub metadata, generated index and README upstream credits are valid.');
} else {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, expected, 'utf8');
  fs.writeFileSync(readmePath, updatedReadme, 'utf8');
  console.log('Generated ' + path.relative(root, target) + ' and updated README upstream credits.');
}
