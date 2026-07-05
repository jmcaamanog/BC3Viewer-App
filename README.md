# BC3 Viewer Multiplataforma (Windows & Android)

Este repositorio contiene la versión autónoma, multiplataforma y 100% offline del **BC3 Viewer (Visualizador Premium de Presupuestos FIEBDC-3)**.

El objetivo de este proyecto es empaquetar y distribuir el visualizador web original como aplicaciones nativas de escritorio (**Windows**) y dispositivos móviles (**Android**), mejorando la privacidad, eliminando la necesidad de servidores locales (PHP) y habilitando el uso offline en cualquier lugar.

> [!IMPORTANT]
> **🚀 DESCARGA DIRECTA DE PROGRAMAS:**
> Si no quieres compilar el código tú mismo y solo quieres utilizar la aplicación, puedes descargar directamente los ejecutables listos para usar:
> *   **Windows Installer (.exe):** [BC3_Viewer_Windows_Installer.exe](file:///c:/Users/Jose/OneDrive/1_HOBBIES/004_PROYECTOS/000_proyectos/083_PROGRAMACION%20PYTHON/000_GITHUB/000_otros/rafa/BC3Viewer-App/PROGRAMAS/BC3_Viewer_Windows_Installer.exe)
> *   **Windows Package (.msi):** [BC3_Viewer_Windows_Installer.msi](file:///c:/Users/Jose/OneDrive/1_HOBBIES/004_PROYECTOS/000_proyectos/083_PROGRAMACION%20PYTHON/000_GITHUB/000_otros/rafa/BC3Viewer-App/PROGRAMAS/BC3_Viewer_Windows_Installer.msi)
> *   **Android App (.apk):** [BC3Viewer-App.apk](file:///c:/Users/Jose/OneDrive/1_HOBBIES/004_PROYECTOS/000_proyectos/083_PROGRAMACION%20PYTHON/000_GITHUB/000_otros/rafa/BC3Viewer-App/BC3Viewer-App.apk) 📱 *(¡Nueva versión compilada con icono, splash screen y actualizaciones automáticas online!)*
> *   También dispones de un presupuesto de ejemplo para probarlo inmediatamente en la carpeta **[/PROGRAMAS/BC3 EJEMPLO](file:///c:/Users/Jose/OneDrive/1_HOBBIES/004_PROYECTOS/000_proyectos/083_PROGRAMACION%20PYTHON/000_GITHUB/000_otros/rafa/BC3Viewer-App/PROGRAMAS/BC3%20EJEMPLO/)**.
>
> **🌐 ACCESO DIRECTO EN LA WEB (Nube):**
> Puedes usar la versión web más reciente directamente en tu navegador sin instalar nada en:
> 👉 **[Visualizador BC3 Online (GitHub Pages)](https://jmcaamanog.github.io/BC3Viewer-App/www/index.html)**


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
    *   Sincronizamos todos los activos de la carpeta `/www` al directorio nativo de assets de Android para un funcionamiento 100% sin conexión a internet.
    *   Listo para compilarse como app nativa en formato `.apk` compatible con móviles y tabletas Android.
4.  **Optimización Móvil Avanzada y Actualizaciones Online (OTA):**
    *   **Diseño Responsive para Móviles:** Convertimos la rejilla de visualización rígida en un diseño adaptativo de tarjetas multi-línea (código, descripción y valores alineados) que evita solapamientos y cortes de texto.
    *   **Botonera Emoji Compacta:** Ocultamos las etiquetas de texto de los botones de herramientas principales en móviles, agrupándolos en una única fila horizontal de botones tipo emoji (`🌳`, `📊`, `📅`, etc.) táctiles y simétricos.
    *   **Actualizaciones en Caliente (OTA):** Integramos el plugin `@capgo/capacitor-updater` en modo manual para realizar búsquedas silenciosas en segundo plano. Si hay conexión a internet, la aplicación descarga e instala la última versión web de forma transparente directamente desde tu GitHub Pages sin requerir reinstalación de APK.
    *   **Identidad Visual Nativa:** Generamos un conjunto completo de iconos adaptativos y pantallas de carga personalizados para Android utilizando la utilidad `@capacitor/assets`.

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

---

## Sobre el Proyecto Original

BC3php fue creado por **System Arquitectura** (https://www.systemarquitectura.com), empresa con sede en Malaga especializada en proyectos de arquitectura industrial, logistica, corporativa y residencial.

Esta version ampliada mantiene todos los creditos del autor original y anade funcionalidades avanzadas orientadas al uso profesional diario del Arquitecto Tecnico y Director de Obra.

## 👨‍💻 Autor de la versión mejorada

Jose Manuel Caamaño González | Arquitecto Técnico & BIM Manager.
Digital Product Lead | ConTech & Digital Twin SaaS | BIM, Energy Modeling & Sustainability | Data Analytics (SQL, Power BI)

Hecho con código y café desde A Coruña. ☕

Jose Manuel Caamaño González | [LinkedIn](https://www.linkedin.com/in/jmcaamanog/)
