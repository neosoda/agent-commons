import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readPublicCatalog, validatePublicCatalog } from '../index.js';

describe('Reviewed upstream source catalog', () => {
  it('validates the expanded public source set and keeps all origins pinned', () => {
    const { catalog, categories } = readPublicCatalog();
    assert.ok(catalog.skills.length >= 89);
    const ids = new Set();
    const sources = new Set();
    for (const item of catalog.skills) {
      assert.ok(!ids.has(item.id), item.id + ' duplicate id');
      assert.ok(!sources.has(item.source), item.source + ' duplicate source');
      ids.add(item.id); sources.add(item.source);
      assert.match(item.ref, /^[a-f0-9]{40}$/);
      assert.ok(item.source.includes(item.ref));
      assert.ok(item.licenseEvidence.includes(item.ref));
      assert.ok(item.review.scope === 'source-and-license-only');
      assert.ok(!item.source.includes('.git/tree/'));
      assert.ok(!item.source.includes('token='));
    }
    assert.equal(validatePublicCatalog(catalog, categories).skills.length, catalog.skills.length);
  });

  it('respects per-skill licensing rather than inheriting repository licensing blindly', () => {
    const { catalog } = readPublicCatalog();
    const uiStyling = catalog.skills.find(skill => skill.id === 'ui-styling');
    assert.ok(uiStyling);
    assert.equal(uiStyling.license, 'Apache-2.0');
    assert.match(uiStyling.licenseEvidence, /\/\.claude\/skills\/ui-styling\/LICENSE\.txt$/);
    const other = catalog.skills.find(skill => skill.id === 'ui-ux-pro-max');
    assert.equal(other?.license, 'MIT');
  });

  it('only catalogues HyperFrames paths observed in current upstream and excludes a missing license', () => {
    const { catalog } = readPublicCatalog();
    for (const id of ['hyperframes', 'figma', 'slideshow']) {
      assert.ok(catalog.skills.some(skill => skill.id === id), id);
    }
    assert.equal(catalog.skills.some(skill => skill.id === 'hyperframes-animation'), false);
    assert.equal(catalog.skills.some(skill => skill.id === 'apple-design'), false);
  });
});
