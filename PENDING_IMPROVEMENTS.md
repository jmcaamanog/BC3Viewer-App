# 🚀 Roadmap y Mejoras Pendientes (Coming Soon) — BC3 Viewer

Este documento detalla las líneas de investigación, mejoras de software y nuevas funcionalidades técnicas propuestas para futuras versiones de **BC3 Viewer**. Las tareas están ordenadas por prioridad técnica y potencial de impacto para el sector de la edificación.

---

## 🏗️ 1. Extracción Directa de Mediciones desde Modelos BIM (IFC)

### 🎯 Objetivo
Habilitar la lectura directa de archivos **IFC (Industry Foundation Classes)** en formato abierto para extraer datos geométricos y cuantitativos de elementos constructivos (muros, forjados, pilares, ventanas) y asociarlos automáticamente a partidas del presupuesto en formato `.bc3`.

### 💡 Descripción Técnica
- **Visualizador 3D Embebido:** Integración de un visor ligero basado en **three.js** o bibliotecas especializadas como **web-ifc** para renderizar el modelo BIM en local en el navegador sin dependencia de servidores.
- **Mapeo de Entidades:** Algoritmos para asociar clases IFC (ej. `IfcWall`, `IfcSlab`) a códigos de partidas de presupuesto de la base de datos de precios.
- **Cálculo de Fórmulas Dinámicas:** Extracción automática de propiedades físicas como volumen, superficie y longitud para rellenar las líneas de medición (~M) del archivo BC3 con trazabilidad total hacia el elemento ID del modelo IFC.

---

## 📈 2. Estimador de Huella de Carbono y Sostenibilidad (Ciclo de Vida)

### 🎯 Objetivo
Visualizar el impacto ambiental del presupuesto, calculando las emisiones de CO₂ equivalentes asociadas a los materiales y procesos de cada partida de obra.

### 💡 Descripción Técnica
- **Base de Datos Eco-Construcción:** Mapeo de insumos con bases de datos de Declaraciones Ambientales de Producto (DAP).
- **Indicadores de Sostenibilidad:** Gráficas en el Dashboard de distribución de carbono incorporado por capítulos para apoyar la toma de decisiones ecológicas en la fase de diseño.

---

## 📊 3. Planificación Financiera Avanzada (Valor Ganado)

### 🎯 Objetivo
Ampliar el módulo Gantt actual con análisis del Método del Valor Ganado (EVM) para controlar desviaciones de plazos y costes de forma integrada en obra.

### 💡 Descripción Técnica
- **Curva S Triple:** Comparar el coste presupuestado del trabajo planificado (PV), el coste real del trabajo realizado (AC) y el valor ganado (EV) en base a las certificaciones mensuales.
- **Indicadores de Desempeño:** Cálculo automático del Índice de Desempeño del Coste (CPI) y del Plazo (SPI) proyectando estimaciones al finalizar la obra.
