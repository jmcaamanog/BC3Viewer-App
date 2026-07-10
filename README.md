# BC3 Viewer Multiplataforma (Windows & Android)


Visualizador web avanzado de archivos BC3 (FIEBDC-3) para presupuestos de construccion.
**Mejora libre y gratuita para cualquier Arquitecto Tecnico, Arquitecto o profesional de la construccion by JMC.**

> 📸 **¡Evolución Visual de la App!** Echa un vistazo y comprueba cómo ha progresado el visualizador en la carpeta [📁 CAPTURAS](./CAPTURAS). No te pierdas las imágenes de la última interfaz premium en la subcarpeta [🚀 CAPTURAS/V1.4.2](./CAPTURAS/V1.4.2).

Este repositorio contiene la versión autónoma, multiplataforma y 100% offline del **BC3 Viewer (Visualizador Premium de Presupuestos FIEBDC-3)**.

El objetivo de este proyecto es empaquetar y distribuir el visualizador web original como aplicaciones nativas de escritorio (**Windows**) y dispositivos móviles (**Android**), mejorando la privacidad, eliminando la tediosa necesidad de servidores locales (PHP) y habilitando el uso offline en cualquier lugar.


> [!IMPORTANT]
> **🚀 DESCARGA DIRECTA DE PROGRAMAS:**
> Si no quieres compilar el código tú mismo y solo quieres utilizar la aplicación, puedes descargar directamente los ejecutables listos para usar:
> *   **💻 Windows Installer (.exe):** [BC3_Viewer_Windows_Installer.exe](./PROGRAMAS/BC3_Viewer_Windows_Installer.exe)
> *   **💻 Windows Package (.msi):** [BC3_Viewer_Windows_Installer.msi](./PROGRAMAS/BC3_Viewer_Windows_Installer.msi)
> *   **📱 Android App (.apk):** [BC3Viewer-App.apk](./PROGRAMAS/BC3Viewer-App.apk)

> *   También dispones de un presupuesto de ejemplo para probarlo inmediatamente en la carpeta [📁 PROGRAMAS/BC3 EJEMPLO](./PROGRAMAS/BC3%20EJEMPLO).
>
> **🌐 ACCESO DIRECTO EN LA WEB (Nube):**
> Puedes usar la versión web más reciente directamente en tu navegador sin instalar nada en:
> 👉 **[Visualizador BC3 Online (GitHub Pages)](https://jmcaamanog.github.io/BC3Viewer-App/www/index.html)**
---
> 🔑 **Contraseña versión 1.4.7)** -> 1234
---

Esta version ampliada ha sido desarrollada por mí (`Jose Manuel Caamaño`---> [linkedin](https://www.linkedin.com/in/jmcaamanog/) partiendo de la versión muy básica básica y sin funciones disponible en -> [BC3php](https://github.com/jmcaamanog/BC3Viewer-App) (si lo visitais, ya contiene parte de mis mejoras XD), añadiendo todas las capacidades avanzadas y manteniendo el espiritu del proyecto original, pero muy mejorándolo (XD) desde el punto de vista de un `Arquitecto Técnico` : **abierto, libre y útil para la profesion (ser libres de egos XD)**.

---

## Descripcion

BC3 Viewer es una aplicacion web que permite **visualizar, editar, comparar, planificar y exportar** archivos en formato BC3 (estandar FIEBDC-3 utilizado en Espana para el intercambio de presupuestos de construccion). La aplicacion muestra una vista jerarquica del presupuesto con capitulos, subcapitulos, partidas y lineas de medicion.

---

## Caracteristicas Completas

### Visualizacion
- **Arbol jerarquico expandible/colapsable** con capitulos, subcapitulos y partidas
- **Columnas redimensionables**: Codigo, Unidad, Resumen, Cantidad, Precio e Importe
- **Lineas de medicion** (~M): Tabla detallada con Uds, Largo, Ancho, Alto y Parciales
- **Descripciones inline** (~T): Texto descriptivo de cada partida al expandir
- **Deteccion de codificacion**: Soporte ANSI, UTF-8 e ISO-8859-1
- **Modo movil drill-down**: Navegacion tactil por niveles en dispositivos pequenos
- **Breadcrumb de navegacion**: Rastro de migas para saber siempre en que nivel estas
- **Boton Volver** para retroceder en la jerarquia

### Busqueda y Filtros
- **Busqueda en tiempo real** por titulo, codigo y medicion
- **Filtros avanzados**: por importe minimo/maximo, tipo de recurso (MO, MAQ, MAT, SUB)
- **Expandir / Contraer Todo** con un solo clic
- **Badges de tipo de recurso**: etiquetas visuales MO / MAQ / MAT / SUB

### Edicion en Linea
- **Edicion directa de resumenes** haciendo clic en cualquier celda de descripcion
- **Edicion de precios unitarios** directamente en la tabla
- **Historial Deshacer/Rehacer** (Ctrl+Z / Ctrl+Y) con hasta 50 estados
- **Guardar archivo** modificado como nuevo BC3 con nombre automatico

### Drag & Drop
- **Arrastrar y soltar** archivos .bc3 directamente sobre la ventana del navegador
- Overlay visual de carga al arrastrar

### Dashboard de Analisis Visual
- **Grafico de distribucion por capitulos** (Chart.js - local, sin internet)
- **Grafico de tipos de recurso** (MO / Maquinaria / Material / Subcontrata)
- Estadisticas globales del presupuesto

### Coeficientes Globales (PEM a PEC)
- Configuracion de **Gastos Generales (GG %)**, **Beneficio Industrial (BI %)** y **Baja/Alza general**
- Calculo automatico del **PEC** (Precio de Ejecucion por Contrata) en tiempo real

### Comparador de Presupuestos
- Cargar un segundo archivo BC3 para **comparar partida a partida**
- Visualizacion de **desviaciones de precio** en color (positivo/negativo)
- Resumen de diferencias globales

### Exportacion del Presupuesto
- **Exportar a PDF**: Presupuesto completo en A4, con tabla formateada y totales (local, sin internet)
- **Exportar a Excel (.xlsx)**: Presupuesto estructurado con columnas y anchos optimizados (local, sin internet)

### PLANNING - Diagrama de Gantt Interactivo (NUEVO)
- Diagrama de Gantt interactivo a partir de los capitulos y subcapitulos del presupuesto (hasta **3 niveles**)
- **Distribucion automatica inicial** proporcional al coste de cada capitulo
- **Cabecera de meses y semanas** (semanas de 7 dias) con scroll horizontal
- **Barras completamente arrastrables**:
  - Borde izquierdo: cambiar fecha de inicio
  - Centro: mover toda la tarea
  - Borde derecho: cambiar duracion
- **Capitulos colapsables** para mostrar/ocultar subcapitulos
- **Auto-guardado en localStorage**: El planning se recupera automaticamente al abrir el mismo fichero BC3
- **Exportar Planning a Excel**: Tabla estructurada con Nivel, Codigo, Tarea, Fecha Inicio, Fecha Fin, Duracion (sem.), Importe
- **Exportar Planning a PDF**: A4 landscape, barras visuales en color, paginado automatico cada 26 semanas
- Control de **fecha de inicio del proyecto** y **numero de semanas total** configurable

### Modo Oscuro
- Alternancia modo claro / modo oscuro con boton en la cabecera
- Estilos adaptativos en todos los modulos incluyendo el Gantt

---
---
---

## Historial de Versiones Recientes

> 📜 **[Historial de Versiones Completo (CHANGELOG.md)](./CHANGELOG.md)**

### 📅 10/07/2026 — Versión 1.4.7 (Actual)
* **Ajustes de Interfaz y Carga:** Integración del nombre de archivo cargado en el menú Ajustes (⚙️) para limpiar la cabecera, alineación derecha del menú con iconos ordenados, justificación del texto de bienvenida y ocultación estricta del botón de cierre.
* **Actualizaciones OTA:** Añadido botón de búsqueda manual y diagnóstico OTA en el menú de información.
* **Optimización y Estabilidad:** Solución de error temporal (TDZ) en la carga y corrección javascript del cargador inicial.
* **Rediseño Visual:** Logo de cabecera reescalado a la altura de PEM/PEC, menú de acceso por PIN rediseñado y botón flotante (FAB) adaptativo para contraer la cabecera.

### 📅 09/07/2026 — Versión 1.3.4
* **Optimizaciones Móviles:** Barra de herramientas en móviles unificada en una sola fila compacta y botón de salida rápida (✕) para vaciar el presupuesto.

### 📅 08/07/2026 — Versión 1.3.3
* **Lanzamientos Nativos:** Compilación de la primera versión nativa para Android (`.apk`) y Windows (`.exe`) con actualizaciones web automáticas transparentes (OTA).

### 📅 03/07/2026 — Versión 1.3.0
* **Funciones Avanzadas:** Columna de proporción `% PEM`, certificaciones detalladas de obra en 12 meses, curva S de avance real, detección de ruta crítica (`⚡ CRÍTICO`), exportación del planning a MS Project XML y creación manual de nuevas partidas.

### 📅 10/12/2025 — Versión 0.1.0 (Inicial)
* **Lanzamiento Base:** Estructura de árbol jerárquico FIEBDC-3, búsqueda local y visualización de mediciones detalladas (~M).

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
