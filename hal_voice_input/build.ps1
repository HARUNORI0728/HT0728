# HAL Voice Input - PyInstaller ビルドスクリプト
# 使い方: .\build.ps1

$ErrorActionPreference = "Stop"

Write-Host "=== HAL Voice Input Build ===" -ForegroundColor Cyan

# 既存ビルド成果物をクリア
if (Test-Path "dist\HALVoiceInput") {
    Write-Host "既存の dist\HALVoiceInput を削除します..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "dist\HALVoiceInput"
}
if (Test-Path "build\HALVoiceInput") {
    Remove-Item -Recurse -Force "build\HALVoiceInput"
}

Write-Host "PyInstaller でビルド中..." -ForegroundColor Cyan

pyinstaller `
    --noconsole `
    --onedir `
    --name HALVoiceInput `
    --hidden-import="pynput.keyboard._win32" `
    --hidden-import="pynput.mouse._win32" `
    --hidden-import="sounddevice" `
    --hidden-import="numpy" `
    --collect-all faster_whisper `
    --collect-all ctranslate2 `
    --collect-binaries sounddevice `
    main.py

if ($LASTEXITCODE -ne 0) {
    Write-Host "ビルドに失敗しました。" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== ビルド完了 ===" -ForegroundColor Green
Write-Host "実行ファイル: dist\HALVoiceInput\HALVoiceInput.exe" -ForegroundColor Green
Write-Host ""
Write-Host "注意: 初回起動時はモデルダウンロードのためネット接続が必要です。" -ForegroundColor Yellow
