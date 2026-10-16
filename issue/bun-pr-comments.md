# Comments on bun PR #45410 and #40536

The comments posted on two open fix PRs of oven-sh/bun on 2026-10-16

> 📅 Created: 2026-10-16 / Updated: 2026-10-16

[⌂](../README.md)

[日本語](bun-pr-comments-JP.md)

## 1. Comments on the fix PRs

The PR [#45410](https://github.com/oven-sh/bun/pull/45410) fixes the `ENOENT` cases of [#45059](https://github.com/oven-sh/bun/issues/45059). We reported what its build does, and told the author of [#40536](https://github.com/oven-sh/bun/pull/40536) about it. The evidence is in [Recursive mkdir ENOENT](bun-mkdir-enoent-issue.md).

### Comment on #45410

Posted on [oven-sh/bun#45410](https://github.com/oven-sh/bun/pull/45410) on 2026-10-16 ([the posted comment](https://github.com/oven-sh/bun/pull/45410#issuecomment-6217709790)).

```markdown
Checked the PR build on Windows 11 x64 (Buildkite #126187, `1.4.4-canary.1+94fbd3674`).

- `.`, `./`, `.\` and `sub/..`: `mkdirSync`, `fs.promises.mkdir` and callback `fs.mkdir` with `{ recursive: true }` all succeed with no error. This matches Node.js and Deno. `sub/.` still works.
- Paths that start with `..` after collapsing (`../exists`, `./../exists`, `inner/../../exists`) still throw `EEXIST`. The description says #42014 covers these, so this is expected.

So this PR fixes the `ENOENT` cases reported in #45059, and #42014 fixes the `EEXIST` ones. Neither covers both on its own. I have not tested the two PRs together.

Repro and the full table: [here](https://lightspeedc.com/20261012-bun-mkdir-recursive-problem/issue/bun-mkdir-enoent-issue.html)
```

### Comment on #40536

Posted on [oven-sh/bun#40536](https://github.com/oven-sh/bun/pull/40536) on 2026-10-16 ([the posted comment](https://github.com/oven-sh/bun/pull/40536#issuecomment-6217710980)).

```markdown
FYI: the `ENOENT` cases this PR fixes (`./`, `.\` and `sub/..`, see #45059) now also have a separate fix, #45410. It resolves a relative path that normalizes to nothing to the cwd, inside `os_path_kernel32`, and its description mentions this PR.

I checked the #45410 build on Windows 11 x64 (Buildkite #126187, `1.4.4-canary.1+94fbd3674`): those three paths and `.` pass, but paths that start with `..` after collapsing still throw `EEXIST`. The build of this PR (Buildkite #106239, `1.4.1-canary.1+8c04559b9`) passes every case.

Details and the table: [here](https://lightspeedc.com/20261012-bun-mkdir-recursive-problem/issue/bun-mkdir-enoent-issue.html)
```

[⌂](../README.md)

[日本語](bun-pr-comments-JP.md)
