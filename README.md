# Extensión de Owlbear Rodeo: La Mina Perdida de Phandelver

Extensión propia para la sala de Owlbear Rodeo de la campaña. Por ahora tiene el **contador de XP de la mesa**.
El plan completo (botín, montar escenas) está en [PLAN.md](PLAN.md).

## Qué hace el contador de XP

- Muestra la XP y el nivel de los 4 personajes. **Todos lo ven; solo el máster puede cambiar algo.**
- **Sumar combate:** escribes la XP total de los enemigos y se divide entre los personajes presentes
  (por defecto los 4), redondeando hacia arriba.
- **Hitos H1-H13:** botón «Apuntar» en cada uno; da la XP fija a cada personaje y no se puede apuntar dos veces.
  Los jugadores solo ven «Hito 1», «Hito 2»…; el máster puede pegar sus notas de cada hito, que se guardan solo en su navegador.
- **Empezar de cero:** borra XP e hitos (se puede deshacer).
  H10 sube a 2.700 a quien tenga menos; H13 sube a 6.500 y cierra la aventura.
- **Tope de nivel 5:** mientras «Nivel 5 bloqueado» esté así, nadie pasa de nivel 4 (la XP se sigue sumando).
- Avisa de quién sube de nivel (en la ventana y con una notificación de Owlbear).
- **Deshacer la última** anotación, por si te equivocas. También puedes cambiar a mano la XP o el nombre de cada personaje.
- Los datos se guardan en la sala de Owlbear (no en tu PC), así que siguen ahí la próxima sesión.

## Probarlo en tu PC (antes de publicarlo)

Necesitas Node.js (ya lo tienes). En una terminal, dentro de esta carpeta:

```bash
npm install
```

```bash
npm run dev
```

Deja esa terminal abierta. Luego, en Owlbear Rodeo:

1. Entra en tu sala (como máster).
2. Arriba a la izquierda, pulsa el botón de **Extensiones** (el icono de la pieza de puzle) → **Add Extension** (añadir extensión).
3. Pega esta dirección y confirma: `http://localhost:5173/manifest.json`
4. Aparece un icono de estrella arriba a la izquierda: «XP de la mesa». Púlsalo.

Solo funciona mientras `npm run dev` esté en marcha y **solo en tu PC**: tus jugadores no la verán hasta que se publique
en una web pública (GitHub Pages). Para quitarla, en la misma ventana de Extensiones bórrala de la lista.

Truco: si abres `http://localhost:5173` en un navegador normal, ves una demo sin guardar; con
`http://localhost:5173/?rol=jugador` ves lo que verían los jugadores.

## Versión publicada (GitHub Pages)

Cada cambio en `main` se publica solo (pestaña *Actions* de GitHub). La dirección para Owlbear es:

`https://javierfernandezherrera888-glitch.github.io/owlbear-campana/manifest.json`

Se añade igual (paso 3) y la ven todos los de la sala, sin tener nada encendido en tu PC.

**Sin spoilers:** este repositorio es público, así que no lleva los textos de los hitos ni nombres de la trama.
El máster pega sus notas en «Tus notas de los hitos» (se guardan solo en su navegador). La lista de notas
está en `privado/notas-hitos.txt`, carpeta que nunca se sube a GitHub.

## Para quien programe

- `npm test` pasa las pruebas de la lógica de XP (`src/xp.js`, sin dependencias de Owlbear).
- `npm run build` genera la web en `dist/`.
- Datos: una sola clave de metadatos de sala, `es.phandelver.campana/xp` (la sala entera tiene 16 kB para todas las extensiones).
