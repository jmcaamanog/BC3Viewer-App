# 🚀 Roadmap y Mejoras Pendientes (Checklist) — BC3 Viewer

Este documento recoge el inventario completo de mejoras técnicas, de experiencia de usuario (UX/UI), rendimiento y capacidades ConTech planificadas y desarrolladas para **BC3 Viewer**. Las tareas están organizadas por bloques y dotadas de casillas de verificación (`- [ ]`, `- [x]`) para el seguimiento interactivo del desarrollo.

---

## ⚡ 1. Rendimiento, Arquitectura y Procesamiento Asíncrono (Core)

- [x] **Web Workers para Parsing y Exportación Asíncrona (Cero Bloqueo de UI)**
  - *Descripción:* Mover `BC3Parser`, `BC3Writer`, `xlsx` y `jsPDF` a un Web Worker (`bc3-worker.js`) en segundo plano para que la interfaz nunca se congele al procesar o exportar presupuestos pesados.
  - *Impacto:* Fluidez total a 60 FPS con barra de progreso reactiva.

- [x] **Renderizado Virtualizado del Árbol y Tablas (Virtual Scrolling)**
  - *Descripción:* Renderizar dinámicamente solo los nodos y filas visibles en el viewport para permitir la carga instantánea de presupuestos masivos (más de 10.000 partidas y archivos > 50 MB).
  - *Impacto:* Reducción drástica del uso de memoria RAM y eliminación del lag de scroll.

- [x] **Integración PWA con *File System Access API* (Guardado Directo en Disco)**
  - *Descripción:* Habilitar la API nativa del navegador (`showOpenFilePicker`, `createWritable`, `Ctrl+S`) para permitir el guardado directo sobre el archivo `.bc3` local abierto en disco, sin descargar duplicados.
  - *Impacto:* Experiencia de aplicación de escritorio nativa en Web y PWA.

---

## 🎨 2. Experiencia de Usuario y Productividad (Frontend & UX)

- [x] **Paleta de Comandos Global Rápida (`Ctrl+K` / `Cmd+K`)**
  - *Descripción:* Modal flotante de búsqueda universal para saltar a cualquier capítulo/partida, cambiar entre vistas (Árbol, Precios, Gantt, Mediciones), alternar tema o disparar exportaciones mediante atajos de teclado.
  - *Impacto:* Navegación y operativa ultrarrápida para usuarios profesionales.

- [x] **Soporte Multi-Presupuesto por Pestañas (Multi-Tab)**
  - *Descripción:* Barra de pestañas superior que permite mantener abiertos múltiples archivos `.bc3` en la misma sesión con reparto equitativo de ancho (`flex: 1 1 0`) y conmutar entre ellos instantáneamente.
  - *Impacto:* Facilita la consulta paralela y la gestión multitarea de obras.

- [x] **Calculadora Interactiva de Mediciones con Fórmulas Dinámicas**
  - *Descripción:* Soporte para evaluación de expresiones matemáticas directas en las líneas de medición (ej. `=2*3.50+1.20`, deducciones de huecos `-0.80*2.10`, coeficientes de paso) con cálculo, indicador `ƒx` y validación en vivo.
  - *Impacto:* Mayor flexibilidad y precisión en la edición de mediciones de obra.

---

## 🏗️ 3. Lógica de Negocio y Gestión de Obras (ConTech Avanzado)

- [x] **Visualizador Concéntrico Multinivel (Sunburst) y Flujo de Costes (Sankey)**
  - *Descripción:* Motores gráficos 2D interactivos con zoom elástico, 5 niveles de detalle lógicos (*1. Capítulos* hasta *5. Desglose Total MO/MQ/MT*), herencia cromática por familias, distribución de alturas al 100% de la ventana sin cortes, botón de retorno `🏠` y tabla inferior completa de descompuestos.
  - *Impacto:* Comprensión visual inmediata y análisis financiero exhaustivo de costes elementales y auxiliares.

- [x] **Módulo de Certificaciones Mensuales de Obra**
  - *Descripción:* Sistema de control de ejecución mensual por partida con desglose de *Certificación Anterior*, *Certificación del Mes* y *Certificación Acumulada a Origen*, con emisión de Actas Oficiales de Certificación en PDF y Excel.
  - *Impacto:* Herramienta completa de control y facturación mensual para jefes de obra y direcciones facultativas.

- [x] **Importador Bidireccional Excel ↔ BC3**
  - *Descripción:* Conversor inteligente para importar cuadros de precios y hojas de mediciones en formato Excel estructurado (.xlsx/.csv) y transformarlos automáticamente a archivo normalizado `.bc3`, y viceversa con asistente interactivo de mapeo de columnas.
  - *Impacto:* Máxima interoperabilidad con archivos externos de proveedores, subcontratistas y hojas de cálculo de licitación.

- [x] **Planificación Financiera Avanzada (Método del Valor Ganado - EVM)**
  - *Descripción:* Módulo financiero integrado con Curva S interactiva en Canvas 2D comparando Coste Planificado ($PV$), Coste Real ($AC$) y Valor Ganado ($EV$), junto con los índices de desempeño $CPI$, $SPI$, variaciones $CV$, $SV$, proyección $EAC$, selector de semana de corte y exportación a Excel.
  - *Impacto:* Detección temprana de desviaciones de plazos y sobrecostes en fase de ejecución de obra.

---

## 📊 4. Analítica Avanzada, BIM y Sostenibilidad (BIM & Insights)

- [x] **Estimador de Huella de Carbono y Sostenibilidad (Ciclo de Vida)**
  - *Descripción:* Asignación de factores de emisión de $CO_2$ ($kg\text{ }CO_2\text{ eq}$) por tipo de material/unidad de obra y generación de informe/etiqueta ambiental del proyecto.
  - *Impacto:* Posiciona la app en la vanguardia de sostenibilidad y normativas europeas (Taxonomía Verde, ESG).

- [ ] **Extracción Directa de Mediciones desde Modelos BIM (IFC)**
  - *Descripción:* Integración de un visor 3D embebido ligero basado en `web-ifc` / `three.js` para visualizar el modelo BIM en local y extraer volúmenes, áreas y longitudes hacia las líneas de medición del BC3.
  - *Impacto:* Trazabilidad directa entre geometría 3D y presupuesto de obra.

- [x] **Sincronización Cloud Opcional con Cifrado E2E (Multi-Dispositivo)**
  - *Descripción:* Sincronización en la nube opcional (Google Drive / Vault cifrado) para continuar la revisión de un presupuesto entre PC (Windows), Web y Tablet/Móvil (Android) con cifrado militar de cliente AES-GCM 256 bits, auto-sync en segundo plano y soporte 100% offline.
  - *Impacto:* Movilidad total entre la oficina y la obra sin costes de servidores y con privacidad absoluta de precios y márgenes.

---

## 🤖 5. Inteligencia Artificial Agéntica y Automatización ConTech (AI & Agents)

- [ ] **Asistente Inteligente de Presupuestación Generativa con Gemini API (In-App)**
  - *Descripción:* Integración dentro del *Creador de Presupuestos* de un asistente conversacional y generador estructurado basado en la API de Gemini (Gemini 1.5 Flash / Pro). Permite al usuario describir un proyecto, reforma o partida en lenguaje natural (ej. *"Reforma integral de baño de 6 m² con alicatado porcelánico, plato de ducha de resina e inodoro suspendido"*) y el motor de IA genera al vuelo la estructura de capítulos, partidas normalizadas con código FIEBDC-3, unidades, textos descriptivos (~T), descomposición de costes elementales (mano de obra, materiales, maquinaria) y líneas de medición estimadas (~M).
  - *Impacto:* Acelera drásticamente la creación de ofertas y presupuestos base desde cero, reduciendo horas de trabajo a segundos y funcionando con la clave de API gratuita del propio usuario sin costes de infraestructura centralizada.

- [ ] **Agente Autónomo de Seguimiento de Obras y Workspace con Gemini Spark (Cloud 24/7)**
  - *Descripción:* Plantillas y flujos de automatización agéntica en segundo plano conectando el agente persistente **Gemini Spark** de Google Workspace con la carpeta oficial `/BC3Viewer/` de Google Drive.
  - *Capacidades Previstas:*
    - *Auditoría y Resumen Ejecutivo Automático:* Monitorización continua de la carpeta `/BC3Viewer/` para detectar nuevas versiones o certificaciones y redactar actas de obra e informes de estado en Google Docs / Google Sheets analizando el Valor Ganado (EVM), desviaciones de costes y cumplimiento de plazos.
    - *Comunicaciones Proactivas de Obra:* Generación de borradores de correo en Gmail para la dirección facultativa o clientes con el estado de avance mensual sin intervención manual.
    - *Monitorización de Costes y Pliegos Técnicos:* Rastreo de variaciones de costes de materiales de construcción y redacción automática de justificaciones de precios y pliegos de condiciones técnicas vinculados a los conceptos del presupuesto.
  - *Impacto:* Transforma el visualizador en un centro de control de obra inteligente 24/7 que trabaja de manera autónoma en la nube del usuario incluso con sus dispositivos apagados.

---

