# Bun mkdir recursive problem

On Windows, Bun's fs.mkdir(path, { recursive: true }) throws EEXIST for an existing directory when a relative path points above the current directory, compared with Node.js and Deno

> 📅 Created: 2026-10-12 / Updated: 2026-10-12

[⌂](../)

[日本語](README-JP.md)

With `recursive: true`, `fs.mkdir` must return without an error when the directory already exists. On Windows, Bun throws `EEXIST` when a relative path points above the current directory (`../x`, `./../x`, `a/../../x`). This project records the measurements against Node.js and Deno, and the comment for the existing Bun issue [#17332](https://github.com/oven-sh/bun/issues/17332).

To run the tests on Windows (node, deno and bun must be on PATH): `tools\40_test\run-tests.cmd`

1. [Research](#1-research)
2. [Issue](#2-issue)
3. [Related issues](#3-related-issues)

## 1. Research

- [mkdir recursive EEXIST results](research/mkdir-eexist-results.md)

## 2. Issue

- [Comment on bun#17332 (draft)](issue/bun-17332-comment.md)

## 3. Related issues

- [oven-sh/bun#17332](https://github.com/oven-sh/bun/issues/17332) — Bun crashes when creating duplicate directory in path starting with ../
- [oven-sh/bun#42014](https://github.com/oven-sh/bun/pull/42014) — sys(windows): resolve . and .. path components in mkdirat, unlinkat, renameat and exists_at (the fix)

[⌂](../)

[日本語](README-JP.md)
