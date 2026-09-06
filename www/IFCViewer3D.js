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
        perspectiveCamera: null,
        orthographicCamera: null,
        currentCameraType: 'perspective',
        currentViewMode: '3d',
        renderer: null,
        controls: null,
        ifcLoader: null,
        ifcModel: null,
        highlightSubset: null,
        categorySubsets: {},
        hiddenElementIds: new Set(),
        isolatedSubset: null,
        isIsolated: false,
        isolatedExpressId: null,
        currentBuffer: null,
        currentIfcData: null,
        currentModelKey: null,
        currentFileName: null,
        activeClippingPlane: null,
        isXRay: false,
        expressIdToElementMap: {},
        globalIdToElementMap: {},
        selectedElement: null,
        onElementClickedCallback: null,
        _categoriesMenuInitialized: false,
        _contextMenuInitialized: false,
        _sectionToolInitialized: false,
        _viewButtonsInitialized: false,
        _loadSessionId: 0,
        sectionConfig: {
            active: false,
            axis: 'Y',
            inverted: false,
            value: 0,
            showHelper: true,
            showCaps: true,
            min: -10,
            max: 10
        },
        sectionHelperMesh: null,
        sectionCapGroup: null,
        sectionCapMesh: null,
        _stencilMaterials: null,
        _lastStencilKey: null,

        /**
         * Configuración Oficial de Estilo Blueprint ConTech
         * - Geometría base: Azul único y uniforme más claro que el fondo oscuro (#0a0f1d).
         * - Tapas de sección macizas: Azul más oscuro (#0f2b5c) para caras seccionadas de muros/forjados.
         * - Aristas: Líneas blancas nítidas con THREE.EdgesGeometry.
         * - Vértices: Puntitos blancos circulares ligeramente más gruesos que las líneas.
         */
        BLUEPRINT_CONFIG: {
            bodyColor: 0x1d4ed8,        // Azul Blueprint ConTech (#1d4ed8)
            bodyHex: '#1d4ed8',
            sectionCapColor: 0x0f2b5c,  // Azul más oscuro para tapas y caras seccionadas macizas (#0f2b5c)
            sectionCapHex: '#0f2b5c',
            lineColor: 0xffffff,        // Líneas de aristas en blanco técnico puro
            lineOpacity: 0.92,
            vertexColor: 0xffffff,      // Vértices en puntito blanco destacado
            vertexSize: 4.5,            // Ligeramente más grueso que la línea (4.5px en espacio pantalla)
            edgesThreshold: 24          // Ángulo umbral de aristas para CAD limpio (24°)
        },
        _dotTexture: null,

        /**
         * Paleta ConTech de Elementos Constructivos
         * Todos los elementos adoptan el tono azul Blueprint uniforme preservando su iconografía técnica.
         */
        CONTECH_BLUE_PALETTE: {
            'Muros y Cerramientos': {
                color: 0x1d4ed8,
                name: 'Muros y Cerramientos',
                icon: '🧱',
                hex: '#1d4ed8'
            },
            'Forjados y Pavimentos': {
                color: 0x1d4ed8,
                name: 'Forjados y Pavimentos',
                icon: '📐',
                hex: '#1d4ed8'
            },
            'Estructura (Pilares)': {
                color: 0x1d4ed8,
                name: 'Pilares',
                icon: '🏛️',
                hex: '#1d4ed8'
            },
            'Estructura (Vigas)': {
                color: 0x1d4ed8,
                name: 'Vigas',
                icon: '🏗️',
                hex: '#1d4ed8'
            },
            'Estructura Auxiliar': {
                color: 0x1d4ed8,
                name: 'Estructura Auxiliar',
                icon: '🔩',
                hex: '#1d4ed8'
            },
            'Carpintería Exterior (Ventanas)': {
                color: 0x1d4ed8,
                name: 'Ventanas',
                icon: '🪟',
                hex: '#1d4ed8'
            },
            'Vidrios y Paneles': {
                color: 0x1d4ed8,
                name: 'Vidrios y Paneles',
                icon: '🪟',
                hex: '#1d4ed8'
            },
            'Carpintería Interior (Puertas)': {
                color: 0x1d4ed8,
                name: 'Puertas',
                icon: '🚪',
                hex: '#1d4ed8'
            },
            'Cubiertas': {
                color: 0x1d4ed8,
                name: 'Cubiertas',
                icon: '🏠',
                hex: '#1d4ed8'
            },
            'Escaleras': {
                color: 0x1d4ed8,
                name: 'Escaleras',
                icon: '🪜',
                hex: '#1d4ed8'
            },
            'Tramos de Escalera': {
                color: 0x1d4ed8,
                name: 'Tramos de Escalera',
                icon: '🪜',
                hex: '#1d4ed8'
            },
            'Cerrajería y Barandillas': {
                color: 0x1d4ed8,
                name: 'Barandillas y Cerrajería',
                icon: '🛡️',
                hex: '#1d4ed8'
            },
            'Mobiliario y Equipamiento': {
                color: 0x1d4ed8,
                name: 'Mobiliario',
                icon: '🛋️',
                hex: '#1d4ed8'
            },
            'Aparatos Sanitarios y Fontanería': {
                color: 0x1d4ed8,
                name: 'Sanitarios y Fontanería',
                icon: '🚿',
                hex: '#1d4ed8'
            },
            'Instalaciones (Tuberías)': {
                color: 0x1d4ed8,
                name: 'Tuberías',
                icon: '🚰',
                hex: '#1d4ed8'
            },
            'Instalaciones (Conductos)': {
                color: 0x1d4ed8,
                name: 'Conductos',
                icon: '💨',
                hex: '#1d4ed8'
            },
            'Cimentaciones': {
                color: 0x1d4ed8,
                name: 'Cimentaciones',
                icon: '⚓',
                hex: '#1d4ed8'
            },
            'Revestimientos y Techos': {
                color: 0x1d4ed8,
                name: 'Revestimientos',
                icon: '🎨',
                hex: '#1d4ed8'
            },
            'Parcela y Urbanización': {
                color: 0x1d4ed8,
                name: 'Parcela / Urbanización',
                icon: '🌳',
                hex: '#1d4ed8'
            },
            'Elementos Constructivos Varios': {
                color: 0x1d4ed8,
                name: 'Elementos Varios',
                icon: '📦',
                hex: '#1d4ed8'
            },
            'default': {
                color: 0x1d4ed8,
                name: 'Otros Elementos',
                icon: '📐',
                hex: '#1d4ed8'
            }
        },

        /**
         * Obtiene la configuración de color y metadatos de categoría para el estilo Blueprint
         */
        _getPaletteConfig: function (catName) {
            let base = this.CONTECH_BLUE_PALETTE['default'];
            if (catName) {
                if (this.CONTECH_BLUE_PALETTE[catName]) {
                    base = this.CONTECH_BLUE_PALETTE[catName];
                } else {
                    const lower = catName.toLowerCase();
                    for (const key in this.CONTECH_BLUE_PALETTE) {
                        if (key === 'default') continue;
                        if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
                            base = this.CONTECH_BLUE_PALETTE[key];
                            break;
                        }
                    }
                }
            }
            return {
                name: base.name,
                icon: base.icon,
                color: this.BLUEPRINT_CONFIG.bodyColor,
                hex: this.BLUEPRINT_CONFIG.bodyHex
            };
        },

        /**
         * Genera o reutiliza una textura circular para los vértices estilo blueprint
         */
        _getVertexDotTexture: function () {
            if (this._dotTexture) return this._dotTexture;
            try {
                const THREE = window.THREE;
                const canvas = document.createElement('canvas');
                canvas.width = 32;
                canvas.height = 32;
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, 32, 32);
                ctx.beginPath();
                ctx.arc(16, 16, 13, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
                this._dotTexture = new THREE.CanvasTexture(canvas);
                return this._dotTexture;
            } catch (e) {
                return null;
            }
        },

        /**
         * Adjunta las aristas blancas (LineSegments) y los puntos de vértice blancos (Points)
        /**
         * Determina si una categoría constructiva debe poseer núcleo interior macizo (BackSide)
         * para renderizar caras seccionadas macizas (#0f2b5c) al cortarse.
         * Excluye expresamente puertas, ventanas, vidrios, mobiliario, sanitarios y elementos laminares.
         */
        _isSolidCategory: function (catName, catKey) {
            const s = `${catName || ''} ${catKey || ''}`.toLowerCase();
            if (s.includes('vidrio') || s.includes('cristal') || s.includes('glass') ||
                s.includes('puerta') || s.includes('door') ||
                s.includes('ventana') || s.includes('window') ||
                s.includes('panel') || s.includes('plate') ||
                s.includes('barandilla') || s.includes('railing') ||
                s.includes('mobiliario') || s.includes('furnishing') ||
                s.includes('sanit') || s.includes('espacio') || s.includes('zona') || s.includes('space')) {
                return false;
            }
            return true;
        },

        /**
         * Adjunta las aristas blancas (LineSegments), los puntos de vértice blancos (Points)
         * y la capa interior maciza (BackSide en #0f2b5c) como hijos de la malla del subset.
         * La capa interior maciza BackSide reside estrictamente en la geometría física del elemento,
         * eliminando de forma definitiva cualquier triángulo flotante en el aire o fugas sobre puertas y ventanas.
         */
        _attachBlueprintDecorations: function (mesh, planes = [], isSolid = true) {
            if (!mesh || !mesh.geometry) return;
            const THREE = window.THREE;
            try {
                // 1. Aristas blancas limpias con EdgesGeometry
                const edgesGeom = new THREE.EdgesGeometry(mesh.geometry, this.BLUEPRINT_CONFIG.edgesThreshold);
                const lineMat = new THREE.LineBasicMaterial({
                    color: this.BLUEPRINT_CONFIG.lineColor,
                    transparent: true,
                    opacity: this.BLUEPRINT_CONFIG.lineOpacity,
                    clippingPlanes: planes,
                    clipShadows: true
                });
                const edgesLine = new THREE.LineSegments(edgesGeom, lineMat);
                edgesLine.name = 'blueprint-edges';
                edgesLine.renderOrder = 4;
                mesh.add(edgesLine);

                // 2. Vértices como puntitos blancos circulares ligeramente más gruesos que la línea
                const dotTex = this._getVertexDotTexture();
                const pointsMat = new THREE.PointsMaterial({
                    color: this.BLUEPRINT_CONFIG.vertexColor,
                    size: this.BLUEPRINT_CONFIG.vertexSize,
                    sizeAttenuation: false,
                    map: dotTex || undefined,
                    transparent: true,
                    alphaTest: 0.35,
                    clippingPlanes: planes,
                    clipShadows: true
                });
                const vertexPoints = new THREE.Points(mesh.geometry, pointsMat);
                vertexPoints.name = 'blueprint-points';
                vertexPoints.renderOrder = 5;
                mesh.add(vertexPoints);

                // 3. Cara interior (BackSide) en azul oscuro (#0f2b5c) para efecto macizo sin estarcido ni planos infinitos
                if (isSolid) {
                    const backMat = new THREE.MeshBasicMaterial({
                        color: this.BLUEPRINT_CONFIG.sectionCapColor || 0x0f2b5c,
                        side: THREE.BackSide,
                        clippingPlanes: planes,
                        clipShadows: true,
                        depthTest: true,
                        depthWrite: true
                    });
                    const backMesh = new THREE.Mesh(mesh.geometry, backMat);
                    backMesh.name = 'blueprint-back-solid';
                    backMesh.renderOrder = 3;
                    const showCaps = (this.sectionConfig && this.sectionConfig.showCaps !== undefined) ? this.sectionConfig.showCaps : true;
                    const isSectionActive = this.sectionConfig && this.sectionConfig.active && !!this.activeClippingPlane;
                    backMesh.visible = isSectionActive && showCaps;
                    mesh.add(backMesh);
                }
            } catch (err) {
                console.warn("IFCViewer3D: No se pudieron generar aristas/vértices blueprint:", err);
            }
        },

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

            // 2. Cámaras: Perspectiva cónica estándar y Ortográfica paralela sin deformación de fuga (CAD)
            const width = this.container.clientWidth || 800;
            const height = this.container.clientHeight || 600;
            const aspect = width / height;

            this.perspectiveCamera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
            this.perspectiveCamera.position.set(25, 20, 30);

            const frustumSize = 35;
            this.orthographicCamera = new THREE.OrthographicCamera(
                -frustumSize * aspect / 2,
                frustumSize * aspect / 2,
                frustumSize / 2,
                -frustumSize / 2,
                0.1,
                2000
            );
            this.orthographicCamera.position.set(25, 20, 30);

            this.camera = this.perspectiveCamera;
            this.currentCameraType = 'perspective';
            this.currentViewMode = '3d';

            // 3. Renderer con soporte nativo de planos de corte (Local Clipping) y Stencil Buffer para tapas macizas
            this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, stencil: true, powerPreference: 'high-performance' });
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

            // 8. Eventos de Raycasting, Tarjeta HUD, Menú de Elementos, Menú Contextual, Planos de Sección y Vistas
            this._setupRaycasting();
            this._setupHudEvents();
            this._setupCategoriesMenuUI();
            this._setupContextMenuUI();
            this._setupSectionToolUI();
            this._setupViewButtonsUI();

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
         * Purga y descarga completamente el modelo 3D activo y libera toda la memoria en GPU y WebAssembly
         */
        unloadModel: function () {
            // Incrementar sesión de carga para invalidar inmediatamente cualquier carga asíncrona en curso
            this._loadSessionId = (this._loadSessionId || 0) + 1;

            // 0. Limpiar grupo y mallas de tapas macizas de sección (Stencil Capping)
            if (this.sectionCapGroup) {
                try {
                    this.scene.remove(this.sectionCapGroup);
                    while (this.sectionCapGroup.children.length > 0) {
                        const ch = this.sectionCapGroup.children[0];
                        this.sectionCapGroup.remove(ch);
                    }
                    if (this.sectionCapMesh && this.sectionCapMesh.geometry) {
                        this.sectionCapMesh.geometry.dispose();
                    }
                } catch (e) {}
                this.sectionCapGroup = null;
                this.sectionCapMesh = null;
                this._stencilMaterials = null;
                this._lastStencilKey = null;
            }

            // 1. Limpiar subsets y decoraciones blueprint de categorías
            this._clearCategorySubsets();
            this._clearIsolatedSubset();
            this.resetHighlight();
            this.hideContextMenu();
            this.hideElementCard();
            this.applyClippingPlane(null);

            // 2. Cerrar modelo en Web-IFC y limpiar subsets internos sin destruir la instancia del cargador
            try {
                if (this.ifcLoader && this.ifcLoader.ifcManager) {
                    if (this.ifcLoader.ifcManager.subsets) {
                        const subsetsObj = this.ifcLoader.ifcManager.subsets.subsets;
                        if (subsetsObj) {
                            for (const k in subsetsObj) {
                                delete subsetsObj[k];
                            }
                        }
                        if (this.ifcLoader.ifcManager.subsets.items) {
                            this.ifcLoader.ifcManager.subsets.items.map = {};
                        }
                    }
                    if (this.ifcModel && this.ifcModel.modelID !== undefined && typeof this.ifcLoader.ifcManager.close === 'function') {
                        this.ifcLoader.ifcManager.close(this.ifcModel.modelID, this.scene);
                    }
                }
            } catch (closeErr) {
                console.warn("IFCViewer3D: Error cerrando modelo en ifcManager:", closeErr);
            }

            // 3. Purga exhaustiva de la escena Three.js: eliminar y desechar TODO excepto luces y GridHelper
            if (this.scene) {
                const THREE = window.THREE;
                for (let i = this.scene.children.length - 1; i >= 0; i--) {
                    const child = this.scene.children[i];
                    // Mantener únicamente luces y la cuadrícula de fondo
                    if (child.isLight || (THREE && child instanceof THREE.GridHelper) || child.name === 'grid-helper') {
                        continue;
                    }
                    this.scene.remove(child);
                    if (child.traverse) {
                        child.traverse(obj => {
                            if (obj.geometry) obj.geometry.dispose();
                            if (obj.material) {
                                if (Array.isArray(obj.material)) {
                                    obj.material.forEach(m => m && m.dispose && m.dispose());
                                } else if (obj.material && obj.material.dispose) {
                                    obj.material.dispose();
                                }
                            }
                        });
                    }
                }
            }
            this.ifcModel = null;
            this.highlightSubset = null;
            this.isolatedSubset = null;
            this.categorySubsets = {};

            // 4. Asegurar que el subsets.items.map esté inicializado como objeto válido
            if (this.ifcLoader && this.ifcLoader.ifcManager && this.ifcLoader.ifcManager.subsets && this.ifcLoader.ifcManager.subsets.items) {
                if (!this.ifcLoader.ifcManager.subsets.items.map) {
                    this.ifcLoader.ifcManager.subsets.items.map = {};
                }
            }

            // 5. Resetear variables y mapas de memoria
            this.currentBuffer = null;
            this.currentIfcData = null;
            this.currentModelKey = null;
            this.currentFileName = null;
            this.expressIdToElementMap = {};
            this.globalIdToElementMap = {};
            if (this.hiddenElementIds) this.hiddenElementIds.clear();
            this.isIsolated = false;
            this.isolatedExpressId = null;

            // Limpieza de herramientas de sección
            this.disableSectionPlane(true);
            if (this.sectionHelperMesh) {
                if (this.scene) this.scene.remove(this.sectionHelperMesh);
                if (this.sectionHelperMesh.geometry) this.sectionHelperMesh.geometry.dispose();
                if (this.sectionHelperMesh.material) {
                    if (Array.isArray(this.sectionHelperMesh.material)) this.sectionHelperMesh.material.forEach(m => m.dispose());
                    else this.sectionHelperMesh.material.dispose();
                }
                this.sectionHelperMesh = null;
            }

            // 6. Limpiar componentes de interfaz del visor
            const storeySelect = document.getElementById('v3dStoreySelect');
            if (storeySelect) {
                storeySelect.innerHTML = '<option value="all">🏢 Edificio Completo (Todas las Plantas)</option>';
                storeySelect.value = 'all';
            }
            const catList = document.getElementById('v3dCategoriesList');
            if (catList) catList.innerHTML = '';
            const catCounter = document.getElementById('v3dCatCounterBadge');
            if (catCounter) catCounter.textContent = '0/0';
            const catBtnLabel = document.getElementById('v3dCategoriesBtnLabel');
            if (catBtnLabel) catBtnLabel.textContent = 'Elementos';
            const selLabel = document.getElementById('v3dSelectedLabel');
            if (selLabel) selLabel.textContent = 'Haz clic en un elemento para inspeccionarlo';

            // 7. Renderizar escena vacía
            if (this.renderer && this.scene && this.camera) {
                this.renderer.render(this.scene, this.camera);
            }
            console.log("IFCViewer3D: Purga total de modelo y memoria completada.");
        },

        /**
         * Carga y renderiza el modelo IFC desde un ArrayBuffer de forma asíncrona y ultra-rápida
         */
        loadModel: async function (arrayBuffer, ifcData, fileName, modelKey) {
            if (!this.init('visor3dCanvasContainer')) {
                console.error("IFCViewer3D: No se pudo inicializar el canvas antes de cargar.");
                return;
            }

            if (!arrayBuffer) {
                console.warn("IFCViewer3D: arrayBuffer no proporcionado.");
                return;
            }

            const incomingKey = modelKey || fileName || 'default_ifc';
            // Si ya está cargado este mismo modelo y la malla existe, reutilizar
            if (this.currentModelKey === incomingKey && this.ifcModel && Object.keys(this.categorySubsets).length > 0) {
                console.log("IFCViewer3D: El modelo ya está activo en el visor:", incomingKey);
                this.fitToView();
                return;
            }

            // Purgar completamente cualquier modelo anterior y registrar nueva sesión de carga única
            this.unloadModel();
            const currentSession = ++this._loadSessionId;

            this.currentBuffer = arrayBuffer;
            this.currentIfcData = ifcData;
            this.currentModelKey = incomingKey;
            this.currentFileName = fileName || (ifcData && ifcData.header ? ifcData.header.fileName : 'Modelo IFC');

            // Crear mapas de búsqueda rápida por GlobalId e ID
            this.expressIdToElementMap = {};
            this.globalIdToElementMap = {};
            if (ifcData && ifcData.elements) {
                ifcData.elements.forEach(elem => {
                    const rawId = elem.expressId !== undefined ? elem.expressId : elem.id;
                    if (rawId !== undefined && rawId !== null) {
                        this.expressIdToElementMap[rawId] = elem;
                        this.expressIdToElementMap[String(rawId)] = elem;
                    }
                    if (elem.globalId) this.globalIdToElementMap[elem.globalId] = elem;
                });
            }

            // Sincronizar selector o etiqueta del modelo en la barra
            const modelSelect = document.getElementById('v3dModelSelect');
            if (modelSelect && incomingKey) {
                if (modelSelect.querySelector(`option[value="${incomingKey}"]`)) {
                    modelSelect.value = incomingKey;
                }
            }
            const modelLabel = document.getElementById('visor3dModelName');
            if (modelLabel) modelLabel.textContent = this.currentFileName;

            // Rellenar selector de plantas con cotas reales
            this._populateStoreysDropdown(ifcData);

            // Mostrar badge de carga
            const loadingBadge = document.getElementById('v3dLoadingBadge');
            const loadingText = loadingBadge ? loadingBadge.querySelector('span') : null;
            if (loadingBadge) {
                loadingBadge.style.display = 'flex';
                if (loadingText) loadingText.textContent = 'Procesando geometría 3D del modelo...';
            }

            // Configurar Web-IFC para máxima velocidad (Fast Booleans y omitir espacios vacíos)
            try {
                if (this.ifcLoader && this.ifcLoader.ifcManager) {
                    await this.ifcLoader.ifcManager.setWasmPath('./');
                    if (this._loadSessionId !== currentSession) return;
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
                            if (this._loadSessionId !== currentSession) return;
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

                // Si otra llamada más reciente inició mientras parseábamos, descartar este resultado
                if (this._loadSessionId !== currentSession) {
                    console.log("IFCViewer3D: Carga obsoleta descartada (sesión", currentSession, "vs actual", this._loadSessionId, ")");
                    try {
                        if (this.ifcLoader && this.ifcLoader.ifcManager && model && model.modelID !== undefined) {
                            this.ifcLoader.ifcManager.close(model.modelID, this.scene);
                        }
                    } catch (e) { }
                    return;
                }

                const tElapsed = ((performance.now() - t0) / 1000).toFixed(2);
                console.log(`IFCViewer3D: Modelo 3D base generado con éxito en ${tElapsed}s.`);

                this.ifcModel = model;
                // El modelo base se mantiene en la escena pero con visible=false para que rendericen los subsets en tonos azules
                this.ifcModel.visible = false;
                this.scene.add(model);

                // Construir los subsets por categoría con la estética Blueprint (azul uniforme, aristas blancas y vértices)
                if (loadingText) loadingText.textContent = 'Generando visualización Blueprint (aristas y geometría)...';
                await this._buildCategorySubsets(ifcData);

                if (this._loadSessionId !== currentSession) {
                    return;
                }

                // Poblar y sincronizar el menú selector de elementos
                this._populateCategoriesDropdown();

                // Calibrar límites de planos de sección según dimensiones de este modelo
                this.updateSectionBounds(false);

                if (loadingBadge) loadingBadge.style.display = 'none';

                // Centrar cámara en el modelo
                this.fitToView();
            } catch (err) {
                if (this._loadSessionId === currentSession && loadingBadge) {
                    loadingBadge.style.display = 'none';
                }
                console.error("IFCViewer3D: Error parseando geometría:", err);
                if (this._loadSessionId === currentSession) {
                    alert("Error generando geometría 3D: " + (err.message || err));
                }
            }
        },

        /**
         * Centra la cámara orbital para encuadrar todo el modelo
         */
        fitToView: function () {
            if (!this.camera || !this.controls) return;

            const THREE = window.THREE;
            const box = new THREE.Box3();

            // Calcular encuadre a partir de las mallas activas visibles
            const activeMeshes = Object.values(this.categorySubsets)
                .filter(sub => sub && sub.mesh && sub.mesh.visible)
                .map(sub => sub.mesh);

            if (activeMeshes.length > 0) {
                activeMeshes.forEach(mesh => box.expandByObject(mesh));
            } else if (this.ifcModel) {
                box.setFromObject(this.ifcModel);
            } else {
                return;
            }

            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());

            const maxDim = Math.max(size.x, size.y, size.z, 5.0);

            if (this.currentCameraType === 'orthographic' && this.orthographicCamera) {
                this.setViewMode(this.currentViewMode || 'top');
                return;
            }

            const cam = this.perspectiveCamera || this.camera;
            const fov = (cam && cam.fov ? cam.fov : 45) * (Math.PI / 180);
            let cameraDist = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.5;
            if (isNaN(cameraDist) || cameraDist < 5) cameraDist = 25;

            cam.position.set(center.x + cameraDist * 0.7, center.y + cameraDist * 0.5, center.z + cameraDist * 0.7);
            cam.lookAt(center);
            this.controls.target.copy(center);
            this.controls.update();
        },

        /**
         * Cambia el modo de visualización de cámara:
         * - '3d': Perspectiva cónica estándar Three.js
         * - 'top': Planta técnica cenital en proyección ortográfica paralela (sin fuga de profundidad)
         * - 'front': Alzado frontal (Sur) en proyección ortográfica
         * - 'back': Alzado posterior (Norte) en proyección ortográfica
         * - 'left': Alzado izquierdo (Oeste) en proyección ortográfica
         * - 'right': Alzado derecho (Este) en proyección ortográfica
         */
        setViewMode: function (mode) {
            const THREE = window.THREE;
            if (!this.controls || !THREE) return;

            const viewMode = mode || '3d';

            // 1. Obtener centro y dimensiones de la caja envolvente del modelo
            let box = new THREE.Box3();
            let hasBounds = false;
            const subs = Object.values(this.categorySubsets);
            subs.forEach(s => {
                if (s && s.mesh && s.mesh.visible) {
                    box.expandByObject(s.mesh);
                    hasBounds = true;
                }
            });
            if (!hasBounds && this.ifcModel) {
                box.setFromObject(this.ifcModel);
                hasBounds = true;
            }
            if (!hasBounds) {
                box = new THREE.Box3(new THREE.Vector3(-15, -2, -15), new THREE.Vector3(15, 15, 15));
            }

            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            if (isNaN(center.x)) center.set(0, 0, 0);

            const maxDim = Math.max(size.x, size.y, size.z, 6.0);
            const w = (this.container && this.container.clientWidth) ? this.container.clientWidth : 800;
            const h = (this.container && this.container.clientHeight) ? this.container.clientHeight : 600;
            const aspect = w / h;

            const viewLabels = {
                '3d': 'Vista 3D (Perspectiva Cónica)',
                'top': 'Planta (Vista Cenital Ortográfica CAD)',
                'front': 'Alzado Frontal (Sur - Proyección Paralela)',
                'back': 'Alzado Posterior (Norte - Proyección Paralela)',
                'left': 'Alzado Izquierdo (Oeste - Proyección Paralela)',
                'right': 'Alzado Derecho (Este - Proyección Paralela)'
            };

            if (viewMode === '3d') {
                this.currentCameraType = 'perspective';
                this.currentViewMode = '3d';
                this.camera = this.perspectiveCamera;
                this.controls.object = this.camera;
                this.controls.enableRotate = true; // Habilitar órbita libre 3D

                this.camera.aspect = aspect;
                this.camera.updateProjectionMatrix();
                this.camera.up.set(0, 1, 0);

                const fov = this.camera.fov * (Math.PI / 180);
                let camDist = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.5;
                if (isNaN(camDist) || camDist < 5) camDist = 25;

                this.camera.position.set(center.x + camDist * 0.7, center.y + camDist * 0.5, center.z + camDist * 0.7);
                this.camera.lookAt(center);
                this.controls.target.copy(center);
                this.controls.update();
            } else {
                this.currentCameraType = 'orthographic';
                this.currentViewMode = viewMode;
                this.camera = this.orthographicCamera;
                this.controls.object = this.camera;
                // En vistas técnicas: BLOQUEAR ROTACIÓN/ÓRBITA (solo permitir zoom in/out y paneo)
                this.controls.enableRotate = false;
                this.controls.enableZoom = true;
                this.controls.enablePan = true;

                // Calibrar frustum ortográfico según la vista y dimensiones
                let frustumHeight = maxDim * 1.25;
                if (viewMode === 'top') {
                    frustumHeight = Math.max(size.x / aspect, size.z) * 1.25;
                } else if (viewMode === 'front' || viewMode === 'back') {
                    frustumHeight = Math.max(size.x / aspect, size.y) * 1.25;
                } else if (viewMode === 'left' || viewMode === 'right') {
                    frustumHeight = Math.max(size.z / aspect, size.y) * 1.25;
                }
                if (isNaN(frustumHeight) || frustumHeight < 5) frustumHeight = maxDim * 1.25;

                const frustumWidth = frustumHeight * aspect;

                this.orthographicCamera.left = -frustumWidth / 2;
                this.orthographicCamera.right = frustumWidth / 2;
                this.orthographicCamera.top = frustumHeight / 2;
                this.orthographicCamera.bottom = -frustumHeight / 2;
                this.orthographicCamera.near = 0.1;
                this.orthographicCamera.far = Math.max(maxDim * 15, 2000);
                this.orthographicCamera.zoom = 1;
                this.orthographicCamera.updateProjectionMatrix();

                const camDist = maxDim * 3.0;

                if (viewMode === 'top') {
                    // Planta: mirada desde arriba hacia abajo, North (-Z) hacia arriba en pantalla
                    this.orthographicCamera.up.set(0, 0, -1);
                    this.orthographicCamera.position.set(center.x, center.y + camDist, center.z);
                } else if (viewMode === 'front') {
                    // Alzado Frontal (Sur): mirando desde +Z hacia el centro
                    this.orthographicCamera.up.set(0, 1, 0);
                    this.orthographicCamera.position.set(center.x, center.y, center.z + camDist);
                } else if (viewMode === 'back') {
                    // Alzado Posterior (Norte): mirando desde -Z hacia el centro
                    this.orthographicCamera.up.set(0, 1, 0);
                    this.orthographicCamera.position.set(center.x, center.y, center.z - camDist);
                } else if (viewMode === 'left') {
                    // Alzado Izquierdo (Oeste): mirando desde -X hacia el centro
                    this.orthographicCamera.up.set(0, 1, 0);
                    this.orthographicCamera.position.set(center.x - camDist, center.y, center.z);
                } else if (viewMode === 'right') {
                    // Alzado Derecho (Este): mirando desde +X hacia el centro
                    this.orthographicCamera.up.set(0, 1, 0);
                    this.orthographicCamera.position.set(center.x + camDist, center.y, center.z);
                }

                this.orthographicCamera.lookAt(center);
                this.controls.target.copy(center);
                this.controls.update();
            }

            // Actualizar botones activos en UI
            const btnMap = {
                '3d': document.getElementById('v3dView3DBtn'),
                'top': document.getElementById('v3dViewTopBtn'),
                'front': document.getElementById('v3dViewFrontBtn'),
                'back': document.getElementById('v3dViewBackBtn'),
                'left': document.getElementById('v3dViewLeftBtn'),
                'right': document.getElementById('v3dViewRightBtn')
            };

            for (const k in btnMap) {
                if (btnMap[k]) {
                    if (k === viewMode) btnMap[k].classList.add('active');
                    else btnMap[k].classList.remove('active');
                }
            }

            const label = document.getElementById('v3dSelectedLabel');
            if (label && !this.selectedElement) {
                label.textContent = `📐 ${viewLabels[viewMode] || 'Vista activada'}`;
            }
        },

        /**
         * Configura los eventos click de los botones de vistas ortogonales y 3D en la barra de herramientas
         */
        _setupViewButtonsUI: function () {
            if (this._viewButtonsInitialized) return;
            this._viewButtonsInitialized = true;

            const btn3D = document.getElementById('v3dView3DBtn');
            const btnTop = document.getElementById('v3dViewTopBtn');
            const btnFront = document.getElementById('v3dViewFrontBtn');
            const btnBack = document.getElementById('v3dViewBackBtn');
            const btnLeft = document.getElementById('v3dViewLeftBtn');
            const btnRight = document.getElementById('v3dViewRightBtn');

            if (btn3D) btn3D.onclick = () => this.setViewMode('3d');
            if (btnTop) btnTop.onclick = () => this.setViewMode('top');
            if (btnFront) btnFront.onclick = () => this.setViewMode('front');
            if (btnBack) btnBack.onclick = () => this.setViewMode('back');
            if (btnLeft) btnLeft.onclick = () => this.setViewMode('left');
            if (btnRight) btnRight.onclick = () => this.setViewMode('right');
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
                color: 0x00f0ff,        // Cian neón eléctrico de alto contraste
                emissive: 0x0284c7,     // Brillo radiante ConTech
                emissiveIntensity: 0.65,
                polygonOffset: true,
                polygonOffsetFactor: -1, // Adelantar levemente para evitar z-fighting con la malla base
                polygonOffsetUnits: -1,
                transparent: true,
                opacity: 0.92,
                depthTest: true,
                clippingPlanes: planes,
                clipShadows: true,
                side: THREE.DoubleSide
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
                    this.highlightSubset.renderOrder = 3.5;
                }

                this.selectedExpressId = expressId;
                this.selectedElement = elementObj || { id: String(expressId), name: `Elemento #${expressId}` };

                // Actualizar etiqueta en barra superior
                const label = document.getElementById('v3dSelectedLabel');
                if (label) {
                    const displayTitle = this._formatDisplayTitle(elementObj, expressId);
                    const storey = elementObj && elementObj.storey ? ` (${elementObj.storey})` : '';
                    label.textContent = `🎯 ${displayTitle}${storey}`;
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
            this.hideContextMenu();

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

            const rawName = elemObj ? (elemObj.name || `Elemento #${expressId}`) : `Elemento #${expressId}`;
            const displayTitle = this._formatDisplayTitle(elemObj, expressId);
            const storey = elemObj ? (elemObj.storey || 'Sin Planta Asignada') : 'Modelo BIM 3D';
            const globalId = elemObj ? (elemObj.globalId || String(expressId)) : String(expressId);

            if (nameEl) nameEl.textContent = displayTitle;
            if (storeyEl) storeyEl.textContent = storey;

            // Icono representativo por tipo
            if (iconEl) {
                const lower = (rawName + ' ' + (elemObj ? (elemObj.ifcType || elemObj.category || '') : '')).toLowerCase();
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
            const pCat = document.getElementById('propValCategory');
            const pIfcType = document.getElementById('propValIfcType');
            const pType = document.getElementById('propValType');
            const pStorey = document.getElementById('propValStorey');
            const pId = document.getElementById('v3dCardId');
            const pExp = document.getElementById('propValExpressId');
            const pTag = document.getElementById('propValTag');
            const badgeIfcType = document.getElementById('v3dBadgeIfcType');

            const ifcTypeStr = elemObj ? (elemObj.ifcType || 'IFC') : 'IFC';
            const friendlyCat = this._getFriendlyCategory(elemObj) || (elemObj ? elemObj.category : '-');
            if (pName) pName.textContent = rawName;
            if (pCat) pCat.textContent = friendlyCat;
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
         * Aplica un plano de corte (THREE.Plane o cota de altura numérica) a todas las geometrías del modelo
         */
        applyClippingPlane: function (planeOrHeight) {
            const THREE = window.THREE;
            if (!this.renderer || !THREE) return;
            this.renderer.localClippingEnabled = true;

            let planes = [];
            if (planeOrHeight instanceof THREE.Plane) {
                this.activeClippingPlane = planeOrHeight;
                planes = [this.activeClippingPlane];
            } else if (planeOrHeight !== null && planeOrHeight !== undefined && !isNaN(planeOrHeight)) {
                // Normal (0, -1, 0) con constante planeOrHeight elimina todo donde Y > planeOrHeight
                this.activeClippingPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), planeOrHeight);
                planes = [this.activeClippingPlane];
            } else {
                this.activeClippingPlane = null;
            }

            const setMat = (m) => {
                if (!m) return;
                m.clippingPlanes = planes;
                m.clipShadows = true;
                m.needsUpdate = true;
            };

            // Aplicar a cada subset por categoría y a todas sus aristas/vértices hijas
            Object.values(this.categorySubsets).forEach(sub => {
                if (sub && sub.mesh) {
                    sub.mesh.traverse(child => {
                        if (child && child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(setMat);
                            } else {
                                setMat(child.material);
                            }
                        }
                    });
                }
            });

            // Aplicar también al modelo base y sus hijos por seguridad
            if (this.ifcModel) {
                this.ifcModel.traverse(child => {
                    if (child && child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(setMat);
                        } else {
                            setMat(child.material);
                        }
                    }
                });
            }

            // Si hay un subset resaltado activo, aplicarle también el plano de corte
            if (this.highlightSubset) {
                this.highlightSubset.traverse(child => {
                    if (child && child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(setMat);
                        } else {
                            setMat(child.material);
                        }
                    }
                });
            }

            // Si hay un elemento aislado activo, aplicarle también el plano de corte
            if (this.isolatedSubset) {
                this.isolatedSubset.traverse(child => {
                    if (child && child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(setMat);
                        } else {
                            setMat(child.material);
                        }
                    }
                });
            }

            // Sincronizar tapas de sección macizas en azul oscuro (Stencil Capping)
            if (this.activeClippingPlane) {
                const axis = this.sectionConfig.active ? this.sectionConfig.axis : 'Y';
                let val = this.sectionConfig.active ? this.sectionConfig.value : 0;
                if (!this.sectionConfig.active && typeof planeOrHeight === 'number') {
                    val = planeOrHeight;
                }
                const inv = this.sectionConfig.active ? this.sectionConfig.inverted : false;
                this._updateSectionCaps(axis, val, inv);
            } else {
                this._updateSectionCaps();
                if (this.sectionCapGroup) {
                    this.sectionCapGroup.visible = false;
                }
            }
        },

        /**
         * Abre o cierra el panel flotante de planos de sección
         */
        toggleSectionWidget: function (forceState) {
            const widget = document.getElementById('v3dSectionWidget');
            const btn = document.getElementById('v3dSectionBtn');
            if (!widget) return;

            this._setupSectionToolUI();

            const isCurrentlyOpen = widget.style.display !== 'none' && widget.style.display !== '';
            const shouldOpen = typeof forceState === 'boolean' ? forceState : !isCurrentlyOpen;

            if (shouldOpen) {
                // Calcular cota superior dinámica para ubicarse justo debajo de la barra de herramientas sin pisarla
                const toolbar = document.getElementById('visor3dToolbar');
                if (toolbar && widget) {
                    const tbRect = toolbar.getBoundingClientRect();
                    const containerRect = this.container ? this.container.getBoundingClientRect() : { top: 0 };
                    const topOffset = Math.max(68, (tbRect.bottom - containerRect.top) + 8);
                    widget.style.top = `${Math.round(topOffset)}px`;
                    widget.style.left = '14px';
                }
                widget.style.display = 'block';
                if (btn) btn.classList.add('active');
                this.updateSectionBounds(false);
            } else {
                widget.style.display = 'none';
                if (btn && !this.sectionConfig.active) btn.classList.remove('active');
            }
        },

        /**
         * Actualiza los límites del slider (min, max) según el BoundingBox del modelo activo
         */
        updateSectionBounds: function (resetToMidpoint) {
            const THREE = window.THREE;
            const slider = document.getElementById('v3dSectionSlider');
            const valBadge = document.getElementById('v3dSectionValueBadge');
            if (!slider || !THREE) return;

            // Calcular caja envolvente del modelo
            let box = new THREE.Box3();
            let hasBounds = false;
            const subs = Object.values(this.categorySubsets);
            subs.forEach(s => {
                if (s && s.mesh && s.mesh.visible) {
                    box.expandByObject(s.mesh);
                    hasBounds = true;
                }
            });
            if (!hasBounds && this.ifcModel) {
                box.setFromObject(this.ifcModel);
                hasBounds = true;
            }

            if (!hasBounds) {
                box = new THREE.Box3(new THREE.Vector3(-10, -2, -10), new THREE.Vector3(10, 10, 10));
            }

            const axis = this.sectionConfig.axis || 'Y';
            let min = 0, max = 10;
            if (axis === 'X') {
                min = box.min.x - 0.2;
                max = box.max.x + 0.2;
            } else if (axis === 'Y') {
                min = box.min.y - 0.2;
                max = box.max.y + 0.2;
            } else if (axis === 'Z') {
                min = box.min.z - 0.2;
                max = box.max.z + 0.2;
            }

            min = Math.floor(min * 10) / 10;
            max = Math.ceil(max * 10) / 10;
            if (min >= max) max = min + 2;

            slider.min = min.toFixed(2);
            slider.max = max.toFixed(2);
            slider.step = '0.05';

            let val = parseFloat(slider.value);
            if (resetToMidpoint || isNaN(val) || val < min || val > max) {
                val = (min + max) / 2;
                val = Math.round(val * 20) / 20;
                slider.value = val.toFixed(2);
            }

            this.sectionConfig.min = min;
            this.sectionConfig.max = max;
            this.sectionConfig.value = val;

            if (valBadge) valBadge.textContent = `${val >= 0 ? '+' : ''}${val.toFixed(2)} m`;

            // Si el widget está visible o la sección está activa, aplicar corte
            const widget = document.getElementById('v3dSectionWidget');
            if ((widget && widget.style.display !== 'none') || this.sectionConfig.active) {
                this.applySectionPlane(axis, val, this.sectionConfig.inverted);
            }
        },

        /**
         * Aplica el plano de corte en el eje espacial deseado (X, Y, Z) con la cota y orientación indicadas
         */
        applySectionPlane: function (axis, value, inverted) {
            const THREE = window.THREE;
            if (!this.renderer || !THREE) return;

            this.sectionConfig.active = true;
            this.sectionConfig.axis = axis;
            this.sectionConfig.value = value;
            this.sectionConfig.inverted = !!inverted;

            const btn = document.getElementById('v3dSectionBtn');
            if (btn) btn.classList.add('active');

            // Construir vector normal y constante del plano
            const normal = new THREE.Vector3();
            let constant = 0;

            if (axis === 'X') {
                normal.set(inverted ? 1 : -1, 0, 0);
                constant = inverted ? -value : value;
            } else if (axis === 'Y') {
                normal.set(0, inverted ? 1 : -1, 0);
                constant = inverted ? -value : value;
            } else if (axis === 'Z') {
                normal.set(0, 0, inverted ? 1 : -1);
                constant = inverted ? -value : value;
            }

            const plane = new THREE.Plane(normal, constant);
            this.applyClippingPlane(plane);

            // Actualizar plano guía 3D en la escena
            this._updateSectionHelper(axis, value);
        },

        /**
         * Crea o actualiza la malla de visualización del plano guía 3D semitransparente con contorno cian
         */
        _updateSectionHelper: function (axis, value) {
            const THREE = window.THREE;
            if (!this.scene || !THREE) return;

            if (!this.sectionConfig.showHelper || !this.sectionConfig.active) {
                if (this.sectionHelperMesh) this.sectionHelperMesh.visible = false;
                return;
            }

            // Obtener caja envolvente del modelo
            let box = new THREE.Box3();
            let hasBounds = false;
            Object.values(this.categorySubsets).forEach(s => {
                if (s && s.mesh && s.mesh.visible) {
                    box.expandByObject(s.mesh);
                    hasBounds = true;
                }
            });
            if (!hasBounds && this.ifcModel) box.setFromObject(this.ifcModel);
            if (!hasBounds) box = new THREE.Box3(new THREE.Vector3(-10, -2, -10), new THREE.Vector3(10, 10, 10));

            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const margin = 2.0;

            let width = 10, height = 10;
            if (axis === 'X') {
                width = size.z + margin * 2;
                height = size.y + margin * 2;
            } else if (axis === 'Y') {
                width = size.x + margin * 2;
                height = size.z + margin * 2;
            } else if (axis === 'Z') {
                width = size.x + margin * 2;
                height = size.y + margin * 2;
            }

            if (this.sectionHelperMesh) {
                this.scene.remove(this.sectionHelperMesh);
                if (this.sectionHelperMesh.geometry) this.sectionHelperMesh.geometry.dispose();
                if (this.sectionHelperMesh.material) {
                    if (Array.isArray(this.sectionHelperMesh.material)) this.sectionHelperMesh.material.forEach(m => m.dispose());
                    else this.sectionHelperMesh.material.dispose();
                }
                this.sectionHelperMesh = null;
            }

            const planeGeom = new THREE.PlaneGeometry(width, height);
            const planeMat = new THREE.MeshBasicMaterial({
                color: 0x38bdf8,
                transparent: true,
                opacity: 0.14,
                side: THREE.DoubleSide,
                depthWrite: false
            });
            const helperMesh = new THREE.Mesh(planeGeom, planeMat);
            helperMesh.name = 'v3d-section-helper';

            const edgesGeom = new THREE.EdgesGeometry(planeGeom);
            const edgesMat = new THREE.LineBasicMaterial({
                color: 0x38bdf8,
                transparent: true,
                opacity: 0.85
            });
            const edgesMesh = new THREE.LineSegments(edgesGeom, edgesMat);
            edgesMesh.name = 'v3d-section-helper-edges';
            helperMesh.add(edgesMesh);

            if (axis === 'X') {
                helperMesh.rotation.y = Math.PI / 2;
                helperMesh.position.set(value, center.y, center.z);
            } else if (axis === 'Y') {
                helperMesh.rotation.x = -Math.PI / 2;
                helperMesh.position.set(center.x, value, center.z);
            } else if (axis === 'Z') {
                helperMesh.rotation.set(0, 0, 0);
                helperMesh.position.set(center.x, center.y, value);
            }

            helperMesh.visible = true;
            this.scene.add(helperMesh);
            this.sectionHelperMesh = helperMesh;
        },

        /**
         * Gestiona la visibilidad y planos de corte de las tapas macizas en azul oscuro (#0f2b5c).
         * Utiliza la técnica de renderizado de núcleo interior volumétrico (THREE.BackSide en submallas
         * hijas 'blueprint-back-solid'), ancladas a la geometría real de los elementos constructivos.
         * Esto garantiza 0 artefactos, 0 triángulos flotantes en puertas/ventanas y máximo rendimiento a 60 FPS.
         */
        _updateSectionCaps: function (axis, value, inverted) {
            const showCaps = (this.sectionConfig && this.sectionConfig.showCaps !== undefined) ? this.sectionConfig.showCaps : true;
            const isSectionActive = this.sectionConfig && this.sectionConfig.active && !!this.activeClippingPlane;
            const shouldShowSolid = isSectionActive && showCaps;

            // 1. Actualizar visibilidad y planos de corte de todas las capas de núcleo macizo
            if (this.scene) {
                this.scene.traverse(obj => {
                    if (obj.name === 'blueprint-back-solid') {
                        obj.visible = shouldShowSolid;
                        if (obj.material) {
                            obj.material.clippingPlanes = this.activeClippingPlane ? [this.activeClippingPlane] : [];
                            obj.material.needsUpdate = true;
                        }
                    }
                });
            }

            // 2. Limpiar cualquier resto obsoleto del sistema anterior de stencil si existiera en memoria
            if (this.sectionCapGroup) {
                try {
                    this.scene.remove(this.sectionCapGroup);
                    while (this.sectionCapGroup.children.length > 0) {
                        const ch = this.sectionCapGroup.children[0];
                        this.sectionCapGroup.remove(ch);
                    }
                } catch (e) { }
                this.sectionCapGroup = null;
            }
            if (this.sectionCapMesh) {
                try {
                    if (this.sectionCapMesh.geometry) this.sectionCapMesh.geometry.dispose();
                } catch (e) { }
                this.sectionCapMesh = null;
            }
        },

        /**
         * Desactiva el plano de corte de sección y oculta el plano guía
         */
        disableSectionPlane: function (closeWidget) {
            this.sectionConfig.active = false;
            this.applyClippingPlane(null);

            if (this.sectionHelperMesh) {
                this.sectionHelperMesh.visible = false;
            }
            this._updateSectionCaps();

            const btn = document.getElementById('v3dSectionBtn');
            if (btn) btn.classList.remove('active');

            if (closeWidget) {
                this.toggleSectionWidget(false);
            }

            const label = document.getElementById('v3dSelectedLabel');
            if (label) {
                label.textContent = 'Plano de sección desactivado: Mostrando todo el modelo';
            }
        },

        /**
         * Configura eventos y controles del panel flotante de planos de sección 3D (Multieje X, Y, Z)
         */
        _setupSectionToolUI: function () {
            if (this._sectionToolInitialized) return;
            this._sectionToolInitialized = true;

            const widget = document.getElementById('v3dSectionWidget');
            const closeBtn = document.getElementById('v3dSectionCloseBtn');
            const slider = document.getElementById('v3dSectionSlider');
            const valBadge = document.getElementById('v3dSectionValueBadge');
            const stepDownBtn = document.getElementById('v3dSectionStepDownBtn');
            const stepUpBtn = document.getElementById('v3dSectionStepUpBtn');
            const invertBtn = document.getElementById('v3dSectionInvertBtn');
            const helperChk = document.getElementById('v3dSectionHelperChk');
            const capChk = document.getElementById('v3dSectionCapChk');
            const resetBtn = document.getElementById('v3dSectionResetBtn');
            const axisPills = document.querySelectorAll('.v3d-axis-pill');

            if (!widget) return;

            widget.addEventListener('pointerdown', (e) => e.stopPropagation());
            widget.addEventListener('click', (e) => e.stopPropagation());

            if (closeBtn) {
                closeBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.toggleSectionWidget(false);
                };
            }

            axisPills.forEach(pill => {
                pill.onclick = (e) => {
                    e.stopPropagation();
                    const axis = pill.getAttribute('data-axis');
                    if (axis && this.sectionConfig.axis !== axis) {
                        this.sectionConfig.axis = axis;
                        axisPills.forEach(p => p.classList.remove('active'));
                        pill.classList.add('active');
                        this.updateSectionBounds(true);
                    }
                };
            });

            if (slider) {
                slider.oninput = (e) => {
                    const val = parseFloat(slider.value);
                    this.sectionConfig.value = val;
                    if (valBadge) valBadge.textContent = `${val >= 0 ? '+' : ''}${val.toFixed(2)} m`;
                    this.applySectionPlane(this.sectionConfig.axis, val, this.sectionConfig.inverted);
                };
            }

            if (stepDownBtn && slider) {
                stepDownBtn.onclick = (e) => {
                    e.stopPropagation();
                    const current = parseFloat(slider.value) || 0;
                    const min = parseFloat(slider.min) || -50;
                    const next = Math.max(min, Math.round((current - 0.20) * 100) / 100);
                    slider.value = next.toFixed(2);
                    slider.dispatchEvent(new Event('input'));
                };
            }

            if (stepUpBtn && slider) {
                stepUpBtn.onclick = (e) => {
                    e.stopPropagation();
                    const current = parseFloat(slider.value) || 0;
                    const max = parseFloat(slider.max) || 50;
                    const next = Math.min(max, Math.round((current + 0.20) * 100) / 100);
                    slider.value = next.toFixed(2);
                    slider.dispatchEvent(new Event('input'));
                };
            }

            if (invertBtn) {
                invertBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.sectionConfig.inverted = !this.sectionConfig.inverted;
                    this.applySectionPlane(this.sectionConfig.axis, this.sectionConfig.value, this.sectionConfig.inverted);
                };
            }

            if (helperChk) {
                helperChk.onchange = () => {
                    this.sectionConfig.showHelper = helperChk.checked;
                    if (this.sectionHelperMesh) {
                        this.sectionHelperMesh.visible = this.sectionConfig.active && this.sectionConfig.showHelper;
                    }
                };
            }

            if (capChk) {
                capChk.checked = this.sectionConfig.showCaps !== false;
                capChk.onchange = () => {
                    this.sectionConfig.showCaps = capChk.checked;
                    const axis = this.sectionConfig.active ? this.sectionConfig.axis : 'Y';
                    const val = this.sectionConfig.active ? this.sectionConfig.value : 0;
                    const inv = this.sectionConfig.active ? this.sectionConfig.inverted : false;
                    this._updateSectionCaps(axis, val, inv);
                };
            }

            if (resetBtn) {
                resetBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.disableSectionPlane(true);
                };
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
            this.isXRay = !this.isXRay;

            const updateMat = (m, defOpacity, defTransparent) => {
                if (!m) return;
                if (this.isXRay) {
                    m.transparent = true;
                    m.opacity = (defOpacity !== undefined ? defOpacity : 1.0) * 0.35;
                } else {
                    m.transparent = Boolean(defTransparent);
                    m.opacity = defOpacity !== undefined ? defOpacity : 1.0;
                }
                m.needsUpdate = true;
            };

            // Alternar transparencia en todos los subsets de categoría
            Object.values(this.categorySubsets).forEach(sub => {
                if (sub && sub.mesh && sub.mesh.material) {
                    if (Array.isArray(sub.mesh.material)) {
                        sub.mesh.material.forEach(m => updateMat(m, sub.defaultOpacity, sub.defaultTransparent));
                    } else {
                        updateMat(sub.mesh.material, sub.defaultOpacity, sub.defaultTransparent);
                    }
                }
            });

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
            if (!this.container || !this.renderer) return;
            const w = this.container.clientWidth;
            const h = this.container.clientHeight;
            if (w <= 0 || h <= 0) return;

            const aspect = w / h;
            if (this.perspectiveCamera) {
                this.perspectiveCamera.aspect = aspect;
                this.perspectiveCamera.updateProjectionMatrix();
            }
            if (this.orthographicCamera) {
                const frustumHeight = this.orthographicCamera.top - this.orthographicCamera.bottom;
                const currentFrustumH = frustumHeight > 0 ? frustumHeight : 35;
                this.orthographicCamera.left = -currentFrustumH * aspect / 2;
                this.orthographicCamera.right = currentFrustumH * aspect / 2;
                this.orthographicCamera.updateProjectionMatrix();
            }
            this.renderer.setSize(w, h);
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

                // Intersectar los subsets de categorías visibles o el subset aislado
                let activeMeshes = [];
                if (this.isIsolated && this.isolatedSubset && this.isolatedSubset.visible) {
                    activeMeshes = [this.isolatedSubset];
                } else {
                    activeMeshes = Object.values(this.categorySubsets)
                        .filter(sub => sub && sub.mesh && sub.mesh.visible)
                        .map(sub => sub.mesh);
                }

                let intersects = [];
                if (activeMeshes.length > 0) {
                    intersects = raycaster.intersectObjects(activeMeshes, false);
                } else if (this.ifcModel && this.ifcModel.visible) {
                    intersects = raycaster.intersectObject(this.ifcModel, true);
                }

                // FILTRADO CRÍTICO DE PLANO DE SECCIÓN:
                // Three.js evalúa el rayo contra los triángulos en CPU sin conocer el recorte GPU (clippingPlanes).
                // Si el corte está activo, descartamos cualquier punto de impacto que caiga en la zona recortada/oculta
                // (distanceToPoint < 0) para permitir seleccionar muebles, particiones y objetos interiores a través del corte.
                if (this.activeClippingPlane && intersects.length > 0) {
                    const plane = this.activeClippingPlane;
                    intersects = intersects.filter(hit => {
                        return plane.distanceToPoint(hit.point) >= -0.001;
                    });
                }

                // Si no hay intersección (clic en el fondo/espacio vacío): DESELECCIONAR
                if (intersects.length === 0) {
                    this.resetHighlight();
                    this.hideContextMenu();
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

                // 4. Mostrar el menú flotante contextual junto a la posición del ratón
                this.showContextMenu(e.clientX, e.clientY, elemObj, id);

                // 5. Disparar callback de integración con presupuesto
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
        },

        /**
         * Construye los subsets por categoría aplicando la paleta ConTech en tonos azules
         */
        _buildCategorySubsets: async function (ifcData) {
            this._clearCategorySubsets();

            if (!this.ifcModel || !this.ifcLoader || !this.ifcLoader.ifcManager) return;

            const THREE = window.THREE;
            const modelID = this.ifcModel.modelID;
            const planes = this.activeClippingPlane ? [this.activeClippingPlane] : [];

            // 1. Agrupar elementos constructivos por categoría
            const categoriesMap = {};
            const allCategorizedIds = new Set();

            const data = ifcData || this.currentIfcData;
            if (data && data.elements && data.elements.length > 0) {
                data.elements.forEach(elem => {
                    const catName = elem.category || 'Elementos Constructivos Varios';
                    if (!categoriesMap[catName]) {
                        const palCfg = this._getPaletteConfig(catName);
                        categoriesMap[catName] = {
                            key: catName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase(),
                            name: catName,
                            icon: elem.icon || palCfg.icon,
                            hex: palCfg.hex,
                            cfg: palCfg,
                            ids: []
                        };
                    }
                    const rawId = elem.expressId !== undefined ? elem.expressId : elem.id;
                    const eid = parseInt(rawId, 10);
                    if (!isNaN(eid)) {
                        categoriesMap[catName].ids.push(eid);
                        allCategorizedIds.add(eid);
                    }
                });
            }

            // 2. Crear subset para cada categoría con su material azul uniforme y decoración blueprint
            for (const catName in categoriesMap) {
                const catInfo = categoriesMap[catName];
                if (catInfo.ids.length === 0) continue;

                const isSolid = this._isSolidCategory(catInfo.name, catInfo.key);
                const mat = new THREE.MeshLambertMaterial({
                    color: this.BLUEPRINT_CONFIG.bodyColor,
                    polygonOffset: true,
                    polygonOffsetFactor: 1,
                    polygonOffsetUnits: 1,
                    depthTest: true,
                    clippingPlanes: planes,
                    clipShadows: true,
                    side: isSolid ? THREE.FrontSide : THREE.DoubleSide
                });

                try {
                    const subset = this.ifcLoader.ifcManager.createSubset({
                        modelID: modelID,
                        ids: catInfo.ids,
                        scene: this.scene,
                        material: mat,
                        removePrevious: true,
                        customID: `cat_${catInfo.key}`
                    });

                    if (subset) {
                        subset.renderOrder = 3;
                        if (subset.parent !== this.scene) {
                            this.scene.add(subset);
                        }

                        // Añadir aristas blancas (LineSegments), vértices en puntitos blancos (Points) y núcleo macizo BackSide
                        this._attachBlueprintDecorations(subset, planes, isSolid);

                        // Por defecto, 'Espacios y Zonas' (IfcSpace) comienza desactivado para no obstruir el interior ni corromper secciones
                        const lowerCat = (catInfo.name || '').toLowerCase();
                        const isDefaultVisible = !(lowerCat.includes('espacio') || lowerCat.includes('zona') || lowerCat.includes('space') || lowerCat.includes('zone'));
                        subset.visible = isDefaultVisible;

                        this.categorySubsets[catInfo.key] = {
                            key: catInfo.key,
                            name: catInfo.name,
                            icon: catInfo.icon,
                            hex: this.BLUEPRINT_CONFIG.bodyHex,
                            color: this.BLUEPRINT_CONFIG.bodyColor,
                            ids: catInfo.ids,
                            mesh: subset,
                            material: mat,
                            defaultOpacity: 1.0,
                            defaultTransparent: false,
                            visible: isDefaultVisible,
                            count: catInfo.ids.length
                        };
                    }
                } catch (subErr) {
                    console.warn(`IFCViewer3D: Error creando subset para categoría ${catName}:`, subErr);
                }
            }

            // 3. Detectar elementos residuales que tengan geometría en el modelo pero no estén en ifcData.elements
            try {
                if (this.ifcLoader.ifcManager.subsets && this.ifcLoader.ifcManager.subsets.items) {
                    if (!this.ifcLoader.ifcManager.subsets.items.map) {
                        this.ifcLoader.ifcManager.subsets.items.map = {};
                    }
                    if (!this.ifcLoader.ifcManager.subsets.items.map[modelID]) {
                        this.ifcLoader.ifcManager.subsets.items.generateGeometryIndexMap(modelID);
                    }
                    const allGeomMap = this.ifcLoader.ifcManager.subsets.items.map[modelID]?.map;
                    if (allGeomMap) {
                        const leftoverIds = [];
                        for (const idStr of allGeomMap.keys()) {
                            const idNum = parseInt(idStr, 10);
                            if (!isNaN(idNum) && !allCategorizedIds.has(idNum)) {
                                leftoverIds.push(idNum);
                            }
                        }
                        if (leftoverIds.length > 0) {
                            const defMat = new THREE.MeshLambertMaterial({
                                color: this.BLUEPRINT_CONFIG.bodyColor,
                                polygonOffset: true,
                                polygonOffsetFactor: 1,
                                polygonOffsetUnits: 1,
                                depthTest: true,
                                clippingPlanes: planes,
                                clipShadows: true,
                                side: THREE.DoubleSide
                            });
                            const defSubset = this.ifcLoader.ifcManager.createSubset({
                                modelID: modelID,
                                ids: leftoverIds,
                                scene: this.scene,
                                material: defMat,
                                removePrevious: true,
                                customID: 'cat_leftover_constructive'
                            });
                            if (defSubset) {
                                defSubset.renderOrder = 3;
                                if (defSubset.parent !== this.scene) {
                                    this.scene.add(defSubset);
                                }
                                this._attachBlueprintDecorations(defSubset, planes, false);
                                this.categorySubsets['__otros__'] = {
                                    key: '__otros__',
                                    name: 'Otros Elementos',
                                    icon: '📦',
                                    hex: this.BLUEPRINT_CONFIG.bodyHex,
                                    color: this.BLUEPRINT_CONFIG.bodyColor,
                                    ids: leftoverIds,
                                    mesh: defSubset,
                                    material: defMat,
                                    defaultOpacity: 1.0,
                                    defaultTransparent: false,
                                    visible: true,
                                    count: leftoverIds.length
                                };
                            }
                        }
                    }
                }
            } catch (resErr) {
                console.warn("IFCViewer3D: Verificación de elementos residuales:", resErr);
            }

            // 4. Fallback de seguridad: si no se generó ningún subset, mostrar el modelo base en blueprint
            if (Object.keys(this.categorySubsets).length === 0) {
                console.warn("IFCViewer3D: No se generaron subsets por categoría. Activando modelo base con estilo Blueprint.");
                this.ifcModel.visible = true;
                const fallbackMat = new THREE.MeshLambertMaterial({
                    color: this.BLUEPRINT_CONFIG.bodyColor,
                    polygonOffset: true,
                    polygonOffsetFactor: 1,
                    polygonOffsetUnits: 1,
                    clippingPlanes: planes,
                    clipShadows: true,
                    side: THREE.DoubleSide
                });
                this.ifcModel.material = fallbackMat;
                this._attachBlueprintDecorations(this.ifcModel, planes, false);
            }
        },

        /**
         * Limpia todos los subsets de categoría y sus decoraciones blueprint de la escena
         */
        _clearCategorySubsets: function () {
            if (!this.categorySubsets) {
                this.categorySubsets = {};
                return;
            }
            Object.values(this.categorySubsets).forEach(sub => {
                if (sub && sub.mesh) {
                    try {
                        sub.mesh.traverse(child => {
                            if (child !== sub.mesh) {
                                if (child.geometry && child.geometry !== sub.mesh.geometry) child.geometry.dispose();
                                if (child.material) {
                                    if (Array.isArray(child.material)) {
                                        child.material.forEach(m => m.dispose());
                                    } else {
                                        child.material.dispose();
                                    }
                                }
                            }
                        });
                        if (this.scene) this.scene.remove(sub.mesh);
                        if (sub.mesh.geometry) sub.mesh.geometry.dispose();
                        if (sub.mesh.material) {
                            if (Array.isArray(sub.mesh.material)) {
                                sub.mesh.material.forEach(m => m.dispose());
                            } else {
                                sub.mesh.material.dispose();
                            }
                        }
                    } catch (e) { }
                }
            });
            this.categorySubsets = {};
        },

        /**
         * Rellena el menú desplegable con las categorías de elementos presentes en el modelo
         */
        _populateCategoriesDropdown: function () {
            const listContainer = document.getElementById('v3dCategoriesList');
            if (!listContainer) return;

            listContainer.innerHTML = '';
            const cats = Object.values(this.categorySubsets);

            if (cats.length === 0) {
                listContainer.innerHTML = '<div style="text-align:center; padding:12px; color:#94a3b8; font-size:0.75rem;">Sin elementos identificados</div>';
                return;
            }

            cats.forEach(cat => {
                const row = document.createElement('label');
                row.className = 'v3d-cat-item';
                row.setAttribute('for', `v3dCatChk_${cat.key}`);

                row.innerHTML = `
                    <input type="checkbox" id="v3dCatChk_${cat.key}" class="v3d-cat-checkbox" ${cat.visible ? 'checked' : ''} />
                    <span class="v3d-cat-swatch" style="background-color: ${cat.hex};"></span>
                    <span class="v3d-cat-icon">${cat.icon}</span>
                    <span class="v3d-cat-name" title="${cat.name}">${cat.name}</span>
                    <span class="v3d-cat-count">${cat.count}</span>
                `;

                const chk = row.querySelector('.v3d-cat-checkbox');
                if (chk) {
                    chk.addEventListener('change', (e) => {
                        e.stopPropagation();
                        this.setCategoryVisibility(cat.key, chk.checked);
                    });
                }

                listContainer.appendChild(row);
            });

            this._updateCategoriesBadge();
        },

        /**
         * Configura los eventos del menú flotante de selección de categorías
         */
        _setupCategoriesMenuUI: function () {
            if (this._categoriesMenuInitialized) return;
            this._categoriesMenuInitialized = true;

            const toggleBtn = document.getElementById('v3dCategoriesToggleBtn');
            const menu = document.getElementById('v3dCategoriesMenu');
            const selectAllBtn = document.getElementById('v3dCatSelectAll');
            const deselectAllBtn = document.getElementById('v3dCatDeselectAll');

            if (toggleBtn && menu) {
                toggleBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isClosed = menu.style.display === 'none';
                    if (isClosed) {
                        menu.style.display = 'flex';
                        toggleBtn.classList.add('menu-open');
                    } else {
                        menu.style.display = 'none';
                        toggleBtn.classList.remove('menu-open');
                    }
                });

                menu.addEventListener('pointerdown', (e) => e.stopPropagation());
                menu.addEventListener('click', (e) => e.stopPropagation());

                document.addEventListener('click', (e) => {
                    if (!e.target.closest('#v3dCategoriesMenu') && !e.target.closest('#v3dCategoriesToggleBtn')) {
                        if (menu.style.display !== 'none') {
                            menu.style.display = 'none';
                            toggleBtn.classList.remove('menu-open');
                        }
                    }
                });
            }

            if (selectAllBtn) {
                selectAllBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.setAllCategoriesVisibility(true);
                });
            }

            if (deselectAllBtn) {
                deselectAllBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.setAllCategoriesVisibility(false);
                });
            }
        },

        /**
         * Alterna la visibilidad de una categoría específica
         */
        setCategoryVisibility: function (catKey, visible) {
            const cat = this.categorySubsets[catKey];
            if (!cat || !cat.mesh) return;

            const isVis = Boolean(visible);
            cat.visible = isVis;
            cat.mesh.visible = isVis;

            const chk = document.getElementById(`v3dCatChk_${catKey}`);
            if (chk && chk.checked !== isVis) {
                chk.checked = isVis;
            }

            // Si el elemento seleccionado pertenece a esta categoría y se ocultó, deseleccionar
            if (!isVis && this.selectedExpressId && cat.ids.includes(this.selectedExpressId)) {
                this.resetHighlight();
            }

            this._updateCategoriesBadge();

            // Sincronizar tapas de corte macizas si el plano de sección está activo
            if (this.activeClippingPlane) {
                this._lastStencilKey = null;
                const axis = this.sectionConfig.active ? this.sectionConfig.axis : 'Y';
                const val = this.sectionConfig.active ? this.sectionConfig.value : 0;
                const inv = this.sectionConfig.active ? this.sectionConfig.inverted : false;
                this._updateSectionCaps(axis, val, inv);
            }
        },

        /**
         * Muestra u oculta todas las categorías simultáneamente
         */
        setAllCategoriesVisibility: function (visible) {
            const isVis = Boolean(visible);
            Object.keys(this.categorySubsets).forEach(k => {
                const cat = this.categorySubsets[k];
                if (cat && cat.mesh) {
                    cat.visible = isVis;
                    cat.mesh.visible = isVis;
                }
                const chk = document.getElementById(`v3dCatChk_${k}`);
                if (chk) chk.checked = isVis;
            });

            if (!isVis) {
                this.resetHighlight();
            }

            this._updateCategoriesBadge();

            // Sincronizar tapas de corte macizas si el plano de sección está activo
            if (this.activeClippingPlane) {
                this._lastStencilKey = null;
                const axis = this.sectionConfig.active ? this.sectionConfig.axis : 'Y';
                const val = this.sectionConfig.active ? this.sectionConfig.value : 0;
                const inv = this.sectionConfig.active ? this.sectionConfig.inverted : false;
                this._updateSectionCaps(axis, val, inv);
            }
        },

        /**
         * Actualiza el badge de conteo de categorías visibles (ej. 8/8) y el texto del botón
         */
        _updateCategoriesBadge: function () {
            const badge = document.getElementById('v3dCatCounterBadge');
            const cats = Object.values(this.categorySubsets);
            if (!badge || cats.length === 0) return;

            const visibleCount = cats.filter(c => c.visible).length;
            const totalCount = cats.length;
            badge.textContent = `${visibleCount}/${totalCount}`;

            const labelBtn = document.getElementById('v3dCategoriesBtnLabel');
            if (labelBtn) {
                if (visibleCount === totalCount) {
                    labelBtn.textContent = 'Elementos';
                } else {
                    labelBtn.textContent = `Elementos (${visibleCount}/${totalCount})`;
                }
            }
        },

        /**
         * Resuelve el ExpressId numérico a partir de un ID o GlobalId
         */
        _resolveExpressId: function (idOrGlobalId) {
            if (idOrGlobalId === null || idOrGlobalId === undefined) return null;
            if (typeof idOrGlobalId === 'number' && !isNaN(idOrGlobalId)) return idOrGlobalId;
            if (this.globalIdToElementMap && this.globalIdToElementMap[idOrGlobalId]) {
                const elem = this.globalIdToElementMap[idOrGlobalId];
                return parseInt(elem.id || elem.expressId, 10);
            }
            if (this.expressIdToElementMap && this.expressIdToElementMap[idOrGlobalId]) {
                const elem = this.expressIdToElementMap[idOrGlobalId];
                return parseInt(elem.id || elem.expressId, 10);
            }
            const parsed = parseInt(idOrGlobalId, 10);
            return isNaN(parsed) ? null : parsed;
        },

        /**
         * Obtiene un icono representativo para el elemento
         */
        _getElementIcon: function (elemObj) {
            if (!elemObj) return '📐';
            if (elemObj.icon) return elemObj.icon;
            const str = `${elemObj.name || ''} ${elemObj.ifcType || ''} ${elemObj.category || ''}`.toLowerCase();
            if (str.includes('wall') || str.includes('muro') || str.includes('tabique')) return '🧱';
            if (str.includes('slab') || str.includes('forjado') || str.includes('suelo') || str.includes('losa') || str.includes('pavimento')) return '📐';
            if (str.includes('column') || str.includes('pilar')) return '🏛️';
            if (str.includes('beam') || str.includes('viga')) return '🏗️';
            if (str.includes('window') || str.includes('ventana') || str.includes('vidrio') || str.includes('cristal')) return '🪟';
            if (str.includes('door') || str.includes('puerta')) return '🚪';
            if (str.includes('roof') || str.includes('cubierta') || str.includes('tejado')) return '🏠';
            if (str.includes('stair') || str.includes('escalera')) return '🪜';
            if (str.includes('railing') || str.includes('barandilla') || str.includes('cerrajeria')) return '🛡️';
            if (str.includes('furn') || str.includes('mobiliario')) return '🛋️';
            if (str.includes('flow') || str.includes('sanit') || str.includes('fontan')) return '🚿';
            if (str.includes('pipe') || str.includes('tuberi')) return '🚰';
            if (str.includes('duct') || str.includes('conduct')) return '💨';
            return '📦';
        },

        /**
         * Limpia y formatea el nombre de un elemento IFC para presentación amigable
         * (ej. "ENTORNO:ENTORNO:199092" -> "Entorno")
         */
        _cleanElementName: function (rawName) {
            if (!rawName || typeof rawName !== 'string') return 'Elemento';
            let name = rawName.trim();
            if (!name) return 'Elemento';

            // Si tiene separadores por dos puntos (formato Familia:Tipo:Id o Categoría:Tipo:Id)
            if (name.includes(':')) {
                const parts = name.split(':').map(p => p.trim()).filter(p => p.length > 0);
                if (parts.length > 0) {
                    name = parts[0];
                }
            }

            // Si el nombre resultante está completamente en mayúsculas (como ENTORNO),
            // formatearlo a Capitalize/Title Case elegante: "Entorno"
            if (name.length > 1 && name === name.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(name)) {
                name = name.toLowerCase().replace(/(^|\s|\/|-)([a-záéíóúñ])/g, (match, sep, char) => sep + char.toUpperCase());
            }

            return name;
        },

        /**
         * Obtiene la categoría constructiva en lenguaje amigable en español
         * (ej. "Puerta", "Ventana", "Muro", "Forjado", "Pilar", "Viga", etc.)
         */
        _getFriendlyCategory: function (elemObj) {
            if (!elemObj) return '';

            const ifcType = (elemObj.ifcType || '').toUpperCase();
            const categoryStr = (elemObj.category || '').toLowerCase();

            // 1. Mapeo directo por ifcType estándar
            const typeMap = {
                'IFCDOOR': 'Puerta',
                'IFCWINDOW': 'Ventana',
                'IFCWALL': 'Muro',
                'IFCWALLSTANDARDCASE': 'Muro',
                'IFCSLAB': 'Forjado',
                'IFCCOLUMN': 'Pilar',
                'IFCBEAM': 'Viga',
                'IFCMEMBER': 'Elemento Estructural',
                'IFCFOOTING': 'Cimentación',
                'IFCCOVERING': 'Revestimiento',
                'IFCROOF': 'Cubierta',
                'IFCSTAIR': 'Escalera',
                'IFCSTAIRFLIGHT': 'Tramo de Escalera',
                'IFCRAILING': 'Barandilla',
                'IFCSPACE': 'Espacio',
                'IFCPIPESEGMENT': 'Tubería',
                'IFCDUCTSEGMENT': 'Conducto',
                'IFCFURNISHINGELEMENT': 'Mobiliario',
                'IFCFURNITURE': 'Mobiliario',
                'IFCFLOWTERMINAL': 'Sanitario / Fontanería',
                'IFCPLATE': 'Vidrio / Panel',
                'IFCSITE': 'Parcela',
                'IFCBUILDINGELEMENTPROXY': ''
            };

            if (typeMap[ifcType]) {
                return typeMap[ifcType];
            }

            // 2. Extracción de categoría semántica desde categoryStr
            if (categoryStr.includes('puerta')) return 'Puerta';
            if (categoryStr.includes('ventana')) return 'Ventana';
            if (categoryStr.includes('muro') || categoryStr.includes('tabique')) return 'Muro';
            if (categoryStr.includes('forjado') || categoryStr.includes('suelo') || categoryStr.includes('pavimento') || categoryStr.includes('losa')) return 'Forjado';
            if (categoryStr.includes('pilar') || categoryStr.includes('columna')) return 'Pilar';
            if (categoryStr.includes('viga')) return 'Viga';
            if (categoryStr.includes('cubierta') || categoryStr.includes('tejado')) return 'Cubierta';
            if (categoryStr.includes('escalera')) return 'Escalera';
            if (categoryStr.includes('barandilla') || categoryStr.includes('cerrajeria')) return 'Barandilla';
            if (categoryStr.includes('mobiliario')) return 'Mobiliario';
            if (categoryStr.includes('sanit') || categoryStr.includes('fontan')) return 'Sanitario';
            if (categoryStr.includes('tuberi')) return 'Tubería';
            if (categoryStr.includes('conduct')) return 'Conducto';
            if (categoryStr.includes('cimentac')) return 'Cimentación';

            return '';
        },

        /**
         * Formatea el título para mostrar en la interfaz:
         * combina la categoría amigable y el nombre/código del elemento
         * (ej. "Puerta: P - 013", o "Entorno" si ya es descriptivo)
         */
        _formatDisplayTitle: function (elemObj, expressId) {
            const rawName = elemObj ? (elemObj.name || `Elemento #${expressId}`) : `Elemento #${expressId}`;
            const cleanName = this._cleanElementName(rawName);
            const category = this._getFriendlyCategory(elemObj);

            if (!category) {
                return cleanName;
            }

            const cleanLower = cleanName.toLowerCase();
            const catLower = category.toLowerCase();

            // Si el nombre limpio ya incluye la categoría (ej. "Puerta 21", "Muros básicos")
            if (cleanLower.includes(catLower)) {
                return cleanName;
            }

            // Si el nombre es un ID numérico o genérico
            if (/^elemento\s*#/i.test(cleanName)) {
                return `${category} #${expressId}`;
            }

            // Combinar categoría y nombre: "Puerta: P - 013"
            return `${category}: ${cleanName}`;
        },

        /**
         * Muestra el menú contextual flotante junto a las coordenadas del ratón
         */
        showContextMenu: function (clientX, clientY, elemObj, expressId) {
            const menu = document.getElementById('v3dContextMenu');
            if (!menu || !this.container) return;

            this._setupContextMenuUI();

            const titleEl = document.getElementById('v3dCtxTitle');
            const subEl = document.getElementById('v3dCtxSubtitle');
            const iconEl = document.getElementById('v3dCtxIcon');

            const displayTitle = this._formatDisplayTitle(elemObj, expressId);
            const icon = this._getElementIcon(elemObj);

            if (titleEl) titleEl.textContent = displayTitle;
            if (subEl) {
                subEl.textContent = '';
                subEl.style.display = 'none';
            }
            if (iconEl) iconEl.textContent = icon;

            // Calcular posición respecto al contenedor relativo del canvas
            const containerRect = this.container.getBoundingClientRect();
            let posX = clientX - containerRect.left + 14;
            let posY = clientY - containerRect.top + 14;

            const menuWidth = 240;
            const menuHeight = 200;

            if (posX + menuWidth > containerRect.width) {
                posX = Math.max(12, clientX - containerRect.left - menuWidth - 14);
            }
            if (posY + menuHeight > containerRect.height) {
                posY = Math.max(12, clientY - containerRect.top - menuHeight - 14);
            }

            menu.style.left = `${Math.round(posX)}px`;
            menu.style.top = `${Math.round(posY)}px`;
            menu.style.display = 'flex';
        },

        /**
         * Oculta el menú contextual flotante
         */
        hideContextMenu: function () {
            const menu = document.getElementById('v3dContextMenu');
            if (menu) menu.style.display = 'none';
        },

        /**
         * Configura los eventos del menú contextual flotante
         */
        _setupContextMenuUI: function () {
            if (this._contextMenuInitialized) return;
            this._contextMenuInitialized = true;

            const menu = document.getElementById('v3dContextMenu');
            const closeBtn = document.getElementById('v3dCtxCloseBtn');
            const isolateBtn = document.getElementById('v3dCtxIsolateBtn');
            const hideBtn = document.getElementById('v3dCtxHideBtn');
            const focusBtn = document.getElementById('v3dCtxFocusBtn');
            const restoreBtn = document.getElementById('v3dCtxRestoreBtn');

            if (!menu) return;

            menu.addEventListener('pointerdown', (e) => e.stopPropagation());
            menu.addEventListener('click', (e) => e.stopPropagation());

            if (closeBtn) {
                closeBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.hideContextMenu();
                };
            }

            if (isolateBtn) {
                isolateBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (this.selectedExpressId) this.isolateElement(this.selectedExpressId);
                };
            }

            if (hideBtn) {
                hideBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (this.selectedExpressId) this.hideElement(this.selectedExpressId);
                };
            }

            if (focusBtn) {
                focusBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (this.selectedExpressId) this.focusElement(this.selectedExpressId);
                };
            }

            if (restoreBtn) {
                restoreBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.restoreView();
                };
            }

            // Cerrar menú contextual si se hace clic fuera en cualquier parte del documento
            document.addEventListener('pointerdown', (e) => {
                if (!e.target.closest('#v3dContextMenu') && menu.style.display !== 'none') {
                    this.hideContextMenu();
                }
            });
        },

        /**
         * Enfoca y centra la cámara orbital sobre el elemento
         */
        focusElement: function (idOrGlobalId) {
            let expressId = this._resolveExpressId(idOrGlobalId) || this.selectedExpressId;
            if (!expressId || !this.ifcModel || !this.camera || !this.controls) return;

            // Si no estamos en modo aislado, asegurar resaltado
            if (!this.isIsolated) {
                if (!this.highlightSubset || this.selectedExpressId !== expressId) {
                    this.highlightElement(expressId, false);
                }
            }

            const targetMesh = (this.isIsolated && this.isolatedSubset) ? this.isolatedSubset : this.highlightSubset;

            if (targetMesh) {
                const THREE = window.THREE;
                const box = new THREE.Box3().setFromObject(targetMesh);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());

                if (!isNaN(center.x) && !isNaN(center.y) && !isNaN(center.z)) {
                    const maxDim = Math.max(size.x, size.y, size.z, 2.0);
                    if (this.currentCameraType === 'orthographic' && this.orthographicCamera) {
                        const dir = this.camera.position.clone().sub(this.controls.target).normalize();
                        if (dir.lengthSq() === 0) dir.set(0, 1, 0);
                        this.controls.target.copy(center);
                        this.camera.position.copy(center.clone().add(dir.multiplyScalar(maxDim * 3.0)));
                        this.camera.lookAt(center);
                        this.controls.update();
                    } else {
                        const fov = (this.perspectiveCamera ? this.perspectiveCamera.fov : 45) * (Math.PI / 180);
                        let cameraDist = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 2.2;
                        if (isNaN(cameraDist) || cameraDist < 4) cameraDist = 8;

                        const dir = this.camera.position.clone().sub(this.controls.target).normalize();
                        if (dir.lengthSq() === 0) dir.set(1, 1, 1).normalize();

                        this.camera.position.copy(center.clone().add(dir.multiplyScalar(cameraDist)));
                        this.camera.lookAt(center);
                        this.controls.target.copy(center);
                        this.controls.update();
                    }
                }
            }

            this.hideContextMenu();
        },

        /**
         * Aísla el elemento seleccionado ocultando todo lo demás
         */
        isolateElement: function (idOrGlobalId) {
            let expressId = this._resolveExpressId(idOrGlobalId) || this.selectedExpressId;
            if (!expressId || !this.ifcModel || !this.ifcLoader || !this.ifcLoader.ifcManager) return;

            const elemObj = this.expressIdToElementMap[expressId] || this.selectedElement;

            // 1. Limpiar cualquier resaltado y aislamiento previo
            this.resetHighlight();
            this._clearIsolatedSubset();

            // 2. Ocultar todas las categorías del modelo
            Object.values(this.categorySubsets).forEach(sub => {
                if (sub && sub.mesh) {
                    sub.mesh.visible = false;
                }
            });

            // Determinar si el elemento aislado es de una categoría sólida
            let isSolid = true;
            if (this.currentIfcData && this.currentIfcData.elements) {
                const elemObj = this.currentIfcData.elements.find(e => (e.expressId !== undefined ? e.expressId : e.id) == expressId);
                if (elemObj) {
                    isSolid = this._isSolidCategory(elemObj.category, elemObj.type);
                }
            }

            // 3. Crear subset exclusivo para el elemento aislado con estilo Blueprint
            const THREE = window.THREE;
            const planes = this.activeClippingPlane ? [this.activeClippingPlane] : [];
            const isolatedMat = new THREE.MeshLambertMaterial({
                color: this.BLUEPRINT_CONFIG.bodyColor,
                polygonOffset: true,
                polygonOffsetFactor: 1,
                polygonOffsetUnits: 1,
                depthTest: true,
                clippingPlanes: planes,
                clipShadows: true,
                side: isSolid ? THREE.FrontSide : THREE.DoubleSide
            });

            try {
                this.isolatedSubset = this.ifcLoader.ifcManager.createSubset({
                    modelID: this.ifcModel.modelID,
                    ids: [expressId],
                    scene: this.scene,
                    material: isolatedMat,
                    removePrevious: true,
                    customID: 'active-isolated-subset'
                });

                if (this.isolatedSubset) {
                    this.isolatedSubset.renderOrder = 3;
                    if (this.isolatedSubset.parent !== this.scene) {
                        this.scene.add(this.isolatedSubset);
                    }
                    this._attachBlueprintDecorations(this.isolatedSubset, planes, isSolid);
                }
            } catch (err) {
                console.warn("IFCViewer3D: Error creando subset aislado:", err);
            }

            this.isIsolated = true;
            this.isolatedExpressId = expressId;

            // Sincronizar tapas macizas con el elemento aislado
            if (this.activeClippingPlane) {
                this._lastStencilKey = null;
                const axis = this.sectionConfig.active ? this.sectionConfig.axis : 'Y';
                const val = this.sectionConfig.active ? this.sectionConfig.value : 0;
                const inv = this.sectionConfig.active ? this.sectionConfig.inverted : false;
                this._updateSectionCaps(axis, val, inv);
            }

            // 4. Centrar y enfocar directamente en el elemento aislado sin superponer resaltado cian
            if (this.isolatedSubset && this.camera && this.controls) {
                const box = new THREE.Box3().setFromObject(this.isolatedSubset);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());

                if (!isNaN(center.x) && !isNaN(center.y) && !isNaN(center.z)) {
                    const maxDim = Math.max(size.x, size.y, size.z, 2.0);
                    if (this.currentCameraType === 'orthographic' && this.orthographicCamera) {
                        const dir = this.camera.position.clone().sub(this.controls.target).normalize();
                        if (dir.lengthSq() === 0) dir.set(0, 1, 0);
                        this.controls.target.copy(center);
                        this.camera.position.copy(center.clone().add(dir.multiplyScalar(maxDim * 3.0)));
                        this.camera.lookAt(center);
                        this.controls.update();
                    } else {
                        const fov = (this.perspectiveCamera ? this.perspectiveCamera.fov : 45) * (Math.PI / 180);
                        let cameraDist = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 2.2;
                        if (isNaN(cameraDist) || cameraDist < 4) cameraDist = 8;

                        const dir = this.camera.position.clone().sub(this.controls.target).normalize();
                        if (dir.lengthSq() === 0) dir.set(1, 1, 1).normalize();

                        this.camera.position.copy(center.clone().add(dir.multiplyScalar(cameraDist)));
                        this.camera.lookAt(center);
                        this.controls.target.copy(center);
                        this.controls.update();
                    }
                }
            }

            // 5. Ocultar menú contextual
            this.hideContextMenu();

            // 6. Actualizar barra de información
            const label = document.getElementById('v3dSelectedLabel');
            if (label) {
                const displayTitle = this._formatDisplayTitle(elemObj, expressId);
                label.textContent = `👁️‍🗨️ Elemento Aislado: ${displayTitle} (Pulsa 'Restaurar' para volver)`;
            }
        },

        /**
         * Oculta el elemento específico de la escena
         */
        hideElement: function (idOrGlobalId) {
            let expressId = this._resolveExpressId(idOrGlobalId) || this.selectedExpressId;
            if (!expressId || !this.ifcModel) return;

            this.hiddenElementIds.add(expressId);

            // Si estaba en modo aislado este elemento y se oculta, restaurar vista
            if (this.isIsolated && this.isolatedExpressId === expressId) {
                this.restoreView();
                return;
            }

            // Buscar categoría correspondiente y reconstruir sin este elemento
            let targetCatKey = null;
            for (const key in this.categorySubsets) {
                const cat = this.categorySubsets[key];
                if (cat && cat.ids && cat.ids.includes(expressId)) {
                    targetCatKey = key;
                    break;
                }
            }

            if (targetCatKey) {
                const cat = this.categorySubsets[targetCatKey];
                const remainingIds = cat.ids.filter(id => !this.hiddenElementIds.has(id));
                if (remainingIds.length === 0) {
                    cat.mesh.visible = false;
                } else {
                    this._rebuildCategorySubset(targetCatKey, remainingIds);
                }
            }

            // Deseleccionar si coincide con el elemento activo
            if (this.selectedExpressId === expressId) {
                this.resetHighlight();
            }

            this.hideContextMenu();

            const label = document.getElementById('v3dSelectedLabel');
            if (label) {
                label.textContent = `🚫 Elemento #${expressId} ocultado (${this.hiddenElementIds.size} ocultados · Pulsa 'Restaurar vista' para ver todo)`;
            }
        },

        /**
         * Reconstruye un subset de categoría filtrando IDs ocultos
         */
        _rebuildCategorySubset: function (catKey, remainingIds) {
            const cat = this.categorySubsets[catKey];
            if (!cat || !this.ifcModel || !this.ifcLoader || !this.ifcLoader.ifcManager) return;

            const THREE = window.THREE;
            const planes = this.activeClippingPlane ? [this.activeClippingPlane] : [];

            // Limpiar geometrías hijas previas (aristas y puntos)
            if (cat.mesh) {
                cat.mesh.traverse(child => {
                    if (child !== cat.mesh) {
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) {
                            if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                            else child.material.dispose();
                        }
                    }
                });
                while (cat.mesh.children.length > 0) {
                    cat.mesh.remove(cat.mesh.children[0]);
                }
            }

            try {
                const newSubset = this.ifcLoader.ifcManager.createSubset({
                    modelID: this.ifcModel.modelID,
                    ids: remainingIds,
                    scene: this.scene,
                    material: cat.material,
                    removePrevious: true,
                    customID: `cat_${catKey}`
                });

                if (newSubset) {
                    newSubset.renderOrder = 3;
                    cat.mesh = newSubset;
                    cat.mesh.visible = cat.visible;
                    const isSolid = this._isSolidCategory(cat.name, cat.key);
                    this._attachBlueprintDecorations(newSubset, planes, isSolid);
                }
            } catch (e) {
                console.warn(`IFCViewer3D: Error reconstruyendo subset ${catKey}:`, e);
            }
        },

        /**
         * Limpia el subset aislado activo
         */
        _clearIsolatedSubset: function () {
            if (this.isolatedSubset) {
                try {
                    if (this.ifcModel && this.ifcLoader && this.ifcLoader.ifcManager) {
                        this.ifcLoader.ifcManager.removeSubset(this.ifcModel.modelID, this.scene, 'active-isolated-subset');
                    }
                    this.isolatedSubset.traverse(child => {
                        if (child !== this.isolatedSubset) {
                            if (child.geometry && child.geometry !== this.isolatedSubset.geometry) child.geometry.dispose();
                            if (child.material) {
                                if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                                else child.material.dispose();
                            }
                        }
                    });
                    this.scene.remove(this.isolatedSubset);
                    if (this.isolatedSubset.geometry) this.isolatedSubset.geometry.dispose();
                    if (this.isolatedSubset.material) {
                        if (Array.isArray(this.isolatedSubset.material)) this.isolatedSubset.material.forEach(m => m.dispose());
                        else this.isolatedSubset.material.dispose();
                    }
                } catch (e) { }
                this.isolatedSubset = null;
            }
        },

        /**
         * Restaura la vista mostrando todo el modelo (cancela aislamientos y desoculta elementos)
         */
        restoreView: function () {
            // 1. Limpiar modo aislado y selección activa
            this._clearIsolatedSubset();
            this.isIsolated = false;
            this.isolatedExpressId = null;
            this.resetHighlight();

            // 2. Si había elementos individuales ocultados, reconstruir las categorías con sus IDs originales completos
            if (this.hiddenElementIds && this.hiddenElementIds.size > 0) {
                this.hiddenElementIds.clear();
                for (const catKey in this.categorySubsets) {
                    const cat = this.categorySubsets[catKey];
                    if (cat && cat.ids && cat.ids.length > 0) {
                        this._rebuildCategorySubset(catKey, cat.ids);
                    }
                }
            }

            // 3. Restaurar visibilidad de todas las categorías (manteniendo Espacios y Zonas desactivados por defecto)
            Object.keys(this.categorySubsets).forEach(k => {
                const cat = this.categorySubsets[k];
                if (cat && cat.mesh) {
                    const lower = (cat.name || '').toLowerCase();
                    const isSpace = lower.includes('espacio') || lower.includes('zona') || lower.includes('space') || lower.includes('zone');
                    const vis = !isSpace;
                    cat.visible = vis;
                    cat.mesh.visible = vis;
                    const chk = document.getElementById(`v3dCatChk_${k}`);
                    if (chk) chk.checked = vis;
                }
            });
            this._updateCategoriesBadge();

            // 4. Restaurar plano de corte completo
            const storeySelect = document.getElementById('v3dStoreySelect');
            if (storeySelect) storeySelect.value = 'all';
            this.disableSectionPlane(false);
            this.applyClippingPlane(null);

            // 5. Encuadrar vista completa en 3D
            this.setViewMode('3d');

            // 6. Ocultar menú contextual
            this.hideContextMenu();

            const label = document.getElementById('v3dSelectedLabel');
            if (label) {
                label.textContent = 'Vista restaurada: Mostrando todo el modelo';
            }
        }
    };

    window.IFCViewer3D = IFCViewer3D;

})(window);
