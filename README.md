# BC3 Viewer Multiplataforma (Windows & Android)


Visualizador web avanzado de archivos BC3 (FIEBDC-3) para presupuestos de construccion.
**Mejora libre y gratuita para cualquier Arquitecto Tecnico, Arquitecto o profesional de la construccion by JMC.**

Hecha un vistazo a las capturas en la carpeta ---> **`CAPTURAS`** para ver la evolución de la App!.

Este repositorio contiene la versión autónoma, multiplataforma y 100% offline del **BC3 Viewer (Visualizador Premium de Presupuestos FIEBDC-3)**.

El objetivo de este proyecto es empaquetar y distribuir el visualizador web original como aplicaciones nativas de escritorio (**Windows**) y dispositivos móviles (**Android**), mejorando la privacidad, eliminando la tediosa necesidad de servidores locales (PHP) y habilitando el uso offline en cualquier lugar.


> [!IMPORTANT]
> **🚀 DESCARGA DIRECTA DE PROGRAMAS:**
> Si no quieres compilar el código tú mismo y solo quieres utilizar la aplicación, puedes descargar directamente los ejecutables listos para usar:
> *   **💻 Windows Installer (.exe):** `BC3_Viewer_Windows_Installer.exe`
> *   **💻 Windows Package (.msi):** `BC3_Viewer_Windows_Installer.msi`
> *   **📱 Android App (.apk):** `BC3Viewer-App.apk`

> *   También dispones de un presupuesto de ejemplo para probarlo inmediatamente en la carpeta **/PROGRAMAS/BC3 EJEMPLO**.
>
> **🌐 ACCESO DIRECTO EN LA WEB (Nube):**
> Puedes usar la versión web más reciente directamente en tu navegador sin instalar nada en:
> 👉 **[Visualizador BC3 Online (GitHub Pages)](https://jmcaamanog.github.io/BC3Viewer-App/www/index.html)**
---
> 🔑 **Contraseña versión 1.4.1)** -> 1234
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

## Historial de Versiones Publicadas

### Version 1.4.1 — 10/07/2026 (Actual)
* **Control del Resumen Temporal via FAB:** El botón flotante (FAB) de la esquina inferior derecha colapsa y expande de forma inteligente y contextual el panel de "Resumen de Plazos y Costes" cuando el Planning está activo.
* **Limpieza de la Barra de Resumen:** Se eliminan emojis e indicaciones adicionales del título de la barra de resumen temporal, simplificándolo a "Resumen de Plazos y Costes" para ofrecer un aspecto visual más profesional y despejado.

### Version 1.4.0 — 10/07/2026
* **Acceso Protegido y Firma Premium:** Se integra la imagen del logotipo corporativo, el título azul resplandeciente "BC3 Viewer" y los créditos "by jmcaamanog" en la pantalla de entrada por PIN.
* **FAB Flotante Unificado:** Un único botón circular (FAB) situado en la esquina inferior derecha cambia dinámicamente de icono (`🔼`/`🔽`) para replegar y expandir la cabecera sin alterar su posición en pantalla.
* **Optimización y Limpieza de Cabecera:** Integración de la exportación a XML dentro de las opciones de exportación del desplegable, eliminando iconos superfluos del calendario.
* **Gantt y Visualización Adaptativa:** Aumento de las dimensiones y el ancho máximo del modal detallado de las partidas para prevenir el desbordamiento de los selectores de fecha en pantallas móviles.

### Version 1.3.4 — 09/07/2026
* **Rediseño Barra de Herramientas Móvil:** Los 8 iconos principales se agrupan en una única fila horizontal en móvil, eliminando el apilado y aprovechando el espacio de pantalla de forma óptima.
* **Cierre y Reset de Presupuesto:** Añadido un botón en color rojo con una "✕" al lado de PROCESA para vaciar los datos cargados, borrar la auto-carga y volver al estado de bienvenida de manera directa.

### Version 1.3.3 — 08/07/2026
* **Nueva versión APP:** Aplicación de `Android` con todas las funciones y offline!. Instala y despreocúpate de las nuevas actualziaciones. ---> descarga el `.apk` de la carpeta `PROGRAMAS`.
* **Versión para Windows:** Aplicación instalable para Windows. ---> descarga el `.exe` de la carpeta `PROGRAMAS`.
* **CERTIFICACIONES de obra:** Ya puedes certificar la obra directamente desde la **APP** !. 
> *📱 *(Ventajas de instalar la **App**-> Actualizaciones online, compartición nativa de archivos por WhatsApp y auto-carga en la carpeta /PROGRAMAS! en tu movil!)*



### Version 1.3.0 — 03/07/2026 
* **Columna Proporción en Presupuesto:** Nueva columna en el árbol del presupuesto que agrupa e integra el `% PEM` y el desglose de recursos (barras de colores) de los capítulos, manteniendo el comportamiento y visibilidad de las columnas originales de cantidad y precio.
* **Cabecera Compacta y Adaptativa:** Reorganización del header en 4 grupos unificados y un menú desplegable de ajustes engranaje `⚙️` en la esquina superior derecha para limpiar la interfaz.
* **Botón Pulsante de Carga Central:** Botón "`🚀 CARGAR ARCHIVO .BC3`" en la pantalla de inicio con aura/brillo animado y procesamiento automático directo del archivo al seleccionarlo.
* **Módulo de Estadísticas Gantt:** Cuadro de KPIs avanzado de plazos y costos del Planning que calcula días restantes de obra y los promedios requeridos por día, semana y mes de forma dinámica.

### Version 1.2.0 — 03/07/2026
* **Certificaciones Mensuales de Obra:** Módulo interactivo en el panel de detalles para certificar cantidades mes a mes (Mes 1 al Mes 12) sobre cada partida, calculando acumulados, importes y porcentajes de avance certificados.
* **Sincronización Gantt y Avances:** El avance (%) de cada tarea se sincroniza automáticamente con el volumen acumulado certificado, actualizando dinámicamente las barras de progreso del diagrama de Gantt.
* **Curva S Dinámica:** La línea de "Ejecutado" en la Curva S ahora se calcula de manera exacta a partir de las certificaciones reales registradas por semanas, sustituyendo la estimación lineal del Gantt.
* **Ruta Crítica en el Árbol:** Resaltado de capítulos y partidas pertenecientes a la ruta crítica con bordes rojos, sombreados suaves y un badge distintivo animado `⚡ CRÍTICO` al lado del código.
* **Auditoría de Cambios y Desviación PEM:** Registro en tiempo real de cada edición de precios, resúmenes o creación de partidas, computando la desviación acumulada neta sobre el presupuesto PEM.
* **Exportador a MS Project XML:** Exportación directa del planning a archivos XML estructurados compatibles con Microsoft Project y Primavera, conservando predecesoras y OutlineLevels.

### Version 1.1.0 — 03/07/2026
* **Creacion de Partidas en el Arbol:** Boton "➕ Nueva Partida" en el encabezado de la columna Codigo para crear filas borrador directamente en el arbol visual.
* **Control Jerarquico de Posicionamiento:** Botonera de direccion (▲/▼/◀/▶) para mover el borrador en altura o profundidad (anidar dentro de capitulos).
* **Validacion y Resaltado:** Validacion obligatoria de Resumen, Cantidad y Precio con bordes de error rojos en inputs e importe calculado en tiempo real.
* **Gantt - Enlaces y Dependencias:** Boton "🔗 Enlazar" para crear dependencias Fin→Inicio de forma interactiva entre tareas con propagacion de retrasos.
* **Gantt - Borrado Rapido de Enlaces:** Boton circular rojo "×" en el centro de cada flecha de dependencia para eliminarlas mediante clic izquierdo directo.
* **Buscador Global:** Barra flotante (Ctrl+F) con busqueda incremental, resaltados amarillos/azules en el arbol y navegacion arriba/abajo.
* **Curva S en Dashboard:** Grafica interactiva acumulada para comparar planificacion teorica y ejecucion real semana a semana.
* **Banco de Precios:** Pestaña "NUEVAS PARTIDAS" para filtrar y editar en caliente los nuevos conceptos basicos y exportacion BC3 conforme.

### Version 1.0.0 — 03/07/2026
* **Rediseno del Header:** Reorganizacion de la cabecera en secciones funcionales de control (Visualizacion, Operaciones, Comparacion, Exportacion).
* **Tarjetas PEM y PEC:** Rediseño visual de presupuestos con etiquetas e importes destacados.
* **Informacion y Versiones:** Menu de informacion (ℹ️) lateral con el historial desplegable de versiones.
* **Dashboard Tecnico:** 6 graficas de distribucion de costes y KPIs clave.
* **Gantt Premium:** Calculo de ruta critica, linea visual de "Hoy" y control de avance financiero global y detallado.

### Version 0.1.0 — 10/12/2025 (Inicial)
* **Lanzamiento original:** Visualizador jerarquico de archivos BC3 en forma de arbol.
* **Buscador y Columnas:** Busqueda local de partidas, mediciones detalladas (~M) y descripciones extendidas (~T).

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
