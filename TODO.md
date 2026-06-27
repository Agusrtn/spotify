# TODO - Radio “real” multiusuario sincronizada (pause/seek/skip) + Visualizer/artists

## Paso 1 (Backend): estado global de radio
- [ ] Editar `backend/models/RadioStation.js` agregando:
  - `isPaused: Boolean`
  - `pauseAt: Date|null`
  - `pauseOffsetSeconds: Number`
- [ ] Actualizar `advanceRadioToNext` para resetear pause fields y setear `currentSongStartedAt = new Date()`.

## Paso 2 (Backend): endpoints admin globales
- [ ] Crear endpoints en `backend/server.js`:
  - `POST /admin/radio/pause`
  - `POST /admin/radio/play`
  - `POST /admin/radio/seek` (sets seek/pauseOffsetSeconds)
  - `POST /admin/radio/skip` (alias a advance)
- [ ] Ajustar `populateRadioStation` / `GET /radio/sync` para calcular:
  - `currentSongElapsedSeconds` usando `isPaused` y `pauseOffsetSeconds` (si pausado) o `now - currentSongStartedAt` (si no).

## Paso 3 (Frontend): controles globales para radio
- [ ] Editar `frontend/src/App.js`:
  - [ ] Reemplazar `togglePlay` para `playMode==='radio'`:
    - [ ] Si no es admin: no hace nada
    - [ ] Admin llama endpoints pause/play
  - [ ] En `startRadioSync`, en vez de solo detectar cambio de canción, sincronizar también:
    - [ ] pausa/reanudar con `station.isPaused`
    - [ ] `audio.currentTime = station.pauseOffsetSeconds` si pausado
    - [ ] reproducir desde el playhead calculado
  - [ ] Añadir handler admin para seek (desde UI) llamando `/admin/radio/seek`.

## Paso 4 (Frontend UI): barra seek en modo radio (solo admin)
- [ ] Editar `frontend/src/components/Layout.jsx`:
  - [ ] Permitir `seek` cuando `playMode==='radio'` y `user.role==='admin'`.
  - [ ] Pasar prop callback para seek (p.ej. `onSeek`) hacia `App.js`.

## Paso 5: arreglar Visualizer “raro”
- [ ] Corregir `frontend/src/components/SongVisualizer.jsx` (hay código truncado/defectuoso en el render) para que dibuje con WebAudio real cuando haya `audioRef`.
- [ ] Asegurar que el visualizer se alimenta con el audio que realmente está sonando en el `<audio>`.

## Paso 6: “artistas suben canciones y no aparecen”
- [ ] Revisar flujo de `GET /songs?artist=` y/o filtros del frontend (si oculta `isScheduled/isPublished` o si la normalización falla con `audioUrl/visualizerUrl`).
- [ ] Verificar que el backend publica canciones programadas automáticamente (`publishScheduledContent`) y que los endpoints devuelven `isPublished:true` cuando corresponde.
