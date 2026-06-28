using System;
using System.Data;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Text;
using System.Windows.Forms;

namespace DraftCopaDoMundo.SaveEditor
{
    public class ImportForm : Form
    {
        // Paleta: Bege / Preto / Dourado
        private static readonly Color Bg = Color.FromArgb(243, 236, 216);
        private static readonly Color Ink = Color.FromArgb(27, 26, 23);
        private static readonly Color Gold = Color.FromArgb(240, 172, 0);
        private static readonly Color GoldHover = Color.FromArgb(220, 155, 0);
        private static readonly Color GoldPressed = Color.FromArgb(200, 140, 0);
        private static readonly Color GoldMuted = Color.FromArgb(180, 140, 40);
        private static readonly Color TextGray = Color.FromArgb(110, 108, 102);
        private static readonly Color Success = Color.FromArgb(50, 140, 70);
        private static readonly Color Error = Color.FromArgb(180, 55, 35);

        private Font fontTitle;
        private Font fontBtn;
        private Font fontLabel;
        private Font fontStatus;
        private Font fontSmall;

        private FifaLibrary.CareerFile careerFile;
        private DataSet[] dataSets;
        private string currentFile;
        private string xmlPath;

        private Button btnOpen;
        private Button btnImport;
        private Button btnSave;
        private Label lblTitle;
        private Label lblInGameName;
        private Label lblStatus;

        public ImportForm()
        {
            string exeDir = Path.GetDirectoryName(System.Reflection.Assembly.GetExecutingAssembly().Location) ?? ".";
            xmlPath = Path.Combine(exeDir, "fifa_ng_db-meta.xml");

            // Fontes
            fontTitle = new Font("Segoe UI", 14f, FontStyle.Bold);
            fontBtn = new Font("Segoe UI", 10.5f, FontStyle.Bold);
            fontLabel = new Font("Segoe UI", 9.5f, FontStyle.Bold);
            fontStatus = new Font("Segoe UI", 9f);
            fontSmall = new Font("Segoe UI", 8f);

            // Janela
            this.Text = "Draft Copa do Mundo 2026";
            this.Size = new System.Drawing.Size(460, 290);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.BackColor = Bg;
            this.Font = fontStatus;
            this.Padding = new Padding(0);

            // Título
            lblTitle = new Label();
            lblTitle.Text = "DRAFT COPA DO MUNDO 2026";
            lblTitle.Font = fontTitle;
            lblTitle.ForeColor = Ink;
            lblTitle.Size = new System.Drawing.Size(420, 32);
            lblTitle.Location = new System.Drawing.Point(20, 18);
            lblTitle.TextAlign = ContentAlignment.TopCenter;

            // Botoes (tamanho uniforme)
            btnOpen = MakeButton("Abrir SquadFile", 20, 62);
            btnOpen.Enabled = true;
            ApplyButtonState(btnOpen);
            btnOpen.Click += BtnOpen_Click;

            btnImport = MakeButton("Importar tabelas", 20, 118);
            btnImport.Click += BtnImport_Click;

            btnSave = MakeButton("Salvar", 20, 174);
            btnSave.Click += BtnSave_Click;

            // Info squad
            lblInGameName = new Label();
            lblInGameName.Text = "";
            lblInGameName.Font = fontLabel;
            lblInGameName.ForeColor = Ink;
            lblInGameName.Size = new System.Drawing.Size(420, 22);
            lblInGameName.Location = new System.Drawing.Point(20, 220);

            // Status
            lblStatus = new Label();
            lblStatus.Text = "Selecione um squad para comecar";
            lblStatus.Font = fontSmall;
            lblStatus.ForeColor = TextGray;
            lblStatus.Size = new System.Drawing.Size(420, 20);
            lblStatus.Location = new System.Drawing.Point(20, 248);

            this.Controls.Add(lblTitle);
            this.Controls.Add(btnOpen);
            this.Controls.Add(btnImport);
            this.Controls.Add(btnSave);
            this.Controls.Add(lblInGameName);
            this.Controls.Add(lblStatus);
        }

        private Button MakeButton(string text, int x, int y)
        {
            Button btn = new Button();
            btn.Text = text;
            btn.Size = new System.Drawing.Size(410, 44);
            btn.Location = new System.Drawing.Point(x, y);
            btn.BackColor = Gold;
            btn.ForeColor = Ink;
            btn.FlatStyle = FlatStyle.Flat;
            btn.FlatAppearance.BorderSize = 0;
            btn.Font = fontBtn;
            btn.Cursor = Cursors.Hand;
            btn.FlatAppearance.MouseOverBackColor = GoldHover;
            btn.FlatAppearance.MouseDownBackColor = GoldPressed;
            btn.Enabled = false;
            ApplyButtonState(btn);
            return btn;
        }

        private void ApplyButtonState(Button btn)
        {
            if (btn.Enabled)
            {
                btn.BackColor = Gold;
                btn.ForeColor = Ink;
                btn.Cursor = Cursors.Hand;
            }
            else
            {
                btn.BackColor = Bg;
                btn.ForeColor = TextGray;
                btn.Cursor = Cursors.Default;
            }
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

            string backupPath = currentFile + "_1_";
            if (!File.Exists(backupPath))
                File.Copy(currentFile, backupPath);

            try
            {
                lblStatus.Text = "Carregando...";
                lblStatus.ForeColor = TextGray;
                this.Refresh();

                careerFile = new FifaLibrary.CareerFile(currentFile, xmlPath);
                dataSets = careerFile.ConvertToDataSet();

                lblInGameName.Text = $"{Path.GetFileName(currentFile)} — {careerFile.InGameName}";
                lblStatus.Text = $"Carregado — {dataSets[0].Tables.Count} tabelas";
                lblStatus.ForeColor = Success;

                btnImport.Enabled = true;
                ApplyButtonState(btnImport);
                btnSave.Enabled = false;
                ApplyButtonState(btnSave);
            }
            catch (Exception ex)
            {
                lblStatus.Text = ex.Message;
                lblStatus.ForeColor = Error;
            }
        }

        private void BtnImport_Click(object sender, EventArgs e)
        {
            FolderBrowserDialog fbd = new FolderBrowserDialog();
            fbd.Description = "Selecione a pasta com os TXTs";
            fbd.SelectedPath = @"C:\draft-copa-do-mundo-2026\Arquivos para Importar SaveEditor";

            if (fbd.ShowDialog() != DialogResult.OK) return;

            try
            {
                lblStatus.Text = "Importando...";
                lblStatus.ForeColor = TextGray;
                this.Refresh();

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
                        { dt = table; break; }
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
                lblStatus.Text = $"Importado — {imported} tabelas, {totalRecords} registros";
                lblStatus.ForeColor = Success;
                btnSave.Enabled = true;
                ApplyButtonState(btnSave);
            }
            catch (Exception ex)
            {
                lblStatus.Text = ex.Message;
                lblStatus.ForeColor = Error;
            }
        }

        private void BtnSave_Click(object sender, EventArgs e)
        {
            try
            {
                lblStatus.Text = "Salvando...";
                lblStatus.ForeColor = TextGray;
                this.Refresh();

                careerFile.SaveEa(currentFile);

                string fc26Dir = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "EA SPORTS FC 26", "settings");
                if (Directory.Exists(fc26Dir))
                {
                    string ts = DateTime.Now.ToString("yyyyMMddHHmmss");
                    string suffix = new Random().Next(100, 1000).ToString();
                    string gamePath = Path.Combine(fc26Dir, $"Squads{ts}{suffix}");
                    File.Copy(currentFile, gamePath, true);
                    lblStatus.Text = $"Salvo — Squad copiado para o jogo";
                }
                else
                {
                    lblStatus.Text = $"Salvo — {Path.GetFileName(currentFile)}";
                }
                lblStatus.ForeColor = Success;
                btnSave.Enabled = false;
                ApplyButtonState(btnSave);
            }
            catch (Exception ex)
            {
                lblStatus.Text = ex.Message;
                lblStatus.ForeColor = Error;
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