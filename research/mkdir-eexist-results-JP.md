# mkdir recursive の EEXIST 調査結果

Windows の Bun で、カレントより上やカレント自身を指す相対パスに `fs.mkdir(path, { recursive: true })` を使うと EEXIST ・ ENOENT になる。Node.js・Deno と比べた

> 📅 作成: 2026-10-12 / 更新: 2026-10-12

[⌂](../README-JP.md)

[English](mkdir-eexist-results.md)

1. [概要と環境](#1-概要と環境)
2. [結果](#2-結果)
3. [既存の issue と修正 PR](#3-既存の-issue-と修正-pr)
4. [再現の手順](#4-再現の手順)

## 1. 概要と環境

`recursive: true` を付けた `fs.mkdir` は、フォルダが既にあればエラーにせずに返る（Node.js の仕様）。Windows の Bun では、**`.` ・ `..` を畳んだパスが `..` で始まり（カレントより上を指し）、フォルダが既にある**ときに `EEXIST` になる。カレント自身を指すパス（`.` ・ `./` ・ `inner/..`）でも失敗する。Node.js と Deno では起きない。

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
| `mkdirSync('.')`（カレント自身） | ❌ EEXIST | ✅ | ✅ |
| `mkdirSync('./')` / `'.\\'` / `'inner/..'`（カレント自身） | ❌ ENOENT | ✅ | ✅ |
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
NG   .  EEXIST EEXIST: file already exists, mkdir '.'
NG   ./  ENOENT ENOENT: no such file or directory, mkdir
NG   .\  ENOENT ENOENT: no such file or directory, mkdir
NG   inner/..  ENOENT ENOENT: no such file or directory, mkdir
OK   ../new-dir
NG   ../new-dir  EEXIST EEXIST: file already exists, mkdir '..\new-dir'
NG   fs.promises.mkdir ../exists  EEXIST
NG   fs.mkdir ../exists  EEXIST
```

### 分かったこと

- 起きるのは、`.` ・ `..` を畳んだパスが `..` で始まり（カレントより上を指し）、フォルダが既にあるときだけ。区切りは `/` でも `\` でも起きる
- 先頭が `..` でなくても起きる。`./../exists` も、途中の `..` で上に出る `inner/../../exists` も失敗する。エラーメッセージのパスは、畳んだ形（`..\exists`）になる
- 畳んでもカレントの中に留まるパス（`inner/../inner` ・ `./inner` ・ `inner`）と絶対パスでは起きない
- カレント自身を指すパスも失敗する。`.` は `EEXIST: file already exists, mkdir '.'`、末尾に区切りが付く `./` ・ `.\` と、畳むとカレントになる `inner/..` は `ENOENT: no such file or directory, mkdir`（パスが空のまま出る）になる。`inner/.` は通る
- 同期・Promise・コールバックの 3 つの API すべてで起きる
- #17332（Bun 1.2.2）に出ていた `warn: internal error: OBJECT_NAME_INVALID` の行は、1.4.3 では出なかった
- 回避策: `path.resolve()` で絶対パスにしてから渡す

## 3. 既存の issue と修正 PR

同じ症状の issue が既にあり、修正の PR も出ている。**新しい issue は立てず、既存の issue にコメントを付けた**（[2026-10-12 に投稿したコメント](https://github.com/oven-sh/bun/issues/17332#issuecomment-6118179563)）。

- [oven-sh/bun#17332](https://github.com/oven-sh/bun/issues/17332) Bun crashes when creating duplicate directory in path starting with ../（2025-02-14 作成、OPEN、ラベル `bug` `windows` `node:fs`）。報告は `fs/promises` の `mkdir` だけ
- [oven-sh/bun#44576](https://github.com/oven-sh/bun/issues/44576) node:fs: recursive mkdir of "." or ".." throws EEXIST on Windows（2026-10-04 作成、OPEN）。`.` ・ `..` の EEXIST だけを扱う
- [oven-sh/bun#40536](https://github.com/oven-sh/bun/pull/40536) node:fs: return the namespaced absolute first path created for a relative recursive mkdir on Windows（2026-08-26 作成、OPEN）。相対パスをカレントと結合し、`..` を畳んでから処理する
- [oven-sh/bun#42635](https://github.com/oven-sh/bun/pull/42635) fix(node:fs): preserve Win32 semantics in recursive mkdir checks（2026-09-13 作成、OPEN）。説明に「`child\..` の ENOENT は残り、#40536 が扱う」とある
- [oven-sh/bun#42014](https://github.com/oven-sh/bun/pull/42014) sys(windows): resolve . and .. path components in mkdirat, unlinkat, renameat and exists_at（2026-09-08 作成、OPEN、レビュー待ち）。本文に `Fixes #17332` がある

### PR #42014 が挙げている原因

PR の説明によると、次の流れになる。

1. recursive の `fs.mkdir` は `CreateDirectoryW` を呼び、`EEXIST` が返ると、そこにあるものがフォルダかを `directory_exists_at_w` で調べる
2. その確認は NT の API を直接呼ぶ。名前を作る `to_nt_path` は区切りを変えるだけで、`.` ・ `..` を解決しない。NT は `..` を文字どおりの名前として扱うので、確認が失敗する
3. 確認が失敗したので、フォルダではないと判断され、`EEXIST` が返る
4. 再帰の処理は、先に `.` ・ `..` を字面で畳む。畳んだ結果の先頭に残る `..` は、元のフォルダのパスが無いと畳めないので、そのまま NT に渡る

この説明は、今回の結果と合う。`inner/../inner` は畳むと `inner` になって通り、`inner/../../exists` は畳むと `..\exists` になって失敗する。

### PR #42014 のソースを読んだ

先頭コミット `cfff26e9a` の差分を読んだ。直しているのは `src/paths/classify.rs` と `src/sys/lib.rs` の 2 つで、残りはテスト。

- `classify.rs`: パスの部品を数える `classify_rel_t` に、`has_dot_component`（ちょうど `.` か `..` の部品がある）を足した。`a.b` ・ `...` は名前として扱う
- `lib.rs`: 新しい関数 `nt_object_name_at` ・ `nt_object_name_at_w` を足した。`.` ・ `..` の部品があれば、`normalize_path_windows` でフォルダのハンドルを基準に解決し、無ければ従来どおり `to_nt_path` で区切りを変えるだけにする
- この関数を、`mkdirat` ・ `unlinkat` ・ `renameat`（移動先）・ `exists_at_type` ・ `exists_at_type_w` で使うよう置き換えた。フォルダの確認（`directory_exists_at_w`）は `exists_at_type_w` を通るので、ここで直る
- `exists_at_type_nt` にあった、先頭の `.\` を削る処理は消した（解決で要らなくなる）
- 再帰の処理（字面で畳む部分）は変えていない。先頭に残る `..` は、コメントを「`mkdirat` が解決する」に書き換えただけ
- 足したテスト（`fs-mkdir.test.ts`）のパスは `.` ・ `..` ・ `../cwd` ・ `../cwd/sub` ・ `./sub` ・ ファイル。末尾に区切りが付く `./` と、畳むとカレントになる `sub/..` は入っていない

読んだ内容は、PR の説明と合う。

### PR #42014 のビルドで確かめた

PR の CI（[Buildkite #113149](https://buildkite.com/bun/bun/builds/113149)）が作った Windows x64 のビルド `bun-windows-x64.zip` を取得した。SHA-256 は一覧の値と一致し、版は `1.4.3-canary.1+cfff26e9a`（PR の先頭コミット）だった。このビルドで、カレントより上を指す場合と `.` はすべて通った。**カレント自身を指す `./` ・ `.\` ・ `inner/..` の 3 件は、このビルドでも `ENOENT` になる**（[再現の手順](#4-再現の手順) の表）。原因は次の「ENOENT の原因」。

### ほかの PR のビルドで確かめた

同じ手順で、[#40536](https://github.com/oven-sh/bun/pull/40536) と [#42635](https://github.com/oven-sh/bun/pull/42635) の Windows x64 のビルドも取得した。どちらも SHA-256 は一覧の値と一致した。

| PR | ビルド | カレントより上・`.` | `./` ・ `.\` ・ `inner/..` |
|---|---|---|---|
| #40536 | [Buildkite #106239](https://buildkite.com/bun/bun/builds/106239)、`1.4.1-canary.1+8c04559b9` | ✅ | ✅ |
| #42635 | [Buildkite #115200](https://buildkite.com/bun/bun/builds/115200)、`1.4.3-canary.1+891eb8df5` | ✅ | ❌ ENOENT |
| #42014 | Buildkite #113149、`1.4.3-canary.1+cfff26e9a` | ✅ | ❌ ENOENT |

**3 つの PR のうち、すべての場合を直すのは #40536 だけ**。#40536 は 1.4.1 を元にしたビルドで、2026-08-26 から更新がない。

### ENOENT の原因（ソースで確かめた）

Bun 1.4.3（`c6da4a4d3`）の `src/runtime/node/types.rs` にある `os_path_kernel32` が、mkdir に渡す前にパスを字面で正規化する（`normalize_string_buf`）。

- 正規化すると `./` ・ `.\` ・ `inner/..` は**空の文字列**になる。ソースのコメントにも「normalizeStringBuf strips it to an empty string」とある
- 空になる入力のうち、**ちょうど `.` の 1 文字だけ**を特別に扱い、`.` のまま渡している。`./` などはこの判定に当たらず、空のまま mkdir に渡る
- 空のパスの mkdir は ENOENT になる。エラーメッセージのパスが空なのも、これで説明できる
- カレントより上を指すパスのエラーメッセージに、畳んだ形（`..\exists`）が出るのも、同じ正規化のため

直し方の候補: 正規化の結果が空なら `.` にする（今の `.` の特別扱いを、正規化の後ろへ移す）。

### 各 PR のソースと、直る・直らない理由

| PR | 変えているところ | ENOENT の 3 件 |
|---|---|---|
| #40536 | `node_fs.rs` の recursive mkdir の入口で、相対パスをカレントと結合して（`join_cwd_windows`）から正規化する | ✅ 結合したあとなので、正規化しても空にならず、カレントの絶対パスになる |
| #42635 | 既にあるかの確認を、NT の API から libuv の Win32 の stat（`stat_w`）に替える | ❌ 確認の前の、`os_path_kernel32` の正規化は変えていない |
| #42014 | NT に渡す名前の `.` ・ `..` を、フォルダのハンドルを基準に解決する（`nt_object_name_at`） | ❌ 同じく、`os_path_kernel32` の正規化は変えていない |

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
| Node.js v26.11.1 | ✅ 18 件成功 |
| Deno 2.9.7 | ✅ 18 件成功 |
| Bun 1.4.3 | ❌ 4 件成功 ・ 14 件失敗（カレントより上を指す 10 件と、カレント自身を指す 4 件） |
| Bun 1.4.3-canary.1+cfff26e9a（PR #42014 のビルド） | ❌ 15 件成功 ・ 3 件失敗（`./` ・ `.\` ・ `inner/..`） |
| Bun 1.4.3-canary.1+891eb8df5（PR #42635 のビルド） | ❌ 15 件成功 ・ 3 件失敗（`./` ・ `.\` ・ `inner/..`） |
| Bun 1.4.1-canary.1+8c04559b9（PR #40536 のビルド） | ✅ 18 件成功 |

[⌂](../README-JP.md)

[English](mkdir-eexist-results.md)
