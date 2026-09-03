/**
 * IFCParser.js - Motor de Lectura y Extracción de Mediciones BIM (IFC a 5D)
 * Estándar ISO 10303-21 (STEP Physical File) para IFC2X3, IFC4 e IFC4X3.
 * Desarrollado para BC3 Viewer Premium
 * Autor: Jose Manuel Caamaño González (jmcaamanog)
 */

(function (global) {
    'use strict';

    const IFCParser = {
        version: "1.0.0",

        /**
         * Mapeo de tipos IFC a categorías constructivas legibles y unidades por defecto
         */
        ELEMENT_CATEGORIES: {
            'IFCWALL': { category: 'Muros y Cerramientos', icon: '🧱', defaultUnit: 'm2', priority: 2 },
            'IFCWALLSTANDARDCASE': { category: 'Muros y Cerramientos', icon: '🧱', defaultUnit: 'm2', priority: 2 },
            'IFCSLAB': { category: 'Forjados y Pavimentos', icon: '📐', defaultUnit: 'm2', priority: 3 },
            'IFCCOLUMN': { category: 'Estructura (Pilares)', icon: '🏛️', defaultUnit: 'm3', priority: 1 },
            'IFCBEAM': { category: 'Estructura (Vigas)', icon: '🏗️', defaultUnit: 'm3', priority: 1 },
            'IFCMEMBER': { category: 'Estructura Auxiliar', icon: '🔩', defaultUnit: 'm', priority: 1 },
            'IFCFOOTING': { category: 'Cimentaciones', icon: '⚓', defaultUnit: 'm3', priority: 0 },
            'IFCWINDOW': { category: 'Carpintería Exterior (Ventanas)', icon: '🪟', defaultUnit: 'ud', priority: 4 },
            'IFCDOOR': { category: 'Carpintería Interior (Puertas)', icon: '🚪', defaultUnit: 'ud', priority: 5 },
            'IFCCOVERING': { category: 'Revestimientos y Techos', icon: '🎨', defaultUnit: 'm2', priority: 6 },
            'IFCROOF': { category: 'Cubiertas', icon: '🏠', defaultUnit: 'm2', priority: 3 },
            'IFCSTAIR': { category: 'Escaleras', icon: '🪜', defaultUnit: 'ud', priority: 2 },
            'IFCSTAIRFLIGHT': { category: 'Tramos de Escalera', icon: '🪜', defaultUnit: 'm3', priority: 2 },
            'IFCRAILING': { category: 'Cerrajería y Barandillas', icon: '🛡️', defaultUnit: 'm', priority: 7 },
            'IFCSPACE': { category: 'Espacios y Zonas', icon: '📦', defaultUnit: 'm2', priority: 8 },
            'IFCPIPESEGMENT': { category: 'Instalaciones (Tuberías)', icon: '🚰', defaultUnit: 'm', priority: 9 },
            'IFCDUCTSEGMENT': { category: 'Instalaciones (Conductos)', icon: '💨', defaultUnit: 'm', priority: 9 }
        },

        /**
         * Parsea el contenido en texto de un archivo IFC (STEP ISO 10303-21)
         * @param {string} text - Contenido completo del archivo IFC
         * @param {Function} [onProgress] - Callback opcional para reporte de progreso (0-100)
         * @returns {Object} Modelo BIM estructurado con plantas, elementos y cubicaciones
         */
        parse: function (text, onProgress) {
            const startTime = Date.now();
            if (typeof onProgress === 'function') onProgress(5, "Iniciando lectura de sintaxis STEP...");

            // 1. Extraer cabecera
            const headerInfo = this._parseHeader(text);
            if (typeof onProgress === 'function') onProgress(15, "Cabecera validada: " + (headerInfo.schema || 'IFC'));

            // 2. Extraer sección DATA
            const dataStart = text.indexOf('DATA;');
            const dataEnd = text.lastIndexOf('ENDSEC;');
            if (dataStart === -1 || dataEnd === -1 || dataEnd <= dataStart) {
                throw new Error("El archivo no contiene una sección DATA válida según ISO 10303-21.");
            }

            const dataText = text.substring(dataStart + 5, dataEnd);
            if (typeof onProgress === 'function') onProgress(30, "Indexando entidades del modelo...");

            // 3. Indexar entidades por Express ID (#123)
            const entities = this._indexEntities(dataText);
            if (typeof onProgress === 'function') onProgress(55, `Indexadas ${Object.keys(entities).length} entidades. Resolviendo relaciones espaciales...`);

            // 4. Extraer niveles / plantas (IfcBuildingStorey)
            const storeys = this._extractStoreys(entities);

            // 5. Extraer conjuntos de cantidades (IfcElementQuantity) y relaciones
            const elementQuantities = this._extractQuantitySets(entities);

            // 6. Extraer relaciones espaciales (IfcRelContainedInSpatialStructure)
            const spatialMap = this._extractSpatialRelations(entities);

            // 7. Extraer tipos y nombres de tipo (IfcRelDefinesByType)
            const typeMap = this._extractTypeRelations(entities);

            // 8. Extraer relaciones elemento -> cantidades (IfcRelDefinesByProperties)
            const propertyMap = this._extractPropertyRelations(entities);

            if (typeof onProgress === 'function') onProgress(75, "Agrupando mediciones y cubicaciones por partida...");

            // 9. Construir el catálogo estructurado de elementos con sus mediciones
            const processedElements = [];
            const summaryByCategory = {};
            const summaryByStorey = {};

            let totalElementsCount = 0;
            let totalVolumeSum = 0;
            let totalAreaSum = 0;

            for (const expressId in entities) {
                const ent = entities[expressId];
                const catInfo = this.ELEMENT_CATEGORIES[ent.type];
                if (!catInfo) continue; // Ignorar entidades no constructivas (geometría base, representaciones, etc.)

                totalElementsCount++;

                // Determinar planta asociada
                const storeyId = spatialMap[expressId];
                const storeyName = storeyId && storeys[storeyId] ? storeys[storeyId].name : 'General / Sin Asignar';

                // Determinar nombre y tipo
                const typeName = typeMap[expressId] || ent.params[4] || ent.params[2] || ent.type;
                const elementName = ent.params[2] || typeName || `${ent.type} #${expressId}`;
                const globalId = ent.params[0] || `ID_${expressId}`;
                const tag = ent.params[7] || '';

                // Extraer cantidades
                const qtoIds = propertyMap[expressId] || [];
                const quantities = this._resolveQuantities(qtoIds, elementQuantities);

                // Determinar medición principal según el tipo
                let mainQty = 0;
                let mainUnit = catInfo.defaultUnit;

                if (mainUnit === 'm3') {
                    mainQty = quantities.netVolume || quantities.grossVolume || quantities.volume || 1;
                    totalVolumeSum += mainQty;
                } else if (mainUnit === 'm2') {
                    mainQty = quantities.netSideArea || quantities.netArea || quantities.grossSideArea || quantities.grossArea || quantities.area || 1;
                    totalAreaSum += mainQty;
                } else if (mainUnit === 'm') {
                    mainQty = quantities.length || quantities.height || 1;
                } else {
                    mainQty = quantities.count || 1;
                }

                // Normalizar valores no numéricos
                mainQty = typeof mainQty === 'number' && !isNaN(mainQty) ? Math.round(mainQty * 1000) / 1000 : 1;

                const elemObj = {
                    expressId: parseInt(expressId, 10),
                    globalId: globalId,
                    ifcType: ent.type,
                    category: catInfo.category,
                    icon: catInfo.icon,
                    name: elementName,
                    typeName: typeName,
                    tag: tag,
                    storey: storeyName,
                    unit: mainUnit,
                    quantity: mainQty,
                    allQuantities: quantities
                };

                processedElements.push(elemObj);

                // Acumular en resumen por Categoría
                if (!summaryByCategory[catInfo.category]) {
                    summaryByCategory[catInfo.category] = {
                        category: catInfo.category,
                        icon: catInfo.icon,
                        count: 0,
                        unit: mainUnit,
                        totalQuantity: 0,
                        types: {}
                    };
                }
                const catGroup = summaryByCategory[catInfo.category];
                catGroup.count++;
                catGroup.totalQuantity += mainQty;
                if (!catGroup.types[typeName]) {
                    catGroup.types[typeName] = { name: typeName, count: 0, quantity: 0, unit: mainUnit, elements: [] };
                }
                catGroup.types[typeName].count++;
                catGroup.types[typeName].quantity += mainQty;
                catGroup.types[typeName].elements.push(elemObj);

                // Acumular en resumen por Planta
                if (!summaryByStorey[storeyName]) {
                    summaryByStorey[storeyName] = {
                        name: storeyName,
                        count: 0,
                        categories: {}
                    };
                }
                const stGroup = summaryByStorey[storeyName];
                stGroup.count++;
                if (!stGroup.categories[catInfo.category]) {
                    stGroup.categories[catInfo.category] = { count: 0, quantity: 0, unit: mainUnit };
                }
                stGroup.categories[catInfo.category].count++;
                stGroup.categories[catInfo.category].quantity += mainQty;
            }

            if (typeof onProgress === 'function') onProgress(100, "Modelo BIM procesado con éxito.");

            const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

            return {
                header: headerInfo,
                stats: {
                    totalElements: totalElementsCount,
                    totalVolumeM3: Math.round(totalVolumeSum * 100) / 100,
                    totalAreaM2: Math.round(totalAreaSum * 100) / 100,
                    storeysCount: Object.keys(storeys).length || 1,
                    categoriesCount: Object.keys(summaryByCategory).length,
                    parseTimeSec: elapsed
                },
                storeys: Object.values(storeys),
                elements: processedElements,
                summaryByCategory: Object.values(summaryByCategory),
                summaryByStorey: Object.values(summaryByStorey)
            };
        },

        /**
         * Parsea la cabecera ISO 10303-21
         */
        _parseHeader: function (text) {
            const headerMatch = text.match(/HEADER;([\s\S]*?)ENDSEC;/);
            const headerText = headerMatch ? headerMatch[1] : '';

            let schema = 'IFC2X3';
            const schemaMatch = headerText.match(/FILE_SCHEMA\s*\(\s*\(\s*['"]([^'"]+)['"]/i);
            if (schemaMatch) schema = schemaMatch[1];

            let fileName = 'Modelo.ifc';
            const nameMatch = headerText.match(/FILE_NAME\s*\(\s*['"]([^'"]+)['"]/i);
            if (nameMatch) fileName = nameMatch[1];

            let timestamp = new Date().toISOString();
            const timeMatch = headerText.match(/FILE_NAME\s*\([^,]+,\s*['"]([^'"]+)['"]/i);
            if (timeMatch) timestamp = timeMatch[1];

            let author = 'Desconocido';
            const authorMatch = headerText.match(/FILE_NAME\s*\([^,]+,[^,]+,\s*\(\s*['"]([^'"]+)['"]/i);
            if (authorMatch) author = authorMatch[1];

            return {
                schema: schema,
                fileName: fileName,
                timestamp: timestamp,
                author: author
            };
        },

        /**
         * Indexa las entidades del archivo STEP
         * Formato: #123 = IFCENTITY(param1, param2, ...);
         */
        _indexEntities: function (dataText) {
            const entities = {};
            // Regex para capturar #ID=TIPO(params);
            const regex = /#([0-9]+)\s*=\s*([A-Z0-9_]+)\s*\(([\s\S]*?)\);(?=\s*#|\s*$)/g;
            let match;

            while ((match = regex.exec(dataText)) !== null) {
                const id = match[1];
                const type = match[2].toUpperCase();
                const rawParams = match[3];

                // Parsear parámetros simples de nivel superior
                const params = this._splitParams(rawParams);

                entities[id] = {
                    id: id,
                    type: type,
                    params: params,
                    rawParams: rawParams
                };
            }

            return entities;
        },

        /**
         * Divide los parámetros respetando comillas y paréntesis anidados
         */
        _splitParams: function (paramStr) {
            const params = [];
            let current = '';
            let inQuotes = false;
            let depth = 0;

            for (let i = 0; i < paramStr.length; i++) {
                const char = paramStr[i];

                if (char === "'" && (i === 0 || paramStr[i - 1] !== '\\')) {
                    inQuotes = !inQuotes;
                    current += char;
                } else if (!inQuotes && (char === '(' || char === '[')) {
                    depth++;
                    current += char;
                } else if (!inQuotes && (char === ')' || char === ']')) {
                    depth--;
                    current += char;
                } else if (char === ',' && !inQuotes && depth === 0) {
                    params.push(this._cleanParam(current));
                    current = '';
                } else {
                    current += char;
                }
            }

            if (current.trim()) {
                params.push(this._cleanParam(current));
            }

            return params;
        },

        _cleanParam: function (val) {
            val = val.trim();
            if (val === '$' || val === '*') return null;
            if (val.startsWith("'") && val.endsWith("'")) {
                val = val.substring(1, val.length - 1);
                // Decodificar caracteres especiales ISO 10303 (ej. \X2\00E1\X0\ -> á)
                return this._decodeStepString(val);
            }
            return val;
        },

        _decodeStepString: function (str) {
            // Decodifica secuencias tipo \X2\00E1\X0\ o \X\E1
            return str.replace(/\\X2\\([0-9A-Fa-f]{4})\\X0\\/g, (match, hex) => {
                return String.fromCharCode(parseInt(hex, 16));
            }).replace(/\\X\\([0-9A-Fa-f]{2})/g, (match, hex) => {
                return String.fromCharCode(parseInt(hex, 16));
            }).replace(/\\S\\(.)/g, '$1');
        },

        /**
         * Extrae las plantas (IfcBuildingStorey)
         */
        _extractStoreys: function (entities) {
            const storeys = {};
            for (const id in entities) {
                const ent = entities[id];
                if (ent.type === 'IFCBUILDINGSTOREY') {
                    const name = ent.params[2] || `Planta #${id}`;
                    const elevation = parseFloat(ent.params[8]) || 0;
                    storeys[id] = {
                        id: id,
                        name: name,
                        elevation: elevation
                    };
                }
            }
            return storeys;
        },

        /**
         * Extrae los conjuntos de cantidades (IfcElementQuantity) y conjuntos de propiedades de dimensiones (IfcPropertySet / Cotas)
         */
        _extractQuantitySets: function (entities) {
            const quantities = {}; // Id -> objeto de cantidades

            for (const id in entities) {
                const ent = entities[id];

                // 1. Caso Estándar: IFCELEMENTQUANTITY (Qto_WallBaseQuantities, etc.)
                if (ent.type === 'IFCELEMENTQUANTITY') {
                    const qtoName = ent.params[2] || 'BaseQuantities';
                    const qtyIds = this._extractIdsFromList(ent.rawParams);

                    const qMap = {};
                    for (let i = 0; i < qtyIds.length; i++) {
                        const qId = qtyIds[i];
                        const qEnt = entities[qId];
                        if (!qEnt) continue;

                        const name = (qEnt.params[0] || '').toLowerCase();
                        let val = 0;
                        for (let p = 2; p < qEnt.params.length; p++) {
                            const parsed = parseFloat(qEnt.params[p]);
                            if (!isNaN(parsed) && parsed !== 0) {
                                val = parsed;
                                break;
                            }
                        }

                        if (qEnt.type === 'IFCQUANTITYLENGTH') {
                            if (name.includes('length')) qMap.length = val;
                            else if (name.includes('height')) qMap.height = val;
                            else if (name.includes('width')) qMap.width = val;
                            else qMap.length = val;
                        } else if (qEnt.type === 'IFCQUANTITYAREA') {
                            if (name.includes('netsidearea')) qMap.netSideArea = val;
                            else if (name.includes('grosssidearea')) qMap.grossSideArea = val;
                            else if (name.includes('netarea')) qMap.netArea = val;
                            else if (name.includes('grossarea')) qMap.grossArea = val;
                            else qMap.area = val;
                        } else if (qEnt.type === 'IFCQUANTITYVOLUME') {
                            if (name.includes('netvolume')) qMap.netVolume = val;
                            else if (name.includes('grossvolume')) qMap.grossVolume = val;
                            else qMap.volume = val;
                        } else if (qEnt.type === 'IFCQUANTITYCOUNT') {
                            qMap.count = val || 1;
                        }
                    }

                    quantities[id] = {
                        name: qtoName,
                        data: qMap
                    };
                }
                // 2. Caso Revit / Propiedades en Español: IFCPROPERTYSET con "Cotas", "Dimensions", "Pset_QuantityTakeOff"
                else if (ent.type === 'IFCPROPERTYSET') {
                    const psetName = (ent.params[2] || '').toLowerCase();
                    const isDimensionPset = psetName.includes('cota') || psetName.includes('dimension') || psetName.includes('takeoff') || psetName.includes('common');
                    
                    if (isDimensionPset) {
                        const propIds = this._extractIdsFromList(ent.rawParams);
                        const qMap = {};

                        for (let i = 0; i < propIds.length; i++) {
                            const pId = propIds[i];
                            const pEnt = entities[pId];
                            if (!pEnt || pEnt.type !== 'IFCPROPERTYSINGLEVALUE') continue;

                            const rawName = (pEnt.params[0] || '');
                            const propName = this._decodeStepString(rawName).toLowerCase();
                            const valStr = pEnt.params[2] || pEnt.rawParams;

                            // Extraer valor numérico de expresiones como IFCAREAMEASURE(12.34) o IFCLENGTHMEASURE(5.6)
                            const numMatch = valStr.match(/(?:IFC[A-Z0-9_]+MEASURE|IFCREAL|IFCINTEGER)\s*\(\s*([0-9\.\-eE]+)\s*\)/i);
                            let val = numMatch ? parseFloat(numMatch[1]) : parseFloat(valStr);
                            if (isNaN(val)) continue;

                            if ((propName === 'área' || propName === 'area' || propName === 'superficie') && !qMap.area) {
                                qMap.area = val;
                                qMap.netSideArea = val;
                            } else if ((propName === 'volumen' || propName === 'volume') && !qMap.volume) {
                                qMap.volume = val;
                                qMap.netVolume = val;
                            } else if ((propName === 'longitud' || propName === 'length') && !qMap.length) {
                                qMap.length = val;
                            }
                        }

                        if (Object.keys(qMap).length > 0) {
                            quantities[id] = {
                                name: ent.params[2] || 'Cotas',
                                data: qMap
                            };
                        }
                    }
                }
            }

            return quantities;
        },

        /**
         * Extrae relaciones IfcRelContainedInSpatialStructure (elementos -> planta)
         */
        _extractSpatialRelations: function (entities) {
            const spatialMap = {}; // ElementId -> StoreyId
            for (const id in entities) {
                const ent = entities[id];
                if (ent.type === 'IFCRELCONTAINEDINSPATIALSTRUCTURE') {
                    // params: [GlobalId, Owner, Name, Description, (RelatedElements), RelatingStructure]
                    const elemIds = this._extractIdsFromList(ent.params[4] || '');
                    const structureId = this._cleanIdRef(ent.params[5]);

                    for (let i = 0; i < elemIds.length; i++) {
                        spatialMap[elemIds[i]] = structureId;
                    }
                }
            }
            return spatialMap;
        },

        /**
         * Extrae relaciones IfcRelDefinesByType (elementos -> tipo)
         */
        _extractTypeRelations: function (entities) {
            const typeMap = {}; // ElementId -> TypeName
            for (const id in entities) {
                const ent = entities[id];
                if (ent.type === 'IFCRELDEFINESBYTYPE') {
                    // params: [GlobalId, Owner, Name, Description, (RelatedObjects), RelatingType]
                    const elemIds = this._extractIdsFromList(ent.params[4] || '');
                    const typeId = this._cleanIdRef(ent.params[5]);
                    const typeEnt = entities[typeId];

                    if (typeEnt) {
                        const typeName = typeEnt.params[2] || typeEnt.params[0] || typeEnt.type;
                        for (let i = 0; i < elemIds.length; i++) {
                            typeMap[elemIds[i]] = typeName;
                        }
                    }
                }
            }
            return typeMap;
        },

        /**
         * Extrae relaciones IfcRelDefinesByProperties (elementos -> IfcElementQuantity / Pset)
         */
        _extractPropertyRelations: function (entities) {
            const propMap = {}; // ElementId -> [PropertySetId]
            for (const id in entities) {
                const ent = entities[id];
                if (ent.type === 'IFCRELDEFINESBYPROPERTIES') {
                    // params: [GlobalId, Owner, Name, Description, (RelatedObjects), RelatingPropertyDefinition]
                    const elemIds = this._extractIdsFromList(ent.params[4] || '');
                    const propId = this._cleanIdRef(ent.params[5]);

                    for (let i = 0; i < elemIds.length; i++) {
                        const eId = elemIds[i];
                        if (!propMap[eId]) propMap[eId] = [];
                        propMap[eId].push(propId);
                    }
                }
            }
            return propMap;
        },

        _resolveQuantities: function (qtoIds, elementQuantities) {
            const result = {};
            for (let i = 0; i < qtoIds.length; i++) {
                const qto = elementQuantities[qtoIds[i]];
                if (qto && qto.data) {
                    Object.assign(result, qto.data);
                }
            }
            return result;
        },

        _extractIdsFromList: function (listStr) {
            const ids = [];
            const matches = listStr.match(/#([0-9]+)/g);
            if (matches) {
                for (let i = 0; i < matches.length; i++) {
                    ids.push(matches[i].replace('#', ''));
                }
            }
            return ids;
        },

        _cleanIdRef: function (idStr) {
            if (!idStr) return null;
            const m = idStr.match(/#([0-9]+)/);
            return m ? m[1] : null;
        }
    };

    // Exportar como módulo UMD / Global
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = IFCParser;
    } else {
        global.IFCParser = IFCParser;
    }

})(typeof window !== 'undefined' ? window : this);
