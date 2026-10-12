# Bun mkdir recursive problem

Windows の Bun で、カレントより上を指す相対パスに fs.mkdir(path, { recursive: true }) を使うと、既にあるフォルダで EEXIST になる。Node.js ・ Deno と比べる

> 📅 作成: 2026-10-12 / 更新: 2026-10-12

[⌂](../)

[English](README.md)

`recursive: true` を付けた `fs.mkdir` は、フォルダが既にあってもエラーにせずに返る。Windows の Bun は、カレントより上を指す相対パス（`../x` ・ `./../x` ・ `a/../../x`）だと `EEXIST` を投げる。このプロジェクトは、Node.js ・ Deno と比べた結果と、Bun の既存の issue [#17332](https://github.com/oven-sh/bun/issues/17332) に付けるコメントを残す。

Windows でテストを流すには（node ・ deno ・ bun が PATH にあること）: `tools\40_test\run-tests.cmd`

1. [調査](#1-調査)
2. [issue](#2-issue)
3. [関連する issue](#3-関連する-issue)

## 1. 調査

- [mkdir recursive の EEXIST 調査結果](research/mkdir-eexist-results-JP.md)

## 2. issue

- [bun#17332 へのコメント](issue/bun-17332-comment-JP.md)

## 3. 関連する issue

- [oven-sh/bun#17332](https://github.com/oven-sh/bun/issues/17332) — Bun crashes when creating duplicate directory in path starting with ../
- [oven-sh/bun#42014](https://github.com/oven-sh/bun/pull/42014) — sys(windows): resolve . and .. path components in mkdirat, unlinkat, renameat and exists_at（修正の PR）

[⌂](../)

[English](README.md)
