# Registro de Versiones (Changelog) - BC3 Viewer

En este documento se detalla la evolución completa de la aplicación, incluyendo todas las revisiones y mejoras intermedias realizadas.

---

### Versión 1.5.0 — 11/07/2026 (Actual)
* **Gesto de Zoom Continuo y Suave:** Rediseño del gesto pinch-to-zoom con `requestAnimationFrame` en la vista de Gantt para un zoom orgánico continuo de alta precisión.
* **Preservación del Centro de la Vista (Zoom):** El zoom se realiza exactamente sobre la semana que el usuario está mirando, evitando desplazamientos involuntarios al principio del timeline.
* **Preservación de Scroll Vertical y Horizontal:** El scroll vertical y horizontal se mantiene fijo al enlazar tareas o reconstruir la vista.
* **Botón Conmutador Flotante Dinámico:** Unificación de los botones del Gantt en un único globo flotante inferior izquierdo que se desliza suavemente con transiciones CSS adaptadas al ancho de la columna izquierda.
* **Soporte de Iconografía Nativa en Windows:** Generación y empaquetamiento automático de iconos multirresolución (`icon.ico`, `icon.icns`) basados en la imagen oficial `icon.png` para el ejecutable y barra de tareas de Windows.
* **Telemetría para Windows:** Detección de arranque en el webview nativo de Tauri para enviar la firma "Windows" en el registro de telemetría de accesos.
* **Actualizador en Cliente de Windows:** Implementada la redirección interactiva en el botón de actualización para permitir descargas directas del instalador ejecutable de Windows cuando hay una nueva versión disponible.

### Versión 1.4.7 — 10/07/2026

### Versión 1.4.6 — 10/07/2026
* **Nombre de Archivo en Menú Ajustes:** Se desplaza el nombre del archivo activo cargado directamente al desplegable de Ajustes (⚙️) como primer elemento, permitiendo limpiar el encabezado general. Al hacer clic sobre él, se abre la ventana de carga para seleccionar otro archivo de forma rápida.
* **Alineación Derecha y Posicionamiento de Iconos:** Las opciones del menú desplegable de Ajustes se alinean elegantemente hacia la derecha, reubicando los iconos a la derecha del texto para una lectura más ordenada.

### Versión 1.4.5 — 10/07/2026
* **Alineación Justificada en Bienvenida:** Se justifica el texto en los párrafos de bienvenida y en los contenedores de llamada informativos para un acabado visual más profesional.
* **Ocultación por Defecto de Botón Cerrar:** El botón rojo (✕) para cerrar presupuestos ahora se oculta de forma explícita al arrancar la aplicación, eliminando elementos flotantes residuales.

### Versión 1.4.4 — 10/07/2026
* **Corrección de Carga en Bienvenida:** Se corrige el error javascript provocado al intentar modificar las propiedades del inexistente botón "PROCESA", lo cual impedía que el botón azul "🚀 CARGAR ARCHIVO .BC3" de la pantalla de bienvenida realizara la carga.

### Versión 1.4.3 — 10/07/2026
* **Carga Automatizada y Enlace a GitHub:** Se retira el botón redundante "PROCESA" de la cabecera, logrando una carga automática instantánea al seleccionar el archivo. El logotipo superior izquierdo se enlaza directamente con el repositorio oficial de GitHub del proyecto.
* **Ocultación Dinámica en Bienvenida:** La barra superior de carga y la barra lateral de búsqueda se ocultan por completo cuando no hay ningún presupuesto cargado (pantalla de bienvenida), optimizando el espacio disponible.
* **Reubicación de Botón Cerrar (✕):** El botón rojo de cierre se mueve de la barra de carga directamente al lado del widget de PEM y PEC, dotándolo de un contexto puramente presupuestario.

### Versión 1.4.2 — 10/07/2026
* **Rediseño y Mayor Escala del Logotipo del Cabezal:** Aumento del tamaño del logotipo en la cabecera para que coincida exactamente con la altura de las cajas de PEM/PEC, logrando un aspecto mucho más nítido, definido y premium.
* **Nuevas Capturas del Rediseño V1.4.2:** Ya puedes ver las capturas de la última versión en la carpeta [📁 CAPTURAS/V1.4.2](./CAPTURAS/V1.4.2) con muestras de la nueva pantalla de acceso PIN, el logotipo reescalado y el nuevo menú de diagnóstico de red OTA en móviles.

### Versión 1.4.1 — 10/07/2026
* **Control del Resumen Temporal via FAB:** El botón flotante (FAB) de la esquina inferior derecha colapsa y expande de forma inteligente y contextual el panel de "Resumen de Plazos y Costes" cuando el Planning está activo.
* **Limpieza de la Barra de Resumen:** Se eliminan emojis e indicaciones adicionales del título de la barra de resumen temporal, simplificándolo a "Resumen de Plazos y Costes" para ofrecer un aspecto visual más profesional y despejado.

### Versión 1.4.0 — 10/07/2026
* **Acceso Protegido y Firma Premium:** Se integra la imagen del logotipo corporativo, el título azul resplandeciente "BC3 Viewer" y los créditos "by jmcaamanog" en la pantalla de entrada por PIN.
* **FAB Flotante Unificado:** Un único botón circular (FAB) situado en la esquina inferior derecha cambia dinámicamente de icono (`🔼`/`🔽`) para replegar y expandir la cabecera sin alterar su posición en pantalla.
* **Optimización y Limpieza de Cabecera:** Integración de la exportación a XML dentro de las opciones de exportación del desplegable, eliminando iconos superfluos del calendario.
* **Gantt y Visualización Adaptativa:** Aumento de las dimensiones y el ancho máximo del modal detallado de las partidas para prevenir el desbordamiento de los selectores de fecha en pantallas móviles.

---

### Versión 1.3.4 — 09/07/2026
* **Rediseño Barra de Herramientas Móvil:** Los 8 iconos principales se agrupan en una única fila horizontal en móvil, eliminando el apilado y aprovechando el espacio de pantalla de forma óptima.
* **Cierre y Reset de Presupuesto:** Añadido un botón en color rojo con una "✕" al lado de PROCESA para vaciar los datos cargados, borrar la auto-carga y volver al estado de bienvenida de manera directa.

### Versión 1.3.3 — 08/07/2026
* **Nueva versión APP:** Aplicación de `Android` con todas las funciones y offline!. Instala y despreocúpate de las nuevas actualizaciones. ---> descarga el [BC3Viewer-App.apk](./PROGRAMAS/BC3Viewer-App.apk) de la carpeta [📁 PROGRAMAS](./PROGRAMAS).
* **Versión para Windows:** Aplicación instalable para Windows. ---> descarga el [BC3_Viewer_Windows_Installer.exe](./PROGRAMAS/BC3_Viewer_Windows_Installer.exe) de la carpeta [📁 PROGRAMAS](./PROGRAMAS).
* **CERTIFICACIONES de obra:** Ya puedes certificar la obra directamente desde la **APP** !. 
> *📱 *(Ventajas de instalar la **App**-> Actualizaciones online, compartición nativa de archivos por WhatsApp y auto-carga en la carpeta [📁 PROGRAMAS](./PROGRAMAS)! en tu movil!)*

---

### Versión 1.3.0 — 03/07/2026
* **Columna Proporción en Presupuesto:** Nueva columna en el árbol del presupuesto que agrupa e integra el `% PEM` y el desglose de recursos (barras de colores) de los capítulos, manteniendo el comportamiento y visibilidad de las columnas originales de cantidad y precio.
* **Cabecera Compacta y Adaptativa:** Reorganización del header en 4 grupos unificados y un menú desplegable de ajustes engranaje `⚙️` en la esquina superior derecha para limpiar la interfaz.
* **Botón Pulsante de Carga Central:** Botón "`🚀 CARGAR ARCHIVO .BC3`" en la pantalla de inicio con aura/brillo animado y procesamiento automático directo del archivo al seleccionarlo.
* **Módulo de Estadísticas Gantt:** Cuadro de KPIs avanzado de plazos y costos del Planning que calcula días restantes de obra y los promedios requeridos por día, semana y mes de forma dinámica.

### Versión 1.2.0 — 03/07/2026
* **Certificaciones Mensuales de Obra:** Módulo interactivo en el panel de detalles para certificar cantidades mes a mes (Mes 1 al Mes 12) sobre cada partida, calculando acumulados, importes y porcentajes de avance certificados.
* **Sincronización Gantt y Avances:** El avance (%) de cada tarea se sincroniza automáticamente con el volumen acumulado certificado, actualizando dinámicamente las barras de progreso del diagrama de Gantt.
* **Curva S Dinámica:** La línea de "Ejecutado" en la Curva S ahora se calcula de manera exacta a partir de las certificaciones reales registradas por semanas, sustituyendo la estimación lineal del Gantt.
* **Ruta Crítica en el Árbol:** Resaltado de capítulos y partidas pertenecientes a la ruta crítica con bordes rojos, sombreados suaves y un badge distintivo animado `⚡ CRÍTICO` al lado del código.
* **Auditoría de Cambios y Desviación PEM:** Registro en tiempo real de cada edición de precios, resúmenes o creación de partidas, computando la desviación acumulada neta sobre el presupuesto PEM.
* **Exportador a MS Project XML:** Exportación directa del planning a archivos XML estructurados compatibles con Microsoft Project y Primavera, conservando predecesoras y OutlineLevels.

### Versión 1.1.0 — 03/07/2026
* **Creacion de Partidas en el Arbol:** Boton "➕ Nueva Partida" en el encabezado de la columna Codigo para crear filas borrador directamente en el arbol visual.
* **Control Jerarquico de Posicionamiento:** Botonera de direccion (▲/▼/◀/▶) para mover el borrador en altura o profundidad (anidar dentro de capitulos).
* **Validacion y Resaltado:** Validacion obligatoria de Resumen, Cantidad y Precio con bordes de error rojos en inputs e importe calculado en tiempo real.
* **Gantt - Enlaces y Dependencias:** Boton "🔗 Enlazar" para crear dependencias Fin→Inicio de forma interactiva entre tareas con propagacion de retrasos.
* **Gantt - Borrado Rapido de Enlaces:** Boton circular rojo "×" en el centro de cada flecha de dependencia para eliminarlas mediante clic izquierdo directo.
* **Buscador Global:** Barra flotante (Ctrl+F) con busqueda incremental, resaltados amarillos/azules en el arbol y navegacion arriba/abajo.
* **Curva S en Dashboard:** Grafica interactiva acumulada para comparar planificacion teorica y ejecucion real semana a semana.
* **Banco de Precios:** Pestaña "NUEVAS PARTIDAS" para filtrar y editar en caliente los nuevos conceptos basicos y exportacion BC3 conforme.

### Versión 1.0.0 — 03/07/2026
* **Rediseno del Header:** Reorganizacion de la cabecera en secciones funcionales de control (Visualizacion, Operaciones, Comparacion, Exportacion).
* **Tarjetas PEM y PEC:** Rediseño visual de presupuestos con etiquetas e importes destacados.
* **Informacion y Versiones:** Menu de informacion (ℹ️) lateral con el historial desplegable de versiones.
* **Dashboard Técnico:** 6 graficas de distribucion de costes y KPIs clave.
* **Gantt Premium:** Calculo de ruta critica, linea visual de "Hoy" y control de avance financiero global y detallado.

### Versión 0.1.0 — 10/12/2025 (Inicial)
* **Lanzamiento original:** Visualizador jerarquico de archivos BC3 en forma de arbol.
* **Buscador y Columnas:** Busqueda local de partidas, mediciones detalladas (~M) y descripciones extendidas (~T).
