# BC3 Viewer Multiplataforma (Windows & Android)

Este repositorio contiene la versión autónoma, multiplataforma y 100% offline del **BC3 Viewer (Visualizador Premium de Presupuestos FIEBDC-3)**.

El objetivo de este proyecto es empaquetar y distribuir el visualizador web original como aplicaciones nativas de escritorio (**Windows**) y dispositivos móviles (**Android**), mejorando la privacidad, eliminando la necesidad de servidores locales (PHP) y habilitando el uso offline en cualquier lugar.

---

## 🛠️ ¿Qué se ha hecho en este repositorio?

1.  **Migración Arquitectónica a Cliente Puro (Offline):**
    *   **Portado del Parser:** Tradujimos el parser original escrito en PHP (`BC3Parser.php`) a JavaScript del lado del cliente (`BC3Parser.js`). Toda la lectura e interpretación de registros (`~V`, `~C`, `~D`, `~M`, `~T`) se ejecuta ahora localmente.
    *   **Lectura de archivos local:** Modificamos `app.js` para usar la API `FileReader` y `TextDecoder` del navegador. El archivo se analiza directamente en la memoria del dispositivo con detección automática de codificación (ANSI, Windows-1252, UTF-8, etc.), eliminando llamadas a servidor externo (`upload.php`).
    *   **Conversión a HTML estático:** Convertimos `index.php` en `index.html` eliminando todas las cabeceras y sentencias PHP.
2.  **Integración de Soporte de Escritorio (Windows con Tauri):**
    *   Inicializamos e integramos **Tauri** (`src-tauri/`).
    *   Configuramos el ejecutable nativo para servir el directorio web local `/www` sin ningún servidor de desarrollo intermedio.
    *   Compilamos e instalamos las herramientas para generar paquetes de instalación `.exe` (NSIS) y `.msi` (WiX) ultra-ligeros (1.6 MB).
3.  **Integración de Soporte Móvil (Android con Capacitor):**
    *   Inicializamos **Capacitor** e integramos el soporte de plataforma Android (`android/`).
    *   Configuramos la sincronización de activos de la carpeta `/www` al directorio nativo de assets de Android para un funcionamiento 100% sin conexión a internet.
    *   Compilamos con éxito la app nativa en formato `.apk` (4.8 MB) compatible con móviles y tabletas Android.

---

## 📁 Estructura del Directorio

*   **`/www`**: Código fuente compartido de la aplicación web estática.
    *   `index.html`: La interfaz unificada.
    *   `style.css`: Estilos visuales adaptativos (incluye el Gantt, Curva S, y Modo Oscuro).
    *   `BC3Parser.js`: Analizador de FIEBDC-3 portado a JavaScript.
    *   `app.js`: Lógica interactiva completa, certificaciones, Gantt, exportadores locales y carga local de ficheros.
    *   *Librerías locales:* `chart.min.js`, `xlsx.full.min.js`, `jspdf.umd.min.js` y `jspdf.plugin.autotable.min.js` (cargadas en local para garantizar el funcionamiento offline).
*   **`/src-tauri`**: Lógica de envoltura nativa en Rust para compilar la aplicación de Windows.
*   **`/android`**: Código de la aplicación nativa de Android autogenerado y sincronizado por Capacitor.
*   `package.json`: Configuración de dependencias de Node.js y scripts de compilación.

---

## 🚀 Cómo Compilar e Instalar

### Requisitos Iniciales
*   Tener instalado [Node.js](https://nodejs.org/).
*   Ejecutar `npm install` en la raíz del proyecto para descargar las dependencias de empaquetado.

### 💻 Construir para Windows (Tauri)
1.  **Prerrequisitos:** Instalar [Rust](https://rustup.rs/) y tener las *Microsoft C++ Build Tools* (incluidas en la carga de "Desarrollo para el escritorio con C++" del instalador de Visual Studio).
2.  **Probar en desarrollo:**
    ```bash
    npm run tauri:dev
    ```
3.  **Compilar instalador final:**
    ```bash
    npm run tauri:build
    ```
    *Los instaladores se guardarán en `src-tauri/target/release/bundle/msi/` y `/nsis/`.*

### 📱 Construir para Android (Capacitor)
1.  **Prerrequisitos:** Instalar [Android Studio](https://developer.android.com/studio) y configurar el SDK de Android.
2.  **Sincronizar cambios web:** *(Cada vez que edites algo en `/www` antes de compilar)*:
    ```bash
    npx cap sync
    ```
3.  **Abrir en Android Studio:**
    ```bash
    npx cap open android
    ```
4.  **Generar APK:**
    *   Desde Android Studio ve a: **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
    *   Una vez compilado, haz clic en **Locate** en el aviso emergente para obtener tu archivo `app-debug.apk`.
