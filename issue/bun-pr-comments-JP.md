# bun の PR #45410 と #40536 へのコメント

oven-sh/bun の修正 PR 2 件に 2026-10-16 に投稿したコメントの本文と日本語訳

> 📅 作成: 2026-10-16 / 更新: 2026-10-16

[⌂](../README-JP.md)

[English](bun-pr-comments.md)

## 1. 修正 PR へのコメント

PR [#45410](https://github.com/oven-sh/bun/pull/45410) は、[#45059](https://github.com/oven-sh/bun/issues/45059) の `ENOENT` を直す。そのビルドを調べた結果を #45410 に伝え、[#40536](https://github.com/oven-sh/bun/pull/40536) の作者には、この PR が出たことを知らせた。根拠は [recursive mkdir の ENOENT](bun-mkdir-enoent-issue-JP.md) にある。

### #45410 へのコメント

[oven-sh/bun#45410](https://github.com/oven-sh/bun/pull/45410) に 2026-10-16 に投稿した（[投稿したコメント](https://github.com/oven-sh/bun/pull/45410#issuecomment-6217709790)）。

```markdown
Checked the PR build on Windows 11 x64 (Buildkite #126187, `1.4.4-canary.1+94fbd3674`).

- `.`, `./`, `.\` and `sub/..`: `mkdirSync`, `fs.promises.mkdir` and callback `fs.mkdir` with `{ recursive: true }` all succeed with no error. This matches Node.js and Deno. `sub/.` still works.
- Paths that start with `..` after collapsing (`../exists`, `./../exists`, `inner/../../exists`) still throw `EEXIST`. The description says #42014 covers these, so this is expected.

So this PR fixes the `ENOENT` cases reported in #45059, and #42014 fixes the `EEXIST` ones. Neither covers both on its own. I have not tested the two PRs together.

Repro and the full table: [here](https://lightspeedc.com/20261012-bun-mkdir-recursive-problem/issue/bun-mkdir-enoent-issue.html)
```

訳:

```text
Windows 11 x64 で PR のビルド（Buildkite #126187、1.4.4-canary.1+94fbd3674）を確かめました。

- `.`、`./`、`.\`、`sub/..`: { recursive: true } の mkdirSync、fs.promises.mkdir、コールバックの fs.mkdir が、すべてエラーなしで成功します。Node.js と Deno と同じです。`sub/.` も従来どおり通ります。
- 畳んだあと `..` で始まるパス（`../exists`、`./../exists`、`inner/../../exists`）は、まだ EEXIST を投げます。説明に #42014 が扱うとあるので、想定どおりです。

つまり、この PR は #45059 の ENOENT を直し、#42014 は EEXIST を直します。どちらか一方では両方を覆えません。2 つの PR を一緒に当てたものは試していません。

再現コードと全体の表: こちら
```

### #40536 へのコメント

[oven-sh/bun#40536](https://github.com/oven-sh/bun/pull/40536) に 2026-10-16 に投稿した（[投稿したコメント](https://github.com/oven-sh/bun/pull/40536#issuecomment-6217710980)）。

```markdown
FYI: the `ENOENT` cases this PR fixes (`./`, `.\` and `sub/..`, see #45059) now also have a separate fix, #45410. It resolves a relative path that normalizes to nothing to the cwd, inside `os_path_kernel32`, and its description mentions this PR.

I checked the #45410 build on Windows 11 x64 (Buildkite #126187, `1.4.4-canary.1+94fbd3674`): those three paths and `.` pass, but paths that start with `..` after collapsing still throw `EEXIST`. The build of this PR (Buildkite #106239, `1.4.1-canary.1+8c04559b9`) passes every case.

Details and the table: [here](https://lightspeedc.com/20261012-bun-mkdir-recursive-problem/issue/bun-mkdir-enoent-issue.html)
```

訳:

```text
参考までに: この PR が直す ENOENT（`./`、`.\`、`sub/..`。#45059 を参照）には、別の修正 #45410 も出ています。#45410 は、正規化すると空になる相対パスを os_path_kernel32 の中でカレントに解決するもので、説明にこの PR への言及があります。

#45410 のビルドを Windows 11 x64 で確かめました（Buildkite #126187、1.4.4-canary.1+94fbd3674）。その 3 件と `.` は通りますが、畳んだあと `..` で始まるパスは、まだ EEXIST を投げます。この PR のビルド（Buildkite #106239、1.4.1-canary.1+8c04559b9）は、すべての場合が通ります。

詳細と表: こちら
```

[⌂](../README-JP.md)

[English](bun-pr-comments.md)
