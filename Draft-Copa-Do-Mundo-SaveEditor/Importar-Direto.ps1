# Importar-Direto.ps1 - Edicao direta de bytes no DB (sem FifaLibrary SaveDb)
# Objetivo: manter tamanho fiel, s alterar os bytes necessarios
param(
    [Parameter(Mandatory=$true)][string]$SquadPath,
    [Parameter(Mandatory=$true)][string]$TxtFolder
)

function Find-Bytes($data, $pattern, $start = 0) {
    for ($i = $start; $i -le $data.Length - $pattern.Length; $i++) {
        $ok = $true
        for ($j = 0; $j -lt $pattern.Length; $j++) {
            if ($data[$i + $j] -ne $pattern[$j]) { $ok = $false; break }
        }
        if ($ok) { return $i }
    }
    return -1
}

function Read-BitsLE($data, $byteStart, $startBit, $numBits) {
    $val = [long]0
    for ($i = 0; $i -lt $numBits; $i++) {
        $bp = $startBit + $i
        $bi = [math]::Floor($bp / 8)
        $bj = $bp % 8
        if ($byteStart + $bi -lt $data.Length) {
            if (((($data[$byteStart + $bi] -shr $bj) -band 1) -eq 1) {
                $val = $val -bor (1L -shl $i)
            }
        }
    }
    return $val
}

function Write-BitsLE($data, $byteStart, $startBit, $numBits, $value) {
    for ($i = 0; $i -lt $numBits; $i++) {
        $bp = $startBit + $i
        $bi = [math]::Floor($bp / 8)
        $bj = $bp % 8
        if ($byteStart + $bi -ge $data.Length) { continue }
        $set = ((($value -shr $i) -band 1) -eq 1)
        if ($set) {
            $data[$byteStart + $bi] = ($data[$byteStart + $bi] -bor ([byte](1 -shl $bj)))
        } else {
            $data[$byteStart + $bi] = ($data[$byteStart + $bi] -bnot ([byte](1 -shl $bj)))
        }
    }
}

function Compute-Crc($data, $offset, $len) {
    $crc = -1
    for ($i = 0; $i -lt $len; $i++) {
        $crc = $crc -bxor ([int]$data[$offset + $i] -shl 24)
        for ($j = 0; $j -lt 8; $j++) {
            if ($crc -lt 0) { $crc = ($crc * 2) -bxor 79764919 }
            else { $crc = $crc * 2 }
        }
    }
    return $crc
}

# 1. Backup _1_
$backup = "${SquadPath}_1_"
if (-not (Test-Path $backup)) {
    Copy-Item $SquadPath $backup
    Write-Host "Backup: $backup"
}

# 2. Ler arquivo
$bytes = [System.IO.File]::ReadAllBytes($SquadPath)
$dbStart = Find-Bytes $bytes @(0x44,0x42,0x00,0x08,0x00,0x00,0x00,0x00)
if ($dbStart -lt 0) { throw "DB08 nao encontrado" }
$header = $bytes[0..($dbStart-1)]
$db = $bytes[$dbStart..($bytes.Length-1)].Clone()

# Encontrar BNRY/EOF do DB
$bnry = Find-Bytes $db @(0x42,0x4E,0x52,0x59) ($dbStart+8 - $dbStart)
$trailerStart = if ($bnry -ge 0) { $bnry + $dbStart } else { $bytes.Length }
$trailer = $bytes[$trailerStart..($bytes.Length-1)]

# 3. Localizar tabelas
$tableCount = [BitConverter]::ToInt32($db, 16)
$tablesStart = 24 + $tableCount * 8 + 4
$tableOffsets = @{}
$nameToIdx = @{}
$cursor = 24
for ($i = 0; $i -lt $tableCount; $i++) {
    $sn = [System.Text.Encoding]::ASCII.GetString($db, $cursor, 4)
    $off = [BitConverter]::ToInt32($db, $cursor + 4)
    $absOff = $tablesStart + $off
    $tableOffsets[$i] = $absOff
    $nameToIdx[$sn] = $i
    $cursor += 8
}

# 4. Importar — teamplayerlinks
$tplIdx = $nameToIdx["RrqT"]
if ($tplIdx -ne $null) {
    $tplOff = $tableOffsets[$tplIdx]
    $nFld = $db[$tplOff + 24]
    $recSize = [BitConverter]::ToInt32($db, $tplOff + 4)
    $nRec = [BitConverter]::ToUInt16($db, $tplOff + 16)
    $nWri = [BitConverter]::ToUInt16($db, $tplOff + 18)
    $crcRecOff = $tplOff + 32 + 4 + $nFld * 16
    $dataStart = $crcRecOff + 4

    # Ler field offsets
    $bitOff = @(); $depth = @(); $rlMap = @{}
    for ($f = 0; $f -lt $nFld; $f++) {
        $fo = $tplOff + 32 + 4 + $f * 16
        $bitOff += [BitConverter]::ToInt32($db, $fo + 4)
        $depth += [BitConverter]::ToInt32($db, $fo + 12)
    }

    # Ler ranges do XML
    $xml = [xml](Get-Content (Join-Path $PSScriptRoot "bin\Release\net8.0-windows\fifa_ng_db-meta.xml") -Raw -Encoding UTF8)
    $tplNode = $xml.SelectSingleNode("//table[@name='teamplayerlinks']")
    if ($tplNode -eq $null) {
        $tplNode = $xml.SelectSingleNode("//table[@shortname='RrqT']")
    }
    if ($tplNode -ne $null) {
        foreach ($fNode in $tplNode.field) {
            $fname = $fNode.GetAttribute("name").ToLower()
            $rl = [int]$fNode.GetAttribute("rangelow")
            $rlMap[$fname] = $rl
        }
    }

    # Ler TXT
    $txtPath = Join-Path $TxtFolder "teamplayerlinks.txt"
    $lines = [System.IO.File]::ReadAllLines($txtPath, [System.Text.Encoding]::Unicode)
    $headers = $lines[0].TrimStart("﻿").Split("`t")
    $headers = $headers | ForEach-Object { $_.Trim().ToLower() }

    # Mapear header -> indice do campo no DB (por posicao, assumindo mesma ordem)
    # Comparar primeiro registro para validar
    $txtReg0 = $lines[1].Split("`t")

    $modified = 0
    $nRows = [Math]::Min($nWri, $lines.Length - 1)
    for ($r = 0; $r -lt $nRows; $r++) {
        $line = $lines[$r + 1]
        if ([string]::IsNullOrWhiteSpace($line)) { continue }
        $cells = $line.Split("`t")
        $recOff = $dataStart + $r * $recSize
        $recMod = $false
        for ($c = 0; $c -lt $headers.Length -and $c -lt $nFld; $c++) {
            $val = $null
            if (-not [long]::TryParse($cells[$c].Trim(), [ref]$val)) { continue }
            $rl = if ($rlMap.ContainsKey($headers[$c])) { $rlMap[$headers[$c]] } else { 0 }
            $cur = Read-BitsLE $db ($recOff + $bitOff[$c] / 8) ($bitOff[$c] % 8) $depth[$c]
            $adjusted = $val - $rl
            if ($cur -ne $adjusted) {
                Write-BitsLE $db ($recOff + $bitOff[$c] / 8) ($bitOff[$c] % 8) $depth[$c] $adjusted
                $recMod = $true
            }
        }
        if ($recMod) { $modified++ }
    }

    # Recalcular CRC records
    $recLen = $nRec * $recSize
    $crc = Compute-Crc $db $dataStart $recLen
    [System.Buffer]::BlockCopy([System.BitConverter]::GetBytes($crc), 0, $db, $crcRecOff, 4)
    Write-Host "teamplayerlinks: $modified registros alterados (in-place, sem SaveDb)"
}

# 5. Importar — leagues (so alterar isinternationalleague)
$leaguesIdx = $nameToIdx["onMQ"]
if ($leaguesIdx -ne $null) {
    $lgOff = $tableOffsets[$leaguesIdx]
    $nFld = $db[$lgOff + 24]
    $recSize = [BitConverter]::ToInt32($db, $lgOff + 4)
    $nRec = [BitConverter]::ToUInt16($db, $lgOff + 16)
    $nWri = [BitConverter]::ToUInt16($db, $lgOff + 18)
    $crcRecOff = $lgOff + 32 + 4 + $nFld * 16
    $dataStart = $crcRecOff + 4

    # Ler field offsets
    $bitOff = @(); $depth = @()
    for ($f = 0; $f -lt $nFld; $f++) {
        $fo = $lgOff + 32 + 4 + $f * 16
        $bitOff += [BitConverter]::ToInt32($db, $fo + 4)
        $depth += [BitConverter]::ToInt32($db, $fo + 12)
    }

    # Encontrar indice de isinternationalleague: ultimo campo, bitOffset=1004
    $isIntlIdx = -1
    for ($f = 0; $f -lt $nFld; $f++) {
        if ($bitOff[$f] -eq 1004) { $isIntlIdx = $f; break }
    }

    $txtPath = Join-Path $TxtFolder "leagues.txt"
    $lines = [System.IO.File]::ReadAllLines($txtPath, [System.Text.Encoding]::Unicode)
    $headers = $lines[0].TrimStart("﻿").Split("`t")
    $headers = $headers | ForEach-Object { $_.Trim().ToLower() }
    $isIntlCol = $headers.IndexOf("isinternationalleague")
    if ($isIntlCol -lt 0) { Write-Host "Coluna isinternationalleague nao encontrada no TXT" }
    else {
        $modified = 0
        $nRows = [Math]::Min($nWri, $lines.Length - 1)
        for ($r = 0; $r -lt $nRows; $r++) {
            $line = $lines[$r + 1]
            if ([string]::IsNullOrWhiteSpace($line)) { continue }
            $cells = $line.Split("`t")
            $val = $null
            if (-not [long]::TryParse($cells[$isIntlCol].Trim(), [ref]$val)) { continue }
            $recOff = $dataStart + $r * $recSize
            $cur = Read-BitsLE $db ($recOff + $bitOff[$isIntlIdx] / 8) ($bitOff[$isIntlIdx] % 8) $depth[$isIntlIdx]
            if ($cur -ne $val) {
                Write-BitsLE $db ($recOff + $bitOff[$isIntlIdx] / 8) ($bitOff[$isIntlIdx] % 8) $depth[$isIntlIdx] $val
                $modified++
            }
        }
        $recLen = $nRec * $recSize
        $crc = Compute-Crc $db $dataStart $recLen
        [System.Buffer]::BlockCopy([System.BitConverter]::GetBytes($crc), 0, $db, $crcRecOff, 4)
        Write-Host "leagues: $modified registros alterados (bit isinternationalleague, in-place)"
    }
}

# 6. Salvar (DB tem tamanho preservado)
$result = New-Object byte[] ($header.Length + $db.Length + $trailer.Length)
[System.Buffer]::BlockCopy($header, 0, $result, 0, $header.Length)
[System.Buffer]::BlockCopy($db, 0, $result, $header.Length, $db.Length)
if ($trailer.Length -gt 0) {
    [System.Buffer]::BlockCopy($trailer, 0, $result, $header.Length + $db.Length, $trailer.Length)
}

# Atualizar sizes no header
$fileSize = [uint32](48 + 4 + $db.Length + $trailer.Length)
$dataSize = [uint32]($db.Length + $trailer.Length)
[System.Buffer]::BlockCopy([System.BitConverter]::GetBytes($fileSize), 0, $result, 14, 4)
[System.Buffer]::BlockCopy([System.BitConverter]::GetBytes($dataSize), 0, $result, 1174, 4)

# 7. Salvar como modificado (substitui input)
[System.IO.File]::WriteAllBytes($SquadPath, $result)
Write-Host "Salvo: $SquadPath ($($result.Length) bytes)"
