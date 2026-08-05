import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('project uses the sealwrapper entry and keeps all user copy configurable', async () => {
  const source = await readFile(
    new URL('../../src/index.ts', import.meta.url),
    'utf8',
  );
  assert.match(source, /registerMessageTemplateConfigs/);
  assert.match(source, /extension\.json/);
  assert.match(source, /readStorage<SeaItem\[\]>\(extension, 'sea'/);
  assert.match(source, /saveStorage\(extension, 'allBottles'/);
  assert.match(source, /'扔瓶子'/);
  assert.match(source, /'跳入星海'/);
});
