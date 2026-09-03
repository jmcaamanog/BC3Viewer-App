/**
 * IFC2BC3Engine.js - Motor de Conversión y Generación de Presupuestos BIM 5D (IFC a FIEBDC-3)
 * Mapea elementos y mediciones del modelo IFC a capítulos, partidas descompuestas y líneas de medición (~M).
 * Cumple estrictamente el estándar FIEBDC-3/2020 para BC3 Viewer Premium.
 * Autor: Jose Manuel Caamaño González (jmcaamanog)
 */

(function (global) {
    'use strict';

    const IFC2BC3Engine = {
        version: "1.0.0",

        /**
         * Mapeo de capítulos estándar según el tipo de elemento IFC (con terminación '#' para FIEBDC-3)
         */
        CHAPTER_DEFINITIONS: [
            { code: '01_CIM#', name: '01. Cimentaciones y Contención', types: ['IFCFOOTING'], icon: '⚓' },
            { code: '02_EST#', name: '02. Estructura y Forjados', types: ['IFCCOLUMN', 'IFCBEAM', 'IFCMEMBER', 'IFCSLAB'], icon: '🏗️' },
            { code: '03_ALB#', name: '03. Albañilería y Particiones', types: ['IFCWALL', 'IFCWALLSTANDARDCASE'], icon: '🧱' },
            { code: '04_CAR#', name: '04. Carpinterías y Cerrajería', types: ['IFCWINDOW', 'IFCDOOR', 'IFCRAILING'], icon: '🪟' },
            { code: '05_CUB#', name: '05. Cubiertas y Acabados', types: ['IFCROOF', 'IFCCOVERING', 'IFCSTAIR', 'IFCSTAIRFLIGHT'], icon: '🏠' },
            { code: '06_INS#', name: '06. Instalaciones y Redes', types: ['IFCPIPESEGMENT', 'IFCDUCTSEGMENT'], icon: '🚰' }
        ],

        /**
         * Catálogo de precios y unidades de referencia
         */
        PRECIOS_BIM_DEFECTO: {
            'IFCWALL': { code: 'ALB010', summary: 'Fábrica de ladrillo cerámico o bloque para cerramiento', unit: 'm2', price: 46.50 },
            'IFCWALLSTANDARDCASE': { code: 'ALB020', summary: 'Tabiquería o trasdosado interior de ladrillo o placa', unit: 'm2', price: 34.20 },
            'IFCSLAB': { code: 'EST020', summary: 'Forjado unidireccional o losa maciza de hormigón armado', unit: 'm2', price: 68.00 },
            'IFCCOLUMN': { code: 'EST010', summary: 'Pilar de hormigón armado HA-25/B/20/IIa', unit: 'm3', price: 320.00 },
            'IFCBEAM': { code: 'EST015', summary: 'Viga plana o descolgada de hormigón armado', unit: 'm3', price: 340.00 },
            'IFCMEMBER': { code: 'EST030', summary: 'Perfilería de acero estructural laminado o conformado', unit: 'kg', price: 2.85 },
            'IFCFOOTING': { code: 'CIM010', summary: 'Zapata o losa de cimentación de hormigón armado', unit: 'm3', price: 185.00 },
            'IFCWINDOW': { code: 'CAR010', summary: 'Ventana oscilobatiente de aluminio con RPT o PVC y doble vidrio', unit: 'ud', price: 380.00 },
            'IFCDOOR': { code: 'CAR020', summary: 'Puerta de paso interior de madera o lacada en block', unit: 'ud', price: 240.00 },
            'IFCCOVERING': { code: 'REV010', summary: 'Falso techo continuo de yeso laminado o revestimiento interior', unit: 'm2', price: 28.50 },
            'IFCROOF': { code: 'CUB010', summary: 'Cubierta plana o inclinada con aislamiento e impermeabilización', unit: 'm2', price: 78.00 },
            'IFCSTAIR': { code: 'EST040', summary: 'Peldañeado y meseta de escalera de hormigón', unit: 'ud', price: 540.00 },
            'IFCSTAIRFLIGHT': { code: 'EST045', summary: 'Tramo de escalera de losa inclinada de hormigón armado', unit: 'm3', price: 310.00 },
            'IFCRAILING': { code: 'CER010', summary: 'Barandilla de acero lacado o vidrio de seguridad', unit: 'm', price: 110.00 },
            'IFCPIPESEGMENT': { code: 'INS010', summary: 'Tubería de distribución de polipropileno/cobre con aislamiento', unit: 'm', price: 22.00 },
            'IFCDUCTSEGMENT': { code: 'INS020', summary: 'Conducto de ventilación o climatización de chapa o fibra', unit: 'm', price: 45.00 }
        },

        /**
         * Convierte un modelo IFC parseado en un archivo y estructura completa de presupuesto BC3
         * @param {Object} ifcData - Salida de IFCParser.parse()
         * @param {Object} [options] - Opciones de generación
         * @returns {Object} { rawText: string, data: Object }
         */
        generateBC3: function (ifcData, options = {}) {
            const projectName = ifcData.header && ifcData.header.fileName ? ifcData.header.fileName.replace(/\.ifc$/i, '') : 'Presupuesto_BIM_5D';
            const rootCode = 'PROYECTO_BIM##';

            const properties = {
                owner: (ifcData.header && ifcData.header.author) || 'COATAC / jmcaamanog',
                format: 'FIEBDC-3/2020',
                generator: 'BC3Viewer-BIM5D-Engine',
                description: `Presupuesto 5D derivado de ${projectName}.ifc`,
                charset: 'ANSI'
            };

            const concepts = {};

            // 1. Concepto Raíz (Presupuesto General FIEBDC-3 con terminación '##')
            concepts[rootCode] = {
                code: rootCode,
                unit: '',
                summary: `PRESUPUESTO GENERAL BIM 5D - ${projectName}`,
                price: 0,
                date: this._getCurrentDateStr(),
                type: 1, // Raíz / Capítulo
                children: [],
                decomposition: [],
                description: `Presupuesto obtenido mediante extracción automática de mediciones del modelo IFC (${(ifcData.header && ifcData.header.schema) || 'IFC'}) con desglose detallado por planta y elemento.`,
                measurements: []
            };

            // 2. Agrupar elementos por capítulos y partidas
            this.CHAPTER_DEFINITIONS.forEach(chapDef => {
                const matchingElements = ifcData.elements.filter(e => chapDef.types.includes(e.ifcType));
                if (matchingElements.length === 0) return;

                const chapCode = chapDef.code;
                concepts[chapCode] = {
                    code: chapCode,
                    unit: '',
                    summary: `${chapDef.icon} ${chapDef.name}`,
                    price: 0,
                    date: this._getCurrentDateStr(),
                    type: 1, // Capítulo
                    children: [],
                    decomposition: [],
                    description: `Capítulo generado automáticamente desde modelo BIM para elementos de tipo ${chapDef.types.join(', ')}.`,
                    measurements: []
                };

                // Añadir el capítulo a la descomposición de la raíz
                concepts[rootCode].children.push(chapCode);
                concepts[rootCode].decomposition.push({
                    code: chapCode,
                    factor: 1.0,
                    type: 1
                });

                // Agrupar elementos de este capítulo por Nombre de Tipo / Partida
                const groupedByType = {};
                matchingElements.forEach(elem => {
                    const groupKey = elem.typeName || elem.name || elem.ifcType;
                    if (!groupedByType[groupKey]) {
                        groupedByType[groupKey] = {
                            ifcType: elem.ifcType,
                            name: elem.name,
                            typeName: groupKey,
                            unit: elem.unit,
                            elements: []
                        };
                    }
                    groupedByType[groupKey].elements.push(elem);
                });

                // Crear partidas para cada tipo agrupado
                let itemIndex = 1;
                for (const typeKey in groupedByType) {
                    const group = groupedByType[typeKey];
                    const itemSeqStr = String(itemIndex).padStart(2, '0');
                    const itemCode = `${chapCode.replace('#', '')}_P${itemSeqStr}`;

                    // Buscar precio de referencia
                    const defaultRef = this.PRECIOS_BIM_DEFECTO[group.ifcType] || { price: 50.00, summary: group.typeName, unit: group.unit };
                    const itemPrice = defaultRef.price;
                    const itemUnit = group.unit || defaultRef.unit;
                    const itemSummary = `${group.typeName} (${group.elements.length} uds)`;

                    // Calcular cantidad total y construir líneas de medición detallada (~M)
                    let totalQty = 0;
                    const measurements = [];

                    group.elements.forEach(elem => {
                        totalQty += elem.quantity;
                        measurements.push({
                            label: `${elem.storey} - ${elem.name} [ID: ${elem.globalId}]`,
                            units: '1',
                            l: String(elem.quantity).replace('.', ','),
                            w: '1',
                            h: '1'
                        });
                    });

                    // Descomposición básica de mano de obra y materiales
                    const decomp = this._generateBasicDecomposition(itemCode, itemPrice, itemUnit);

                    concepts[itemCode] = {
                        code: itemCode,
                        unit: itemUnit,
                        summary: itemSummary,
                        price: itemPrice,
                        date: this._getCurrentDateStr(),
                        type: 2, // Partida
                        parentCode: chapCode,
                        children: decomp.childrenCodes,
                        decomposition: decomp.items,
                        description: `Partida de obra vinculada a ${group.elements.length} elementos del modelo BIM. Tipo de elemento: ${group.ifcType}. Medición total: ${Math.round(totalQty * 100) / 100} ${itemUnit}.`,
                        measurements: measurements
                    };

                    // Registrar también los conceptos básicos (Mano de obra, materiales) en concepts
                    decomp.basicConcepts.forEach(bc => {
                        if (!concepts[bc.code]) {
                            concepts[bc.code] = bc;
                        }
                    });

                    // Añadir partida al capítulo
                    concepts[chapCode].children.push(itemCode);
                    concepts[chapCode].decomposition.push({
                        code: itemCode,
                        factor: totalQty,
                        type: 2
                    });

                    itemIndex++;
                }
            });

            // 3. Serializar a texto FIEBDC-3
            const rawText = this._serializeToFiebdc3({ properties, concepts });

            // 4. Retornar también parsedData listo para ser cargado por el visor
            return {
                rawText: rawText,
                data: {
                    properties: properties,
                    concepts: concepts,
                    root_nodes: [rootCode],
                    original_text: rawText
                }
            };
        },

        _generateBasicDecomposition: function (partidaCode, totalPrice, unit) {
            const moCode = `MO_OF1`;
            const peonCode = `MO_PEON`;
            const matCode = `${partidaCode}_MAT`;

            const pMo = Math.round(totalPrice * 0.25 * 100) / 100;
            const pPeon = Math.round(totalPrice * 0.15 * 100) / 100;
            const pMat = Math.round(totalPrice * 0.60 * 100) / 100;

            const basicConcepts = [
                {
                    code: moCode,
                    unit: 'h',
                    summary: 'Oficial 1ª de construcción / montaje',
                    price: 26.50,
                    date: this._getCurrentDateStr(),
                    type: 3, // Básico
                    children: [],
                    decomposition: [],
                    description: '',
                    measurements: []
                },
                {
                    code: peonCode,
                    unit: 'h',
                    summary: 'Peón ordinario de edificación',
                    price: 21.00,
                    date: this._getCurrentDateStr(),
                    type: 3,
                    children: [],
                    decomposition: [],
                    description: '',
                    measurements: []
                },
                {
                    code: matCode,
                    unit: unit,
                    summary: `Materiales y suministro para ${partidaCode}`,
                    price: pMat,
                    date: this._getCurrentDateStr(),
                    type: 3,
                    children: [],
                    decomposition: [],
                    description: '',
                    measurements: []
                }
            ];

            const factorMo = pMo > 0 ? Math.round((pMo / 26.50) * 1000) / 1000 : 0.1;
            const factorPeon = pPeon > 0 ? Math.round((pPeon / 21.00) * 1000) / 1000 : 0.1;

            return {
                childrenCodes: [moCode, peonCode, matCode],
                items: [
                    { code: moCode, factor: factorMo, type: 3 },
                    { code: peonCode, factor: factorPeon, type: 3 },
                    { code: matCode, factor: 1.0, type: 3 }
                ],
                basicConcepts: basicConcepts
            };
        },

        _serializeToFiebdc3: function ({ properties, concepts }) {
            const lines = [];
            lines.push(`~V|${properties.owner || ''}|${properties.format || 'FIEBDC-3/2020'}|${properties.generator || 'BC3Viewer'}|${properties.description || ''}|${properties.charset || 'ANSI'}|`);

            for (const code in concepts) {
                const c = concepts[code];
                const priceStr = parseFloat(c.price || 0).toFixed(4).replace('.', ',');
                lines.push(`~C|${c.code}|${c.unit || ''}|${c.summary || ''}|${priceStr}|${c.date || ''}|${c.type || 0}|`);

                if (c.decomposition && c.decomposition.length > 0) {
                    const decStr = c.decomposition.map(d => `${d.code}\\${parseFloat(d.factor || 1).toFixed(4).replace('.', ',')}\\${d.type || 0}`).join('\\');
                    lines.push(`~D|${c.code}|${decStr}\\|`);
                }

                if (c.measurements && c.measurements.length > 0) {
                    let tot = 0;
                    const sublines = c.measurements.map(m => {
                        const uVal = parseFloat(String(m.units).replace(',', '.')) || 1;
                        const lVal = parseFloat(String(m.l).replace(',', '.')) || 1;
                        tot += uVal * lVal;
                        return `\\${m.label || ''}\\${m.units || '1'}\\${m.l || ''}\\${m.w || ''}\\${m.h || ''}`;
                    });
                    const totStr = parseFloat(tot).toFixed(3).replace('.', ',');
                    // Relación parent\child en ~M
                    const parentRel = c.parentCode ? `${c.parentCode}\\${c.code}` : `\\${c.code}`;
                    lines.push(`~M|${parentRel}|||${sublines.join('')}|${totStr}|`);
                }

                if (c.description) {
                    lines.push(`~T|${c.code}|${c.description}|`);
                }
            }

            return lines.join('\r\n') + '\r\n';
        },

        _getCurrentDateStr: function () {
            const d = new Date();
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = String(d.getFullYear()).slice(-2);
            return `${day}${month}${year}`;
        }
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = IFC2BC3Engine;
    } else {
        global.IFC2BC3Engine = IFC2BC3Engine;
    }

})(typeof window !== 'undefined' ? window : this);
