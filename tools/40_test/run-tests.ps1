# 同じテストを node・deno・bun で流し、ランタイムごとの合否を表示する
$ErrorActionPreference = 'Stop'
$tests = Join-Path $PSScriptRoot '../../tests/mkdir-recursive.test.ts'
$tests = [System.IO.Path]::GetFullPath($tests)
if (-not (Test-Path -LiteralPath $tests)) { throw "テストが見つかりません: $tests" }

$results = [ordered]@{}
foreach ($rt in 'node', 'deno', 'bun') {
	Write-Host "=== $rt $(& $rt --version | Select-Object -First 1)"
	switch ($rt) {
		'node' { & node --test $tests | Out-Host }
		'deno' { & deno test -A $tests | Out-Host }
		'bun'  { & bun test $tests | Out-Host }
	}
	$results[$rt] = if ($LASTEXITCODE -eq 0) { '成功' } else { '失敗' }
}
Write-Host ''
Write-Host '=== まとめ'
foreach ($k in $results.Keys) { Write-Host ("{0,-5} {1}" -f $k, $results[$k]) }
