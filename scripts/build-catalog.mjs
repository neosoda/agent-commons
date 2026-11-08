import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPublicCatalog, renderPublicCatalogMarkdown } from '../dist/commands/public-catalog.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const target = path.join(root, 'docs', 'skills', 'README.md');
const readmeFiles = [
  { path: path.join(root, 'README.md'), language: 'fr' },
  { path: path.join(root, 'README.en.md'), language: 'en' }
];
const expected = renderPublicCatalogMarkdown();
const CREDIT_START = '<!-- BEGIN GENERATED SKILL REPOSITORY CREDITS -->';
const CREDIT_END = '<!-- END GENERATED SKILL REPOSITORY CREDITS -->';

function renderRepositoryCredits(language) {
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
  const intro = language === 'fr'
    ? 'Le catalogue public référence **' + catalog.skills.length + ' skills provenant de ' +
      byRepo.size + " dépôts sources**. Il s'agit **uniquement de métadonnées** : Agent Commons ne regroupe pas et n'installe pas automatiquement ces skills. Les licences sont indiquées pour chaque skill épinglé dans [l'index complet](docs/skills/README.md) ; si plusieurs licences figurent pour un dépôt, vérifiez celle applicable à chaque skill."
    : 'The curated public catalog references **' + catalog.skills.length +
      ' skills across ' + byRepo.size + ' upstream repositories**. These are **metadata-only references**: Agent Commons does not bundle or automatically install their skills. Licenses are recorded per pinned skill in [the full index](docs/skills/README.md); repositories with more than one license must be checked per skill.';
  return [
    intro,
    '',
    language === 'fr'
      ? '| Dépôt source | Auteur / responsable | Skills référencés | Licence(s) déclarée(s) |'
      : '| Upstream repository | Author / maintainer | Skill references | Declared license(s) |',
    '|:--|:--|--:|:--|',
    ...rows
  ].join('\n');
}

function withUpdatedCredits(readme, language) {
  const begin = readme.indexOf(CREDIT_START);
  const end = readme.indexOf(CREDIT_END);
  if (begin < 0 || end < begin + CREDIT_START.length ||
      readme.indexOf(CREDIT_START, begin + CREDIT_START.length) !== -1 ||
      readme.indexOf(CREDIT_END, end + CREDIT_END.length) !== -1) {
    throw new Error('README is missing unique upstream credit section markers: ' + language);
  }
  return readme.slice(0, begin + CREDIT_START.length) + '\n' +
    renderRepositoryCredits(language) + '\n' + readme.slice(end);
}

const normalize = (value) => value.replace(/\r\n/g, '\n');
const readmes = readmeFiles.map(({ path: file, language }) => {
  if (!fs.existsSync(file)) {
    throw new Error('Missing ' + path.relative(root, file) + ': both translations are required.');
  }
  const original = normalize(fs.readFileSync(file, 'utf8'));
  return { file, original, updated: withUpdatedCredits(original, language) };
});

if (process.argv.includes('--check')) {
  let valid = true;
  if (!fs.existsSync(target) || normalize(fs.readFileSync(target, 'utf8')) !== expected) {
    console.error('Skill Hub documentation is stale. Run npm run catalog:generate and commit the index.');
    valid = false;
  }
  for (const { file, original, updated } of readmes) {
    if (original !== updated) {
      console.error(path.relative(root, file) + ' upstream credits are stale. Run npm run catalog:generate and commit both READMEs.');
      valid = false;
    }
  }
  if (!valid) process.exitCode = 1;
  else console.log('Public catalog and French/English README upstream credits are valid.');
} else {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, expected, 'utf8');
  for (const { file, updated } of readmes) {
    fs.writeFileSync(file, updated, 'utf8');
  }
  console.log('Generated skill index and updated both README upstream credit tables.');
}
