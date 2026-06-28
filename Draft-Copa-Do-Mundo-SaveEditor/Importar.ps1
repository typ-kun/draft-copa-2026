# Importar.ps1 - Usa FifaLibrary19.dll (engine do RDBM) para:
# 1) Fazer backup _1_ do Squad original
# 2) Extrair DB08 do container FBCHUNKS
# 3) Carregar DB via FifaLibrary (LoadDb)
# 4) Importar TXTs (ConvertFromDataTable)
# 5) Salvar DB (SaveDb calcula CRC)
# 6) Reempacotar no container FBCHUNKS
# 7) Salvar como _1_ (backup) e modificado no lugar

param(
    [Parameter(Mandatory=$true)][string]$SquadPath,
    [Parameter(Mandatory=$true)][string]$TxtFolder,
    [string]$OutputPath = ""
)

Add-Type -Path (Join-Path $PSScriptRoot "bin\Release\net8.0-windows\FifaLibrary19.dll")

# 1. Backup
$backupPath = "${SquadPath}_1_"
if (-not (Test-Path $backupPath)) {
    Copy-Item $SquadPath $backupPath
    Write-Host "Backup: $backupPath"
}

# 2. Extrair DB08
$bytes = [System.IO.File]::ReadAllBytes($SquadPath)
$dbMagic = [byte[]]@(0x44,0x42,0x00,0x08,0x00,0x00,0x00,0x00)
$bnryMagic = [byte[]]@(0x42,0x4E,0x52,0x59)
$dbStart = -1
for ($i = 0; $i -le $bytes.Length - 8; $i++) {
    if ($bytes[$i] -eq 0x44 -and $bytes[$i+1] -eq 0x42 -and $bytes[$i+2] -eq 0x00 -and $bytes[$i+3] -eq 0x08) {
        $dbStart = $i; break
    }
}
if ($dbStart -lt 0) { throw "DB08 nao encontrado" }
$bnryStart = $bytes.Length
for ($i = $dbStart + 8; $i -lt $bytes.Length - 4; $i++) {
    if ($bytes[$i] -eq 0x42 -and $bytes[$i+1] -eq 0x4E -and $bytes[$i+2] -eq 0x52 -and $bytes[$i+3] -eq 0x59) {
        $bnryStart = $i; break
    }
}
$headerBytes = $bytes[0..($dbStart-1)]
$dbBytes = $bytes[$dbStart..($bnryStart-1)]
$trailerBytes = $bytes[$bnryStart..($bytes.Length-1)]

# 3. Carregar DB
$tmpDb = [System.IO.Path]::GetTempFileName()
[System.IO.File]::WriteAllBytes($tmpDb, $dbBytes)
$db = New-Object FifaLibrary.DbFile
$db.DescriptorDataSet = New-Object System.Data.DataSet
$db.DescriptorDataSet.ReadXml((Join-Path $PSScriptRoot "bin\Release\net8.0-windows\fifa_ng_db-meta.xml"))
if (-not $db.LoadDb($tmpDb)) { throw "LoadDb falhou" }
Write-Host "$($db.NTables) tabelas carregadas"

# 4. Importar TXTs
$txtFiles = Get-ChildItem $TxtFolder -Filter "*.txt"
foreach ($txtFile in $txtFiles) {
    $tableName = $txtFile.BaseName
    $table = $db.Table | Where-Object { $_.TableDescriptor.TableName -eq $tableName -or $_.TableDescriptor.TableShortName -eq $tableName }
    if (-not $table) { Write-Host "Tabela $tableName nao encontrada, pulando"; continue }

    $lines = [System.IO.File]::ReadAllLines($txtFile.FullName, [System.Text.Encoding]::Unicode)
    if ($lines.Length -lt 2) { continue }
    $dt = New-Object System.Data.DataTable
    $headers = $lines[0].TrimStart("﻿").Split("`t")
    foreach ($h in $headers) { $dt.Columns.Add($h.Trim(), [string]) | Out-Null }
    for ($i = 1; $i -lt $lines.Length; $i++) {
        if ([string]::IsNullOrWhiteSpace($lines[$i])) { continue }
        $row = $dt.NewRow()
        $cells = $lines[$i].Split("`t")
        for ($c = 0; $c -lt $dt.Columns.Count -and $c -lt $cells.Length; $c++) {
            $row[$c] = $cells[$c].Trim()
        }
        $dt.Rows.Add($row)
    }
    $table.ConvertFromDataTable($dt)
    Write-Host "  $($tableName): $($dt.Rows.Count) registros"
}

# 5. Salvar DB
$tmpDbOut = [System.IO.Path]::GetTempFileName()
if (-not $db.SaveDb($tmpDbOut)) { throw "SaveDb falhou" }
$newDbBytes = [System.IO.File]::ReadAllBytes($tmpDbOut)
Write-Host "DB salvo: $($newDbBytes.Length) bytes"

# 6. Reempacotar
$result = New-Object byte[] ($headerBytes.Length + $newDbBytes.Length + $trailerBytes.Length)
[System.Buffer]::BlockCopy($headerBytes, 0, $result, 0, $headerBytes.Length)
[System.Buffer]::BlockCopy($newDbBytes, 0, $result, $headerBytes.Length, $newDbBytes.Length)
if ($trailerBytes.Length -gt 0) {
    [System.Buffer]::BlockCopy($trailerBytes, 0, $result, $headerBytes.Length + $newDbBytes.Length, $trailerBytes.Length)
}

# Atualizar file_size (offset 14) e data_size (offset 1174)
$fileSize = [uint32](48 + 4 + $newDbBytes.Length + $trailerBytes.Length)
$dataSize = [uint32]($newDbBytes.Length + $trailerBytes.Length)
[System.Buffer]::BlockCopy([System.BitConverter]::GetBytes($fileSize), 0, $result, 14, 4)
[System.Buffer]::BlockCopy([System.BitConverter]::GetBytes($dataSize), 0, $result, 1174, 4)

# 7. Salvar
if ($OutputPath -eq "") {
    $fc26 = [System.Environment]::GetFolderPath("LocalApplicationData")
    $settingsDir = Join-Path $fc26 "EA SPORTS FC 26\settings"
    New-Item -ItemType Directory -Force -Path $settingsDir | Out-Null
    $ts = Get-Date -Format "yyyyMMddHHmmss"
    $suffix = -join ((65..90) + (97..122) | Get-Random -Count 3 | ForEach-Object { [char]$_ })
    $OutputPath = Join-Path $settingsDir "Squads$ts$suffix"
}
[System.IO.File]::WriteAllBytes($OutputPath, $result)
Write-Host "Squad salvo: $OutputPath ($($result.Length) bytes)"

Remove-Item $tmpDb -ErrorAction SilentlyContinue
Remove-Item $tmpDbOut -ErrorAction SilentlyContinue
