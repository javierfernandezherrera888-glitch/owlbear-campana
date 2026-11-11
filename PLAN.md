# Plan: extensión de Owlbear Rodeo para «La Mina Perdida de Phandelver»

Una extensión ligera (SDK oficial de Owlbear + Vite para empaquetar, sin frameworks de interfaz)
que se añade a la sala desde una URL pública (GitHub Pages).

## Dónde se guardan los datos

- En los **metadatos de la sala** (`OBR.room.setMetadata`), bajo una sola clave
  `es.phandelver.campana/xp`. Se ven en todas las escenas y los ven todos los jugadores.
- Límite: **16 kB para toda la sala**, compartido con otras extensiones. Por eso se guarda poco:
  4 personajes, los hitos hechos, si el nivel 5 está desbloqueado y las últimas 12 anotaciones.
- Solo el máster ve los botones (`OBR.player.getRole() === "GM"`). Los jugadores ven la tabla.

## Piezas (un issue y un PR cada una)

1. **Contador de XP** (este PR)
   - XP de cada personaje (nombre editable), nivel según 300 / 900 / 2.700 / 6.500.
   - «Sumar combate»: XP total de los enemigos ÷ personajes presentes (por defecto los 4), redondeando hacia arriba.
   - Hitos H1-H13 con su XP fija por personaje; cada uno se marca una sola vez.
   - Redes de seguridad: H10 sube a 2.700 a quien tenga menos; H13 sube a 6.500.
   - Tope: nadie pasa de nivel 4 hasta desbloquear el nivel 5 al final de la aventura (la XP se sigue apuntando). Cerrar H13 lo desbloquea solo.
   - Aviso de quién sube de nivel, y botón «Deshacer» para la última anotación.
   - Pruebas automáticas de toda la lógica (`npm test`).
2. **Registro de botín**: quién lleva cada objeto y el oro del grupo; lista de `07 Botín` como sugerencias.
3. **Montar escena**: elegir AE1-AE6 y colocar mapa y fichas de enemigos en la escena actual.
   Necesita publicar los mapas de AE y las fichas (ver aviso de emojis abajo).

## Aviso sobre las fichas (para la pieza 3)

Las fichas PNG llevan emojis dibujados con la fuente **Segoe UI Emoji de Microsoft**. Esa fuente
tiene licencia de Microsoft: usarla en tu PC es normal, pero publicar imágenes hechas con ella en una
web pública (GitHub Pages) es redistribuir parte de la fuente, algo que la licencia no permite de forma
clara. Para una web que solo usa tu mesa el riesgo práctico es bajo, pero lo limpio es regenerar las
fichas con emojis de licencia libre (por ejemplo Noto Emoji de Google o Twemoji, ambas libres) antes de publicarlas.
Los mapas oficiales de Wizards of the Coast (`03 Mapas oficiales`) **no se publican nunca**.

## Alojamiento

GitHub Pages en un repositorio **público** (Pages gratis exige repositorio público). Nada se publica sin tu OK.
