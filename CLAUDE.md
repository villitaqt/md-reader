# MD Reader — Contexto del proyecto

Visor de Markdown de escritorio para Windows 11. **Solo lectura**: sin editor, sin configuraciones de usuario, sin personalización. La app abre archivos `.md`, los renderiza correctamente (GFM completo) y permite navegar carpetas. Nada más.

## Stack

| Capa | Tecnología |
|------|-----------|
| Shell de escritorio | Tauri 2 (Rust) |
| Frontend | Vanilla TypeScript + Vite 6 |
| Renderizado MD | markdown-it 14 |
| Higienización | DOMPurify |
| Resaltado de código | highlight.js 11 |
| Tipos Rust → TS | `@tauri-apps/api` v2 |

No hay framework de UI (React, Vue, etc.). DOM vanilla deliberado: la app es simple y los módulos TS son pequeños.

## Estructura de archivos

```
md-reader/
├── index.html                  ← layout completo del shell
├── src/
│   ├── main.ts                 ← bootstrap, drag-drop, Ctrl+F
│   ├── render.ts               ← pipeline markdown-it → DOMPurify → #content
│   ├── sidebar.ts              ← árbol de carpetas, lazy readDir
│   ├── find.ts                 ← barra flotante de búsqueda
│   ├── styles.css              ← todos los estilos (shell + markdown renderizado)
│   └── global.d.ts             ← declaraciones de tipos para plugins sin types
├── src-tauri/
│   ├── src/lib.rs              ← Tauri Builder, plugins registrados
│   ├── capabilities/
│   │   └── default.json        ← permisos: dialog:default, fs:allow-read-text-file, fs:allow-read-dir
│   └── tauri.conf.json         ← ventana 1100×720, título "MD Reader"
└── package.json
```

## Layout del shell

```
┌─────────────────────────────────────────────┐
│  [Abrir archivo] [Abrir carpeta]         [⌕]│  ← #toolbar
├──────────────┬──────────────────────────────┤
│  #sidebar    │  #viewer                     │
│  (hidden si  │    <article id="content">    │
│  no hay      │      HTML renderizado        │
│  carpeta)    │    </article>                │
│              │                              │
└──────────────┴──────────────────────────────┘
```

El sidebar (`#sidebar`) tiene `class="hidden"` al inicio y solo aparece cuando el usuario abre una carpeta.

## Módulos TS — responsabilidades

### `render.ts`
Pipeline de renderizado central:
- `renderMarkdown(source)` → corre markdown-it + DOMPurify, devuelve HTML string
- `loadFile(path)` → `readTextFile` del fs plugin → renderiza → inyecta en `#content` → dispatch `file-load` event → scroll viewer a 0

La función `highlight` está separada del objeto `md` para evitar error TS7022 (referencia circular en initializer). `md` tiene anotación de tipo explícita `MarkdownIt` por la misma razón.

Configuración de markdown-it:
- `html: false` — no se permite HTML crudo en los .md (seguridad)
- `linkify: true`, `typographer: true`, `breaks: false`
- Plugins: task-lists (checkboxes read-only), anchor (sin permalink), footnote

### `sidebar.ts`
- Árbol construido con `<ul>/<li>`. Carpetas usan `<details>/<summary>` para colapsar.
- Lazy loading: los hijos de una carpeta se cargan en el evento `toggle` del `<details>`, solo la primera vez que se abre (`loaded` flag). Esto evita un `readDir` recursivo completo al abrir una carpeta grande.
- `joinPath(base, name)` usa `/` como separador — Tauri en Windows acepta ambos (`/` y `\`).
- El tipo `DirEntry` se infiere de `Awaited<ReturnType<typeof readDir>>[number]` para no acoplarse al tipo exportado del plugin.

### `find.ts`
- Barra flotante (`position: fixed`, top: 48px, right: 16px).
- Al buscar: `TreeWalker` recorre los `TextNode` de `#content`, envuelve coincidencias en `<mark class="hit">`. El hit activo lleva `class="active"` y hace `scrollIntoView({ block: "center" })`.
- `clearHits()`: reemplaza cada `<mark>` de vuelta a `TextNode` y llama `normalize()` para fusionar nodos adyacentes.
- Escucha el evento `file-load` en `#content` para limpiar hits automáticamente al cambiar de archivo.
- Atajos: Enter → siguiente, Shift+Enter → anterior, Esc → cerrar.

### `main.ts`
- Importa el CSS de highlight.js (`github-dark-dimmed`) y `styles.css`.
- Drag-and-drop vía `getCurrentWebview().onDragDropEvent` — API de Tauri 2. Filtra por extensión `.md`/`.markdown` y carga el primer archivo válido.
- Ctrl+F abre la find bar; Esc la cierra (delegado a `openFindBar`/`hideFindBar` de find.ts).

## CSS / tema

Tema oscuro por defecto mediante variables CSS en `:root`. El bloque `@media (prefers-color-scheme: light)` sobreescribe las variables para tema claro. Esto permite un cambio automático sin JS.

El CSS de highlight.js (`github-dark-dimmed`) se importa desde `main.ts` y se aplica en ambos temas — bloques de código con fondo oscuro en página clara es un patrón aceptado.

Max-width del área de contenido: `720px` centrada. Padding del viewer: `32px 24px`.

## Permisos Tauri (capabilities/default.json)

```json
"permissions": [
  "core:default",
  "opener:default",
  "dialog:default",
  { "identifier": "fs:allow-read-text-file", "allow": [{"path": "**"}] },
  { "identifier": "fs:allow-read-dir",       "allow": [{"path": "**"}] }
]
```

El scope `"**"` permite acceder a cualquier ruta que el usuario elija. No se restringen rutas específicas porque el usuario decide qué carpeta abrir.

## Decisiones y sus razones

**Sin framework UI**: la app tiene 4 módulos pequeños con interacción DOM directa. Agregar React solo añadiría peso y complejidad sin beneficio.

**Lazy loading en sidebar**: `readDir` recursivo completo puede bloquear en carpetas grandes. El toggle de `<details>` da mejor UX y carga solo lo que el usuario expande.

**find.ts usa TextNode walker, no `innerHTML`**: buscar/reemplazar en `innerHTML` con regex rompería las etiquetas HTML del renderizado. El walker opera en nodos de texto puros, es seguro.

**`html: false` en markdown-it**: aunque DOMPurify sanitizaría el HTML, desactivarlo en markdown-it es defensa en profundidad. No hay caso de uso para HTML crudo en un visor de lectura.

**No se usa el find nativo de WebView2**: el API nativo no es invocable programáticamente desde la app. La implementación propia también permite control total sobre el estilo y comportamiento.

**DirEntry type via inferencia**: `Awaited<ReturnType<typeof readDir>>[number]` en lugar de importar el tipo del plugin — evita romper si el plugin cambia cómo exporta el tipo.

## Estado actual

- `npm run build` pasa limpio (tsc + vite build).
- `npx tsc --noEmit` sin errores.
- Pendiente: primera ejecución real con `npm run tauri dev`.
- Bundle JS ~1.1 MB minificado (highlight.js es el mayor contribuyente). Aceptable para desktop.

## Comandos frecuentes

```bash
# Desarrollo con hot-reload
npm run tauri dev

# Solo chequeo de tipos
npx tsc --noEmit

# Build de producción frontend
npm run build

# Build completo (instalador)
npm run tauri build
```
