# mkdir recursive EEXIST / ENOENT results

On Windows, Bun's `fs.mkdir(path, { recursive: true })` throws EEXIST or ENOENT for an existing directory when a relative path points above the current directory or names the current directory itself. Compared with Node.js and Deno

> 📅 Created: 2026-10-12 / Updated: 2026-10-12

[⌂](../README.md)

[日本語](mkdir-eexist-results-JP.md)

1. [Summary and environment](#1-summary-and-environment)
2. [Results](#2-results)
3. [Existing issues and fix PRs](#3-existing-issues-and-fix-prs)
4. [How to reproduce](#4-how-to-reproduce)

## 1. Summary and environment

With `recursive: true`, `fs.mkdir` returns without an error when the directory already exists (Node.js behavior). On Windows, Bun throws `EEXIST` when the path, **after `.` and `..` are collapsed, starts with `..` (points above the current directory) and the directory already exists**. Paths that name the current directory itself (`.`, `./`, `inner/..`) fail too. Node.js and Deno do not.

| Item | Value |
|---|---|
| OS | Windows 11 Home (10.0.26300) x64 |
| Bun | 1.4.3 (c6da4a4d3), the latest per `bun upgrade` |
| Node.js | v26.11.1 (same result on v26.10.0) |
| Deno | 2.9.7, the latest per `deno upgrade` |

## 2. Results

The current directory is `sub`. `exists` (already there) and `new-dir` (not yet there) are siblings of `sub`.

| API and path | Bun 1.4.3 | Node.js v26.11.1 | Deno 2.9.7 |
|---|---|---|---|
| `mkdirSync('../exists')` | ❌ EEXIST | ✅ | ✅ |
| `mkdirSync('..\\exists')` | ❌ EEXIST | ✅ | ✅ |
| `mkdirSync('./../exists')` / `'.\\..\\exists'` (starts with `./`) | ❌ EEXIST | ✅ | ✅ |
| `mkdirSync('inner/../../exists')` (an inner `..` climbs above) | ❌ EEXIST | ✅ | ✅ |
| `mkdirSync('../sub/inner')` / `'../sub/../exists'` | ❌ EEXIST | ✅ | ✅ |
| `mkdirSync('.')` (the current directory itself) | ❌ EEXIST | ✅ | ✅ |
| `mkdirSync('./')` / `'.\\'` / `'inner/..'` (the current directory itself) | ❌ ENOENT | ✅ | ✅ |
| `mkdirSync(absolute path)` | ✅ | ✅ | ✅ |
| `mkdirSync('inner')` / `'./inner'` / `'inner/../inner'` (stays inside) | ✅ | ✅ | ✅ |
| `mkdirSync('../new-dir')` 1st call (not there yet) | ✅ created | ✅ | ✅ |
| `mkdirSync('../new-dir')` 2nd call (already there) | ❌ EEXIST | ✅ | ✅ |
| `fs.promises.mkdir('../exists')` | ❌ EEXIST | ✅ | ✅ |
| `fs.mkdir('../exists', cb)` | ❌ EEXIST | ✅ | ✅ |

Bun output (verbatim, absolute path masked):

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

### Findings

- It happens when the path, after `.` and `..` are collapsed, starts with `..` (points above the current directory) and the directory exists, with either `/` or `\` as the separator
- The path does not have to start with `..`: `./../exists` and `inner/../../exists` (an inner `..` that climbs above) fail too. The path in the error message is the collapsed form (`..\exists`)
- Paths that stay inside after collapsing (`inner/../inner`, `./inner`, `inner`) and absolute paths work
- Paths that name the current directory itself fail too. `.` throws `EEXIST: file already exists, mkdir '.'`; `./` and `.\` (with a trailing separator) and `inner/..` (collapses to the current directory) throw `ENOENT: no such file or directory, mkdir` (with an empty path). `inner/.` works
- All three APIs fail: sync, promise and callback
- The `warn: internal error: OBJECT_NAME_INVALID` line reported in #17332 (Bun 1.2.2) is no longer printed on 1.4.3
- Workaround: pass an absolute path from `path.resolve()`

## 3. Existing issues and fix PRs

An issue with the same symptom already exists, and a fix PR is open. **Instead of filing a new issue, we added a comment to the existing one** ([the comment posted on 2026-10-12](https://github.com/oven-sh/bun/issues/17332#issuecomment-6118179563)).

- [oven-sh/bun#17332](https://github.com/oven-sh/bun/issues/17332) Bun crashes when creating duplicate directory in path starting with ../ (opened 2025-02-14, OPEN, labels `bug` `windows` `node:fs`). It reports `mkdir` from `fs/promises` only
- [oven-sh/bun#44576](https://github.com/oven-sh/bun/issues/44576) node:fs: recursive mkdir of "." or ".." throws EEXIST on Windows (opened 2026-10-04, OPEN). Covers the `.` and `..` EEXIST only
- [oven-sh/bun#40536](https://github.com/oven-sh/bun/pull/40536) node:fs: return the namespaced absolute first path created for a relative recursive mkdir on Windows (opened 2026-08-26, OPEN). Joins a relative path onto the cwd and collapses `..` first
- [oven-sh/bun#42635](https://github.com/oven-sh/bun/pull/42635) fix(node:fs): preserve Win32 semantics in recursive mkdir checks (opened 2026-09-13, OPEN). Its description says the `child\..` ENOENT remains and is covered by #40536
- [oven-sh/bun#42014](https://github.com/oven-sh/bun/pull/42014) sys(windows): resolve . and .. path components in mkdirat, unlinkat, renameat and exists_at (opened 2026-09-08, OPEN, review required). Its description says `Fixes #17332`

### The cause given in PR #42014

According to the PR description:

1. Recursive `fs.mkdir` calls `CreateDirectoryW`; on `EEXIST` it asks `directory_exists_at_w` whether the existing entry is a directory
2. That probe calls NT directly. `to_nt_path`, which builds the name, only flips separators and does not resolve `.` or `..`. NT takes `..` as a literal name, so the probe fails
3. Because the probe fails, the entry is not treated as a directory, and `EEXIST` is returned
4. The recursive walk first collapses `.` and `..` lexically. A `..` left at the start after collapsing cannot be resolved without the directory's path, so it reaches NT as is

This matches our results: `inner/../inner` collapses to `inner` and works, while `inner/../../exists` collapses to `..\exists` and fails.

### Reading the PR #42014 source

We read the diff at the head commit `cfff26e9a`. The fix is in two files, `src/paths/classify.rs` and `src/sys/lib.rs`; the rest are tests.

- `classify.rs`: `classify_rel_t`, which scans path components, gains `has_dot_component` (some component is exactly `.` or `..`). `a.b` and `...` are treated as names
- `lib.rs`: new `nt_object_name_at` and `nt_object_name_at_w`. If a `.` or `..` component exists, the path is resolved against the directory handle with `normalize_path_windows`; otherwise `to_nt_path` only flips separators, as before
- `mkdirat`, `unlinkat`, `renameat` (the target), `exists_at_type` and `exists_at_type_w` now use it. The directory probe (`directory_exists_at_w`) goes through `exists_at_type_w`, which is where this bug is fixed
- The code in `exists_at_type_nt` that trimmed a leading `.\` is removed (resolution makes it unnecessary)
- The recursive walk (the lexical collapse) is unchanged. For a leading `..` it keeps, only the comment changes to "`mkdirat` resolves it"
- The new test in `fs-mkdir.test.ts` covers `.`, `..`, `../cwd`, `../cwd/sub`, `./sub` and a file. It does not cover `./` with a trailing separator, or `sub/..` that collapses to the current directory

What we read matches the PR description.

### Checked with the PR #42014 build

We downloaded the Windows x64 build `bun-windows-x64.zip` from the PR's CI ([Buildkite #113149](https://buildkite.com/bun/bun/builds/113149)). Its SHA-256 matched the listed value, and its version was `1.4.3-canary.1+cfff26e9a` (the PR head commit). With this build, every path pointing above the current directory and `.` pass. **The three paths that name the current directory, `./`, `.\` and `inner/..`, still throw `ENOENT` with this build** (see the table in [How to reproduce](#4-how-to-reproduce)). The cause is in "The ENOENT cause" below.

### Checked with other PR builds

In the same way, we downloaded the Windows x64 builds of [#40536](https://github.com/oven-sh/bun/pull/40536) and [#42635](https://github.com/oven-sh/bun/pull/42635). Both SHA-256 values matched the listed ones.

| PR | Build | Above the cwd, `.` | `./`, `.\`, `inner/..` |
|---|---|---|---|
| #40536 | [Buildkite #106239](https://buildkite.com/bun/bun/builds/106239), `1.4.1-canary.1+8c04559b9` | ✅ | ✅ |
| #42635 | [Buildkite #115200](https://buildkite.com/bun/bun/builds/115200), `1.4.3-canary.1+891eb8df5` | ✅ | ❌ ENOENT |
| #42014 | Buildkite #113149, `1.4.3-canary.1+cfff26e9a` | ✅ | ❌ ENOENT |

**Of the three PRs, only #40536 fixes every case**. Its build is based on 1.4.1, and the PR has not been updated since 2026-08-26.

### The ENOENT cause (checked in the source)

In Bun 1.4.3 (`c6da4a4d3`), `os_path_kernel32` in `src/runtime/node/types.rs` normalizes the path lexically (`normalize_string_buf`) before it reaches mkdir.

- Normalizing turns `./`, `.\` and `inner/..` into **an empty string**. The source comment says so too: "normalizeStringBuf strips it to an empty string"
- Of the inputs that become empty, **only the exact one-character `.`** is special-cased and passed as `.`. `./` and the others miss that check and reach mkdir empty
- mkdir of an empty path fails with ENOENT, which also explains the empty path in the error message
- The same normalization is why errors for paths above the cwd show the collapsed form (`..\exists`)

A possible fix: if the normalized result is empty, use `.` (move the current `.` special case after the normalization).

### What each PR changes, and why it fixes the ENOENT or not

| PR | What it changes | The three ENOENT cases |
|---|---|---|
| #40536 | At the entry of recursive mkdir in `node_fs.rs`, joins a relative path onto the cwd (`join_cwd_windows`) before normalizing | ✅ After the join, normalizing gives the absolute path of the cwd instead of an empty string |
| #42635 | Replaces the existence check, from the NT API to libuv's Win32 stat (`stat_w`) | ❌ The normalization in `os_path_kernel32`, which runs before the check, is unchanged |
| #42014 | Resolves `.` and `..` in names passed to NT against the directory handle (`nt_object_name_at`) | ❌ Likewise, the normalization in `os_path_kernel32` is unchanged |

> [!NOTE]
> **Not verified**: whether it happens on Linux or macOS (the PR says its tests pass on Linux before and after the change).

## 4. How to reproduce

### Repro script

Run [research/repro.ts](repro.ts) in an empty folder.

```powershell
bun repro.ts
node repro.ts
deno run -A repro.ts
```

### Tests

[tests/mkdir-recursive.test.ts](../tests/mkdir-recursive.test.ts) is written with `node:test`, so the same file runs on all three runtimes. `tools\40_test\run-tests.cmd` runs it on node, deno and bun in that order and prints a summary.

| Runtime | Result |
|---|---|
| Node.js v26.11.1 | ✅ 18 passed |
| Deno 2.9.7 | ✅ 18 passed |
| Bun 1.4.3 | ❌ 4 passed, 14 failed (the 10 paths pointing above the current directory and the 4 naming the current directory) |
| Bun 1.4.3-canary.1+cfff26e9a (PR #42014 build) | ❌ 15 passed, 3 failed (`./`, `.\`, `inner/..`) |
| Bun 1.4.3-canary.1+891eb8df5 (PR #42635 build) | ❌ 15 passed, 3 failed (`./`, `.\`, `inner/..`) |
| Bun 1.4.1-canary.1+8c04559b9 (PR #40536 build) | ✅ 18 passed |

[⌂](../README.md)

[日本語](mkdir-eexist-results-JP.md)
