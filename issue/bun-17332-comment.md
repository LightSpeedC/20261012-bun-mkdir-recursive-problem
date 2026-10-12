# Comment on bun#17332

The comment posted on oven-sh/bun#17332 on 2026-10-12

> 📅 Created: 2026-10-12 / Updated: 2026-10-12

[⌂](../README.md)

[日本語](bun-17332-comment-JP.md)

## 1. Comment on bun#17332

Posted on [oven-sh/bun#17332](https://github.com/oven-sh/bun/issues/17332) on 2026-10-12 ([the posted comment](https://github.com/oven-sh/bun/issues/17332#issuecomment-6118179563)). The block below is the text as posted.

> [!IMPORTANT]
> **Found after posting**: "all 14 cases pass" in the posted text is the test count at the time of posting. Later we found that paths naming the current directory itself (`.`, `./`, `.\`, `inner/..`) fail too, and the test now has 18 cases. With the #42014 build, `./`, `.\` and `inner/..` still throw `ENOENT` (same with the #42635 build). With the #40536 build, all 18 cases pass. See the [results](../research/mkdir-eexist-results.md). These three have not been posted yet.

```markdown
Still reproduces on Bun 1.4.3 (c6da4a4d3), Windows 11 10.0.26300 x64. Some additional data:

- It is not limited to `fs/promises`: `fs.mkdirSync`, `fs.promises.mkdir` and callback `fs.mkdir` all throw `EEXIST`.
- It is not limited to paths starting with `../`. It happens whenever the path, after `.` and `..` are collapsed, still starts with `..` (points above the cwd) and the directory already exists: `./../x`, `.\..\x`, `inner/../../x` and `../sub/x` fail too, and the error message shows the collapsed path (`'..\x'`). Paths that stay inside the cwd (`x`, `./x`, `x/../x`) and absolute paths work.
- The first call that creates `../new-dir` works; the second call throws.
- The `warn: internal error: OBJECT_NAME_INVALID` line from the original report is no longer printed.
- Node.js v26.11.1 and Deno 2.9.7 pass every case.

| API and path (cwd is `sub`) | Bun 1.4.3 | Node.js v26.11.1 | Deno 2.9.7 |
|---|---|---|---|
| `mkdirSync('../exists')` | ❌ EEXIST | ✅ | ✅ |
| `mkdirSync('..\\exists')` | ❌ EEXIST | ✅ | ✅ |
| `mkdirSync('./../exists')` / `'.\\..\\exists'` | ❌ EEXIST | ✅ | ✅ |
| `mkdirSync('inner/../../exists')` | ❌ EEXIST | ✅ | ✅ |
| `mkdirSync('../sub/inner')` / `'../sub/../exists'` | ❌ EEXIST | ✅ | ✅ |
| `mkdirSync(absolute path)` | ✅ | ✅ | ✅ |
| `mkdirSync('inner')` / `'./inner'` / `'inner/../inner'` | ✅ | ✅ | ✅ |
| `mkdirSync('../new-dir')` 1st / 2nd | ✅ / ❌ EEXIST | ✅ / ✅ | ✅ / ✅ |
| `fs.promises.mkdir('../exists')` | ❌ EEXIST | ✅ | ✅ |
| `fs.mkdir('../exists', cb)` | ❌ EEXIST | ✅ | ✅ |

Workaround: pass `path.resolve(p)`.

Repro script and a `node:test` file that runs unchanged on all three runtimes are in [this repository](https://github.com/LightSpeedC/20261012-bun-mkdir-recursive-problem#readme); the full write-up is [here](https://lightspeedc.com/20261012-bun-mkdir-recursive-problem/research/mkdir-eexist-results.html).

#42014 fixes this. I ran its Windows x64 CI build (`1.4.3-canary.1+cfff26e9a`, `bun-windows-x64.zip` from Buildkite #113149, SHA-256 checked) through the same test: all 14 cases pass, including every row marked ❌ above. The cause it describes, a `..` left at the start after lexical collapsing reaching the NT directory probe unresolved, also matches the cases above.
```

[⌂](../README.md)

[日本語](bun-17332-comment-JP.md)
