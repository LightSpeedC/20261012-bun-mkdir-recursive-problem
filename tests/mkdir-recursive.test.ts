// fs.mkdir(path, { recursive: true }) は、既にあるフォルダでは何もせずに返る（Node の仕様）。
// Bun（Windows）は、`.` ・ `..` を畳んだパスが `..` で始まると EEXIST を投げる（oven-sh/bun#17332）。
// node・deno・bun で同じテストを流し、Bun だけが落ちることを示す。
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// 作業場所は OS の一時フォルダに毎回新しく作る（前回の残りに左右されないため）
let root = '';
let savedCwd = '';

before(() => {
	savedCwd = process.cwd();
	root = fs.mkdtempSync(path.join(os.tmpdir(), 'mkdir-recursive-'));
	fs.mkdirSync(path.join(root, 'exists'));
	fs.mkdirSync(path.join(root, 'sub', 'inner'), { recursive: true });
	process.chdir(path.join(root, 'sub'));
});

after(() => {
	process.chdir(savedCwd);
	fs.rmSync(root, { recursive: true, force: true });
});

// 比較の基準: `.` ・ `..` を畳んでもカレントの中に留まるパスは、どのランタイムでも通る
for (const p of ['inner', './inner', 'inner/../inner']) {
	test(`mkdirSync('${p}') は既にあるフォルダで例外を投げない`, () => {
		assert.doesNotThrow(() => fs.mkdirSync(p, { recursive: true }));
	});
}

test('mkdirSync(絶対パス) は既にあるフォルダで例外を投げない', () => {
	assert.doesNotThrow(() => fs.mkdirSync(path.resolve('../exists'), { recursive: true }));
});

// 不具合の本体: `.` ・ `..` を畳むと `..` で始まる（カレントより上を指す）相対パス。
// 先頭が `..` でなくても、途中の `..` で上に出れば起きる
for (const p of ['../exists', '..\\exists', './../exists', '.\\..\\exists', 'inner/../../exists', '../sub/inner', '../sub/../exists']) {
	test(`mkdirSync('${p.replace(/\\/g, '\\\\')}') は既にあるフォルダで例外を投げない`, () => {
		assert.doesNotThrow(() => fs.mkdirSync(p, { recursive: true }));
	});
}

test('mkdirSync(\'../new-dir\') は 2 回目（既にある）でも例外を投げない', () => {
	fs.mkdirSync('../new-dir', { recursive: true });
	assert.ok(fs.statSync('../new-dir').isDirectory());
	assert.doesNotThrow(() => fs.mkdirSync('../new-dir', { recursive: true }));
});

test('fs.promises.mkdir(\'../exists\') は既にあるフォルダで reject しない', async () => {
	await assert.doesNotReject(fs.promises.mkdir('../exists', { recursive: true }));
});

test('fs.mkdir(\'../exists\') はコールバックにエラーを渡さない', async () => {
	const err = await new Promise<NodeJS.ErrnoException | null>((resolve) => {
		fs.mkdir('../exists', { recursive: true }, (e) => resolve(e));
	});
	assert.equal(err, null);
});
