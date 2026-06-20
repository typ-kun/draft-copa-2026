# Plano: Reconstruir bracket visual com CSS Grid

## Problema atual
`renderizarBracketHLTV` calcula `margin-top: Npx` manualmente para cada card via `topY()`. Isso é posicionamento individual por jogo — o usuário proibiu.

## Solução: CSS Grid com span natural

Cada coluna do bracket vira um CSS Grid com `grid-template-rows: repeat(TOTAL_ROWS, 1fr)`. Cards fluem naturalmente no grid usando `grid-row: span N`.

### Cálculo do número de linhas

```
Fase inicial   | Cards/lado | Span por card | Total de linhas
round32        | 8          | 2             | 16
round16        | 4          | 4             | 16
quarterfinals  | 2          | 8             | 16
semifinals     | 1          | 16            | 16
```

Regra: `totalRows = cardsNaPrimeiraFase * 2` (sempre 16 para round32)

### Como os cards se posicionam (left side, 16 linhas)

```
round32 (span 2):   round16 (span 4):  quarter (span 8):  semi (span 16):
┌──────┐ rows 1-2   ┌──────────┐       ┌──────────────┐   ┌──────────────┐
│card 0│            │card 0    │       │card 0        │   │card 0        │
└──────┘ rows 3-4   │          │       │              │   │              │
┌──────┐            │          │       │              │   │              │
│card 1│            └──────────┘       └──────────────┘   └──────────────┘
└──────┘ rows 5-6   ┌──────────┘
┌──────┐            │card 1    │
│card 2│            │          │
└──────┘            │          │
...                 └──────────┘
```

### Vantagens

1. **Zero posicionamento manual** — CSS Grid coloca cada card automaticamente
2. **Espaçamento natural** — `1fr` distribui igualmente
3. **Alinhamento perfeito** — round16[0] fica naturalmente centrado entre round32[0] e round32[1]
4. **Responsivo** — grid ajusta automaticamente

### Conectores SVG

Após o DOM renderizar, `desenharConexoesHLTV()` lê posições via `getBoundingClientRect()` e desenha paths:

```svg
<path class="bracket-hltv-line" d="M ${cardA.right} ${yA} L ${midX} ${yA} L ${midX} ${yMerge} L ${midX} ${yTarget} L ${target.left} ${yTarget}" />
<path class="bracket-hltv-line" d="M ${cardB.right} ${yB} L ${midX} ${yB} L ${midX} ${yMerge}" />
```

`stroke-width: 1.5px`, `fill: none`, `stroke: var(--line)`.

### Arquivos modificados

**script.js** — Substituir `renderizarBracketHLTV`:
- Remover `topY()` e `margin-top` inline
- Adicionar `totalRows = Math.pow(2, fases.length)` no cálculo
- Cada card recebe `style="grid-row: span ${span}"` via função `calcularSpan`
- Manter `desenharConexoesHLTV()` idêntico (já usa getBoundingClientRect)

**style.css** — Modificar `.bracket-hltv-col`:
- `display: flex` → `display: grid`
- `grid-template-rows: repeat(var(--rows, 1), 1fr)`
- Cards sem margin-top, sem padding extra
- Ajustar `.bracket-hltv-card` para altura compacta (padding reduzido)