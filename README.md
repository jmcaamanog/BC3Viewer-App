# BC3 Viewer Multiplataforma (Windows & Android)

[![GitHub release (latest)](https://img.shields.io/github/v/release/jmcaamanog/BC3Viewer-App?label=Versión&color=3b82f6&logo=github)](https://github.com/jmcaamanog/BC3Viewer-App/releases/latest)
[![GitHub Stars](https://img.shields.io/github/stars/jmcaamanog/BC3Viewer-App?style=flat&label=Stars&color=f59e0b&logo=github)](https://github.com/jmcaamanog/BC3Viewer-App/stargazers)
[![GitHub Downloads](https://img.shields.io/github/downloads/jmcaamanog/BC3Viewer-App/total?label=Descargas&color=10b981&logo=github)](https://github.com/jmcaamanog/BC3Viewer-App/releases)
[![License: MIT](https://img.shields.io/badge/Licencia-MIT-8b5cf6.svg)](https://github.com/jmcaamanog/BC3Viewer-App/blob/main/LICENSE)
[![Platform](https://img.shields.io/badge/Plataforma-Windows%20%7C%20Android%20%7C%20Web-06b6d4)](https://jmcaamanog.github.io/BC3Viewer-App/landing.html)

Visualizador web avanzado de archivos BC3 (FIEBDC-3) para presupuestos de construccion.
**Mejora libre y gratuita para cualquier Arquitecto Tecnico, Arquitecto o profesional de la construccion by JMC.**

> 📸 **¡Evolución Visual de la App!** Echa un vistazo y comprueba cómo ha progresado el visualizador en la carpeta [📁 CAPTURAS](./CAPTURAS). No te pierdas las imágenes de la última interfaz premium en la subcarpeta [🚀 CAPTURAS/V1.4.7](./CAPTURAS/V1.4.7).

---

### 🚀 **[¡Visita la Nueva Landing Page Interactiva del Proyecto (V1.4.7)!](https://jmcaamanog.github.io/BC3Viewer-App/landing.html)**
Hemos creado una presentación interactiva para explorar todas las capacidades de la app:
*   🌳 **Visor Interactivo de Capturas V1.4.7:** Explora la interfaz premium módulo a módulo con explicaciones técnicas.
*   💻 **Descargas Directas:** Acceso directo a instaladores de escritorio (.exe, .msi) y APK móvil.
*   👨‍💻 **Créditos y Autoría:** Conoce más sobre el desarrollo y enfoque profesional del proyecto.

👉 **[Ver Presentación Web Interactiva](https://jmcaamanog.github.io/BC3Viewer-App/landing.html)**

---

Este repositorio contiene la versión autónoma, multiplataforma y 100% offline del **BC3 Viewer (Visualizador Premium de Presupuestos FIEBDC-3)**.

El objetivo de este proyecto es empaquetar y distribuir el visualizador web original como aplicaciones nativas de escritorio (**Windows**) y dispositivos móviles (**Android**), mejorando la privacidad, eliminando la tediosa necesidad de servidores locales (PHP) y habilitando el uso offline en cualquier lugar.


> [!IMPORTANT]
> **🚀 DESCARGA DIRECTA DE PROGRAMAS:**
> Si no quieres compilar el código tú mismo y solo quieres utilizar la aplicación, puedes descargar directamente los ejecutables listos para usar:
> *   **💻 Windows Installer (.exe):** [Descargar BC3_Viewer_Windows_Installer.exe](https://github.com/jmcaamanog/BC3Viewer-App/raw/main/PROGRAMAS/BC3_Viewer_Windows_Installer.exe)
> *   **💻 Windows Package (.msi):** [Descargar BC3_Viewer_Windows_Installer.msi](https://github.com/jmcaamanog/BC3Viewer-App/raw/main/PROGRAMAS/BC3_Viewer_Windows_Installer.msi)
> *   **📱 Android App (.apk):** [Descargar BC3Viewer-App.apk](https://github.com/jmcaamanog/BC3Viewer-App/raw/main/PROGRAMAS/BC3Viewer-App.apk)

> *   También dispones de un presupuesto de ejemplo para probarlo inmediatamente en la carpeta [📁 PROGRAMAS/BC3 EJEMPLO](https://github.com/jmcaamanog/BC3Viewer-App/tree/main/PROGRAMAS/BC3%20EJEMPLO).
>
> **🌐 ACCESO DIRECTO EN LA WEB (Nube):**
> Puedes usar la versión web más reciente directamente en tu navegador sin instalar nada en:
> 👉 **[Visualizador BC3 Online](https://jmcaamanog.github.io/BC3Viewer-App/www/index.html)**
---
> 🔑 **Contraseña versión 1.4.7)** -> 1234
---

Esta version ampliada ha sido desarrollada por mí (`Jose Manuel Caamaño`---> [LINKEDIN](https://www.linkedin.com/in/jmcaamanog/)), partiendo de la versión muy básica básica y sin funciones disponible en [BC3php](https://github.com/jmcaamanog/BC3Viewer-App) (si lo visitais, ya contiene parte de mis mejoras XD). Añadiendo todas las capacidades avanzadas y manteniendo el espiritu del proyecto original, pero mejorándolo... SIEMPRE desde el punto de vista de un `Arquitecto Técnico` : **abierto, libre y útil para la profesion (ser libres de egos XD)**.

---

## Descripcion

`BC3 Viewer` es una aplicacion web que permite **visualizar, editar, comparar, planificar y exportar** archivos en formato BC3 (estandar FIEBDC-3 utilizado en España para el intercambio de presupuestos de construccion). La aplicacion muestra una vista jerarquica del presupuesto con capitulos.

## 🌟 Características Principales (FIEBDC-3 Premium)

| Módulo | Icono | Funcionalidades Destacadas |
| :--- | :---: | :--- |
| **Visualización Estructurada** | 🌳 | **Árbol jerárquico expandible** de capítulos, subcapítulos y partidas. Columnas ajustables de Código, Resumen, Cantidad, Precio e Importe. **Vista drill-down** adaptada a móviles y breadcrumbs de navegación. |
| **Mediciones Detalladas** | 📊 | Visualización interactiva de **líneas de medición (~M)** (Uds, Largo, Ancho, Alto, Parciales) y **descripciones extendidas (~T)** de cada concepto. |
| **Búsqueda & Filtros** | 🔍 | **Buscador global en tiempo real** (Ctrl+F) con resaltado en el árbol. Filtros por rango de importes y badges de recursos (Mano de obra `MO`, Material `MAT`, Maquinaria `MAQ`, Subcontratas `SUB`). |
| **Edición en Caliente** | 📝 | Modificación directa de textos, descripciones y precios unitarios. **Historial completo Deshacer/Rehacer** (Ctrl+Z / Ctrl+Y) de hasta 50 estados. |
| **Drag & Drop Instantáneo** | 🚀 | Arrastra cualquier archivo `.bc3` sobre el navegador para su **procesado e interpretación automática en local** en milisegundos. |
| **Dashboard y KPIs** | 📈 | Análisis visual local mediante **gráficas interactivas** (distribución por capítulos y tipo de recursos) y estadísticas de costes PEM/PEC. |
| **Coeficientes de Contrata** | ⚙️ | Configuración de **Gastos Generales (GG %)**, **Beneficio Industrial (BI %)** y **Baja/Alza general** para obtener el **PEC** de obra al instante. |
| **Comparador de Versiones** | ⚖️ | Carga paralela de dos presupuestos para **detectar desviaciones de precios** y variaciones de alcance, coloreadas visualmente. |
| **Planning & Gantt** | 📅 | **Diagrama de Gantt automático** (hasta 3 niveles) con barras arrastrables de inicio/duración, predecesoras, **ruta crítica** y cálculo de KPIs de plazos. Sincronizado con **certificaciones de obra**. |
| **Exportación Profesional** | 📥 | Exportación directa offline a hojas **Excel (.xlsx)** formateadas y **documentos PDF (A4)** listos para imprimir. |
| **Modo Oscuro & Seguridad** | 🌓 | Interfaz adaptativa con **Modo Oscuro** automático y **control de acceso protegido mediante PIN**. |

---
---
---

## Historial de Versiones Recientes

> 📜 **[Ver Historial de Versiones Completo (CHANGELOG.md)](./CHANGELOG.md)**

### 📅 10/07/2026 — Versión 1.4.7 (Actual)
* **Ajustes de Interfaz y Carga:** Integración del nombre de archivo cargado en el menú Ajustes (⚙️) para limpiar la cabecera, alineación derecha del menú con iconos ordenados, justificación del texto de bienvenida y ocultación estricta del botón de cierre.
* **Actualizaciones OTA:** Añadido botón de búsqueda manual y diagnóstico OTA en el menú de información.
* **Optimización y Estabilidad:** Solución de error temporal (TDZ) en la carga y corrección javascript del cargador inicial.
* **Rediseño Visual:** Logo de cabecera reescalado a la altura de PEM/PEC, menú de acceso por PIN rediseñado y botón flotante (FAB) adaptativo para contraer la cabecera.
 * **Capturas:** [🚀 CAPTURAS/V1.4.7](./CAPTURAS/V1.4.7)

### 📅 09/07/2026 — Versión 1.3.4
* **Optimizaciones Móviles:** Barra de herramientas en móviles unificada en una sola fila compacta y botón de salida rápida (✕) para vaciar el presupuesto.

---
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
---

## 📁 Estructura del Directorio

*   **[`/www`](./www)**: Código fuente compartido de la aplicación web estática.
    *   [index.html](./www/index.html): La interfaz unificada.
    *   [style.css](./www/style.css): Estilos visuales adaptativos (incluye el Gantt, Curva S, y Modo Oscuro).
    *   [BC3Parser.js](./www/BC3Parser.js): Analizador de FIEBDC-3 portado a JavaScript.
    *   [app.js](./www/app.js): Lógica interactiva completa, certificaciones, Gantt, exportadores locales y carga local de ficheros.
    *   *Librerías locales:* [chart.min.js](./www/chart.min.js), [xlsx.full.min.js](./www/xlsx.full.min.js), [jspdf.umd.min.js](./www/jspdf.umd.min.js) y [jspdf.plugin.autotable.min.js](./www/jspdf.plugin.autotable.min.js) (cargadas en local para garantizar el funcionamiento offline).
*   **[`/src-tauri`](./src-tauri)**: Lógica de envoltura nativa en Rust para compilar la aplicación de Windows.
*   **[`/android`](./android)**: Código de la aplicación nativa de Android autogenerado y sincronizado por Capacitor.
*   [package.json](./package.json): Configuración de dependencias de Node.js y scripts de compilación.

---
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
---

## 👨‍💻 Autor de la versión mejorada

Jose Manuel Caamaño González | Arquitecto Técnico & BIM Manager.
Digital Product Lead | ConTech & Digital Twin SaaS | BIM, Energy Modeling & Sustainability | Data Analytics (SQL, Power BI)

Hecho con código y café desde A Coruña. ☕

Jose Manuel Caamaño González | [LinkedIn](https://www.linkedin.com/in/jmcaamanog/)
