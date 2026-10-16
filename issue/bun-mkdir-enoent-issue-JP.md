# recursive mkdir の ENOENT

Windows の Bun で、"./" ・ ".\" ・ "sub/.." を recursive mkdir すると ENOENT になる。修正 PR の #42014 と #42635 では直らない

> 📅 作成: 2026-10-12 / 更新: 2026-10-16

[⌂](../README-JP.md)

[English](bun-mkdir-enoent-issue.md)

1. [概要](#1-概要)
2. [エビデンス: 実行結果](#2-エビデンス-実行結果)
3. [エビデンス: ソース](#3-エビデンス-ソース)

## 1. 概要

2026-10-12 に [oven-sh/bun#45059](https://github.com/oven-sh/bun/issues/45059) として投稿した。

- Windows で `fs.mkdirSync(p, { recursive: true })` に `./` ・ `.\` ・ `sub/..` を渡すと、パスが空の `ENOENT` になる。3 つともカレント自身を指し、カレントは存在する。`fs.promises.mkdir` とコールバックの `fs.mkdir` も同じように失敗する
- Node.js v26.11.1 と Deno 2.9.7 は、エラーにせずに返る
- **修正 PR の [#42014](https://github.com/oven-sh/bun/pull/42014) と [#42635](https://github.com/oven-sh/bun/pull/42635) では直らない。**[#40536](https://github.com/oven-sh/bun/pull/40536) は直す。2026-10-16 に出た [#45410](https://github.com/oven-sh/bun/pull/45410)（`Fixes #45059`）も直す（`..` で始まる EEXIST の件には手を付けていない）
- 原因: `os_path_kernel32` がこれらのパスを正規化して空の文字列にする。特別に扱うのは、ちょうど `"."` の入力だけ（[エビデンス: ソース](#3-エビデンス-ソース)）
- 直し方の候補: 正規化の結果が空なら `"."` にする（`"."` の特別扱いを、正規化の後ろへ移す）

再現コード: [research/repro-enoent.cjs](../research/repro-enoent.cjs)。同じケースは [tests/mkdir-recursive.test.ts](../tests/mkdir-recursive.test.ts) にもある。関連する EEXIST の不具合の詳細は [調査結果](../research/mkdir-eexist-results-JP.md)。

## 2. エビデンス: 実行結果

### 環境とビルド

Windows 11 Home 10.0.26300 x64。PR のビルドは、各 PR の Buildkite の CI が作った `bun-windows-x64.zip`。SHA-256 は、どれも Buildkite の一覧の値と一致した。

| ランタイム | 版 | 入手元 |
|---|---|---|
| Bun 1.4.3 | `1.4.3+c6da4a4d3` | 正式版（`bun upgrade`） |
| PR [#42014](https://github.com/oven-sh/bun/pull/42014) | `1.4.3-canary.1+cfff26e9a` | [Buildkite #113149](https://buildkite.com/bun/bun/builds/113149), SHA-256 `6f3415d871f3645620b01e22f27eb708a7267510277dd96a4816d455d5c8323e` |
| PR [#42635](https://github.com/oven-sh/bun/pull/42635) | `1.4.3-canary.1+891eb8df5` | [Buildkite #115200](https://buildkite.com/bun/bun/builds/115200), SHA-256 `6621af0f0afabbcfe8036403e0ff70a341eae63b741be8389992edfed019c0d2` |
| PR [#40536](https://github.com/oven-sh/bun/pull/40536) | `1.4.1-canary.1+8c04559b9` | [Buildkite #106239](https://buildkite.com/bun/bun/builds/106239), SHA-256 `8c8e13a081f26b85e9c0c11c65a2be8687237d02e61e669fb71ce04c5b164d95` |
| PR [#45410](https://github.com/oven-sh/bun/pull/45410) | `1.4.4-canary.1+94fbd3674` | [Buildkite #126187](https://buildkite.com/bun/bun/builds/126187), SHA-256 `8a0b522fb15843a3d38ddd019c179894c961dcfdf79c083d2f02a5c0522b79ee`（SHA-1 は Buildkite が示す値と一致した） |
| Node.js | `v26.11.1` | 正式版 |
| Deno | `2.9.7` | 正式版 |

### 結果

`mkdirSync` ・ `fs.promises.mkdir` ・ コールバックの `fs.mkdir` で、同じ結果になる。

| パス | Bun 1.4.3 | PR #42014 | PR #42635 | PR #40536 | PR #45410 | Node.js | Deno |
|---|---|---|---|---|---|---|---|
| `.` | ❌ EEXIST | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `./` | ❌ ENOENT | ❌ ENOENT | ❌ ENOENT | ✅ | ✅ | ✅ | ✅ |
| `.\` | ❌ ENOENT | ❌ ENOENT | ❌ ENOENT | ✅ | ✅ | ✅ | ✅ |
| `sub/..` | ❌ ENOENT | ❌ ENOENT | ❌ ENOENT | ✅ | ✅ | ✅ | ✅ |
| `sub/.` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### repro-enoent.cjs の出力（そのまま）

Bun 1.4.3:

```text
NG . EEXIST EEXIST: file already exists, mkdir '.'
NG ./ ENOENT ENOENT: no such file or directory, mkdir
NG .\ ENOENT ENOENT: no such file or directory, mkdir
NG sub/.. ENOENT ENOENT: no such file or directory, mkdir
OK sub/.
NG promises . EEXIST
NG callback . EEXIST
NG promises ./ ENOENT
NG callback ./ ENOENT
NG promises .\ ENOENT
NG callback .\ ENOENT
NG promises sub/.. ENOENT
NG callback sub/.. ENOENT
OK promises sub/.
OK callback sub/.
```

PR [#42014](https://github.com/oven-sh/bun/pull/42014) と PR [#42635](https://github.com/oven-sh/bun/pull/42635)（出力は同じ）:

```text
OK .
NG ./ ENOENT ENOENT: no such file or directory, mkdir
NG .\ ENOENT ENOENT: no such file or directory, mkdir
NG sub/.. ENOENT ENOENT: no such file or directory, mkdir
OK sub/.
OK promises .
OK callback .
NG promises ./ ENOENT
NG callback ./ ENOENT
NG promises .\ ENOENT
NG callback .\ ENOENT
NG promises sub/.. ENOENT
NG callback sub/.. ENOENT
OK promises sub/.
OK callback sub/.
```

PR [#40536](https://github.com/oven-sh/bun/pull/40536) ・ PR [#45410](https://github.com/oven-sh/bun/pull/45410) ・ Node.js ・ Deno（出力は同じ）:

```text
OK .
OK ./
OK .\
OK sub/..
OK sub/.
OK promises .
OK callback .
OK promises ./
OK callback ./
OK promises .\
OK callback .\
OK promises sub/..
OK callback sub/..
OK promises sub/.
OK callback sub/.
```

## 3. エビデンス: ソース

### パスが空になる箇所

[src/runtime/node/types.rs L1072-L1088](https://github.com/oven-sh/bun/blob/c6da4a4d3010e5553438c60f6bd76d981976867c/src/runtime/node/types.rs#L1072-L1088)（Bun 1.4.3、`c6da4a4d3`）。`os_path_kernel32` の、相対パスを扱う部分:

```rust
            // Handle "." specially since normalizeStringBuf strips it to an empty string
            if s.len() == 1 && s[0] == b'.' {
                // SAFETY: see alignment note above (PathBuffer reinterpreted as [u16]).
                let buf_u16 = unsafe { bun_core::bytes_as_slice_mut::<u16>(&mut buf[..]) };
                return Ok(strings::to_kernel32_path(buf_u16, b"."));
            }
            let normal = bun_paths::resolve_path::normalize_string_buf::<
                true,
                bun_paths::platform::Windows,
                false,
            >(s, &mut b[..]);
            if !strings::fits_in_wide_path_buffer(normal) {
                return Err(NameTooLong);
            }
            // SAFETY: see alignment note above (PathBuffer reinterpreted as [u16]).
            let buf_u16 = unsafe { bun_core::bytes_as_slice_mut::<u16>(&mut buf[..]) };
            return Ok(strings::to_kernel32_path(buf_u16, normal));
```

- コメントにあるとおり、`normalize_string_buf` は `"."` を空の文字列にする。そのため、正規化の前に `"."` だけを扱っている
- `./` ・ `.\` ・ `sub/..` も正規化すると同じく空になるが、判定は 1 文字の `"."` にしか当たらない。空のパスのまま mkdir に渡り、`ENOENT` のメッセージのパスが空なのとも合う

### 各 PR で直る・直らない理由

| PR | 変えているところ | ENOENT の件 |
|---|---|---|
| [#42014](https://github.com/oven-sh/bun/pull/42014) | NT に渡す名前の `.` ・ `..` を、フォルダのハンドルを基準に解決する（`src/sys/lib.rs` の `nt_object_name_at`） | ❌ `os_path_kernel32` は変えていない |
| [#42635](https://github.com/oven-sh/bun/pull/42635) | 既にあるかの確認を、libuv の Win32 の stat（`stat_w`）に替える | ❌ `os_path_kernel32` は変えていない |
| [#40536](https://github.com/oven-sh/bun/pull/40536) | `src/runtime/node/node_fs.rs` の recursive mkdir の入口で、相対パスをカレントと結合して（`join_cwd_windows`）から正規化する | ✅ 結合したパスは、正規化しても空にならず、カレントになる |
| [#45410](https://github.com/oven-sh/bun/pull/45410) | `os_path_kernel32` そのものを変える。正規化した相対パスが空で、元の入力が空でないとき、`getcwd` で得たカレントを使う。ちょうど `"."` だけの特別扱いは外す | ✅ 空の文字列が kernel32 に渡らない。`..` で始まる EEXIST の件は [#42014](https://github.com/oven-sh/bun/pull/42014) に任せている |

[#42635](https://github.com/oven-sh/bun/pull/42635) の説明にも、その PR で `child\..` の `ENOENT` は残り、[#40536](https://github.com/oven-sh/bun/pull/40536) が扱う、とある。[#40536](https://github.com/oven-sh/bun/pull/40536) は 1.4.1 を元にしていて、2026-08-26 から更新がない。

[⌂](../README-JP.md)

[English](bun-mkdir-enoent-issue.md)
