/**
 * =============================================================================
 * IFCViewer3D.js - Controlador Principal del Visor 3D WebGL (Three.js + web-ifc)
 * BC3Viewer-App - BIM 5D & 3D Interactive ConTech Module
 * =============================================================================
 */

(function (window) {
    'use strict';

    const IFCViewer3D = {
        container: null,
        scene: null,
        camera: null,
        renderer: null,
        controls: null,
        ifcLoader: null,
        ifcModel: null,
        highlightSubset: null,
        currentBuffer: null,
        currentIfcData: null,
        activeClippingPlane: null,
        isXRay: false,
        expressIdToElementMap: {},
        globalIdToElementMap: {},
        selectedElement: null,
        onElementClickedCallback: null,

        /**
         * Inicializa la escena Three.js, cámara, renderer, luces y controles
         */
        init: function (containerId) {
            const container = document.getElementById(containerId);
            if (!container) {
                console.error("IFCViewer3D: Contenedor no encontrado:", containerId);
                return false;
            }

            if (this.renderer && this.container === container) {
                this.onResize();
                return true;
            }

            this.container = container;
            // Eliminar solo canvas previos sin alterar elementos DOM fijos (badge de autor, sidebar, loading)
            const oldCanvases = this.container.querySelectorAll('canvas');
            oldCanvases.forEach(c => c.remove());

            const THREE = window.THREE;
            const OrbitControls = window.OrbitControls;
            const IFCLoader = window.IFCLoader;

            if (!THREE || !OrbitControls || !IFCLoader) {
                console.error("IFCViewer3D: Three.js, OrbitControls o IFCLoader no disponibles en window.");
                return false;
            }

            // 1. Escena
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x0a0f1d);

            // 2. Cámara
            const width = this.container.clientWidth || 800;
            const height = this.container.clientHeight || 600;
            this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
            this.camera.position.set(25, 20, 30);

            // 3. Renderer con soporte nativo de planos de corte (Local Clipping)
            this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
            this.renderer.setSize(width, height);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.localClippingEnabled = true;
            this.renderer.shadowMap.enabled = false;
            this.container.appendChild(this.renderer.domElement);

            // 4. Controles orbitales
            this.controls = new OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.08;
            this.controls.screenSpacePanning = true;
            this.controls.minDistance = 1;
            this.controls.maxDistance = 400;

            // 5. Iluminación arquitectónica ConTech
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
            this.scene.add(ambientLight);

            const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.85);
            dirLight1.position.set(40, 60, 30);
            this.scene.add(dirLight1);

            const dirLight2 = new THREE.DirectionalLight(0x90cdf4, 0.35);
            dirLight2.position.set(-30, -20, -30);
            this.scene.add(dirLight2);

            // 6. Suelo y Rejilla espacial
            const grid = new THREE.GridHelper(80, 80, 0x0ea5e9, 0x1e293b);
            grid.position.y = -0.01;
            this.scene.add(grid);

            // 7. Instanciar IFCLoader
            this.ifcLoader = new IFCLoader();
            if (this.ifcLoader.ifcManager) {
                this.ifcLoader.ifcManager.setWasmPath('./');
            }

            // 8. Eventos de Raycasting y Tarjeta HUD
            this._setupRaycasting();
            this._setupHudEvents();

            // 9. Redimensionamiento y bucle de renderizado
            window.addEventListener('resize', () => this.onResize());
            this._animate();

            console.log("IFCViewer3D: Motor WebGL inicializado con éxito.");
            return true;
        },

        /**
         * Bucle de animación
         */
        _animate: function () {
            requestAnimationFrame(() => this._animate());
            if (this.controls) this.controls.update();
            if (this.renderer && this.scene && this.camera) {
                this.renderer.render(this.scene, this.camera);
            }
        },

        /**
         * Carga y renderiza el modelo IFC desde un ArrayBuffer de forma asíncrona y ultra-rápida
         */
        loadModel: async function (arrayBuffer, ifcData, fileName) {
            if (!this.init('visor3dCanvasContainer')) {
                console.error("IFCViewer3D: No se pudo inicializar el canvas antes de cargar.");
                return;
            }

            if (!arrayBuffer) {
                console.warn("IFCViewer3D: arrayBuffer no proporcionado.");
                return;
            }

            this.currentBuffer = arrayBuffer;
            this.currentIfcData = ifcData;

            // Crear mapas de búsqueda rápida por GlobalId e ID
            this.expressIdToElementMap = {};
            this.globalIdToElementMap = {};
            if (ifcData && ifcData.elements) {
                ifcData.elements.forEach(elem => {
                    this.expressIdToElementMap[elem.id] = elem;
                    this.expressIdToElementMap[String(elem.id)] = elem;
                    if (elem.globalId) this.globalIdToElementMap[elem.globalId] = elem;
                });
            }

            // Actualizar etiqueta del modelo en la barra
            const modelLabel = document.getElementById('visor3dModelName');
            if (modelLabel) modelLabel.textContent = fileName || (ifcData && ifcData.header ? ifcData.header.fileName : 'Modelo IFC');

            // Rellenar selector de plantas con cotas reales
            this._populateStoreysDropdown(ifcData);

            // Mostrar badge de carga
            const loadingBadge = document.getElementById('v3dLoadingBadge');
            const loadingText = loadingBadge ? loadingBadge.querySelector('span') : null;
            if (loadingBadge) {
                loadingBadge.style.display = 'flex';
                if (loadingText) loadingText.textContent = 'Procesando geometría 3D del modelo...';
            }

            // Limpiar modelo anterior si existe
            if (this.ifcModel) {
                try {
                    this.scene.remove(this.ifcModel);
                    if (this.ifcModel.geometry) this.ifcModel.geometry.dispose();
                } catch (e) { }
                this.ifcModel = null;
            }
            this.resetHighlight();
            this.hideElementCard();
            this.applyClippingPlane(null);

            // Configurar Web-IFC para máxima velocidad (Fast Booleans y omitir espacios vacíos)
            try {
                if (this.ifcLoader && this.ifcLoader.ifcManager) {
                    await this.ifcLoader.ifcManager.setWasmPath('./');
                    if (this.ifcLoader.ifcManager.applyWebIfcConfig) {
                        this.ifcLoader.ifcManager.applyWebIfcConfig({
                            USE_FAST_BOOLS: true
                        });
                    }
                    if (this.ifcLoader.ifcManager.setupOptionalCategories) {
                        // Omitir cajas invisibles de espacios (IfcSpace: 3856911033) y huecos (3588315303)
                        this.ifcLoader.ifcManager.setupOptionalCategories({
                            3856911033: false,
                            3588315303: false
                        });
                    }
                    if (this.ifcLoader.ifcManager.setOnProgress) {
                        this.ifcLoader.ifcManager.setOnProgress((event) => {
                            if (loadingText && event && event.total) {
                                const pct = Math.min(99, Math.round((event.loaded / event.total) * 100));
                                loadingText.textContent = `Generando mallas 3D (${pct}%)...`;
                            }
                        });
                    }
                }
            } catch (cfgErr) {
                console.warn("IFCViewer3D: Configuración previa:", cfgErr);
            }

            // Ejecución asíncrona real
            try {
                const uint8 = arrayBuffer instanceof Uint8Array ? arrayBuffer : new Uint8Array(arrayBuffer);
                console.log(`IFCViewer3D: Parseando buffer (${(uint8.byteLength / 1024 / 1024).toFixed(2)} MB)...`);

                const t0 = performance.now();
                const model = await this.ifcLoader.parse(uint8);
                const tElapsed = ((performance.now() - t0) / 1000).toFixed(2);
                console.log(`IFCViewer3D: Modelo 3D generado con éxito en ${tElapsed}s.`);

                this.ifcModel = model;
                this.scene.add(model);

                if (loadingBadge) loadingBadge.style.display = 'none';

                // Centrar cámara en el modelo
                this.fitToView();
            } catch (err) {
                if (loadingBadge) loadingBadge.style.display = 'none';
                console.error("IFCViewer3D: Error parseando geometría:", err);
                alert("Error generando geometría 3D: " + (err.message || err));
            }
        },

        /**
         * Centra la cámara orbital para encuadrar todo el modelo
         */
        fitToView: function () {
            if (!this.ifcModel || !this.camera || !this.controls) return;

            const THREE = window.THREE;
            const box = new THREE.Box3().setFromObject(this.ifcModel);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());

            const maxDim = Math.max(size.x, size.y, size.z);
            const fov = this.camera.fov * (Math.PI / 180);
            let cameraDist = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.5;
            if (isNaN(cameraDist) || cameraDist < 5) cameraDist = 25;

            this.camera.position.set(center.x + cameraDist * 0.7, center.y + cameraDist * 0.5, center.z + cameraDist * 0.7);
            this.camera.lookAt(center);
            this.controls.target.copy(center);
            this.controls.update();
        },

        /**
         * Resalta un elemento en color cian brillante por su GlobalId o ExpressID
         */
        highlightElement: function (idOrGlobalId, focusCamera = false) {
            if (!this.ifcModel) return;

            // 1. Deseleccionar y limpiar primero cualquier elemento previamente resaltado
            this.resetHighlight();

            let expressId = null;
            let elementObj = null;

            if (this.globalIdToElementMap && this.globalIdToElementMap[idOrGlobalId]) {
                elementObj = this.globalIdToElementMap[idOrGlobalId];
                expressId = parseInt(elementObj.id || elementObj.expressId, 10);
            } else if (this.expressIdToElementMap && this.expressIdToElementMap[idOrGlobalId]) {
                elementObj = this.expressIdToElementMap[idOrGlobalId];
                expressId = parseInt(elementObj.id || elementObj.expressId || idOrGlobalId, 10);
            } else {
                expressId = parseInt(idOrGlobalId, 10);
            }

            if (isNaN(expressId)) return;

            const THREE = window.THREE;
            const planes = this.activeClippingPlane ? [this.activeClippingPlane] : [];
            const highlightMat = new THREE.MeshLambertMaterial({
                color: 0x06b6d4, // Cian neón ConTech
                transparent: true,
                opacity: 0.85,
                depthTest: true,
                clippingPlanes: planes,
                clipShadows: true
            });

            try {
                this.highlightSubset = this.ifcLoader.ifcManager.createSubset({
                    modelID: this.ifcModel.modelID,
                    ids: [expressId],
                    material: highlightMat,
                    scene: this.scene,
                    removePrevious: true,
                    customID: 'active-selection-subset'
                });

                if (this.highlightSubset) {
                    this.highlightSubset.name = 'active-selection-subset';
                    this.highlightSubset.isSelectionSubset = true;
                }

                this.selectedExpressId = expressId;
                this.selectedElement = elementObj || { id: String(expressId), name: `Elemento #${expressId}` };

                // Actualizar etiqueta en barra superior
                const label = document.getElementById('v3dSelectedLabel');
                if (label) {
                    const name = elementObj ? elementObj.name : `Elemento #${expressId}`;
                    const storey = elementObj && elementObj.storey ? ` (${elementObj.storey})` : '';
                    label.textContent = `🎯 ${name}${storey}`;
                }

                if (focusCamera && this.highlightSubset) {
                    const box = new THREE.Box3().setFromObject(this.highlightSubset);
                    const center = box.getCenter(new THREE.Vector3());
                    if (!isNaN(center.x)) {
                        this.controls.target.copy(center);
                        this.controls.update();
                    }
                }
            } catch (err) {
                console.warn("IFCViewer3D: No se pudo resaltar elemento:", err);
            }
        },

        /**
         * Quita cualquier elemento resaltado y deselecciona completamente
         */
        resetHighlight: function () {
            if (this.highlightSubset) {
                try {
                    if (this.ifcModel && this.ifcLoader && this.ifcLoader.ifcManager) {
                        this.ifcLoader.ifcManager.removeSubset(this.ifcModel.modelID, this.scene, 'active-selection-subset');
                    }
                } catch (e) { }
                try {
                    this.scene.remove(this.highlightSubset);
                    if (this.highlightSubset.geometry) this.highlightSubset.geometry.dispose();
                    if (this.highlightSubset.material) {
                        if (Array.isArray(this.highlightSubset.material)) {
                            this.highlightSubset.material.forEach(m => m.dispose());
                        } else {
                            this.highlightSubset.material.dispose();
                        }
                    }
                } catch (e) { }
                this.highlightSubset = null;
            }

            // Limpieza exhaustiva de cualquier malla huérfana de selección
            if (this.scene && this.scene.children) {
                for (let i = this.scene.children.length - 1; i >= 0; i--) {
                    const child = this.scene.children[i];
                    if (child && (child.name === 'active-selection-subset' || child.isSelectionSubset)) {
                        this.scene.remove(child);
                    }
                }
            }

            this.selectedExpressId = null;
            this.selectedElement = null;
            this.hideElementCard();

            const label = document.getElementById('v3dSelectedLabel');
            if (label) label.textContent = 'Haz clic en un elemento para inspeccionarlo';
        },

        /**
         * Muestra el panel lateral deslizable con todos los atributos y propiedades del elemento
         */
        showElementCard: function (elemObj, expressId) {
            const sidebar = document.getElementById('v3dElementSidebar');
            if (!sidebar) return;

            this.selectedElement = elemObj || { id: String(expressId), name: `Elemento #${expressId}` };
            this.selectedExpressId = parseInt(expressId, 10);

            const nameEl = document.getElementById('v3dCardName');
            const storeyEl = document.getElementById('v3dCardStorey');
            const iconEl = document.getElementById('v3dCardIcon');

            const name = elemObj ? (elemObj.name || `Elemento #${expressId}`) : `Elemento #${expressId}`;
            const storey = elemObj ? (elemObj.storey || 'Sin Planta Asignada') : 'Modelo BIM 3D';
            const globalId = elemObj ? (elemObj.globalId || String(expressId)) : String(expressId);

            if (nameEl) nameEl.textContent = name;
            if (storeyEl) storeyEl.textContent = storey;

            // Icono representativo por tipo
            if (iconEl) {
                const lower = (name + ' ' + (elemObj ? (elemObj.ifcType || elemObj.category || '') : '')).toLowerCase();
                if (lower.includes('wall') || lower.includes('muro') || lower.includes('tabique')) iconEl.textContent = '🧱';
                else if (lower.includes('slab') || lower.includes('forjado') || lower.includes('suelo') || lower.includes('losa')) iconEl.textContent = '🔲';
                else if (lower.includes('column') || lower.includes('pilar')) iconEl.textContent = '🏛️';
                else if (lower.includes('beam') || lower.includes('viga')) iconEl.textContent = '📏';
                else if (lower.includes('window') || lower.includes('ventana')) iconEl.textContent = '🪟';
                else if (lower.includes('door') || lower.includes('puerta')) iconEl.textContent = '🚪';
                else if (lower.includes('roof') || lower.includes('cubierta')) iconEl.textContent = '🏠';
                else iconEl.textContent = '📐';
            }

            // Limpiar filtro de búsqueda anterior
            const searchInput = document.getElementById('v3dPropsSearch');
            if (searchInput) {
                searchInput.value = '';
                const allRows = document.querySelectorAll('.v3d-props-table tbody tr');
                allRows.forEach(row => { row.style.display = ''; });
            }

            // Cada bloque de datos empieza replegado como solicita el usuario
            document.querySelectorAll('.v3d-props-section').forEach(sec => sec.classList.add('is-collapsed'));

            // 1. Tabla de Identificación y Ubicación
            const pName = document.getElementById('propValName');
            const pIfcType = document.getElementById('propValIfcType');
            const pType = document.getElementById('propValType');
            const pStorey = document.getElementById('propValStorey');
            const pId = document.getElementById('v3dCardId');
            const pExp = document.getElementById('propValExpressId');
            const pTag = document.getElementById('propValTag');
            const badgeIfcType = document.getElementById('v3dBadgeIfcType');

            const ifcTypeStr = elemObj ? (elemObj.ifcType || 'IFC') : 'IFC';
            if (pName) pName.textContent = name;
            if (pIfcType) pIfcType.textContent = ifcTypeStr;
            if (pType) pType.textContent = elemObj ? (elemObj.typeName || elemObj.category || '-') : '-';
            if (pStorey) pStorey.textContent = storey;
            if (pId) pId.textContent = globalId;
            if (pExp) pExp.textContent = '#' + expressId;
            if (pTag) pTag.textContent = (elemObj && elemObj.tag) ? elemObj.tag : '-';
            if (badgeIfcType) badgeIfcType.textContent = ifcTypeStr;

            // 2. Tabla de Mediciones y Dimensiones
            const qtyBody = document.getElementById('v3dTableQtyBody');
            const badgeQty = document.getElementById('v3dBadgeQty');
            const mainQtyStr = (elemObj && elemObj.quantity) ? `${elemObj.quantity} ${elemObj.unit || ''}` : '-';
            if (badgeQty) badgeQty.textContent = mainQtyStr;

            if (qtyBody) {
                let rowsHtml = '';
                rowsHtml += `<tr><td class="prop-key">Medición Principal</td><td class="prop-val highlight">${mainQtyStr}</td></tr>`;

                if (elemObj && elemObj.allQuantities) {
                    const q = elemObj.allQuantities;
                    const labels = {
                        netSideArea: 'Área Lateral Neta (m²)',
                        netArea: 'Área Neta (m²)',
                        grossSideArea: 'Área Lateral Bruta (m²)',
                        grossArea: 'Área Bruta (m²)',
                        netVolume: 'Volumen Neto (m³)',
                        grossVolume: 'Volumen Bruto (m³)',
                        volume: 'Volumen (m³)',
                        length: 'Longitud (m)',
                        height: 'Altura (m)',
                        width: 'Anchura / Espesor (m)',
                        perimeter: 'Perímetro (m)',
                        count: 'Número de Unidades'
                    };

                    for (const k in q) {
                        const val = q[k];
                        if (val !== undefined && val !== null && !isNaN(val) && val !== 0) {
                            const lbl = labels[k] || k;
                            rowsHtml += `<tr><td class="prop-key">${lbl}</td><td class="prop-val mono">${val}</td></tr>`;
                        }
                    }
                }
                qtyBody.innerHTML = rowsHtml;
            }

            // 3. Tarjeta de Integración con Presupuesto FIEBDC-3
            const budgetPrice = document.getElementById('v3dBudgetPrice');
            const budgetTitle = document.getElementById('v3dCardBudget');

            // Buscar si no tiene aún el budgetConcept asociado
            if (elemObj && !elemObj.budgetConcept && window.parsedData && window.parsedData.concepts) {
                const targetGid = elemObj.globalId;
                for (const code in window.parsedData.concepts) {
                    const c = window.parsedData.concepts[code];
                    if (c.measurements && c.measurements.length > 0) {
                        const m = c.measurements.find(it => it.label && it.label.includes(targetGid));
                        if (m) {
                            elemObj.budgetConcept = {
                                code: c.code,
                                summary: c.summary,
                                price: c.price
                            };
                            break;
                        }
                    }
                }
            }

            if (elemObj && elemObj.budgetConcept) {
                const bc = elemObj.budgetConcept;
                const formattedPrice = `${parseFloat(bc.price || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}`;
                if (budgetPrice) budgetPrice.textContent = formattedPrice;
                if (budgetTitle) budgetTitle.textContent = `${bc.code}: ${bc.summary}`;
            } else if (elemObj && elemObj.category) {
                if (budgetPrice) budgetPrice.textContent = '- €';
                if (budgetTitle) budgetTitle.textContent = `Categoría: ${elemObj.category} (Medición en presupuesto)`;
            } else {
                if (budgetPrice) budgetPrice.textContent = '- €';
                if (budgetTitle) budgetTitle.textContent = `Trazable por ID [${globalId}] en medición (~M)`;
            }

            // 4. Consulta Asíncrona de Parámetros y Property Sets BIM
            const psetsBody = document.getElementById('v3dTablePsetsBody');
            const psetsSec = document.getElementById('v3dPsetsSection');
            const badgePsets = document.getElementById('v3dBadgePsetsCount');

            if (psetsBody && psetsSec) {
                psetsBody.innerHTML = '<tr><td colspan="2" style="text-align:center; color:#94a3b8; padding:8px;">Consultando parámetros BIM...</td></tr>';
                psetsSec.style.display = 'block';

                (async () => {
                    try {
                        if (this.ifcLoader && this.ifcLoader.ifcManager && this.ifcLoader.ifcManager.getPropertySets) {
                            const psets = await this.ifcLoader.ifcManager.getPropertySets(this.ifcModel.modelID, expressId, true);
                            if (psets && psets.length > 0) {
                                let psetRows = '';
                                let propCount = 0;
                                psets.forEach(ps => {
                                    const psName = ps.Name ? (ps.Name.value || ps.Name) : 'Propiedades';
                                    if (ps.HasProperties && Array.isArray(ps.HasProperties)) {
                                        ps.HasProperties.forEach(prop => {
                                            propCount++;
                                            const propKey = prop.Name ? (prop.Name.value || prop.Name) : 'Propiedad';
                                            let propVal = '-';
                                            if (prop.NominalValue) {
                                                propVal = prop.NominalValue.value !== undefined ? prop.NominalValue.value : prop.NominalValue;
                                            }
                                            psetRows += `<tr><td class="prop-key">${psName} · ${propKey}</td><td class="prop-val">${propVal}</td></tr>`;
                                        });
                                    }
                                });
                                psetsBody.innerHTML = psetRows || '<tr><td colspan="2" style="text-align:center; color:#94a3b8; padding:8px;">Sin propiedades adicionales</td></tr>';
                                if (badgePsets) badgePsets.textContent = `${propCount} params`;
                            } else {
                                psetsBody.innerHTML = '<tr><td colspan="2" style="text-align:center; color:#94a3b8; padding:8px;">Sin propiedades adicionales</td></tr>';
                                if (badgePsets) badgePsets.textContent = '0';
                            }
                        } else {
                            psetsSec.style.display = 'none';
                        }
                    } catch (err) {
                        psetsSec.style.display = 'none';
                    }
                })();
            }

            sidebar.style.display = 'flex';
        },

        /**
         * Oculta el panel lateral deslizable
         */
        hideElementCard: function () {
            const sidebar = document.getElementById('v3dElementSidebar');
            if (sidebar) sidebar.style.display = 'none';
            this.selectedElement = null;
            this.selectedExpressId = null;
        },

        /**
         * Configura eventos del panel lateral HUD y acciones de integración
         */
        _setupHudEvents: function () {
            const sidebar = document.getElementById('v3dElementSidebar');
            if (sidebar) {
                sidebar.addEventListener('pointerdown', (e) => {
                    if (!e.target.closest('#v3dSidebarResizer')) {
                        e.stopPropagation();
                    }
                });
            }

            // Tirador para redimensionar el ancho del panel lateral arrastrando
            const resizer = document.getElementById('v3dSidebarResizer');
            if (resizer && sidebar) {
                let isResizing = false;
                let startX = 0;
                let startWidth = 0;

                resizer.onpointerdown = (e) => {
                    isResizing = true;
                    startX = e.clientX;
                    startWidth = sidebar.getBoundingClientRect().width;
                    document.body.style.cursor = 'col-resize';
                    document.body.style.userSelect = 'none';
                    resizer.classList.add('resizing');
                    resizer.setPointerCapture(e.pointerId);
                    e.preventDefault();
                };

                resizer.onpointermove = (e) => {
                    if (!isResizing) return;
                    const delta = startX - e.clientX;
                    const minW = 320;
                    const maxW = Math.min(window.innerWidth * 0.92, 920);
                    const newW = Math.max(minW, Math.min(maxW, startWidth + delta));
                    sidebar.style.width = `${newW}px`;
                };

                const stopResizing = (e) => {
                    if (isResizing) {
                        isResizing = false;
                        document.body.style.cursor = '';
                        document.body.style.userSelect = '';
                        resizer.classList.remove('resizing');
                        try { resizer.releasePointerCapture(e.pointerId); } catch (err) { }
                        const finalW = parseInt(sidebar.style.width, 10);
                        if (!isNaN(finalW)) {
                            localStorage.setItem('v3d_sidebar_width', finalW);
                        }
                    }
                };

                resizer.onpointerup = stopResizing;
                resizer.onpointercancel = stopResizing;

                // Restaurar ancho guardado en localStorage
                const savedWidth = localStorage.getItem('v3d_sidebar_width');
                if (savedWidth) {
                    const sw = parseInt(savedWidth, 10);
                    if (!isNaN(sw) && sw >= 320 && sw <= window.innerWidth * 0.92) {
                        sidebar.style.width = `${sw}px`;
                    }
                }
            }

            // Alternar colapsado/desplegado de cada bloque al hacer clic en su cabecera
            document.querySelectorAll('.v3d-props-section-header').forEach(header => {
                header.onclick = function () {
                    const section = this.closest('.v3d-props-section');
                    if (section) {
                        section.classList.toggle('is-collapsed');
                    }
                };
            });

            // Botones de desplegar y replegar todo
            const expandAllBtn = document.getElementById('v3dExpandAllBtn');
            if (expandAllBtn) {
                expandAllBtn.onclick = () => {
                    document.querySelectorAll('.v3d-props-section').forEach(sec => sec.classList.remove('is-collapsed'));
                };
            }

            const collapseAllBtn = document.getElementById('v3dCollapseAllBtn');
            if (collapseAllBtn) {
                collapseAllBtn.onclick = () => {
                    document.querySelectorAll('.v3d-props-section').forEach(sec => sec.classList.add('is-collapsed'));
                };
            }

            // Cerrar y deseleccionar
            const closeBtn = document.getElementById('v3dCardClose');
            if (closeBtn) {
                closeBtn.onclick = () => {
                    this.resetHighlight();
                };
            }

            const deselectBtn = document.getElementById('v3dDeselectBtn');
            if (deselectBtn) {
                deselectBtn.onclick = () => {
                    this.resetHighlight();
                };
            }

            // Botón para ir al Presupuesto FIEBDC-3
            const goToBudgetBtn = document.getElementById('v3dCardGoToBudget');
            if (goToBudgetBtn) {
                goToBudgetBtn.onclick = () => {
                    if (!this.selectedElement) return;

                    // Cambiar a la vista de Presupuesto
                    const presBtn = document.getElementById('presupuestoBtn');
                    if (presBtn) presBtn.click();

                    // Buscar y resaltar la partida en el árbol
                    setTimeout(() => {
                        this._findAndHighlightInTree(this.selectedElement);
                    }, 120);
                };
            }

            // Buscador / Filtro de propiedades en tiempo real
            const searchInput = document.getElementById('v3dPropsSearch');
            if (searchInput) {
                searchInput.oninput = function () {
                    const q = this.value.trim().toLowerCase();
                    const allRows = document.querySelectorAll('.v3d-props-table tbody tr');
                    allRows.forEach(row => {
                        if (!q) {
                            row.style.display = '';
                        } else {
                            const text = row.textContent.toLowerCase();
                            row.style.display = text.includes(q) ? '' : 'none';
                        }
                    });
                    // Si el usuario está buscando, desplegar automáticamente las secciones con resultados
                    if (q) {
                        document.querySelectorAll('.v3d-props-section').forEach(sec => {
                            const visibleRows = sec.querySelectorAll('.v3d-props-table tbody tr:not([style*="display: none"])');
                            if (visibleRows.length > 0) {
                                sec.classList.remove('is-collapsed');
                            }
                        });
                    }
                };
            }

            // Copiar GlobalId (GUID) al portapapeles al hacer clic
            const guidVal = document.getElementById('v3dCardId');
            if (guidVal) {
                guidVal.onclick = function () {
                    const text = this.textContent;
                    if (text && text !== '-') {
                        navigator.clipboard.writeText(text).then(() => {
                            const prev = this.textContent;
                            this.textContent = '¡Copiado! ✓';
                            setTimeout(() => { this.textContent = prev; }, 1500);
                        }).catch(e => console.warn(e));
                    }
                };
            }
        },

        /**
         * Busca la partida correspondiente en el árbol de presupuesto y navega hasta ella
         */
        _findAndHighlightInTree: function (elemObj) {
            if (!elemObj) return;

            // Si ya tiene el código de partida identificado, usar showDetails directamente
            if (elemObj.budgetConcept && elemObj.budgetConcept.code) {
                if (typeof window.showDetails === 'function') {
                    window.showDetails(elemObj.budgetConcept.code);
                }
            }

            const searchStr = elemObj.globalId || elemObj.id;
            const treeRows = document.querySelectorAll('.tree-row, tr[data-concept-code], .tree-item');

            let matchedRow = null;

            // 1. Buscar fila que contenga el GlobalId o ID en sus comentarios o textos
            for (let i = 0; i < treeRows.length; i++) {
                if (treeRows[i].textContent.includes(searchStr)) {
                    matchedRow = treeRows[i];
                    break;
                }
            }

            // 2. Si no se encontró por ID directo, buscar por el nombre de la categoría
            if (!matchedRow && elemObj.category) {
                for (let i = 0; i < treeRows.length; i++) {
                    if (treeRows[i].textContent.includes(elemObj.category)) {
                        matchedRow = treeRows[i];
                        break;
                    }
                }
            }

            if (matchedRow) {
                matchedRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                matchedRow.classList.add('row-highlight');
                setTimeout(() => matchedRow.classList.remove('row-highlight'), 3000);
            }
        },

        /**
         * Aplica un plano de corte horizontal para eliminar plantas superiores
         */
        applyClippingPlane: function (cutHeight) {
            if (!this.ifcModel) return;

            const THREE = window.THREE;
            this.renderer.localClippingEnabled = true;

            let planes = [];
            if (cutHeight !== null && cutHeight !== undefined && !isNaN(cutHeight)) {
                // Normal (0, -1, 0) con constante cutHeight elimina todo donde Y > cutHeight
                this.activeClippingPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), cutHeight);
                planes = [this.activeClippingPlane];
            } else {
                this.activeClippingPlane = null;
            }

            const setMat = (m) => {
                m.clippingPlanes = planes;
                m.clipShadows = true;
                m.needsUpdate = true;
            };

            if (Array.isArray(this.ifcModel.material)) {
                this.ifcModel.material.forEach(setMat);
            } else if (this.ifcModel.material) {
                setMat(this.ifcModel.material);
            }

            // Si hay un subset resaltado activo, aplicarle también el plano de corte
            if (this.highlightSubset && this.highlightSubset.material) {
                if (Array.isArray(this.highlightSubset.material)) {
                    this.highlightSubset.material.forEach(setMat);
                } else {
                    setMat(this.highlightSubset.material);
                }
            }
        },

        /**
         * Filtra la visualización por planta realizando el corte en el punto intermedio exacto
         * entre el nivel seleccionado y el inmediatamente superior.
         */
        filterByStorey: function (storeyName) {
            if (!this.ifcModel || !this.currentIfcData) return;

            if (storeyName === 'all' || !storeyName) {
                // Mostrar todo el edificio
                this.applyClippingPlane(null);
                this.fitToView();
                return;
            }

            const rawStoreys = (this.currentIfcData && this.currentIfcData.storeys) || [];
            // Filtrar y ordenar plantas ascendentemente por cota para garantizar orden físico real
            const sortedStoreys = [...rawStoreys]
                .filter(s => s && s.elevation !== undefined && !isNaN(s.elevation))
                .sort((a, b) => a.elevation - b.elevation);

            const selectedIdx = sortedStoreys.findIndex(s => s.name === storeyName);

            if (selectedIdx === -1) {
                console.warn("IFCViewer3D: Planta no encontrada en lista ordenada:", storeyName);
                return;
            }

            const currentStorey = sortedStoreys[selectedIdx];
            const nextStorey = sortedStoreys[selectedIdx + 1];

            // CÁLCULO DEL PUNTO INTERMEDIO EXACTO:
            // (Cota nivel seleccionado + Cota nivel superior) / 2
            let cutY = null;
            if (nextStorey && nextStorey.elevation !== undefined && !isNaN(nextStorey.elevation)) {
                cutY = (currentStorey.elevation + nextStorey.elevation) / 2.0;
                console.log(`IFCViewer3D: Corte calculado en el punto intermedio exacto: (${currentStorey.elevation}m + ${nextStorey.elevation}m) / 2 = ${cutY.toFixed(3)}m`);
            } else {
                // Si es la última planta superior (o cubierta), estimar con la altura de planta promedio
                let delta = 3.0;
                if (selectedIdx > 0 && sortedStoreys[selectedIdx - 1]) {
                    delta = currentStorey.elevation - sortedStoreys[selectedIdx - 1].elevation;
                    if (delta <= 0 || isNaN(delta)) delta = 3.0;
                }
                cutY = currentStorey.elevation + (delta / 2.0);
                console.log(`IFCViewer3D: Corte calculado en planta superior: ${currentStorey.elevation}m + (${delta}/2)m = ${cutY.toFixed(3)}m`);
            }

            this.applyClippingPlane(cutY);
        },

        /**
         * Alterna el modo Rayos X (transparencia) para ver a través de los muros
         */
        toggleXRay: function () {
            if (!this.ifcModel) return;
            this.isXRay = !this.isXRay;

            const mat = this.ifcModel.material;
            const updateMat = (m) => {
                if (this.isXRay) {
                    m.transparent = true;
                    m.opacity = 0.35;
                } else {
                    m.transparent = false;
                    m.opacity = 1.0;
                }
                m.needsUpdate = true;
            };

            if (Array.isArray(mat)) mat.forEach(updateMat);
            else if (mat) updateMat(mat);

            const btn = document.getElementById('v3dXrayBtn');
            if (btn) {
                if (this.isXRay) btn.classList.add('active');
                else btn.classList.remove('active');
            }
        },

        /**
         * Reajusta el tamaño del canvas al contenedor
         */
        onResize: function () {
            if (!this.container || !this.renderer || !this.camera) return;
            const w = this.container.clientWidth;
            const h = this.container.clientHeight;
            if (w > 0 && h > 0) {
                this.camera.aspect = w / h;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(w, h);
            }
        },

        /**
         * Configura el detector de clics sobre la geometría 3D con deselección al pulsar en fondo o elemento activo
         */
        _setupRaycasting: function () {
            const THREE = window.THREE;
            const raycaster = new THREE.Raycaster();
            const mouse = new THREE.Vector2();

            let pointerDownPos = { x: 0, y: 0 };

            this.renderer.domElement.addEventListener('pointerdown', (e) => {
                pointerDownPos.x = e.clientX;
                pointerDownPos.y = e.clientY;
            });

            this.renderer.domElement.addEventListener('pointerup', async (e) => {
                if (e.button !== 0) return; // Sólo botón primario / toque táctil

                // Si el usuario arrastró el ratón más de 6px, fue una órbita o paneo, no un clic de selección
                const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
                if (dist > 6) return;

                if (!this.ifcModel) return;

                const rect = this.renderer.domElement.getBoundingClientRect();
                mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
                mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

                raycaster.setFromCamera(mouse, this.camera);

                // Intersectar EXCLUSIVAMENTE el modelo IFC (ignorar suelo grid y luces)
                const intersects = raycaster.intersectObject(this.ifcModel, true);

                // Si no hay intersección (clic en el fondo/espacio vacío): DESELECCIONAR
                if (intersects.length === 0) {
                    this.resetHighlight();
                    return;
                }

                const hit = intersects[0];
                if (!hit.object || !hit.object.geometry || hit.faceIndex === undefined) return;

                let id = null;
                try {
                    id = this.ifcLoader.ifcManager.getExpressId(hit.object.geometry, hit.faceIndex);
                } catch (err) {
                    console.warn("IFCViewer3D: Error obteniendo expressId:", err);
                }

                if (id === null || id === undefined) return;

                // Si el usuario hace clic sobre el elemento que ya está seleccionado: DESELECCIONAR
                if (this.selectedExpressId === id) {
                    this.resetHighlight();
                    return;
                }

                // 1. Resaltar en 3D en cian neón (limpiando cualquier selección anterior)
                this.highlightElement(id, false);

                // 2. Buscar elemento en mapas precargados
                let elemObj = this.expressIdToElementMap[id] || this.expressIdToElementMap[String(id)];

                // Si no está en el mapa, obtener propiedades directamente de Web-IFC
                if (!elemObj && this.ifcLoader.ifcManager.getItemProperties) {
                    try {
                        const props = await this.ifcLoader.ifcManager.getItemProperties(this.ifcModel.modelID, id);
                        if (props) {
                            const gid = props.GlobalId ? props.GlobalId.value : null;
                            const rawN = props.Name ? props.Name.value : `Elemento #${id}`;
                            elemObj = {
                                id: String(id),
                                expressId: id,
                                globalId: gid,
                                name: this._decodeStepString(rawN),
                                storey: 'Modelo 3D'
                            };
                        }
                    } catch (e) { }
                }

                // 3. Mostrar el panel lateral de propiedades y atributos
                this.showElementCard(elemObj, id);

                // 4. Disparar callback de integración con presupuesto
                if (typeof this.onElementClickedCallback === 'function') {
                    this.onElementClickedCallback(elemObj, id);
                }
            });
        },

        /**
         * Rellena el menú desplegable de plantas ordenadas por cota de menor a mayor
         */
        _populateStoreysDropdown: function (ifcData) {
            const select = document.getElementById('v3dStoreySelect');
            if (!select) return;

            select.innerHTML = '<option value="all">🏢 Edificio Completo (Todas las Plantas)</option>';

            if (!ifcData || !ifcData.storeys || ifcData.storeys.length === 0) return;

            // Ordenar por cota de elevación de menor a mayor
            const sortedStoreys = [...ifcData.storeys].sort((a, b) => (a.elevation || 0) - (b.elevation || 0));

            sortedStoreys.forEach((s) => {
                const opt = document.createElement('option');
                opt.value = s.name;
                const elevStr = s.elevation !== undefined ? ` [${s.elevation >= 0 ? '+' : ''}${s.elevation}m]` : '';
                opt.textContent = `📍 Hasta ${s.name}${elevStr} (Cortar superiores)`;
                select.appendChild(opt);
            });
        },

        /**
         * Decodifica secuencias ISO 10303-21 en texto legible
         */
        _decodeStepString: function (str) {
            if (!str) return '';
            let decoded = str.replace(/\\X2\\([0-9A-Fa-f]+)\\X0\\/g, (match, hex) => {
                try {
                    let result = '';
                    for (let i = 0; i < hex.length; i += 4) {
                        const code = parseInt(hex.substr(i, 4), 16);
                        result += String.fromCharCode(code);
                    }
                    return result;
                } catch (e) { return match; }
            });
            decoded = decoded.replace(/\\X\\([0-9A-Fa-f]{2})/g, (match, hex) => {
                try { return String.fromCharCode(parseInt(hex, 16)); } catch (e) { return match; }
            });
            return decoded.replace(/\\S\\(.)/g, '$1');
        }
    };

    window.IFCViewer3D = IFCViewer3D;

})(window);
