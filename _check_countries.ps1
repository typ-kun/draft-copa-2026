$json = Get-Content 'C:\Users\guilh\OneDrive\Documentos\draft-copa-do-mundo-2026\icons_heroes.json' -Raw | ConvertFrom-Json
$paisesJson = $json | ForEach-Object { $_.pais } | Sort-Object -Unique
$paisesJson | ForEach-Object { Write-Host $_ }
