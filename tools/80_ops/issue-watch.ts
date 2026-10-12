// 投稿した issue の状態を gh api で取り、etc/issue-watch.json の前回分と比べて変化を表示する
// 手順はローカルルールの 3 章
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ISSUES = [45059, 17332];
const MY_COMMENTS = [6118179563];
const root = join(import.meta.dirname, '../..');
const file = join(root, 'etc/issue-watch.json');

function gh(path: string): any {
	const out = execFileSync('gh', ['api', '--paginate', '--slurp', path], { encoding: 'utf8', timeout: 60000 });
	const pages = JSON.parse(out);
	return Array.isArray(pages[0]) ? pages.flat() : pages[0];
}

const now: Record<string, unknown> = {};
for (const n of ISSUES) {
	const i = gh(`repos/oven-sh/bun/issues/${n}`);
	const comments = gh(`repos/oven-sh/bun/issues/${n}/comments?per_page=100`);
	const timeline = gh(`repos/oven-sh/bun/issues/${n}/timeline?per_page=100`);
	now[`#${n}`] = {
		state: i.state,
		labels: i.labels.map((l: any) => l.name),
		comments: comments.map((c: any) => `${c.id} ${c.user.login} ${c.created_at}`),
		references: timeline.filter((e: any) => e.event === 'cross-referenced').map((e: any) => `#${e.source.issue.number}`),
	};
}
for (const id of MY_COMMENTS) {
	const c = gh(`repos/oven-sh/bun/issues/comments/${id}`);
	const { url, total_count, ...r } = c.reactions;
	now[`comment ${id}`] = { reactions: r };
}

const before: Record<string, unknown> = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
let changed = 0;
for (const k of Object.keys(now)) {
	const a = JSON.stringify(before[k]);
	const b = JSON.stringify(now[k]);
	if (a !== b) {
		changed++;
		console.log(`変化: ${k}\n  前回: ${a}\n  今回: ${b}`);
	}
}
console.log(changed ? `変化 ${changed} 件` : '変化なし');
mkdirSync(join(root, 'etc'), { recursive: true });
writeFileSync(file, JSON.stringify(now, null, '\t') + '\n');
