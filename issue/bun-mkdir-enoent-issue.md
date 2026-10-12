# Recursive mkdir ENOENT

On Windows, Bun's recursive mkdir of "./", ".\" or "a/.." throws ENOENT. The open fix PRs #42014 and #42635 do not fix it

> 📅 Created: 2026-10-12 / Updated: 2026-10-12

[⌂](../README.md)

[日本語](bun-mkdir-enoent-issue-JP.md)

1. [Summary](#1-summary)
2. [Evidence: runs](#2-evidence-runs)
3. [Evidence: source](#3-evidence-source)

## 1. Summary

Filed as [oven-sh/bun#45059](https://github.com/oven-sh/bun/issues/45059) on 2026-10-12.

- On Windows, `fs.mkdirSync(p, { recursive: true })` throws `ENOENT` with an empty path for `p` = `./`, `.\` or `sub/..`. All three name the current directory, which exists. `fs.promises.mkdir` and callback `fs.mkdir` fail the same way
- Node.js v26.11.1 and Deno 2.9.7 return without an error
- **The open fix PRs #42014 and #42635 do not fix it.** Only #40536 does
- Cause: `os_path_kernel32` normalizes these paths into an empty string, and only the exact input `"."` is special-cased ([Evidence: source](#3-evidence-source))
- A possible fix: if the normalized result is empty, use `"."` (move the `"."` special case after the normalization)

Repro script: [research/repro-enoent.cjs](../research/repro-enoent.cjs). The same cases are in [tests/mkdir-recursive.test.ts](../tests/mkdir-recursive.test.ts). The full write-up of the related EEXIST bug is in the [results](../research/mkdir-eexist-results.md).

## 2. Evidence: runs

### Environment and builds

Windows 11 Home 10.0.26300 x64. The PR builds are `bun-windows-x64.zip` from each PR's Buildkite CI; each SHA-256 matched the value listed by Buildkite.

| Runtime | Version | Source |
|---|---|---|
| Bun 1.4.3 | `1.4.3+c6da4a4d3` | release (`bun upgrade`) |
| PR #42014 | `1.4.3-canary.1+cfff26e9a` | [Buildkite #113149](https://buildkite.com/bun/bun/builds/113149), SHA-256 `6f3415d871f3645620b01e22f27eb708a7267510277dd96a4816d455d5c8323e` |
| PR #42635 | `1.4.3-canary.1+891eb8df5` | [Buildkite #115200](https://buildkite.com/bun/bun/builds/115200), SHA-256 `6621af0f0afabbcfe8036403e0ff70a341eae63b741be8389992edfed019c0d2` |
| PR #40536 | `1.4.1-canary.1+8c04559b9` | [Buildkite #106239](https://buildkite.com/bun/bun/builds/106239), SHA-256 `8c8e13a081f26b85e9c0c11c65a2be8687237d02e61e669fb71ce04c5b164d95` |
| Node.js | `v26.11.1` | release |
| Deno | `2.9.7` | release |

### Results

The same result for `mkdirSync`, `fs.promises.mkdir` and callback `fs.mkdir`.

| Path | Bun 1.4.3 | PR #42014 | PR #42635 | PR #40536 | Node.js | Deno |
|---|---|---|---|---|---|---|
| `.` | ❌ EEXIST | ✅ | ✅ | ✅ | ✅ | ✅ |
| `./` | ❌ ENOENT | ❌ ENOENT | ❌ ENOENT | ✅ | ✅ | ✅ |
| `.\` | ❌ ENOENT | ❌ ENOENT | ❌ ENOENT | ✅ | ✅ | ✅ |
| `sub/..` | ❌ ENOENT | ❌ ENOENT | ❌ ENOENT | ✅ | ✅ | ✅ |
| `sub/.` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### Output of repro-enoent.cjs (verbatim)

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

PR #42014 and PR #42635 (identical output):

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

PR #40536, Node.js and Deno (identical output):

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

## 3. Evidence: source

### Where the path becomes empty

[src/runtime/node/types.rs L1072-L1088](https://github.com/oven-sh/bun/blob/c6da4a4d3010e5553438c60f6bd76d981976867c/src/runtime/node/types.rs#L1072-L1088) (Bun 1.4.3, `c6da4a4d3`), in `os_path_kernel32` for a relative path:

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

- The comment says `normalize_string_buf` strips `"."` to an empty string, so `"."` is handled before it
- `./`, `.\` and `sub/..` normalize to the same empty string, but the check only matches the one-character input `"."`. They reach mkdir as an empty path, which matches the empty path in the `ENOENT` message

### Why each PR fixes it or not

| PR | What it changes | ENOENT cases |
|---|---|---|
| [#42014](https://github.com/oven-sh/bun/pull/42014) | Resolves `.` and `..` in names passed to NT against the directory handle (`nt_object_name_at` in `src/sys/lib.rs`) | ❌ `os_path_kernel32` unchanged |
| [#42635](https://github.com/oven-sh/bun/pull/42635) | Replaces the existence check with libuv's Win32 stat (`stat_w`) | ❌ `os_path_kernel32` unchanged |
| [#40536](https://github.com/oven-sh/bun/pull/40536) | At the entry of recursive mkdir in `src/runtime/node/node_fs.rs`, joins a relative path onto the cwd (`join_cwd_windows`) and normalizes the joined path | ✅ the joined path normalizes to the cwd, not an empty string |

#42635's description also notes that `child\..` still reports `ENOENT` with that PR and says #40536 covers it. #40536 is based on 1.4.1 and has not been updated since 2026-08-26.

[⌂](../README.md)

[日本語](bun-mkdir-enoent-issue-JP.md)
