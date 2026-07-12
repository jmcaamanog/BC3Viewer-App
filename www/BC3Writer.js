// ⚠️ ARCHIVO AUTOGENERADO - NO EDITAR DIRECTAMENTE
// Modificar en: packages/bc3-writer-jmc-js/src/index.js

class BC3Writer {
    constructor() {
        this.lines = [];
    }

    // Generar archivo BC3 de texto completo a partir de un JSON estructurado
    write(parsedData) {
        this.lines = [];

        if (!parsedData) {
            throw new Error('No se han provisto datos válidos para generar el archivo BC3.');
        }

        const { properties, concepts } = parsedData;

        // 1. Registro de versión (~V)
        this.writeVersion(properties);

        // 2. Registros de conceptos (~C), descomposiciones (~D), mediciones (~M) y textos (~T)
        // Recorremos los conceptos y vamos escribiendo sus tramas
        for (const code in concepts) {
            const concept = concepts[code];
            
            // Escribir ~C
            this.writeConcept(concept);

            // Escribir ~D (si tiene hijos)
            if (concept.decomposition && concept.decomposition.length > 0) {
                this.writeDecomposition(concept);
            }

            // Escribir ~M (si tiene mediciones detalladas)
            if (concept.measurements && concept.measurements.length > 0) {
                this.writeMeasurements(concept);
            }

            // Escribir ~T (si tiene descripción extendida)
            if (concept.description) {
                this.writeText(concept);
            }
        }

        // Unir por saltos de línea estándar CRLF (habitual en FIEBDC-3)
        return this.lines.join('\r\n') + '\r\n';
    }

    // Formatear números a string con coma decimal
    formatNumber(num, decimals = 2) {
        if (num === null || num === undefined || isNaN(num)) return '';
        return parseFloat(num).toFixed(decimals).replace('.', ',');
    }

    writeVersion(props = {}) {
        const owner = props.owner || '';
        const format = props.format || 'FIEBDC-3/2020';
        const generator = props.generator || 'BC3Viewer-JMC-Writer';
        const description = props.description || 'Exportado desde BC3 Viewer';
        const charset = props.charset || 'ANSI';

        // ~V|Propietario|Formato|Generador|Descripción|Charset|
        this.lines.push(`~V|${owner}|${format}|${generator}|${description}|${charset}|`);
    }

    writeConcept(concept) {
        const code = concept.code || '';
        const unit = concept.unit || '';
        const summary = concept.summary || '';
        const price = this.formatNumber(concept.price || 0, 4);
        const date = concept.date || '';
        const type = concept.type !== undefined ? concept.type : 0;

        // ~C|Código|Unidad|Resumen|Precio|Fecha|Tipo|
        this.lines.push(`~C|${code}|${unit}|${summary}|${price}|${date}|${type}|`);
    }

    writeDecomposition(concept) {
        const parentCode = concept.code || '';
        
        // Formatear hijos: ChildCode\Factor\Type\
        const items = concept.decomposition.map(item => {
            const code = item.code || '';
            const factor = this.formatNumber(item.factor !== undefined ? item.factor : 1.0, 4);
            const type = item.type !== undefined ? item.type : 0;
            return `${code}\\${factor}\\${type}`;
        });

        // ~D|ParentCode|Child1\Factor1\Type1\Child2\Factor2\Type2\|
        this.lines.push(`~D|${parentCode}|${items.join('\\')}\\|`);
    }

    writeMeasurements(concept) {
        const childCode = concept.code || '';
        
        // Las líneas de medición se escriben buscando relaciones.
        // FIEBDC-3 estándar agrupa las mediciones por relaciones parent\child.
        // Para simplificar y mantener la integridad, generamos una línea de medición directa.
        // Formato: ~M|ParentCode\ChildCode|Línea1|Línea2|...|Total|
        // Aquí ParentCode se omite o se asocia si se conoce, por defecto usamos una relación directa.
        // Nota: En la visualización del parser, childCode es el concepto que posee las mediciones.
        const parentRelation = `\\${childCode}`;

        let total = 0;
        const sublines = concept.measurements.map(m => {
            const label = m.label || '';
            const units = m.units !== undefined ? m.units : '1';
            const l = m.l !== undefined ? m.l : '';
            const w = m.w !== undefined ? m.w : '';
            const h = m.h !== undefined ? m.h : '';

            // Calcular parcial
            const uVal = parseFloat(units.replace ? units.replace(',', '.') : units) || 1;
            const lVal = parseFloat(l.replace ? l.replace(',', '.') : l) || 1;
            const wVal = parseFloat(w.replace ? w.replace(',', '.') : w) || 1;
            const hVal = parseFloat(h.replace ? h.replace(',', '.') : h) || 1;
            total += uVal * lVal * wVal * hVal;

            return `\\${label}\\${units}\\${l}\\${w}\\${h}`;
        });

        const totalFormatted = this.formatNumber(total, 3);

        // ~M|Parent\Child|||\\Label\\Uds\\L\\A\\H|Total|
        // Usamos la misma estructura de strings delimitados
        this.lines.push(`~M|${parentRelation}|||${sublines.join('')}|${totalFormatted}|`);
    }

    writeText(concept) {
        const code = concept.code || '';
        const text = concept.description || '';

        // ~T|Código|TextoDescripciónExtendida|
        this.lines.push(`~T|${code}|${text}|`);
    }
}

