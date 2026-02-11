@echo off
chcp 65001 >nul
title Multi AI Workspace

echo ============================================
echo   Multi AI Workspace
echo ============================================
echo.

set "SCRIPT_DIR=%~dp0"
set "SRC_DIR=%SCRIPT_DIR%src"
set "PORT=8080"

:: src 폴더 확인
if not exist "%SRC_DIR%\index.html" (
    echo [오류] index.html을 찾을 수 없습니다.
    echo 경로: %SRC_DIR%\index.html
    pause
    exit /b 1
)

:: Python으로 로컬 서버 시도
where python >nul 2>&1
if %errorlevel%==0 (
    echo [로컬 서버] Python HTTP 서버를 시작합니다 (포트: %PORT%)
    echo.
    echo  접속 주소: http://localhost:%PORT%
    echo  종료하려면 Ctrl+C를 누르세요.
    echo.
    start "" "http://localhost:%PORT%"
    python -m http.server %PORT% --directory "%SRC_DIR%"
    goto :end
)

:: Python3으로 시도
where python3 >nul 2>&1
if %errorlevel%==0 (
    echo [로컬 서버] Python3 HTTP 서버를 시작합니다 (포트: %PORT%)
    echo.
    echo  접속 주소: http://localhost:%PORT%
    echo  종료하려면 Ctrl+C를 누르세요.
    echo.
    start "" "http://localhost:%PORT%"
    python3 -m http.server %PORT% --directory "%SRC_DIR%"
    goto :end
)

:: Node.js npx http-server 시도
where npx >nul 2>&1
if %errorlevel%==0 (
    echo [로컬 서버] Node.js HTTP 서버를 시작합니다 (포트: %PORT%)
    echo.
    echo  접속 주소: http://localhost:%PORT%
    echo  종료하려면 Ctrl+C를 누르세요.
    echo.
    start "" "http://localhost:%PORT%"
    npx -y http-server "%SRC_DIR%" -p %PORT% -c-1 --cors
    goto :end
)

:: 아무 서버도 없으면 PowerShell HttpListener 사용
echo [로컬 서버] PowerShell HTTP 서버를 시작합니다 (포트: %PORT%)
echo.
echo  접속 주소: http://localhost:%PORT%
echo  종료하려면 Ctrl+C를 누르세요.
echo.
start "" "http://localhost:%PORT%"
powershell -ExecutionPolicy Bypass -Command ^
  "$listener = New-Object System.Net.HttpListener; $listener.Prefixes.Add('http://localhost:%PORT%/'); $listener.Start(); Write-Host '[서버 실행 중] http://localhost:%PORT%'; while ($listener.IsListening) { $context = $listener.GetContext(); $request = $context.Request; $response = $context.Response; $localPath = $request.Url.LocalPath; if ($localPath -eq '/') { $localPath = '/index.html' }; $filePath = Join-Path '%SRC_DIR%' ($localPath -replace '/', '\'); if (Test-Path $filePath -PathType Leaf) { $bytes = [System.IO.File]::ReadAllBytes($filePath); $ext = [System.IO.Path]::GetExtension($filePath).ToLower(); $mime = @{'.html'='text/html;charset=utf-8';'.css'='text/css';'.js'='application/javascript';'.json'='application/json';'.png'='image/png';'.jpg'='image/jpeg';'.svg'='image/svg+xml';'.ico'='image/x-icon'}; if ($mime.ContainsKey($ext)) { $response.ContentType = $mime[$ext] } else { $response.ContentType = 'application/octet-stream' }; $response.ContentLength64 = $bytes.Length; $response.OutputStream.Write($bytes, 0, $bytes.Length) } else { $response.StatusCode = 404; $msg = [System.Text.Encoding]::UTF8.GetBytes('Not Found'); $response.OutputStream.Write($msg, 0, $msg.Length) }; $response.OutputStream.Close() }"

:end
