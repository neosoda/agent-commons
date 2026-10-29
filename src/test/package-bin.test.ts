import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

describe('npm CLI entrypoint packaging', () => {
  it('keeps a normalized bin mapping to an executable compiled Node.js script', () => {
    const root = process.cwd();
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')) as {
      name: string;
      bin: Record<string, string>;
      files: string[];
    };
    assert.equal(manifest.name, '@neosoda/agent-commons');
    assert.equal(manifest.bin['agent-commons'], 'dist/cli/index.js');
    assert.ok(manifest.files.includes('dist/cli'), 'CLI directory is included in the npm tarball');
    const script = path.join(root, manifest.bin['agent-commons']!);
    assert.equal(fs.existsSync(script), true, 'CLI script exists after the build');
    assert.match(fs.readFileSync(script, 'utf8').split(/\r?\n/, 1)[0] ?? '', /^#!\/usr\/bin\/env node$/);
  });
});
