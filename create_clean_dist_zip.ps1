
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$www = Get-Item -LiteralPath 'c:\\Users\\Jose\\OneDrive\\GITHUB\\BC3Viewer-App\\www'
$zipPath = 'c:\\Users\\Jose\\OneDrive\\GITHUB\\BC3Viewer-App\\dist.zip'

if (Test-Path -LiteralPath $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
}

$zipArchive = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)

$allFiles = Get-ChildItem -LiteralPath $www.FullName -Recurse -File

foreach ($f in $allFiles) {
    # Obtener la ruta relativa exacta respecto a www
    $rel = $f.FullName.Substring($www.FullName.Length).TrimStart('\', '/').Replace('\', '/')
    
    $entry = $zipArchive.CreateEntry($rel, [System.IO.Compression.CompressionLevel]::Optimal)
    $entryStream = $entry.Open()
    $fileStream = [System.IO.File]::OpenRead($f.FullName)
    $fileStream.CopyTo($entryStream)
    $fileStream.Dispose()
    $entryStream.Dispose()
}

$zipArchive.Dispose()
Write-Host "dist.zip generado perfectamente!"
