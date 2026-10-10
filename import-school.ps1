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
$backend = if ($state.backendPid) { Get-CimInstance Win32_Process -Filter ('ProcessId = ' + [int]$state.backendPid) }
if (-not $backend -or -not $backend.CommandLine.Contains($PSScriptRoot)) {
    throw '记录中的后端进程已停止或不属于本项目，请先运行 .\start.ps1；未读取或写入导入资料。'
}
try {
    $ready = Invoke-WebRequest -Uri 'http://127.0.0.1:8088/api/health/ready' -NoProxy -TimeoutSec 3
    if ($ready.StatusCode -ne 200) { throw '后端尚未就绪' }
} catch {
    throw '本项目后端接口尚未就绪，请先运行 .\start.ps1；未读取或写入导入资料。'
}

$manifest = Join-Path $PSScriptRoot '.runtime/school-import-source.json'
Write-Host '正在核对课表与学生名单...'
& python -X utf8 (Join-Path $PSScriptRoot 'tools/prepare-school-data.py') $manifest
if ($LASTEXITCODE -ne 0) { throw '课表与名单核对失败，未开始导入。' }
& node (Join-Path $PSScriptRoot 'tools/import-school-data.cjs') $manifest
if ($LASTEXITCODE -ne 0) { throw '导入失败：输入与身份预检错误见上方终端信息，旧报告保持不变；实际写入开始后的失败见 .runtime/school-import-report.json。修正问题后重试会跳过已有记录。' }
Write-Host '导入和核验通过，请刷新网页查看。'
