$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$Host.UI.RawUI.WindowTitle = '学生管理 Web 项目'
[Console]::InputEncoding = [Text.Encoding]::UTF8
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$OutputEncoding = [Text.Encoding]::UTF8

$backendDirectory = Join-Path $PSScriptRoot 'studentms-backend'
$frontendDirectory = Join-Path $PSScriptRoot 'studentms-frontend'
$runtimeDirectory = Join-Path $PSScriptRoot '.runtime'
$backendJar = Join-Path $backendDirectory 'target/studentms-backend-0.0.1-SNAPSHOT.jar'
$viteEntry = Join-Path $frontendDirectory 'node_modules/vite/bin/vite.js'
$mavenCommand = Join-Path $PSScriptRoot '.tools/apache-maven-3.9.15/bin/mvn.cmd'
$mavenSettings = Join-Path $PSScriptRoot '.tools/maven-settings.xml'
$website = 'http://127.0.0.1:5178'
$api = 'http://127.0.0.1:8088'
$statusFile = Join-Path $runtimeDirectory 'status.json'
New-Item -ItemType Directory -Path $runtimeDirectory -Force | Out-Null

# 已经运行时复用本项目进程，避免同时启动两份后端。
if (Test-Path -LiteralPath $statusFile) {
    $previousState = Get-Content -LiteralPath $statusFile -Raw -Encoding UTF8 | ConvertFrom-Json
    $previousBackend = $null
    $previousFrontend = $null
    if ($previousState.status -eq 'running' -and $previousState.backendPid -and $previousState.frontendPid) {
        $previousBackend = Get-CimInstance Win32_Process -Filter ('ProcessId = ' + [int]$previousState.backendPid)
        $previousFrontend = Get-CimInstance Win32_Process -Filter ('ProcessId = ' + [int]$previousState.frontendPid)
    }
    if ($previousBackend -and $previousFrontend -and
        $previousBackend.CommandLine.Contains($PSScriptRoot) -and
        $previousFrontend.CommandLine.Contains($PSScriptRoot)) {
        Write-Host ('本项目已经运行：' + $website)
        Start-Process $website
        return
    }
}

# 修改源码后自动重新构建；依赖已保存在当前项目中。
$backendInputs = @(Get-ChildItem -LiteralPath (Join-Path $backendDirectory 'src/main') -Recurse -File)
$backendInputs += Get-Item -LiteralPath (Join-Path $backendDirectory 'pom.xml')
if (-not (Test-Path -LiteralPath $backendJar) -or
    ($backendInputs | Where-Object { $_.LastWriteTimeUtc -gt (Get-Item -LiteralPath $backendJar).LastWriteTimeUtc })) {
    Write-Host '正在构建 Java 后端...'
    $previousJavaHome = $env:JAVA_HOME
    Push-Location -LiteralPath $backendDirectory
    try {
        $env:JAVA_HOME = Split-Path -Parent (Split-Path -Parent (Get-Command javac).Source)
        & $mavenCommand -s $mavenSettings -B '-DskipTests' package
        if ($LASTEXITCODE -ne 0) { throw 'Java 后端构建失败。' }
    } finally {
        $env:JAVA_HOME = $previousJavaHome
        Pop-Location
    }
}
$frontendIndex = Join-Path $frontendDirectory 'dist/index.html'
$frontendInputs = @(Get-ChildItem -LiteralPath (Join-Path $frontendDirectory 'src') -Recurse -File)
$frontendInputs += Get-Item -LiteralPath (Join-Path $frontendDirectory 'package.json'),(Join-Path $frontendDirectory '.env.demo')
if (-not (Test-Path -LiteralPath $frontendIndex) -or
    ($frontendInputs | Where-Object { $_.LastWriteTimeUtc -gt (Get-Item -LiteralPath $frontendIndex).LastWriteTimeUtc })) {
    Write-Host '正在构建网页界面...'
    Push-Location -LiteralPath $frontendDirectory
    try {
        & npm run build -- --mode demo
        if ($LASTEXITCODE -ne 0) { throw '网页构建失败。' }
    } finally { Pop-Location }
}

Write-Host '后端运行在本机 8088 端口，网页运行在本机 5178 端口。'
Write-Host '使用独立数据库 student_web_demo_20261010。'
Write-Host '请输入 MySQL root 密码；这不是网页登录密码。'
$databasePassword = Read-Host 'MySQL 密码' -AsSecureString
$previousUser = $env:DEMO_DB_USER
$previousPassword = $env:DEMO_DB_PASSWORD
$previousJwtSecret = $env:DEMO_JWT_SECRET
$passwordPointer = [IntPtr]::Zero
$backendProcess = $null
$frontendProcess = $null
try {
    try {
        $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($databasePassword)
        $env:DEMO_DB_USER = 'root'
        $env:DEMO_DB_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
        $env:DEMO_JWT_SECRET = [Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N')

        # 新版增加关系与约束；先备份已有练习库，再允许后端更新表结构。
        $mysqlService = Get-CimInstance Win32_Service | Where-Object { $_.Name -match '^MySQL' } | Select-Object -First 1
        if (-not $mysqlService -or $mysqlService.PathName -notmatch '^"([^"]+mysqld\.exe)"') {
            throw '未定位 MySQL 服务程序，无法执行升级前备份。请先核对 MySQL 安装位置。'
        }
        $mysqlBin = Split-Path -Parent $Matches[1]
        $mysqlClient = Join-Path $mysqlBin 'mysql.exe'
        $mysqlDump = Join-Path $mysqlBin 'mysqldump.exe'
        if (-not (Test-Path -LiteralPath $mysqlClient) -or -not (Test-Path -LiteralPath $mysqlDump)) {
            throw 'MySQL 备份工具缺失，请先核对安装目录。'
        }
        $previousMysqlPassword = $env:MYSQL_PWD
        try {
            $env:MYSQL_PWD = $env:DEMO_DB_PASSWORD
            $existsQuery = "--execute=SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name='student_web_demo_20261010'"
            $databaseExists = & $mysqlClient '--host=127.0.0.1' '--port=3306' '--user=root' '--batch' '--skip-column-names' $existsQuery
            if ($LASTEXITCODE -ne 0) { throw '数据库连接检查失败，请核对密码。' }
            if ([int]$databaseExists -gt 0) {
                $backupFile = Join-Path $runtimeDirectory ('database-before-upgrade-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.sql')
                & $mysqlDump '--host=127.0.0.1' '--port=3306' '--user=root' '--single-transaction' '--skip-lock-tables' '--set-gtid-purged=OFF' ('--result-file=' + $backupFile) '--databases' 'student_web_demo_20261010'
                if ($LASTEXITCODE -ne 0) { throw '数据库备份失败，已停止启动，未执行新版表结构更新。' }
                Write-Host ('升级前数据库备份：' + $backupFile)
                $tableQuery = "--execute=SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='student_web_demo_20261010' AND table_name='enrollments'"
                $tableExists = & $mysqlClient '--host=127.0.0.1' '--port=3306' '--user=root' '--batch' '--skip-column-names' $tableQuery
                if ($LASTEXITCODE -ne 0) { throw '数据库表检查失败，已停止启动。' }
                if ([int]$tableExists -gt 0) {
                    $duplicateQuery = '--execute=SELECT COUNT(*) FROM (SELECT student_id,course_id FROM enrollments GROUP BY student_id,course_id HAVING COUNT(*)>1) AS duplicate_pairs'
                    $duplicateCount = & $mysqlClient '--host=127.0.0.1' '--port=3306' '--user=root' '--database=student_web_demo_20261010' '--batch' '--skip-column-names' $duplicateQuery
                    if ($LASTEXITCODE -ne 0) { throw '选课完整性检查失败，已停止启动。' }
                    if ([int]$duplicateCount -gt 0) { throw '现有库存在重复选课，已保存备份；请核对记录后再升级，系统不会自动删除历史记录。' }
                }
            }
        } finally {
            $env:MYSQL_PWD = $previousMysqlPassword
        }

        # 同时复核保留的中文控制台项目，测试只处理本次临时记录。
        $consoleProject = Join-Path (Split-Path -Parent $PSScriptRoot) 'Student-Management-System'
        $consoleCheck = Join-Path $consoleProject 'out/DatabaseSmokeTest.class'
        if (Test-Path -LiteralPath $consoleCheck) {
            $consoleClasspath = (Join-Path $consoleProject 'out') + ';' + (Join-Path $consoleProject 'lib/*')
            $consoleResult = & java '-Dfile.encoding=UTF-8' '-Dstdout.encoding=UTF-8' '-Dstderr.encoding=UTF-8' -cp $consoleClasspath DatabaseSmokeTest 2>&1
            $consoleExit = $LASTEXITCODE
            $consoleResult | Set-Content -LiteralPath (Join-Path $consoleProject '.runtime/database-check.log') -Encoding UTF8
            if ($consoleExit -ne 0) { throw '中文控制台项目检查失败，请查看它的运行日志。' }
            Write-Host '中文控制台项目的数据库检查通过。'
        }

        $backendStart = @{
            FilePath = (Get-Command java).Source
            ArgumentList = @('-Dfile.encoding=UTF-8', '-Dstdout.encoding=UTF-8', '-Dstderr.encoding=UTF-8',
                '-jar', ('"' + $backendJar + '"'), '--spring.profiles.active=mysql,localdemo')
            WorkingDirectory = $backendDirectory
            WindowStyle = 'Hidden'
            PassThru = $true
            RedirectStandardOutput = (Join-Path $runtimeDirectory 'backend.stdout.log')
            RedirectStandardError = (Join-Path $runtimeDirectory 'backend.stderr.log')
        }
        $backendProcess = Start-Process @backendStart
    } finally {
        $env:DEMO_DB_USER = $previousUser
        $env:DEMO_DB_PASSWORD = $previousPassword
        $env:DEMO_JWT_SECRET = $previousJwtSecret
        if ($passwordPointer -ne [IntPtr]::Zero) {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
        }
        $databasePassword.Dispose()
    }

    Write-Host '等待 Java 后端启动...'
    $backendReady = $false
    for ($attempt = 0; $attempt -lt 90; $attempt++) {
        if ($backendProcess.HasExited) { throw '后端启动失败，请查看 .runtime/backend.stderr.log。' }
        try {
            $response = Invoke-WebRequest -Uri ($api + '/v3/api-docs') -NoProxy -TimeoutSec 2 -SkipHttpErrorCheck
            if ($response.StatusCode -eq 200) { $backendReady = $true; break }
        } catch { }
        Start-Sleep -Seconds 1
    }
    if (-not $backendReady) { throw '后端启动超时，请查看 .runtime/backend.stdout.log。' }

    # localdemo 后端启动时初始化专用账号，公开注册接口不能创建管理员。
    $demoAccount = @{ username = 'demo_admin'; password = 'Demo12345!' } | ConvertTo-Json -Compress
    $loginRequest = @{
        Uri = ($api + '/api/auth/login')
        Method = 'Post'
        ContentType = 'application/json'
        Body = $demoAccount
        NoProxy = $true
    }
    $login = Invoke-RestMethod @loginRequest
    if (-not $login.token -or $login.roleName -ne 'ROLE_ADMIN') { throw '网页登录检查失败。' }

    $frontendStart = @{
        FilePath = (Get-Command node).Source
        ArgumentList = @(('"' + $viteEntry + '"'), 'preview', '--host', '127.0.0.1', '--port', '5178', '--strictPort')
        WorkingDirectory = $frontendDirectory
        WindowStyle = 'Hidden'
        PassThru = $true
        RedirectStandardOutput = (Join-Path $runtimeDirectory 'frontend.stdout.log')
        RedirectStandardError = (Join-Path $runtimeDirectory 'frontend.stderr.log')
    }
    $frontendProcess = Start-Process @frontendStart
    $frontendReady = $false
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        if ($frontendProcess.HasExited) { throw '网页服务启动失败，请查看 .runtime/frontend.stderr.log。' }
        try {
            $page = Invoke-WebRequest -Uri $website -NoProxy -TimeoutSec 2
            if ($page.StatusCode -eq 200) { $frontendReady = $true; break }
        } catch { }
        Start-Sleep -Seconds 1
    }
    if (-not $frontendReady) { throw '网页启动超时。' }

    @{ status = 'running'; website = $website; database = 'student_web_demo_20261010';
       backendPid = $backendProcess.Id; frontendPid = $frontendProcess.Id;
       startedAt = (Get-Date -Format o); loginCheck = 'PASS' } | ConvertTo-Json |
        Set-Content -LiteralPath $statusFile -Encoding UTF8
    Write-Host ('网页已启动：' + $website) -ForegroundColor Green
    Write-Host '网页账号：demo_admin    网页密码：Demo12345!'
    Write-Host '保持此终端打开。按 Ctrl+C 停止前后端。'
    Start-Process $website
    while (-not $backendProcess.HasExited -and -not $frontendProcess.HasExited) { Start-Sleep -Seconds 2 }
} finally {
    foreach ($process in @($frontendProcess, $backendProcess)) {
        if ($process -and -not $process.HasExited) { Stop-Process -Id $process.Id }
    }
    if (Test-Path -LiteralPath $statusFile) {
        @{ status = 'stopped'; stoppedAt = (Get-Date -Format o) } | ConvertTo-Json |
            Set-Content -LiteralPath $statusFile -Encoding UTF8
    }
}
