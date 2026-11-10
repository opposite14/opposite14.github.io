<#
.SYNOPSIS
    批量将 assets/music 下的 FLAC 转成 MP3，用于部署前压缩背景音乐体积。

.DESCRIPTION
    依赖 ffmpeg。默认 192kbps，转码成功后删除原 FLAC 以省空间；
    加 -KeepFlac 可保留原文件。已存在同名 .mp3 的文件会自动跳过。
    若 PATH 未刷新导致找不到 ffmpeg，可用 -FfmpegPath 指定 ffmpeg.exe 绝对路径。

.EXAMPLE
    pwsh -File tools/convert-flac-to-mp3.ps1
.EXAMPLE
    pwsh -File tools/convert-flac-to-mp3.ps1 -Bitrate 128k -KeepFlac
.EXAMPLE
    pwsh -File tools/convert-flac-to-mp3.ps1 -FfmpegPath "C:\path\to\ffmpeg.exe"
#>
param(
    [string]$MusicDir  = (Join-Path $PSScriptRoot '..\assets\music'),
    [string]$Bitrate   = '192k',
    [string]$FfmpegPath = '',
    [switch]$KeepFlac
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# 1) 定位 ffmpeg
$ffmpegExe = $null
if ($FfmpegPath -and (Test-Path -LiteralPath $FfmpegPath)) {
    $ffmpegExe = (Resolve-Path -LiteralPath $FfmpegPath).Path
} else {
    $cmd = Get-Command ffmpeg -ErrorAction SilentlyContinue
    if ($cmd) { $ffmpegExe = $cmd.Source }
}
if (-not $ffmpegExe) {
    Write-Host '❌ 未找到 ffmpeg，请先安装：' -ForegroundColor Red
    Write-Host '   方式一（推荐）：winget install Gyan.FFmpeg'
    Write-Host '   方式二：从 https://ffmpeg.org/download.html 下载，解压后把 bin 目录加入 PATH'
    Write-Host '   若已安装但本脚本找不到，可用 -FfmpegPath 指定 ffmpeg.exe 绝对路径。'
    exit 1
}
Write-Host "✅ 使用 ffmpeg：$ffmpegExe" -ForegroundColor Green
Write-Host ''

# 2) 扫描 FLAC
$flacs = @(Get-ChildItem -Path $MusicDir -Filter '*.flac' -File)
if ($flacs.Count -eq 0) {
    Write-Host "在 $MusicDir 下没有找到 .flac 文件，无需转换。"
    exit 0
}
$keepNote = if ($KeepFlac) { '保留原 FLAC' } else { '转完删除原 FLAC' }
Write-Host "发现 $($flacs.Count) 个 FLAC 文件，码率 $Bitrate，$keepNote。"
Write-Host ''

# 3) 逐个转换
$ok = 0; $fail = 0
foreach ($f in $flacs) {
    $mp3 = [System.IO.Path]::ChangeExtension($f.FullName, '.mp3')
    if (Test-Path -LiteralPath $mp3) {
        Write-Host "跳过（已存在同名 MP3）：$($f.Name)" -ForegroundColor DarkGray
        continue
    }
    Write-Host "转换：$($f.Name)"
    & $ffmpegExe -hide_banner -loglevel error -y -i $f.FullName -codec:a libmp3lame -b:a $Bitrate $mp3
    if ($LASTEXITCODE -eq 0 -and (Test-Path -LiteralPath $mp3)) {
        $ok++
        if ($KeepFlac) {
            Write-Host '  ✅ 完成' -ForegroundColor Green
        } else {
            Remove-Item -LiteralPath $f.FullName -Force
            Write-Host '  ✅ 完成，已删除 FLAC' -ForegroundColor Green
        }
    } else {
        $fail++
        Write-Host "  ❌ 失败：$($f.Name)" -ForegroundColor Red
    }
}

# 4) 汇总
$totalMB = (Get-ChildItem -Path $MusicDir -File | Measure-Object Length -Sum).Sum / 1MB
Write-Host ''
Write-Host "===== 转换完成：成功 $ok 个，失败 $fail 个 ====="
Write-Host ("music 目录当前总大小：{0:N1} MB" -f $totalMB)
