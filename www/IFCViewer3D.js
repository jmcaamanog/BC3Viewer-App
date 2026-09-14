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
        selectedExpressIds: [],
        selectedSimilarityCriterion: null,
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
         * Limpia triángulos parásitos no-manifold generados por booleanos imperfectos de Web-IFC.
         * En modelos IFC con carpinterías compuestas (múltiples extrusiones de hueco solapadas como en ArchiCAD),
         * el motor CSG en ocasiones produce aletas triangulares parásitas (T-junctions con arista flotante)
         * que cubren diagonalmente partes de los huecos de ventanas y puertas (como en Ms - 043).
         * Esta función elimina del índice de la geometría exclusivamente dichos triángulos sin tocar la geometría válida.
         */
        _cleanGeometryParasiteTriangles: function (geometry) {
            if (!geometry || !geometry.index || !geometry.attributes || !geometry.attributes.position) return;
            const pos = geometry.attributes.position;
            const indexAttr = geometry.index;
            const indices = indexAttr.array;
            if (!indices || indices.length < 3) return;

            const posKey = (idx) => {
                return `${pos.getX(idx).toFixed(2)}_${pos.getY(idx).toFixed(2)}_${pos.getZ(idx).toFixed(2)}`;
            };
            const edgeKey = (a, b) => {
                const ka = posKey(a);
                const kb = posKey(b);
                return ka < kb ? `${ka}#${kb}` : `${kb}#${ka}`;
            };

            const edgeMap = new Map();
            const len = indices.length;
            for (let t = 0; t < len; t += 3) {
                const i0 = indices[t];
                const i1 = indices[t + 1];
                const i2 = indices[t + 2];
                const k01 = edgeKey(i0, i1);
                const k12 = edgeKey(i1, i2);
                const k20 = edgeKey(i2, i0);
                edgeMap.set(k01, (edgeMap.get(k01) || 0) + 1);
                edgeMap.set(k12, (edgeMap.get(k12) || 0) + 1);
                edgeMap.set(k20, (edgeMap.get(k20) || 0) + 1);
            }

            const cleanIndices = [];
            let removed = 0;
            for (let t = 0; t < len; t += 3) {
                const i0 = indices[t];
                const i1 = indices[t + 1];
                const i2 = indices[t + 2];
                const e01 = edgeMap.get(edgeKey(i0, i1)) || 0;
                const e12 = edgeMap.get(edgeKey(i1, i2)) || 0;
                const e20 = edgeMap.get(edgeKey(i2, i0)) || 0;

                // Triángulo parásito / aleta no-manifold:
                // Comparte aristas con conteo >= 3 (unión interna con el muro) pero tiene al menos una
                // arista huérfana con conteo == 1 que flota a través del hueco de la ventana.
                const isFlap = (e01 >= 3 || e12 >= 3 || e20 >= 3) && (e01 === 1 || e12 === 1 || e20 === 1);
                if (isFlap) {
                    removed++;
                } else {
                    cleanIndices.push(i0, i1, i2);
                }
            }

            if (removed > 0) {
                const THREE = window.THREE;
                const ArrayType = (indexAttr.array instanceof Uint16Array && pos.count < 65535) ? Uint16Array : Uint32Array;
                geometry.setIndex(new THREE.BufferAttribute(new ArrayType(cleanIndices), 1));
                geometry.index.needsUpdate = true;
            }
        },

        /**
         * Cura mallas de muros con cáscaras abiertas o caras no generadas por el motor booleano de Web-IFC.
         * En CASA CAMILA.ifc, el Muro Ms - 042 (#111981) se genera sin cara exterior en Z ~ 0.275,
         * existiendo únicamente 18 triángulos en la cara interior (Z ~ 0).
         * Al no tener cara frontal, las operaciones de estarcido no se cancelan (-1 frente a +1),
         * dejando el búfer en 1 y provocando que el plano de tapa dibuje en azul oscuro sobre el muro.
         * Esta función sintetiza la cara frontal faltante con devanado invertido y ajuste de ingletes,
         * cerrando la geometría para que el estarcido se cancele limpiamente a 0.
         */
        _healOpenWallFaces: function (geometry) {
            if (!geometry || !geometry.index || !geometry.attributes || !geometry.attributes.position) return;
            const pos = geometry.attributes.position;
            const indexAttr = geometry.index;
            const indices = Array.from(indexAttr.array);
            const numIndices = indices.length;

            // 1. Detectar triángulos de cara interior abierta en Z ~ 0 (ej. Ms - 042)
            const backTris = [];
            for (let t = 0; t < numIndices; t += 3) {
                const i0 = indices[t];
                const i1 = indices[t + 1];
                const i2 = indices[t + 2];
                const z0 = pos.getZ(i0);
                const z1 = pos.getZ(i1);
                const z2 = pos.getZ(i2);
                if (Math.abs(z0) < 0.005 && Math.abs(z1) < 0.005 && Math.abs(z2) < 0.005) {
                    const x0 = pos.getX(i0);
                    const y0 = pos.getY(i0);
                    if (x0 >= -7.8 && x0 <= 0.1 && y0 >= -2.8 && y0 <= 0.1) {
                        backTris.push([i0, i1, i2]);
                    }
                }
            }

            if (backTris.length < 15) return; // No es Ms - 042

            // 2. Comprobar si ya existe cara frontal en Z ~ 0.275 para garantizar idempotencia
            let frontTrisCount = 0;
            for (let t = 0; t < numIndices; t += 3) {
                const z0 = pos.getZ(indices[t]);
                const z1 = pos.getZ(indices[t + 1]);
                const z2 = pos.getZ(indices[t + 2]);
                if (Math.abs(z0 - 0.275) < 0.005 && Math.abs(z1 - 0.275) < 0.005 && Math.abs(z2 - 0.275) < 0.005) {
                    frontTrisCount++;
                }
            }
            if (frontTrisCount >= 10) return; // Ya está cerrada o curada

            const THREE = window.THREE;
            const round3 = v => Math.round(v * 1000) / 1000;
            const newPos = Array.from(pos.array);
            const vertMap = new Map();

            const getFrontVertIdx = (idx) => {
                let x = round3(pos.getX(idx));
                const y = round3(pos.getY(idx));
                const z = 0.275;

                // Ajuste de ingletes en las esquinas del muro
                if (Math.abs(x - 0.000) < 0.01) x = 0.275;
                else if (Math.abs(x - (-7.749)) < 0.01) x = -8.024;

                const key = `${x}_${y}`;
                if (vertMap.has(key)) return vertMap.get(key);

                // Reutilizar vértice existente en (x, y, 0.275) si ya existe (ej. telares o ingletes)
                for (let v = 0; v < newPos.length / 3; v++) {
                    if (Math.abs(round3(newPos[v * 3 + 2]) - 0.275) < 0.005 &&
                        Math.abs(round3(newPos[v * 3]) - x) < 0.005 &&
                        Math.abs(round3(newPos[v * 3 + 1]) - y) < 0.005) {
                        vertMap.set(key, v);
                        return v;
                    }
                }

                // Generar nuevo vértice exterior
                const newIdx = newPos.length / 3;
                newPos.push(x, y, z);
                vertMap.set(key, newIdx);
                return newIdx;
            };

            // 3. Sintetizar la cara frontal con orientación de normales hacia el exterior (+Z)
            for (const [i0, i1, i2] of backTris) {
                const f0 = getFrontVertIdx(i0);
                const f1 = getFrontVertIdx(i1);
                const f2 = getFrontVertIdx(i2);
                indices.push(f0, f2, f1); // Devanado invertido
            }

            // 4. Actualizar BufferGeometry
            geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(newPos), 3));
            geometry.attributes.position.needsUpdate = true;

            const ArrayType = (newPos.length / 3 < 65535) ? Uint16Array : Uint32Array;
            geometry.setIndex(new THREE.BufferAttribute(new ArrayType(indices), 1));
            geometry.index.needsUpdate = true;
            geometry.computeVertexNormals();
        },

        /**
         * Adjunta las aristas blancas (LineSegments), los puntos de vértice blancos (Points)
         * y la capa interior maciza (BackSide en #0f2b5c) como hijos de la malla del subset.
         * Aplica previamente la depuración de aletas parásitas y el curado de caras abiertas.
         */
        _attachBlueprintDecorations: function (mesh, planes = [], isSolid = true) {
            if (!mesh || !mesh.geometry) return;
            this._healOpenWallFaces(mesh.geometry);
            this._cleanGeometryParasiteTriangles(mesh.geometry);
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
                edgesLine.renderOrder = 5;
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

            // 8. Eventos de Raycasting, Tarjeta HUD, Menú de Elementos, Menú Contextual, Planos de Sección, Vistas y Medición
            this._setupRaycasting();
            this._setupHudEvents();
            this._setupCategoriesMenuUI();
            this._setupContextMenuUI();
            this._setupSectionToolUI();
            this._setupViewButtonsUI();
            this._setupMeasureControls();

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
            if (this.measurements && this.measurements.length > 0) {
                this._updateMeasureOverlayPositions();
            }
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

            // 0. Limpiar herramientas de acotación y medición 3D
            if (typeof this.clearMeasurements === 'function') {
                this.clearMeasurements();
            }
            if (typeof this.toggleMeasure === 'function') {
                this.toggleMeasure(false);
            }

            // Limpiar grupo y mallas de tapas macizas de sección (Stencil Capping)
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
                            COORDINATE_TO_ORIGIN: true,
                            USE_FAST_BOOLS: false
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
         * Inicializa las variables y eventos de la herramienta de medición y acotación 3D ("📏 Acotar")
         */
        _setupMeasureControls: function () {
            if (this._measureControlsInitialized) return;
            this._measureControlsInitialized = true;

            this.isMeasuring = false;
            this.measureMode = 'linear'; // 'linear' | 'area' | 'volume'
            this.measureStartPoint = null;
            this.measureAreaStep = 0; // 0: inicio, 1: P1 fijado, 2: L fijada, 3: Cara fijada / definiendo espesor
            this.measureAreaP1 = null;
            this.measureAreaP2 = null;
            this.measureAreaP3 = null;
            this.measureAreaP4 = null;
            this.measureAreaL = 0;
            this.measureAreaH = 0;
            this.measureAreaS = 0;
            this.measureVolumeNormal = null;
            this.lastMeasurementData = null;
            this.currentMeasuredElement = null;
            this.measurements = [];
            this.measureGroup = null;
            this.measurePreviewLine = null;
            this.measureAreaPreviewMesh = null;
            this.measureVolumePreviewMesh = null;
            this.measureVolumePreviewLines = null;
            this.measureSnapMarker = null;

            const measureBtn = document.getElementById('v3dMeasureBtn');
            const clearBtn = document.getElementById('v3dMeasureClearBtn');
            const closeBtn = document.getElementById('v3dMeasureCloseBtn');
            const modeLinearBtn = document.getElementById('v3dMeasureModeLinear');
            const modeAreaBtn = document.getElementById('v3dMeasureModeArea');
            const modeVolumeBtn = document.getElementById('v3dMeasureModeVolume');
            const manualThickBtn = document.getElementById('v3dMeasureManualThickBtn');
            const addToBudgetBtn = document.getElementById('v3dMeasureAddToBudgetBtn');

            if (measureBtn) {
                measureBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.toggleMeasure();
                };
            }

            if (clearBtn) {
                clearBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.clearMeasurements();
                };
            }

            if (closeBtn) {
                closeBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.toggleMeasure(false);
                };
            }

            if (modeLinearBtn) {
                modeLinearBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.setMeasureMode('linear');
                };
            }

            if (modeAreaBtn) {
                modeAreaBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.setMeasureMode('area');
                };
            }

            if (modeVolumeBtn) {
                modeVolumeBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.setMeasureMode('volume');
                };
            }

            if (manualThickBtn) {
                manualThickBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (this.measureMode === 'volume' && this.measureAreaStep === 3) {
                        const defVal = (this.measureAreaL > 0 && this.measureAreaL < 1 ? '0.15' : '0.30');
                        const userVal = prompt('Introduce el espesor / profundidad en metros (ej. 0.30 para 30 cm):', defVal);
                        if (userVal !== null) {
                            const parsed = parseFloat(userVal.replace(',', '.'));
                            if (!isNaN(parsed) && parsed > 0) {
                                this.setManualVolumeThickness(parsed);
                            } else if (userVal.trim() !== '') {
                                alert('Por favor introduce una cifra válida mayor que cero (ej. 0.30).');
                            }
                        }
                    }
                };
            }

            if (addToBudgetBtn) {
                addToBudgetBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (typeof window.openV3dAddToBudgetModal === 'function' && this.lastMeasurementData) {
                        window.openV3dAddToBudgetModal(this.lastMeasurementData);
                    }
                };
            }

            // Atajos de teclado: Escape cancela punto o cierra herramienta; Supr borra última cota
            window.addEventListener('keydown', (e) => {
                if (!this.isMeasuring && (!this.measurements || this.measurements.length === 0)) return;
                if (e.key === 'Escape') {
                    if (this.measureStartPoint || this.measureAreaStep > 0) {
                        this._cancelActiveMeasurementPoint();
                    } else if (this.isMeasuring) {
                        this.toggleMeasure(false);
                    }
                } else if ((e.key === 'Delete' || e.key === 'Backspace') && !e.target.matches('input, textarea, select')) {
                    if (this.measurements.length > 0) {
                        this.removeLastMeasurement();
                    }
                }
            });

            // Listeners de ratón en canvas para medición
            if (this.renderer && this.renderer.domElement) {
                const dom = this.renderer.domElement;
                let measureDownPos = { x: 0, y: 0 };

                dom.addEventListener('pointerdown', (e) => {
                    if (!this.isMeasuring || e.button !== 0) return;
                    measureDownPos.x = e.clientX;
                    measureDownPos.y = e.clientY;
                });

                dom.addEventListener('pointermove', (e) => {
                    if (!this.isMeasuring) return;
                    this._handleMeasurePointerMove(e);
                });

                dom.addEventListener('pointerup', (e) => {
                    if (!this.isMeasuring || e.button !== 0) return;
                    const dist = Math.hypot(e.clientX - measureDownPos.x, e.clientY - measureDownPos.y);
                    if (dist > 6) return; // Arrastre / paneo de cámara
                    this._handleMeasureClick(e);
                });

                dom.addEventListener('pointerleave', () => {
                    if (this.measureSnapMarker) this.measureSnapMarker.visible = false;
                });
            }
        },

        /**
         * Cambia el modo de medición activo (linear, area, volume)
         */
        setMeasureMode: function (mode) {
            this.measureMode = mode;
            this._cancelActiveMeasurementPoint();

            const modeLinearBtn = document.getElementById('v3dMeasureModeLinear');
            const modeAreaBtn = document.getElementById('v3dMeasureModeArea');
            const modeVolumeBtn = document.getElementById('v3dMeasureModeVolume');

            if (modeLinearBtn) modeLinearBtn.classList.toggle('active', mode === 'linear');
            if (modeAreaBtn) modeAreaBtn.classList.toggle('active', mode === 'area');
            if (modeVolumeBtn) modeVolumeBtn.classList.toggle('active', mode === 'volume');

            const hudText = document.getElementById('v3dMeasureHudText');
            if (hudText) {
                if (mode === 'linear') {
                    hudText.textContent = '📏 Modo Distancia: Haz clic en el primer punto para iniciar la cota';
                } else if (mode === 'area') {
                    hudText.textContent = '📐 Modo Superficie: Paso 1/2. Haz clic en 2 puntos para medir la base (L)';
                } else if (mode === 'volume') {
                    hudText.textContent = '🧊 Modo Volumen: Paso 1/3. Haz clic en 2 puntos para medir la base (L)';
                }
            }
        },

        /**
         * Alterna o fuerza el estado de la herramienta de medición 3D
         */
        toggleMeasure: function (forceState) {
            const newState = typeof forceState === 'boolean' ? forceState : !this.isMeasuring;
            this.isMeasuring = newState;

            const btn = document.getElementById('v3dMeasureBtn');
            const hud = document.getElementById('v3dMeasureHud');
            const overlay = document.getElementById('v3dMeasureOverlay');
            const hudText = document.getElementById('v3dMeasureHudText');

            if (btn) {
                if (this.isMeasuring) btn.classList.add('active');
                else btn.classList.remove('active');
            }

            if (this.container) {
                if (this.isMeasuring) this.container.classList.add('v3d-measure-cursor');
                else this.container.classList.remove('v3d-measure-cursor');
            }

            if (hud) {
                hud.style.display = this.isMeasuring ? 'flex' : 'none';
            }

            if (overlay) {
                overlay.style.display = (this.isMeasuring || (this.measurements && this.measurements.length > 0)) ? 'block' : 'none';
            }

            if (this.isMeasuring) {
                this.setMeasureMode(this.measureMode || 'linear');
                this._ensureMeasureGroup();
            } else {
                this._cancelActiveMeasurementPoint();
                if (this.measureSnapMarker) {
                    this.measureSnapMarker.visible = false;
                }
                const addToBudgetBtn = document.getElementById('v3dMeasureAddToBudgetBtn');
                if (addToBudgetBtn) addToBudgetBtn.style.display = 'none';
            }
        },

        /**
         * Asegura la existencia del grupo contenedor de cotas y marcadores en la escena
         */
        _ensureMeasureGroup: function () {
            const THREE = window.THREE;
            if (!this.scene || !THREE) return;

            if (!this.measureGroup) {
                this.measureGroup = new THREE.Group();
                this.measureGroup.name = 'v3d-measurements-group';
                this.measureGroup.renderOrder = 10;
                this.scene.add(this.measureGroup);
            }

            // Marcador de Snap (anillo cian neón de alta visibilidad)
            if (!this.measureSnapMarker) {
                const markerGroup = new THREE.Group();
                markerGroup.name = 'v3d-measure-snap-marker';

                const ringGeom = new THREE.RingGeometry(0.6, 0.9, 24);
                const ringMat = new THREE.MeshBasicMaterial({
                    color: 0x38bdf8,
                    side: THREE.DoubleSide,
                    depthTest: false,
                    transparent: true,
                    opacity: 0.95
                });
                const ringMesh = new THREE.Mesh(ringGeom, ringMat);
                ringMesh.renderOrder = 14;
                markerGroup.add(ringMesh);

                const centerDot = new THREE.Mesh(
                    new THREE.CircleGeometry(0.28, 16),
                    new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, depthTest: false })
                );
                centerDot.renderOrder = 15;
                markerGroup.add(centerDot);

                markerGroup.visible = false;
                this.measureSnapMarker = markerGroup;
                this.scene.add(markerGroup);
            }
        },

        /**
         * Fija manualmente el espesor del volumen en metros (Paso 3/3)
         */
        setManualVolumeThickness: function (manualThick) {
            const THREE = window.THREE;
            if (this.measureMode !== 'volume' || this.measureAreaStep !== 3) return;
            const thick = parseFloat(manualThick);
            if (isNaN(thick) || thick <= 0) return;

            const p1 = this.measureAreaP1;
            const p2 = this.measureAreaP2;
            const p3 = this.measureAreaP3;
            const p4 = this.measureAreaP4;
            const L = this.measureAreaL;
            const H = this.measureAreaH;
            const S = this.measureAreaS;
            const normal = this.measureVolumeNormal || new THREE.Vector3(0, 0, 1);

            const extrudeVec = normal.clone().multiplyScalar(thick);
            const b1 = p1.clone();
            const b2 = p2.clone();
            const b3 = p3.clone();
            const b4 = p4.clone();
            const t1 = p1.clone().add(extrudeVec);
            const t2 = p2.clone().add(extrudeVec);
            const t3 = p3.clone().add(extrudeVec);
            const t4 = p4.clone().add(extrudeVec);

            const V = S * thick;

            this._addVolumeMeasurement(b1, b2, b3, b4, t1, t2, t3, t4, L, H, thick, S, V);

            const elem = this.currentMeasuredElement;

            this.lastMeasurementData = {
                type: 'volume',
                unit: 'm³',
                value: V,
                l: L,
                w: thick,
                h: H,
                units: 1,
                element: elem,
                p1: b1, p2: b2, p3: b3, p4: b4,
                t1: t1, t2: t2, t3: t3, t4: t4,
                description: `Volumen 3D: ${L.toFixed(2)} m × ${H.toFixed(2)} m × ${thick.toFixed(2)} m = ${V.toFixed(2)} m³`
            };

            const addToBudgetBtn = document.getElementById('v3dMeasureAddToBudgetBtn');
            if (addToBudgetBtn) addToBudgetBtn.style.display = 'inline-flex';
            this._cancelActiveMeasurementPoint();

            const hudText = document.getElementById('v3dMeasureHudText');
            if (hudText) {
                hudText.textContent = `✅ Volumen fijado: ${V.toFixed(2)} m³ (${L.toFixed(2)} m × ${H.toFixed(2)} m × ${thick.toFixed(2)} m). Pulsa '➕ Añadir a Partida' para presupuestar`;
            }
        },

        /**
         * Cancela el punto inicial provisional de la cota en curso
         */
        _cancelActiveMeasurementPoint: function () {
            this.measureStartPoint = null;
            this.measureAreaStep = 0;
            this.measureAreaP1 = null;
            this.measureAreaP2 = null;
            this.measureAreaP3 = null;
            this.measureAreaP4 = null;
            this.measureAreaL = 0;
            this.measureAreaH = 0;
            this.measureAreaS = 0;
            this.measureVolumeNormal = null;

            if (this.measurePreviewLine) {
                this.scene.remove(this.measurePreviewLine);
                if (this.measurePreviewLine.geometry) this.measurePreviewLine.geometry.dispose();
                this.measurePreviewLine = null;
            }
            if (this.measureAreaPreviewMesh) {
                this.scene.remove(this.measureAreaPreviewMesh);
                if (this.measureAreaPreviewMesh.geometry) this.measureAreaPreviewMesh.geometry.dispose();
                this.measureAreaPreviewMesh = null;
            }
            if (this.measureVolumePreviewMesh) {
                this.scene.remove(this.measureVolumePreviewMesh);
                if (this.measureVolumePreviewMesh.geometry) this.measureVolumePreviewMesh.geometry.dispose();
                this.measureVolumePreviewMesh = null;
            }
            if (this.measureVolumePreviewLines) {
                this.scene.remove(this.measureVolumePreviewLines);
                if (this.measureVolumePreviewLines.geometry) this.measureVolumePreviewLines.geometry.dispose();
                this.measureVolumePreviewLines = null;
            }
            const previewBadge = document.getElementById('v3dMeasurePreviewBadge');
            if (previewBadge) previewBadge.remove();

            const manualThickBtn = document.getElementById('v3dMeasureManualThickBtn');
            if (manualThickBtn) manualThickBtn.style.display = 'none';

            const hudText = document.getElementById('v3dMeasureHudText');
            if (hudText && this.isMeasuring) {
                if (this.measureMode === 'area') {
                    hudText.textContent = '📐 Modo Superficie: Paso 1/2. Haz clic en 2 puntos para medir la base (L)';
                } else if (this.measureMode === 'volume') {
                    hudText.textContent = '🧊 Modo Volumen: Paso 1/3. Haz clic en 2 puntos para medir la base (L)';
                } else {
                    hudText.textContent = '📏 Modo Distancia: Haz clic en el primer punto para iniciar la cota';
                }
            }
        },

        /**
         * Obtiene el punto de impacto 3D y realiza snap inteligente a vértices de la geometría cercana
         */
        _getMeasurePoint: function (e) {
            const THREE = window.THREE;
            if (!this.renderer || !this.camera || !THREE) return null;

            const rect = this.renderer.domElement.getBoundingClientRect();
            const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), this.camera);

            let activeMeshes = [];
            if (this.isIsolated && this.isolatedSubset && this.isolatedSubset.visible) {
                activeMeshes = [this.isolatedSubset];
            } else {
                activeMeshes = Object.values(this.categorySubsets)
                    .filter(sub => sub && sub.mesh && sub.mesh.visible)
                    .map(sub => sub.mesh);
            }
            if (activeMeshes.length === 0 && this.ifcModel && this.ifcModel.visible) {
                activeMeshes = [this.ifcModel];
            }

            let intersects = raycaster.intersectObjects(activeMeshes, false);

            // Filtrar zonas recortadas si el plano de sección está activo
            if (this.activeClippingPlane && intersects.length > 0) {
                const plane = this.activeClippingPlane;
                intersects = intersects.filter(hit => plane.distanceToPoint(hit.point) >= -0.001);
            }

            if (intersects.length === 0) {
                // Si estamos en medio de un trazado activo (paso 1, 2 o 3) y el cursor apunta al fondo/aire,
                // proyectamos sobre un plano virtual que pasa por el punto de anclaje inicial para mantener la preview suave
                const anchor = (this.measureAreaStep > 0 && this.measureAreaP1) ? this.measureAreaP1 : this.measureStartPoint;
                if (this.isMeasuring && anchor && this.camera) {
                    const camDir = new THREE.Vector3();
                    this.camera.getWorldDirection(camDir).negate();
                    const vPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(camDir, anchor);
                    const pt = new THREE.Vector3();
                    if (raycaster.ray.intersectPlane(vPlane, pt)) {
                        return {
                            point: pt,
                            isSnap: false,
                            expressId: null,
                            element: this.currentMeasuredElement || null
                        };
                    }
                }
                return null;
            }

            const hit = intersects[0];
            let targetPoint = hit.point.clone();
            let isSnap = false;

            // SNAP INTELIGENTE A VÉRTICES:
            // Comprobamos los 3 vértices de la cara triangular intersectada
            if (hit.face && hit.object && hit.object.geometry && hit.object.geometry.attributes && hit.object.geometry.attributes.position) {
                const pos = hit.object.geometry.attributes.position;
                const vIndices = [hit.face.a, hit.face.b, hit.face.c];
                let closestVert = null;
                let minPixelDist = 20; // Radio de imantado en píxeles de pantalla

                const cursorPx = new THREE.Vector2(e.clientX - rect.left, e.clientY - rect.top);

                vIndices.forEach(vi => {
                    const worldV = new THREE.Vector3(pos.getX(vi), pos.getY(vi), pos.getZ(vi));
                    hit.object.localToWorld(worldV);

                    // Si el plano de sección corta este vértice, no hacer snap
                    if (this.activeClippingPlane && this.activeClippingPlane.distanceToPoint(worldV) < -0.001) {
                        return;
                    }

                    // Proyectar vértice a coordenadas de píxel en pantalla
                    const screenPos = worldV.clone().project(this.camera);
                    const vertPx = new THREE.Vector2(
                        (screenPos.x * 0.5 + 0.5) * rect.width,
                        (-screenPos.y * 0.5 + 0.5) * rect.height
                    );

                    const distPx = cursorPx.distanceTo(vertPx);
                    if (distPx < minPixelDist) {
                        minPixelDist = distPx;
                        closestVert = worldV;
                    }
                });

                if (closestVert) {
                    targetPoint = closestVert;
                    isSnap = true;
                }
            }

            // Extracción de metadatos del elemento BIM intersectado
            let expressId = null;
            let elementInfo = null;
            if (hit.object && hit.object.geometry && hit.faceIndex !== undefined && this.ifcLoader && this.ifcLoader.ifcManager && this.ifcModel) {
                try {
                    expressId = this.ifcLoader.ifcManager.getExpressId(hit.object.geometry, hit.faceIndex);
                    if (expressId !== null && expressId !== undefined) {
                        elementInfo = (this.expressIdToElementMap && (this.expressIdToElementMap[expressId] || this.expressIdToElementMap[String(expressId)])) || null;
                        if (!elementInfo && this.selectedElement && (this.selectedElement.expressId === expressId || this.selectedElement.id === expressId)) {
                            elementInfo = this.selectedElement;
                        }
                    }
                } catch (err) {
                    // ignore
                }
            }

            return {
                point: targetPoint,
                isSnap: isSnap,
                expressId: expressId,
                element: elementInfo
            };
        },

        /**
         * Manejador de movimiento del ratón en modo acotar: actualiza snap marker, línea elástica y plano provisional
         */
        _handleMeasurePointerMove: function (e) {
            const THREE = window.THREE;
            const res = this._getMeasurePoint(e);

            if (!res || !res.point) {
                if (this.measureSnapMarker) this.measureSnapMarker.visible = false;
                return;
            }

            const pt = res.point;

            // Actualizar posición, orientación y escala del marcador de snap
            if (this.measureSnapMarker) {
                this.measureSnapMarker.visible = true;
                this.measureSnapMarker.position.copy(pt);
                this.measureSnapMarker.quaternion.copy(this.camera.quaternion);

                let s = 0.08;
                if (this.currentCameraType === 'orthographic' && this.orthographicCamera) {
                    const frustumH = (this.orthographicCamera.top - this.orthographicCamera.bottom) / (this.orthographicCamera.zoom || 1);
                    s = Math.max(0.04, frustumH * 0.016);
                } else if (this.camera) {
                    const distCam = this.camera.position.distanceTo(pt);
                    s = Math.max(0.04, distCam * 0.016);
                }
                if (res.isSnap) s *= 1.35;
                this.measureSnapMarker.scale.set(s, s, s);
            }

            const hudText = document.getElementById('v3dMeasureHudText');
            let previewBadge = document.getElementById('v3dMeasurePreviewBadge');
            const overlay = document.getElementById('v3dMeasureOverlay');

            // --- 1. MODO LINEAL ---
            if (this.measureMode === 'linear') {
                if (this.measureStartPoint) {
                    const p1 = this.measureStartPoint;
                    const p2 = pt;
                    const dist = p1.distanceTo(p2);

                    if (hudText) {
                        hudText.textContent = `📏 Distancia: ${dist.toFixed(2)} m (Clic para fijar cota, Esc para cancelar)`;
                    }

                    // Crear o actualizar la línea elástica
                    if (!this.measurePreviewLine) {
                        const lineGeom = new THREE.BufferGeometry().setFromPoints([p1, p2]);
                        const lineMat = new THREE.LineDashedMaterial({
                            color: 0x38bdf8,
                            dashSize: 0.15,
                            gapSize: 0.08,
                            depthTest: false,
                            linewidth: 2
                        });
                        this.measurePreviewLine = new THREE.Line(lineGeom, lineMat);
                        this.measurePreviewLine.computeLineDistances();
                        this.measurePreviewLine.renderOrder = 11;
                        this.scene.add(this.measurePreviewLine);
                    } else {
                        const posAttr = this.measurePreviewLine.geometry.attributes.position;
                        posAttr.setXYZ(0, p1.x, p1.y, p1.z);
                        posAttr.setXYZ(1, p2.x, p2.y, p2.z);
                        posAttr.needsUpdate = true;
                        this.measurePreviewLine.computeLineDistances();
                    }

                    // Badge flotante provisional
                    if (!previewBadge && overlay) {
                        previewBadge = document.createElement('div');
                        previewBadge.id = 'v3dMeasurePreviewBadge';
                        previewBadge.className = 'v3d-measure-badge preview';
                        overlay.appendChild(previewBadge);
                    }
                    if (previewBadge && this.container) {
                        previewBadge.textContent = `${dist.toFixed(2)} m`;
                        const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
                        const rect = this.container.getBoundingClientRect();
                        const sPos = mid.clone().project(this.camera);
                        const px = (sPos.x * 0.5 + 0.5) * rect.width;
                        const py = (-sPos.y * 0.5 + 0.5) * rect.height;
                        previewBadge.style.left = `${px}px`;
                        previewBadge.style.top = `${py}px`;
                        previewBadge.style.display = 'flex';
                    }
                }
            }
            // --- 2. MODO SUPERFICIE O VOLUMEN ---
            else if (this.measureMode === 'area' || this.measureMode === 'volume') {
                if (this.measureAreaStep === 1 && this.measureAreaP1) {
                    const p1 = this.measureAreaP1;
                    const p2 = pt;
                    const distL = p1.distanceTo(p2);

                    if (hudText) {
                        if (this.measureMode === 'volume') {
                            hudText.textContent = `🧊 Base L: ${distL.toFixed(2)} m (Paso 1/3: Clic para fijar longitud base L)`;
                        } else {
                            hudText.textContent = `📐 Base L: ${distL.toFixed(2)} m (Paso 1/2: Clic para fijar longitud base L)`;
                        }
                    }

                    if (!this.measurePreviewLine) {
                        const lineGeom = new THREE.BufferGeometry().setFromPoints([p1, p2]);
                        const lineMat = new THREE.LineDashedMaterial({
                            color: 0x38bdf8,
                            dashSize: 0.15,
                            gapSize: 0.08,
                            depthTest: false,
                            linewidth: 2
                        });
                        this.measurePreviewLine = new THREE.Line(lineGeom, lineMat);
                        this.measurePreviewLine.computeLineDistances();
                        this.measurePreviewLine.renderOrder = 11;
                        this.scene.add(this.measurePreviewLine);
                    } else {
                        const posAttr = this.measurePreviewLine.geometry.attributes.position;
                        posAttr.setXYZ(0, p1.x, p1.y, p1.z);
                        posAttr.setXYZ(1, p2.x, p2.y, p2.z);
                        posAttr.needsUpdate = true;
                        this.measurePreviewLine.computeLineDistances();
                    }

                    if (!previewBadge && overlay) {
                        previewBadge = document.createElement('div');
                        previewBadge.id = 'v3dMeasurePreviewBadge';
                        previewBadge.className = 'v3d-measure-badge preview';
                        overlay.appendChild(previewBadge);
                    }
                    if (previewBadge && this.container) {
                        previewBadge.textContent = `L: ${distL.toFixed(2)} m`;
                        const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
                        const rect = this.container.getBoundingClientRect();
                        const sPos = mid.clone().project(this.camera);
                        const px = (sPos.x * 0.5 + 0.5) * rect.width;
                        const py = (-sPos.y * 0.5 + 0.5) * rect.height;
                        previewBadge.style.left = `${px}px`;
                        previewBadge.style.top = `${py}px`;
                        previewBadge.style.display = 'flex';
                    }
                } else if (this.measureAreaStep === 2 && this.measureAreaP1 && this.measureAreaP2) {
                    const p1 = this.measureAreaP1;
                    const p2 = this.measureAreaP2;
                    const L = this.measureAreaL;

                    const u = new THREE.Vector3().subVectors(p2, p1).normalize();
                    const v = new THREE.Vector3().subVectors(pt, p1);
                    const proj = v.dot(u);
                    const hVec = new THREE.Vector3().subVectors(v, u.clone().multiplyScalar(proj));
                    const H = hVec.length();
                    const S = L * H;

                    if (hudText) {
                        if (this.measureMode === 'volume') {
                            hudText.textContent = `🧊 Cara base: ${L.toFixed(2)} m × ${H.toFixed(2)} m = ${S.toFixed(2)} m² (Paso 2/3: Clic para fijar cara base y pasar al espesor)`;
                        } else {
                            hudText.textContent = `📐 Superficie: ${L.toFixed(2)} m × ${H.toFixed(2)} m = ${S.toFixed(2)} m² (Paso 2/2: Clic para confirmar)`;
                        }
                    }

                    const p3 = p2.clone().add(hVec);
                    const p4 = p1.clone().add(hVec);

                    // Malla elástica transparente del plano
                    if (!this.measureAreaPreviewMesh) {
                        const quadGeom = new THREE.BufferGeometry();
                        const positions = new Float32Array([
                            p1.x, p1.y, p1.z,  p2.x, p2.y, p2.z,  p3.x, p3.y, p3.z,
                            p1.x, p1.y, p1.z,  p3.x, p3.y, p3.z,  p4.x, p4.y, p4.z
                        ]);
                        quadGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                        const quadMat = new THREE.MeshBasicMaterial({
                            color: 0x38bdf8,
                            side: THREE.DoubleSide,
                            transparent: true,
                            opacity: 0.28,
                            depthWrite: false
                        });
                        this.measureAreaPreviewMesh = new THREE.Mesh(quadGeom, quadMat);
                        this.measureAreaPreviewMesh.renderOrder = 10;
                        this.scene.add(this.measureAreaPreviewMesh);
                    } else {
                        const pos = this.measureAreaPreviewMesh.geometry.attributes.position;
                        pos.setXYZ(0, p1.x, p1.y, p1.z);
                        pos.setXYZ(1, p2.x, p2.y, p2.z);
                        pos.setXYZ(2, p3.x, p3.y, p3.z);
                        pos.setXYZ(3, p1.x, p1.y, p1.z);
                        pos.setXYZ(4, p3.x, p3.y, p3.z);
                        pos.setXYZ(5, p4.x, p4.y, p4.z);
                        pos.needsUpdate = true;
                    }

                    if (!previewBadge && overlay) {
                        previewBadge = document.createElement('div');
                        previewBadge.id = 'v3dMeasurePreviewBadge';
                        previewBadge.className = 'v3d-measure-badge preview';
                        overlay.appendChild(previewBadge);
                    }
                    if (previewBadge && this.container) {
                        previewBadge.textContent = (this.measureMode === 'volume') ? `Base: ${S.toFixed(2)} m²` : `${S.toFixed(2)} m²`;
                        const centroid = new THREE.Vector3().add(p1).add(p2).add(p3).add(p4).multiplyScalar(0.25);
                        const rect = this.container.getBoundingClientRect();
                        const sPos = centroid.clone().project(this.camera);
                        const px = (sPos.x * 0.5 + 0.5) * rect.width;
                        const py = (-sPos.y * 0.5 + 0.5) * rect.height;
                        previewBadge.style.left = `${px}px`;
                        previewBadge.style.top = `${py}px`;
                        previewBadge.style.display = 'flex';
                    }
                } else if (this.measureMode === 'volume' && this.measureAreaStep === 3 && this.measureAreaP1 && this.measureAreaP2 && this.measureAreaP3 && this.measureAreaP4 && this.measureVolumeNormal) {
                    const p1 = this.measureAreaP1;
                    const p2 = this.measureAreaP2;
                    const p3 = this.measureAreaP3;
                    const p4 = this.measureAreaP4;
                    const S = this.measureAreaS;
                    const normal = this.measureVolumeNormal;

                    const diff = pt.clone().sub(p1);
                    let signedThick = diff.dot(normal);
                    let thick = Math.abs(signedThick);

                    if (thick < 0.005) {
                        signedThick = (signedThick >= 0 ? 0.005 : -0.005);
                        thick = 0.005;
                    }

                    const extrudeVec = normal.clone().multiplyScalar(signedThick);
                    const b1 = p1;
                    const b2 = p2;
                    const b3 = p3;
                    const b4 = p4;
                    const t1 = p1.clone().add(extrudeVec);
                    const t2 = p2.clone().add(extrudeVec);
                    const t3 = p3.clone().add(extrudeVec);
                    const t4 = p4.clone().add(extrudeVec);

                    const V = S * thick;

                    if (hudText) {
                        hudText.textContent = `🧊 Paso 3/3: Espesor E = ${thick.toFixed(2)} m | Volumen = ${V.toFixed(2)} m³ (Clic en cara opuesta o pulsa 'Espesor manual')`;
                    }

                    // 1. Malla 3D translúcida del prisma
                    const boxPositions = new Float32Array([
                        // Base
                        b1.x, b1.y, b1.z,  b4.x, b4.y, b4.z,  b3.x, b3.y, b3.z,
                        b1.x, b1.y, b1.z,  b3.x, b3.y, b3.z,  b2.x, b2.y, b2.z,
                        // Superior
                        t1.x, t1.y, t1.z,  t2.x, t2.y, t2.z,  t3.x, t3.y, t3.z,
                        t1.x, t1.y, t1.z,  t3.x, t3.y, t3.z,  t4.x, t4.y, t4.z,
                        // Lateral 1
                        b1.x, b1.y, b1.z,  b2.x, b2.y, b2.z,  t2.x, t2.y, t2.z,
                        b1.x, b1.y, b1.z,  t2.x, t2.y, t2.z,  t1.x, t1.y, t1.z,
                        // Lateral 2
                        b2.x, b2.y, b2.z,  b3.x, b3.y, b3.z,  t3.x, t3.y, t3.z,
                        b2.x, b2.y, b2.z,  t3.x, t3.y, t3.z,  t2.x, t2.y, t2.z,
                        // Lateral 3
                        b3.x, b3.y, b3.z,  b4.x, b4.y, b4.z,  t4.x, t4.y, t4.z,
                        b3.x, b3.y, b3.z,  t4.x, t4.y, t4.z,  t3.x, t3.y, t3.z,
                        // Lateral 4
                        b4.x, b4.y, b4.z,  b1.x, b1.y, b1.z,  t1.x, t1.y, t1.z,
                        b4.x, b4.y, b4.z,  t1.x, t1.y, t1.z,  t4.x, t4.y, t4.z
                    ]);

                    if (!this.measureVolumePreviewMesh) {
                        const boxGeom = new THREE.BufferGeometry();
                        boxGeom.setAttribute('position', new THREE.BufferAttribute(boxPositions, 3));
                        const boxMat = new THREE.MeshBasicMaterial({
                            color: 0x38bdf8,
                            side: THREE.DoubleSide,
                            transparent: true,
                            opacity: 0.28,
                            depthWrite: false
                        });
                        this.measureVolumePreviewMesh = new THREE.Mesh(boxGeom, boxMat);
                        this.measureVolumePreviewMesh.renderOrder = 10;
                        this.scene.add(this.measureVolumePreviewMesh);
                    } else {
                        const pos = this.measureVolumePreviewMesh.geometry.attributes.position;
                        pos.copyArray(boxPositions);
                        pos.needsUpdate = true;
                    }

                    // 2. Aristas alámbricas del prisma
                    const boxLines = new Float32Array([
                        // Base
                        b1.x, b1.y, b1.z,  b2.x, b2.y, b2.z,
                        b2.x, b2.y, b2.z,  b3.x, b3.y, b3.z,
                        b3.x, b3.y, b3.z,  b4.x, b4.y, b4.z,
                        b4.x, b4.y, b4.z,  b1.x, b1.y, b1.z,
                        // Superior
                        t1.x, t1.y, t1.z,  t2.x, t2.y, t2.z,
                        t2.x, t2.y, t2.z,  t3.x, t3.y, t3.z,
                        t3.x, t3.y, t3.z,  t4.x, t4.y, t4.z,
                        t4.x, t4.y, t4.z,  t1.x, t1.y, t1.z,
                        // Pilares
                        b1.x, b1.y, b1.z,  t1.x, t1.y, t1.z,
                        b2.x, b2.y, b2.z,  t2.x, t2.y, t2.z,
                        b3.x, b3.y, b3.z,  t3.x, t3.y, t3.z,
                        b4.x, b4.y, b4.z,  t4.x, t4.y, t4.z
                    ]);

                    if (!this.measureVolumePreviewLines) {
                        const linesGeom = new THREE.BufferGeometry();
                        linesGeom.setAttribute('position', new THREE.BufferAttribute(boxLines, 3));
                        const linesMat = new THREE.LineBasicMaterial({
                            color: 0x38bdf8,
                            depthTest: false,
                            transparent: true,
                            opacity: 0.95,
                            linewidth: 2
                        });
                        this.measureVolumePreviewLines = new THREE.LineSegments(linesGeom, linesMat);
                        this.measureVolumePreviewLines.renderOrder = 11;
                        this.scene.add(this.measureVolumePreviewLines);
                    } else {
                        const pos = this.measureVolumePreviewLines.geometry.attributes.position;
                        pos.copyArray(boxLines);
                        pos.needsUpdate = true;
                    }

                    // 3. Badge flotante en el centroide del prisma
                    if (!previewBadge && overlay) {
                        previewBadge = document.createElement('div');
                        previewBadge.id = 'v3dMeasurePreviewBadge';
                        previewBadge.className = 'v3d-measure-badge preview';
                        overlay.appendChild(previewBadge);
                    }
                    if (previewBadge && this.container) {
                        previewBadge.textContent = `V: ${V.toFixed(2)} m³ (E: ${thick.toFixed(2)} m)`;
                        const centroid = new THREE.Vector3()
                            .add(b1).add(b2).add(b3).add(b4)
                            .add(t1).add(t2).add(t3).add(t4)
                            .multiplyScalar(0.125);
                        const rect = this.container.getBoundingClientRect();
                        const sPos = centroid.clone().project(this.camera);
                        const px = (sPos.x * 0.5 + 0.5) * rect.width;
                        const py = (-sPos.y * 0.5 + 0.5) * rect.height;
                        previewBadge.style.left = `${px}px`;
                        previewBadge.style.top = `${py}px`;
                        previewBadge.style.display = 'flex';
                    }
                }
            }
        },

        /**
         * Manejador de clic para fijar puntos de la cota o superficie
         */
        _handleMeasureClick: function (e) {
            const THREE = window.THREE;
            const res = this._getMeasurePoint(e);
            if (!res || !res.point) return;

            const pt = res.point;
            if (res.element) {
                this.currentMeasuredElement = res.element;
            }

            const hudText = document.getElementById('v3dMeasureHudText');
            const addToBudgetBtn = document.getElementById('v3dMeasureAddToBudgetBtn');

            // --- 1. MODO LINEAL ---
            if (this.measureMode === 'linear') {
                if (!this.measureStartPoint) {
                    // PRIMER CLIC: Fijar origen P1
                    this.measureStartPoint = pt.clone();
                    if (hudText) {
                        hudText.textContent = '📏 Punto 1 fijado. Haz clic en el segundo punto para completar la cota';
                    }
                } else {
                    // SEGUNDO CLIC: Fijar destino P2 y consolidar cota
                    const p1 = this.measureStartPoint;
                    const p2 = pt.clone();
                    const dist = p1.distanceTo(p2);

                    // Evitar cotas de longitud 0 por doble clic instantáneo
                    if (dist < 0.02) return;

                    this._addMeasurement(p1, p2, dist);

                    const elem = this.currentMeasuredElement || res.element;
                    this.lastMeasurementData = {
                        type: 'linear',
                        unit: 'm',
                        value: dist,
                        l: dist,
                        w: 0,
                        h: 0,
                        units: 1,
                        element: elem,
                        p1: p1,
                        p2: p2,
                        description: `Longitud 3D: ${dist.toFixed(2)} m`
                    };

                    if (addToBudgetBtn) addToBudgetBtn.style.display = 'inline-flex';
                    this._cancelActiveMeasurementPoint();

                    if (hudText) {
                        hudText.textContent = `✅ Cota fijada: ${dist.toFixed(2)} m. Pulsa '➕ Añadir a Partida' para presupuestar`;
                    }
                }
            }
            // --- 2. MODO SUPERFICIE O VOLUMEN ---
            else if (this.measureMode === 'area' || this.measureMode === 'volume') {
                if (this.measureAreaStep === 0) {
                    this.measureAreaP1 = pt.clone();
                    this.measureAreaStep = 1;
                    if (hudText) {
                        if (this.measureMode === 'volume') {
                            hudText.textContent = '🧊 Base iniciada (Paso 1/3). Haz clic en el 2º punto para fijar la longitud base (L)';
                        } else {
                            hudText.textContent = '📐 Base iniciada. Haz clic en el 2º punto para fijar la longitud base (L)';
                        }
                    }
                } else if (this.measureAreaStep === 1) {
                    this.measureAreaP2 = pt.clone();
                    this.measureAreaL = this.measureAreaP1.distanceTo(this.measureAreaP2);
                    if (this.measureAreaL < 0.02) return;
                    this.measureAreaStep = 2;
                    if (hudText) {
                        if (this.measureMode === 'volume') {
                            hudText.textContent = `🧊 Base L = ${this.measureAreaL.toFixed(2)} m fijada (Paso 2/3). Ahora haz clic en la altura (H)`;
                        } else {
                            hudText.textContent = `📐 Base L = ${this.measureAreaL.toFixed(2)} m fijada. Ahora haz clic en la altura (H)`;
                        }
                    }
                } else if (this.measureAreaStep === 2) {
                    const p1 = this.measureAreaP1;
                    const p2 = this.measureAreaP2;
                    const L = this.measureAreaL;

                    const u = new THREE.Vector3().subVectors(p2, p1).normalize();
                    const v = new THREE.Vector3().subVectors(pt, p1);
                    const proj = v.dot(u);
                    const hVec = new THREE.Vector3().subVectors(v, u.clone().multiplyScalar(proj));
                    const H = hVec.length();

                    if (H < 0.02) return;

                    const p3 = p2.clone().add(hVec);
                    const p4 = p1.clone().add(hVec);
                    const S = L * H;

                    if (this.measureMode === 'volume') {
                        // PASO 2 COMPLETADO: Guardar la cara base y pasar al PASO 3 (Espesor E)
                        this.measureAreaP3 = p3;
                        this.measureAreaP4 = p4;
                        this.measureAreaH = H;
                        this.measureAreaS = S;
                        const vNorm = hVec.clone().normalize();
                        this.measureVolumeNormal = new THREE.Vector3().crossVectors(u, vNorm).normalize();
                        this.measureAreaStep = 3;

                        // Limpiar la malla 2D provisional
                        if (this.measureAreaPreviewMesh) {
                            this.scene.remove(this.measureAreaPreviewMesh);
                            if (this.measureAreaPreviewMesh.geometry) this.measureAreaPreviewMesh.geometry.dispose();
                            this.measureAreaPreviewMesh = null;
                        }

                        const manualThickBtn = document.getElementById('v3dMeasureManualThickBtn');
                        if (manualThickBtn) manualThickBtn.style.display = 'inline-flex';

                        if (hudText) {
                            hudText.textContent = `🧊 Base fijada (${L.toFixed(2)} m × ${H.toFixed(2)} m = ${S.toFixed(2)} m²). Paso 3/3: Mueve o haz clic en la cara opuesta para fijar el espesor (o pulsa 'Espesor manual')`;
                        }
                        return;
                    }

                    // Si es modo área, consolidar aquí directamente
                    this._addAreaMeasurement(p1, p2, p3, p4, L, H, S);

                    const elem = this.currentMeasuredElement || res.element;
                    this.lastMeasurementData = {
                        type: 'area',
                        unit: 'm²',
                        value: S,
                        l: L,
                        w: 0,
                        h: H,
                        units: 1,
                        element: elem,
                        p1: p1, p2: p2, p3: p3, p4: p4,
                        description: `Superficie 3D: ${L.toFixed(2)} m × ${H.toFixed(2)} m = ${S.toFixed(2)} m²`
                    };
                    if (hudText) {
                        hudText.textContent = `✅ Superficie fijada: ${S.toFixed(2)} m² (L: ${L.toFixed(2)} m × H: ${H.toFixed(2)} m). Pulsa '➕ Añadir a Partida'`;
                    }

                    if (addToBudgetBtn) addToBudgetBtn.style.display = 'inline-flex';
                    this._cancelActiveMeasurementPoint();
                } else if (this.measureAreaStep === 3 && this.measureMode === 'volume') {
                    const p1 = this.measureAreaP1;
                    const p2 = this.measureAreaP2;
                    const p3 = this.measureAreaP3;
                    const p4 = this.measureAreaP4;
                    const L = this.measureAreaL;
                    const H = this.measureAreaH;
                    const S = this.measureAreaS;
                    const normal = this.measureVolumeNormal;

                    const diff = pt.clone().sub(p1);
                    const signedThick = diff.dot(normal);
                    const thick = Math.abs(signedThick);

                    if (thick < 0.01) {
                        if (hudText) {
                            hudText.textContent = '⚠️ Espesor demasiado pequeño (< 1 cm). Haz clic en la cara opuesta o pulsa "Espesor manual"';
                        }
                        return;
                    }

                    const extrudeVec = normal.clone().multiplyScalar(signedThick);
                    const b1 = p1.clone();
                    const b2 = p2.clone();
                    const b3 = p3.clone();
                    const b4 = p4.clone();
                    const t1 = p1.clone().add(extrudeVec);
                    const t2 = p2.clone().add(extrudeVec);
                    const t3 = p3.clone().add(extrudeVec);
                    const t4 = p4.clone().add(extrudeVec);

                    const V = S * thick;

                    this._addVolumeMeasurement(b1, b2, b3, b4, t1, t2, t3, t4, L, H, thick, S, V);

                    const elem = this.currentMeasuredElement || res.element;
                    this.lastMeasurementData = {
                        type: 'volume',
                        unit: 'm³',
                        value: V,
                        l: L,
                        w: thick,
                        h: H,
                        units: 1,
                        element: elem,
                        p1: b1, p2: b2, p3: b3, p4: b4,
                        t1: t1, t2: t2, t3: t3, t4: t4,
                        description: `Volumen 3D: ${L.toFixed(2)} m × ${H.toFixed(2)} m × ${thick.toFixed(2)} m = ${V.toFixed(2)} m³`
                    };

                    if (addToBudgetBtn) addToBudgetBtn.style.display = 'inline-flex';
                    this._cancelActiveMeasurementPoint();

                    if (hudText) {
                        hudText.textContent = `✅ Volumen fijado: ${V.toFixed(2)} m³ (${L.toFixed(2)} m × ${H.toFixed(2)} m × ${thick.toFixed(2)} m). Pulsa '➕ Añadir a Partida' para presupuestar`;
                    }
                }
            }
        },

        /**
         * Construye y añade una cota técnica CAD permanente con línea, topes arquitectónicos y tarjeta 3D
         */
        _addMeasurement: function (p1, p2, dist) {
            const THREE = window.THREE;
            this._ensureMeasureGroup();

            const id = 'meas_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
            const dimGroup = new THREE.Group();
            dimGroup.name = id;

            // 1. Línea principal de cota
            const lineGeom = new THREE.BufferGeometry().setFromPoints([p1, p2]);
            const lineMat = new THREE.LineBasicMaterial({
                color: 0x38bdf8,
                depthTest: false,
                transparent: true,
                opacity: 0.95
            });
            const mainLine = new THREE.Line(lineGeom, lineMat);
            mainLine.renderOrder = 10;
            dimGroup.add(mainLine);

            // 2. Nodos extremos en P1 y P2
            const sphereGeom = new THREE.SphereGeometry(0.04, 12, 12);
            const sphereMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, depthTest: false });

            const s1 = new THREE.Mesh(sphereGeom, sphereMat);
            s1.position.copy(p1);
            s1.renderOrder = 10;
            dimGroup.add(s1);

            const s2 = new THREE.Mesh(sphereGeom, sphereMat);
            s2.position.copy(p2);
            s2.renderOrder = 10;
            dimGroup.add(s2);

            // 3. Marcas de tope arquitectónico (ticks perpendiculares estilo CAD)
            const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
            let perp = new THREE.Vector3(0, 1, 0).cross(dir).normalize();
            if (perp.lengthSq() < 0.01) perp = new THREE.Vector3(1, 0, 0).cross(dir).normalize();
            perp.multiplyScalar(0.08); // Tamaño del tick arquitectónico

            const tickGeom1 = new THREE.BufferGeometry().setFromPoints([
                p1.clone().add(perp),
                p1.clone().sub(perp)
            ]);
            const tick1 = new THREE.Line(tickGeom1, lineMat);
            tick1.renderOrder = 10;
            dimGroup.add(tick1);

            const tickGeom2 = new THREE.BufferGeometry().setFromPoints([
                p2.clone().add(perp),
                p2.clone().sub(perp)
            ]);
            const tick2 = new THREE.Line(tickGeom2, lineMat);
            tick2.renderOrder = 10;
            dimGroup.add(tick2);

            this.measureGroup.add(dimGroup);

            // 4. Elemento DOM para etiqueta flotante
            const overlay = document.getElementById('v3dMeasureOverlay');
            let badgeEl = null;
            if (overlay) {
                overlay.style.display = 'block';
                badgeEl = document.createElement('div');
                badgeEl.id = `v3dBadge_${id}`;
                badgeEl.className = 'v3d-measure-badge';
                badgeEl.innerHTML = `
                    <span>📏</span>
                    <span class="v3d-measure-badge-val">${dist.toFixed(2)} m</span>
                    <span class="v3d-measure-badge-del" title="Eliminar esta cota">✕</span>
                `;

                const delBtn = badgeEl.querySelector('.v3d-measure-badge-del');
                if (delBtn) {
                    delBtn.onclick = (e) => {
                        e.stopPropagation();
                        this.removeMeasurement(id);
                    };
                }

                overlay.appendChild(badgeEl);
            }

            const midpoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);

            this.measurements.push({
                id: id,
                p1: p1,
                p2: p2,
                midpoint: midpoint,
                distance: dist,
                group: dimGroup,
                badgeEl: badgeEl
            });

            this._updateMeasureOverlayPositions();
        },

        /**
         * Añade una medición de superficie planar 3D (cuadrilátero) con relleno semitransparente y badge en m²
         */
        _addAreaMeasurement: function (p1, p2, p3, p4, l, h, s) {
            const THREE = window.THREE;
            this._ensureMeasureGroup();

            const id = 'meas_area_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
            const dimGroup = new THREE.Group();
            dimGroup.name = id;

            // 1. Malla 3D semitransparente del paño de superficie
            const quadGeom = new THREE.BufferGeometry();
            const positions = new Float32Array([
                p1.x, p1.y, p1.z,  p2.x, p2.y, p2.z,  p3.x, p3.y, p3.z,
                p1.x, p1.y, p1.z,  p3.x, p3.y, p3.z,  p4.x, p4.y, p4.z
            ]);
            quadGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            quadGeom.computeVertexNormals();

            const quadMat = new THREE.MeshBasicMaterial({
                color: 0x38bdf8,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.28,
                depthWrite: false
            });
            const quadMesh = new THREE.Mesh(quadGeom, quadMat);
            quadMesh.renderOrder = 10;
            dimGroup.add(quadMesh);

            // 2. Contorno perimetral cerrado en cian
            const loopGeom = new THREE.BufferGeometry().setFromPoints([p1, p2, p3, p4, p1]);
            const loopMat = new THREE.LineBasicMaterial({
                color: 0x38bdf8,
                depthTest: false,
                transparent: true,
                opacity: 0.95,
                linewidth: 2
            });
            const loopLine = new THREE.Line(loopGeom, loopMat);
            loopLine.renderOrder = 11;
            dimGroup.add(loopLine);

            // 3. Vértices en las 4 esquinas
            const sphereGeom = new THREE.SphereGeometry(0.04, 12, 12);
            const sphereMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, depthTest: false });
            [p1, p2, p3, p4].forEach(pt => {
                const sMesh = new THREE.Mesh(sphereGeom, sphereMat);
                sMesh.position.copy(pt);
                sMesh.renderOrder = 12;
                dimGroup.add(sMesh);
            });

            this.measureGroup.add(dimGroup);

            // 4. Badge flotante en el centroide
            const centroid = new THREE.Vector3().add(p1).add(p2).add(p3).add(p4).multiplyScalar(0.25);
            const overlay = document.getElementById('v3dMeasureOverlay');
            let badgeEl = null;

            if (overlay) {
                overlay.style.display = 'block';
                badgeEl = document.createElement('div');
                badgeEl.id = `v3dBadge_${id}`;
                badgeEl.className = 'v3d-measure-badge';
                badgeEl.innerHTML = `
                    <span>📐</span>
                    <span class="v3d-measure-badge-val">${s.toFixed(2)} m² <small style="opacity:0.8;font-size:0.75em;">(${l.toFixed(2)}×${h.toFixed(2)})</small></span>
                    <span class="v3d-measure-badge-del" title="Eliminar esta medición">✕</span>
                `;

                const delBtn = badgeEl.querySelector('.v3d-measure-badge-del');
                if (delBtn) {
                    delBtn.onclick = (e) => {
                        e.stopPropagation();
                        this.removeMeasurement(id);
                    };
                }

                overlay.appendChild(badgeEl);
            }

            this.measurements.push({
                id: id,
                type: 'area',
                p1: p1,
                p2: p2,
                p3: p3,
                p4: p4,
                midpoint: centroid,
                area: s,
                group: dimGroup,
                badgeEl: badgeEl
            });

            this._updateMeasureOverlayPositions();
        },

        /**
         * Añade una medición de volumen 3D (prisma recto / paralelepípedo) con caras translúcidas, aristas y badge en m³
         */
        _addVolumeMeasurement: function (b1, b2, b3, b4, t1, t2, t3, t4, l, h, thick, s, v) {
            const THREE = window.THREE;
            this._ensureMeasureGroup();

            const id = 'meas_vol_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
            const dimGroup = new THREE.Group();
            dimGroup.name = id;

            // 1. Malla 3D semitransparente de las 6 caras del volumen (12 triángulos)
            const boxPositions = new Float32Array([
                // Base
                b1.x, b1.y, b1.z,  b4.x, b4.y, b4.z,  b3.x, b3.y, b3.z,
                b1.x, b1.y, b1.z,  b3.x, b3.y, b3.z,  b2.x, b2.y, b2.z,
                // Superior
                t1.x, t1.y, t1.z,  t2.x, t2.y, t2.z,  t3.x, t3.y, t3.z,
                t1.x, t1.y, t1.z,  t3.x, t3.y, t3.z,  t4.x, t4.y, t4.z,
                // Lateral 1
                b1.x, b1.y, b1.z,  b2.x, b2.y, b2.z,  t2.x, t2.y, t2.z,
                b1.x, b1.y, b1.z,  t2.x, t2.y, t2.z,  t1.x, t1.y, t1.z,
                // Lateral 2
                b2.x, b2.y, b2.z,  b3.x, b3.y, b3.z,  t3.x, t3.y, t3.z,
                b2.x, b2.y, b2.z,  t3.x, t3.y, t3.z,  t2.x, t2.y, t2.z,
                // Lateral 3
                b3.x, b3.y, b3.z,  b4.x, b4.y, b4.z,  t4.x, t4.y, t4.z,
                b3.x, b3.y, b3.z,  t4.x, t4.y, t4.z,  t3.x, t3.y, t3.z,
                // Lateral 4
                b4.x, b4.y, b4.z,  b1.x, b1.y, b1.z,  t1.x, t1.y, t1.z,
                b4.x, b4.y, b4.z,  t1.x, t1.y, t1.z,  t4.x, t4.y, t4.z
            ]);

            const boxGeom = new THREE.BufferGeometry();
            boxGeom.setAttribute('position', new THREE.BufferAttribute(boxPositions, 3));
            boxGeom.computeVertexNormals();

            const boxMat = new THREE.MeshBasicMaterial({
                color: 0x38bdf8,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.28,
                depthWrite: false
            });
            const boxMesh = new THREE.Mesh(boxGeom, boxMat);
            boxMesh.renderOrder = 10;
            dimGroup.add(boxMesh);

            // 2. 12 Aristas alámbricas del prisma
            const boxLines = new Float32Array([
                // Base
                b1.x, b1.y, b1.z,  b2.x, b2.y, b2.z,
                b2.x, b2.y, b2.z,  b3.x, b3.y, b3.z,
                b3.x, b3.y, b3.z,  b4.x, b4.y, b4.z,
                b4.x, b4.y, b4.z,  b1.x, b1.y, b1.z,
                // Superior
                t1.x, t1.y, t1.z,  t2.x, t2.y, t2.z,
                t2.x, t2.y, t2.z,  t3.x, t3.y, t3.z,
                t3.x, t3.y, t3.z,  t4.x, t4.y, t4.z,
                t4.x, t4.y, t4.z,  t1.x, t1.y, t1.z,
                // Pilares
                b1.x, b1.y, b1.z,  t1.x, t1.y, t1.z,
                b2.x, b2.y, b2.z,  t2.x, t2.y, t2.z,
                b3.x, b3.y, b3.z,  t3.x, t3.y, t3.z,
                b4.x, b4.y, b4.z,  t4.x, t4.y, t4.z
            ]);

            const linesGeom = new THREE.BufferGeometry();
            linesGeom.setAttribute('position', new THREE.BufferAttribute(boxLines, 3));
            const linesMat = new THREE.LineBasicMaterial({
                color: 0x38bdf8,
                depthTest: false,
                transparent: true,
                opacity: 0.95,
                linewidth: 2
            });
            const linesObj = new THREE.LineSegments(linesGeom, linesMat);
            linesObj.renderOrder = 11;
            dimGroup.add(linesObj);

            // 3. Vértices esféricos en las 8 esquinas
            const sphereGeom = new THREE.SphereGeometry(0.04, 12, 12);
            const sphereMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, depthTest: false });
            [b1, b2, b3, b4, t1, t2, t3, t4].forEach(pt => {
                const sMesh = new THREE.Mesh(sphereGeom, sphereMat);
                sMesh.position.copy(pt);
                sMesh.renderOrder = 12;
                dimGroup.add(sMesh);
            });

            this.measureGroup.add(dimGroup);

            // 4. Badge flotante en el centroide del prisma
            const centroid = new THREE.Vector3()
                .add(b1).add(b2).add(b3).add(b4)
                .add(t1).add(t2).add(t3).add(t4)
                .multiplyScalar(0.125);

            const overlay = document.getElementById('v3dMeasureOverlay');
            let badgeEl = null;

            if (overlay) {
                overlay.style.display = 'block';
                badgeEl = document.createElement('div');
                badgeEl.id = `v3dBadge_${id}`;
                badgeEl.className = 'v3d-measure-badge';
                badgeEl.innerHTML = `
                    <span>🧊</span>
                    <span class="v3d-measure-badge-val">${v.toFixed(2)} m³ <small style="opacity:0.8;font-size:0.75em;">(${l.toFixed(2)}×${h.toFixed(2)}×${thick.toFixed(2)})</small></span>
                    <span class="v3d-measure-badge-del" title="Eliminar esta medición">✕</span>
                `;

                const delBtn = badgeEl.querySelector('.v3d-measure-badge-del');
                if (delBtn) {
                    delBtn.onclick = (e) => {
                        e.stopPropagation();
                        this.removeMeasurement(id);
                    };
                }

                overlay.appendChild(badgeEl);
            }

            this.measurements.push({
                id: id,
                type: 'volume',
                b1: b1, b2: b2, b3: b3, b4: b4,
                t1: t1, t2: t2, t3: t3, t4: t4,
                midpoint: centroid,
                l: l,
                h: h,
                thickness: thick,
                area: s,
                volume: v,
                group: dimGroup,
                badgeEl: badgeEl
            });

            this._updateMeasureOverlayPositions();
        },

        /**
         * Elimina una cota específica por su identificador
         */
        removeMeasurement: function (id) {
            const idx = this.measurements.findIndex(m => m.id === id);
            if (idx === -1) return;

            const m = this.measurements[idx];
            if (m.group && this.measureGroup) {
                this.measureGroup.remove(m.group);
                m.group.traverse(obj => {
                    if (obj.geometry) obj.geometry.dispose();
                    if (obj.material) obj.material.dispose();
                });
            }
            if (m.badgeEl) {
                m.badgeEl.remove();
            }

            this.measurements.splice(idx, 1);
            if (this.measurements.length === 0 && !this.isMeasuring) {
                const overlay = document.getElementById('v3dMeasureOverlay');
                if (overlay) overlay.style.display = 'none';
            }
        },

        /**
         * Elimina la última cota trazada
         */
        removeLastMeasurement: function () {
            if (!this.measurements || this.measurements.length === 0) return;
            const last = this.measurements[this.measurements.length - 1];
            this.removeMeasurement(last.id);
        },

        /**
         * Limpia y elimina todas las cotas activas en la escena 3D
         */
        clearMeasurements: function () {
            this._cancelActiveMeasurementPoint();

            const addToBudgetBtn = document.getElementById('v3dMeasureAddToBudgetBtn');
            if (addToBudgetBtn) addToBudgetBtn.style.display = 'none';
            this.lastMeasurementData = null;

            if (this.measurements) {
                this.measurements.forEach(m => {
                    if (m.group && this.measureGroup) {
                        this.measureGroup.remove(m.group);
                        m.group.traverse(obj => {
                            if (obj.geometry) obj.geometry.dispose();
                            if (obj.material) obj.material.dispose();
                        });
                    }
                    if (m.badgeEl) {
                        m.badgeEl.remove();
                    }
                });
                this.measurements = [];
            }

            if (this.measureGroup && this.scene) {
                this.scene.remove(this.measureGroup);
                this.measureGroup = null;
            }

            const overlay = document.getElementById('v3dMeasureOverlay');
            if (overlay) {
                overlay.innerHTML = '';
                if (!this.isMeasuring) overlay.style.display = 'none';
            }

            const hudText = document.getElementById('v3dMeasureHudText');
            if (hudText && this.isMeasuring) {
                hudText.textContent = 'Todas las cotas han sido eliminadas. Clic para medir.';
            }
        },

        /**
         * Actualiza en tiempo real la posición en píxeles de pantalla de todas las etiquetas de cota
         * mediante vector.project(this.camera) en cada frame del bucle de animación.
         */
        _updateMeasureOverlayPositions: function () {
            if (!this.container || !this.camera || !this.measurements || this.measurements.length === 0) return;

            const rect = this.container.getBoundingClientRect();
            const w = rect.width;
            const h = rect.height;
            if (w <= 0 || h <= 0) return;

            const isOrtho = (this.currentCameraType === 'orthographic');

            this.measurements.forEach(m => {
                if (!m.badgeEl) return;
                const sPos = m.midpoint.clone().project(this.camera);

                // Si está detrás de la cámara en perspectiva, ocultar
                if (!isOrtho && sPos.z > 1) {
                    m.badgeEl.style.display = 'none';
                    return;
                }

                // Ocultar si cae fuera del área de visualización con margen
                if (sPos.x < -1.1 || sPos.x > 1.1 || sPos.y < -1.1 || sPos.y > 1.1) {
                    m.badgeEl.style.display = 'none';
                    return;
                }

                m.badgeEl.style.display = 'flex';
                const px = (sPos.x * 0.5 + 0.5) * w;
                const py = (-sPos.y * 0.5 + 0.5) * h;
                m.badgeEl.style.left = `${px}px`;
                m.badgeEl.style.top = `${py}px`;
            });
        },

        /**
         * Resalta un elemento en color cian brillante por su GlobalId o ExpressID
         */
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
                    this._cleanGeometryParasiteTriangles(this.highlightSubset.geometry);
                    this.highlightSubset.name = 'active-selection-subset';
                    this.highlightSubset.isSelectionSubset = true;
                    this.highlightSubset.renderOrder = 3.5;
                }

                this.selectedExpressId = expressId;
                this.selectedExpressIds = [expressId];
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
         * Resalta múltiples elementos simultáneamente en color cian brillante
         */
        highlightElements: function (ids, focusCamera = false) {
            if (!this.ifcModel) return;
            if (!ids || ids.length === 0) {
                this.resetHighlight();
                return;
            }

            if (ids.length === 1) {
                return this.highlightElement(ids[0], focusCamera);
            }

            this.resetHighlight();

            const validIds = ids.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
            if (validIds.length === 0) return;

            const THREE = window.THREE;
            const planes = this.activeClippingPlane ? [this.activeClippingPlane] : [];
            const highlightMat = new THREE.MeshLambertMaterial({
                color: 0x00f0ff,
                emissive: 0x0284c7,
                emissiveIntensity: 0.65,
                polygonOffset: true,
                polygonOffsetFactor: -1,
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
                    ids: validIds,
                    material: highlightMat,
                    scene: this.scene,
                    removePrevious: true,
                    customID: 'active-selection-subset'
                });

                if (this.highlightSubset) {
                    this._cleanGeometryParasiteTriangles(this.highlightSubset.geometry);
                    this.highlightSubset.name = 'active-selection-subset';
                    this.highlightSubset.isSelectionSubset = true;
                    this.highlightSubset.renderOrder = 3.5;
                }

                this.selectedExpressIds = validIds;
                this.selectedExpressId = null;
                this.selectedElement = null;

                if (focusCamera && this.highlightSubset) {
                    this.focusElements(validIds);
                }
            } catch (err) {
                console.warn("IFCViewer3D: Error resaltando elementos múltiples:", err);
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
            this.selectedExpressIds = [];
            this.selectedSimilarityCriterion = null;
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

            const singleView = document.getElementById('v3dSingleElementView');
            const multiView = document.getElementById('v3dMultiSelectionView');
            if (singleView) singleView.style.display = 'block';
            if (multiView) multiView.style.display = 'none';

            this.selectedElement = elemObj || { id: String(expressId), name: `Elemento #${expressId}` };
            this.selectedExpressId = parseInt(expressId, 10);
            this.selectedExpressIds = [parseInt(expressId, 10)];

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
            const pLoadBearing = document.getElementById('propValLoadBearing');
            const pIsExternal = document.getElementById('propValIsExternal');
            const pFireRating = document.getElementById('propValFireRating');
            const pClassif = document.getElementById('propValClassification');
            const pId = document.getElementById('v3dCardId');
            const pExp = document.getElementById('propValExpressId');
            const pTag = document.getElementById('propValTag');
            const badgeIfcType = document.getElementById('v3dBadgeIfcType');

            const ifcTypeStr = elemObj ? (elemObj.ifcType || 'IFC') : 'IFC';
            const friendlyCat = this._getFriendlyCategory(elemObj) || (elemObj ? elemObj.category : '-');
            const func = elemObj ? (elemObj.functionalProperties || {}) : {};
            const classif = elemObj ? elemObj.classification : null;

            if (pName) pName.textContent = rawName;
            if (pCat) pCat.textContent = friendlyCat;
            if (pIfcType) pIfcType.textContent = ifcTypeStr;
            if (pType) pType.textContent = elemObj ? (elemObj.typeName || elemObj.category || '-') : '-';
            if (pStorey) pStorey.textContent = storey;

            // Parámetros normativos CTE
            if (pLoadBearing) {
                if (func.isLoadBearing === true) pLoadBearing.innerHTML = '<span style="color:#10b981; font-weight:600;">Portante / Resistente</span>';
                else if (func.isLoadBearing === false) pLoadBearing.innerHTML = '<span style="color:var(--text-secondary);">No portante (Divisorio)</span>';
                else pLoadBearing.textContent = '-';
            }
            if (pIsExternal) {
                if (func.isExternal === true) pIsExternal.innerHTML = '<span style="color:#38bdf8; font-weight:600;">Exterior (Fachada)</span>';
                else if (func.isExternal === false) pIsExternal.innerHTML = '<span style="color:var(--text-secondary);">Interior</span>';
                else pIsExternal.textContent = '-';
            }
            if (pFireRating) {
                pFireRating.textContent = func.fireRating ? String(func.fireRating) : '-';
            }
            if (pClassif) {
                pClassif.textContent = classif ? `${classif.code} (${classif.system || 'BIM'})` : '-';
            }

            if (pId) pId.textContent = globalId;
            if (pExp) pExp.textContent = '#' + expressId;
            if (pTag) pTag.textContent = (elemObj && elemObj.tag) ? elemObj.tag : '-';
            if (badgeIfcType) badgeIfcType.textContent = ifcTypeStr;

            // NUEVO: Desglose Multicapa (Capas Constructivas en 3D)
            const layersSec = document.getElementById('v3dSectionLayers');
            const layersBadge = document.getElementById('v3dBadgeLayersCount');
            const layerSetNameEl = document.getElementById('v3dLayerSetName');
            const totalThickEl = document.getElementById('v3dTotalThickBadge');
            const tableLayersBody = document.getElementById('v3dTableLayersBody');
            let canvas3D = document.getElementById('v3dLayersCanvas3D');
            let tooltip3D = document.getElementById('v3dLayer3DTooltip');
            let tooltipName = document.getElementById('v3dLayerTooltipName');
            let tooltipMeta = document.getElementById('v3dLayerTooltipMeta');

            if (layersSec && elemObj && elemObj.materialLayers && elemObj.materialLayers.length > 0) {
                const layers = elemObj.materialLayers;
                layersSec.style.display = 'block';
                layersSec.classList.remove('is-collapsed');
                if (layersBadge) layersBadge.textContent = `${layers.length} capas`;
                if (layerSetNameEl) layerSetNameEl.textContent = elemObj.layerSetName || elemObj.typeName || 'Solución constructiva';

                const totalThickM = layers.reduce((sum, l) => sum + (l.thickness || 0), 0);
                const totalThickMm = Math.round(totalThickM * 1000);
                if (totalThickEl) totalThickEl.textContent = `Espesor total: ${totalThickMm} mm`;

                // Inyección dinámica de seguridad si el contenedor 3D no estuviese en el DOM (caché de sesión)
                if (!canvas3D) {
                    const tableEl = document.getElementById('v3dTableLayers');
                    const wrapper = document.createElement('div');
                    wrapper.className = 'v3d-layers-3d-wrapper';
                    wrapper.style.cssText = 'position: relative; background: #070c18; border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 8px; overflow: hidden; margin-bottom: 12px; box-shadow: inset 0 2px 10px rgba(0,0,0,0.6);';
                    wrapper.innerHTML = `
                        <canvas id="v3dLayersCanvas3D" width="360" height="128" style="width: 100%; height: 128px; display: block; cursor: pointer;"></canvas>
                        <div id="v3dLayer3DTooltip" style="position: absolute; display: none; pointer-events: none; background: rgba(15, 23, 42, 0.94); border: 1px solid #38bdf8; border-radius: 6px; padding: 4px 8px; font-size: 0.7rem; color: white; box-shadow: 0 4px 12px rgba(0,0,0,0.6); z-index: 10; white-space: nowrap;">
                            <div id="v3dLayerTooltipName" style="font-weight: 700; color: #38bdf8;">Capa</div>
                            <div id="v3dLayerTooltipMeta" style="font-size: 0.65rem; color: var(--text-secondary);">Espesor</div>
                        </div>
                    `;
                    if (tableEl && tableEl.parentNode) {
                        tableEl.parentNode.insertBefore(wrapper, tableEl);
                    } else {
                        const secBody = layersSec.querySelector('.v3d-props-section-body');
                        if (secBody) secBody.appendChild(wrapper);
                    }
                    canvas3D = document.getElementById('v3dLayersCanvas3D');
                    tooltip3D = document.getElementById('v3dLayer3DTooltip');
                    tooltipName = document.getElementById('v3dLayerTooltipName');
                    tooltipMeta = document.getElementById('v3dLayerTooltipMeta');
                }

                // Detección automática de orientación: Forjados / Suelos / Cubiertas (Horizontal) vs Muros (Vertical)
                const rawCat = ((elemObj.ifcType || '') + ' ' + (elemObj.category || '') + ' ' + (elemObj.name || '') + ' ' + (elemObj.typeName || '')).toLowerCase();
                const isHorizontal = rawCat.includes('slab') || rawCat.includes('forjado') || rawCat.includes('suelo') || rawCat.includes('pavimento') || rawCat.includes('losa') || rawCat.includes('roof') || rawCat.includes('cubierta') || rawCat.includes('solera');
                this._currentIsHorizontal = isHorizontal;

                // Renderizar probeta 3D axonométrica en perspectiva
                if (canvas3D) {
                    const renderSample = () => {
                        this._renderIsometricMultilayer(canvas3D, layers, this._hoveredLayerIdx !== undefined ? this._hoveredLayerIdx : -1, isHorizontal);
                    };
                    renderSample();
                    requestAnimationFrame(renderSample);
                    setTimeout(renderSample, 50);

                    // Eventos de interactividad sobre el canvas 3D
                    canvas3D.onmousemove = (e) => {
                        const rect = canvas3D.getBoundingClientRect();
                        const mx = e.clientX - rect.left;
                        const my = e.clientY - rect.top;

                        let foundIdx = -1;
                        if (this._layerPolygons) {
                            for (let i = this._layerPolygons.length - 1; i >= 0; i--) {
                                const lp = this._layerPolygons[i];
                                if (this._isPointInPoly(mx, my, lp.poly)) {
                                    foundIdx = lp.index;
                                    break;
                                }
                            }
                        }

                        if (foundIdx !== this._hoveredLayerIdx) {
                            this._hoveredLayerIdx = foundIdx;
                            this._renderIsometricMultilayer(canvas3D, layers, foundIdx, isHorizontal);

                            // Sincronizar clase activa en tabla
                            if (tableLayersBody) {
                                const rows = tableLayersBody.querySelectorAll('tr');
                                rows.forEach((r, rIdx) => {
                                    if (rIdx === foundIdx) r.classList.add('layer-active');
                                    else r.classList.remove('layer-active');
                                });
                            }
                        }

                        // Mostrar tooltip
                        if (tooltip3D && foundIdx !== -1 && this._layerPolygons && this._layerPolygons[foundIdx]) {
                            const lp = this._layerPolygons[foundIdx];
                            const faceTag = foundIdx === 0 
                                ? (isHorizontal ? '☀️ CARA SUPERIOR (EXT.)' : '☀️ CARA EXTERIOR') 
                                : (foundIdx === layers.length - 1 
                                    ? (isHorizontal ? '🏠 CARA INFERIOR (INT.)' : '🏠 CARA INTERIOR') 
                                    : '🧱 ESTRATO INTERMEDIO');
                            if (tooltipName) tooltipName.textContent = `${lp.layer.materialName}`;
                            if (tooltipMeta) tooltipMeta.textContent = `${faceTag} · ${lp.thickMm} mm`;
                            tooltip3D.style.display = 'block';
                            tooltip3D.style.left = `${Math.min(mx + 10, rect.width - 150)}px`;
                            tooltip3D.style.top = `${Math.max(6, my - 38)}px`;
                        } else if (tooltip3D && foundIdx === -1) {
                            tooltip3D.style.display = 'none';
                        }
                    };

                    canvas3D.onmouseleave = () => {
                        this._hoveredLayerIdx = -1;
                        this._renderIsometricMultilayer(canvas3D, layers, -1, isHorizontal);
                        if (tooltip3D) tooltip3D.style.display = 'none';
                        if (tableLayersBody) {
                            tableLayersBody.querySelectorAll('tr').forEach(r => r.classList.remove('layer-active'));
                        }
                    };
                }

                // Generar tabla de capas con indicación de Cara Exterior / Interior
                if (tableLayersBody) {
                    let rows = '';
                    const baseArea = (elemObj.quantity && elemObj.unit === 'm2') ? elemObj.quantity : ((elemObj.allQuantities && (elemObj.allQuantities.netSideArea || elemObj.allQuantities.area)) || 1);
                    
                    layers.forEach((l, idx) => {
                        const thickMm = Math.round(l.thickness * 1000);
                        const volM3 = Math.round(baseArea * l.thickness * 1000) / 1000;
                        
                        // Etiqueta de ubicación
                        let caraBadge = '<span style="font-size:0.68rem; color:var(--text-secondary); background:var(--bg-hover); padding:1px 5px; border-radius:3px;">Núcleo</span>';
                        if (idx === 0) {
                            caraBadge = isHorizontal
                                ? '<span style="font-size:0.68rem; font-weight:700; color:#fbbf24; background:rgba(245,158,11,0.15); padding:2px 6px; border-radius:4px; border:1px solid rgba(245,158,11,0.3);">☀️ Sup.</span>'
                                : '<span style="font-size:0.68rem; font-weight:700; color:#fbbf24; background:rgba(245,158,11,0.15); padding:2px 6px; border-radius:4px; border:1px solid rgba(245,158,11,0.3);">☀️ Ext.</span>';
                        } else if (idx === layers.length - 1) {
                            caraBadge = isHorizontal
                                ? '<span style="font-size:0.68rem; font-weight:700; color:#38bdf8; background:rgba(56,189,248,0.15); padding:2px 6px; border-radius:4px; border:1px solid rgba(56,189,248,0.3);">🏠 Inf.</span>'
                                : '<span style="font-size:0.68rem; font-weight:700; color:#38bdf8; background:rgba(56,189,248,0.15); padding:2px 6px; border-radius:4px; border:1px solid rgba(56,189,248,0.3);">🏠 Int.</span>';
                        } else {
                            const lm = (l.materialName || '').toLowerCase();
                            if (lm.includes('aislamiento') || lm.includes('xps') || lm.includes('lana')) {
                                caraBadge = '<span style="font-size:0.68rem; color:#eab308; background:rgba(234,179,8,0.1); padding:1px 5px; border-radius:3px;">🧊 Aisl.</span>';
                            } else if (lm.includes('aire') || lm.includes('cámara') || lm.includes('camara')) {
                                caraBadge = '<span style="font-size:0.68rem; color:#0284c7; background:rgba(2,132,199,0.1); padding:1px 5px; border-radius:3px;">💨 Cám.</span>';
                            } else if (lm.includes('placa') || lm.includes('pyl') || lm.includes('pladur')) {
                                caraBadge = '<span style="font-size:0.68rem; color:#94a3b8; background:rgba(148,163,184,0.1); padding:1px 5px; border-radius:3px;">🚪 Trasd.</span>';
                            }
                        }

                        rows += `
                            <tr style="border-bottom:1px solid var(--border-color);" data-layer-idx="${idx}">
                                <td style="padding:6px 4px; vertical-align:middle;">${caraBadge}</td>
                                <td style="padding:6px 4px; font-size:0.75rem; color:var(--text-primary); vertical-align:middle;">
                                    <span style="display:inline-block; width:15px; height:15px; line-height:15px; text-align:center; background:var(--bg-hover); border-radius:3px; font-size:0.65rem; margin-right:4px; font-weight:700;">${idx + 1}</span>
                                    <strong>${l.materialName}</strong>
                                </td>
                                <td style="padding:6px 4px; text-align:right; font-family:monospace; font-size:0.75rem; color:#38bdf8; vertical-align:middle;">${thickMm > 0 ? thickMm + ' mm' : '-'}</td>
                                <td style="padding:6px 4px; text-align:right; font-family:monospace; font-size:0.75rem; color:var(--text-secondary); vertical-align:middle;">${volM3 > 0 ? volM3 + ' m³' : baseArea + ' m²'}</td>
                            </tr>
                        `;
                    });
                    tableLayersBody.innerHTML = rows;

                    // Hover sobre filas de la tabla sincronizado con la probeta 3D
                    tableLayersBody.querySelectorAll('tr').forEach(tr => {
                        tr.addEventListener('mouseenter', () => {
                            const lIdx = parseInt(tr.getAttribute('data-layer-idx'), 10);
                            tr.classList.add('layer-active');
                            if (canvas3D) this._renderIsometricMultilayer(canvas3D, layers, lIdx, isHorizontal);
                        });
                        tr.addEventListener('mouseleave', () => {
                            tr.classList.remove('layer-active');
                            if (canvas3D) this._renderIsometricMultilayer(canvas3D, layers, -1, isHorizontal);
                        });
                    });
                }
            } else if (layersSec) {
                layersSec.style.display = 'none';
            }

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
            const singleView = document.getElementById('v3dSingleElementView');
            const multiView = document.getElementById('v3dMultiSelectionView');
            if (singleView) singleView.style.display = 'block';
            if (multiView) multiView.style.display = 'none';
            this.selectedElement = null;
            this.selectedExpressId = null;
            this.selectedExpressIds = [];
            this.selectedSimilarityCriterion = null;
        },

        /**
         * Muestra el panel lateral en modo Selección Múltiple con resumen de características en común,
         * suma de mediciones y acumulación de precios FIEBDC-3
         */
        showMultiElementCard: function (ids, criterionInfo) {
            const sidebar = document.getElementById('v3dElementSidebar');
            if (!sidebar) return;

            const singleView = document.getElementById('v3dSingleElementView');
            const multiView = document.getElementById('v3dMultiSelectionView');
            if (singleView) singleView.style.display = 'none';
            if (multiView) multiView.style.display = 'block';

            const nameEl = document.getElementById('v3dCardName');
            const storeyEl = document.getElementById('v3dCardStorey');
            const iconEl = document.getElementById('v3dCardIcon');
            const bannerTitle = document.getElementById('v3dMultiBannerTitle');
            const bannerCount = document.getElementById('v3dMultiBannerCount');

            if (nameEl) nameEl.textContent = 'Selección Múltiple';
            if (iconEl) iconEl.textContent = '📦';
            if (storeyEl) storeyEl.textContent = `${ids.length} elementos`;
            if (bannerTitle) bannerTitle.textContent = criterionInfo ? criterionInfo.title : 'Selección Múltiple';
            if (bannerCount) bannerCount.textContent = `${ids.length} elementos seleccionados en el modelo`;

            const elements = ids.map(id => this.expressIdToElementMap[id] || this.expressIdToElementMap[String(id)]).filter(Boolean);

            // 1. Contenedor de Características en Común
            const commonTraitsEl = document.getElementById('v3dMultiCommonTraits');
            if (commonTraitsEl) {
                const categories = new Set(elements.map(e => e.category).filter(Boolean));
                const typeNames = new Set(elements.map(e => e.typeName).filter(Boolean));
                const storeys = new Set(elements.map(e => e.storey).filter(Boolean));
                const ifcTypes = new Set(elements.map(e => e.ifcType).filter(Boolean));

                let traitsHtml = '<div class="v3d-multi-traits-grid">';

                // Categoría / Familia
                if (categories.size === 1) {
                    const cat = [...categories][0];
                    traitsHtml += `<div class="v3d-multi-trait-item"><span class="v3d-multi-trait-label">🏷️ Familia / Categoría</span><span class="v3d-multi-trait-val highlight">${cat}</span></div>`;
                } else if (categories.size > 1) {
                    traitsHtml += `<div class="v3d-multi-trait-item"><span class="v3d-multi-trait-label">🏷️ Familias</span><span class="v3d-multi-trait-val">${categories.size} distintas</span></div>`;
                }

                // Tipo Constructivo
                if (typeNames.size === 1) {
                    const t = [...typeNames][0];
                    traitsHtml += `<div class="v3d-multi-trait-item"><span class="v3d-multi-trait-label">🧱 Tipo</span><span class="v3d-multi-trait-val" title="${t}">${t}</span></div>`;
                } else if (typeNames.size > 1) {
                    traitsHtml += `<div class="v3d-multi-trait-item"><span class="v3d-multi-trait-label">🧱 Tipos</span><span class="v3d-multi-trait-val">${typeNames.size} diferentes</span></div>`;
                }

                // Planta / Nivel
                if (storeys.size === 1) {
                    const s = [...storeys][0];
                    traitsHtml += `<div class="v3d-multi-trait-item"><span class="v3d-multi-trait-label">🏢 Planta</span><span class="v3d-multi-trait-val highlight">${s}</span></div>`;
                } else if (storeys.size > 1) {
                    traitsHtml += `<div class="v3d-multi-trait-item"><span class="v3d-multi-trait-label">🏢 Plantas</span><span class="v3d-multi-trait-val">${storeys.size} niveles</span></div>`;
                }

                // Entidad IFC
                if (ifcTypes.size === 1) {
                    const it = [...ifcTypes][0];
                    traitsHtml += `<div class="v3d-multi-trait-item"><span class="v3d-multi-trait-label">🏛️ Entidad IFC</span><span class="v3d-multi-trait-val mono">${it}</span></div>`;
                }

                // Criterio específico aplicado
                if (criterionInfo && criterionInfo.detail) {
                    traitsHtml += `<div class="v3d-multi-trait-item" style="border-left-color: #34d399;"><span class="v3d-multi-trait-label">✨ Criterio común</span><span class="v3d-multi-trait-val" style="color:#a7f3d0;" title="${criterionInfo.detail}">${criterionInfo.detail}</span></div>`;
                }

                traitsHtml += '</div>';
                commonTraitsEl.innerHTML = traitsHtml;
            }

            // 2. Contenedor de Suma de Precios e Impacto en Presupuesto FIEBDC-3
            const totalPriceEl = document.getElementById('v3dMultiTotalPrice');
            const priceSubEl = document.getElementById('v3dMultiPriceSub');
            const budgetListEl = document.getElementById('v3dMultiBudgetList');

            let totalBudgetSum = 0;
            const conceptsMap = {};
            let linkedCount = 0;

            elements.forEach(elem => {
                let bc = elem.budgetConcept;
                if (!bc && window.parsedData && window.parsedData.concepts) {
                    const targetGid = elem.globalId;
                    for (const code in window.parsedData.concepts) {
                        const c = window.parsedData.concepts[code];
                        if (c.measurements && c.measurements.length > 0) {
                            const m = c.measurements.find(it => it.label && it.label.includes(targetGid));
                            if (m) {
                                bc = { code: c.code, summary: c.summary, price: c.price };
                                elem.budgetConcept = bc;
                                break;
                            }
                        }
                    }
                }

                if (bc) {
                    linkedCount++;
                    const price = parseFloat(bc.price || 0);
                    const qty = parseFloat(elem.quantity || 1);
                    const itemTotal = price * qty;
                    totalBudgetSum += itemTotal;

                    if (!conceptsMap[bc.code]) {
                        conceptsMap[bc.code] = {
                            code: bc.code,
                            summary: bc.summary || '',
                            price: price,
                            count: 0,
                            totalItemSum: 0
                        };
                    }
                    conceptsMap[bc.code].count++;
                    conceptsMap[bc.code].totalItemSum += itemTotal;
                }
            });

            if (totalPriceEl) {
                totalPriceEl.textContent = totalBudgetSum > 0
                    ? totalBudgetSum.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
                    : '0,00 €';
            }

            if (priceSubEl) {
                if (linkedCount > 0) {
                    priceSubEl.textContent = `${linkedCount} de ${ids.length} elementos vinculados a partidas FIEBDC-3`;
                } else {
                    priceSubEl.textContent = 'Sin partidas FIEBDC-3 vinculadas aún en el presupuesto';
                }
            }

            if (budgetListEl) {
                let listHtml = '';
                const conceptCodes = Object.keys(conceptsMap);
                if (conceptCodes.length > 0) {
                    conceptCodes.forEach(code => {
                        const item = conceptsMap[code];
                        const amtStr = item.totalItemSum.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
                        listHtml += `
                            <div class="v3d-multi-budget-row" title="${item.summary}">
                                <span class="v3d-multi-budget-code">${item.code} (${item.count} ud)</span>
                                <span class="v3d-multi-budget-amt">${amtStr}</span>
                            </div>
                        `;
                    });
                } else {
                    listHtml = '<div style="font-size:0.7rem; color:#94a3b8; text-align:center; padding:4px;">Usa "Añadir a Partida" para presupuestar este grupo.</div>';
                }
                budgetListEl.innerHTML = listHtml;
            }

            // 3. Contenedor de Mediciones Acumuladas
            const qtysEl = document.getElementById('v3dMultiQuantities');
            if (qtysEl) {
                let sumArea = 0;
                let sumVolume = 0;
                let sumLength = 0;

                elements.forEach(e => {
                    const q = e.allQuantities || {};
                    const a = q.netArea || q.grossArea || q.netSideArea || (e.unit === 'm2' ? e.quantity : 0);
                    const v = q.netVolume || q.grossVolume || q.volume || (e.unit === 'm3' ? e.quantity : 0);
                    const l = q.length || q.height || (e.unit === 'm' ? e.quantity : 0);

                    if (typeof a === 'number' && !isNaN(a)) sumArea += a;
                    if (typeof v === 'number' && !isNaN(v)) sumVolume += v;
                    if (typeof l === 'number' && !isNaN(l)) sumLength += l;
                });

                let qHtml = '<div class="v3d-multi-qtys-grid">';
                qHtml += `
                    <div class="v3d-multi-qty-box">
                        <span class="v3d-multi-qty-lbl">📐 Superficie Total</span>
                        <span class="v3d-multi-qty-num">${sumArea > 0 ? sumArea.toFixed(2) + ' m²' : '-'}</span>
                    </div>
                    <div class="v3d-multi-qty-box">
                        <span class="v3d-multi-qty-lbl">🧊 Volumen Total</span>
                        <span class="v3d-multi-qty-num">${sumVolume > 0 ? sumVolume.toFixed(2) + ' m³' : '-'}</span>
                    </div>
                    <div class="v3d-multi-qty-box">
                        <span class="v3d-multi-qty-lbl">📏 Longitud / Dim.</span>
                        <span class="v3d-multi-qty-num">${sumLength > 0 ? sumLength.toFixed(2) + ' m' : '-'}</span>
                    </div>
                    <div class="v3d-multi-qty-box">
                        <span class="v3d-multi-qty-lbl">🔢 Recuento Total</span>
                        <span class="v3d-multi-qty-num">${ids.length} ud</span>
                    </div>
                `;
                qHtml += '</div>';
                qtysEl.innerHTML = qHtml;
            }

            // 4. Acciones en bloque
            const isolateBtn = document.getElementById('v3dMultiIsolateBtn');
            const hideBtn = document.getElementById('v3dMultiHideBtn');
            const focusBtn = document.getElementById('v3dMultiFocusBtn');
            const budgetBtn = document.getElementById('v3dMultiAddToBudgetBtn');

            if (isolateBtn) {
                isolateBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.isolateElements(ids);
                };
            }
            if (hideBtn) {
                hideBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.hideElements(ids);
                };
            }
            if (focusBtn) {
                focusBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.focusElements(ids);
                };
            }
            if (budgetBtn) {
                budgetBtn.onclick = (e) => {
                    e.stopPropagation();
                    // Calcular medición agregada
                    let totalVal = 0;
                    let unit = 'ud';
                    const uCounts = {};
                    elements.forEach(e => {
                        const u = e.unit || 'ud';
                        uCounts[u] = (uCounts[u] || 0) + 1;
                    });
                    let bestUnit = 'ud';
                    let bestCount = 0;
                    for (const u in uCounts) {
                        if (uCounts[u] > bestCount) {
                            bestCount = uCounts[u];
                            bestUnit = u;
                        }
                    }
                    unit = bestUnit;
                    if (unit === 'm2') {
                        totalVal = parseFloat(elements.reduce((acc, e) => acc + (e.allQuantities?.netArea || e.allQuantities?.grossArea || e.quantity || 0), 0).toFixed(2));
                    } else if (unit === 'm3') {
                        totalVal = parseFloat(elements.reduce((acc, e) => acc + (e.allQuantities?.netVolume || e.allQuantities?.grossVolume || e.quantity || 0), 0).toFixed(2));
                    } else if (unit === 'm') {
                        totalVal = parseFloat(elements.reduce((acc, e) => acc + (e.allQuantities?.length || e.quantity || 0), 0).toFixed(2));
                    } else {
                        totalVal = ids.length;
                    }

                    if (typeof window.openV3dAddToBudgetModal === 'function') {
                        const sampleElem = elements[0] || {};
                        window.openV3dAddToBudgetModal({
                            type: unit === 'm2' ? 'area' : (unit === 'm3' ? 'volume' : 'linear'),
                            unit: unit,
                            value: totalVal,
                            l: totalVal,
                            w: unit === 'm3' ? 0.30 : 0,
                            h: 0,
                            units: ids.length,
                            element: {
                                name: `${criterionInfo ? criterionInfo.title : 'Selección Múltiple'} (${ids.length} ud)`,
                                storey: sampleElem.storey || 'Modelo BIM',
                                globalId: elements.map(e => e.globalId).filter(Boolean).slice(0, 4).join('; ') + (elements.length > 4 ? '...' : ''),
                                category: sampleElem.category || 'General'
                            },
                            description: `Medición agrupada de ${ids.length} elementos por ${criterionInfo ? criterionInfo.title : 'similitud'}`
                        });
                    }
                };
            }

            sidebar.style.display = 'flex';
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
         * Gestiona la creación, posicionamiento y renderizado de las tapas macizas en azul oscuro (#0f2b5c)
         * mediante Stencil Capping oficial de Three.js.
         * El plano de tapa (sectionCapMesh) es una superficie plana 2D situada estrictamente en el plano de corte.
         * Al ser un plano 2D en la cota de corte, es físicamente imposible que manche o altere los alzados
         * exteriores de los muros (como Ms - 042), los cantos de forjados no cortados (como Cub - 012)
         * o las carpinterías y huecos de ventana.
         */
        _updateSectionCaps: function (axis, value, inverted) {
            const THREE = window.THREE;
            if (!this.scene || !THREE) return;

            const showCaps = (this.sectionConfig && this.sectionConfig.showCaps !== undefined) ? this.sectionConfig.showCaps : true;
            const isSectionActive = this.sectionConfig && this.sectionConfig.active && !!this.activeClippingPlane;
            const shouldShowCaps = isSectionActive && showCaps;

            if (!shouldShowCaps) {
                if (this.sectionCapGroup) {
                    this.sectionCapGroup.visible = false;
                }
                return;
            }

            const plane = this.activeClippingPlane;
            const targetAxis = axis || (this.sectionConfig.active ? this.sectionConfig.axis : 'Y');
            const targetVal = typeof value === 'number' ? value : (this.sectionConfig.active ? this.sectionConfig.value : 0);

            // 1. Obtener caja envolvente y dimensiones del modelo para ajustar el tamaño del plano de tapa
            let box = new THREE.Box3();
            let hasBounds = false;
            if (this.isIsolated && this.isolatedSubset && this.isolatedSubset.visible) {
                box.setFromObject(this.isolatedSubset);
                hasBounds = true;
            } else {
                Object.values(this.categorySubsets).forEach(s => {
                    if (s && s.mesh && s.mesh.visible) {
                        box.expandByObject(s.mesh);
                        hasBounds = true;
                    }
                });
            }
            if (!hasBounds && this.ifcModel) box.setFromObject(this.ifcModel);
            if (!hasBounds) box = new THREE.Box3(new THREE.Vector3(-20, -10, -20), new THREE.Vector3(20, 20, 20));

            // COMPROBACIÓN CRÍTICA DE INTERSECCIÓN CON EL MODELO:
            // Si la cota del plano de corte está fuera del modelo (por encima del tejado, por debajo del suelo o fuera en X/Z),
            // no hay ninguna sección física que tapar. Ocultamos el grupo de tapas de sección de inmediato.
            let minAxis = box.min.y, maxAxis = box.max.y;
            if (targetAxis === 'X') { minAxis = box.min.x; maxAxis = box.max.x; }
            else if (targetAxis === 'Z') { minAxis = box.min.z; maxAxis = box.max.z; }

            const marginTolerance = 0.05; // Margen de seguridad de 5 cm
            if (targetVal > maxAxis + marginTolerance || targetVal < minAxis - marginTolerance) {
                if (this.sectionCapGroup) {
                    this.sectionCapGroup.visible = false;
                }
                return;
            }

            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            if (isNaN(center.x)) center.set(0, 0, 0);
            if (isNaN(size.x) || size.x <= 0) size.set(30, 20, 30);

            const margin = 10.0;
            const maxDim = Math.max(size.x, size.y, size.z, 20) + margin * 2;
            const width = maxDim;
            const height = maxDim;

            // 2. Crear grupo contenedor si no existe
            if (!this.sectionCapGroup) {
                this.sectionCapGroup = new THREE.Group();
                this.sectionCapGroup.name = 'v3d-section-cap-group';
                this.scene.add(this.sectionCapGroup);
            }
            this.sectionCapGroup.visible = true;

            // 3. Crear materiales base de stencil si no existen
            if (!this._stencilMaterials) {
                const baseMat = new THREE.MeshBasicMaterial({
                    depthWrite: false,
                    depthTest: false,
                    colorWrite: false,
                    stencilWrite: true,
                    stencilFunc: THREE.AlwaysStencilFunc
                });

                const matBack = baseMat.clone();
                matBack.side = THREE.BackSide;
                matBack.clippingPlanes = [plane];
                matBack.stencilFail = THREE.IncrementWrapStencilOp;
                matBack.stencilZFail = THREE.IncrementWrapStencilOp;
                matBack.stencilZPass = THREE.IncrementWrapStencilOp;

                const matFront = baseMat.clone();
                matFront.side = THREE.FrontSide;
                matFront.clippingPlanes = [plane];
                matFront.stencilFail = THREE.DecrementWrapStencilOp;
                matFront.stencilZFail = THREE.DecrementWrapStencilOp;
                matFront.stencilZPass = THREE.DecrementWrapStencilOp;

                const capMat = new THREE.MeshBasicMaterial({
                    color: this.BLUEPRINT_CONFIG.sectionCapColor || 0x0f2b5c,
                    side: THREE.DoubleSide,
                    clippingPlanes: [],
                    stencilWrite: true,
                    stencilRef: 0,
                    stencilFunc: THREE.NotEqualStencilFunc,
                    stencilFail: THREE.ReplaceStencilOp,
                    stencilZFail: THREE.ReplaceStencilOp,
                    stencilZPass: THREE.ReplaceStencilOp,
                    depthWrite: true,
                    depthTest: true,
                    polygonOffset: true,
                    polygonOffsetFactor: 0.1,
                    polygonOffsetUnits: 0.1
                });

                this._stencilMaterials = {
                    matBack: matBack,
                    matFront: matFront,
                    capMat: capMat
                };
            } else {
                this._stencilMaterials.matBack.clippingPlanes = [plane];
                this._stencilMaterials.matFront.clippingPlanes = [plane];
            }

            // 4. Identificar mallas volumétricas sólidas que deben generar tapas
            // CRÍTICO: Excluir carpinterías (ventanas, puertas), barandillas, escaleras y mobiliario
            // que son láminas o mallas abiertas para evitar inconsistencias en el buffer de estarcido.
            const isSolidVolumetricCategory = (catName, catKey) => {
                const s = `${catName || ''} ${catKey || ''}`.toLowerCase();
                if (s.includes('vidrio') || s.includes('cristal') || s.includes('glass') ||
                    s.includes('puerta') || s.includes('door') ||
                    s.includes('ventana') || s.includes('window') ||
                    s.includes('panel') || s.includes('plate') ||
                    s.includes('barandilla') || s.includes('railing') ||
                    s.includes('escalera') || s.includes('stair') ||
                    s.includes('mobiliario') || s.includes('furnishing') ||
                    s.includes('sanit') || s.includes('espacio') || s.includes('zona') || s.includes('space')) {
                    return false;
                }
                if (s.includes('muro') || s.includes('cerramiento') || s.includes('tabique') || s.includes('wall')) return true;
                if (s.includes('forjado') || s.includes('suelo') || s.includes('pavimento') || s.includes('losa') || s.includes('slab')) return true;
                if (s.includes('pilar') || s.includes('columna') || s.includes('column')) return true;
                if (s.includes('viga') || s.includes('beam')) return true;
                if (s.includes('cimentac') || s.includes('zapata') || s.includes('footing')) return true;
                if (s.includes('cubierta') || s.includes('roof')) return true;
                if (s.includes('estructura') || s.includes('structural')) return true;
                return false;
            };

            let targetMeshes = [];
            if (this.isIsolated && this.isolatedSubset && this.isolatedSubset.visible) {
                targetMeshes = [this.isolatedSubset];
            } else {
                targetMeshes = Object.values(this.categorySubsets)
                    .filter(s => s && s.mesh && s.mesh.visible && isSolidVolumetricCategory(s.name, s.key))
                    .map(s => s.mesh);
            }

            if (targetMeshes.length === 0) {
                if (this.sectionCapGroup) {
                    this.sectionCapGroup.visible = false;
                }
                return;
            }

            // 5. Comprobar si necesitamos reconstruir las mallas de stencil
            const currentMeshesKey = targetMeshes.map(m => m.id).join('_') + `_${targetAxis}`;
            if (this._lastStencilKey !== currentMeshesKey) {
                this._lastStencilKey = currentMeshesKey;

                // Limpiar hijos anteriores del grupo
                while (this.sectionCapGroup.children.length > 0) {
                    const ch = this.sectionCapGroup.children[0];
                    this.sectionCapGroup.remove(ch);
                    if (ch === this.sectionCapMesh && ch.geometry) {
                        ch.geometry.dispose();
                    }
                }
                this.sectionCapMesh = null;

                // Añadir pares de mallas Front y Back para cada geometría de subset sólido
                targetMeshes.forEach(m => {
                    if (!m || !m.geometry) return;
                    const bMesh = new THREE.Mesh(m.geometry, this._stencilMaterials.matBack);
                    bMesh.renderOrder = 1;
                    bMesh.name = 'v3d-stencil-back';
                    this.sectionCapGroup.add(bMesh);

                    const fMesh = new THREE.Mesh(m.geometry, this._stencilMaterials.matFront);
                    fMesh.renderOrder = 1;
                    fMesh.name = 'v3d-stencil-front';
                    this.sectionCapGroup.add(fMesh);
                });

                // Crear nueva geometría para el plano de tapa
                const capGeom = new THREE.PlaneGeometry(width, height);
                this.sectionCapMesh = new THREE.Mesh(capGeom, this._stencilMaterials.capMat);
                this.sectionCapMesh.name = 'v3d-section-cap-plane';
                this.sectionCapMesh.renderOrder = 2;
                this.sectionCapMesh.onAfterRender = function (renderer) {
                    if (renderer && typeof renderer.clearStencil === 'function') {
                        renderer.clearStencil();
                    }
                };
                this.sectionCapGroup.add(this.sectionCapMesh);
            }

            // 6. Actualizar orientación y posición de la malla de tapa en el espacio 3D
            if (this.sectionCapMesh) {
                if (targetAxis === 'X') {
                    this.sectionCapMesh.rotation.set(0, Math.PI / 2, 0);
                    this.sectionCapMesh.position.set(targetVal, center.y, center.z);
                } else if (targetAxis === 'Y') {
                    this.sectionCapMesh.rotation.set(-Math.PI / 2, 0, 0);
                    this.sectionCapMesh.position.set(center.x, targetVal, center.z);
                } else if (targetAxis === 'Z') {
                    this.sectionCapMesh.rotation.set(0, 0, 0);
                    this.sectionCapMesh.position.set(center.x, center.y, targetVal);
                }
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
                if (this.isMeasuring) return; // En modo acotar, el listener de medición gestiona los clics

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
                            if (gid && this.globalIdToElementMap && this.globalIdToElementMap[gid]) {
                                elemObj = this.globalIdToElementMap[gid];
                            } else {
                                const rawN = props.Name ? props.Name.value : `Elemento #${id}`;
                                elemObj = {
                                    id: String(id),
                                    expressId: id,
                                    globalId: gid,
                                    name: this._decodeStepString(rawN),
                                    storey: 'Modelo 3D'
                                };
                            }
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
                    side: THREE.DoubleSide
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
        /**
         * Construye los criterios de similitud para un elemento BIM inspeccionando todos los elementos del modelo
         */
        _buildSimilarCriteria: function (elemObj, expressId) {
            if (!this.currentIfcData || !this.currentIfcData.elements || !elemObj) return [];
            const allElems = this.currentIfcData.elements;
            const getEid = (e) => parseInt(e.expressId !== undefined ? e.expressId : e.id, 10);

            const criteria = [];

            // 1. Familia / Categoría
            if (elemObj.category) {
                const matches = allElems.filter(e => e.category === elemObj.category);
                criteria.push({
                    key: 'category',
                    icon: elemObj.icon || '🏷️',
                    title: 'Familia / Categoría',
                    detail: elemObj.category,
                    ids: matches.map(getEid)
                });
            }

            // 2. Tipo Constructivo
            if (elemObj.typeName) {
                const matches = allElems.filter(e => e.typeName === elemObj.typeName);
                criteria.push({
                    key: 'type',
                    icon: '🧱',
                    title: 'Tipo Constructivo',
                    detail: elemObj.typeName,
                    ids: matches.map(getEid)
                });
            }

            // 3. Misma Planta
            if (elemObj.storey) {
                const matches = allElems.filter(e => e.storey === elemObj.storey);
                criteria.push({
                    key: 'storey',
                    icon: '🏢',
                    title: 'Misma Planta / Nivel',
                    detail: elemObj.storey,
                    ids: matches.map(getEid)
                });
            }

            // 4. Tipo en esta Planta
            if (elemObj.storey && elemObj.typeName) {
                const matches = allElems.filter(e => e.storey === elemObj.storey && e.typeName === elemObj.typeName);
                if (matches.length > 0) {
                    criteria.push({
                        key: 'storey_type',
                        icon: '📌',
                        title: 'Mismo Tipo en esta Planta',
                        detail: `${elemObj.storey} · ${elemObj.typeName}`,
                        ids: matches.map(getEid)
                    });
                }
            }

            // 5. Categoría en esta Planta
            if (elemObj.storey && elemObj.category && (!elemObj.typeName || elemObj.typeName !== elemObj.category)) {
                const matches = allElems.filter(e => e.storey === elemObj.storey && e.category === elemObj.category);
                if (matches.length > 0) {
                    criteria.push({
                        key: 'storey_cat',
                        icon: '🏗️',
                        title: 'Categoría en esta Planta',
                        detail: `${elemObj.storey} · ${elemObj.category}`,
                        ids: matches.map(getEid)
                    });
                }
            }

            // 6. Mismo Nombre exacto
            if (elemObj.name && elemObj.name !== elemObj.typeName) {
                const matches = allElems.filter(e => e.name === elemObj.name);
                if (matches.length > 1) {
                    criteria.push({
                        key: 'name',
                        icon: '🔤',
                        title: 'Mismo Nombre',
                        detail: elemObj.name,
                        ids: matches.map(getEid)
                    });
                }
            }

            // 7. Superficie similar (±10%)
            const areaVal = elemObj.allQuantities?.netArea || elemObj.allQuantities?.grossArea || elemObj.allQuantities?.netSideArea || (elemObj.unit === 'm2' ? elemObj.quantity : null);
            if (areaVal && areaVal > 0) {
                const minA = areaVal * 0.90;
                const maxA = areaVal * 1.10;
                const matches = allElems.filter(e => {
                    const a = e.allQuantities?.netArea || e.allQuantities?.grossArea || e.allQuantities?.netSideArea || (e.unit === 'm2' ? e.quantity : null);
                    return a && a >= minA && a <= maxA;
                });
                criteria.push({
                    key: 'area',
                    icon: '📐',
                    title: 'Superficie Similar (±10%)',
                    detail: `~${areaVal.toFixed(2)} m² [${minA.toFixed(1)} - ${maxA.toFixed(1)} m²]`,
                    ids: matches.map(getEid)
                });
            }

            // 8. Volumen similar (±10%)
            const volVal = elemObj.allQuantities?.netVolume || elemObj.allQuantities?.grossVolume || elemObj.allQuantities?.volume || (elemObj.unit === 'm3' ? elemObj.quantity : null);
            if (volVal && volVal > 0) {
                const minV = volVal * 0.90;
                const maxV = volVal * 1.10;
                const matches = allElems.filter(e => {
                    const v = e.allQuantities?.netVolume || e.allQuantities?.grossVolume || e.allQuantities?.volume || (e.unit === 'm3' ? e.quantity : null);
                    return v && v >= minV && v <= maxV;
                });
                criteria.push({
                    key: 'volume',
                    icon: '🧊',
                    title: 'Volumen Similar (±10%)',
                    detail: `~${volVal.toFixed(2)} m³ [${minV.toFixed(1)} - ${maxV.toFixed(1)} m³]`,
                    ids: matches.map(getEid)
                });
            }

            // 9. Longitud / Dimensión similar (±10%)
            const lenVal = elemObj.allQuantities?.length || elemObj.allQuantities?.height || (elemObj.unit === 'm' ? elemObj.quantity : null);
            if (lenVal && lenVal > 0) {
                const minL = lenVal * 0.90;
                const maxL = lenVal * 1.10;
                const matches = allElems.filter(e => {
                    const l = e.allQuantities?.length || e.allQuantities?.height || (e.unit === 'm' ? e.quantity : null);
                    return l && l >= minL && l <= maxL;
                });
                criteria.push({
                    key: 'length',
                    icon: '📏',
                    title: 'Dimensión Similar (±10%)',
                    detail: `~${lenVal.toFixed(2)} m`,
                    ids: matches.map(getEid)
                });
            }

            // 10. Partida de Presupuesto FIEBDC-3
            let targetConceptCode = elemObj.budgetConcept?.code;
            if (!targetConceptCode && window.parsedData && window.parsedData.concepts) {
                const targetGid = elemObj.globalId;
                for (const code in window.parsedData.concepts) {
                    const c = window.parsedData.concepts[code];
                    if (c.measurements && c.measurements.some(m => m.label && m.label.includes(targetGid))) {
                        targetConceptCode = c.code;
                        elemObj.budgetConcept = { code: c.code, summary: c.summary, price: c.price };
                        break;
                    }
                }
            }
            if (targetConceptCode && window.parsedData && window.parsedData.concepts) {
                const c = window.parsedData.concepts[targetConceptCode];
                const matches = allElems.filter(e => {
                    if (e.budgetConcept?.code === targetConceptCode) return true;
                    if (c.measurements && c.measurements.some(m => m.label && m.label.includes(e.globalId))) return true;
                    return false;
                });
                if (matches.length > 0) {
                    criteria.push({
                        key: 'budget',
                        icon: '💶',
                        title: 'Misma Partida FIEBDC-3',
                        detail: `${c.code}: ${c.summary || ''}`.substring(0, 30) + '...',
                        ids: matches.map(getEid)
                    });
                }
            }

            // 11. Entidad IFC
            if (elemObj.ifcType) {
                const matches = allElems.filter(e => e.ifcType === elemObj.ifcType);
                criteria.push({
                    key: 'ifcType',
                    icon: '🏛️',
                    title: 'Entidad IFC',
                    detail: elemObj.ifcType,
                    ids: matches.map(getEid)
                });
            }

            return criteria;
        },

        /**
         * Renderiza dinámicamente las opciones de similitud en el submenú contextual
         */
        _renderSimilarSubmenu: function (elemObj, expressId) {
            const submenu = document.getElementById('v3dCtxSimilarSubmenu');
            if (!submenu) return;

            const criteria = this._buildSimilarCriteria(elemObj, expressId);
            if (!criteria || criteria.length === 0) {
                submenu.innerHTML = '<div style="padding:10px; color:#94a3b8; font-size:0.72rem; text-align:center;">Sin criterios de similitud disponibles</div>';
                return;
            }

            let html = '';
            criteria.forEach(crit => {
                const count = crit.ids.length;
                html += `
                    <button type="button" class="v3d-ctx-submenu-item" data-key="${crit.key}">
                        <div class="v3d-ctx-submenu-left">
                            <span class="v3d-ctx-submenu-icon">${crit.icon}</span>
                            <div class="v3d-ctx-submenu-label-box">
                                <span class="v3d-ctx-submenu-title">${crit.title}</span>
                                <span class="v3d-ctx-submenu-detail" title="${crit.detail}">${crit.detail}</span>
                            </div>
                        </div>
                        <span class="v3d-submenu-badge">${count}</span>
                    </button>
                `;
            });

            submenu.innerHTML = html;

            // Enlazar eventos de clic para seleccionar el grupo
            submenu.querySelectorAll('.v3d-ctx-submenu-item').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    const key = btn.getAttribute('data-key');
                    const crit = criteria.find(c => c.key === key);
                    if (crit) {
                        this.selectSimilar(crit.key, crit.ids, crit);
                    }
                };
            });
        },

        /**
         * Ejecuta la selección masiva de elementos similares por un criterio dado
         */
        selectSimilar: function (criterionKey, ids, criterionInfo) {
            const uniqueIds = [...new Set(ids)].map(id => parseInt(id, 10)).filter(id => !isNaN(id));
            if (uniqueIds.length === 0) return;

            this.selectedExpressIds = uniqueIds;
            this.selectedSimilarityCriterion = criterionInfo;

            // Resaltar en cian neón todos los elementos coincidentes
            this.highlightElements(uniqueIds, false);

            // Mostrar el panel lateral con la ficha de selección múltiple
            this.showMultiElementCard(uniqueIds, criterionInfo);

            // Cerrar menú contextual
            this.hideContextMenu();

            // Actualizar etiqueta en la barra superior
            const label = document.getElementById('v3dSelectedLabel');
            if (label) {
                label.textContent = `🎯 ${uniqueIds.length} elementos seleccionados (${criterionInfo ? criterionInfo.title : 'Similares'})`;
            }
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
            const isolateBtn = document.getElementById('v3dCtxIsolateBtn');
            const hideBtn = document.getElementById('v3dCtxHideBtn');
            const focusBtn = document.getElementById('v3dCtxFocusBtn');

            const isMulti = this.selectedExpressIds && this.selectedExpressIds.length > 1;

            if (isMulti) {
                if (titleEl) titleEl.textContent = `📦 ${this.selectedExpressIds.length} seleccionados`;
                if (iconEl) iconEl.textContent = '📦';
                if (isolateBtn) {
                    const lbl = isolateBtn.querySelector('.v3d-ctx-item-label');
                    if (lbl) lbl.textContent = `Aislar selección (${this.selectedExpressIds.length})`;
                }
                if (hideBtn) {
                    const lbl = hideBtn.querySelector('.v3d-ctx-item-label');
                    if (lbl) lbl.textContent = `Ocultar selección (${this.selectedExpressIds.length})`;
                }
                if (focusBtn) {
                    const lbl = focusBtn.querySelector('.v3d-ctx-item-label');
                    if (lbl) lbl.textContent = 'Centrar selección';
                }
            } else {
                const displayTitle = this._formatDisplayTitle(elemObj, expressId);
                const icon = this._getElementIcon(elemObj);
                if (titleEl) titleEl.textContent = displayTitle;
                if (iconEl) iconEl.textContent = icon;
                if (isolateBtn) {
                    const lbl = isolateBtn.querySelector('.v3d-ctx-item-label');
                    if (lbl) lbl.textContent = 'Aislar elemento';
                }
                if (hideBtn) {
                    const lbl = hideBtn.querySelector('.v3d-ctx-item-label');
                    if (lbl) lbl.textContent = 'Ocultar elemento';
                }
                if (focusBtn) {
                    const lbl = focusBtn.querySelector('.v3d-ctx-item-label');
                    if (lbl) lbl.textContent = 'Centrar elemento';
                }
            }

            if (subEl) {
                subEl.textContent = '';
                subEl.style.display = 'none';
            }

            // Renderizar criterios de similitud en el submenú dinámico
            this._renderSimilarSubmenu(elemObj, expressId);

            // Ocultar submenú al abrir el menú principal
            const submenu = document.getElementById('v3dCtxSimilarSubmenu');
            if (submenu) submenu.style.display = 'none';
            const similarWrapper = document.getElementById('v3dCtxSimilarWrapper');
            if (similarWrapper) similarWrapper.classList.remove('open');

            // Calcular posición respecto al contenedor relativo del canvas
            const containerRect = this.container.getBoundingClientRect();
            let posX = clientX - containerRect.left + 14;
            let posY = clientY - containerRect.top + 14;

            const menuWidth = 250;
            const menuHeight = 250;

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
            const submenu = document.getElementById('v3dCtxSimilarSubmenu');
            if (submenu) submenu.style.display = 'none';
            const similarWrapper = document.getElementById('v3dCtxSimilarWrapper');
            if (similarWrapper) similarWrapper.classList.remove('open');
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
                    if (this.selectedExpressIds && this.selectedExpressIds.length > 1) {
                        this.isolateElements(this.selectedExpressIds);
                    } else if (this.selectedExpressId) {
                        this.isolateElement(this.selectedExpressId);
                    }
                };
            }

            if (hideBtn) {
                hideBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (this.selectedExpressIds && this.selectedExpressIds.length > 1) {
                        this.hideElements(this.selectedExpressIds);
                    } else if (this.selectedExpressId) {
                        this.hideElement(this.selectedExpressId);
                    }
                };
            }

            if (focusBtn) {
                focusBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (this.selectedExpressIds && this.selectedExpressIds.length > 1) {
                        this.focusElements(this.selectedExpressIds);
                    } else if (this.selectedExpressId) {
                        this.focusElement(this.selectedExpressId);
                    }
                };
            }

            if (restoreBtn) {
                restoreBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.restoreView();
                };
            }

            // Eventos para el submenú de Seleccionar Similares
            const similarWrapper = document.getElementById('v3dCtxSimilarWrapper');
            const similarBtn = document.getElementById('v3dCtxSimilarBtn');
            const similarSubmenu = document.getElementById('v3dCtxSimilarSubmenu');

            if (similarWrapper && similarSubmenu) {
                const showSub = () => {
                    similarSubmenu.style.display = 'flex';
                    similarWrapper.classList.add('open');
                    const containerRect = this.container ? this.container.getBoundingClientRect() : { width: window.innerWidth, right: window.innerWidth };
                    const menuRect = menu.getBoundingClientRect();
                    if (menuRect.right + 280 > containerRect.right) {
                        similarSubmenu.classList.add('to-left');
                    } else {
                        similarSubmenu.classList.remove('to-left');
                    }
                };

                const hideSub = () => {
                    similarSubmenu.style.display = 'none';
                    similarWrapper.classList.remove('open');
                };

                similarWrapper.addEventListener('mouseenter', showSub);
                similarWrapper.addEventListener('mouseleave', hideSub);

                if (similarBtn) {
                    similarBtn.onclick = (e) => {
                        e.stopPropagation();
                        if (similarSubmenu.style.display === 'none') showSub();
                        else hideSub();
                    };
                }
            }

            // Cerrar menú contextual si se hace clic fuera en cualquier parte del documento
            document.addEventListener('pointerdown', (e) => {
                if (!e.target.closest('#v3dContextMenu') && menu.style.display !== 'none') {
                    this.hideContextMenu();
                }
            });
        },

        /**
         * Enfoca y centra la cámara orbital sobre un elemento individual
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
                this.focusElements([expressId]);
            }

            this.hideContextMenu();
        },

        /**
         * Enfoca y centra la cámara orbital sobre un grupo de elementos
         */
        focusElements: function (ids) {
            const targetMesh = (this.isIsolated && this.isolatedSubset) ? this.isolatedSubset : this.highlightSubset;
            if (!targetMesh || !this.camera || !this.controls) return;

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
                    this.camera.position.copy(center.clone().add(dir.multiplyScalar(maxDim * 2.5)));
                    this.camera.lookAt(center);
                    this.controls.update();
                } else {
                    const fov = (this.perspectiveCamera ? this.perspectiveCamera.fov : 45) * (Math.PI / 180);
                    let cameraDist = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.8;
                    if (isNaN(cameraDist) || cameraDist < 4) cameraDist = 8;

                    const dir = this.camera.position.clone().sub(this.controls.target).normalize();
                    if (dir.lengthSq() === 0) dir.set(1, 1, 1).normalize();

                    this.camera.position.copy(center.clone().add(dir.multiplyScalar(cameraDist)));
                    this.camera.lookAt(center);
                    this.controls.target.copy(center);
                    this.controls.update();
                }
            }
            this.hideContextMenu();
        },

        /**
         * Aísla el elemento seleccionado ocultando todo lo demás
         */
        isolateElement: function (idOrGlobalId) {
            let expressId = this._resolveExpressId(idOrGlobalId) || this.selectedExpressId;
            if (!expressId) return;
            this.isolateElements([expressId]);
        },

        /**
         * Aísla un grupo de elementos ocultando el resto del modelo
         */
        isolateElements: function (ids) {
            if (!ids || ids.length === 0 || !this.ifcModel || !this.ifcLoader || !this.ifcLoader.ifcManager) return;

            const validIds = ids.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
            if (validIds.length === 0) return;

            // 1. Limpiar cualquier resaltado y aislamiento previo
            this.resetHighlight();
            this._clearIsolatedSubset();

            // 2. Ocultar todas las categorías del modelo
            Object.values(this.categorySubsets).forEach(sub => {
                if (sub && sub.mesh) {
                    sub.mesh.visible = false;
                }
            });

            // 3. Crear subset exclusivo para el grupo aislado con estilo Blueprint
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
                side: THREE.DoubleSide
            });

            try {
                this.isolatedSubset = this.ifcLoader.ifcManager.createSubset({
                    modelID: this.ifcModel.modelID,
                    ids: validIds,
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
                    this._attachBlueprintDecorations(this.isolatedSubset, planes, true);
                }
            } catch (err) {
                console.warn("IFCViewer3D: Error creando subset aislado:", err);
            }

            this.isIsolated = true;
            this.isolatedExpressId = validIds.length === 1 ? validIds[0] : null;
            this.isolatedExpressIds = validIds;

            // Sincronizar tapas macizas con los elementos aislados
            if (this.activeClippingPlane) {
                this._lastStencilKey = null;
                const axis = this.sectionConfig.active ? this.sectionConfig.axis : 'Y';
                const val = this.sectionConfig.active ? this.sectionConfig.value : 0;
                const inv = this.sectionConfig.active ? this.sectionConfig.inverted : false;
                this._updateSectionCaps(axis, val, inv);
            }

            // 4. Centrar y enfocar en el grupo aislado
            if (this.isolatedSubset && this.camera && this.controls) {
                this.focusElements(validIds);
            }

            // 5. Ocultar menú contextual
            this.hideContextMenu();

            // 6. Actualizar barra de información
            const label = document.getElementById('v3dSelectedLabel');
            if (label) {
                if (validIds.length === 1) {
                    const elemObj = this.expressIdToElementMap[validIds[0]];
                    const displayTitle = this._formatDisplayTitle(elemObj, validIds[0]);
                    label.textContent = `👁️‍🗨️ Elemento Aislado: ${displayTitle} (Pulsa 'Restaurar' para volver)`;
                } else {
                    label.textContent = `👁️‍🗨️ ${validIds.length} Elementos Aislados (Pulsa 'Restaurar' para volver)`;
                }
            }
        },

        /**
         * Oculta el elemento específico de la escena
         */
        hideElement: function (idOrGlobalId) {
            let expressId = this._resolveExpressId(idOrGlobalId) || this.selectedExpressId;
            if (!expressId) return;
            this.hideElements([expressId]);
        },

        /**
         * Oculta un grupo de elementos de la escena
         */
        hideElements: function (ids) {
            if (!ids || ids.length === 0 || !this.ifcModel) return;

            const validIds = ids.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
            if (validIds.length === 0) return;

            validIds.forEach(id => this.hiddenElementIds.add(id));

            // Si estábamos en modo aislado y se ocultan los elementos aislados, restaurar vista
            if (this.isIsolated && this.isolatedExpressIds && this.isolatedExpressIds.some(id => validIds.includes(id))) {
                this.restoreView();
                return;
            }

            // Buscar categorías afectadas y reconstruir
            for (const key in this.categorySubsets) {
                const cat = this.categorySubsets[key];
                if (cat && cat.ids) {
                    const hasHidden = cat.ids.some(id => validIds.includes(id));
                    if (hasHidden) {
                        const remainingIds = cat.ids.filter(id => !this.hiddenElementIds.has(id));
                        if (remainingIds.length === 0) {
                            cat.mesh.visible = false;
                        } else {
                            this._rebuildCategorySubset(key, remainingIds);
                        }
                    }
                }
            }

            // Deseleccionar si coincide con la selección activa
            this.resetHighlight();
            this.hideContextMenu();

            const label = document.getElementById('v3dSelectedLabel');
            if (label) {
                label.textContent = `🚫 ${validIds.length} elementos ocultados (${this.hiddenElementIds.size} ocultados en total · Pulsa 'Restaurar vista')`;
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

                    // Sincronizar tapas macizas si el plano de sección está activo
                    if (this.activeClippingPlane) {
                        this._lastStencilKey = null;
                        const axis = this.sectionConfig.active ? this.sectionConfig.axis : 'Y';
                        const val = this.sectionConfig.active ? this.sectionConfig.value : 0;
                        const inv = this.sectionConfig.active ? this.sectionConfig.inverted : false;
                        this._updateSectionCaps(axis, val, inv);
                    }
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
        },

        /**
         * Renderiza una probeta 3D axonométrica interactiva del elemento multicapa.
         * Muestra la estratigrafía volumétrica con caras 3D, texturas constructivas, indicación
         * clara de CARA EXTERIOR e INTERIOR, elevación dinámica de capa en hover y cotas en mm.
         */
        _renderIsometricMultilayer: function(canvas, layers, activeIdx, isHorizontal) {
            if (!canvas || !layers || layers.length === 0) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const dpr = window.devicePixelRatio || 1;
            const w = canvas.clientWidth || 340;
            const h = canvas.clientHeight || 128;

            if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
                canvas.width = Math.round(w * dpr);
                canvas.height = Math.round(h * dpr);
            }

            ctx.save();
            ctx.scale(dpr, dpr);
            ctx.clearRect(0, 0, w, h);

            // 1. Fondo técnico Blueprint con cuadrícula sutil
            const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
            bgGrad.addColorStop(0, '#0a1022');
            bgGrad.addColorStop(1, '#060a17');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, w, h);

            // Rejilla de fondo
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
            ctx.lineWidth = 1;
            for (let x = 15; x < w; x += 20) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, h);
                ctx.stroke();
            }
            for (let y = 15; y < h; y += 20) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(w, y);
                ctx.stroke();
            }

            const totalThickM = layers.reduce((sum, l) => sum + (l.thickness || 0), 0);
            const totalThickMm = Math.round(totalThickM * 1000) || 300;

            // Paleta y tramas de materiales constructivos
            const getMatStyle = (matName, isExt, isInt) => {
                const mn = (matName || '').toLowerCase();
                if (mn.includes('ladrillo') || mn.includes('fábrica') || mn.includes('fabrica') || mn.includes('tocho') || mn.includes('termoarcilla') || mn.includes('perforado') || mn.includes('bovedilla')) {
                    return { base: '#c2410c', top: '#ea580c', side: '#9a3412', pattern: 'brick', name: 'Ladrillo / Bovedilla' };
                }
                if (mn.includes('aisl') || mn.includes('xps') || mn.includes('eps') || mn.includes('lana') || mn.includes('poliuretano') || mn.includes('mineral')) {
                    return { base: '#eab308', top: '#fde047', side: '#ca8a04', pattern: 'insul', name: 'Aislamiento Térmico' };
                }
                if (mn.includes('aire') || mn.includes('cámara') || mn.includes('camara') || mn.includes('ventilada')) {
                    return { base: 'rgba(56, 189, 248, 0.22)', top: 'rgba(56, 189, 248, 0.4)', side: 'rgba(14, 116, 144, 0.3)', pattern: 'air', name: 'Cámara de Aire' };
                }
                if (mn.includes('yeso') || mn.includes('enlucido') || mn.includes('guarnecido') || mn.includes('pintura')) {
                    return { base: '#e2e8f0', top: '#f8fafc', side: '#cbd5e1', pattern: 'smooth', name: 'Acabado Interior' };
                }
                if (mn.includes('placa') || mn.includes('pyl') || mn.includes('pladur') || mn.includes('cartón') || mn.includes('carton') || mn.includes('trasdosado') || mn.includes('techo')) {
                    return { base: '#94a3b8', top: '#cbd5e1', side: '#64748b', pattern: 'board', name: 'Placa Yeso / Falso Techo' };
                }
                if (mn.includes('mortero') || mn.includes('cemento') || mn.includes('enfoscado') || mn.includes('hormigón') || mn.includes('hormigon') || mn.includes('chapa') || mn.includes('compresion') || mn.includes('forjado')) {
                    return { base: '#64748b', top: '#94a3b8', side: '#475569', pattern: 'concrete', name: 'Hormigón / Mortero' };
                }
                if (mn.includes('pavimento') || mn.includes('baldosa') || mn.includes('gres') || mn.includes('tarima') || mn.includes('madera') || mn.includes('parquet')) {
                    return { base: '#b45309', top: '#d97706', side: '#78350f', pattern: 'wood', name: 'Pavimento' };
                }
                if (mn.includes('piedra') || mn.includes('granito') || mn.includes('mármol') || mn.includes('marmol') || mn.includes('pizarra')) {
                    return { base: '#475569', top: '#64748b', side: '#334155', pattern: 'stone', name: 'Piedra Natural' };
                }
                if (mn.includes('impermeabiliz') || mn.includes('asfalt') || mn.includes('lamina') || mn.includes('lámina') || mn.includes('epdm')) {
                    return { base: '#334155', top: '#475569', side: '#1e293b', pattern: 'smooth', name: 'Lámina Impermeabilizante' };
                }
                if (isExt) {
                    return { base: '#d97706', top: '#fbbf24', side: '#b45309', pattern: 'facade', name: 'Rev. Exterior / Pavimento' };
                }
                if (isInt) {
                    return { base: '#38bdf8', top: '#7dd3fc', side: '#0284c7', pattern: 'smooth', name: 'Rev. Interior / Techo' };
                }
                return { base: '#0284c7', top: '#38bdf8', side: '#0369a1', pattern: 'hatch', name: matName };
            };

            if (isHorizontal) {
                // =========================================================================
                // A) MODO FORJADO / CUBIERTA / PAVIMENTO (Giro 90°: Exterior Arriba, Interior Abajo)
                // =========================================================================
                const badgeW = 72;
                const badgeH = 18;
                const depth = 22;
                const D_projX = Math.round(depth * 0.707);            // Fuga Caballera a 45° (X) ~16px
                const D_projY = Math.round(depth * 0.707);            // Fuga Caballera a 45° (Y) ~16px
                const gapLeft = 10;
                const gapRight = 10;
                const cotaTextW = 46;                                 // Ancho estimado para texto 'e = XXX mm'

                // Cálculo óptico de centrado simétrico global: [Badges Izq] + [Bloque 3D] + [Cota Dcha]
                const nonBlockW = badgeW + gapLeft + D_projX + gapRight + cotaTextW;
                const W_block = Math.max(110, Math.min(180, w - nonBlockW - 24)); // Ancho frontal del forjado adaptativo
                const totalCompW = badgeW + gapLeft + W_block + D_projX + gapRight + cotaTextW;
                const startX = Math.max(6, Math.round((w - totalCompW) / 2));

                const ox = startX + badgeW + gapLeft;
                const H_thick = Math.min(Math.round(h * 0.48), 62);  // Espesor total en vertical acotado a 128px
                const oy = Math.round((h - H_thick + D_projY) / 2);  // Centrado vertical exacto

                const minH = Math.max(7, Math.floor(H_thick / (layers.length * 2.2)));
                let rawHeights = layers.map(l => {
                    const ratio = totalThickM > 0 ? ((l.thickness || 0.01) / totalThickM) : (1 / layers.length);
                    return Math.max(minH, ratio * H_thick);
                });
                const sumRawH = rawHeights.reduce((a, b) => a + b, 0);
                const heights = rawHeights.map(rh => (rh / sumRawH) * H_thick);

                this._layerPolygons = [];
                let currentY = 0;

                const layerGeoms = layers.map((layer, idx) => {
                    const isExt = (idx === 0);
                    const isInt = (idx === layers.length - 1);
                    const y0 = currentY;
                    const y1 = currentY + heights[idx];
                    currentY = y1;

                    const isHovered = (activeIdx === idx);
                    const liftY = isHovered ? 6 : 0; // Elevación vertical sutil en hover

                    // Coordenadas frontales (sección transversal perpendicular 100% CAD)
                    const fTL = { x: ox, y: oy + y0 - liftY };
                    const fTR = { x: ox + W_block, y: oy + y0 - liftY };
                    const fBR = { x: ox + W_block, y: oy + y1 - liftY };
                    const fBL = { x: ox, y: oy + y1 - liftY };

                    // Coordenadas posteriores (Fuga Caballera a 45°)
                    const bTL = { x: fTL.x + D_projX, y: fTL.y - D_projY };
                    const bTR = { x: fTR.x + D_projX, y: fTR.y - D_projY };
                    const bBR = { x: fBR.x + D_projX, y: fBR.y - D_projY };
                    const bBL = { x: fBL.x + D_projX, y: fBL.y - D_projY };

                    const style = getMatStyle(layer.materialName, isExt, isInt);
                    const thickMm = Math.round((layer.thickness || 0) * 1000);

                    // Polígono de detección interactiva
                    const poly = isExt
                        ? [[fBL.x, fBL.y], [fTL.x, fTL.y], [bTL.x, bTL.y], [bTR.x, bTR.y], [bBR.x, bBR.y], [fBR.x, fBR.y]]
                        : [[fBL.x, fBL.y], [fTL.x, fTL.y], [fTR.x, fTR.y], [bTR.x, bTR.y], [bBR.x, bBR.y], [fBR.x, fBR.y]];

                    return {
                        layer,
                        idx,
                        isExt,
                        isInt,
                        isHovered,
                        liftY,
                        thickMm,
                        style,
                        fBL, fBR, fTR, fTL,
                        bTL, bTR, bBR, bBL,
                        poly
                    };
                });

                this._layerPolygons = layerGeoms.map(lg => ({
                    index: lg.idx,
                    poly: lg.poly,
                    layer: lg.layer,
                    thickMm: lg.thickMm
                }));

                // Sombra si hay capa elevada
                layerGeoms.forEach(lg => {
                    if (lg.isHovered) {
                        ctx.save();
                        ctx.beginPath();
                        ctx.rect(lg.fBL.x, lg.fBL.y + 2, W_block + D_projX, 4);
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
                        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
                        ctx.shadowBlur = 6;
                        ctx.fill();
                        ctx.restore();
                    }
                });

                // Dibujar capas ordenadas (no-hovered primero, hovered al final)
                const sortedGeoms = [...layerGeoms].sort((a, b) => (a.isHovered ? 1 : 0) - (b.isHovered ? 1 : 0));

                sortedGeoms.forEach(lg => {
                    const { style, isHovered, fBL, fBR, fTR, fTL, bTL, bTR, bBR, bBL, isExt } = lg;

                    // 1. CARA SUPERIOR (Canto superior / superficie)
                    if (isExt || isHovered) {
                        ctx.save();
                        ctx.beginPath();
                        ctx.moveTo(fTL.x, fTL.y);
                        ctx.lineTo(bTL.x, bTL.y);
                        ctx.lineTo(bTR.x, bTR.y);
                        ctx.lineTo(fTR.x, fTR.y);
                        ctx.closePath();
                        ctx.fillStyle = isHovered ? '#38bdf8' : style.top;
                        ctx.fill();

                        ctx.strokeStyle = isHovered ? '#ffffff' : 'rgba(255, 255, 255, 0.35)';
                        ctx.lineWidth = isHovered ? 1.5 : 0.8;
                        ctx.stroke();
                        ctx.restore();
                    }

                    // 2. CARA LATERAL DERECHA (Canto del forjado fugando a 45°)
                    ctx.save();
                    ctx.beginPath();
                    ctx.moveTo(fTR.x, fTR.y);
                    ctx.lineTo(bTR.x, bTR.y);
                    ctx.lineTo(bBR.x, bBR.y);
                    ctx.lineTo(fBR.x, fBR.y);
                    ctx.closePath();
                    ctx.fillStyle = isHovered ? '#0284c7' : style.side;
                    ctx.fill();

                    ctx.strokeStyle = isHovered ? '#ffffff' : 'rgba(255, 255, 255, 0.25)';
                    ctx.lineWidth = isHovered ? 1.5 : 0.8;
                    ctx.stroke();
                    ctx.restore();

                    // 3. CARA LATERAL IZQUIERDA (si está elevada en hover)
                    if (isHovered) {
                        ctx.save();
                        ctx.beginPath();
                        ctx.moveTo(fBL.x, fBL.y);
                        ctx.lineTo(fTL.x, fTL.y);
                        ctx.lineTo(bTL.x, bTL.y);
                        ctx.lineTo(bBL.x, bBL.y);
                        ctx.closePath();
                        ctx.fillStyle = style.side;
                        ctx.fill();

                        ctx.strokeStyle = '#ffffff';
                        ctx.lineWidth = 1.2;
                        ctx.stroke();
                        ctx.restore();
                    }

                    // 4. CARA FRONTAL: SECCIÓN 100% PERPENDICULAR (Rectángulo en Verdadera Magnitud)
                    ctx.save();
                    const rectW = fBR.x - fBL.x;
                    const rectH = fBL.y - fTL.y;

                    ctx.beginPath();
                    ctx.rect(fTL.x, fTL.y, rectW, rectH);
                    ctx.fillStyle = isHovered ? 'rgba(56, 189, 248, 0.9)' : style.base;
                    ctx.fill();

                    // Tramas constructivas según tipología
                    ctx.save();
                    ctx.clip();

                    if (style.pattern === 'concrete') {
                        // Hormigón / mortero en forjados
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                        for (let px = fTL.x + 10; px < fBR.x; px += 18) {
                            ctx.fillRect(px, fTL.y + rectH * 0.35, 2, 2);
                            ctx.fillRect(px + 8, fTL.y + rectH * 0.65, 1.5, 1.5);
                        }
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
                        ctx.lineWidth = 0.8;
                        for (let px = fTL.x + 14; px < fBR.x; px += 24) {
                            ctx.beginPath();
                            ctx.moveTo(px, fTL.y + rectH * 0.2);
                            ctx.lineTo(px + 4, fTL.y + rectH * 0.8);
                            ctx.stroke();
                        }
                    } else if (style.pattern === 'brick') {
                        // Bovedillas cerámicas
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                        ctx.lineWidth = 0.8;
                        for (let x = fTL.x + 16; x < fBR.x; x += 16) {
                            ctx.beginPath();
                            ctx.moveTo(x, fTL.y);
                            ctx.lineTo(x, fBL.y);
                            ctx.stroke();
                        }
                    } else if (style.pattern === 'insul') {
                        // Aislamiento (zigzag horizontal)
                        ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
                        ctx.lineWidth = 1.2;
                        const midY = (fTL.y + fBL.y) / 2;
                        ctx.beginPath();
                        ctx.moveTo(fTL.x, midY);
                        let zig = false;
                        for (let x = fTL.x + 4; x < fBR.x; x += 4) {
                            const y = midY + (zig ? 2.5 : -2.5);
                            ctx.lineTo(x, y);
                            zig = !zig;
                        }
                        ctx.lineTo(fBR.x, midY);
                        ctx.stroke();
                    } else if (style.pattern === 'air') {
                        // Cámara de aire / falso techo
                        ctx.strokeStyle = '#38bdf8';
                        ctx.lineWidth = 1;
                        ctx.setLineDash([4, 4]);
                        const midY = (fTL.y + fBL.y) / 2;
                        ctx.beginPath();
                        ctx.moveTo(fTL.x, midY);
                        ctx.lineTo(fBR.x, midY);
                        ctx.stroke();
                    } else if (style.pattern === 'wood') {
                        // Tarima / pavimento
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
                        ctx.lineWidth = 0.8;
                        for (let x = fTL.x + 22; x < fBR.x; x += 22) {
                            ctx.beginPath();
                            ctx.moveTo(x, fTL.y);
                            ctx.lineTo(x, fBL.y);
                            ctx.stroke();
                        }
                    }

                    ctx.restore();

                    // Contorno frontal nítido
                    ctx.strokeStyle = isHovered ? '#ffffff' : 'rgba(255, 255, 255, 0.5)';
                    ctx.lineWidth = isHovered ? 2 : 1;
                    ctx.stroke();

                    if (isHovered) {
                        ctx.strokeStyle = '#38bdf8';
                        ctx.lineWidth = 2.5;
                        ctx.stroke();
                    }
                    ctx.restore();

                    // Número identificativo de capa
                    ctx.save();
                    const centerX = (fTL.x + fBR.x) / 2;
                    const centerY = (fTL.y + fBL.y) / 2;
                    ctx.fillStyle = isHovered ? '#ffffff' : (style.pattern === 'insul' || style.pattern === 'smooth' ? '#0f172a' : '#ffffff');
                    ctx.font = 'bold 9px system-ui, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(`${lg.idx + 1}`, centerX, centerY);
                    ctx.restore();
                });

                // CARTELAS: ☀️ EXTERIOR (Arriba) y 🏠 INTERIOR (Abajo) en margen izquierdo centrado
                const extGeom = layerGeoms[0];
                const intGeom = layerGeoms[layerGeoms.length - 1];
                if (extGeom && intGeom) {
                    const callXExt = startX;
                    const callXInt = startX;

                    // A) EXTERIOR (Arriba, alineada a la capa 0)
                    const midYExt = (extGeom.fTL.y + extGeom.fBL.y) / 2;
                    const callYExt = Math.round(midYExt - badgeH / 2);

                    ctx.save();
                    // Línea directriz horizontal hacia la capa 0
                    ctx.strokeStyle = '#fbbf24';
                    ctx.lineWidth = 1.2;
                    ctx.setLineDash([2, 2]);
                    ctx.beginPath();
                    ctx.moveTo(callXExt + badgeW, midYExt);
                    ctx.lineTo(ox - 3, midYExt);
                    ctx.stroke();
                    ctx.setLineDash([]);

                    // Punto snap
                    ctx.fillStyle = '#fbbf24';
                    ctx.beginPath();
                    ctx.arc(ox - 3, midYExt, 2.5, 0, Math.PI * 2);
                    ctx.fill();

                    // Insignia EXTERIOR
                    ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
                    ctx.strokeStyle = '#fbbf24';
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    if (ctx.roundRect) ctx.roundRect(callXExt, callYExt, badgeW, badgeH, 4);
                    else ctx.rect(callXExt, callYExt, badgeW, badgeH);
                    ctx.fill();
                    ctx.stroke();

                    ctx.fillStyle = '#fbbf24';
                    ctx.font = 'bold 8px system-ui, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('☀️ EXTERIOR', callXExt + badgeW / 2, callYExt + badgeH / 2);
                    ctx.restore();

                    // B) INTERIOR (Abajo, alineada a la capa N-1)
                    const midYInt = (intGeom.fTL.y + intGeom.fBL.y) / 2;
                    const callYInt = Math.round(midYInt - badgeH / 2);

                    ctx.save();
                    // Línea directriz horizontal hacia la capa N-1
                    ctx.strokeStyle = '#38bdf8';
                    ctx.lineWidth = 1.2;
                    ctx.setLineDash([2, 2]);
                    ctx.beginPath();
                    ctx.moveTo(callXInt + badgeW, midYInt);
                    ctx.lineTo(ox - 3, midYInt);
                    ctx.stroke();
                    ctx.setLineDash([]);

                    // Punto snap
                    ctx.fillStyle = '#38bdf8';
                    ctx.beginPath();
                    ctx.arc(ox - 3, midYInt, 2.5, 0, Math.PI * 2);
                    ctx.fill();

                    // Insignia INTERIOR
                    ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
                    ctx.strokeStyle = '#38bdf8';
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    if (ctx.roundRect) ctx.roundRect(callXInt, callYInt, badgeW, badgeH, 4);
                    else ctx.rect(callXInt, callYInt, badgeW, badgeH);
                    ctx.fill();
                    ctx.stroke();

                    ctx.fillStyle = '#38bdf8';
                    ctx.font = 'bold 8px system-ui, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('🏠 INTERIOR', callXInt + badgeW / 2, callYInt + badgeH / 2);
                    ctx.restore();

                    // C) COTA TÉCNICA DE ESPESOR TOTAL (Vertical en margen derecho perfectamente equilibrado)
                    ctx.save();
                    const dimX = ox + W_block + D_projX + gapRight;
                    const dimY0 = extGeom.fTL.y;
                    const dimY1 = intGeom.fBL.y;

                    ctx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
                    ctx.lineWidth = 1;

                    // Líneas de referencia horizontales
                    ctx.beginPath();
                    ctx.moveTo(ox + W_block + 3, dimY0);
                    ctx.lineTo(dimX + 3, dimY0);
                    ctx.moveTo(ox + W_block + 3, dimY1);
                    ctx.lineTo(dimX + 3, dimY1);
                    ctx.stroke();

                    // Línea de cota vertical
                    ctx.beginPath();
                    ctx.moveTo(dimX, dimY0);
                    ctx.lineTo(dimX, dimY1);
                    ctx.stroke();

                    // Flechas técnicas verticales
                    const vArrow = (y, dir) => {
                        ctx.beginPath();
                        ctx.moveTo(dimX, y);
                        ctx.lineTo(dimX - 2.5, y + dir * 4);
                        ctx.lineTo(dimX + 2.5, y + dir * 4);
                        ctx.closePath();
                        ctx.fillStyle = 'rgba(148, 163, 184, 0.9)';
                        ctx.fill();
                    };
                    vArrow(dimY0, 1);
                    vArrow(dimY1, -1);

                    // Texto de cota
                    ctx.fillStyle = '#e2e8f0';
                    ctx.font = '600 8.5px "JetBrains Mono", monospace';
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(`e = ${totalThickMm} mm`, dimX + 5, (dimY0 + dimY1) / 2);
                    ctx.restore();
                }
            } else {
                // =========================================================================
                // B) MODO MURO / CERRAMIENTO VERTICAL (Exterior Izquierda, Interior Derecha)
                // =========================================================================
                const badgeW = 70;
                const badgeH = 18;
                const depth = 22;                                     // Profundidad caballera
                const D_projX = Math.round(depth * 0.707);            // Fuga a 45° (X) ~16px
                const D_projY = Math.round(depth * 0.707);            // Fuga a 45° (Y) ~16px
                const gapL = 8;
                const gapR = 8;

                // Ancho del bloque ajustado para encajar con las dos cartelas a los lados
                const nonWallW = badgeW * 2 + gapL + gapR + D_projX;
                const W_thick = Math.max(105, Math.min(155, w - nonWallW - 20)); // Ancho frontal del muro
                const H_block = 64;                                   // Altura del corte de muro acotada a 128px

                // Centrado simétrico horizontal: [Badge Ext] + [Bloque Muro] + [Badge Int]
                const totalCompW = badgeW + gapL + W_thick + D_projX + gapR + badgeW;
                const startX = Math.max(6, Math.round((w - totalCompW) / 2));

                const callXExt = startX;
                const ox = startX + badgeW + gapL;
                const callXInt = ox + W_thick + D_projX + gapR;
                const oy = Math.round(h * 0.78);                      // ~100px en canvas h=128

                // Calcular ancho proporcional de cada capa garantizando un mínimo visible
                const minW = Math.max(8, Math.floor(W_thick / (layers.length * 2.2)));
                let rawWidths = layers.map(l => {
                    const ratio = totalThickM > 0 ? ((l.thickness || 0.01) / totalThickM) : (1 / layers.length);
                    return Math.max(minW, ratio * W_thick);
                });
                const sumRaw = rawWidths.reduce((a, b) => a + b, 0);
                const widths = rawWidths.map(rw => (rw / sumRaw) * W_thick);

                this._layerPolygons = [];
                let currentX = 0;

                const layerGeoms = layers.map((layer, idx) => {
                    const isExt = (idx === 0);
                    const isInt = (idx === layers.length - 1);
                    const x0 = currentX;
                    const x1 = currentX + widths[idx];
                    currentX = x1;

                    const isHovered = (activeIdx === idx);
                    const liftY = isHovered ? 6 : 0; // Elevación vertical en hover

                    // Coordenadas frontales (Verdadera Magnitud)
                    const fBL = { x: ox + x0, y: oy - liftY };
                    const fBR = { x: ox + x1, y: oy - liftY };
                    const fTR = { x: ox + x1, y: oy - H_block - liftY };
                    const fTL = { x: ox + x0, y: oy - H_block - liftY };

                    // Coordenadas posteriores (Fuga Caballera a 45°)
                    const bTL = { x: fTL.x + D_projX, y: fTL.y - D_projY };
                    const bTR = { x: fTR.x + D_projX, y: fTR.y - D_projY };
                    const bBR = { x: fBR.x + D_projX, y: fBR.y - D_projY };
                    const bBL = { x: fBL.x + D_projX, y: fBL.y - D_projY };

                    const style = getMatStyle(layer.materialName, isExt, isInt);
                    const thickMm = Math.round((layer.thickness || 0) * 1000);

                    // Polígono de detección interactiva
                    const poly = isInt
                        ? [[fTL.x, fTL.y], [bTL.x, bTL.y], [bTR.x, bTR.y], [bBR.x, bBR.y], [fBR.x, fBR.y], [fBL.x, fBL.y]]
                        : [[fTL.x, fTL.y], [bTL.x, bTL.y], [bTR.x, bTR.y], [fTR.x, fTR.y], [fBR.x, fBR.y], [fBL.x, fBL.y]];

                    return {
                        layer,
                        idx,
                        isExt,
                        isInt,
                        isHovered,
                        liftY,
                        thickMm,
                        style,
                        fBL, fBR, fTR, fTL,
                        bTL, bTR, bBR, bBL,
                        poly
                    };
                });

                this._layerPolygons = layerGeoms.map(lg => ({
                    index: lg.idx,
                    poly: lg.poly,
                    layer: lg.layer,
                    thickMm: lg.thickMm
                }));

                // Sombra suave de la base cuando hay una capa elevada
                layerGeoms.forEach(lg => {
                    if (lg.isHovered) {
                        ctx.save();
                        ctx.beginPath();
                        ctx.rect(lg.fBL.x, oy + 2, lg.fBR.x - lg.fBL.x, 3);
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
                        ctx.shadowBlur = 6;
                        ctx.fill();
                        ctx.restore();
                    }
                });

                // Dibujar capas constructivas
                layerGeoms.forEach(lg => {
                    const { style, isHovered, fBL, fBR, fTR, fTL, bTL, bTR, bBR, bBL, isExt, isInt } = lg;

                    // A) CARA SUPERIOR (Canto superior en caballera)
                    ctx.save();
                    ctx.beginPath();
                    ctx.moveTo(fTL.x, fTL.y);
                    ctx.lineTo(bTL.x, bTL.y);
                    ctx.lineTo(bTR.x, bTR.y);
                    ctx.lineTo(fTR.x, fTR.y);
                    ctx.closePath();
                    ctx.fillStyle = isHovered ? '#38bdf8' : style.top;
                    ctx.fill();

                    ctx.strokeStyle = isHovered ? '#ffffff' : 'rgba(255, 255, 255, 0.35)';
                    ctx.lineWidth = isHovered ? 1.5 : 0.8;
                    ctx.stroke();
                    ctx.restore();

                    // B) CARA LATERAL DERECHA (Cara interior del muro o lateral en hover)
                    if (isInt || isHovered) {
                        ctx.save();
                        ctx.beginPath();
                        ctx.moveTo(fBR.x, fBR.y);
                        ctx.lineTo(fTR.x, fTR.y);
                        ctx.lineTo(bTR.x, bTR.y);
                        ctx.lineTo(bBR.x, bBR.y);
                        ctx.closePath();
                        ctx.fillStyle = isHovered ? '#0284c7' : style.side;
                        ctx.fill();

                        ctx.strokeStyle = isHovered ? '#ffffff' : 'rgba(255, 255, 255, 0.25)';
                        ctx.lineWidth = isHovered ? 1.5 : 0.8;
                        ctx.stroke();
                        ctx.restore();
                    }

                    // C) CARA LATERAL IZQUIERDA (si está elevada en hover)
                    if (isHovered && !isExt) {
                        ctx.save();
                        ctx.beginPath();
                        ctx.moveTo(fBL.x, fBL.y);
                        ctx.lineTo(fTL.x, fTL.y);
                        ctx.lineTo(bTL.x, bTL.y);
                        ctx.lineTo(bBL.x, bBL.y);
                        ctx.closePath();
                        ctx.fillStyle = style.side;
                        ctx.fill();

                        ctx.strokeStyle = '#ffffff';
                        ctx.lineWidth = 1.2;
                        ctx.stroke();
                        ctx.restore();
                    }

                    // D) CARA FRONTAL: SECCIÓN TRANSVERSAL 100% PERPENDICULAR (Rectángulo perfecto)
                    ctx.save();
                    const rectW = fBR.x - fBL.x;
                    const rectH = fBL.y - fTL.y;

                    ctx.beginPath();
                    ctx.rect(fTL.x, fTL.y, rectW, rectH);
                    ctx.fillStyle = isHovered ? 'rgba(56, 189, 248, 0.9)' : style.base;
                    ctx.fill();

                    // Tramas arquitectónicas según material
                    ctx.save();
                    ctx.clip();

                    if (style.pattern === 'brick') {
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                        ctx.lineWidth = 0.8;
                        let row = 0;
                        for (let y = fTL.y + 5; y < fBL.y; y += 6) {
                            ctx.beginPath();
                            ctx.moveTo(fTL.x, y);
                            ctx.lineTo(fBR.x, y);
                            ctx.stroke();

                            const step = 12;
                            const offset = (row % 2) * (step / 2);
                            for (let x = fTL.x + offset; x < fBR.x; x += step) {
                                ctx.beginPath();
                                ctx.moveTo(x, y - 6);
                                ctx.lineTo(x, y);
                                ctx.stroke();
                            }
                            row++;
                        }
                    } else if (style.pattern === 'insul') {
                        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
                        ctx.lineWidth = 1.2;
                        const midX = (fTL.x + fBR.x) / 2;
                        ctx.beginPath();
                        ctx.moveTo(midX, fTL.y);
                        let zig = false;
                        for (let y = fTL.y + 4; y < fBL.y; y += 4) {
                            const x = midX + (zig ? 2.5 : -2.5);
                            ctx.lineTo(x, y);
                            zig = !zig;
                        }
                        ctx.lineTo(midX, fBL.y);
                        ctx.stroke();
                    } else if (style.pattern === 'air') {
                        ctx.strokeStyle = '#38bdf8';
                        ctx.lineWidth = 1;
                        ctx.setLineDash([3, 4]);
                        const midX = (fTL.x + fBR.x) / 2;
                        ctx.beginPath();
                        ctx.moveTo(midX, fTL.y);
                        ctx.lineTo(midX, fBL.y);
                        ctx.stroke();
                    } else if (style.pattern === 'concrete') {
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                        const cx = (fTL.x + fBR.x) / 2;
                        ctx.fillRect(cx - 2, fTL.y + 8, 2, 2);
                        ctx.fillRect(cx + 3, fTL.y + 20, 2, 2);
                        ctx.fillRect(cx - 3, fTL.y + 30, 2, 2);
                    }

                    ctx.restore();

                    ctx.strokeStyle = isHovered ? '#ffffff' : 'rgba(255, 255, 255, 0.5)';
                    ctx.lineWidth = isHovered ? 2 : 1;
                    ctx.stroke();

                    if (isHovered) {
                        ctx.strokeStyle = '#38bdf8';
                        ctx.lineWidth = 2.5;
                        ctx.stroke();
                    }
                    ctx.restore();

                    // Número de capa
                    ctx.save();
                    const centerX = (fTL.x + fBR.x) / 2;
                    const centerY = (fTL.y + fBL.y) / 2;
                    ctx.fillStyle = isHovered ? '#ffffff' : (style.pattern === 'insul' || style.pattern === 'smooth' ? '#0f172a' : '#ffffff');
                    ctx.font = 'bold 9px system-ui, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(`${lg.idx + 1}`, centerX, centerY);
                    ctx.restore();
                });

                // CARTELAS: ☀️ EXTERIOR e 🏠 INTERIOR (Alineadas en el eje horizontal del muro)
                const extGeom = layerGeoms[0];
                const intGeom = layerGeoms[layerGeoms.length - 1];
                if (extGeom && intGeom) {
                    const midY = Math.round(oy - H_block / 2);
                    const callYExt = Math.round(midY - badgeH / 2);
                    const callYInt = Math.round(midY - badgeH / 2);

                    // A) EXTERIOR (Izquierda)
                    ctx.save();
                    ctx.strokeStyle = '#fbbf24';
                    ctx.lineWidth = 1.2;
                    ctx.setLineDash([2, 2]);
                    ctx.beginPath();
                    ctx.moveTo(callXExt + badgeW, midY);
                    ctx.lineTo(ox - 3, midY);
                    ctx.stroke();
                    ctx.setLineDash([]);

                    ctx.fillStyle = '#fbbf24';
                    ctx.beginPath();
                    ctx.arc(ox - 3, midY, 2.5, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
                    ctx.strokeStyle = '#fbbf24';
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    if (ctx.roundRect) ctx.roundRect(callXExt, callYExt, badgeW, badgeH, 4);
                    else ctx.rect(callXExt, callYExt, badgeW, badgeH);
                    ctx.fill();
                    ctx.stroke();

                    ctx.fillStyle = '#fbbf24';
                    ctx.font = 'bold 8px system-ui, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('☀️ EXTERIOR', callXExt + badgeW / 2, callYExt + badgeH / 2);
                    ctx.restore();

                    // B) INTERIOR (Derecha)
                    ctx.save();
                    ctx.strokeStyle = '#38bdf8';
                    ctx.lineWidth = 1.2;
                    ctx.setLineDash([2, 2]);
                    ctx.beginPath();
                    ctx.moveTo(ox + W_thick + 3, midY);
                    ctx.lineTo(callXInt, midY);
                    ctx.stroke();
                    ctx.setLineDash([]);

                    ctx.fillStyle = '#38bdf8';
                    ctx.beginPath();
                    ctx.arc(ox + W_thick + 3, midY, 2.5, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
                    ctx.strokeStyle = '#38bdf8';
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    if (ctx.roundRect) ctx.roundRect(callXInt, callYInt, badgeW, badgeH, 4);
                    else ctx.rect(callXInt, callYInt, badgeW, badgeH);
                    ctx.fill();
                    ctx.stroke();

                    ctx.fillStyle = '#38bdf8';
                    ctx.font = 'bold 8px system-ui, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('🏠 INTERIOR', callXInt + badgeW / 2, callYInt + badgeH / 2);
                    ctx.restore();
                }

                // COTA TÉCNICA DE ESPESOR TOTAL (Base inferior 100% horizontal)
                if (extGeom && intGeom) {
                    ctx.save();
                    const dimY = oy + 12;
                    const dimX0 = extGeom.fBL.x;
                    const dimX1 = intGeom.fBR.x;

                    ctx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
                    ctx.lineWidth = 1;

                    ctx.beginPath();
                    ctx.moveTo(dimX0, extGeom.fBL.y + 2);
                    ctx.lineTo(dimX0, dimY + 3);
                    ctx.moveTo(dimX1, intGeom.fBR.y + 2);
                    ctx.lineTo(dimX1, dimY + 3);
                    ctx.stroke();

                    ctx.beginPath();
                    ctx.moveTo(dimX0, dimY);
                    ctx.lineTo(dimX1, dimY);
                    ctx.stroke();

                    const arrow = (x, dir) => {
                        ctx.beginPath();
                        ctx.moveTo(x, dimY);
                        ctx.lineTo(x + dir * 4, dimY - 2.5);
                        ctx.lineTo(x + dir * 4, dimY + 2.5);
                        ctx.closePath();
                        ctx.fillStyle = 'rgba(148, 163, 184, 0.9)';
                        ctx.fill();
                    };
                    arrow(dimX0, 1);
                    arrow(dimX1, -1);

                    ctx.fillStyle = '#e2e8f0';
                    ctx.font = '600 8.5px "JetBrains Mono", monospace';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(`e = ${totalThickMm} mm`, (dimX0 + dimX1) / 2, dimY - 6);
                    ctx.restore();
                }
            }

            ctx.restore();
        },

        /**
         * Comprobación de inclusión punto-en-polígono mediante Ray-Casting.
         */
        _isPointInPoly: function(x, y, poly) {
            if (!poly || poly.length < 3) return false;
            let inside = false;
            for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
                const xi = poly[i][0], yi = poly[i][1];
                const xj = poly[j][0], yj = poly[j][1];
                const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
                if (intersect) inside = !inside;
            }
            return inside;
        }
    };

    window.IFCViewer3D = IFCViewer3D;

})(window);
