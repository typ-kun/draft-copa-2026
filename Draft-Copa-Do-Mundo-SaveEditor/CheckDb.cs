using System;
using System.IO;
using System.Text;

namespace DraftCopaDoMundo.SaveEditor;

/// <summary>
/// Utilitário de diagnóstico: compara DB original vs modificado,
/// verifica CRC, e mostra diferenças nos primeiros registros.
/// </summary>
static class CheckDb
{
    public static int Run(string[] args)
    {
        if (args.Length < 1) { Console.Error.WriteLine("Uso: --check <squadPathOriginal> [squadPathModificado]"); return 1; }
        string origPath = Path.GetFullPath(args[0]);
        string modPath = args.Length >= 2 ? Path.GetFullPath(args[1]) : origPath + "_1_";

        Console.WriteLine("=== DIAGNÓSTICO DB ===");
        Console.WriteLine($"Original:   {origPath} ({(File.Exists(origPath) ? new FileInfo(origPath).Length + " bytes" : "NÃO ENCONTRADO")})");
        Console.WriteLine($"Modificado: {modPath} ({(File.Exists(modPath) ? new FileInfo(modPath).Length + " bytes" : "NÃO ENCONTRADO")})");

        byte[] origBytes = File.ReadAllBytes(origPath);
        byte[] modBytes = File.ReadAllBytes(modPath);

        byte[] origDb = ExtractDb(origBytes);
        byte[] modDb = ExtractDb(modBytes);

        Console.WriteLine($"\nDB original:   {origDb.Length} bytes");
        Console.WriteLine($"DB modificado: {modDb.Length} bytes");
        Console.WriteLine($"Tamanho igual: {origDb.Length == modDb.Length}");

        // Table directory info
        int tableCount = BitConverter.ToInt32(origDb, 16);
        int tablesStart = 24 + tableCount * 8 + 4;
        Console.WriteLine($"\nTabelas: {tableCount} (primeira tabela em offset {tablesStart})");

        // Find teamplayerlinks
        int tplOff = FindTable(origDb, "RrqT");
        if (tplOff < 0) { Console.WriteLine("[ERRO] Tabela RrqT não encontrada!"); return 1; }

        int recSize = BitConverter.ToInt32(origDb, tplOff + 4);
        ushort nRec = BitConverter.ToUInt16(origDb, tplOff + 16);
        ushort nWri = BitConverter.ToUInt16(origDb, tplOff + 18);
        int nFld = origDb[tplOff + 24];
        int crcRecOff = tplOff + 32 + 4 + nFld * 16;
        int dataStart = crcRecOff + 4;

        Console.WriteLine($"\n=== teamplayerlinks ===");
        Console.WriteLine($"recSize={recSize} nRec={nRec} nWri={nWri} nFld={nFld}");
        Console.WriteLine($"dataStart={dataStart} (0x{dataStart:X})");
        Console.WriteLine($"crcRecOff={crcRecOff} (0x{crcRecOff:X})");

        // Read field bit offsets
        int[] bitOff = new int[nFld];
        int[] depth = new int[nFld];
        for (int f = 0; f < nFld; f++)
        {
            int fo = tplOff + 32 + 4 + f * 16;
            bitOff[f] = BitConverter.ToInt32(origDb, fo + 4);
            depth[f] = BitConverter.ToInt32(origDb, fo + 12);
        }

        Console.WriteLine("\nCampos (primeiros 16):");
        for (int f = 0; f < Math.Min(16, nFld); f++)
            Console.WriteLine($"  [{f,2}] bitOff={bitOff[f],4} depth={depth[f],2}");

        // Compare first 10 records
        Console.WriteLine("\n=== Primeiros 10 registros: valores originais × modificados ===");
        int[] checkFields = { 4, 5, 6, 7, 13 }; // jersey, position, artkey, teamid, playerid
        Console.Write("Reg  |");
        foreach (int cf in checkFields) Console.Write($" col{cf,9} |");
        Console.WriteLine(" Status");

        int diffs = 0;
        for (int r = 0; r < Math.Min((int)nWri, 20); r++)
        {
            int recOff = dataStart + r * recSize;
            Console.Write($"{r,3}  |");
            bool changed = false;
            for (int ci = 0; ci < checkFields.Length; ci++)
            {
                int cf = checkFields[ci];
                long vo = ReadBits(origDb, recOff, bitOff[cf], depth[cf]);
                long vm = ReadBits(modDb, recOff, bitOff[cf], depth[cf]);
                if (vo != vm) { changed = true; diffs++; }
                Console.Write($" {vo,9}→{vm,-9} |");
            }
            Console.WriteLine(changed ? " ALTERADO" : " ok");
        }
        Console.WriteLine($"\nTotal alteracoes nas primeiras 20 linhas: {diffs} campos");

        // Compare TXT with DB values
        string txtFolder = Path.GetDirectoryName(origPath);
        string txtPath = Path.Combine(txtFolder ?? ".", "teamplayerlinks.txt");
        if (!File.Exists(txtPath))
        {
            // Try relative paths
            txtPath = @"C:\draft-copa-do-mundo-2026\Arquivos para Importar RDBM\teamplayerlinks.txt";
            // If also doesn't exist, skip
        }
        if (File.Exists(txtPath))
        {
            Console.WriteLine($"\n=== Comparação TXT × DB (primeiros 5 registros) ===");
            string[] lines = File.ReadAllLines(txtPath, Encoding.Unicode);
            string[] headers = lines[0].TrimStart('﻿').Split('\t');
            for (int i = 0; i < headers.Length; i++) headers[i] = headers[i].Trim().ToLower();

            // Find column indices in TXT
            int colJersey = Array.IndexOf(headers, "jerseynumber");
            int colTeamid = Array.IndexOf(headers, "teamid");
            int colPlayerid = Array.IndexOf(headers, "playerid");
            int colArtkey = Array.IndexOf(headers, "artificialkey");

            Console.WriteLine($"Cols: jersey={colJersey} teamid={colTeamid} playerid={colPlayerid} artkey={colArtkey}");

            for (int r = 0; r < Math.Min((int)nWri, 5); r++)
            {
                string line = lines[r + 1];
                if (string.IsNullOrWhiteSpace(line)) continue;
                string[] cells = line.Split('\t');
                int recOff = dataStart + r * recSize;

                Console.WriteLine($"\n  Registro {r}:");
                for (int c = 0; c < Math.Min(headers.Length, 16); c++)
                {
                    if (!long.TryParse(cells[c].Trim(), out long txtVal)) continue;
                    long dbVal = ReadBits(modDb, recOff, bitOff[c], depth[c]);
                    string diff = txtVal == dbVal ? "" : " <<< DIFERE";
                    Console.WriteLine($"    {headers[c],-30} TXT={txtVal,8} DB={dbVal,8}{diff}");
                }
            }
        }

        // Check CRC
        Console.WriteLine($"\n=== VERIFICAÇÃO CRC ===");
        int storedCrcOrig = BitConverter.ToInt32(origDb, crcRecOff);
        int storedCrcMod = BitConverter.ToInt32(modDb, crcRecOff);
        int computedCrcOrig = Crc(origDb, dataStart, nRec * recSize);
        int computedCrcMod = Crc(modDb, dataStart, nRec * recSize);

        Console.WriteLine($"CRC armazenado:        orig=0x{storedCrcOrig:X8} mod=0x{storedCrcMod:X8}");
        Console.WriteLine($"CRC calculado:         orig=0x{computedCrcOrig:X8} mod=0x{computedCrcMod:X8}");
        Console.WriteLine($"Original OK: {storedCrcOrig == computedCrcOrig}");
        Console.WriteLine($"Modificado OK: {storedCrcMod == computedCrcMod}");

        // Global CRC
        int gCrcOrig = BitConverter.ToInt32(origDb, 32);
        int gCrcMod = BitConverter.ToInt32(modDb, 32);
        Console.WriteLine($"\nCRC global (offset 32): orig=0x{gCrcOrig:X8} mod=0x{gCrcMod:X8}");
        Console.WriteLine($"CRC global alterado? {(gCrcOrig != gCrcMod ? "SIM" : "NÃO")}");

        // First 100 bytes diff
        Console.WriteLine($"\n=== DIFERENÇAS (primeiras 50) ===");
        int diffCount = 0;
        for (int i = 0; i < Math.Min(origDb.Length, modDb.Length) && diffCount < 50; i++)
        {
            if (origDb[i] != modDb[i])
            {
                Console.WriteLine($"  offset {i,10} (0x{i:X8}): orig=0x{origDb[i]:X2} mod=0x{modDb[i]:X2}");
                diffCount++;
            }
        }
        Console.WriteLine($"Total diferenças encontradas (primeiras 50): {diffCount}");

        Console.WriteLine("\n=== FIM DIAGNÓSTICO ===");
        return 0;
    }

    static byte[] ExtractDb(byte[] fileBytes)
    {
        byte[] dbMagic = { 0x44, 0x42, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00 };
        int dbStart = FindBytes(fileBytes, dbMagic);
        if (dbStart < 0) throw new InvalidDataException("DB08 magic not found");

        int bnryStart = fileBytes.Length;
        for (int i = dbStart + 8; i < fileBytes.Length - 4; i++)
            if (fileBytes[i] == 0x42 && fileBytes[i + 1] == 0x4E && fileBytes[i + 2] == 0x52 && fileBytes[i + 3] == 0x59)
            { bnryStart = i; break; }

        byte[] db = new byte[bnryStart - dbStart];
        Array.Copy(fileBytes, dbStart, db, 0, db.Length);
        return db;
    }

    static int FindBytes(byte[] data, byte[] pat, int start = 0)
    {
        for (int i = start; i <= data.Length - pat.Length; i++)
        {
            bool ok = true;
            for (int j = 0; j < pat.Length; j++)
                if (data[i + j] != pat[j]) { ok = false; break; }
            if (ok) return i;
        }
        return -1;
    }

    static int FindTable(byte[] db, string shortName)
    {
        int tableCount = BitConverter.ToInt32(db, 16);
        int tablesStart = 24 + tableCount * 8 + 4;
        byte[] snBytes = Encoding.ASCII.GetBytes(shortName.PadRight(4).Substring(0, 4));
        int cursor = 24;
        for (int i = 0; i < tableCount; i++)
        {
            bool match = true;
            for (int j = 0; j < 4; j++)
                if (db[cursor + j] != snBytes[j]) { match = false; break; }
            if (match) return tablesStart + BitConverter.ToInt32(db, cursor + 4);
            cursor += 8;
        }
        return -1;
    }

    static long ReadBits(byte[] data, int byteStart, int startBit, int numBits)
    {
        long val = 0;
        for (int i = 0; i < numBits; i++)
        {
            int bp = startBit + i;
            int bi = bp / 8, bj = bp % 8;
            if (byteStart + bi < data.Length && ((data[byteStart + bi] >> bj) & 1) == 1)
                val |= (1L << i);
        }
        return val;
    }

    static int Crc(byte[] data, int offset, int len)
    {
        int crc = -1;
        for (int i = 0; i < len; i++)
        {
            crc ^= data[offset + i] << 24;
            for (int j = 0; j < 8; j++)
                crc = (crc < 0) ? (crc * 2) ^ 79764919 : crc * 2;
        }
        return crc;
    }
}