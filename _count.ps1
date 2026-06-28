$data = Get-Content 'C:\Users\guilh\OneDrive\Documentos\draft-copa-do-mundo-2026\icons_heroes.json' -Raw | ConvertFrom-Json
$total = $data.Count
$icons = ($data | Where-Object { $_.tipo -eq 'icon' }).Count
$heroes = ($data | Where-Object { $_.tipo -eq 'hero' }).Count
Write-Host "Total: $total"
Write-Host "Icons: $icons"
Write-Host "Heroes: $heroes"

$jogadores = Get-Content 'C:\Users\guilh\OneDrive\Documentos\draft-copa-do-mundo-2026\jogadores_final.json' -Raw | ConvertFrom-Json
Write-Host "Jogadores normais: $($jogadores.Count)"
Write-Host "Total disponiveis (jogadores + icons/heroes): $($jogadores.Count + $total)"
