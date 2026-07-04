# BC3 Viewer Multiplataforma (Windows / Android: PRÓXIMAMENTE)

Este repositorio contiene la versión autónoma, multiplataforma y 100% offline del **BC3 Viewer (Visualizador Premium de Presupuestos FIEBDC-3)**.

El objetivo de este proyecto es empaquetar y distribuir el visualizador web original como aplicaciones nativas de escritorio (**Windows**) y dispositivos móviles (**Android: PRÓXIMAMENTE**), mejorando la privacidad, eliminando la necesidad de servidores locales (PHP) y habilitando el uso offline en cualquier lugar.

> [!IMPORTANT]
> **🚀 DESCARGA DIRECTA DE PROGRAMAS:**
> Si no quieres compilar el código tú mismo y solo quieres utilizar la aplicación, puedes descargar directamente los ejecutables listos para usar en la carpeta **[/PROGRAMAS](file:///c:/Users/Jose/OneDrive/1_HOBBIES/004_PROYECTOS/000_proyectos/083_PROGRAMACION%20PYTHON/000_GITHUB/000_otros/rafa/BC3Viewer-App/PROGRAMAS/)**:
> *   **Windows Installer (.exe):** [BC3_Viewer_Windows_Installer.exe](file:///c:/Users/Jose/OneDrive/1_HOBBIES/004_PROYECTOS/000_proyectos/083_PROGRAMACION%20PYTHON/000_GITHUB/000_otros/rafa/BC3Viewer-App/PROGRAMAS/BC3_Viewer_Windows_Installer.exe)
> *   **Windows Package (.msi):** [BC3_Viewer_Windows_Installer.msi](file:///c:/Users/Jose/OneDrive/1_HOBBIES/004_PROYECTOS/000_proyectos/083_PROGRAMACION%20PYTHON/000_GITHUB/000_otros/rafa/BC3Viewer-App/PROGRAMAS/BC3_Viewer_Windows_Installer.msi)
> *   **Android App (.apk):** 📱 (Soporte nativo **PRÓXIMAMENTE** - Actualmente en desarrollo y pruebas)
> *   También dispones de un presupuesto de ejemplo para probarlo inmediatamente en la carpeta **[/PROGRAMAS/BC3 EJEMPLO](file:///c:/Users/Jose/OneDrive/1_HOBBIES/004_PROYECTOS/000_proyectos/083_PROGRAMACION%20PYTHON/000_GITHUB/000_otros/rafa/BC3Viewer-App/PROGRAMAS/BC3%20EJEMPLO/)**._

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
3.  **Integración de Soporte Móvil (Android: PRÓXIMAMENTE):**
    *   *En desarrollo:* Se planea reintroducir el soporte móvil utilizando **Capacitor** para empaquetar los activos web y generar un archivo `.apk` de instalación nativa 100% offline para dispositivos Android.

---

## 📁 Estructura del Directorio

*   **`/www`**: Código fuente compartido de la aplicación web estática.
    *   `index.html`: La interfaz unificada.
    *   `style.css`: Estilos visuales adaptativos (incluye el Gantt, Curva S, y Modo Oscuro).
    *   `BC3Parser.js`: Analizador de FIEBDC-3 portado a JavaScript.
    *   `app.js`: Lógica interactiva completa, certificaciones, Gantt, exportadores locales y carga local de ficheros.
    *   *Librerías locales:* `chart.min.js`, `xlsx.full.min.js`, `jspdf.umd.min.js` y `jspdf.plugin.autotable.min.js` (cargadas en local para garantizar el funcionamiento offline).
*   **`/src-tauri`**: Lógica de envoltura nativa en Rust para compilar la aplicación de Windows.
*   **`/android`**: (PRÓXIMAMENTE) Código de la aplicación nativa de Android autogenerado y sincronizado por Capacitor (removido temporalmente).
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

### 📱 Construir para Android (Capacitor - PRÓXIMAMENTE)

El soporte nativo para compilar en Android con Capacitor se encuentra desactivado temporalmente para llevar a cabo tareas de limpieza y refactorización. Se reintroducirá próximamente.

---

## Sobre el Proyecto Original

BC3php fue creado por **System Arquitectura** (https://www.systemarquitectura.com), empresa con sede en Malaga especializada en proyectos de arquitectura industrial, logistica, corporativa y residencial.

Esta version ampliada mantiene todos los creditos del autor original y anade funcionalidades avanzadas orientadas al uso profesional diario del Arquitecto Tecnico y Director de Obra.

## 👨‍💻 Autor de la versión mejorada

Jose Manuel Caamaño González | Arquitecto Técnico & BIM Manager.
Digital Product Lead | ConTech & Digital Twin SaaS | BIM, Energy Modeling & Sustainability | Data Analytics (SQL, Power BI)

Hecho con código y café desde A Coruña. ☕

Jose Manuel Caamaño González | [LinkedIn](https://www.linkedin.com/in/jmcaamanog/)
