# Código Web Compartido (Frontend)

Esta carpeta contiene la aplicación web estática que sirve como núcleo para todas las plataformas (Windows, Android, Web).

## ⚠️ Regla de Oro de Mantenimiento

Para evitar que tu código se desincronice:
1.  **Cualquier cambio estético, corrección de fallos o nueva funcionalidad debe realizarse en esta carpeta `/www`** (modificando `app.js`, `style.css` o `index.html`).
2.  **No modifiques directamente** los archivos generados dentro de las carpetas de Android Studio (`/android/`) o Tauri (`/src-tauri/`), ya que esas carpetas se sobrescriben o se nutren de esta carpeta `/www`.

## Sincronización

*   **Para Android:** Cada vez que edites algo en `/www`, ejecuta en la terminal:
    ```bash
    npx cap sync
    ```
    Esto copiará de forma automática las actualizaciones a la carpeta nativa de Android Studio.
*   **Para Windows:** Tauri lee directamente de esta carpeta `/www`, por lo que los cambios se reflejarán inmediatamente la próxima vez que ejecutes `npm run tauri:dev` o `npm run tauri:build`.

---

## Estructura de Archivos

*   `index.html`: Estructura HTML de la interfaz unificada del visualizador.
*   `style.css`: Estilos para el árbol, dashboard, diagramas de Gantt, curva S y modo oscuro.
*   `BC3Parser.js`: Analizador de archivos `.bc3` (FIEBDC-3) escrito en JavaScript local.
*   `app.js`: Lógica principal del negocio (gestión de presupuestos, certificaciones, planning Gantt, exportaciones offline).
