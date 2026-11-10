# Rebuild data/music.json from the actual audio files in assets/music.
# Usage: pwsh -File tools/gen-music-json.ps1
# Assumes filenames follow: "Title - (note) - Artist.ext" or "Title - Artist.ext".
$dir = Join-Path $PSScriptRoot '..\assets\music'
$out = Join-Path $PSScriptRoot '..\data\music.json'

$files = @(Get-ChildItem $dir -File | Where-Object { $_.Extension -in '.mp3', '.flac' } | Sort-Object Name)
$items = foreach ($f in $files) {
    $parts = $f.BaseName -split ' - '
    $title  = $parts[0]
    $artist = $parts[$parts.Count - 1]
    $fj = $f.Name.Replace('\', '\\').Replace('"', '\"')
    $tj = $title.Replace('\', '\\').Replace('"', '\"')
    $aj = $artist.Replace('\', '\\').Replace('"', '\"')
    "    {`"file`":  `"$fj`", `"title`":  `"$tj`", `"artist`":  `"$aj`"}"
}
$json = "[" + [Environment]::NewLine + ($items -join ("," + [Environment]::NewLine)) + [Environment]::NewLine + "]" + [Environment]::NewLine
[System.IO.File]::WriteAllText($out, $json, (New-Object System.Text.UTF8Encoding($false)))
Write-Host ("Wrote {0} songs to {1}" -f $files.Count, $out)
