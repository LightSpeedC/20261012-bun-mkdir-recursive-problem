# mkdir recursive の EEXIST 調査結果

Windows の Bun で、カレントより上を指す相対パスに `fs.mkdir(path, { recursive: true })` を使うと EEXIST になる。Node.js・Deno と比べた

> 📅 作成: 2026-10-12 / 更新: 2026-10-12

[⌂](../README-JP.md)

[English](mkdir-eexist-results.md)

1. [概要と環境](#1-概要と環境)
2. [結果](#2-結果)
3. [既存の issue と修正 PR](#3-既存の-issue-と修正-pr)
4. [再現の手順](#4-再現の手順)

## 1. 概要と環境

`recursive: true` を付けた `fs.mkdir` は、フォルダが既にあればエラーにせずに返る（Node.js の仕様）。Windows の Bun では、**`.` ・ `..` を畳んだパスが `..` で始まり（カレントより上を指し）、フォルダが既にある**ときだけ `EEXIST` になる。Node.js と Deno では起きない。

| 項目 | 値 |
|---|---|
| OS | Windows 11 Home（10.0.26300）x64 |
| Bun | 1.4.3（c6da4a4d3）。`bun upgrade` で最新であることを確認 |
| Node.js | v26.11.1（v26.10.0 でも同じ結果） |
| Deno | 2.9.7。`deno upgrade` で最新であることを確認 |

## 2. 結果

カレントを `sub` にして、`sub` と同じ階層の `exists`（既にある）と `new-dir`（まだ無い）を指定した。

| API ・ 渡したパス | Bun 1.4.3 | Node.js v26.11.1 | Deno 2.9.7 |
|---|---|---|---|
| `mkdirSync('../exists')` | ❌ EEXIST | ✅ | ✅ |
| `mkdirSync('..\\exists')` | ❌ EEXIST | ✅ | ✅ |
| `mkdirSync('./../exists')` / `'.\\..\\exists'`（`./` で始まる） | ❌ EEXIST | ✅ | ✅ |
| `mkdirSync('inner/../../exists')`（途中の `..` で上に出る） | ❌ EEXIST | ✅ | ✅ |
| `mkdirSync('../sub/inner')` / `'../sub/../exists'` | ❌ EEXIST | ✅ | ✅ |
| `mkdirSync(絶対パス)` | ✅ | ✅ | ✅ |
| `mkdirSync('inner')` / `'./inner'` / `'inner/../inner'`（カレントの中に留まる） | ✅ | ✅ | ✅ |
| `mkdirSync('../new-dir')` 1 回目（まだ無い） | ✅ 作られる | ✅ | ✅ |
| `mkdirSync('../new-dir')` 2 回目（もうある） | ❌ EEXIST | ✅ | ✅ |
| `fs.promises.mkdir('../exists')` | ❌ EEXIST | ✅ | ✅ |
| `fs.mkdir('../exists', cb)` | ❌ EEXIST | ✅ | ✅ |

Bun の出力（そのまま。絶対パスは伏せた）:

```text
NG   ../exists  EEXIST EEXIST: file already exists, mkdir '..\exists'
NG   ..\exists  EEXIST EEXIST: file already exists, mkdir '..\exists'
NG   ./../exists  EEXIST EEXIST: file already exists, mkdir '..\exists'
NG   .\..\exists  EEXIST EEXIST: file already exists, mkdir '..\exists'
NG   inner/../../exists  EEXIST EEXIST: file already exists, mkdir '..\exists'
NG   ../sub/inner  EEXIST EEXIST: file already exists, mkdir '..\sub\inner'
NG   ../sub/../exists  EEXIST EEXIST: file already exists, mkdir '..\exists'
OK   <absolute path>\exists
OK   inner
OK   ./inner
OK   inner/../inner
OK   ../new-dir
NG   ../new-dir  EEXIST EEXIST: file already exists, mkdir '..\new-dir'
NG   fs.promises.mkdir ../exists  EEXIST
NG   fs.mkdir ../exists  EEXIST
```

### 分かったこと

- 起きるのは、`.` ・ `..` を畳んだパスが `..` で始まり（カレントより上を指し）、フォルダが既にあるときだけ。区切りは `/` でも `\` でも起きる
- 先頭が `..` でなくても起きる。`./../exists` も、途中の `..` で上に出る `inner/../../exists` も失敗する。エラーメッセージのパスは、畳んだ形（`..\exists`）になる
- 畳んでもカレントの中に留まるパス（`inner/../inner` ・ `./inner` ・ `inner`）と絶対パスでは起きない
- 同期・Promise・コールバックの 3 つの API すべてで起きる
- #17332（Bun 1.2.2）に出ていた `warn: internal error: OBJECT_NAME_INVALID` の行は、1.4.3 では出なかった
- 回避策: `path.resolve()` で絶対パスにしてから渡す

## 3. 既存の issue と修正 PR

同じ症状の issue が既にあり、修正の PR も出ている。**新しい issue は立てず、既存の issue にコメントを付ける**。

- [oven-sh/bun#17332](https://github.com/oven-sh/bun/issues/17332) Bun crashes when creating duplicate directory in path starting with ../（2025-02-14 作成、OPEN、ラベル `bug` `windows` `node:fs`）。報告は `fs/promises` の `mkdir` だけ
- [oven-sh/bun#42014](https://github.com/oven-sh/bun/pull/42014) sys(windows): resolve . and .. path components in mkdirat, unlinkat, renameat and exists_at（2026-09-08 作成、OPEN、レビュー待ち）。本文に `Fixes #17332` がある

### PR #42014 が挙げている原因

PR の説明によると、次の流れになる（ソースは読んでいない。PR の説明のまま）。

1. recursive の `fs.mkdir` は `CreateDirectoryW` を呼び、`EEXIST` が返ると、そこにあるものがフォルダかを `directory_exists_at_w` で調べる
2. その確認は NT の API を直接呼ぶ。名前を作る `to_nt_path` は区切りを変えるだけで、`.` ・ `..` を解決しない。NT は `..` を文字どおりの名前として扱うので、確認が失敗する
3. 確認が失敗したので、フォルダではないと判断され、`EEXIST` が返る
4. 再帰の処理は、先に `.` ・ `..` を字面で畳む。畳んだ結果の先頭に残る `..` は、元のフォルダのパスが無いと畳めないので、そのまま NT に渡る

この説明は、今回の結果と合う。`inner/../inner` は畳むと `inner` になって通り、`inner/../../exists` は畳むと `..\exists` になって失敗する。

### PR #42014 のビルドで確かめた

PR の CI（[Buildkite #113149](https://buildkite.com/bun/bun/builds/113149)）が作った Windows x64 のビルド `bun-windows-x64.zip` を取得した。SHA-256 は一覧の値と一致し、版は `1.4.3-canary.1+cfff26e9a`（PR の先頭コミット）だった。このビルドで、テスト 14 件と再現コードのすべてが通った（[再現の手順](#4-再現の手順) の表）。

> [!NOTE]
> **確かめていないこと**: Linux ・ macOS で起きるか（PR は Linux では修正の前後とも通ると書いている）。

## 4. 再現の手順

### 再現コード

[research/repro.ts](repro.ts) を空のフォルダで実行する。

```powershell
bun repro.ts
node repro.ts
deno run -A repro.ts
```

### テスト

[tests/mkdir-recursive.test.ts](../tests/mkdir-recursive.test.ts) は `node:test` で書いてあり、3 つのランタイムで同じものが流れる。`tools\40_test\run-tests.cmd` で、node ・ deno ・ bun の順に流して合否をまとめる。

| ランタイム | 結果 |
|---|---|
| Node.js v26.11.1 | ✅ 14 件成功 |
| Deno 2.9.7 | ✅ 14 件成功 |
| Bun 1.4.3 | ❌ 4 件成功 ・ 10 件失敗（カレントより上を指す 10 件） |
| Bun 1.4.3-canary.1+cfff26e9a（PR #42014 のビルド） | ✅ 14 件成功 |

[⌂](../README-JP.md)

[English](mkdir-eexist-results.md)
