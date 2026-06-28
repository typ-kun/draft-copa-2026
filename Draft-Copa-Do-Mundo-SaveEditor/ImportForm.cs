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
        // Cores do logo Draft Copa do Mundo 2026
        private static readonly Color Surface = Color.FromArgb(243, 236, 216);  // Bege claro
        private static readonly Color Ink = Color.FromArgb(27, 26, 23);        // Preto quase absoluto
        private static readonly Color Gold = Color.FromArgb(240, 172, 0);       // Dourado/Amarelo
        private static readonly Color GoldDim = Color.FromArgb(180, 130, 0);    // Dourado mais escuro
        private static readonly Color Line = Color.FromArgb(216, 207, 180);    // Linha suave
        private static readonly Color Success = Color.FromArgb(60, 160, 80);
        private static readonly Color Error = Color.FromArgb(200, 60, 40);

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
            this.Size = new System.Drawing.Size(500, 310);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedSingle;
            this.MaximizeBox = false;
            this.BackColor = Surface;

            // Título
            lblTitle = new Label();
            lblTitle.Text = "⚽ DRAFT COPA DO MUNDO 2026";
            lblTitle.Font = new Font("Segoe UI", 13, FontStyle.Bold);
            lblTitle.ForeColor = Ink;
            lblTitle.Size = new System.Drawing.Size(460, 35);
            lblTitle.Location = new System.Drawing.Point(20, 15);
            lblTitle.TextAlign = ContentAlignment.MiddleCenter;

            // Botoes
            btnOpen = CreateButton("1. Abrir SquadFile", 20, 60);
            btnOpen.Enabled = true;
            UpdateButtonStyle(btnOpen);
            btnOpen.Click += BtnOpen_Click;

            btnImport = CreateButton("2. Importar tabelas", 260, 60);
            btnImport.Click += BtnImport_Click;

            btnSave = CreateButton("3. Salvar", 20, 125);
            btnSave.Click += BtnSave_Click;

            // Squad info
            lblInGameName = new Label();
            lblInGameName.Text = "Nenhum squad aberto";
            lblInGameName.Font = new Font("Segoe UI", 10, FontStyle.Bold);
            lblInGameName.ForeColor = Ink;
            lblInGameName.Size = new System.Drawing.Size(460, 25);
            lblInGameName.Location = new System.Drawing.Point(20, 195);

            // Status
            lblStatus = new Label();
            lblStatus.Text = "Selecione um squad file para comecar";
            lblStatus.Font = new Font("Segoe UI", 9);
            lblStatus.ForeColor = Line;
            lblStatus.Size = new System.Drawing.Size(460, 25);
            lblStatus.Location = new System.Drawing.Point(20, 225);

            // Creditos
            Label lblCredits = new Label();
            lblCredits.Text = "Feito para a comunidade modding FC 26";
            lblCredits.Font = new Font("Segoe UI", 8, FontStyle.Italic);
            lblCredits.ForeColor = Gold;
            lblCredits.Size = new System.Drawing.Size(460, 20);
            lblCredits.Location = new System.Drawing.Point(20, 265);
            lblCredits.TextAlign = ContentAlignment.MiddleCenter;

            this.Controls.Add(lblTitle);
            this.Controls.Add(btnOpen);
            this.Controls.Add(btnImport);
            this.Controls.Add(btnSave);
            this.Controls.Add(lblInGameName);
            this.Controls.Add(lblStatus);
            this.Controls.Add(lblCredits);

            this.Paint += ImportForm_Paint;
        }

        private void ImportForm_Paint(object sender, PaintEventArgs e)
        {
            // Borda dourada na janela
            using (Pen pen = new Pen(Gold, 3))
            {
                e.Graphics.DrawRectangle(pen, 1, 1, this.ClientSize.Width - 3, this.ClientSize.Height - 3);
            }
        }

        private Button CreateButton(string text, int x, int y)
        {
            Button btn = new Button();
            btn.Text = text;
            btn.Size = new System.Drawing.Size(210, 50);
            btn.Location = new System.Drawing.Point(x, y);
            btn.BackColor = Gold;
            btn.ForeColor = Ink;
            btn.FlatStyle = FlatStyle.Flat;
            btn.FlatAppearance.BorderColor = Ink;
            btn.FlatAppearance.BorderSize = 2;
            btn.Font = new Font("Segoe UI", 11, FontStyle.Bold);
            btn.Cursor = Cursors.Hand;
            btn.FlatAppearance.MouseOverBackColor = GoldDim;
            btn.FlatAppearance.MouseDownBackColor = Ink;
            btn.Enabled = false;
            btn.Paint += Button_Paint;
            return btn;
        }

        private void Button_Paint(object sender, PaintEventArgs e)
        {
            Button btn = (Button)sender;
            if (!btn.Enabled)
            {
                btn.BackColor = Line;
                btn.ForeColor = Line;
                btn.FlatAppearance.BorderColor = Line;
            }
            else
            {
                btn.BackColor = Surface;
                btn.ForeColor = Gold;
                btn.FlatAppearance.BorderColor = Gold;
            }
        }

        private void UpdateButtonStyle(Button btn)
        {
            if (btn.Enabled)
            {
                btn.BackColor = Gold;
                btn.ForeColor = Ink;
                btn.FlatAppearance.BorderColor = Ink;
                btn.Cursor = Cursors.Hand;
            }
            else
            {
                btn.BackColor = Line;
                btn.ForeColor = Line;
                btn.FlatAppearance.BorderColor = Line;
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
            {
                File.Copy(currentFile, backupPath);
            }

            try
            {
                lblStatus.Text = "Carregando squad...";
                lblStatus.ForeColor = Line;
                this.Refresh();

                careerFile = new FifaLibrary.CareerFile(currentFile, xmlPath);
                dataSets = careerFile.ConvertToDataSet();

                lblInGameName.Text = $"{Path.GetFileName(currentFile)} | {careerFile.InGameName}";
                lblStatus.Text = $"OK - {dataSets[0].Tables.Count} tabelas carregadas";
                lblStatus.ForeColor = Success;

                btnImport.Enabled = true;
                UpdateButtonStyle(btnImport);
                btnSave.Enabled = false;
                UpdateButtonStyle(btnSave);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erro ao abrir: {ex.Message}", "Erro", MessageBoxButtons.OK, MessageBoxIcon.Error);
                lblStatus.Text = $"Erro: {ex.Message}";
                lblStatus.ForeColor = Error;
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
                lblStatus.ForeColor = Line;
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
                lblStatus.Text = $"OK - {imported} tabelas, {totalRecords} registros importados";
                lblStatus.ForeColor = Success;
                btnSave.Enabled = true;
                UpdateButtonStyle(btnSave);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erro ao importar: {ex.Message}", "Erro", MessageBoxButtons.OK, MessageBoxIcon.Error);
                lblStatus.Text = $"Erro: {ex.Message}";
                lblStatus.ForeColor = Error;
            }
        }

        private void BtnSave_Click(object sender, EventArgs e)
        {
            try
            {
                lblStatus.Text = "Salvando squad...";
                lblStatus.ForeColor = Line;
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
                    lblStatus.Text = $"OK - Squad salvo e copiado para o jogo";
                }
                else
                {
                    lblStatus.Text = $"OK - Squad salvo em: {Path.GetFileName(currentFile)}";
                }

                lblStatus.ForeColor = Success;
                btnSave.Enabled = false;
                UpdateButtonStyle(btnSave);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erro ao salvar: {ex.Message}", "Erro", MessageBoxButtons.OK, MessageBoxIcon.Error);
                lblStatus.Text = $"Erro: {ex.Message}";
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