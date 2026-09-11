const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const OUT_DIR = path.join(__dirname, '..', 'CAPTURAS', 'V3.0', 'WINDOWS_V3.0');
if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
}

class CDPClient {
    constructor(wsUrl) {
        this.wsUrl = wsUrl;
        this.ws = null;
        this.msgId = 1;
        this.callbacks = new Map();
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(this.wsUrl);
            this.ws.onopen = () => resolve();
            this.ws.onerror = (err) => reject(err);
            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.id && this.callbacks.has(data.id)) {
                        const { resolve, reject } = this.callbacks.get(data.id);
                        this.callbacks.delete(data.id);
                        if (data.error) reject(new Error(data.error.message || 'CDP error'));
                        else resolve(data.result);
                    }
                } catch (e) {}
            };
        });
    }

    send(method, params = {}) {
        return new Promise((resolve, reject) => {
            const id = this.msgId++;
            this.callbacks.set(id, { resolve, reject });
            this.ws.send(JSON.stringify({ id, method, params }));
        });
    }

    async eval(expr) {
        const res = await this.send('Runtime.evaluate', {
            expression: expr,
            awaitPromise: true,
            returnByValue: true
        });
        if (res && res.exceptionDetails) {
            console.warn('eval error:', res.exceptionDetails.text || res.exceptionDetails);
        }
        return res ? (res.result ? res.result.value : undefined) : undefined;
    }

    async captureScreenshot(filename) {
        const fullPath = path.join(OUT_DIR, filename);
        const res = await this.send('Page.captureScreenshot', { format: 'png' });
        const buffer = Buffer.from(res.data, 'base64');
        fs.writeFileSync(fullPath, buffer);
        console.log(`📸 [${filename}] Guardada (${(buffer.length / 1024).toFixed(1)} KB)`);
    }

    close() {
        if (this.ws) this.ws.close();
    }
}

async function getPageTargetWsUrl() {
    return new Promise((resolve, reject) => {
        const req = http.get('http://127.0.0.1:9222/json/list', (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const list = JSON.parse(body);
                    const page = list.find(t => t.type === 'page');
                    if (page) resolve(page.webSocketDebuggerUrl);
                    else reject(new Error('No page target found'));
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
    });
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function run() {
    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    console.log('🚀 Iniciando Chrome en modo headless con resolución 1920x1080...');
    const chrome = spawn(chromePath, [
        '--headless=new',
        '--remote-debugging-port=9222',
        '--window-size=1920,1080',
        '--no-first-run',
        '--no-default-browser-check',
        '--hide-scrollbars',
        'http://localhost:3000/'
    ], { stdio: 'ignore' });

    let pageWsUrl = null;
    for (let i = 0; i < 40; i++) {
        await sleep(250);
        try {
            pageWsUrl = await getPageTargetWsUrl();
            if (pageWsUrl) break;
        } catch (e) {}
    }

    if (!pageWsUrl) {
        console.error('Error: no se pudo obtener el WebSocket de la pestaña de Chrome.');
        chrome.kill();
        process.exit(1);
    }

    const client = new CDPClient(pageWsUrl);
    await client.connect();
    console.log('⚡ Conectado al Chrome DevTools Protocol!');

    await client.send('Emulation.setDeviceMetricsOverride', {
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1,
        mobile: false
    });

    await client.send('Page.enable');
    await client.send('Runtime.enable');

    console.log('⏳ Esperando carga de la aplicación...');
    await sleep(2500);

    // =========================================================================
    // 000. PANTALLA DE ACCESO PROTEGIDO CON PIN (PORTADA v3.0.0)
    // =========================================================================
    await client.captureScreenshot('000_ACCESO_SEGURIDAD_PIN_PORTADA.png');

    // =========================================================================
    // DESBLOQUEO DE PIN
    // =========================================================================
    console.log('🔓 Desbloqueando acceso con PIN 1234...');
    await client.eval(`
        (() => {
            const input = document.getElementById('pinInput');
            if (input) input.value = '1234';
            const btn = document.getElementById('pinSubmitBtn');
            if (btn) btn.click();
            sessionStorage.setItem('pin_verified', 'true');
            const overlay = document.getElementById('pinLockOverlay');
            if (overlay) {
                overlay.style.setProperty('display', 'none', 'important');
            }
        })()
    `);
    await sleep(1500);

    // =========================================================================
    // 001. PANTALLA DE BIENVENIDA (CREAR O ABRIR PRESUPUESTO / BIM)
    // =========================================================================
    await client.captureScreenshot('001_INICIO_BIENVENIDA_CREAR_O_ABRIR.png');

    // =========================================================================
    // CARGAR ARCHIVO BC3 DE EJEMPLO
    // =========================================================================
    console.log('📂 Cargando presupuesto BC3 de ejemplo (ARCHIVO EJEMPLO.bc3)...');
    await client.eval(`
        (async () => {
            if (typeof window.loadBc3FromUrl === 'function') {
                await window.loadBc3FromUrl('ARCHIVO_EJEMPLO.bc3', 'ARCHIVO EJEMPLO.bc3');
            }
        })()
    `);
    await sleep(2500);

    // =========================================================================
    // 002. ÁRBOL JERÁRQUICO DE PRESUPUESTO (FIEBDC-3)
    // =========================================================================
    await client.eval(`
        (() => {
            const btn = document.getElementById('presupuestoBtn');
            if (btn) btn.click();
        })()
    `);
    await sleep(800);
    await client.captureScreenshot('002_PRESUPUESTO_ARBOL_JERARQUICO.png');

    // =========================================================================
    // 003. CUADRO DE PRECIOS Y DESCOMPUESTOS
    // =========================================================================
    await client.eval(`
        (() => {
            const btn = document.getElementById('pricesBtn');
            if (btn) btn.click();
        })()
    `);
    await sleep(800);
    await client.captureScreenshot('003_PRECIOS_DESCOMPUESTOS_CUADRO.png');

    // Volver a presupuesto
    await client.eval(`
        (() => {
            const btn = document.getElementById('presupuestoBtn');
            if (btn) btn.click();
        })()
    `);
    await sleep(500);

    // =========================================================================
    // 004. COEFICIENTES ECONÓMICOS DE CONTRATA (PEM, GG 13%, BI 6%, PEC)
    // =========================================================================
    await client.eval(`
        (() => {
            const btn = document.getElementById('toggleCoeffsBtn');
            if (btn) btn.click();
        })()
    `);
    await sleep(800);
    await client.captureScreenshot('004_COEFICIENTES_ECONOMICOS_CONTRATA.png');

    // Ocultar panel coeficientes
    await client.eval(`
        (() => {
            const panel = document.getElementById('coeffsPanel');
            if (panel) panel.style.display = 'none';
        })()
    `);
    await sleep(300);

    // =========================================================================
    // 005. DASHBOARD ANALÍTICA, GRÁFICOS Y KPIS
    // =========================================================================
    await client.eval(`
        (() => {
            const btn = document.getElementById('dashboardBtn');
            if (btn) btn.click();
            const dashTab = document.getElementById('tabDashboardViewBtn');
            if (dashTab) dashTab.click();
        })()
    `);
    await sleep(1500);
    await client.captureScreenshot('005_DASHBOARD_ANALITICA_KPIS.png');

    // =========================================================================
    // 006. VISUALIZADOR CONCÉNTRICO SUNBURST
    // =========================================================================
    await client.eval(`
        (() => {
            const btn = document.getElementById('tabSunburstViewBtn');
            if (btn) btn.click();
        })()
    `);
    await sleep(1500);
    await client.captureScreenshot('006_VISUALIZADOR_CONCENTRICO_SUNBURST.png');

    // =========================================================================
    // 007. DIAGRAMA DE FLUJO DE COSTES SANKEY
    // =========================================================================
    await client.eval(`
        (() => {
            const btn = document.getElementById('tabSankeyViewBtn');
            if (btn) btn.click();
        })()
    `);
    await sleep(1500);
    await client.captureScreenshot('007_VISUALIZADOR_FLUJO_SANKEY.png');

    // =========================================================================
    // 008. IMPACTO AMBIENTAL Y HUELLA DE CO₂
    // =========================================================================
    await client.eval(`
        (() => {
            const btn = document.getElementById('tabEcoViewBtn');
            if (btn) btn.click();
        })()
    `);
    await sleep(1500);
    await client.captureScreenshot('008_IMPACTO_AMBIENTAL_HUELLA_CO2.png');

    // Cerrar modal dashboard
    await client.eval(`
        (() => {
            const closeBtn = document.getElementById('closeDashboardBtn');
            if (closeBtn) closeBtn.click();
            const modal = document.getElementById('dashboardModal');
            if (modal) modal.style.display = 'none';
        })()
    `);
    await sleep(500);

    // =========================================================================
    // 009. PLANNING DE OBRA / CRONOGRAMA GANTT
    // =========================================================================
    await client.eval(`
        (() => {
            const btn = document.getElementById('planningBtn');
            if (btn) btn.click();
            const ganttTab = document.getElementById('toggleGanttViewBtn');
            if (ganttTab) ganttTab.click();
        })()
    `);
    await sleep(1500);
    await client.captureScreenshot('009_PLANNING_CRONOGRAMA_GANTT.png');

    // =========================================================================
    // 010. PLANNING VALOR GANADO (EVM) Y CURVA S
    // =========================================================================
    await client.eval(`
        (() => {
            const evmTab = document.getElementById('toggleEvmViewBtn');
            if (evmTab) evmTab.click();
        })()
    `);
    await sleep(1500);
    await client.captureScreenshot('010_PLANNING_VALOR_GANADO_EVM.png');

    // Cerrar modal planning
    await client.eval(`
        (() => {
            const closeBtn = document.getElementById('closePlanningBtn');
            if (closeBtn) closeBtn.click();
            const modal = document.getElementById('planningModal');
            if (modal) modal.style.display = 'none';
        })()
    `);
    await sleep(500);

    // =========================================================================
    // 011. CONTROL DE CERTIFICACIONES DE OBRA
    // =========================================================================
    await client.eval(`
        (() => {
            const btn = document.getElementById('certObrasBtn');
            if (btn) btn.click();
        })()
    `);
    await sleep(1500);
    await client.captureScreenshot('011_CERTIFICACIONES_MENSUALES_OBRA.png');

    // Cerrar modal certificaciones
    await client.eval(`
        (() => {
            const closeBtn = document.getElementById('closeCertObrasBtn');
            if (closeBtn) closeBtn.click();
            const modal = document.getElementById('certObrasModal');
            if (modal) modal.style.display = 'none';
        })()
    `);
    await sleep(500);

    // =========================================================================
    // 012. COMPARADOR DE PRESUPUESTOS BC3
    // =========================================================================
    await client.eval(`
        (() => {
            const btn = document.getElementById('compareBtn');
            if (btn) btn.click();
        })()
    `);
    await sleep(1200);
    await client.captureScreenshot('012_COMPARADOR_PRESUPUESTOS_BC3.png');

    // Cerrar modal comparador
    await client.eval(`
        (() => {
            const closeBtn = document.getElementById('closeCompareBtn');
            if (closeBtn) closeBtn.click();
            const modal = document.getElementById('compareModal');
            if (modal) modal.style.display = 'none';
        })()
    `);
    await sleep(500);

    // =========================================================================
    // 013. BARRA DE SISTEMA MULTI-PESTAÑA
    // =========================================================================
    await client.eval(`
        (() => {
            const bar = document.getElementById('budgetTabBar');
            if (bar) bar.style.display = 'flex';
        })()
    `);
    await sleep(500);
    await client.captureScreenshot('013_SISTEMA_MULTIPESTANA_PROYECTOS.png');

    // =========================================================================
    // 014. PALETA DE COMANDOS INTELIGENTE (Ctrl+K)
    // =========================================================================
    await client.eval(`
        (() => {
            const btn = document.getElementById('cmdPaletteBtn');
            if (btn) btn.click();
        })()
    `);
    await sleep(800);
    await client.captureScreenshot('014_PALETA_COMANDOS_BUSCADOR_CTRL_K.png');

    // Cerrar paleta de comandos explícitamente
    await client.eval(`
        (() => {
            const closeBtn = document.getElementById('closeCmdPaletteBtn');
            if (closeBtn) closeBtn.click();
            const modal = document.getElementById('commandPaletteModal');
            if (modal) {
                modal.classList.remove('active');
                modal.style.setProperty('display', 'none', 'important');
            }
        })()
    `);
    await sleep(400);

    // =========================================================================
    // 015. CREADOR DE NUEVOS PRESUPUESTOS (ASISTENTE PASO A PASO)
    // =========================================================================
    await client.eval(`
        (() => {
            if (typeof window.openNewBudgetModal === 'function') window.openNewBudgetModal();
            else {
                const m = document.getElementById('newBudgetWizardModal');
                if (m) { m.classList.add('active'); m.style.display = 'flex'; }
            }
        })()
    `);
    await sleep(1000);
    await client.captureScreenshot('015_ASISTENTE_CREADOR_NUEVOS_PRESUPUESTOS.png');

    // =========================================================================
    // 016. CATÁLOGO Y BANCO DE PRECIOS CONTECH (PLANTILLAS)
    // =========================================================================
    await client.eval(`
        (() => {
            const tab = document.querySelector('[data-wizard-tab="templates"]') || document.getElementById('tabWizardTemplates');
            if (tab) tab.click();
        })()
    `);
    await sleep(800);
    await client.captureScreenshot('016_CATALOGO_BANCO_PRECIOS_PLANTILLAS.png');

    // CERRAR CREADOR DE PRESUPUESTOS CORRECTAMENTE
    await client.eval(`
        (() => {
            const closeBtn = document.getElementById('closeWizardBtn');
            if (closeBtn) closeBtn.click();
            const modal = document.getElementById('newBudgetWizardModal');
            if (modal) {
                modal.classList.remove('active');
                modal.style.setProperty('display', 'none', 'important');
            }
        })()
    `);
    await sleep(400);

    // =========================================================================
    // 017. ASESOR IA OFICIAL CONTECH (GOOGLE GEMINI)
    // =========================================================================
    await client.eval(`
        (() => {
            if (typeof window.openAssistantModal === 'function') window.openAssistantModal();
            else {
                const m = document.getElementById('geminiAssistantModal');
                if (m) { m.classList.add('active'); m.style.display = 'flex'; }
            }
        })()
    `);
    await sleep(1200);
    await client.captureScreenshot('017_ASISTENTE_IA_CONTECH_GEMINI.png');

    // CERRAR ASESOR IA CORRECTAMENTE
    await client.eval(`
        (() => {
            const closeBtn = document.getElementById('closeAssistantBtn');
            if (closeBtn) closeBtn.click();
            const modal = document.getElementById('geminiAssistantModal');
            if (modal) {
                modal.classList.remove('active');
                modal.style.setProperty('display', 'none', 'important');
            }
        })()
    `);
    await sleep(500);

    // =========================================================================
    // REVOLUCIÓN BIM 5D: CARGA DE MODELO IFC (CASA JAVIER.ifc)
    // =========================================================================
    console.log('🏗️ Cargando modelo IFC de ejemplo (CASA JAVIER.ifc)...');
    await client.eval(`
        (async () => {
            if (typeof window.loadIfcFromUrl === 'function') {
                await window.loadIfcFromUrl('CASA_JAVIER.ifc', 'CASA JAVIER.ifc');
            }
        })()
    `);
    await sleep(4000);

    // =========================================================================
    // 018. MODAL ASISTENTE BIM 5D (DETECCIÓN DE PARTIDAS, MÉTRICAS Y MAPEO BC3)
    // =========================================================================
    await client.captureScreenshot('018_ASISTENTE_BIM_IMPORTACION_IFC.png');

    // Generar presupuesto BC3 y abrir visor 3D
    console.log('⚡ Generando presupuesto BC3 y abriendo Visor 3D...');
    await client.eval(`
        (() => {
            const btn = document.getElementById('ifcGenerateBc3Btn') || document.querySelector('#ifcWizardModal .btn-primary');
            if (btn) btn.click();
            const modal = document.getElementById('ifcWizardModal');
            if (modal) modal.style.setProperty('display', 'none', 'important');
        })()
    `);
    await sleep(3000);

    // Asegurar que TODOS los modales y overlays previos están 100% cerrados
    await client.eval(`
        (() => {
            document.querySelectorAll('.modal, .command-palette-overlay').forEach(m => {
                m.style.setProperty('display', 'none', 'important');
                m.classList.remove('active');
            });
            const v3dBtn = document.getElementById('visor3dBtn');
            if (v3dBtn) {
                v3dBtn.style.display = 'inline-flex';
                v3dBtn.click();
            }
        })()
    `);
    // Esperar inicialización completa Web-IFC, Three.js y renderizado Blueprint
    await sleep(6000);

    // =========================================================================
    // 019. VISOR 3D BIM IFC RENDERIZADO BLUEPRINT CONTECH
    // =========================================================================
    await client.captureScreenshot('019_VISOR_3D_BIM_MODELO_BLUEPRINT.png');

    // =========================================================================
    // 020. SELECCIÓN DE ELEMENTO 3D Y MENÚ CONTEXTUAL FLOTANTE
    // =========================================================================
    console.log('🎯 Seleccionando elemento 3D y mostrando menú contextual...');
    await client.eval(`
        (() => {
            if (typeof IFCViewer3D !== 'undefined' && IFCViewer3D.expressIdToElementMap) {
                const el = Object.values(IFCViewer3D.expressIdToElementMap).find(e => e.category === 'Muros y Cerramientos' || e.type === 'IFCWALLSTANDARDCASE');
                if (el) {
                    const id = el.expressId !== undefined ? el.expressId : el.id;
                    IFCViewer3D.highlightElement(id);
                    IFCViewer3D.showContextMenu(820, 440, el, id);
                }
            }
        })()
    `);
    await sleep(1000);
    await client.captureScreenshot('020_VISOR_3D_SELECCION_ELEMENTO_MENU_CONTEXTUAL.png');

    // =========================================================================
    // 021. PANEL LATERAL DE PROPIEDADES BIM, MEDICIONES Y TRAZABILIDAD BC3
    // =========================================================================
    await client.eval(`
        (() => {
            if (typeof IFCViewer3D !== 'undefined' && IFCViewer3D.expressIdToElementMap) {
                const el = Object.values(IFCViewer3D.expressIdToElementMap).find(e => e.category === 'Muros y Cerramientos' || e.type === 'IFCWALLSTANDARDCASE');
                if (el) {
                    const id = el.expressId !== undefined ? el.expressId : el.id;
                    IFCViewer3D.showElementCard(el, id);
                    const side = document.getElementById('v3dSidePanel');
                    if (side) side.classList.add('open');
                }
            }
            const ctx = document.getElementById('v3dContextMenu');
            if (ctx) ctx.classList.remove('open');
        })()
    `);
    await sleep(800);
    await client.captureScreenshot('021_VISOR_3D_PANEL_LATERAL_PROPIEDADES_BIM.png');

    // =========================================================================
    // 022. FILTRO DE CATEGORÍAS CONSTRUCTIVAS BIM (SUBSETS)
    // =========================================================================
    await client.eval(`
        (() => {
            const catBtn = document.getElementById('v3dCategoriesToggleBtn');
            if (catBtn) catBtn.click();
        })()
    `);
    await sleep(800);
    await client.captureScreenshot('022_VISOR_3D_FILTRO_CATEGORIAS_CONSTRUCTIVAS.png');

    // Cerrar menú de categorías
    await client.eval(`
        (() => {
            const menu = document.getElementById('v3dCategoriesMenu');
            if (menu) menu.classList.remove('open');
        })()
    `);
    await sleep(400);

    // =========================================================================
    // 023. AISLAMIENTO EXCLUSIVO DE ELEMENTO EN 3D
    // =========================================================================
    console.log('🎯 Aislando elemento constructivo en 3D...');
    await client.eval(`
        (() => {
            if (typeof IFCViewer3D !== 'undefined' && IFCViewer3D.expressIdToElementMap) {
                const el = Object.values(IFCViewer3D.expressIdToElementMap).find(e => e.category === 'Muros y Cerramientos');
                if (el) {
                    const id = el.expressId !== undefined ? el.expressId : el.id;
                    IFCViewer3D.isolateElement(id);
                }
            }
        })()
    `);
    await sleep(2000);
    await client.captureScreenshot('023_VISOR_3D_AISLAMIENTO_ELEMENTO_BLUEPRINT.png');

    // Restaurar vista completa
    console.log('🔄 Restaurando vista completa 3D...');
    await client.eval(`
        (() => {
            if (typeof IFCViewer3D !== 'undefined') IFCViewer3D.restoreView();
        })()
    `);
    await sleep(2000);

    // =========================================================================
    // 024. SELECCIONAR SIMILARES: MENÚ DE 11 CRITERIOS CONTECH
    // =========================================================================
    console.log('✨ Desplegando menú Seleccionar Similares con criterios...');
    await client.eval(`
        (() => {
            if (typeof IFCViewer3D !== 'undefined' && IFCViewer3D.expressIdToElementMap) {
                const el = Object.values(IFCViewer3D.expressIdToElementMap).find(e => e.category === 'Muros y Cerramientos');
                if (el) {
                    const id = el.expressId !== undefined ? el.expressId : el.id;
                    IFCViewer3D.highlightElement(id);
                    IFCViewer3D.showContextMenu(620, 360, el, id);
                    const sub = document.getElementById('v3dSimilarSubmenu');
                    if (sub) {
                        sub.style.display = 'block';
                        sub.style.opacity = '1';
                        sub.style.pointerEvents = 'all';
                    }
                }
            }
        })()
    `);
    await sleep(1000);
    await client.captureScreenshot('024_VISOR_3D_SELECCIONAR_SIMILARES_CRITERIOS.png');

    // =========================================================================
    // 025. SELECCIÓN MÚLTIPLE: PANEL RESUMEN (PRECIOS EN €, MEDICIONES AGREGADAS)
    // =========================================================================
    console.log('📊 Activando selección múltiple y panel lateral de resumen agrupado...');
    await client.eval(`
        (() => {
            if (typeof IFCViewer3D !== 'undefined' && IFCViewer3D.expressIdToElementMap) {
                const walls = Object.values(IFCViewer3D.expressIdToElementMap).filter(e => e.category === 'Muros y Cerramientos');
                const ids = walls.map(w => w.expressId !== undefined ? w.expressId : w.id);
                IFCViewer3D.selectSimilar('category', ids, { key: 'category', label: 'Muros y Cerramientos', ids: ids });
            }
        })()
    `);
    await sleep(2000);
    await client.captureScreenshot('025_VISOR_3D_SELECCION_MULTIPLE_PANEL_RESUMEN.png');

    // Limpiar selección múltiple
    await client.eval(`
        (() => {
            if (typeof IFCViewer3D !== 'undefined') {
                IFCViewer3D.clearMultiSelection();
                IFCViewer3D.restoreView();
            }
        })()
    `);
    await sleep(1500);

    // =========================================================================
    // 026. VISTA TÉCNICA ORTOGONAL PLANTA CAD (PROYECCIÓN PARALELA SIN FUGA)
    // =========================================================================
    console.log('📐 Cambiando a vista técnica ortogonal: Planta CAD...');
    await client.eval(`
        (() => {
            const btn = document.querySelector('[data-view-type="top"]');
            if (btn) btn.click();
            const side = document.getElementById('v3dSidePanel');
            if (side) side.classList.remove('open');
        })()
    `);
    await sleep(2000);
    await client.captureScreenshot('026_VISOR_3D_VISTA_TECNICA_PLANTA_CAD.png');

    // =========================================================================
    // 027. VISTA TÉCNICA ORTOGONAL ALZADO FRONTAL CAD
    // =========================================================================
    console.log('📐 Cambiando a vista técnica ortogonal: Alzado Frontal...');
    await client.eval(`
        (() => {
            const btn = document.querySelector('[data-view-type="front"]');
            if (btn) btn.click();
        })()
    `);
    await sleep(2000);
    await client.captureScreenshot('027_VISOR_3D_VISTA_TECNICA_ALZADO_FRONTAL.png');

    // Volver a 3D perspectiva
    await client.eval(`
        (() => {
            const btn = document.querySelector('[data-view-type="perspective"]');
            if (btn) btn.click();
        })()
    `);
    await sleep(2000);

    // =========================================================================
    // 028. PLANOS DE SECCIÓN 3D MULTIEJE (X, Y, Z) Y WIDGET FLOTANTE
    // =========================================================================
    console.log('✂️ Activando planos de corte y sección 3D...');
    await client.eval(`
        (() => {
            const btn = document.getElementById('v3dSectionBtn');
            if (btn && !btn.classList.contains('active')) btn.click();
            const zBtn = document.getElementById('v3dSecAxisZ');
            if (zBtn) zBtn.click();
            const slider = document.getElementById('v3dSectionSlider');
            if (slider) {
                slider.value = (parseFloat(slider.min) + parseFloat(slider.max)) * 0.45;
                slider.dispatchEvent(new Event('input'));
            }
        })()
    `);
    await sleep(2000);
    await client.captureScreenshot('028_VISOR_3D_PLANOS_SECCION_MULTIEJE.png');

    // =========================================================================
    // 029. SECCIÓN MACIZA CON STENCIL CAPPING (#0f2b5c) EN MUROS Y FORJADOS
    // =========================================================================
    console.log('✂️ Comprobando sección maciza con estarcido Three.js...');
    await client.eval(`
        (() => {
            const chk = document.getElementById('v3dSectionSolidChk');
            if (chk && !chk.checked) {
                chk.checked = true;
                chk.dispatchEvent(new Event('change'));
            }
        })()
    `);
    await sleep(2000);
    await client.captureScreenshot('029_VISOR_3D_SECCION_MACIZA_STENCIL.png');

    // Desactivar sección
    await client.eval(`
        (() => {
            const btn = document.getElementById('v3dSectionBtn');
            if (btn && btn.classList.contains('active')) btn.click();
        })()
    `);
    await sleep(1000);

    // =========================================================================
    // 030. HERRAMIENTA INTERACTIVA DE ACOTACIÓN CAD CON SNAP ("📏 Acotar")
    // =========================================================================
    console.log('📏 Activando herramienta de medición técnica CAD con cotas persistentes...');
    await client.eval(`
        (() => {
            const btn = document.getElementById('v3dMeasureBtn');
            if (btn && !btn.classList.contains('active')) btn.click();
            const THREE = window.THREE;
            if (typeof IFCViewer3D !== 'undefined' && typeof IFCViewer3D._createPermanentDimension === 'function' && THREE) {
                const v1 = new THREE.Vector3(-2.2, 0.5, 1.2);
                const v2 = new THREE.Vector3(3.5, 0.5, 1.2);
                IFCViewer3D._createPermanentDimension(v1, v2);
            }
        })()
    `);
    await sleep(1500);
    await client.captureScreenshot('030_VISOR_3D_ACOTACION_CAD_SNAP_PUNTOS.png');

    // =========================================================================
    // 031. BIM TAKEOFF: MEDICIÓN 3D DE SUPERFICIE (L × H → m²)
    // =========================================================================
    console.log('📐 Activando medición de superficie en paramento BIM...');
    await client.eval(`
        (() => {
            const THREE = window.THREE;
            const modeAreaBtn = document.getElementById('v3dMeasureModeArea');
            if (modeAreaBtn) modeAreaBtn.click();
            if (typeof IFCViewer3D !== 'undefined' && typeof IFCViewer3D._createPermanentArea === 'function' && THREE) {
                const p1 = new THREE.Vector3(-1.5, 0.2, 0.6);
                const p2 = new THREE.Vector3(2.5, 0.2, 0.6);
                const p3 = new THREE.Vector3(2.5, 0.2, 2.7);
                const p4 = new THREE.Vector3(-1.5, 0.2, 2.7);
                IFCViewer3D._createPermanentArea(p1, p2, p3, p4);
                const addBtn = document.getElementById('v3dMeasureAddToBudgetBtn');
                if (addBtn) addBtn.style.display = 'inline-flex';
            }
        })()
    `);
    await sleep(1500);
    await client.captureScreenshot('031_VISOR_3D_BIM_TAKEOFF_MEDICION_SUPERFICIE.png');

    // =========================================================================
    // 032. ASISTENTE DIRECTO: CREAR PARTIDA BC3 DESDE MEDICIÓN 3D (~M)
    // =========================================================================
    console.log('➕ Abriendo asistente para crear partida BC3 desde medición 3D...');
    await client.eval(`
        (() => {
            const addBtn = document.getElementById('v3dMeasureAddToBudgetBtn');
            if (addBtn) addBtn.click();
            else {
                const modal = document.getElementById('v3dAddToBudgetModal');
                if (modal) modal.style.display = 'flex';
            }
        })()
    `);
    await sleep(1200);
    await client.captureScreenshot('032_VISOR_3D_ASISTENTE_CREAR_PARTIDA_BC3.png');

    // Cerrar modal asistente
    await client.eval(`
        (() => {
            const closeBtn = document.getElementById('v3dAddToBudgetCloseBtn');
            if (closeBtn) closeBtn.click();
            const modal = document.getElementById('v3dAddToBudgetModal');
            if (modal) modal.style.display = 'none';
            const mBtn = document.getElementById('v3dMeasureBtn');
            if (mBtn && mBtn.classList.contains('active')) mBtn.click();
        })()
    `);
    await sleep(600);

    // =========================================================================
    // 033. PROBETA MULTICAPA 3D DE MURO COMPACTA (128px)
    // =========================================================================
    console.log('🧱 Renderizando probeta multicapa 3D de Muro...');
    await client.eval(`
        (() => {
            if (typeof IFCViewer3D !== 'undefined' && IFCViewer3D.expressIdToElementMap) {
                const wall = Object.values(IFCViewer3D.expressIdToElementMap).find(e => e.category === 'Muros y Cerramientos');
                if (wall) {
                    const id = wall.expressId !== undefined ? wall.expressId : wall.id;
                    IFCViewer3D.showElementCard(wall, id);
                    const side = document.getElementById('v3dSidePanel');
                    if (side) side.classList.add('open');
                    const box = document.getElementById('v3dMultilayerSection');
                    if (box) {
                        box.style.display = 'block';
                        box.scrollIntoView({ behavior: 'instant', block: 'center' });
                    }
                }
            }
        })()
    `);
    await sleep(1500);
    await client.captureScreenshot('033_PROBETA_MULTICAPA_3D_MURO_COMPACTA.png');

    // =========================================================================
    // 034. PROBETA MULTICAPA 3D DE FORJADO CON GIRO 90° Y CENTRADO SIMÉTRICO
    // =========================================================================
    console.log('🏗️ Renderizando probeta multicapa 3D de Forjado...');
    await client.eval(`
        (() => {
            if (typeof IFCViewer3D !== 'undefined' && IFCViewer3D.expressIdToElementMap) {
                const slab = Object.values(IFCViewer3D.expressIdToElementMap).find(e => e.category === 'Estructura y Forjados' || e.type === 'IFCSLAB');
                if (slab) {
                    const id = slab.expressId !== undefined ? slab.expressId : slab.id;
                    IFCViewer3D.showElementCard(slab, id);
                    const box = document.getElementById('v3dMultilayerSection');
                    if (box) {
                        box.style.display = 'block';
                        box.scrollIntoView({ behavior: 'instant', block: 'center' });
                    }
                }
            }
        })()
    `);
    await sleep(1500);
    await client.captureScreenshot('034_PROBETA_MULTICAPA_3D_FORJADO_GIRO_90.png');

    // =========================================================================
    // 035. DIAGNÓSTICO DE VERSIÓN v3.0 & CRÉDITOS SOBRE MÍ
    // =========================================================================
    console.log('ℹ️ Mostrando modal Información de la Versión v3.0...');
    await client.eval(`
        (() => {
            const side = document.getElementById('v3dSidePanel');
            if (side) side.classList.remove('open');
            const infoBtn = document.getElementById('infoBtn');
            if (infoBtn) infoBtn.click();
        })()
    `);
    await sleep(1200);
    await client.captureScreenshot('035_INFORMACION_VERSION_V3.png');

    // Modal Sobre Mí
    await client.eval(`
        (() => {
            const modal1 = document.getElementById('infoModal');
            if (modal1) modal1.style.display = 'none';
            const aboutBtn = document.getElementById('aboutMeBtn');
            if (aboutBtn) aboutBtn.click();
        })()
    `);
    await sleep(1200);
    await client.captureScreenshot('036_SOBRE_MI_Y_FILOSOFIA_CONTECH.png');

    console.log('🎉 ¡Todas las 37 capturas v3.0 regeneradas con éxito y máxima resolución!');
    client.close();
    chrome.kill();
}

run().catch(err => {
    console.error('❌ Error general en run():', err);
    process.exit(1);
});
