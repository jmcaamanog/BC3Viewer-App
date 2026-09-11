/**
 * IFC2BC3Engine.js - Motor Avanzado de Generación de Presupuestos BIM 5D (IFC a FIEBDC-3)
 * Mapea elementos y mediciones del modelo IFC a 16 capítulos canónicos de edificación,
 * con soporte para desglose multicapa (IfcMaterialLayerSet), Psets normativos (CTE) y líneas de medición (~M).
 * Cumple estrictamente el estándar FIEBDC-3/2024 para BC3 Viewer Premium.
 * Autor: Jose Manuel Caamaño González (jmcaamanog)
 */

(function (global) {
    'use strict';

    const IFC2BC3Engine = {
        version: "2.0.0",

        /**
         * 16 Capítulos Canónicos de Edificación según FIEBDC-3 / GuBIMclass / CTE
         */
        CHAPTER_DEFINITIONS: [
            { code: '01_ACT#', name: '01. Acondicionamiento del Terreno y Demoliciones', icon: '🚜', types: ['IFCSITE'] },
            { code: '02_CIM#', name: '02. Cimentaciones y Contención', icon: '⚓', types: ['IFCFOOTING', 'IFCPILE'] },
            { code: '03_EST#', name: '03. Estructura y Elementos Portantes', icon: '🏗️', types: ['IFCCOLUMN', 'IFCBEAM', 'IFCMEMBER', 'IFCSLAB', 'IFCSTAIRFLIGHT', 'IFCSTAIR'] },
            { code: '04_CER#', name: '04. Fachadas y Cerramientos Exteriores', icon: '🧱', types: ['IFCWALL', 'IFCWALLSTANDARDCASE', 'IFCCURTAINWALL'] },
            { code: '05_PAR#', name: '05. Particiones Interiores y Distribución', icon: '🚪', types: ['IFCWALL', 'IFCWALLSTANDARDCASE'] },
            { code: '06_CUB#', name: '06. Cubiertas e Impermeabilizaciones', icon: '🏠', types: ['IFCROOF', 'IFCSLAB'] },
            { code: '07_REV#', name: '07. Revestimientos y Falsos Techos', icon: '🎨', types: ['IFCCOVERING'] },
            { code: '08_PAV#', name: '08. Pavimentos, Alicatados y Rodapiés', icon: '📐', types: ['IFCCOVERING', 'IFCSLAB'] },
            { code: '09_CEX#', name: '09. Carpintería Exterior y Vidrios', icon: '🪟', types: ['IFCWINDOW', 'IFCDOOR', 'IFCPLATE', 'IFCCURTAINWALL'] },
            { code: '10_CIN#', name: '10. Carpintería Interior', icon: '🚪', types: ['IFCDOOR'] },
            { code: '11_CRJ#', name: '11. Cerrajería y Barandillas', icon: '🛡️', types: ['IFCRAILING'] },
            { code: '12_FON#', name: '12. Fontanería, Saneamiento y Sanitarios', icon: '🚿', types: ['IFCFLOWTERMINAL', 'IFCPIPESEGMENT'] },
            { code: '13_CLI#', name: '13. Climatización y Ventilación', icon: '💨', types: ['IFCDUCTSEGMENT'] },
            { code: '14_ELE#', name: '14. Electricidad, Iluminación y Telecom', icon: '🔌', types: ['IFCDISTRIBUTIONELEMENT', 'IFCDISTRIBUTIONPORT'] },
            { code: '15_AIS#', name: '15. Aislamientos Térmicos y Acústicos', icon: '🧊', types: [] },
            { code: '16_URB#', name: '16. Urbanización, Mobiliario y Equipamiento', icon: '🛋️', types: ['IFCFURNISHINGELEMENT', 'IFCFURNITURE'] },
            { code: '99_AUD#', name: '99. Auditoría y Elementos Singulares (Proxy)', icon: '📦', types: ['IFCBUILDINGELEMENTPROXY'] }
        ],

        /**
         * Catálogo de precios de referencia y unidades estándar para edificación
         */
        PRECIOS_BIM_DEFECTO: {
            '01_ACT#': { code: 'ACT010', summary: 'Acondicionamiento y movimiento de tierras en parcela', unit: 'm2', price: 14.50 },
            '02_CIM#': { code: 'CIM010', summary: 'Cimentación de hormigón armado HA-25/B/20/IIa', unit: 'm3', price: 185.00 },
            '03_EST#': { code: 'EST010', summary: 'Estructura portante de hormigón armado o forjado', unit: 'm3', price: 320.00 },
            '04_CER#': { code: 'CER010', summary: 'Cerramiento exterior de fachada de fábrica o muro', unit: 'm2', price: 54.00 },
            '05_PAR#': { code: 'PAR010', summary: 'Tabiquería interior de ladrillo o placa de yeso laminado (PYL)', unit: 'm2', price: 32.50 },
            '06_CUB#': { code: 'CUB010', summary: 'Cubierta plana o inclinada con impermeabilización', unit: 'm2', price: 78.00 },
            '07_REV#': { code: 'REV010', summary: 'Revestimiento continuo, enlucido de yeso o falso techo', unit: 'm2', price: 24.00 },
            '08_PAV#': { code: 'PAV010', summary: 'Pavimento de gres cerámico o parquet con mortero de agarre', unit: 'm2', price: 42.00 },
            '09_CEX#': { code: 'CEX010', summary: 'Carpintería exterior con rotura de puente térmico y doble vidrio', unit: 'ud', price: 395.00 },
            '10_CIN#': { code: 'CIN010', summary: 'Puerta interior de paso en block acabada en madera o lacada', unit: 'ud', price: 235.00 },
            '11_CRJ#': { code: 'CRJ010', summary: 'Barandilla o cerrajería de acero/aluminio y vidrio de seguridad', unit: 'm', price: 115.00 },
            '12_FON#': { code: 'FON010', summary: 'Aparato sanitario, grifería y red de fontanería/saneamiento', unit: 'ud', price: 220.00 },
            '13_CLI#': { code: 'CLI010', summary: 'Red de climatización, conductos o ventilación mecánica', unit: 'm', price: 48.00 },
            '14_ELE#': { code: 'ELE010', summary: 'Instalación eléctrica, cuadro, circuitos y mecanismos', unit: 'ud', price: 85.00 },
            '15_AIS#': { code: 'AIS010', summary: 'Aislamiento térmico de XPS o lana de roca mineral', unit: 'm2', price: 18.50 },
            '16_URB#': { code: 'URB010', summary: 'Equipamiento, mobiliario o urbanización exterior', unit: 'ud', price: 150.00 },
            '99_AUD#': { code: 'AUD010', summary: 'Elemento singular o complementario del modelo BIM (Proxy)', unit: 'ud', price: 50.00 }
        },

        /**
         * Convierte un modelo IFC parseado en una estructura completa de presupuesto BC3
         * @param {Object} ifcData - Salida de IFCParser.parse()
         * @param {Object} [options] - Opciones de generación: { mode: 'layers' | 'elements' }
         * @returns {Object} { rawText: string, data: Object }
         */
        generateBC3: function (ifcData, options = {}) {
            const mode = options.mode || 'layers'; // 'layers' (multicapa) o 'elements' (global)
            const projectName = ifcData.header && ifcData.header.fileName ? ifcData.header.fileName.replace(/\.ifc$/i, '') : 'Presupuesto_BIM_5D';
            const rootCode = 'PROYECTO_BIM##';

            const properties = {
                owner: (ifcData.header && ifcData.header.author) || 'COATAC / jmcaamanog',
                format: 'FIEBDC-3/2024',
                generator: 'BC3Viewer-BIM5D-Engine v2.0',
                description: `Presupuesto BIM 5D derivado de ${projectName}.ifc (Modo: ${mode === 'layers' ? 'Desglose Multicapa' : 'Elementos Integrados'})`,
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
                type: 1, // Raíz
                children: [],
                decomposition: [],
                description: `Presupuesto obtenido mediante extracción automática de mediciones del modelo IFC (${(ifcData.header && ifcData.header.schema) || 'IFC'}) con desglose técnico conforme a FIEBDC-3 y GuBIMclass.`,
                measurements: []
            };

            // 2. Clasificación de cada elemento en los 16 capítulos canónicos
            const chaptersMap = {};
            this.CHAPTER_DEFINITIONS.forEach(ch => {
                chaptersMap[ch.code] = {
                    definition: ch,
                    items: []
                };
            });

            // Procesar cada elemento del IFC mediante el algoritmo de clasificación en cascada
            ifcData.elements.forEach(elem => {
                const targetChapterCode = this._classifyElement(elem);
                if (chaptersMap[targetChapterCode]) {
                    chaptersMap[targetChapterCode].items.push(elem);
                } else {
                    chaptersMap['99_AUD#'].items.push(elem);
                }
            });

            // 3. Crear cada capítulo en el presupuesto si tiene elementos
            this.CHAPTER_DEFINITIONS.forEach(chapDef => {
                const chapData = chaptersMap[chapDef.code];
                if (!chapData || chapData.items.length === 0) return;

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
                    description: `Capítulo generado automáticamente desde modelo BIM conforme a clasificación técnica de edificación.`,
                    measurements: []
                };

                // Añadir el capítulo a la descomposición de la raíz
                concepts[rootCode].children.push(chapCode);
                concepts[rootCode].decomposition.push({
                    code: chapCode,
                    factor: 1.0,
                    type: 1
                });

                // Agrupar elementos por Partida (según modo 'layers' o 'elements')
                if (mode === 'layers') {
                    this._buildMultilayerItems(chapCode, chapData.items, concepts, chaptersMap);
                } else {
                    this._buildElementItems(chapCode, chapData.items, concepts);
                }
            });

            // 4. Calcular precios acumulados de capítulos y raíz
            this._recalculateTotals(concepts, rootCode);

            // 5. Serializar a texto FIEBDC-3
            const rawText = this._serializeToFiebdc3({ properties, concepts });

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

        /**
         * Algoritmo de Clasificación en Cascada ("Cascade Fallback")
         */
        _classifyElement: function (elem) {
            const ifcType = elem.ifcType;
            const func = elem.functionalProperties || {};
            const classif = elem.classification;
            const nameLower = ((elem.name || '') + ' ' + (elem.typeName || '')).toLowerCase();

            // 1. Clasificación directa por código explícito (Uniformat / GuBIMclass / FIEBDC)
            if (classif && classif.code) {
                const c = classif.code.toUpperCase();
                if (c.startsWith('A') || c.startsWith('01')) return '01_ACT#';
                if (c.startsWith('CIM') || c.startsWith('02')) return '02_CIM#';
                if (c.startsWith('B10') || c.startsWith('EST') || c.startsWith('03')) return '03_EST#';
                if (c.startsWith('B20') || c.startsWith('CER') || c.startsWith('04')) return '04_CER#';
                if (c.startsWith('C10') || c.startsWith('PAR') || c.startsWith('05')) return '05_PAR#';
                if (c.startsWith('B30') || c.startsWith('CUB') || c.startsWith('06')) return '06_CUB#';
                if (c.startsWith('C30') || c.startsWith('REV') || c.startsWith('07')) return '07_REV#';
                if (c.startsWith('PAV') || c.startsWith('08')) return '08_PAV#';
                if (c.startsWith('CEX') || c.startsWith('09')) return '09_CEX#';
                if (c.startsWith('CIN') || c.startsWith('10')) return '10_CIN#';
                if (c.startsWith('CRJ') || c.startsWith('11')) return '11_CRJ#';
                if (c.startsWith('D20') || c.startsWith('FON') || c.startsWith('12')) return '12_FON#';
                if (c.startsWith('D30') || c.startsWith('CLI') || c.startsWith('13')) return '13_CLI#';
                if (c.startsWith('D50') || c.startsWith('ELE') || c.startsWith('14')) return '14_ELE#';
                if (c.startsWith('AIS') || c.startsWith('15')) return '15_AIS#';
                if (c.startsWith('E') || c.startsWith('URB') || c.startsWith('16')) return '16_URB#';
            }

            // 2. Muros (IfcWall, IfcWallStandardCase)
            if (ifcType === 'IFCWALL' || ifcType === 'IFCWALLSTANDARDCASE') {
                if (func.isLoadBearing === true || nameLower.includes('carga') || nameLower.includes('hormigón') || nameLower.includes('estructural')) {
                    return '03_EST#';
                }
                if (func.isExternal === true || nameLower.includes('fachada') || nameLower.includes('cerramiento') || nameLower.includes('exterior')) {
                    return '04_CER#';
                }
                if (func.isExternal === false || nameLower.includes('tabique') || nameLower.includes('partición') || nameLower.includes('interior') || nameLower.includes('pyl') || nameLower.includes('pladur')) {
                    return '05_PAR#';
                }
                // Fallback por espesor: > 20 cm suele ser cerramiento exterior
                const thick = (elem.allQuantities && elem.allQuantities.width) || 0;
                return thick > 0.20 ? '04_CER#' : '05_PAR#';
            }

            // 3. Forjados y Pavimentos (IfcSlab)
            if (ifcType === 'IFCSLAB') {
                if (func.predefinedType === 'BASESLAB' || nameLower.includes('solera') || nameLower.includes('cáviti') || nameLower.includes('cimentación') || nameLower.includes('sanitario')) {
                    return '02_CIM#';
                }
                if (func.predefinedType === 'ROOF' || nameLower.includes('cubierta')) {
                    return '06_CUB#';
                }
                if (nameLower.includes('suelo') || nameLower.includes('pavimento') || nameLower.includes('gres') || nameLower.includes('parquet') || nameLower.includes('madera')) {
                    return '08_PAV#';
                }
                return '03_EST#';
            }

            // 4. Puertas (IfcDoor)
            if (ifcType === 'IFCDOOR') {
                if (func.isExternal === true || nameLower.includes('exterior') || nameLower.includes('entrada') || nameLower.includes('acceso') || nameLower.includes('garaje')) {
                    return '09_CEX#';
                }
                return '10_CIN#';
            }

            // 5. Ventanas y Vidrios
            if (ifcType === 'IFCWINDOW' || ifcType === 'IFCPLATE' || ifcType === 'IFCCURTAINWALL') {
                return '09_CEX#';
            }

            // 6. Barandillas
            if (ifcType === 'IFCRAILING') {
                return '11_CRJ#';
            }

            // 7. Cubiertas (IfcRoof)
            if (ifcType === 'IFCROOF') {
                return '06_CUB#';
            }

            // 8. Cimentaciones
            if (ifcType === 'IFCFOOTING' || ifcType === 'IFCPILE') {
                return '02_CIM#';
            }

            // 9. Estructura (Pilares, Vigas, Escaleras, Perfiles)
            if (ifcType === 'IFCCOLUMN' || ifcType === 'IFCBEAM' || ifcType === 'IFCMEMBER' || ifcType === 'IFCSTAIR' || ifcType === 'IFCSTAIRFLIGHT') {
                return '03_EST#';
            }

            // 10. Revestimientos y Falsos Techos (IfcCovering)
            if (ifcType === 'IFCCOVERING') {
                if (nameLower.includes('suelo') || nameLower.includes('pavimento') || nameLower.includes('alicatado')) {
                    return '08_PAV#';
                }
                return '07_REV#';
            }

            // 11. Instalaciones Fontanería y Sanitarios
            if (ifcType === 'IFCFLOWTERMINAL' || ifcType === 'IFCPIPESEGMENT') {
                return '12_FON#';
            }

            // 12. Climatización
            if (ifcType === 'IFCDUCTSEGMENT') {
                return '13_CLI#';
            }

            // 13. Electricidad
            if (ifcType === 'IFCDISTRIBUTIONELEMENT' || ifcType === 'IFCDISTRIBUTIONPORT') {
                return '14_ELE#';
            }

            // 14. Mobiliario y Terreno
            if (ifcType === 'IFCFURNISHINGELEMENT' || ifcType === 'IFCFURNITURE') {
                return '16_URB#';
            }
            if (ifcType === 'IFCSITE') {
                return '01_ACT#';
            }

            // 15. Elementos Proxy y Varios
            return '99_AUD#';
        },

        /**
         * Agrupación tradicional por elementos integrados
         */
        _buildElementItems: function (chapCode, elements, concepts) {
            const groupedByType = {};
            elements.forEach(elem => {
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

            let itemIndex = 1;
            for (const typeKey in groupedByType) {
                const group = groupedByType[typeKey];
                const itemSeqStr = String(itemIndex).padStart(2, '0');
                const itemCode = `${chapCode.replace('#', '')}_P${itemSeqStr}`;

                const defaultRef = this.PRECIOS_BIM_DEFECTO[chapCode] || { price: 50.00, summary: group.typeName, unit: group.unit };
                const itemPrice = defaultRef.price;
                const itemUnit = group.unit || defaultRef.unit;
                const itemSummary = `${group.typeName} (${group.elements.length} uds)`;

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

                const decomp = this._generateBasicDecomposition(itemCode, itemPrice, itemUnit);

                concepts[itemCode] = {
                    code: itemCode,
                    unit: itemUnit,
                    summary: itemSummary,
                    price: itemPrice,
                    date: this._getCurrentDateStr(),
                    type: 2,
                    parentCode: chapCode,
                    children: decomp.childrenCodes,
                    decomposition: decomp.items,
                    description: `Partida de obra para ${group.elements.length} elementos de tipo ${group.ifcType}. Medición total: ${Math.round(totalQty * 100) / 100} ${itemUnit}.`,
                    measurements: measurements
                };

                decomp.basicConcepts.forEach(bc => {
                    if (!concepts[bc.code]) concepts[bc.code] = bc;
                });

                concepts[chapCode].children.push(itemCode);
                concepts[chapCode].decomposition.push({
                    code: itemCode,
                    factor: Math.round(totalQty * 1000) / 1000,
                    type: 2
                });

                itemIndex++;
            }
        },

        /**
         * Agrupación avanzada con Desglose Multicapa (IfcMaterialLayerSet)
         */
        _buildMultilayerItems: function (chapCode, elements, concepts, chaptersMap) {
            // Separar elementos que tienen capas de los que no
            const multilayerElems = elements.filter(e => e.materialLayers && e.materialLayers.length > 0);
            const standardElems = elements.filter(e => !e.materialLayers || e.materialLayers.length === 0);

            // 1. Elementos estándar sin capas: agrupar normalmente
            if (standardElems.length > 0) {
                this._buildElementItems(chapCode, standardElems, concepts);
            }

            // 2. Elementos con capas: agrupar por Tipo de Solución Constructiva
            if (multilayerElems.length === 0) return;

            const solutionGroups = {};
            multilayerElems.forEach(elem => {
                const solName = elem.layerSetName || elem.typeName || elem.name;
                if (!solutionGroups[solName]) {
                    solutionGroups[solName] = {
                        name: solName,
                        layers: elem.materialLayers,
                        elements: []
                    };
                }
                solutionGroups[solName].elements.push(elem);
            });

            let solIdx = 1;
            for (const solName in solutionGroups) {
                const sol = solutionGroups[solName];
                const solSeq = String(solIdx).padStart(2, '0');

                // Cada capa de la solución genera una partida especializada
                sol.layers.forEach((layer, layerIdx) => {
                    const lSeq = String(layerIdx + 1).padStart(2, '0');
                    const itemCode = `${chapCode.replace('#', '')}_S${solSeq}L${lSeq}`;
                    const matName = layer.materialName;
                    const thickMm = Math.round(layer.thickness * 1000);

                    // Determinar unidad y precio según material
                    const unit = layer.thickness > 0.08 && matName.toLowerCase().includes('hormigón') ? 'm3' : 'm2';
                    const price = this._estimateLayerPrice(matName, layer.thickness, unit);
                    const itemSummary = `${matName}${thickMm > 0 ? ' (e=' + thickMm + 'mm)' : ''} en ${sol.name}`;

                    let totalQty = 0;
                    const measurements = [];

                    sol.elements.forEach(elem => {
                        let qty = elem.quantity; // m2 por defecto
                        if (unit === 'm3') {
                            qty = Math.round(elem.quantity * layer.thickness * 1000) / 1000;
                        }
                        totalQty += qty;

                        measurements.push({
                            label: `${elem.storey} - ${elem.name} [Capa: ${matName}] [ID: ${elem.globalId}]`,
                            units: '1',
                            l: String(elem.quantity).replace('.', ','),
                            w: layer.thickness > 0 ? String(layer.thickness).replace('.', ',') : '1',
                            h: '1'
                        });
                    });

                    const decomp = this._generateBasicDecomposition(itemCode, price, unit);

                    concepts[itemCode] = {
                        code: itemCode,
                        unit: unit,
                        summary: itemSummary,
                        price: price,
                        date: this._getCurrentDateStr(),
                        type: 2,
                        parentCode: chapCode,
                        children: decomp.childrenCodes,
                        decomposition: decomp.items,
                        description: `Capa constructiva correspondiente a ${matName} (espesor ${thickMm} mm) en solución ${sol.name}. Trazable a ${sol.elements.length} elementos BIM.`,
                        measurements: measurements
                    };

                    decomp.basicConcepts.forEach(bc => {
                        if (!concepts[bc.code]) concepts[bc.code] = bc;
                    });

                    concepts[chapCode].children.push(itemCode);
                    concepts[chapCode].decomposition.push({
                        code: itemCode,
                        factor: Math.round(totalQty * 1000) / 1000,
                        type: 2
                    });
                });

                solIdx++;
            }
        },

        _estimateLayerPrice: function (matName, thickness, unit) {
            const m = matName.toLowerCase();
            if (m.includes('ladrillo') || m.includes('fábrica') || m.includes('bloque')) return 38.50;
            if (m.includes('aislamiento') || m.includes('xps') || m.includes('lana') || m.includes('eps')) return 16.80;
            if (m.includes('placa') || m.includes('yeso') || m.includes('pyl') || m.includes('pladur')) return 22.50;
            if (m.includes('enlucido') || m.includes('yeso') || m.includes('revoco') || m.includes('mortero')) return 14.20;
            if (m.includes('cerámica') || m.includes('gres') || m.includes('porcelanico')) return 36.00;
            if (m.includes('madera') || m.includes('parquet') || m.includes('tarima')) return 44.00;
            if (m.includes('hormigón')) return unit === 'm3' ? 240.00 : 45.00;
            if (m.includes('aire') || m.includes('cámara')) return 4.50;
            return 25.00;
        },

        _recalculateTotals: function (concepts, rootCode) {
            // Calcular importe de partidas e hijos
            for (const code in concepts) {
                const c = concepts[code];
                if (c.type === 1 && c.decomposition && c.decomposition.length > 0) {
                    let sum = 0;
                    c.decomposition.forEach(d => {
                        const child = concepts[d.code];
                        if (child) {
                            sum += (d.factor || 1.0) * (child.price || 0);
                        }
                    });
                    c.price = Math.round(sum * 100) / 100;
                }
            }

            // Calcular importe del root
            const root = concepts[rootCode];
            if (root) {
                let rootSum = 0;
                root.decomposition.forEach(d => {
                    const ch = concepts[d.code];
                    if (ch) rootSum += (ch.price || 0);
                });
                root.price = Math.round(rootSum * 100) / 100;
            }
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
                    type: 3,
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

        _getCurrentDateStr: function () {
            const now = new Date();
            const d = String(now.getDate()).padStart(2, '0');
            const m = String(now.getMonth() + 1).padStart(2, '0');
            const y = String(now.getFullYear()).slice(-2);
            return `${d}${m}${y}`;
        },

        _serializeToFiebdc3: function (parsedData) {
            const lines = [];
            const props = parsedData.properties || {};
            const concepts = parsedData.concepts || {};

            // Cabecera ~V
            const headerOwner = (props.owner || 'COATAC').replace(/\\/g, '/');
            const headerVer = 'FIEBDC-3/2020';
            const headerDate = this._getCurrentDateStr();
            lines.push(`~V|${headerOwner}\\${headerVer}\\${headerDate}||ANSI|`);

            // Conceptos ~C
            for (const code in concepts) {
                const c = concepts[code];
                const summary = (c.summary || '').replace(/[\r\n|]/g, ' ').trim();
                const priceStr = (typeof c.price === 'number' && !isNaN(c.price)) ? c.price.toFixed(2) : '0.00';
                const dateStr = c.date || headerDate;
                const typeStr = String(c.type || 2);
                lines.push(`~C|${c.code}|${c.unit || ''}|${summary}|${priceStr}|${dateStr}|${typeStr}|`);
            }

            // Descomposiciones ~D
            for (const code in concepts) {
                const c = concepts[code];
                if (c.decomposition && c.decomposition.length > 0) {
                    const parts = [`~D|${c.code}|`];
                    c.decomposition.forEach(d => {
                        const factorStr = (typeof d.factor === 'number' && !isNaN(d.factor)) ? d.factor.toFixed(3) : '1.000';
                        const typeStr = String(d.type || 2);
                        parts.push(`${d.code}\\${factorStr}\\${typeStr}\\`);
                    });
                    lines.push(parts.join(''));
                }
            }

            // Textos largos ~T
            for (const code in concepts) {
                const c = concepts[code];
                if (c.description && c.description.trim()) {
                    const descClean = c.description.replace(/[\r\n]+/g, ' ').trim();
                    lines.push(`~T|${c.code}|${descClean}|`);
                }
            }

            // Mediciones detalladas ~M
            for (const code in concepts) {
                const c = concepts[code];
                if (c.measurements && c.measurements.length > 0) {
                    const mLines = [`~M|${c.code}|`];
                    c.measurements.forEach(m => {
                        const label = (m.label || '').replace(/[\r\n|\\]/g, ' ').trim();
                        const u = m.units || '1';
                        const l = m.l || '1';
                        const w = m.w || '1';
                        const h = m.h || '1';
                        mLines.push(`1\\${label}\\${u}\\${l}\\${w}\\${h}\\`);
                    });
                    lines.push(mLines.join(''));
                }
            }

            return lines.join('\r\n') + '\r\n';
        }
    };

    // Exportar módulo UMD / Global
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = IFC2BC3Engine;
    } else {
        global.IFC2BC3Engine = IFC2BC3Engine;
    }

})(typeof window !== 'undefined' ? window : this);
