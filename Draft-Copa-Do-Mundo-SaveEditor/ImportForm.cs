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
        // Cores inspiradas no Draft Copa do Mundo 2026
        private static readonly Color Surface = Color.FromArgb(243, 236, 216);
        private static readonly Color Surface2 = Color.White;
        private static readonly Color Ink = Color.FromArgb(27, 26, 23);
        private static readonly Color Accent = Color.FromArgb(232, 70, 43);
        private static readonly Color Accent2 = Color.FromArgb(200, 162, 75);
        private static readonly Color Line = Color.FromArgb(216, 207, 180);
        private static readonly Color Gold = Color.FromArgb(200, 162, 75);

        private FifaLibrary.CareerFile careerFile;
        private DataSet[] dataSets;
        private string currentFile;
        private string xmlPath;

        private Button btnOpen;
        private Button btnImport;
        private Button btnSave;
        private Label lblStatus;
        private Label lblInGameName;
        private Label lblTitle;

        public ImportForm()
        {
            string exeDir = Path.GetDirectoryName(System.Reflection.Assembly.GetExecutingAssembly().Location) ?? ".";
            xmlPath = Path.Combine(exeDir, "fifa_ng_db-meta.xml");

            this.Text = "Draft Copa do Mundo 2026";
            this.Size = new System.Drawing.Size(520, 320);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedSingle;
            this.MaximizeBox = false;
            this.BackColor = Surface;

            // Título
            lblTitle = new Label();
            lblTitle.Text = "⚽ DRAFT COPA DO MUNDO 2026";
            lblTitle.Font = new Font("Segoe UI", 14, FontStyle.Bold);
            lblTitle.ForeColor = Accent;
            lblTitle.Size = new System.Drawing.Size(480, 35);
            lblTitle.Location = new System.Drawing.Point(20, 15);
            lblTitle.TextAlign = ContentAlignment.MiddleCenter;

            // Linha decorativa
            Panel divider = new Panel();
            divider.Size = new System.Drawing.Size(480, 3);
            divider.Location = new System.Drawing.Point(20, 52);
            divider.BackColor = Gold;

            // Botões estilo do draft
            btnOpen = CreateButton("1. Abrir SquadFile", 20, 65);
            btnOpen.Click += BtnOpen_Click;

            btnImport = CreateButton("2. Importar tabelas", 260, 65);
            btnImport.Enabled = false;
            btnImport.Click += BtnImport_Click;

            btnSave = CreateButton("3. Salvar", 20, 130);
            btnSave.Enabled = false;
            btnSave.Click += BtnSave_Click;

            // Label do squad
            lblInGameName = new Label();
            lblInGameName.Text = "Nenhum squad aberto";
            lblInGameName.Font = new Font("Segoe UI", 10, FontStyle.Bold);
            lblInGameName.ForeColor = Ink;
            lblInGameName.Size = new System.Drawing.Size(480, 25);
            lblInGameName.Location = new System.Drawing.Point(20, 195);

            // Status
            lblStatus = new Label();
            lblStatus.Text = "Selecione um squad file para comecar";
            lblStatus.Font = new Font("Segoe UI", 9);
            lblStatus.ForeColor = Color.FromArgb(120, 120, 120);
            lblStatus.Size = new System.Drawing.Size(480, 25);
            lblStatus.Location = new System.Drawing.Point(20, 225);

            // Linha inferior
            Panel dividerBottom = new Panel();
            dividerBottom.Size = new System.Drawing.Size(480, 2);
            dividerBottom.Location = new System.Drawing.Point(20, 260);
            dividerBottom.BackColor = Line;

            // Label de créditos
            Label lblCredits = new Label();
            lblCredits.Text = "Feito com ❤️ para a comunidade modding FC 26";
            lblCredits.Font = new Font("Segoe UI", 8, FontStyle.Italic);
            lblCredits.ForeColor = Color.FromArgb(160, 155, 140);
            lblCredits.Size = new System.Drawing.Size(480, 20);
            lblCredits.Location = new System.Drawing.Point(20, 270);
            lblCredits.TextAlign = ContentAlignment.MiddleCenter;

            this.Controls.Add(lblTitle);
            this.Controls.Add(divider);
            this.Controls.Add(btnOpen);
            this.Controls.Add(btnImport);
            this.Controls.Add(btnSave);
            this.Controls.Add(lblInGameName);
            this.Controls.Add(lblStatus);
            this.Controls.Add(dividerBottom);
            this.Controls.Add(lblCredits);

            this.Paint += ImportForm_Paint;
        }

        private void ImportForm_Paint(object sender, PaintEventArgs e)
        {
            // Borda decorativa dourada
            using (Pen pen = new Pen(Gold, 2))
            {
                e.Graphics.DrawRectangle(pen, 1, 1, this.ClientSize.Width - 3, this.ClientSize.Height - 3);
            }
        }

        private Button CreateButton(string text, int x, int y)
        {
            Button btn = new Button();
            btn.Text = text;
            btn.Size = new System.Drawing.Size(220, 55);
            btn.Location = new System.Drawing.Point(x, y);
            btn.BackColor = Accent;
            btn.ForeColor = Color.White;
            btn.FlatStyle = FlatStyle.Flat;
            btn.FlatAppearance.BorderSize = 0;
            btn.Font = new Font("Segoe UI", 11, FontStyle.Bold);
            btn.Cursor = Cursors.Hand;
            btn.FlatAppearance.MouseOverBackColor = ControlPaint.Light(Accent, 0.15f);
            btn.FlatAppearance.MouseDownBackColor = ControlPaint.Dark(Accent, 0.15f);
            btn.Enabled = false; // Desabilitado por padrão
            btn.BackColorChanged += (s, e) => UpdateButtonStyle(btn);
            return btn;
        }

        private void UpdateButtonStyle(Button btn)
        {
            if (btn.Enabled)
            {
                btn.BackColor = Accent;
                btn.ForeColor = Color.White;
                btn.Cursor = Cursors.Hand;
            }
            else
            {
                btn.BackColor = Line;
                btn.ForeColor = Color.FromArgb(160, 155, 140);
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

            // Backup
            string backupPath = currentFile + "_1_";
            if (!File.Exists(backupPath))
            {
                File.Copy(currentFile, backupPath);
            }

            try
            {
                lblStatus.Text = "Carregando squad...";
                this.Refresh();

                careerFile = new FifaLibrary.CareerFile(currentFile, xmlPath);
                dataSets = careerFile.ConvertToDataSet();

                lblInGameName.Text = $"Squad: {Path.GetFileName(currentFile)} | Nome: {careerFile.InGameName}";
                lblStatus.Text = $"Carregado OK - {dataSets[0].Tables.Count} tabelas";
                lblStatus.ForeColor = Color.FromArgb(27, 138, 61);

                btnImport.Enabled = true;
                UpdateButtonStyle(btnImport);
                btnSave.Enabled = false;
                UpdateButtonStyle(btnSave);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erro ao abrir: {ex.Message}", "Erro", MessageBoxButtons.OK, MessageBoxIcon.Error);
                lblStatus.ForeColor = Accent;
            }
        }

        private void BtnImport_Click(object sender, EventArgs e)
        {
            FolderBrowserDialog fbd = new FolderBrowserDialog();
            fbd.Description = "Selecione a pasta com os TXTs para importar";
            fbd.SelectedPath = @"C:\draft-copa-do-mundo-2026\Arquivos para Importar SaveEditor";

            if (fbd.ShowDialog() != DialogResult.OK) return;

            try
            {
                lblStatus.Text = "Importando tabelas...";
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
                lblStatus.ForeColor = Color.FromArgb(27, 138, 61);
                btnSave.Enabled = true;
                UpdateButtonStyle(btnSave);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erro ao importar: {ex.Message}", "Erro", MessageBoxButtons.OK, MessageBoxIcon.Error);
                lblStatus.ForeColor = Accent;
            }
        }

        private void BtnSave_Click(object sender, EventArgs e)
        {
            try
            {
                lblStatus.Text = "Salvando...";
                lblStatus.ForeColor = Ink;
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
                    lblStatus.Text = $"✅ Salvo OK! Squad copiado para o jogo";
                }
                else
                {
                    lblStatus.Text = $"✅ Salvo em: {Path.GetFileName(currentFile)}";
                }

                lblStatus.ForeColor = Color.FromArgb(27, 138, 61);
                btnSave.Enabled = false;
                UpdateButtonStyle(btnSave);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erro ao salvar: {ex.Message}", "Erro", MessageBoxButtons.OK, MessageBoxIcon.Error);
                lblStatus.ForeColor = Accent;
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