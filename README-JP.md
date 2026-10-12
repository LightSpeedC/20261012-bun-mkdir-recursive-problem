# Bun の mkdir recursive 問題

Windows の Bun で、カレントより上やカレント自身を指す相対パスに fs.mkdir(path, { recursive: true }) を使うと、既にあるフォルダで EEXIST ・ ENOENT になる。Node.js ・ Deno と比べる

> 📅 作成: 2026-10-12 / 更新: 2026-10-12

[⌂](../)

[English](README.md)

`recursive: true` を付けた `fs.mkdir` は、フォルダが既にあってもエラーにせずに返る。Windows の Bun は、カレントより上を指す相対パス（`../x` ・ `./../x` ・ `a/../../x`）だと `EEXIST` を投げ、カレント自身を指す `./` ・ `a/..` だと `ENOENT` を投げる。このプロジェクトは、Node.js ・ Deno と比べた結果と、Bun の既存の issue [#17332](https://github.com/oven-sh/bun/issues/17332) に付けたコメントを残す。

Windows でテストを流すには（node ・ deno ・ bun が PATH にあること）: `tools\40_test\run-tests.cmd`

1. [調査](#1-調査)
2. [issue へのコメント](#2-issue-へのコメント)
3. [関連する issue](#3-関連する-issue)
4. [ルール](#4-ルール)

## 1. 調査

- [mkdir recursive の EEXIST 調査結果](research/mkdir-eexist-results-JP.md)

## 2. issue へのコメント

- [bun#17332 へのコメント](issue/bun-17332-comment-JP.md)

## 3. 関連する issue

- [oven-sh/bun#17332](https://github.com/oven-sh/bun/issues/17332) — Bun crashes when creating duplicate directory in path starting with ../
- [oven-sh/bun#42014](https://github.com/oven-sh/bun/pull/42014) — sys(windows): resolve . and .. path components in mkdirat, unlinkat, renameat and exists_at（修正の PR）
- [oven-sh/bun#44576](https://github.com/oven-sh/bun/issues/44576) — node:fs: recursive mkdir of "." or ".." throws EEXIST on Windows
- [oven-sh/bun#42635](https://github.com/oven-sh/bun/pull/42635) — fix(node:fs): preserve Win32 semantics in recursive mkdir checks（`child\..` の ENOENT が残ると書いている PR）
- [oven-sh/bun#40536](https://github.com/oven-sh/bun/pull/40536) — node:fs: return the namespaced absolute first path created for a relative recursive mkdir on Windows（そのビルドで、ENOENT も含めすべての場合が通った PR）

## 4. ルール

- [ローカルルール](notes/90_rules/local-rules.md)

[⌂](../)

[English](README.md)
