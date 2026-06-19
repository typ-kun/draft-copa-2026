# Plano: Fase de Seleção de Países

## Objetivo
Antes do draft de jogadores, cada participante escolhe 1 seleção nacional (país) em ordem circular. Depois que todos escolhem, o draft normal começa.

## O que muda

### `index.html`
- Nova `<div id="countrySelection" style="display:none">` entre `#setup` e `#draftArea`
  - Header: "Seleção de Países" + indicador de turno (quem está escolhendo)
  - Container `<div id="countryGrid">` populado dinamicamente
  - Botão "Iniciar Draft" (só aparece quando todos escolheram)

### `style.css`
- `.country-section` — full-screen, centralizado, max-width 720px
- `.country-grid` — grid responsivo, auto-fill minmax(120px, 1fr), gap 12px
- `.country-card` — card com bandeira grande + nome do país
  - Estado normal: surface-2, hard-shadow, cursor pointer
  - Hover: accent background, texto branco
  - Selecionado (já escolhido por alguém): opaco, cursor not-allowed
- `.country-turn` — indicador de turno, estilo do header

### `script.js`
- Nova variável `paisParticipante = []` — `paisParticipante[i]` = país escolhido pelo participante i
- Extrair países únicos de `jogadoresBase` em `iniciarSelecaoPaises()`

**Modificar `iniciarDraft()`**:
- Cortar ANTES de mostrar `#draftArea`
- Chamar `iniciarSelecaoPaises()` ao invés

**Nova função `iniciarSelecaoPaises()`**:
1. `paisParticipante = []` (array vazio, tamanho = número de participantes)
2. `selecoesDisponiveis` = países únicos extraídos do JSON (usando Set + map)
3. Esconder `#setup`, mostrar `#countrySelection`
4. `indiceSelecao = 0` — primeiro participante (ordem original da lista, não embaralhada, já que o usuário pediu circular)
5. Chamar `renderizarGridPaises()`

**Nova função `renderizarGridPaises()`**:
1. Limpar grid
2. Para cada país em `selecoesDisponiveis`:
   - Criar `.country-card` com bandeira + nome
   - Se já foi selecionado por alguém → classe `.selected`, desabilitado
   - Se está disponível → click handler chama `selecionarPais(país)`
3. Atualizar indicador de turno com nome do participante atual

**Nova função `selecionarPais(pais)`**:
1. `paisParticipante[indiceSelecao] = pais`
2. Remover país de `selecoesDisponiveis`
3. Avançar `indiceSelecao++`
4. Se `indiceSelecao >= participantes.length` → todos escolheram → chamar `prosseguirParaDraft()`
5. Senão → `renderizarGridPaises()` (próximo participante)

**Nova função `prosseguirParaDraft()`**:
1. Esconder `#countrySelection`
2. Mostrar `#draftArea`
3. `jogadorAtual = participantesAtivos[0]`
4. `pickAtual = 1`
5. `direcaoSnake = 1`
6. `atualizarRefreshes()`, `atualizarStatus()`, `gerarPool()`

## Visual
- Grid de cards no estilo Panini: fundo branco, borda preta, sombra dura
- Bandeira grande (40x30) + nome do país em Anton
- Hover vermelho (accent) igual aos cards do pool
- País já escolhido fica 40% opaco com checkmark
- Header do turno: "Vez de: [Nome]" em destaque

## Verificação
- Abrir `index.html`, configurar 3 jogadores
- Ver se a tela de seleção de países aparece entre o setup e o draft
- Cada jogador escolhe 1 país (circular: J1 → J2 → J3)
- Ver se países escolhidos ficam desabilitados
- Após todos escolherem, o draft de jogadores inicia normalmente