$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$OutputEncoding = [Text.Encoding]::UTF8

# 通过已经运行的 Java 后端导入，不需要再次读取 MySQL 密码。
$statusFile = Join-Path $PSScriptRoot '.runtime/status.json'
if (-not (Test-Path -LiteralPath $statusFile)) { throw '请先运行 .\start.ps1 启动网页。' }
$state = Get-Content -LiteralPath $statusFile -Raw -Encoding UTF8 | ConvertFrom-Json
if ($state.status -ne 'running' -or $state.database -ne 'student_web_demo_20261010') {
    throw '本项目尚未运行，请先运行 .\start.ps1。'
}

$manifest = Join-Path $PSScriptRoot '.runtime/school-import-source.json'
Write-Host '正在核对课表与学生名单...'
& python -X utf8 (Join-Path $PSScriptRoot 'tools/prepare-school-data.py') $manifest
if ($LASTEXITCODE -ne 0) { throw '课表与名单核对失败，未开始导入。' }
& node (Join-Path $PSScriptRoot 'tools/import-school-data.cjs') $manifest
if ($LASTEXITCODE -ne 0) { throw '导入未全部完成，详见 .runtime/school-import-report.json；重新运行会跳过已导入记录。' }
Write-Host '导入和核验通过，请刷新网页查看。'
