## Objetivo
Transformar a seção “Próximas Aventuras” em um bloco de altíssima conversão com hierarquia clara, CTA primário destacado, estética moderna alinhada à paleta da marca e melhor legibilidade, especialmente no mobile.

## Ajustes de Cor e Gradiente
- Substituir o overlay preto por um gradiente brand: `from-[#0B1420]/70 via-[#0B1420]/20 to-transparent` para manter contraste sem “apagar” a foto.
- Aplicar nas duas sobreposições:
  - Destaque: `src/pages/LandingPage.jsx:416`
  - Cards da grade: overlay atual `from-black/75 to-transparent` → atualizar para o novo gradiente.

## CTA de Altíssima Conversão
- Re-hierarquizar ações: “Quero ir” vira CTA primário; “Quero saber mais” vira ação secundária.
- Mover a animação contínua (scale/pulse) do “Quero saber mais” para o “Quero ir”.
  - “Quero ir”: manter `Button` e envolver com `motion.div`, com `animate` sutil (pulse lento), `whileHover={{ scale: 1.03 }}`, `whileTap={{ scale: 0.98 }}`.
  - “Quero saber mais”: remover animação looping, manter apenas hover (leve escala/opacidade) com estilo outlined.
- Modernizar o preenchimento do CTA primário: `bg-gradient-to-r from-[#ECAE62] to-[#FFD27A] text-[#0B1420]` (mantendo a identidade), com `ring`/`shadow` suave para destaque.
- Locais:
  - Destaque “Quero ir” e “Quero saber mais”: `src/pages/LandingPage.jsx:424–434`
  - Cards da grade: `src/pages/LandingPage.jsx:459–469`

## Mobile-First e Altura dos Cards
- Reduzir alturas de imagens para diminuir a verticalização no mobile:
  - Destaque: `h-80 md:h-96` → `h-64 md:h-96`.
  - Grade: `h-40 sm:h-64` → `h-36 sm:h-56`.
- Compactar padding tipografia no mobile:
  - `p-5 sm:p-6` → `p-4 sm:p-6`.
  - Títulos: `text-xl sm:text-2xl` → `text-lg sm:text-2xl`.
- Manter botões `w-full sm:w-auto` e disposição `flex-col sm:flex-row` para uso prático no mobile.

## Microcópia e Sinais de Urgência (opcional)
- Ajustar a faixa informativa para reforçar escassez/urgência (ex.: “Vagas limitadas — Reserve agora”).
- Manter contraste: fundo `#ECAE62`, texto `#0B1420`.

## Consistência Visual
- Preservar o estilo glass (`bg-white/10`, `backdrop-blur-*`, `border-white/10`) e sombras já usadas.
- Harmonizar ícones `lucide-react` nas metas (MapPin/CalendarDays) com opacidade/cores mais sutis.

## Testes e Validação
- Verificar responsividade em breakpoints sm/md/lg e a leitura de textos sobre imagens após o novo gradiente.
- Testar estados de hover/tap dos CTAs e garantir foco/teclado acessíveis.
- Checar contraste (AA) entre texto e fundo nos novos overlays.