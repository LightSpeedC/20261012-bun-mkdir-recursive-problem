# bun#17332 へのコメント

oven-sh/bun#17332 に 2026-10-12 に投稿したコメントの本文と日本語訳

> 📅 作成: 2026-10-12 / 更新: 2026-10-12

[⌂](../README-JP.md)

[English](bun-17332-comment.md)

1. [新しい issue を立てない理由](#1-新しい-issue-を立てない理由)
2. [投稿した本文の訳](#2-投稿した本文の訳)

## 1. 新しい issue を立てない理由

- 同じ症状の [oven-sh/bun#17332](https://github.com/oven-sh/bun/issues/17332) が 2025-02-14 から OPEN のまま残っている
- 修正の [oven-sh/bun#42014](https://github.com/oven-sh/bun/pull/42014) が出ていて、レビュー待ち（`Fixes #17332`）
- 新しい issue は重複として閉じられる。#17332 に、1.4.3 でも起きることと、今回分かった範囲（同期・コールバックでも起きる、`../` で始まるパスに限らない、Node.js ・ Deno では起きない）を足すほうが役に立つ

> [!IMPORTANT]
> **投稿のあとに分かったこと**: 投稿した本文の「14 件すべてが通った」は、投稿した時点のテストの件数。そのあと、カレント自身を指すパス（`.` ・ `./` ・ `.\` ・ `inner/..`）でも失敗することが分かり、テストを 18 件にした。#42014 のビルドでも `./` ・ `.\` ・ `inner/..` の 3 件は `ENOENT` になる（#42635 のビルドも同じ）。#40536 のビルドでは 18 件すべてが通る。詳しくは [調査結果](../research/mkdir-eexist-results-JP.md)。この 3 件は、まだ投稿していない。

投稿した本文（英語）は [英語版](bun-17332-comment.md) にある。投稿したコメントは [こちら](https://github.com/oven-sh/bun/issues/17332#issuecomment-6118179563)。

## 2. 投稿した本文の訳

- Bun 1.4.3（c6da4a4d3）、Windows 11 10.0.26300 x64 でまだ再現する
- `fs/promises` だけではない。`fs.mkdirSync` ・ `fs.promises.mkdir` ・ コールバックの `fs.mkdir` のすべてで `EEXIST` になる
- `../` で始まるパスに限らない。`.` ・ `..` を畳んだパスがまだ `..` で始まり（カレントより上を指し）、フォルダが既にあれば起きる。`./../x` ・ `.\..\x` ・ `inner/../../x` ・ `../sub/x` も失敗し、エラーメッセージには畳んだパス（`'..\x'`）が出る。カレントの中に留まるパス（`x` ・ `./x` ・ `x/../x`）と絶対パスは通る
- `../new-dir` を作る 1 回目は通り、2 回目で失敗する
- 元の報告にあった `warn: internal error: OBJECT_NAME_INVALID` の行は、もう出ない
- Node.js v26.11.1 と Deno 2.9.7 は、すべての場合で通る
- （結果の表。[調査結果](../research/mkdir-eexist-results-JP.md) の表と同じ）
- 回避策: `path.resolve(p)` を渡す
- 再現コードと、3 つのランタイムでそのまま流れる `node:test` のテストは、[このリポジトリ](https://github.com/LightSpeedC/20261012-bun-mkdir-recursive-problem#readme)にある。詳しい調査結果は[こちら](https://lightspeedc.com/20261012-bun-mkdir-recursive-problem/research/mkdir-eexist-results.html)
- #42014 で直る。その Windows x64 の CI ビルド（`1.4.3-canary.1+cfff26e9a`。Buildkite #113149 の `bun-windows-x64.zip`、SHA-256 を照合済み）で同じテストを流すと、上の表で ❌ の行も含めて 14 件すべてが通った。説明している原因「字面で畳んだあと先頭に残る `..` が、解決されないまま NT のフォルダ確認に渡る」も、上の結果と合う

[⌂](../README-JP.md)

[English](bun-17332-comment.md)
