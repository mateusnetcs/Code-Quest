# Code Quest BNCC — Certificados

Site estático (HTML/CSS/JS puro, sem backend) para emissão e verificação dos
certificados de participação do programa **Code Quest BNCC**.

- `index.html` — lista fixa dos 34 participantes; gera e imprime um certificado
  (frente + verso com o conteúdo programático) para cada um, já com um QR Code
  de autenticação.
- `verificar.html` — página de destino do QR Code. Confirma se um número de
  certificado foi realmente emitido pelo sistema, consultando `dados-certificados.json`.
- `dados-certificados.json` — base estática com os números de certificado válidos.
- `relatorios/` — Diário da Expedição: análise completa dos registros reais do jogo
  (Turma01, Turma02 e o comparativo entre as duas), com dados atualizados até a
  última aula aplicada.

Hospedado via GitHub Pages, direto da raiz deste repositório.
