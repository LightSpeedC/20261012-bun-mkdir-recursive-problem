// Run in an empty folder: bun repro.ts / node repro.ts / deno run -A repro.ts
import fs from 'node:fs';
import path from 'node:path';
fs.mkdirSync('exists', { recursive: true });
fs.mkdirSync('sub', { recursive: true });
fs.mkdirSync('sub/inner', { recursive: true });
process.chdir('sub');
for (const p of ['../exists', '..\\exists', './../exists', '.\\..\\exists', 'inner/../../exists', '../sub/inner', '../sub/../exists',
	path.resolve('../exists'), 'inner', './inner', 'inner/../inner', '../new-dir', '../new-dir']) {
	try { fs.mkdirSync(p, { recursive: true }); console.log('OK   ' + p); }
	catch (e: any) { console.log('NG   ' + p + '  ' + e.code + ' ' + e.message); }
}
try { await fs.promises.mkdir('../exists', { recursive: true }); console.log('OK   fs.promises.mkdir ../exists'); }
catch (e: any) { console.log('NG   fs.promises.mkdir ../exists  ' + e.code); }
await new Promise<void>((r) => fs.mkdir('../exists', { recursive: true }, (e) => {
	console.log(e ? 'NG   fs.mkdir ../exists  ' + e.code : 'OK   fs.mkdir ../exists'); r();
}));
