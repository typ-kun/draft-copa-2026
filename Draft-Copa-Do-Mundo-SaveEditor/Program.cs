using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Text;

namespace DraftCopaDoMundo.SaveEditor
{
    internal static class Program
    {
        /// <summary>
        /// CLI mode - usado pelo Importar.bat
        /// </summary>
        static int CliMain(string[] args)
        {
            Console.OutputEncoding = Encoding.UTF8;
            if (args.Length < 2)
            {
                Console.WriteLine("Uso: Draft-Copa-Do-Mundo-SaveEditor.exe <SquadPath> <TxtFolder> [--verbose]");
                return 1;
            }

            bool verbose = args.Length >= 3 && args[2] == "--verbose";
            string squadPath = Path.GetFullPath(args[0]);
            string txtFolder = Path.GetFullPath(args[1]);

            if (!File.Exists(squadPath)) { Console.WriteLine("[ERRO] Squad nao encontrado"); return 1; }
            if (!Directory.Exists(txtFolder)) { Console.WriteLine("[ERRO] Pasta TXTs nao encontrada"); return 1; }

            string exeDir = Path.GetDirectoryName(
                System.Reflection.Assembly.GetExecutingAssembly().Location) ?? ".";
            string xmlPath = Path.Combine(exeDir, "fifa_ng_db-meta.xml");

            // Backup incremental: _1_, _2_, _3_...
            string backupDir = Path.GetDirectoryName(squadPath) ?? ".";
            string fileName = Path.GetFileName(squadPath);
            int backupNum = 1;
            string backupPath;
            do
            {
                backupPath = Path.Combine(backupDir, $"_{backupNum}_{fileName}");
                backupNum++;
            } while (File.Exists(backupPath));
            File.Copy(squadPath, backupPath);
            Console.WriteLine($"Backup: {backupPath}");

            // 1. CareerFile.Open
            Console.WriteLine($"[1] Abrindo squad: {squadPath}");
            var careerFile = new FifaLibrary.CareerFile(squadPath, xmlPath);
            Console.WriteLine($"[1] InGameName: {careerFile.InGameName}");
            Console.WriteLine($"[1] {careerFile.NDatabases} database(s)");

            // 2. Converter para DataSet[]
            DataSet[] dataSets = careerFile.ConvertToDataSet();
            Console.WriteLine($"[2] {dataSets.Length} DataSet(s)");

            // 3. Importar TXTs (apenas no primeiro DataSet)
            Console.WriteLine("[3] Importando TXTs...");
            DataSet mainDS = dataSets[0];
            string[] txtFiles = Directory.GetFiles(txtFolder, "*.txt");
            int imported = 0;
            foreach (string txtPath in txtFiles)
            {
                string tableName = Path.GetFileNameWithoutExtension(txtPath);
                DataTable dt = null;
                foreach (DataTable table in mainDS.Tables)
                {
                    if (table.TableName.Equals(tableName, StringComparison.OrdinalIgnoreCase))
                    {
                        dt = table;
                        break;
                    }
                }
                if (dt == null)
                {
                    if (verbose) Console.WriteLine($"[SKIP] '{tableName}'");
                    continue;
                }

                string[] lines = File.ReadAllLines(txtPath, Encoding.Unicode);
                if (lines.Length < 2) continue;

                dt.Clear();
                for (int i = 1; i < lines.Length; i++)
                {
                    if (string.IsNullOrWhiteSpace(lines[i])) continue;
                    string[] cells = lines[i].Split('\t');
                    DataRow row = dt.NewRow();
                    for (int c = 0; c < dt.Columns.Count && c < cells.Length; c++)
                        row[c] = ConvertToColumn(cells[c].Trim(), dt.Columns[c].DataType);
                    dt.Rows.Add(row);
                }
                Console.WriteLine($"  {tableName}: {dt.Rows.Count} registros");
                imported++;
            }
            Console.WriteLine($"[3] {imported} tabelas importadas");

            // 4. Converter de volta e salvar
            Console.WriteLine("[4] Convertendo de volta...");
            careerFile.ConvertFromDataSet(dataSets);

            Console.WriteLine("[4] Salvando com SaveEa...");
            careerFile.SaveEa(squadPath);

            Console.WriteLine($"[4] Salvo: {squadPath} ({new FileInfo(squadPath).Length} bytes)");

            // 5. Remover arquivo extra que o SaveEa cria na pasta do jogo
            // O SaveEa cria um novo Squads* com timestamp - remover qualquer um que não seja o original
            string fc26Dir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "EA SPORTS FC 26", "settings");
            if (Directory.Exists(fc26Dir))
            {
                string squadFileName = Path.GetFileName(squadPath);
                foreach (string f in Directory.GetFiles(fc26Dir, "Squads*"))
                {
                    string fName = Path.GetFileName(f);
                    // Pular: arquivo original, backups (_1_, _2_, etc)
                    if (fName.Equals(squadFileName, StringComparison.OrdinalIgnoreCase) || fName.StartsWith("_"))
                        continue;
                    // Qualquer outro Squads* é extra do SaveEa - remover
                    try { File.Delete(f); Console.WriteLine($"Removido extra: {fName}"); } catch { }
                }
            }

            // 6. Copiar para jogo
            if (Directory.Exists(fc26Dir))
            {
                string ts = DateTime.Now.ToString("yyyyMMddHHmmss");
                string suffix = new Random().Next(100, 1000).ToString();
                string gamePath = Path.Combine(fc26Dir, $"Squads{ts}{suffix}");
                File.Copy(squadPath, gamePath, true);
                Console.WriteLine($"Copiado para o jogo: {gamePath}");
            }

            return 0;
        }

        private static object ConvertToColumn(string value, Type targetType)
        {
            if (targetType == typeof(int))
            {
                if (double.TryParse(value, System.Globalization.NumberStyles.Any,
                    System.Globalization.CultureInfo.InvariantCulture, out double d))
                    return (int)d;
                if (int.TryParse(value, out int i)) return i;
                return DBNull.Value;
            }
            if (targetType == typeof(double) || targetType == typeof(float))
            {
                if (double.TryParse(value, System.Globalization.NumberStyles.Any,
                    System.Globalization.CultureInfo.InvariantCulture, out double d))
                    return d;
                return DBNull.Value;
            }
            if (targetType == typeof(bool))
            {
                if (value == "1") return true;
                if (value == "0") return false;
                if (bool.TryParse(value, out bool b)) return b;
                return DBNull.Value;
            }
            return value;
        }
    }
}