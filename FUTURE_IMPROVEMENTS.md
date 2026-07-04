# RoadMap: Sugerencias y Mejoras Pendientes (Optimización Móvil y Android)

Este documento sirve como registro interno de sugerencias, comentarios del usuario y áreas de mejora identificadas para ser abordadas en próximas sesiones de desarrollo.

---

## 📱 1. Interfaz Visual en Móviles (Pulido y "Look & Feel")
En smartphones pequeños, algunas pantallas y listas todavía tienen un aspecto de "prototipo" en comparación con la experiencia fluida en tabletas.
*   **Modales y Diálogos Adaptativos:** 
    *   Rediseñar los modales de **Dashboard**, **Gantt / Planning**, **Certificaciones** y **Comparar** para que no utilicen scroll horizontal ni se corten en pantallas verticales.
    *   Hacer que las tablas del Gantt se plieguen en acordeones táctiles o tarjetas en móvil.
*   **Mejoras de Espaciado Dinámico:**
    *   Pulir aún más los paddings y márgenes del árbol en dispositivos con resolución menor a 360px de ancho.
    *   Ajustar el tamaño de los badges de la ruta crítica (`⚡ CRÍTICO`) para que se acoplen mejor al código de la partida sin ocupar demasiado espacio.
*   **Transiciones y Gestos:**
    *   Implementar transiciones de deslizamiento lateral (swipe) al navegar entre niveles del presupuesto (drill-down) para dar sensación de aplicación móvil nativa.

---

## ✏️ 2. Usabilidad del Editor en Pantallas Táctiles
*   **Gestión del Teclado Virtual:**
    *   Optimizar la edición de textos y precios para que al pulsar el lápiz (`✏️`) el teclado del sistema no desplace de forma tosca el elemento editado fuera de la pantalla.
    *   Hacer que los botones de confirmación (`✔️`) y cancelación (`❌`) sean un poco más grandes y fáciles de tocar con el dedo en pantallas de 5.5 pulgadas o menores.
*   **Acciones Rápidas (Long Press / Doble Tap):**
    *   Añadir la posibilidad de abrir detalles de la partida manteniendo pulsada la fila (Long Press), como alternativa al drill-down directo.

---

## 🤖 3. Funciones Nativas de la Aplicación Android (Capacitor)
*   **Exportación y Descargas Locales:**
    *   Actualmente, la exportación a PDF y Excel utiliza las funciones de descarga web estándar del navegador. En Android, es necesario integrar plugins como `@capacitor/filesystem` y `@capacitor/share` para permitir al usuario:
        *   Guardar los archivos `.bc3`, `.xlsx` o `.pdf` directamente en la carpeta de *Descargas* del teléfono.
        *   Compartir el PDF o Excel generado directamente por WhatsApp, Gmail, etc.
*   **Guardado Automático en el Dispositivo:**
    *   Implementar almacenamiento persistente local (`Preferences` de Capacitor) para que el último archivo cargado se mantenga abierto automáticamente al reiniciar la aplicación sin tener que seleccionarlo de nuevo.
*   **Seguridad y Control de Acceso (Contraseñas):**
    *   **Acceso Offline (Local):** Permitir configurar un PIN o contraseña de acceso local (guardado en el dispositivo usando almacenamiento seguro o Keychain/Keystore) para bloquear el acceso a la app cuando se abre offline.
    *   **Acceso Online (Remoto):** Integrar un sistema de autenticación (ej. Firebase Auth, Supabase, o API propia) para validar credenciales en línea antes de dar acceso a los presupuestos.
*   **Actualizaciones Online (Over-the-Air / OTA):**
    *   **Actualización en caliente:** Implementar un sistema de "Live Updates" (como Capgo o Ionic Appflow) para actualizar el código web (HTML, JS, CSS) directamente desde el servidor sin requerir que el usuario reinstale un nuevo archivo APK.
    *   **Verificación de versión APK:** Desarrollar una API de comprobación de versión que avise al usuario dentro de la app si hay una nueva versión del APK compilado disponible para descargar.
*   **Personalización e Identidad Visual (Icono y Pantalla de Carga):**
    *   Generar un conjunto completo de iconos de launcher nativos (Mipmaps para Android) y splash screens personalizados utilizando la utilidad `@capacitor/assets`, sustituyendo los iconos predeterminados de Capacitor.
