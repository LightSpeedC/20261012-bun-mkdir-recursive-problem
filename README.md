# Bun mkdir recursive problem

On Windows, Bun's fs.mkdir(path, { recursive: true }) throws EEXIST or ENOENT for an existing directory when a relative path points above the current directory or names the current directory itself, compared with Node.js and Deno

> 📅 Created: 2026-10-12 / Updated: 2026-10-12

[⌂](../)

[日本語](README-JP.md)

With `recursive: true`, `fs.mkdir` must return without an error when the directory already exists. On Windows, Bun throws `EEXIST` when a relative path points above the current directory (`../x`, `./../x`, `a/../../x`), and `ENOENT` when it names the current directory itself (`./`, `a/..`). This project records the measurements against Node.js and Deno, and the comment posted on the existing Bun issue [#17332](https://github.com/oven-sh/bun/issues/17332).

To run the tests on Windows (node, deno and bun must be on PATH): `tools\40_test\run-tests.cmd`

1. [Research](#1-research)
2. [Comment on the issue](#2-comment-on-the-issue)
3. [Related issues](#3-related-issues)
4. [Rules](#4-rules)

## 1. Research

- [mkdir recursive EEXIST results](research/mkdir-eexist-results.md)

## 2. Comment on the issue

- [Comment on bun#17332](issue/bun-17332-comment.md)

## 3. Related issues

- [oven-sh/bun#17332](https://github.com/oven-sh/bun/issues/17332) — Bun crashes when creating duplicate directory in path starting with ../
- [oven-sh/bun#42014](https://github.com/oven-sh/bun/pull/42014) — sys(windows): resolve . and .. path components in mkdirat, unlinkat, renameat and exists_at (the fix)
- [oven-sh/bun#44576](https://github.com/oven-sh/bun/issues/44576) — node:fs: recursive mkdir of "." or ".." throws EEXIST on Windows
- [oven-sh/bun#42635](https://github.com/oven-sh/bun/pull/42635) — fix(node:fs): preserve Win32 semantics in recursive mkdir checks (says the `child\..` ENOENT remains)
- [oven-sh/bun#40536](https://github.com/oven-sh/bun/pull/40536) — node:fs: return the namespaced absolute first path created for a relative recursive mkdir on Windows (its build passes every case, including the ENOENT ones)

## 4. Rules

- [Local rules](notes/90_rules/local-rules.md) (in Japanese)

[⌂](../)

[日本語](README-JP.md)
