using System;
using System.Data;
using System.IO;
using System.Text;
using System.Windows.Forms;

namespace DraftCopaDoMundo.SaveEditor
{
    public class ImportForm : Form
    {
        private FifaLibrary.CareerFile careerFile;
        private DataSet[] dataSets;
        private string currentFile;
        private string xmlPath;

        private Button btnOpen;
        private Button btnImport;
        private Button btnSave;
        private Label lblStatus;
        private Label lblInGameName;

        public ImportForm()
        {
            string exeDir = Path.GetDirectoryName(System.Reflection.Assembly.GetExecutingAssembly().Location) ?? ".";
            xmlPath = Path.Combine(exeDir, "fifa_ng_db-meta.xml");

            this.Text = "Draft Copa do Mundo 2026 - Importar Elencos";
            this.Size = new System.Drawing.Size(480, 220);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedSingle;
            this.MaximizeBox = false;

            btnOpen = new Button();
            btnOpen.Text = "1. Abrir SquadFile";
            btnOpen.Size = new System.Drawing.Size(200, 50);
            btnOpen.Location = new System.Drawing.Point(20, 20);
            btnOpen.Enabled = true;
            btnOpen.Click += BtnOpen_Click;

            btnImport = new Button();
            btnImport.Text = "2. Importar tabelas";
            btnImport.Size = new System.Drawing.Size(200, 50);
            btnImport.Location = new System.Drawing.Point(250, 20);
            btnImport.Enabled = false;
            btnImport.Click += BtnImport_Click;

            btnSave = new Button();
            btnSave.Text = "3. Salvar";
            btnSave.Size = new System.Drawing.Size(200, 50);
            btnSave.Location = new System.Drawing.Point(20, 85);
            btnSave.Enabled = false;
            btnSave.Click += BtnSave_Click;

            lblInGameName = new Label();
            lblInGameName.Text = "Nenhum squad aberto";
            lblInGameName.Size = new System.Drawing.Size(440, 20);
            lblInGameName.Location = new System.Drawing.Point(20, 145);
            lblInGameName.ForeColor = System.Drawing.Color.DarkBlue;

            lblStatus = new Label();
            lblStatus.Text = "Selecione um squad file para comecar";
            lblStatus.Size = new System.Drawing.Size(440, 20);
            lblStatus.Location = new System.Drawing.Point(20, 170);
            lblStatus.ForeColor = System.Drawing.Color.Gray;

            this.Controls.Add(btnOpen);
            this.Controls.Add(btnImport);
            this.Controls.Add(btnSave);
            this.Controls.Add(lblInGameName);
            this.Controls.Add(lblStatus);
        }

        private void BtnOpen_Click(object sender, EventArgs e)
        {
            OpenFileDialog ofd = new OpenFileDialog();
            ofd.Title = "Abrir Squad File";
            ofd.Filter = "Squad Files|Squads*|All Files|*.*";
            ofd.InitialDirectory = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "EA SPORTS FC 26", "settings");

            if (ofd.ShowDialog() != DialogResult.OK) return;

            currentFile = ofd.FileName;

            // Backup
            string backupPath = currentFile + "_1_";
            if (!File.Exists(backupPath))
            {
                File.Copy(currentFile, backupPath);
            }

            try
            {
                careerFile = new FifaLibrary.CareerFile(currentFile, xmlPath);
                dataSets = careerFile.ConvertToDataSet();

                lblInGameName.Text = $"Squad: {Path.GetFileName(currentFile)} | Nome: {careerFile.InGameName}";
                lblStatus.Text = $"Carregado OK - {dataSets[0].Tables.Count} tabelas";

                btnImport.Enabled = true;
                btnSave.Enabled = false;
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erro ao abrir: {ex.Message}", "Erro", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void BtnImport_Click(object sender, EventArgs e)
        {
            FolderBrowserDialog fbd = new FolderBrowserDialog();
            fbd.Description = "Selecione a pasta com os TXTs para importar";

            if (fbd.ShowDialog() != DialogResult.OK) return;

            try
            {
                DataSet mainDS = dataSets[0];
                string[] txtFiles = Directory.GetFiles(fbd.SelectedPath, "*.txt");
                int imported = 0;
                int totalRecords = 0;

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
                    if (dt == null) continue;

                    string[] lines = File.ReadAllLines(txtPath, Encoding.Unicode);
                    if (lines.Length < 2) continue;

                    dt.Clear();
                    for (int i = 1; i < lines.Length; i++)
                    {
                        if (string.IsNullOrWhiteSpace(lines[i])) continue;
                        string[] cells = lines[i].Split('\t');
                        DataRow row = dt.NewRow();
                        for (int c = 0; c < dt.Columns.Count && c < cells.Length; c++)
                            row[c] = cells[c].Trim();
                        dt.Rows.Add(row);
                    }
                    totalRecords += dt.Rows.Count;
                    imported++;
                }

                careerFile.ConvertFromDataSet(dataSets);
                lblStatus.Text = $"Importado: {imported} tabelas, {totalRecords} registros";
                btnSave.Enabled = true;
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erro ao importar: {ex.Message}", "Erro", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void BtnSave_Click(object sender, EventArgs e)
        {
            try
            {
                lblStatus.Text = "Salvando...";
                this.Refresh();

                careerFile.SaveEa(currentFile);

                // Copiar para pasta do jogo
                string fc26Dir = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "EA SPORTS FC 26", "settings");
                if (Directory.Exists(fc26Dir))
                {
                    string ts = DateTime.Now.ToString("yyyyMMddHHmmss");
                    string suffix = new Random().Next(100, 1000).ToString();
                    string gamePath = Path.Combine(fc26Dir, $"Squads{ts}{suffix}");
                    File.Copy(currentFile, gamePath, true);
                    lblStatus.Text = $"Salvo OK! Copiado para: Squads{ts}{suffix}";
                }
                else
                {
                    lblStatus.Text = $"Salvo em: {currentFile}";
                }

                lblStatus.ForeColor = System.Drawing.Color.DarkGreen;
                btnSave.Enabled = false;
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erro ao salvar: {ex.Message}", "Erro", MessageBoxButtons.OK, MessageBoxIcon.Error);
                lblStatus.ForeColor = System.Drawing.Color.Red;
            }
        }

        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new ImportForm());
        }
    }
}