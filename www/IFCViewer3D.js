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
            this.measureAreaStep = 0; // 0: inicio, 1: P1 fijado, 2: L fijada, 3: P3 fijado
            this.measureAreaP1 = null;
            this.measureAreaP2 = null;
            this.measureAreaP3 = null;
            this.measureAreaP4 = null;
            this.measureAreaL = 0;
            this.measureAreaH = 0;
            this.lastMeasurementData = null;
            this.currentMeasuredElement = null;
            this.measurements = [];
            this.measureGroup = null;
            this.measurePreviewLine = null;
            this.measureAreaPreviewMesh = null;
            this.measureSnapMarker = null;

            const measureBtn = document.getElementById('v3dMeasureBtn');
            const clearBtn = document.getElementById('v3dMeasureClearBtn');
            const closeBtn = document.getElementById('v3dMeasureCloseBtn');
            const modeLinearBtn = document.getElementById('v3dMeasureModeLinear');
            const modeAreaBtn = document.getElementById('v3dMeasureModeArea');
            const modeVolumeBtn = document.getElementById('v3dMeasureModeVolume');
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
            const previewBadge = document.getElementById('v3dMeasurePreviewBadge');
            if (previewBadge) previewBadge.remove();

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

            if (intersects.length === 0) return null;

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
                        hudText.textContent = `📐 Base L: ${distL.toFixed(2)} m (Clic para fijar longitud base L)`;
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
                            const thick = 0.30;
                            const V = S * thick;
                            hudText.textContent = `🧊 Superficie L ${L.toFixed(2)} × H ${H.toFixed(2)} = ${S.toFixed(2)} m² (Vol ~ ${V.toFixed(2)} m³). Clic para fijar`;
                        } else {
                            hudText.textContent = `📐 Superficie: L ${L.toFixed(2)} m × H ${H.toFixed(2)} m = ${S.toFixed(2)} m² (Clic para confirmar)`;
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
                        previewBadge.textContent = `${S.toFixed(2)} m²`;
                        const centroid = new THREE.Vector3().add(p1).add(p2).add(p3).add(p4).multiplyScalar(0.25);
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
                        hudText.textContent = '📐 Base iniciada. Haz clic en el 2º punto para fijar la longitud base (L)';
                    }
                } else if (this.measureAreaStep === 1) {
                    this.measureAreaP2 = pt.clone();
                    this.measureAreaL = this.measureAreaP1.distanceTo(this.measureAreaP2);
                    if (this.measureAreaL < 0.02) return;
                    this.measureAreaStep = 2;
                    if (hudText) {
                        hudText.textContent = `📐 Base L = ${this.measureAreaL.toFixed(2)} m fijada. Ahora haz clic en la altura (H)`;
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

                    this._addAreaMeasurement(p1, p2, p3, p4, L, H, S);

                    const elem = this.currentMeasuredElement || res.element;

                    if (this.measureMode === 'volume') {
                        const thick = 0.30;
                        const V = S * thick;
                        this.lastMeasurementData = {
                            type: 'volume',
                            unit: 'm³',
                            value: V,
                            l: L,
                            w: thick,
                            h: H,
                            units: 1,
                            element: elem,
                            p1: p1, p2: p2, p3: p3, p4: p4,
                            description: `Volumen 3D: ${L.toFixed(2)} m × ${H.toFixed(2)} m × ${thick.toFixed(2)} m = ${V.toFixed(2)} m³`
                        };
                        if (hudText) {
                            hudText.textContent = `✅ Volumen fijado: ${V.toFixed(2)} m³. Pulsa '➕ Añadir a Partida' para presupuestar`;
                        }
                    } else {
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
                    }

                    if (addToBudgetBtn) addToBudgetBtn.style.display = 'inline-flex';
                    this._cancelActiveMeasurementPoint();
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
                side: THREE.DoubleSide
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
        }
    };

    window.IFCViewer3D = IFCViewer3D;

})(window);
