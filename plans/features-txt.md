# Plano: Implementar Features.txt

## 1. Passo a passo (home-steps)
- Adicionar `<div class="home-steps">` no `#setup` acima do setup-card
- 4 passos com número, ícone, título e descrição
- Grid de 4 colunas, linha divisória entre eles
- Estilo: `step-no` (numeral grande na cor accent), `step-txt` com título (display font) e descrição (body, muted)

## 2. Info boxes nos labels
- Cada label do setup ganha um `<span class="info-btn">ⓘ</span>` ao lado
- Ao clicar, abre um `.info-box` abaixo do label com a explicação
- Fecha ao clicar de novo ou ao clicar em outro
- Explicações já definidas no contexto

## 3. Input names refinado
- Verificar CSS atual de `#playerNames input`
- Ajustar font-family e cor se necessário (já deve estar com display font)

## Arquivos
- `index.html` — adicionar home-steps e info buttons nos labels
- `style.css` — estilos para home-steps e info-box
- `script.js` — lógica de toggle das info boxes