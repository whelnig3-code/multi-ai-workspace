@echo off
title Multi AI Workspace
echo ============================================
echo   Multi AI Workspace 실행 중...
echo ============================================
echo.

:: 현재 bat 파일 위치 기준으로 index.html 경로 계산
set "SCRIPT_DIR=%~dp0"
set "HTML_PATH=%SCRIPT_DIR%src\index.html"

:: 파일 존재 확인
if not exist "%HTML_PATH%" (
    echo [오류] index.html을 찾을 수 없습니다.
    echo 경로: %HTML_PATH%
    pause
    exit /b 1
)

:: 브라우저로 열기
echo 브라우저에서 열기: %HTML_PATH%
echo.
start "" "%HTML_PATH%"

echo 브라우저가 열렸습니다.
echo 이 창은 3초 후 자동으로 닫힙니다.
timeout /t 3 /nobreak >nul
