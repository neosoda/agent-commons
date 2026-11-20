import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readPublicCatalog } from '../index.js';

const curated = {
  'todo-discipline': ['frankxai/awesome-hermes-agent-skills', '1f1ae5bd11bffc525fb675836c34225f2f41c2e9', 'skills/todo-discipline'],
  'bounded-orchestration-contract': ['markoblogo/abvx-agent-skills', 'd4af8c3a5596ed055f5be5bbbd4c36b37d535530', 'skills/bounded-orchestration-contract'],
  'compaction-survival': ['markoblogo/abvx-agent-skills', 'd4af8c3a5596ed055f5be5bbbd4c36b37d535530', 'skills/compaction-survival'],
  'skill-health-audit': ['markoblogo/abvx-agent-skills', 'd4af8c3a5596ed055f5be5bbbd4c36b37d535530', 'skills/skill-health-audit'],
  'local-inference-tuning': ['markoblogo/abvx-agent-skills', 'd4af8c3a5596ed055f5be5bbbd4c36b37d535530', 'skills/local-inference-tuning'],
  'skill-inspector': ['NVIDIA/SkillSpector', '48e0f942ea1f5fdb7aa096a6f65a0adeda2ecc4e', 'skills/skill-inspector']
} as const;

describe('Hermes safety-first curated subset', () => {
  it('keeps all six exact primary sources pinned, with verified license links and no implicit dependencies', () => {
    const { catalog } = readPublicCatalog();
    const selection = catalog.skills.filter(skill => skill.tags.includes('hermes-curated'));
    assert.equal(selection.length, 6);
    for (const [id, [repo, ref, skillPath]] of Object.entries(curated)) {
      const skill = selection.find(item => item.id === id);
      assert.ok(skill, id);
      const root = 'https://github.com/' + repo;
      assert.equal(skill.repository, root);
      assert.equal(skill.ref, ref);
      assert.equal(skill.path, skillPath);
      assert.equal(skill.source, root + '/tree/' + ref + '/' + skillPath);
      assert.equal(skill.licenseEvidence, root + '/blob/' + ref + '/LICENSE');
      assert.deepEqual(skill.dependencies, []);
      assert.equal(skill.review.scope, 'source-and-license-only');
      assert.equal(skill.review.sourceChecked, '2026-11-20');
    }
    assert.equal(selection.some(skill => /superpack|incident-commander|session-guard/.test(skill.id)), false);
  });
});
