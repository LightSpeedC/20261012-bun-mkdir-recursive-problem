# mkdir recursive EEXIST results

On Windows, Bun's `fs.mkdir(path, { recursive: true })` throws EEXIST for an existing directory when a relative path points above the current directory. Compared with Node.js and Deno

> 📅 Created: 2026-10-12 / Updated: 2026-10-12

[⌂](../README.md)

[日本語](mkdir-eexist-results-JP.md)

1. [Summary and environment](#1-summary-and-environment)
2. [Results](#2-results)
3. [Existing issue and fix PR](#3-existing-issue-and-fix-pr)
4. [How to reproduce](#4-how-to-reproduce)

## 1. Summary and environment

With `recursive: true`, `fs.mkdir` returns without an error when the directory already exists (Node.js behavior). On Windows, Bun throws `EEXIST` only when the path, **after `.` and `..` are collapsed, starts with `..` (points above the current directory) and the directory already exists**. Node.js and Deno do not.

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
OK   ../new-dir
NG   ../new-dir  EEXIST EEXIST: file already exists, mkdir '..\new-dir'
NG   fs.promises.mkdir ../exists  EEXIST
NG   fs.mkdir ../exists  EEXIST
```

### Findings

- It happens only when the path, after `.` and `..` are collapsed, starts with `..` (points above the current directory) and the directory exists, with either `/` or `\` as the separator
- The path does not have to start with `..`: `./../exists` and `inner/../../exists` (an inner `..` that climbs above) fail too. The path in the error message is the collapsed form (`..\exists`)
- Paths that stay inside after collapsing (`inner/../inner`, `./inner`, `inner`) and absolute paths work
- All three APIs fail: sync, promise and callback
- The `warn: internal error: OBJECT_NAME_INVALID` line reported in #17332 (Bun 1.2.2) is no longer printed on 1.4.3
- Workaround: pass an absolute path from `path.resolve()`

## 3. Existing issue and fix PR

An issue with the same symptom already exists, and a fix PR is open. **Instead of filing a new issue, we add a comment to the existing one.**

- [oven-sh/bun#17332](https://github.com/oven-sh/bun/issues/17332) Bun crashes when creating duplicate directory in path starting with ../ (opened 2025-02-14, OPEN, labels `bug` `windows` `node:fs`). It reports `mkdir` from `fs/promises` only
- [oven-sh/bun#42014](https://github.com/oven-sh/bun/pull/42014) sys(windows): resolve . and .. path components in mkdirat, unlinkat, renameat and exists_at (opened 2026-09-08, OPEN, review required). Its description says `Fixes #17332`

### The cause given in PR #42014

According to the PR description (we have not read the source):

1. Recursive `fs.mkdir` calls `CreateDirectoryW`; on `EEXIST` it asks `directory_exists_at_w` whether the existing entry is a directory
2. That probe calls NT directly. `to_nt_path`, which builds the name, only flips separators and does not resolve `.` or `..`. NT takes `..` as a literal name, so the probe fails
3. Because the probe fails, the entry is not treated as a directory, and `EEXIST` is returned
4. The recursive walk first collapses `.` and `..` lexically. A `..` left at the start after collapsing cannot be resolved without the directory's path, so it reaches NT as is

This matches our results: `inner/../inner` collapses to `inner` and works, while `inner/../../exists` collapses to `..\exists` and fails.

### Checked with the PR #42014 build

We downloaded the Windows x64 build `bun-windows-x64.zip` from the PR's CI ([Buildkite #113149](https://buildkite.com/bun/bun/builds/113149)). Its SHA-256 matched the listed value, and its version was `1.4.3-canary.1+cfff26e9a` (the PR head commit). With this build, all 14 tests and every line of the repro script pass (see the table in [How to reproduce](#4-how-to-reproduce)).

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
| Node.js v26.11.1 | ✅ 14 passed |
| Deno 2.9.7 | ✅ 14 passed |
| Bun 1.4.3 | ❌ 4 passed, 10 failed (the 10 paths pointing above the current directory) |
| Bun 1.4.3-canary.1+cfff26e9a (PR #42014 build) | ✅ 14 passed |

[⌂](../README.md)

[日本語](mkdir-eexist-results-JP.md)
