/**
 * IFCViewer3D.js - Visor BIM 3D Nativo con Three.js y web-ifc para BC3Viewer-App
 * Proporciona renderizado WebGL en tiempo real, órbita 3D, selección de elementos,
 * filtrado por plantas, modo Rayos X y vinculación bidireccional con el presupuesto FIEBDC-3.
 * Autor: Jose Manuel Caamaño González (jmcaamanog)
 */

(function (global) {
    'use strict';

    const IFCViewer3D = {
        scene: null,
        camera: null,
        renderer: null,
        controls: null,
        ifcLoader: null,
        ifcModel: null,
        container: null,
        currentBuffer: null,
        currentIfcData: null,
        highlightSubset: null,
        isXRay: false,
        isSplitView: false,
        onElementClickedCallback: null,
        expressIdToElementMap: {},
        globalIdToElementMap: {},

        /**
         * Inicializa la escena 3D, luces, cámara y controles en el contenedor especificado
         */
        init: function (containerId) {
            this.container = document.getElementById(containerId);
            if (!this.container) {
                console.error("IFCViewer3D: No se encontró el contenedor:", containerId);
                return false;
            }

            if (this.renderer) {
                // Ya inicializado
                this.onResize();
                return true;
            }

            const THREE = window.THREE;
            const OrbitControls = window.OrbitControls;
            const IFCLoader = window.IFCLoader;

            if (!THREE || !OrbitControls || !IFCLoader) {
                console.warn("IFCViewer3D: Librerías 3D aún no cargadas en window.");
                return false;
            }

            const width = this.container.clientWidth || 800;
            const height = this.container.clientHeight || 600;

            // 1. Escena
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x0f172a); // Fondo oscuro ConTech slate-900

            // 2. Cámara
            this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
            this.camera.position.set(20, 20, 20);

            // 3. Renderer WebGL
            this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
            this.renderer.setSize(width, height);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.shadowMap.enabled = false; // Optimización de rendimiento
            this.container.appendChild(this.renderer.domElement);

            // 4. Controles orbitales
            this.controls = new OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.08;
            this.controls.screenSpacePanning = true;

            // 5. Iluminación arquitectónica
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
            this.scene.add(ambientLight);

            const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.65);
            dirLight1.position.set(25, 40, 25);
            this.scene.add(dirLight1);

            const dirLight2 = new THREE.DirectionalLight(0x93c5fd, 0.35);
            dirLight2.position.set(-25, -20, -25);
            this.scene.add(dirLight2);

            // 6. Rejilla de suelo de referencia ConTech
            const gridHelper = new THREE.GridHelper(60, 60, 0x38bdf8, 0x1e293b);
            gridHelper.position.y = -0.01;
            this.scene.add(gridHelper);

            // 7. Cargador IFCLoader
            this.ifcLoader = new IFCLoader();
            this.ifcLoader.ifcManager.setWasmPath('./');

            // 8. Eventos de Raycasting para selección con ratón o táctil
            this._setupRaycasting();

            // 9. ResizeObserver para ajustar tamaño automáticamente
            if (window.ResizeObserver) {
                const ro = new ResizeObserver(() => this.onResize());
                ro.observe(this.container);
            }
            window.addEventListener('resize', () => this.onResize());

            // 10. Bucle de renderizado
            const animate = () => {
                requestAnimationFrame(animate);
                if (this.controls) this.controls.update();
                if (this.renderer && this.scene && this.camera) {
                    this.renderer.render(this.scene, this.camera);
                }
            };
            animate();

            console.log("IFCViewer3D: Motor 3D inicializado con éxito.");
            return true;
        },

        /**
         * Carga y renderiza el modelo IFC desde un ArrayBuffer
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
                    if (elem.globalId) this.globalIdToElementMap[elem.globalId] = elem;
                });
            }

            // Actualizar etiqueta del modelo en la barra
            const modelLabel = document.getElementById('visor3dModelName');
            if (modelLabel) modelLabel.textContent = fileName || (ifcData && ifcData.header ? ifcData.header.fileName : 'Modelo IFC');

            // Rellenar selector de plantas
            this._populateStoreysDropdown(ifcData);

            // Mostrar badge de carga 3D con indicador de estado
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
                // AWAIT DIRECTO: ifcLoader.parse es async y devuelve el modelo THREE.Mesh
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
         * fitToView: function () {
            if (!this.ifcModel || !this.camera || !this.controls) return;

            const THREE = window.THREE;
            const box = new THREE.Box3().setFromObject(this.ifcModel);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());

            const maxDim = Math.max(size.x, size.y, size.z);
            const fov = this.camera.fov * (Math.PI / 180);
            let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.5;

            this.camera.position.set(center.x + cameraZ * 0.7, center.y + cameraZ * 0.5, center.z + cameraZ * 0.7);
            this.camera.lookAt(center);
            this.controls.target.copy(center);
            this.controls.update();
        },

        /**
         * Resalta un elemento en color cian brillante por su GlobalId o ExpressID
         */
        highlightElement: function (idOrGlobalId, focusCamera = true) {
            if (!this.ifcModel) return;

            let expressId = null;
            let elementObj = null;

            if (this.globalIdToElementMap[idOrGlobalId]) {
                elementObj = this.globalIdToElementMap[idOrGlobalId];
                expressId = parseInt(elementObj.id);
            } else if (this.expressIdToElementMap[idOrGlobalId]) {
                elementObj = this.expressIdToElementMap[idOrGlobalId];
                expressId = parseInt(idOrGlobalId);
            } else {
                expressId = parseInt(idOrGlobalId);
            }

            if (isNaN(expressId)) return;

            const THREE = window.THREE;
            const highlightMat = new THREE.MeshLambertMaterial({
                color: 0x06b6d4, // Cian neón ConTech
                transparent: true,
                opacity: 0.85,
                depthTest: true
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

                // Actualizar etiqueta informativa
                const label = document.getElementById('v3dSelectedLabel');
                if (label && elementObj) {
                    label.textContent = `🎯 ${elementObj.name} (${elementObj.storey || 'BIM'}) [ID: ${elementObj.globalId || expressId}]`;
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
         * Quita cualquier elemento resaltado
         */
        resetHighlight: function () {
            if (this.highlightSubset && this.ifcModel) {
                try {
                    this.ifcLoader.ifcManager.removeSubset(this.ifcModel.modelID, undefined, 'active-selection-subset');
                } catch (e) { }
                this.highlightSubset = null;
            }
            const label = document.getElementById('v3dSelectedLabel');
            if (label) label.textContent = 'Ningún elemento seleccionado';
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
         * Filtra la visualización por planta
         */
        filterByStorey: function (storeyName) {
            if (!this.ifcModel || !this.currentIfcData) return;

            if (storeyName === 'all') {
                // Mostrar todo
                this.ifcLoader.ifcManager.removeSubset(this.ifcModel.modelID, undefined, 'storey-filter-subset');
                this.ifcModel.visible = true;
                this.fitToView();
                return;
            }

            // Filtrar IDs de elementos que pertenecen a esta planta
            const matchingElems = this.currentIfcData.elements.filter(e => e.storey === storeyName);
            const ids = matchingElems.map(e => parseInt(e.id)).filter(id => !isNaN(id));

            if (ids.length === 0) return;

            try {
                // Ocultar modelo completo y mostrar sólo el subconjunto de esta planta
                this.ifcModel.visible = false;
                this.ifcLoader.ifcManager.createSubset({
                    modelID: this.ifcModel.modelID,
                    ids: ids,
                    scene: this.scene,
                    removePrevious: true,
                    customID: 'storey-filter-subset'
                });
                this.fitToView();
            } catch (e) {
                console.warn("IFCViewer3D: Error filtrando por planta:", e);
                this.ifcModel.visible = true;
            }
        },

        /**
         * Alterna el modo Vista Dividida (Split-View Presupuesto + 3D)
         */
        toggleSplitView: function () {
            this.isSplitView = !this.isSplitView;
            const treePanel = document.getElementById('treePanel');
            const detailsPanel = document.getElementById('detailsPanel');
            const visorPanel = document.getElementById('visor3dPanel');
            const splitBtn = document.getElementById('v3dSplitBtn');

            if (this.isSplitView) {
                if (treePanel) {
                    treePanel.style.display = 'flex';
                    treePanel.style.width = '35%';
                }
                if (detailsPanel) detailsPanel.style.display = 'none';
                if (visorPanel) {
                    visorPanel.style.display = 'flex';
                    visorPanel.style.width = '65%';
                }
                if (splitBtn) splitBtn.classList.add('active');
            } else {
                if (treePanel) treePanel.style.display = 'none';
                if (detailsPanel) detailsPanel.style.display = 'none';
                if (visorPanel) {
                    visorPanel.style.display = 'flex';
                    visorPanel.style.width = '100%';
                }
                if (splitBtn) splitBtn.classList.remove('active');
            }

            setTimeout(() => this.onResize(), 50);
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
         * Configura el detector de clics sobre la geometría 3D
         */
        _setupRaycasting: function () {
            const THREE = window.THREE;
            const raycaster = new THREE.Raycaster();
            const mouse = new THREE.Vector2();

            this.renderer.domElement.addEventListener('pointerdown', (e) => {
                if (e.button !== 0) return; // Sólo botón primario / toque

                const rect = this.renderer.domElement.getBoundingClientRect();
                mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
                mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

                raycaster.setFromCamera(mouse, this.camera);
                const intersects = raycaster.intersectObjects(this.scene.children, true);

                if (intersects.length > 0) {
                    for (let i = 0; i < intersects.length; i++) {
                        const hit = intersects[i];
                        if (hit.object === this.ifcModel || (hit.object.geometry && hit.faceIndex !== undefined)) {
                            try {
                                const id = this.ifcLoader.ifcManager.getExpressId(hit.object.geometry, hit.faceIndex);
                                if (id !== undefined && id !== null) {
                                    const elemObj = this.expressIdToElementMap[id];
                                    this.highlightElement(id, false);

                                    if (typeof this.onElementClickedCallback === 'function') {
                                        this.onElementClickedCallback(elemObj, id);
                                    }
                                    break;
                                }
                            } catch (err) { }
                        }
                    }
                }
            });
        },

        _populateStoreysDropdown: function (ifcData) {
            const select = document.getElementById('v3dStoreySelect');
            if (!select) return;

            select.innerHTML = '<option value="all">🏢 Todas las Plantas</option>';
            if (ifcData && ifcData.storeys) {
                ifcData.storeys.forEach(s => {
                    const opt = document.createElement('option');
                    opt.value = s.name;
                    opt.textContent = `📍 ${s.name}`;
                    select.appendChild(opt);
                });
            }
        }
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = IFCViewer3D;
    } else {
        global.IFCViewer3D = IFCViewer3D;
    }

})(typeof window !== 'undefined' ? window : this);
