function sendAssistantQuickQuery(btnOrQuery) {
    let query = typeof btnOrQuery === 'string' ? btnOrQuery : (btnOrQuery?.getAttribute?.('data-query') || btnOrQuery?.textContent?.trim() || '');
    if (!query) return;
    const input = document.getElementById('geminiChatInput');
    if (input) input.value = query;
    sendAssistantUserMessage();
}
window.sendAssistantQuickQuery = sendAssistantQuickQuery;

const APP_VERSION = '2.3.3'; // Versión actual de la aplicación (Single Source of Truth)
const ACCESS_PIN = '1234'; // PIN de acceso por defecto

// Sincronizador centralizado y automático de versión en toda la interfaz
function applyAppVersionToUI() {
    // 1. Inyectar versión en todos los elementos con clases o IDs de versión
    document.querySelectorAll('.app-version-label, .app-version-badge, [data-app-version]').forEach(el => {
        const prefix = el.getAttribute('data-version-prefix') || 'v';
        el.textContent = `${prefix}${APP_VERSION}`;
    });

    // 2. Elementos específicos de cabecera, modales, footer y PIN
    const targets = {
        'pinAppVersionBadge': `v${APP_VERSION}`,
        'updateNotifyVersion': `v${APP_VERSION}`,
        'footerAppVersion': `v${APP_VERSION}`,
        'headerAppVersion': `v${APP_VERSION}`
    };

    for (const [id, text] of Object.entries(targets)) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }
}

// Ejecutar inmediatamente si el DOM ya está listo o registrar evento
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyAppVersionToUI);
} else {
    applyAppVersionToUI();
}

// URL del Webhook de Google Sheets para registrar usuarios de la app.
// Si deseas activar el contador, crea un script en Google Sheets y pega aquí la URL de la aplicación web.
const USER_LOG_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbzvSAwHIgeo_O2J4JAGTMG_houYUcoLT0GtsmEklFWdfiMjq9lIAz3NqeeinliucH2M_A/exec";

async function registerUserAccess() {
    if (!USER_LOG_WEBHOOK_URL) return;

    try {
        let deviceId = localStorage.getItem('app_device_id');
        if (!deviceId) {
            deviceId = 'dev_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
            localStorage.setItem('app_device_id', deviceId);
        }

        let platform = 'Web';
        if (window.Capacitor) {
            platform = 'Android';
        } else if (window.__TAURI__ || window.__TAURI_METADATA__ || window.__TAURI_IPC__) {
            platform = 'Windows';
        }

        // Obtener la IP pública del usuario con timeout de 2.5s para no demorar la app si no hay red
        let userIp = '';
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2500);
            const ipRes = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
            clearTimeout(timeoutId);
            if (ipRes.ok) {
                const ipData = await ipRes.json();
                userIp = ipData.ip || '';
            }
        } catch (ipErr) {
            // Ignorar silenciosamente si no se resuelve la IP
        }

        const payload = {
            deviceId: deviceId,
            version: APP_VERSION,
            platform: platform,
            ip: userIp,
            timestamp: new Date().toISOString()
        };

        fetch(USER_LOG_WEBHOOK_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        }).catch(err => console.log("Error de red al registrar acceso:", err));
    } catch (e) {
        console.error("Error en registro de acceso:", e);
    }
}

// Registrar el acceso en segundo plano al iniciar
registerUserAccess();


function checkPinCode() {
    // Si ya está verificado en esta sesión, no preguntar
    if (sessionStorage.getItem('pin_verified') === 'true') {
        return;
    }

    const runVerification = () => {
        const overlay = document.getElementById('pinLockOverlay');
        const input = document.getElementById('pinInput');
        const submitBtn = document.getElementById('pinSubmitBtn');
        const errorMsg = document.getElementById('pinErrorMsg');

        if (!overlay || !input || !submitBtn) return;

        // Mostrar el overlay de bloqueo
        overlay.style.setProperty('display', 'flex', 'important');

        // Mostrar versión actual de la app
        const versionBadge = document.getElementById('pinAppVersionBadge');
        if (versionBadge && typeof APP_VERSION !== 'undefined') {
            versionBadge.textContent = 'v' + APP_VERSION;
        }

        // Enfocar el input
        setTimeout(() => input.focus(), 300);

        const verify = () => {
            if (input.value === ACCESS_PIN) {
                sessionStorage.setItem('pin_verified', 'true');
                overlay.style.display = 'none';
            } else {
                errorMsg.style.setProperty('display', 'block', 'important');
                input.value = '';
                input.focus();
                // Ocultar mensaje de error después de 3 segundos
                setTimeout(() => {
                    errorMsg.style.display = 'none';
                }, 3000);
            }
        };

        submitBtn.onclick = verify;

        input.onkeydown = (e) => {
            if (e.key === 'Enter') verify();
        };
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runVerification);
    } else {
        runVerification();
    }
}

// Ejecutar verificación de PIN de inmediato
checkPinCode();

// 1. File Input Change
const fileInput = document.getElementById('bc3file');
let currentFileName = "presupuesto.bc3";
let draftActive = false;
let draftNode = {
    parentCode: null,
    index: 0,
    depth: 0,
    unit: 'ud',
    summary: '',
    qty: '',
    price: ''
};
if (fileInput) {
    fileInput.addEventListener('change', function (e) {
        if (this.files && this.files.length > 0) {
            currentFileName = this.files[0].name;
            document.getElementById('fileName').textContent = currentFileName;
            const dropdownFileName = document.getElementById('dropdownFileName');
            if (dropdownFileName) dropdownFileName.textContent = currentFileName;

            // Procesar el archivo automáticamente al seleccionarlo
            const uploadForm = document.getElementById('uploadForm');
            if (uploadForm) {
                uploadForm.requestSubmit();
            }
        }
    });
}

// 2. Search Box
const searchInput = document.getElementById('searchTerm');
if (searchInput) {
    searchInput.addEventListener('input', function (e) {
        const term = e.target.value.trim();
        filterTree(term);
    });
}

// Window resize handler - re-render when switching between mobile/desktop
let resizeTimeout;
window.addEventListener('resize', function () {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (parsedData) {
            renderCurrentLevel();
        }
    }, 250);
});

// --- Web Worker Infrastructure para Procesamiento Asíncrono ---
let bc3Worker = null;
const workerCallbacks = new Map();
let workerMsgId = 0;

function initBC3Worker() {
    if (typeof Worker !== 'undefined') {
        try {
            bc3Worker = new Worker('bc3-worker.js');
            bc3Worker.onmessage = function (e) {
                const { id, success, data, error } = e.data || {};
                if (workerCallbacks.has(id)) {
                    const { resolve, reject } = workerCallbacks.get(id);
                    workerCallbacks.delete(id);
                    if (success) {
                        resolve(data);
                    } else {
                        reject(new Error(error || 'Error en Web Worker'));
                    }
                }
            };
            bc3Worker.onerror = function (err) {
                console.warn("Web Worker error, recurriendo a modo síncrono:", err);
            };
        } catch (e) {
            console.warn("Web Worker no pudo instanciarse localmente, usando fallback síncrono:", e);
            bc3Worker = null;
        }
    }
}
initBC3Worker();

function parseWithWorker(content) {
    return new Promise((resolve, reject) => {
        if (!bc3Worker) {
            try {
                const parser = new BC3Parser();
                const result = parser.parse(content);
                return resolve(result);
            } catch (err) {
                return reject(err);
            }
        }

        const id = ++workerMsgId;
        workerCallbacks.set(id, { resolve, reject });
        bc3Worker.postMessage({
            id,
            action: 'PARSE_BC3',
            payload: { content }
        });
    });
}

function showWorkerLoader(text = "Procesando archivo...", subtext = "Hilo asíncrono en segundo plano") {
    const overlay = document.getElementById('workerLoadingOverlay');
    const textEl = document.getElementById('workerLoadingText');
    const subtextEl = document.getElementById('workerLoadingSubtext');
    if (textEl) textEl.textContent = text;
    if (subtextEl) subtextEl.textContent = subtext;
    if (overlay) overlay.style.display = 'flex';
}

function hideWorkerLoader() {
    const overlay = document.getElementById('workerLoadingOverlay');
    if (overlay) overlay.style.display = 'none';
}

// 3. Upload Form Submit
// Helper to read and decode a BC3 file locally based on its declared charset or UTF-8
async function readAndParseBC3File(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => {
            hideWorkerLoader();
            reject(new Error("Error de lectura de archivo"));
        };
        reader.onload = async function (e) {
            try {
                showWorkerLoader("Leyendo y parseando presupuesto...", file.name);
                const arrayBuffer = e.target.result;

                // First decode as ISO-8859-1 to safely inspect the header for the encoding tag
                const tempDecoder = new TextDecoder('iso-8859-1');
                const tempText = tempDecoder.decode(arrayBuffer);

                let encoding = 'utf-8';

                // Check declared encoding in ~V record
                const match = tempText.match(/~V\|[^|]*\|[^|]*\|[^|]*\|[^|]*\|([^|]*)\|/);
                if (match) {
                    const declaredEncoding = match[1].trim().toUpperCase();
                    if (declaredEncoding === 'ANSI') {
                        encoding = 'windows-1252';
                    } else if (declaredEncoding === 'IBMPC' || declaredEncoding === 'DOS') {
                        encoding = 'ibm437';
                    } else if (declaredEncoding === 'ISO') {
                        encoding = 'iso-8859-1';
                    } else if (declaredEncoding === 'UTF-8' || declaredEncoding === 'UTF8') {
                        encoding = 'utf-8';
                    }
                }

                // Try UTF-8 first (strict), fallback to the detected encoding if UTF-8 fails
                let finalContent = '';
                try {
                    const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
                    finalContent = utf8Decoder.decode(arrayBuffer);
                } catch (utf8Error) {
                    const realDecoder = new TextDecoder(encoding);
                    finalContent = realDecoder.decode(arrayBuffer);
                }

                // Parse using Web Worker (asíncrono sin bloquear la UI)
                const result = await parseWithWorker(finalContent);

                // Guardar en localStorage de forma segura para auto-carga en el siguiente inicio
                try {
                    localStorage.setItem('last_bc3_content', finalContent);
                    localStorage.setItem('last_bc3_filename', file.name);
                } catch (storageError) {
                    console.warn("No se pudo guardar el presupuesto para auto-carga (cuota de espacio excedida):", storageError);
                }

                hideWorkerLoader();
                const v3dBtnEl = document.getElementById('visor3dBtn');
                if (v3dBtnEl && !file.name.toLowerCase().endsWith('.ifc')) {
                    v3dBtnEl.style.display = 'none';
                }
                resolve({ success: true, data: result });
            } catch (err) {
                hideWorkerLoader();
                reject(err);
            }
        };
        reader.readAsArrayBuffer(file);
    });
}

// =============================================================================
// 🏗️ MÓDULO BIM 5D: PROCESAMIENTO DE MODELOS IFC Y GENERADOR BC3
// =============================================================================
let currentIfcData = null;
let currentIfcFile = null;

let currentIfcBuffer = null;

async function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Error leyendo el archivo IFC"));
        reader.onload = (e) => {
            const buffer = e.target.result;
            currentIfcBuffer = buffer;
            try {
                const utf8Decoder = new TextDecoder('utf-8', { fatal: false });
                resolve(utf8Decoder.decode(buffer));
            } catch (err) {
                const isoDecoder = new TextDecoder('iso-8859-1');
                resolve(isoDecoder.decode(buffer));
            }
        };
        reader.readAsArrayBuffer(file);
    });
}

async function handleIfcFile(file) {
    if (typeof IFCParser === 'undefined') {
        alert("El motor IFCParser no está disponible.");
        return;
    }

    showWorkerLoader("Leyendo y analizando modelo BIM (IFC)...", file.name);
    try {
        const text = await readFileAsText(file);
        
        currentIfcFile = file;
        currentIfcData = IFCParser.parse(text, (prog, msg) => {
            const subtext = document.getElementById('workerLoadingSubtext');
            if (subtext) subtext.textContent = `${msg} (${prog}%)`;
        });

        hideWorkerLoader();
        openIfcWizardModal(currentIfcData, file.name);
    } catch (err) {
        hideWorkerLoader();
        console.error("Error procesando modelo IFC:", err);
        alert("Error al procesar el modelo IFC: " + (err.message || err));
    }
}

function openIfcWizardModal(ifcData, fileName) {
    const modal = document.getElementById('ifcWizardModal');
    if (!modal) return;

    // Subtítulo
    const subtitle = document.getElementById('ifcModalSubtitle');
    if (subtitle) subtitle.textContent = `Modelo: ${fileName} · Esquema: ${ifcData.header.schema || 'IFC'}`;

    // Métricas
    const elElem = document.getElementById('ifcMetricElements');
    if (elElem) elElem.textContent = ifcData.stats.totalElements.toLocaleString('es-ES');

    const elStoreys = document.getElementById('ifcMetricStoreys');
    if (elStoreys) {
        const storeyNames = ifcData.storeys.map(s => s.name).join(', ');
        elStoreys.textContent = `${ifcData.stats.storeysCount} plant.${storeyNames ? ' (' + storeyNames + ')' : ''}`;
    }

    const elArea = document.getElementById('ifcMetricArea');
    if (elArea) elArea.textContent = `${ifcData.stats.totalAreaM2.toLocaleString('es-ES')} m²`;

    const elVol = document.getElementById('ifcMetricVolume');
    if (elVol) elVol.textContent = `${ifcData.stats.totalVolumeM3.toLocaleString('es-ES')} m³`;

    const elBadge = document.getElementById('ifcSchemaBadge');
    if (elBadge) elBadge.textContent = `${ifcData.header.schema || 'IFC'} · ${ifcData.stats.parseTimeSec}s`;

    // Rellenar tabla
    const tbody = document.getElementById('ifcSummaryTableBody');
    if (tbody) {
        tbody.innerHTML = '';
        if (!ifcData.summaryByCategory || ifcData.summaryByCategory.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="padding:16px; text-align:center; color:var(--text-secondary);">No se encontraron elementos constructivos cuantificables en el modelo.</td></tr>';
        } else {
            ifcData.summaryByCategory.forEach(cat => {
                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid var(--border-color)';
                
                const typesCount = Object.keys(cat.types || {}).length;
                const formattedQty = typeof cat.totalQuantity === 'number' ? cat.totalQuantity.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : cat.totalQuantity;

                tr.innerHTML = `
                    <td style="padding: 8px 12px; text-align:center; font-size:1.1rem;">${cat.icon}</td>
                    <td style="padding: 8px 12px; font-weight:600; color:var(--text-primary);">${cat.category}</td>
                    <td style="padding: 8px 12px; color:var(--text-secondary);">${cat.count} elem. (${typesCount} tipos)</td>
                    <td style="padding: 8px 12px; text-align:right; font-weight:700; color:var(--accent, #3b82f6);">${formattedQty}</td>
                    <td style="padding: 8px 12px; text-align:center;"><span style="font-size:0.75rem; font-weight:600; background:var(--bg-hover); padding:2px 6px; border-radius:4px;">${cat.unit}</span></td>
                `;
                tbody.appendChild(tr);
            });
        }
    }

    modal.style.display = 'flex';
}

function closeIfcWizardModal() {
    const modal = document.getElementById('ifcWizardModal');
    if (modal) modal.style.display = 'none';
}

function initIfcWizardEvents() {
    const closeBtn = document.getElementById('closeIfcWizardBtn');
    if (closeBtn) closeBtn.addEventListener('click', closeIfcWizardModal);

    const cancelBtn = document.getElementById('ifcCancelBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', closeIfcWizardModal);

    const generateBtn = document.getElementById('ifcGenerateBc3Btn');
    if (generateBtn) {
        generateBtn.addEventListener('click', () => {
            if (!currentIfcData) return;
            if (typeof IFC2BC3Engine === 'undefined') {
                alert("El motor de generación IFC2BC3Engine no está cargado.");
                return;
            }

            try {
                showWorkerLoader("Confeccionando presupuesto FIEBDC-3 y líneas de medición...", currentIfcFile ? currentIfcFile.name : "Modelo IFC");
                
                setTimeout(() => {
                    try {
                        const bc3Output = IFC2BC3Engine.generateBC3(currentIfcData);
                        closeIfcWizardModal();
                        hideWorkerLoader();

                        const bc3Name = (currentIfcFile ? currentIfcFile.name : 'Modelo').replace(/\.ifc$/i, '.bc3');
                        const newTab = createBudgetTab(bc3Output.data, bc3Name, bc3Output.rawText);
                        if (newTab) {
                            newTab.isFromIfc = true;
                            newTab.ifcData = currentIfcData;
                            newTab.ifcBuffer = currentIfcBuffer;
                            newTab.ifcFileName = currentIfcFile ? currentIfcFile.name : 'Modelo IFC';
                        }
                        const v3dBtn = document.getElementById('visor3dBtn');
                        if (v3dBtn) v3dBtn.style.display = 'inline-flex';
                    } catch (innerErr) {
                        hideWorkerLoader();
                        console.error("Error generando BC3:", innerErr);
                        alert("Error generando archivo BC3: " + innerErr.message);
                    }
                }, 50);
            } catch (err) {
                hideWorkerLoader();
                console.error("Error iniciando generación:", err);
                alert("Error al iniciar generación: " + err.message);
            }
        });
    }
}

// =============================================================================
// SISTEMA MULTI-PRESUPUESTO POR PESTAÑAS (MULTI-TAB)
// =============================================================================

let budgetTabs = [];
let activeTabId = null;
let tabCounter = 0;

function createBudgetTab(data, fileName, rawText) {
    if (!data) return null;
    tabCounter++;
    const tabId = 'tab_' + tabCounter + '_' + Date.now().toString(36);

    const roots = Array.isArray(data.root_nodes) ? data.root_nodes : Object.values(data.root_nodes || {});
    let pemTotal = 0;
    roots.forEach(rCode => {
        const c = data.concepts && data.concepts[rCode];
        if (c) pemTotal += (parseFloat(c.price) || 0);
    });

    let initialHistory = [];
    try {
        initialHistory = [JSON.stringify(data)];
    } catch (e) {
        initialHistory = [];
    }

    const newTab = {
        id: tabId,
        fileName: fileName || `Presupuesto ${tabCounter}.bc3`,
        data: data,
        rawText: rawText || data.original_text || '',
        expandedNodes: new Set(),
        stateHistory: initialHistory,
        historyIndex: 0,
        pemTotal: pemTotal,
        navigationStack: [],
        currentLevel: null,
        ganttState: {},
        certifications: {}
    };

    budgetTabs.push(newTab);
    switchBudgetTab(tabId);
    renderBudgetTabBar();
    return newTab;
}

function switchBudgetTab(tabId) {
    if (!tabId) return;

    // 1. Guardar estado de la pestaña actual saliente
    if (activeTabId && activeTabId !== tabId) {
        const currentTab = budgetTabs.find(t => t.id === activeTabId);
        if (currentTab && parsedData) {
            currentTab.data = parsedData;
            currentTab.rawText = originalFileText;
            currentTab.expandedNodes = new Set(expandedNodes);
            currentTab.stateHistory = stateHistory;
            currentTab.historyIndex = historyIndex;
            currentTab.navigationStack = [...navigationStack];
            currentTab.currentLevel = currentLevel;
            currentTab.ganttState = typeof ganttState !== 'undefined' ? ganttState : {};
            currentTab.certifications = window.certifications || {};
        }
    }

    // 2. Cargar estado de la pestaña entrante
    const targetTab = budgetTabs.find(t => t.id === tabId);
    if (!targetTab) return;

    activeTabId = tabId;
    currentFileName = targetTab.fileName;
    parsedData = targetTab.data;
    originalFileText = targetTab.rawText;

    // Restaurar estado de navegación y expansión
    expandedNodes.clear();
    if (targetTab.expandedNodes) {
        targetTab.expandedNodes.forEach(code => expandedNodes.add(code));
    }
    stateHistory = targetTab.stateHistory || [];
    historyIndex = targetTab.historyIndex || 0;
    navigationStack = targetTab.navigationStack ? [...targetTab.navigationStack] : [];
    currentLevel = targetTab.currentLevel || null;
    if (typeof ganttState !== 'undefined') {
        ganttState = targetTab.ganttState || {};
    }
    window.certifications = targetTab.certifications || {};

    // Controlar visibilidad del botón 📐 VISOR 3D (solo en pestañas IFC)
    const v3dBtnEl = document.getElementById('visor3dBtn');
    if (v3dBtnEl) {
        if (targetTab.isFromIfc) {
            v3dBtnEl.style.display = 'inline-flex';
        } else {
            v3dBtnEl.style.display = 'none';
            const v3dPanelEl = document.getElementById('visor3dPanel');
            if (v3dPanelEl && v3dPanelEl.style.display !== 'none') {
                const presBtn = document.getElementById('presupuestoBtn');
                if (presBtn) presBtn.click();
            }
        }
    }

    // Actualizar nombres en la interfaz
    const fileNameEl = document.getElementById('fileName');
    if (fileNameEl) fileNameEl.textContent = currentFileName;
    const dropdownFileName = document.getElementById('dropdownFileName');
    if (dropdownFileName) dropdownFileName.textContent = currentFileName;

    // Limpiar input de búsqueda
    const searchInput = document.getElementById('searchTerm');
    if (searchInput) searchInput.value = '';

    // Resetear panel de detalles para no mostrar partidas del presupuesto anterior
    const detailsContent = document.getElementById('detailsContent');
    if (detailsContent) detailsContent.style.display = 'none';
    const detailsEmpty = document.querySelector('#detailsPanel .empty-state');
    if (detailsEmpty) detailsEmpty.style.display = 'block';

    // Resetear comparador activo si lo hubiera
    compareData = null;
    compareActive = false;
    const compResults = document.getElementById('compareResults');
    if (compResults) compResults.style.display = 'none';

    // --- Renderizado seguro sin reiniciar la app ---
    try {
        // Calcular anchos de columna
        window.columnWidths = calculateOptimalColumnWidths(parsedData);

        // Actualizar botones de undo/redo
        updateUndoRedoButtonsState();

        // Mostrar controles de la app
        const actionsWrapper = document.getElementById('actionsWrapper');
        if (actionsWrapper) actionsWrapper.style.display = 'flex';
        const viewsGroup = document.getElementById('viewsGroup');
        const coeffsGroup = document.getElementById('coeffsGroup');
        const toolsGroup = document.getElementById('toolsGroup');
        if (viewsGroup) viewsGroup.style.display = 'flex';
        if (coeffsGroup) coeffsGroup.style.display = 'flex';
        if (toolsGroup) toolsGroup.style.display = 'flex';
        const headerActionGroup = document.getElementById('headerActionGroup');
        if (headerActionGroup) headerActionGroup.style.display = 'inline-flex';
        const uploadGroup = document.getElementById('uploadGroup');
        if (uploadGroup) uploadGroup.style.display = 'none';
        const searchBarContainer = document.getElementById('searchBarContainer');
        if (searchBarContainer) searchBarContainer.style.display = 'block';
        const closeBudgetBtn = document.getElementById('closeBudgetBtn');
        if (closeBudgetBtn) closeBudgetBtn.style.setProperty('display', 'inline-flex', 'important');

        // Ocultar empty state de bienvenida
        const emptyState = document.querySelector('#treePanel .empty-state');
        if (emptyState) emptyState.style.display = 'none';

        // Project info
        const info = document.getElementById('projectInfo');
        if (info) {
            const title = document.getElementById('projectTitle');
            if (title && parsedData && parsedData.properties) {
                const rawTitle = parsedData.properties.description || (parsedData.properties.owner + ' Project');
                title.textContent = rawTitle.replace(/#+\s*$/, '');
            }
            info.style.display = 'flex';
        }

        // Recalcular presupuesto y mostrar PEM/PEC
        recalculateAll();
        updateTotalBudgetDisplay();

        // Renderizar el árbol con el nivel y estado guardado
        renderCurrentLevel();

        // Asegurar vista de Presupuesto activa
        const treePanel = document.getElementById('treePanel');
        const detailsPanel = document.getElementById('detailsPanel');
        const pricesPanel = document.getElementById('pricesPanel');
        if (treePanel) treePanel.style.display = 'flex';
        if (detailsPanel) detailsPanel.style.display = 'flex';
        if (pricesPanel) pricesPanel.style.display = 'none';
        const v3dPanel = document.getElementById('visor3dPanel');
        if (v3dPanel) v3dPanel.style.display = 'none';

        const presupuestoBtn = document.getElementById('presupuestoBtn');
        if (presupuestoBtn) {
            document.querySelectorAll('.control-container button').forEach(b => b.classList.remove('active'));
            presupuestoBtn.classList.add('active');
        }
    } catch (e) {
        console.error("Error al cambiar de pestaña:", e);
    }

    renderBudgetTabBar();

    // Si el visualizador de descompuestos está abierto, sincronizarlo con el presupuesto activo
    const sModal = document.getElementById('sunburstModal');
    if (sModal && sModal.style.display === 'flex') {
        try {
            populateSunburstBudgetSelect();
            sunburstRootCode = null;
            refreshSunburst();
        } catch (e) {
            console.warn("Error al sincronizar Sunburst:", e);
        }
    }
}

function closeBudgetTab(tabId, e) {
    if (e) {
        e.stopPropagation();
        e.preventDefault();
    }
    const tabIdx = budgetTabs.findIndex(t => t.id === tabId);
    if (tabIdx === -1) return;

    if (budgetTabs.length === 1) {
        if (!confirm("¿Deseas cerrar el presupuesto actual?")) return;
        budgetTabs = [];
        activeTabId = null;
        renderBudgetTabBar();
        resetToWelcomeState();
        return;
    }

    // Cerrar pestaña
    budgetTabs.splice(tabIdx, 1);

    if (activeTabId === tabId) {
        const nextTab = budgetTabs[Math.max(0, tabIdx - 1)];
        if (nextTab) {
            switchBudgetTab(nextTab.id);
        }
    } else {
        renderBudgetTabBar();
    }
}

function renderBudgetTabBar() {
    const tabBar = document.getElementById('budgetTabBar');
    const tabsContainer = document.getElementById('budgetTabsContainer');
    if (!tabBar || !tabsContainer) return;

    if (budgetTabs.length === 0) {
        tabBar.style.display = 'none';
        return;
    }

    tabBar.style.display = 'flex';
    tabsContainer.innerHTML = '';

    budgetTabs.forEach(tab => {
        const tabEl = document.createElement('div');
        tabEl.className = `budget-tab ${tab.id === activeTabId ? 'active' : ''}`;
        
        let pem = 0;
        if (tab.data) {
            const roots = Array.isArray(tab.data.root_nodes) ? tab.data.root_nodes : Object.values(tab.data.root_nodes || {});
            roots.forEach(r => {
                const c = tab.data.concepts && tab.data.concepts[r];
                if (c) pem += (parseFloat(c.price) || 0);
            });
        }

        const pemFormatted = pem > 0 ? pem.toLocaleString('es-ES', { maximumFractionDigits: 0 }) + ' €' : '';

        tabEl.innerHTML = `
            <span style="font-size:0.9rem;">📄</span>
            <span class="budget-tab-title" title="${tab.fileName}">${tab.fileName}</span>
            ${pemFormatted ? `<span class="budget-tab-badge">${pemFormatted}</span>` : ''}
            <span class="budget-tab-close" title="Cerrar pestaña">✕</span>
        `;

        tabEl.addEventListener('click', (ev) => {
            if (ev.target.closest('.budget-tab-close')) return;
            if (tab.id !== activeTabId) {
                switchBudgetTab(tab.id);
            }
        });

        const closeBtn = tabEl.querySelector('.budget-tab-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                ev.preventDefault();
                closeBudgetTab(tab.id, ev);
            });
        }

        tabsContainer.appendChild(tabEl);
    });
}

function resetToWelcomeState() {
    // 1. Limpiar datos y variables globales
    parsedData = null;
    originalFileText = "";
    expandedNodes.clear();
    stateHistory = [];
    historyIndex = -1;
    compareData = null;
    compareActive = false;
    currentFileName = "presupuesto.bc3";

    // 2. Limpiar elementos de entrada y estadísticas
    const fileInput = document.getElementById('bc3file');
    if (fileInput) fileInput.value = '';

    const fileNameEl = document.getElementById('fileName');
    if (fileNameEl) {
        fileNameEl.innerHTML = '<span class="btn-text">SELECCIONAR ARCHIVO .BC3</span>';
    }

    const stats = document.getElementById('stats');
    if (stats) stats.textContent = '';

    const info = document.getElementById('projectInfo');
    if (info) info.style.display = 'none';

    const uploadGroup = document.getElementById('uploadGroup');
    if (uploadGroup) uploadGroup.style.display = 'none';

    const searchBarContainer = document.getElementById('searchBarContainer');
    if (searchBarContainer) searchBarContainer.style.display = 'none';

    const dropdownFileLabel = document.getElementById('dropdownFileLabel');
    if (dropdownFileLabel) dropdownFileLabel.style.display = 'none';

    // 3. Ocultar los contenedores de controles de acciones
    const actionsWrapper = document.getElementById('actionsWrapper');
    if (actionsWrapper) actionsWrapper.style.display = 'none';

    const viewsGroup = document.getElementById('viewsGroup');
    const coeffsGroup = document.getElementById('coeffsGroup');
    const toolsGroup = document.getElementById('toolsGroup');
    if (viewsGroup) viewsGroup.style.display = 'none';
    if (coeffsGroup) coeffsGroup.style.display = 'none';
    if (toolsGroup) toolsGroup.style.display = 'none';

    const headerActionGroup = document.getElementById('headerActionGroup');
    if (headerActionGroup) headerActionGroup.style.display = 'none';

    const closeBudgetBtn = document.getElementById('closeBudgetBtn');
    if (closeBudgetBtn) closeBudgetBtn.style.setProperty('display', 'none', 'important');

    // 4. Restaurar vista de bienvenida y vaciar contenido de partidas
    const treeContent = document.getElementById('treeContent');
    if (treeContent) treeContent.innerHTML = '';

    const emptyState = document.querySelector('#treePanel .empty-state');
    if (emptyState) emptyState.style.display = 'flex';

    const treePanel = document.getElementById('treePanel');
    if (treePanel) treePanel.style.display = 'flex';

    const detailsPanel = document.getElementById('detailsPanel');
    if (detailsPanel) detailsPanel.style.display = 'flex';

    const detailsContent = document.getElementById('detailsContent');
    if (detailsContent) detailsContent.style.display = 'none';

    const detailsPanelEmpty = document.querySelector('#detailsPanel .empty-state');
    if (detailsPanelEmpty) detailsPanelEmpty.style.display = 'block';

    const pricesPanel = document.getElementById('pricesPanel');
    if (pricesPanel) pricesPanel.style.display = 'none';

    const breadcrumbContainer = document.getElementById('breadcrumbContainer');
    if (breadcrumbContainer) breadcrumbContainer.style.display = 'none';

    const compResults = document.getElementById('compareResults');
    if (compResults) compResults.style.display = 'none';

    const totalBiDisplay = document.getElementById('budgetTotalBI');
    if (totalBiDisplay) totalBiDisplay.style.display = 'none';

    const totalPecDisplay = document.getElementById('budgetTotalPEC');
    if (totalPecDisplay) totalPecDisplay.style.display = 'none';

    const coeffsPanel = document.getElementById('coeffsPanel');
    if (coeffsPanel) coeffsPanel.style.display = 'none';

    // 5. Eliminar auto-carga de localStorage
    localStorage.removeItem('last_bc3_content');
    localStorage.removeItem('last_bc3_filename');
}

// Botón + en la barra de pestañas para añadir nuevo presupuesto
const budgetTabAddBtn = document.getElementById('budgetTabAddBtn');
const bc3MultiFileInput = document.getElementById('bc3MultiFileInput');

if (budgetTabAddBtn && bc3MultiFileInput) {
    budgetTabAddBtn.addEventListener('click', () => {
        bc3MultiFileInput.click();
    });
}

if (bc3MultiFileInput) {
    bc3MultiFileInput.addEventListener('change', async function () {
        if (!this.files || this.files.length === 0) return;
        const files = Array.from(this.files);
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.name.toLowerCase().endsWith('.ifc')) {
                await handleIfcFile(file);
                continue;
            }
            try {
                const result = await readAndParseBC3File(file);
                if (result.success) {
                    createBudgetTab(result.data, file.name, result.rawText || result.data.original_text);
                }
            } catch (err) {
                console.error("Error abriendo pestaña:", err);
                alert("Error al cargar " + file.name + ": " + err.message);
            }
        }
        this.value = '';
    });
}

// Upload Form Submit
const uploadForm = document.getElementById('uploadForm');
if (uploadForm) {
    uploadForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const fileInput = document.getElementById('bc3file');

        if (!fileInput.files.length) {
            alert("Por favor selecciona un archivo");
            return;
        }

        const btn = this.querySelector('.process-btn');
        const originalText = btn ? btn.textContent : '';
        if (btn) {
            btn.textContent = 'Procesando...';
            btn.disabled = true;
        }

        try {
            const files = Array.from(fileInput.files);
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                currentFileName = file.name;
                if (file.name.toLowerCase().endsWith('.ifc')) {
                    await handleIfcFile(file);
                    continue;
                }
                const result = await readAndParseBC3File(file);

                if (result.success) {
                    createBudgetTab(result.data, file.name, result.rawText || result.data.original_text);
                } else {
                    alert('Error: ' + (result.error || 'Unknown error'));
                }
            }
        } catch (err) {
            console.error(err);
            alert('Error procesando el archivo: ' + err.message);
        } finally {
            if (btn) {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        }
    });
}

// Botón para cerrar/salir del presupuesto (X roja)
const closeBudgetBtn = document.getElementById('closeBudgetBtn');
if (closeBudgetBtn) {
    closeBudgetBtn.addEventListener('click', () => {
        if (activeTabId) {
            closeBudgetTab(activeTabId);
        } else {
            resetToWelcomeState();
        }
    });
}

let parsedData = null;
let originalFileText = "";
const expandedNodes = new Set();

// Historial para Deshacer/Rehacer (Ctrl+Z / Ctrl+Y)
let stateHistory = [];
let historyIndex = -1;

// Estado de Comparación y Coeficientes
let compareData = null;
let compareActive = false;
let globalCoeffs = { gg: 13, bi: 6, baja: 0 };
// Chart instances are stored on the window object for proper destruction


// Drill-down navigation state
let navigationStack = []; // Stack of { code, title } objects
let currentLevel = null; // null = root level, or code of current parent

// Column resizing state and defaults (Code, Unit, Qty, Price, Proportion, Amount)
window.columnWidths = [190, 45, 80, 100, 180, 110];

/**
 * Formatea una cantidad respetando los estándares de ingeniería y construcción FIEBDC-3:
 * - Unidades contables (ud, unid, pza, un, etc.): 0 decimales (ej. 12)
 * - Longitud y Superficie (m, m2, m², ml, etc.): 2 decimales (ej. 145,20)
 * - Volumen y Peso (m3, m³, kg, t, etc.): 3 decimales (ej. 12,450)
 * - Resto (horas, porcentajes, etc.): 2 decimales
 * Siempre incluye punto separador de miles y coma decimal.
 */
function formatQuantityByUnit(qty, unit = '') {
    if (qty === null || qty === undefined || qty === '') return '';
    const num = typeof qty === 'number' ? qty : parseFloat(String(qty).replace(',', '.'));
    if (isNaN(num)) return '';
    
    const u = (unit || '').toLowerCase().trim();
    
    // 0 decimales: unidades contables
    if (/^(ud|ud\.|uds|uds\.|un|un\.|u|u\.|pza|pza\.|unid|unidad|unidades|ptda|pa)$/.test(u)) {
        return num.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
    
    // 3 decimales: volumen / peso / capacidades
    if (/^(m3|m³|m3\.|m³\.|dm3|dm³|cm3|cm³|l|l\.|litro|litros|kg|kg\.|t|ton|ton\.|tn)$/.test(u)) {
        return num.toLocaleString('es-ES', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
    }
    
    // 2 decimales: longitud, superficie (m, m2, m², ml), horas (h, hr), y resto
    return num.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatCurrency(amount) {
    if (amount === null || amount === undefined || amount === '') return '0,00 €';
    const num = typeof amount === 'number' ? amount : parseFloat(String(amount).replace(',', '.'));
    if (isNaN(num)) return '0,00 €';
    return `${num.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

// Calcular anchos óptimos para cada columna basándose en el contenido real
function calculateOptimalColumnWidths(data) {
    if (!data) return [190, 45, 80, 100, 180, 110];

    // 1. Calcular profundidades de todos los conceptos para tabular el Código correctamente
    const depths = {};
    function traverse(code, d) {
        depths[code] = Math.max(depths[code] || 0, d);
        const concept = data.concepts[code];
        if (concept && Array.isArray(concept.children)) {
            concept.children.forEach(childCode => {
                traverse(childCode, d + 1);
            });
        }
    }

    const roots = Array.isArray(data.root_nodes) ? data.root_nodes : Object.values(data.root_nodes);
    roots.forEach(code => traverse(code, 0));

    let maxCodeWidth = 150;
    let maxUnitWidth = 40;
    let maxQtyWidth = 80;
    let maxPriceWidth = 100;
    let maxAmountWidth = 110;

    // Crear un canvas temporal para medir texto usando la fuente del visor
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.font = '600 0.9rem Inter, system-ui, sans-serif';
    }

    Object.values(data.concepts).forEach(concept => {
        const codeText = concept.code.replace(/#+\s*$/, '');
        const depth = depths[concept.code] || 0;

        // Medida del código: texto + indentación (depth * 20px) + expand-arrow/paddings
        const textWidth = ctx ? ctx.measureText(codeText).width : (codeText.length * 8);
        const totalCodeWidth = textWidth + (depth * 20) + 60; // 60px para el botón expandir y padding
        if (totalCodeWidth > maxCodeWidth) maxCodeWidth = totalCodeWidth;

        // Medida de unidad
        const unitText = concept.unit || '';
        const unitWidth = ctx ? ctx.measureText(unitText).width + 24 : (unitText.length * 8 + 24);
        if (unitWidth > maxUnitWidth) maxUnitWidth = unitWidth;

        // Medida de precio
        const priceVal = parseFloat(concept.price) || 0;
        const priceText = priceVal.toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' €';
        const priceWidth = ctx ? ctx.measureText(priceText).width + 24 : (priceText.length * 8 + 24);
        if (priceWidth > maxPriceWidth) maxPriceWidth = priceWidth;
    });

    // Límites para evitar anchos extremos y asegurar un diseño limpio y equilibrado
    maxCodeWidth = Math.min(350, Math.max(160, Math.ceil(maxCodeWidth)));
    maxUnitWidth = Math.min(80, Math.max(45, Math.ceil(maxUnitWidth)));
    maxQtyWidth = Math.min(110, Math.max(80, Math.ceil(maxQtyWidth)));
    maxPriceWidth = Math.min(160, Math.max(100, Math.ceil(maxPriceWidth)));
    maxAmountWidth = Math.min(180, Math.max(110, Math.ceil(maxAmountWidth)));

    return [maxCodeWidth, maxUnitWidth, maxQtyWidth, maxPriceWidth, 180, maxAmountWidth];
}

/**
 * Transforma un elemento de texto en un campo editable con mini lápiz azul y confirmación (OK/Cancelar).
 * @param {HTMLElement} textEl El nodo de texto (ej. td, div, h2).
 * @param {Function} onSave Callback al guardar cambios. Retorna true si tiene éxito.
 * @param {Object} options Configuración adicional (isNumeric, multiLine, onFocus).
 */
function setupExplicitEdit(textEl, onSave, options = {}) {
    if (!textEl) return;

    if (textEl.dataset.explicitEditSetup) return;
    textEl.dataset.explicitEditSetup = "true";

    // Guardar el contenido original
    const originalHTML = textEl.innerHTML;
    textEl.innerHTML = '';

    // Crear el span interno que será editable
    const valEl = document.createElement('span');
    valEl.className = 'editable-val';
    valEl.contentEditable = "false";
    valEl.innerHTML = originalHTML;

    // Crear el contenedor de alineación flexible interno
    const container = document.createElement('div');
    container.className = 'editable-container';
    container.appendChild(valEl);

    const actions = document.createElement('div');
    actions.className = 'edit-actions';

    const btnPencil = document.createElement('button');
    btnPencil.type = 'button';
    btnPencil.className = 'btn-edit-pencil';
    btnPencil.textContent = '✏️';
    btnPencil.title = 'Editar';

    const btnOk = document.createElement('button');
    btnOk.type = 'button';
    btnOk.className = 'btn-edit-ok';
    btnOk.textContent = '✔️';
    btnOk.title = 'Aceptar';
    btnOk.style.display = 'none';

    const btnCancel = document.createElement('button');
    btnCancel.type = 'button';
    btnCancel.className = 'btn-edit-cancel';
    btnCancel.textContent = '❌';
    btnCancel.title = 'Cancelar';
    btnCancel.style.display = 'none';

    actions.appendChild(btnPencil);
    actions.appendChild(btnOk);
    actions.appendChild(btnCancel);
    container.appendChild(actions);

    // Inyectar el contenedor dentro del elemento original sin romper su etiqueta o jerarquía en el DOM
    textEl.appendChild(container);

    let originalVal = "";

    function startEdit() {
        originalVal = valEl.innerHTML;
        if (options.isNumeric) {
            const valText = valEl.textContent.trim().replace(/[^\d.,-]/g, '').replace(',', '.');
            const numVal = parseFloat(valText);
            valEl.textContent = isNaN(numVal) ? '' : numVal;
        }

        valEl.contentEditable = "true";
        valEl.focus();

        btnPencil.style.display = 'none';
        btnOk.style.display = 'inline-flex';
        btnCancel.style.display = 'inline-flex';

        if (options.onFocus) options.onFocus();
    }

    function saveEdit() {
        let newValText = valEl.textContent.trim();
        if (options.multiLine) {
            newValText = valEl.innerHTML
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<div\b[^>]*>/gi, '')
                .replace(/<\/div>/gi, '\n')
                .replace(/&nbsp;/g, ' ')
                .replace(/<[^>]*>/g, '')
                .trim();
        }

        let success = true;
        if (onSave) {
            success = onSave(newValText);
        }

        if (success !== false) {
            valEl.contentEditable = "false";
            btnPencil.style.display = 'inline-flex';
            btnOk.style.display = 'none';
            btnCancel.style.display = 'none';
        }
    }

    function cancelEdit() {
        valEl.innerHTML = originalVal;
        valEl.contentEditable = "false";
        btnPencil.style.display = 'inline-flex';
        btnOk.style.display = 'none';
        btnCancel.style.display = 'none';
    }

    btnPencil.addEventListener('click', (e) => {
        e.stopPropagation();
        startEdit();
    });

    btnOk.addEventListener('click', (e) => {
        e.stopPropagation();
        saveEdit();
    });

    btnCancel.addEventListener('click', (e) => {
        e.stopPropagation();
        cancelEdit();
    });

    valEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !options.multiLine) {
            e.preventDefault();
            saveEdit();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelEdit();
        }
    });

    valEl.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

/**
 * Actualiza el texto de un elemento editable de manera segura sin destruir sus botones e icono de lápiz.
 */
function updateEditableText(el, text, isHTML = false) {
    if (!el) return;
    const valEl = el.querySelector('.editable-val') || el;
    if (isHTML) {
        valEl.innerHTML = text;
    } else {
        valEl.textContent = text;
    }
}

// Obtener la descomposición de un concepto con factores
function getConceptDecomposition(concept) {
    if (!concept) return [];
    if (Array.isArray(concept.decomposition) && concept.decomposition.length > 0) {
        return concept.decomposition;
    }
    if (Array.isArray(concept.children) && concept.children.length > 0) {
        return concept.children.map(c => ({ code: c, factor: 1 }));
    }
    return [];
}

// Check if we're in mobile mode
function isMobileMode() {
    return window.innerWidth <= 1024;
}

// Update breadcrumb display
function updateBreadcrumbs() {
    const container = document.getElementById('breadcrumbContainer');
    const path = document.getElementById('breadcrumbPath');
    const backBtn = document.getElementById('breadcrumbBack');

    if (!isMobileMode() || navigationStack.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'flex';
    path.innerHTML = '';

    // Add root
    const rootItem = document.createElement('span');
    rootItem.className = 'breadcrumb-item';
    rootItem.textContent = 'Inicio';
    rootItem.onclick = () => navigateToLevel(null);
    path.appendChild(rootItem);

    // Add navigation stack items (compact on mobile)
    if (navigationStack.length <= 1) {
        navigationStack.forEach((item, index) => {
            const separator = document.createElement('span');
            separator.className = 'breadcrumb-separator';
            separator.textContent = ' › ';
            path.appendChild(separator);

            const breadcrumbItem = document.createElement('span');
            breadcrumbItem.className = index === navigationStack.length - 1 ? 'breadcrumb-current' : 'breadcrumb-item';
            breadcrumbItem.textContent = item.title;

            if (index < navigationStack.length - 1) {
                breadcrumbItem.onclick = () => navigateToLevel(item.code);
            }

            path.appendChild(breadcrumbItem);
        });
    } else {
        const separator1 = document.createElement('span');
        separator1.className = 'breadcrumb-separator';
        separator1.textContent = ' › ... › ';
        path.appendChild(separator1);

        const lastItem = navigationStack[navigationStack.length - 1];
        const breadcrumbItem = document.createElement('span');
        breadcrumbItem.className = 'breadcrumb-current';
        breadcrumbItem.textContent = lastItem.title;
        path.appendChild(breadcrumbItem);
    }

    // Back button handler
    backBtn.onclick = () => {
        if (navigationStack.length > 0) {
            navigationStack.pop();
            const newLevel = navigationStack.length > 0 ? navigationStack[navigationStack.length - 1].code : null;
            navigateToLevel(newLevel, false); // false = don't push to stack
        }
    };
}

// Navigate to a specific level
function navigateToLevel(parentCode, pushToStack = true) {
    currentLevel = parentCode;

    // Update stack
    if (pushToStack) {
        if (parentCode === null) {
            navigationStack = [];
        } else {
            // Find index of this code in stack
            const index = navigationStack.findIndex(item => item.code === parentCode);
            if (index >= 0) {
                // Going back to an existing level
                navigationStack = navigationStack.slice(0, index + 1);
            }
        }
    }

    updateBreadcrumbs();
    renderCurrentLevel();
}

// Render the current level based on navigation state
function renderCurrentLevel() {
    if (!parsedData) return;

    // Cache local del camino crítico para óptimo rendimiento
    try {
        window.currentCriticalPath = getCriticalPath();
    } catch (e) {
        window.currentCriticalPath = new Set();
    }

    const treeContainer = document.getElementById('treeContent');
    treeContainer.innerHTML = '';

    // Add mobile class if in mobile mode
    if (isMobileMode()) {
        treeContainer.classList.add('mobile-drilldown');
    } else {
        treeContainer.classList.remove('mobile-drilldown');
    }

    // Create Header
    const header = document.createElement('div');
    header.className = 'tree-header';
    header.id = 'treeHeader';

    const isMobile = isMobileMode();
    if (window.columnWidths && window.columnWidths.length >= 6) {
        const w = window.columnWidths;
        header.style.gridTemplateColumns = isMobile
            ? "1fr 90px 120px"
            : `${w[0]}px ${w[1]}px 1fr ${w[2]}px ${w[3]}px ${w[4]}px ${w[5]}px`;
    }

    const colHCode = document.createElement('div');
    colHCode.style.display = 'flex';
    colHCode.style.alignItems = 'center';
    colHCode.style.justifyContent = 'space-between';
    colHCode.style.gap = '8px';
    colHCode.innerHTML = `<span>Código</span>`;

    const toggleDraftBtn = document.createElement('button');
    toggleDraftBtn.type = 'button';
    toggleDraftBtn.id = 'toggleDraftBtn';
    toggleDraftBtn.style.cssText = `
        padding: 3px 8px;
        font-size: 11px;
        margin: 0;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 600;
        transition: background-color 0.2s;
    `;
    if (draftActive) {
        toggleDraftBtn.textContent = '✕ Cerrar';
        toggleDraftBtn.style.backgroundColor = '#ef4444';
        toggleDraftBtn.style.color = 'white';
    } else {
        toggleDraftBtn.textContent = '➕ Nueva Partida';
        toggleDraftBtn.style.backgroundColor = 'var(--accent, #3b82f6)';
        toggleDraftBtn.style.color = 'white';
    }
    toggleDraftBtn.onclick = (e) => {
        e.stopPropagation();
        draftActive = !draftActive;
        if (draftActive) {
            draftNode = {
                parentCode: null,
                index: 0,
                depth: 0,
                unit: 'ud',
                summary: '',
                qty: '',
                price: ''
            };
        }
        renderCurrentLevel();
    };
    colHCode.appendChild(toggleDraftBtn);

    const colHUnit = document.createElement('div');
    colHUnit.textContent = 'Ud';
    const colHSummary = document.createElement('div');
    colHSummary.textContent = 'Resumen';
    const colHQty = document.createElement('div');
    colHQty.textContent = 'Cantidad';
    const colHPrice = document.createElement('div');
    colHPrice.textContent = 'Precio';
    const colHProportion = document.createElement('div');
    colHProportion.textContent = 'Proporción';
    const colHAmount = document.createElement('div');
    colHAmount.textContent = 'Importe';

    header.appendChild(colHCode);
    header.appendChild(colHUnit);
    header.appendChild(colHSummary);
    header.appendChild(colHQty);
    header.appendChild(colHPrice);
    header.appendChild(colHProportion);
    header.appendChild(colHAmount);

    treeContainer.appendChild(header);

    const rootList = document.createElement('div');
    rootList.className = 'tree-roots';

    if (isMobileMode()) {
        // Mobile: Show only current level
        if (currentLevel === null) {
            // Show root nodes
            const roots = Array.isArray(parsedData.root_nodes) ? parsedData.root_nodes : Object.values(parsedData.root_nodes);
            roots.forEach(code => {
                const rootNode = createNode(code, true, 0, 1, true); // true = mobile mode
                if (rootNode) {
                    rootList.appendChild(rootNode);
                }
            });
        } else {
            // Show children of current level
            const concept = parsedData.concepts[currentLevel];
            if (concept) {
                const decomposition = getConceptDecomposition(concept);

                decomposition.forEach(item => {
                    const childNode = createNode(item.code, false, 0, item.factor, true, item.type || 0); // true = mobile mode
                    if (childNode) {
                        rootList.appendChild(childNode);
                    }
                });
            }
        }
    } else {
        // Desktop: Renderizado Virtualizado Adaptativo para presupuestos masivos (+10.000 líneas)
        const roots = Array.isArray(parsedData.root_nodes) ? parsedData.root_nodes : Object.values(parsedData.root_nodes);
        
        // Comprobar volumen total de conceptos para activar Virtual Scrolling en presupuestos grandes
        const totalConceptsCount = Object.keys(parsedData.concepts || {}).length;

        if (totalConceptsCount > 150) {
            // Motor Virtualizado
            const flatTree = [];
            function flattenTree(code, isRoot, depth, factor, type) {
                const c = parsedData.concepts[code];
                if (!c) return;
                flatTree.push({ code, isRoot, depth, factor, type });
                if (isRoot || expandedNodes.has(code)) {
                    const decomp = getConceptDecomposition(c);
                    decomp.forEach(child => {
                        flattenTree(child.code, false, depth + 1, child.factor, child.type || 0);
                    });
                }
            }
            roots.forEach(rCode => flattenTree(rCode, true, 0, 1, 0));

            // Si el número de nodos desplegados es grande, usar ventana virtual
            if (flatTree.length > 100) {
                const rowHeight = 36;
                const totalHeight = flatTree.length * rowHeight;
                
                const virtualViewport = document.createElement('div');
                virtualViewport.className = 'virtual-tree-viewport';
                virtualViewport.style.cssText = `position: relative; height: ${totalHeight}px; width: 100%;`;

                const virtualContent = document.createElement('div');
                virtualContent.className = 'virtual-tree-content';
                virtualContent.style.cssText = `position: absolute; left: 0; right: 0; top: 0;`;

                virtualViewport.appendChild(virtualContent);
                rootList.appendChild(virtualViewport);

                const updateVirtualWindow = () => {
                    const scrollTop = treeContainer.scrollTop || 0;
                    const viewportH = treeContainer.clientHeight || 800;

                    const startIdx = Math.max(0, Math.floor(scrollTop / rowHeight) - 8);
                    const endIdx = Math.min(flatTree.length, Math.ceil((scrollTop + viewportH) / rowHeight) + 8);

                    virtualContent.style.transform = `translateY(${startIdx * rowHeight}px)`;
                    virtualContent.innerHTML = '';

                    for (let i = startIdx; i < endIdx; i++) {
                        const item = flatTree[i];
                        const nodeEl = createNode(item.code, item.isRoot, item.depth, item.factor, false, item.type);
                        if (nodeEl) virtualContent.appendChild(nodeEl);
                    }
                    updateGridTemplate();
                };

                treeContainer.onscroll = () => requestAnimationFrame(updateVirtualWindow);
                updateVirtualWindow();
            } else {
                roots.forEach((code, idx) => {
                    if (draftActive && draftNode.parentCode === null && draftNode.index === idx) {
                        rootList.appendChild(createDraftNodeRow(0));
                    }
                    const rootNode = createNode(code, true, 0, 1, false);
                    if (rootNode) rootList.appendChild(rootNode);
                });
            }
        } else {
            // Renderizado directo ultrarrápido para presupuestos estándar
            roots.forEach((code, idx) => {
                if (draftActive && draftNode.parentCode === null && draftNode.index === idx) {
                    rootList.appendChild(createDraftNodeRow(0));
                }
                const rootNode = createNode(code, true, 0, 1, false);
                if (rootNode) rootList.appendChild(rootNode);
            });
            if (draftActive && draftNode.parentCode === null && draftNode.index >= roots.length) {
                rootList.appendChild(createDraftNodeRow(0));
            }
        }
    }

    treeContainer.appendChild(rootList);

    // Re-apply filter if exists
    const searchTerm = document.getElementById('searchTerm').value.trim();
    if (searchTerm) {
        filterTree(searchTerm);
    }

    // Apply current column width template
    updateGridTemplate();
}



// Update grid template for all rows
function updateGridTemplate() {
    if (!window.columnWidths || window.columnWidths.length < 6) return;

    const isMobile = isMobileMode();
    const w = window.columnWidths;

    // Si es móvil, dejamos que el CSS controle las columnas o aplicamos el template móvil
    const template = isMobile
        ? "1fr 90px 120px"
        : `${w[0]}px ${w[1]}px 1fr ${w[2]}px ${w[3]}px ${w[4]}px ${w[5]}px`;

    // Update header
    const header = document.getElementById('treeHeader');
    if (header) {
        header.style.gridTemplateColumns = template;

        // Update individual header column widths (excluding summary 1fr)
        const cols = header.children;
        if (cols.length >= 7) {
            if (isMobile) {
                // En móvil reseteamos anchos fijos
                Array.from(cols).forEach(c => c.style.width = '');
            } else {
                cols[0].style.width = w[0] + 'px';
                cols[1].style.width = w[1] + 'px';
                // cols[2] is Resumen (1fr), we don't set a fixed width on it
                cols[3].style.width = w[2] + 'px';
                cols[4].style.width = w[3] + 'px';
                cols[5].style.width = w[4] + 'px';
                cols[6].style.width = w[5] + 'px';
            }
        }
    }

    // Update all tree node rows
    document.querySelectorAll('.tree-node-row').forEach(row => {
        row.style.gridTemplateColumns = template;
    });
}

function renderApp(data) {
    parsedData = data;
    originalFileText = data.original_text || "";
    expandedNodes.clear();

    // Calcular anchos de columna automáticos óptimos
    window.columnWidths = calculateOptimalColumnWidths(data);

    // Inicializar historial
    stateHistory = [JSON.stringify(parsedData)];
    historyIndex = 0;
    updateUndoRedoButtonsState();

    // Reset navigation state
    navigationStack = [];
    currentLevel = null;

    // Show control containers and buttons
    const actionsWrapper = document.getElementById('actionsWrapper');
    if (actionsWrapper) actionsWrapper.style.display = 'flex';

    const viewsGroup = document.getElementById('viewsGroup');
    const coeffsGroup = document.getElementById('coeffsGroup');
    const toolsGroup = document.getElementById('toolsGroup');
    if (viewsGroup) viewsGroup.style.display = 'flex';
    if (coeffsGroup) coeffsGroup.style.display = 'flex';
    if (toolsGroup) toolsGroup.style.display = 'flex';

    const headerActionGroup = document.getElementById('headerActionGroup');
    if (headerActionGroup) headerActionGroup.style.display = 'inline-flex';

    const uploadGroup = document.getElementById('uploadGroup');
    if (uploadGroup) uploadGroup.style.display = 'none';

    const dropdownFileLabel = document.getElementById('dropdownFileLabel');
    if (dropdownFileLabel) dropdownFileLabel.style.display = 'flex';

    const dropdownFileName = document.getElementById('dropdownFileName');
    if (dropdownFileName) dropdownFileName.textContent = currentFileName;

    const searchBarContainer = document.getElementById('searchBarContainer');
    if (searchBarContainer) searchBarContainer.style.display = 'block';

    const closeBudgetBtn = document.getElementById('closeBudgetBtn');
    if (closeBudgetBtn) {
        closeBudgetBtn.style.setProperty('display', 'inline-flex', 'important');
    }

    // Resetear comparador y coeficientes al cargar un nuevo presupuesto
    compareData = null;
    compareActive = false;
    const compResults = document.getElementById('compareResults');
    if (compResults) compResults.style.display = 'none';
    const totalBiDisplay = document.getElementById('budgetTotalBI');
    if (totalBiDisplay) totalBiDisplay.style.display = 'none';
    const totalPecDisplay = document.getElementById('budgetTotalPEC');
    if (totalPecDisplay) totalPecDisplay.style.display = 'none';
    const toggleCoeffs = document.getElementById('toggleCoeffsBtn');
    if (toggleCoeffs) toggleCoeffs.style.display = 'flex';
    const coeffsPanel = document.getElementById('coeffsPanel');
    if (coeffsPanel) coeffsPanel.style.display = 'none';

    // Restablecer valores de inputs de coeficientes a los valores por defecto
    const ggIn = document.getElementById('coeffGG');
    const biIn = document.getElementById('coeffBI');
    const bajaIn = document.getElementById('coeffBaja');
    if (ggIn) ggIn.value = 13;
    if (biIn) biIn.value = 6;
    if (bajaIn) bajaIn.value = 0;
    globalCoeffs = { gg: 13, bi: 6, baja: 0 };

    // Mostrar botón de auditoría
    const auditBtn = document.getElementById('auditLogBtn');
    if (auditBtn) auditBtn.style.display = 'flex';

    // Cargar certificaciones de localStorage
    const descriptionName = data.properties.description || 'default';
    const certKey = `budget_certifications_${descriptionName.replace(/\s+/g, '_')}`;
    try {
        const storedCerts = localStorage.getItem(certKey);
        window.certifications = storedCerts ? JSON.parse(storedCerts) : {};
    } catch (e) {
        window.certifications = {};
    }

    // Inicializar auditoría
    window.auditLog = [];
    updateAuditLogModal();

    // Inicializar Gantt en segundo plano para que la ruta crítica esté lista
    try {
        ganttTasks = getGanttTasks();
        const loaded = ganttLoad();
        if (!loaded || Object.keys(ganttState).length === 0) {
            ganttState = {};
            initGanttStateAuto(ganttTasks, ganttTotalWeeks);
            ganttSave();
        } else {
            recalculateParentTasks();
            recalculateParentProgress();
        }
    } catch (e) {
        console.warn("Gantt background init warning:", e);
    }


    // Mostrar barra de filtros
    const filterBar = document.getElementById('filterBar');
    if (filterBar) {
        if (isMobileMode()) {
            filterBar.style.display = 'none';
            const toggleBtn = document.getElementById('toggleFilterBarBtn');
            if (toggleBtn) {
                toggleBtn.textContent = '🎛️';
            }
            filterBar.classList.remove('visible');
        } else {
            filterBar.style.display = 'flex';
        }
    }

    // Recalcular todo el presupuesto de abajo hacia arriba inmediatamente al cargar
    recalculateAll();

    updateTotalBudgetDisplay();

    // Render Project Info (only if elements exist - for standalone viewer)
    const info = document.getElementById('projectInfo');
    if (info) {
        const title = document.getElementById('projectTitle');
        const owner = document.getElementById('projectOwner');
        const stats = document.getElementById('stats');

        if (title) {
            // Try to find a good title. Usually from ~V properties or root node.
            // Improve title display by removing trailing # if present
            const rawTitle = data.properties.description || (data.properties.owner + ' Project');
            title.textContent = rawTitle.replace(/#+\s*$/, '');
        }

        if (owner) {
            // Display metadata
            const metaText = [
                data.properties.owner ? `Propietario: ${data.properties.owner}` : '',
                data.properties.format ? `Formato: ${data.properties.format}` : '',
                data.properties.charset ? `(${data.properties.charset})` : ''
            ].filter(Boolean).join(' | ');
            owner.textContent = metaText;
        }

        if (stats) {
            // Desactivado a petición del usuario para que no aparezca el texto debajo de PEM y PEC
            stats.textContent = "";
        }

        info.style.display = 'flex';
    }

    // Hide empty state
    const emptyState = document.querySelector('#treePanel .empty-state');
    if (emptyState) emptyState.style.display = 'none';

    try {
        // Render using new navigation system
        renderCurrentLevel();

        // Sincronizar y mostrar siempre la pestaña en la barra de pestañas (incluso con 1 solo presupuesto)
        if (budgetTabs.length === 0 || !activeTabId) {
            tabCounter++;
            const tabId = 'tab_' + tabCounter + '_' + Date.now().toString(36);
            const roots = Array.isArray(data.root_nodes) ? data.root_nodes : Object.values(data.root_nodes || {});
            let pemTotal = 0;
            roots.forEach(rCode => {
                const c = data.concepts && data.concepts[rCode];
                if (c) pemTotal += (parseFloat(c.price) || 0);
            });
            const newTab = {
                id: tabId,
                fileName: currentFileName || `Presupuesto ${tabCounter}.bc3`,
                data: data,
                rawText: originalFileText || data.original_text || '',
                expandedNodes: new Set(expandedNodes),
                stateHistory: stateHistory,
                historyIndex: historyIndex,
                pemTotal: pemTotal,
                navigationStack: [...navigationStack],
                currentLevel: currentLevel,
                ganttState: typeof ganttState !== 'undefined' ? ganttState : {},
                certifications: window.certifications || {}
            };
            budgetTabs = [newTab];
            activeTabId = tabId;
        }
        renderBudgetTabBar();
    } catch (e) {
        console.error(e);
        document.getElementById('stats').textContent += ' | ERROR RENDER: ' + e.message;
    }
}


/**
 * Filter the tree view based on search text
 * @param {string} text 
 */
function filterTree(text) {
    const rootContainer = document.getElementById('treeContent');
    const nodes = rootContainer.querySelectorAll('.tree-node-container');
    const lowerText = text.toLowerCase();

    // Helper to get text content of a concept for searching
    function getSearchContent(code) {
        const c = parsedData.concepts[code];
        if (!c) return '';
        let str = c.code + ' ' + c.summary + ' ' + (c.description || '');
        if (c.measurements && c.measurements.length) {
            str += ' ' + c.measurements.map(m => (m.label || '') + ' ' + (m.units || '')).join(' ');
        }
        return str.toLowerCase();
    }

    // Pass 1: Mark matches
    // We can't just iterate flat list easily because visual hierarchy matters.
    // Actually, iterating DOM nodes depth-first or checking logic?
    // Easiest: Recursive function acting on DOM nodes has issues if we select 'all' nodes flatly.
    // Better: Select top-level nodes and recurse.

    // Instead of complex DOM recursion, let's use the flat querySelectorAll but handle logic carefully?
    // No, hierarchy matters: Parent visible if Child visible.

    // Recursive approach on DOM structure:
    function processElement(el) {
        // el is .tree-node-container
        const code = el.dataset.code;
        const childrenContainer = el.querySelector('.tree-node-children');

        let isMatch = false;

        // 1. Check self
        if (code && getSearchContent(code).includes(lowerText)) {
            isMatch = true;
        }

        // 2. Check children
        let childVisible = false;
        if (childrenContainer) {
            const children = childrenContainer.querySelectorAll(':scope > .tree-node-container');
            children.forEach(child => {
                if (processElement(child)) {
                    childVisible = true;
                }
            });
        }

        // Decision
        if (text === '') {
            el.style.display = '';
            // Optional: Collapse everything? Or leave as is. 
            // Leaving as is allows user to clear search and see context.
            return true;
        }

        if (isMatch || childVisible) {
            el.style.display = '';
            // If child matched, expand self
            if (childVisible && childrenContainer) {
                childrenContainer.classList.add('visible');
                const toggle = el.querySelector('.toggle-icon');
                if (toggle) toggle.classList.add('expanded');
            }
            return true;
        } else {
            el.style.display = 'none';
            return false;
        }
    }

    // Start with root nodes in the tree container (skipping header)
    // The roots are inside a div (rootList) or directly appended?
    // In renderApp: treeContainer.appendChild(rootList);
    // rootList contains headers? No, header is separate.
    // rootList contains createNode outputs.
    // Actually renderApp does: 
    // rootList = div
    // rootList.appendChild(rootNode)

    // So we need to select children of rootList.
    // Since we don't have a distinct ID for rootList, let's just select .tree-node-container inside treeContent
    // But `querySelectorAll` is flat.
    // ...
    // treeContainer.appendChild(rootList);

    // We need top-level containers. 
    // Let's modify renderApp to give rootList a class or ID, OR just use :scope > div > .tree-node-container?

    // Re-reading renderApp:
    // const rootList = document.createElement('div');
    // rootList.className = 'tree-roots';
    // ...
    // treeContainer.appendChild(rootList);

    const rootList = rootContainer.querySelector('.tree-roots');
    if (rootList) {
        const roots = rootList.children; // These are top level containers
        Array.from(roots).forEach(root => {
            if (root.classList.contains('tree-node-container')) {
                processElement(root);
            }
        });
    }
}

/**
 * createNode
 * @param {string} code 
 * @param {boolean} isRoot 
 * @param {number} depth 
 * @param {number} qty - Quantity of this node in the parent context (factor)
 * @param {boolean} mobileMode - Whether to render in mobile drill-down mode
 */
function createNode(code, isRoot = false, depth = 0, qty = 1, mobileMode = false, type = 0) {
    // Validar si el nodo debe mostrarse según filtros activos
    if (typeof shouldShowNode === 'function' && !shouldShowNode(code)) {
        return null;
    }

    const concept = parsedData.concepts[code];
    if (!concept) {
        console.warn('Missing concept:', code);
        return document.createTextNode('');
    }

    const container = document.createElement('div');
    container.className = 'tree-node-container';
    container.dataset.code = code;

    const row = document.createElement('div');

    // Determine styling class
    let hasChildren = false;
    let decomposition = [];

    // Helper to get decomposition with factors
    decomposition = getConceptDecomposition(concept);
    if (decomposition.length > 0) {
        hasChildren = true;
    }

    // Also check for measurements (~M)
    let hasMeasurements = false;
    if (Array.isArray(concept.measurements) && concept.measurements.length > 0) {
        hasMeasurements = true;
        hasChildren = true;
    }

    // Check for Description (~T)
    let hasDescription = false;
    if (concept.description && concept.description.trim().length > 0) {
        hasDescription = true;
        hasChildren = true; // Description makes it expandable
    }

    // Determine if it's a chapter/folder structurally
    // In BC3, codes ending in '#' are typically chapters.
    // Also if it has children, treat as chapter.
    const isChapter = concept.code.endsWith('#') || (!concept.unit || concept.unit.trim() === '');

    row.className = 'tree-node-row';
    if (window.currentCriticalPath && window.currentCriticalPath.has(code)) {
        row.classList.add('tree-node-row--critical');
    }

    const isMobile = isMobileMode();
    if (window.columnWidths && window.columnWidths.length >= 6) {
        const w = window.columnWidths;
        row.style.gridTemplateColumns = isMobile
            ? "1fr 90px 120px"
            : `${w[0]}px ${w[1]}px 1fr ${w[2]}px ${w[3]}px ${w[4]}px ${w[5]}px`;
    }

    if (isChapter) {
        if (depth === 0) {
            row.classList.add('node-chapter');
        } else {
            row.classList.add('node-subchapter');
        }
    } else {
        row.classList.add('node-item');
    }

    // 1. Column: Code (Merged with Hierarchy/Toggle)
    const colCode = document.createElement('div');
    colCode.className = 'col-code';
    // Style applied in CSS (flex), but padding for depth here
    colCode.style.paddingLeft = (depth * 20 + 8) + 'px';

    const toggle = document.createElement('span');
    toggle.className = 'toggle-icon';
    toggle.textContent = '▶';
    // Hide if no children, but keep space? Or just opacity 0? 
    // User said "remove column", if simple node, maybe no triangle at all?
    // "ponerlos al lado del código".
    if (hasChildren || (draftActive && draftNode.parentCode === code)) {
        toggle.style.opacity = '1';
        if (isRoot || expandedNodes.has(code) || (draftActive && draftNode.parentCode === code)) toggle.classList.add('expanded');
    } else {
        toggle.style.opacity = '0'; // Invisible but keeps alignment if fixed width
        // Or display none? If display none, text shifts left. Better to keep placeholder or use opacity.
        // Let's use opacity 0 for alignment.
    }

    colCode.appendChild(toggle);

    // Code Text
    const codeSpan = document.createElement('span');
    codeSpan.textContent = concept.code.replace(/#+\s*$/, '');
    colCode.appendChild(codeSpan);

    // Add resource type badge if type is defined (1=MO, 2=MAQ, 3=MAT, 4=SUB)
    if (type > 0 && type <= 4) {
        const badge = document.createElement('span');
        badge.className = 'badge';
        if (type === 1) {
            badge.classList.add('badge-mo');
            badge.textContent = 'MO';
            badge.title = 'Mano de obra';
        } else if (type === 2) {
            badge.classList.add('badge-maq');
            badge.textContent = 'MAQ';
            badge.title = 'Maquinaria';
        } else if (type === 3) {
            badge.classList.add('badge-mat');
            badge.textContent = 'MAT';
            badge.title = 'Material';
        } else if (type === 4) {
            badge.classList.add('badge-sub');
            badge.textContent = 'SUB';
            badge.title = 'Subcontrato';
        }
        colCode.appendChild(badge);
    }

    if (window.currentCriticalPath && window.currentCriticalPath.has(code)) {
        const critBadge = document.createElement('span');
        critBadge.className = 'badge-critical-tree';
        critBadge.textContent = '⚡ CRÍTICO';
        critBadge.title = 'Esta partida está en la Ruta Crítica de la obra';
        colCode.appendChild(critBadge);
    }

    // 2. Column: Unit

    // 3. Column: Unit
    const colUnit = document.createElement('div');
    colUnit.className = 'col-unit';
    colUnit.textContent = concept.unit;

    // 4. Column: Summary (Editable)
    const colSummary = document.createElement('div');
    colSummary.className = 'col-summary';
    colSummary.textContent = concept.summary || '(Sin título)';

    setupExplicitEdit(colSummary, (newSummary) => {
        if (newSummary && newSummary !== concept.summary) {
            const oldVal = concept.summary;
            logChange(concept.code.replace(/#+\s*$/, ''), `Cambio de resumen a: "${newSummary}"`, oldVal, newSummary, () => {
                concept.summary = newSummary;

                // Actualizar panel de detalles si coincide el código
                const detCodeEl = document.getElementById('detCode');
                const detSummaryEl = document.getElementById('detSummary');
                if (detCodeEl && detSummaryEl && detCodeEl.textContent === concept.code.replace(/#+\s*$/, '')) {
                    const valEl = detSummaryEl.classList.contains('editable-val') ? detSummaryEl : detSummaryEl.querySelector('.editable-val');
                    if (valEl) valEl.textContent = newSummary;
                    else detSummaryEl.textContent = newSummary;
                }
            });
            return true;
        }
        return false;
    });

    // Values
    const priceVal = parseFloat(concept.price);
    const qtyVal = parseFloat(qty);
    const amountVal = (isNaN(priceVal) || isNaN(qtyVal)) ? 0 : (priceVal * qtyVal);

    // 5. Column: Quantity (Editable para partidas con factor en el padre)
    const colQty = document.createElement('div');
    colQty.className = 'col-quantity';

    if (isChapter) {
        colQty.textContent = '';
    } else {
        colQty.textContent = isNaN(qtyVal) ? '' : formatQuantityByUnit(qtyVal, concept.unit);

        // Solo hacer editable si no es raíz, no es capítulo y tiene un factor (qty) válido
        const isEditableQty = !isRoot && !isChapter && !isNaN(qtyVal);
        if (isEditableQty) {
            setupExplicitEdit(colQty, (newQtyText) => {
                const rawText = newQtyText.trim().replace(',', '.');
                const newVal = parseFloat(rawText);
                if (!isNaN(newVal) && newVal >= 0) {
                    const oldVal = qtyVal;
                    if (oldVal !== newVal) {
                        // Buscar el factor en la descomposición del padre y actualizarlo
                        let updated = false;
                        Object.values(parsedData.concepts).forEach(parentConcept => {
                            if (!Array.isArray(parentConcept.decomposition)) return;
                            parentConcept.decomposition.forEach(item => {
                                if (item.code === code && !updated) {
                                    logChange(
                                        concept.code.replace(/#+\s*$/, ''),
                                        `Cambio de cantidad: ${formatQuantityByUnit(oldVal, concept.unit)} → ${formatQuantityByUnit(newVal, concept.unit)} ${concept.unit || ''}`,
                                        `${formatQuantityByUnit(oldVal, concept.unit)}`,
                                        `${formatQuantityByUnit(newVal, concept.unit)}`,
                                        () => {
                                            item.factor = newVal;
                                            // Actualizar cantidad del concepto si tiene mediciones
                                            concept.quantity = newVal;
                                            // Marcar padre para recálculo
                                            parentConcept.isManualPrice = false;
                                        }
                                    );
                                    updated = true;
                                }
                            });
                        });
                        // Actualizar el importe mostrado en esta misma fila
                        const newAmount = newVal * (parseFloat(concept.price) || 0);
                        const amountEl = row.querySelector('.col-amount');
                        if (amountEl) {
                            amountEl.textContent = newAmount === 0 ? '' : newAmount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        }
                        return true;
                    }
                }
                // Revertir si valor inválido
                colQty.querySelector('.editable-val') && (colQty.querySelector('.editable-val').textContent =
                    isNaN(qtyVal) ? '' : formatQuantityByUnit(qtyVal, concept.unit));
                return false;
            }, { isNumeric: true });
        }
    }

    // 6. Column: Price (Editable solo para partidas)
    const colPrice = document.createElement('div');
    colPrice.className = 'col-price';

    if (isChapter) {
        colPrice.textContent = '';
    } else {
        colPrice.textContent = isNaN(priceVal) ? '' : priceVal.toLocaleString('es-ES', { minimumFractionDigits: 2 });

        // Agregar desviación si el comparador está activo
        if (compareActive && compareData && compareData[code]) {
            const compConcept = compareData[code];
            const mainPrice = parseFloat(concept.price) || 0;
            const compPrice = parseFloat(compConcept.price) || 0;
            if (mainPrice !== compPrice) {
                const diffPrice = mainPrice - compPrice;
                const pct = compPrice === 0 ? 0 : (diffPrice / compPrice) * 100;
                const badge = document.createElement('span');
                badge.className = 'dev-badge ' + (diffPrice >= 0 ? 'dev-up' : 'dev-down');
                badge.textContent = `${diffPrice >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
                colPrice.appendChild(badge);
            }
        }

        const isEditablePrice = !isChapter;
        if (isEditablePrice) {
            setupExplicitEdit(colPrice, (newPriceText) => {
                const rawText = newPriceText.trim().replace(',', '.');
                const newVal = parseFloat(rawText);
                if (!isNaN(newVal) && newVal >= 0) {
                    const oldVal = parseFloat(concept.price) || 0;
                    if (oldVal !== newVal) {
                        logChange(concept.code.replace(/#+\s*$/, ''), `Cambio de precio unitario: ${newVal.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`, `${oldVal.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`, `${newVal.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`, () => {
                            concept.price = newVal;
                            concept.isManualPrice = true; // Bloquear precio manual
                        });
                        return true;
                    }
                }
                const prevPrice = parseFloat(concept.price) || 0;
                colPrice.textContent = prevPrice.toLocaleString('es-ES', { minimumFractionDigits: 2 });
                return false;
            }, {
                isNumeric: true
            });
        } else {
            colPrice.contentEditable = "false";
        }
    }

    // 6.5. Column: Proportion (% PEM and resource composition color bar)
    const colProportion = document.createElement('div');
    colProportion.className = 'col-proportion';
    if (isChapter) {
        const totalPEM = window.currentTotalPEM || calculateTotalBudget() || 1.0;
        const pctPEM = ((parseFloat(concept.price) || 0) / totalPEM) * 100;

        const res = accumulateChapterResources(code);
        const sumRes = res.mo + res.mat + res.maq + res.sub + res.etc;
        const pMO = sumRes === 0 ? 0 : (res.mo / sumRes) * 100;
        const pMAT = sumRes === 0 ? 0 : (res.mat / sumRes) * 100;
        const pMAQ = sumRes === 0 ? 0 : (res.maq / sumRes) * 100;
        const pSUB = sumRes === 0 ? 0 : (res.sub / sumRes) * 100;
        const pETC = sumRes === 0 ? 0 : (res.etc / sumRes) * 100;

        colProportion.innerHTML = `
            <div style="display:flex; align-items:center; gap:8px; width:100%;">
                <span class="pct-pem-badge" style="font-weight:600; font-size:0.75rem; color:var(--text-secondary); min-width:42px; display:inline-block; text-align:right;">${pctPEM.toFixed(1)}%</span>
                <div class="resource-bar-container" style="height: 10px; border-radius: 4px; overflow: hidden; background: var(--border-color); display: flex; flex-grow: 1; min-width: 60px; max-width: 110px; margin: auto 0;">
                    <div class="resource-bar-segment rb-mo" style="width: ${pMO.toFixed(1)}%" title="Mano de obra: ${pMO.toFixed(1)}% (${Math.round(res.mo).toLocaleString('es-ES')} €)"></div>
                    <div class="resource-bar-segment rb-mat" style="width: ${pMAT.toFixed(1)}%" title="Materiales: ${pMAT.toFixed(1)}% (${Math.round(res.mat).toLocaleString('es-ES')} €)"></div>
                    <div class="resource-bar-segment rb-maq" style="width: ${pMAQ.toFixed(1)}%" title="Maquinaria: ${pMAQ.toFixed(1)}% (${Math.round(res.maq).toLocaleString('es-ES')} €)"></div>
                    <div class="resource-bar-segment rb-sub" style="width: ${pSUB.toFixed(1)}%" title="Subcontratas: ${pSUB.toFixed(1)}% (${Math.round(res.sub).toLocaleString('es-ES')} €)"></div>
                    <div class="resource-bar-segment rb-etc" style="width: ${pETC.toFixed(1)}%" title="Resto: ${pETC.toFixed(1)}% (${Math.round(res.etc).toLocaleString('es-ES')} €)"></div>
                </div>
            </div>
        `;
        colProportion.style.display = 'flex';
        colProportion.style.alignItems = 'center';
    } else {
        colProportion.textContent = '';
    }

    // 7. Column: Amount (Importe)
    const colAmount = document.createElement('div');
    colAmount.className = 'col-amount';
    colAmount.textContent = amountVal === 0 ? '' : amountVal.toLocaleString('es-ES', { minimumFractionDigits: 2 });


    // Append columns
    row.appendChild(colCode);
    row.appendChild(colUnit);
    row.appendChild(colSummary);
    row.appendChild(colQty);
    row.appendChild(colPrice);
    row.appendChild(colProportion);
    row.appendChild(colAmount);

    // Add mobile navigation indicator
    if (mobileMode && hasChildren) {
        row.classList.add('has-children-mobile');
    }

    // Click handlers
    row.onclick = (e) => {
        // Prevent triggering if we clicked a link, input or editable price
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'A' || e.target.classList.contains('col-price')) return;

        // Mobile mode behavior
        if (mobileMode) {
            // Check if this item has decomposition children (not just measurements/description)
            const hasDecompositionChildren = decomposition && decomposition.length > 0;

            if (hasDecompositionChildren) {
                // Navigate to next level for items with children
                navigationStack.push({
                    code: code,
                    title: concept.summary || concept.code.replace(/#+\s*$/, '')
                });
                navigateToLevel(code);
            } else {
                // Show inline details for leaf items (partidas)
                showMobileDetails(code, container);
            }
            return;
        }

        // Desktop mode: Select and toggle expand/collapse
        document.querySelectorAll('.tree-node-row').forEach(el => el.classList.remove('active'));
        row.classList.add('active');
        showDetails(code);

        // Toggle Expand/Collapse
        if (hasChildren) {
            const childrenContainer = container.querySelector('.tree-node-children');
            if (childrenContainer) {
                const isVisible = childrenContainer.classList.contains('visible');

                if (isVisible) {
                    childrenContainer.classList.remove('visible');
                    toggle.classList.remove('expanded');
                    expandedNodes.delete(code); // Guardar estado
                } else {
                    childrenContainer.classList.add('visible');
                    toggle.classList.add('expanded');
                    expandedNodes.add(code); // Guardar estado
                }
            }
        }
    };



    container.appendChild(row);

    // Children Container
    const draftForThisNode = draftActive && draftNode.parentCode === code;
    if (hasChildren || draftForThisNode) {
        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'tree-node-children';

        const isNodeExpanded = isRoot || expandedNodes.has(code) || draftForThisNode;
        if (isNodeExpanded) {
            childrenContainer.classList.add('visible');
        }

        // 0. Render Description (Top of children)
        if (hasDescription) {
            const descRow = document.createElement('div');
            descRow.className = 'node-description-row';
            // Style it: Indented, full text
            descRow.style.paddingLeft = ((depth + 1) * 20 + 8) + 'px';
            descRow.style.paddingRight = '10px';
            descRow.style.paddingTop = '8px';
            descRow.style.paddingBottom = '8px';
            descRow.style.whiteSpace = 'pre-wrap'; // Preserve formatting
            descRow.style.color = 'var(--text-secondary)';
            descRow.style.fontSize = '0.9rem';
            descRow.textContent = concept.description;
            descRow.style.borderBottom = '1px solid var(--border-color)';
            childrenContainer.appendChild(descRow);
        }

        // 1. Render Measurements Table
        if (hasMeasurements) {
            const msTable = createMeasurementTable(concept.measurements);
            childrenContainer.appendChild(msTable);
        }

        // 2. Render Decomposition/Children (Sub-items)
        // Usually items with measurements don't have further sub-items, but chapters do.
        // Only render children in desktop mode (in mobile, we navigate to them)
        if (!mobileMode) {
            decomposition.forEach((item, idx) => {
                if (draftActive && draftNode.parentCode === code && draftNode.index === idx) {
                    childrenContainer.appendChild(createDraftNodeRow(depth + 1));
                }
                const childNode = createNode(item.code, false, depth + 1, item.factor, mobileMode, item.type || 0);
                if (childNode) {
                    childrenContainer.appendChild(childNode);
                }
            });
            if (draftActive && draftNode.parentCode === code && draftNode.index >= decomposition.length) {
                childrenContainer.appendChild(createDraftNodeRow(depth + 1));
            }
        }


        container.appendChild(childrenContainer);
    }

    return container;
}

/**
 * createMeasurementTable
 * Renders a full HTML table for measurements with calculations.
 */
/**
 * Evaluador seguro de expresiones matemáticas para mediciones de obra.
 * Soporta números, fórmulas (=2*3.5+1.2, 10/2, 2.5*4, (5+3)*2), deducciones y funciones estándar.
 */
function evaluateMeasurementExpression(val) {
    if (val === null || val === undefined || val === '') {
        return { num: 1, isBlank: true, raw: '', hasFormula: false, display: '' };
    }

    const rawStr = String(val).trim();
    if (rawStr === '') {
        return { num: 1, isBlank: true, raw: '', hasFormula: false, display: '' };
    }

    let expr = rawStr;
    const hasEquals = expr.startsWith('=');
    if (hasEquals) {
        expr = expr.substring(1).trim();
    }

    // Normalizar comas a puntos decimales: ej. "2,5 * 4" -> "2.5 * 4"
    expr = expr.replace(/(\d+),(\d+)/g, '$1.$2');

    // Comprobar si es un número simple directo sin operadores
    const directNum = Number(expr);
    if (!isNaN(directNum) && !/[+\-*/%^()]/i.test(expr)) {
        return {
            num: directNum,
            isBlank: false,
            raw: rawStr,
            hasFormula: hasEquals,
            display: directNum.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 3 })
        };
    }

    // Transformar potencia ^ a **
    expr = expr.replace(/\^/g, '**');

    // Soporte para funciones matemáticas habituales
    expr = expr.replace(/\bsqrt\s*\(/gi, 'Math.sqrt(')
               .replace(/\babs\s*\(/gi, 'Math.abs(')
               .replace(/\bround\s*\(/gi, 'Math.round(')
               .replace(/\bpi\b/gi, 'Math.PI')
               .replace(/\bceil\s*\(/gi, 'Math.ceil(')
               .replace(/\bfloor\s*\(/gi, 'Math.floor(');

    // Sanitización estricta: asegurar que sólo contenga números, operadores matemáticos y llamadas seguras a Math
    const testPattern = expr.replace(/Math\.(sqrt|abs|round|PI|ceil|floor)/g, '');
    const isSafe = /^[0-9+\-*/().%\s]*$/.test(testPattern);

    if (isSafe) {
        try {
            const calculated = new Function('"use strict"; return (' + expr + ');')();
            if (typeof calculated === 'number' && !isNaN(calculated) && isFinite(calculated)) {
                return {
                    num: calculated,
                    isBlank: false,
                    raw: rawStr,
                    hasFormula: true,
                    display: calculated.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 3 })
                };
            }
        } catch (err) {
            // Ignorar y caer en fallback
        }
    }

    // Fallback a parseFloat estándar si la expresión no evaluó
    const fallbackVal = parseFloat(rawStr.replace(',', '.'));
    const finalNum = isNaN(fallbackVal) ? 1 : fallbackVal;
    return {
        num: finalNum,
        isBlank: false,
        raw: rawStr,
        hasFormula: false,
        display: isNaN(fallbackVal) ? rawStr : finalNum.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 3 })
    };
}

/**
 * Renderiza la tabla interactiva de mediciones con soporte de fórmulas vivas,
 * deducciones automáticas de huecos y herramientas de gestión de líneas.
 */
function createMeasurementTable(measurements, concept = null) {
    const container = document.createElement('div');
    container.className = 'measurements-container';

    const isEditable = concept && !concept.code.endsWith('#');

    // Si no hay mediciones, mostrar tarjeta informativa para crear la primera
    if (!measurements || measurements.length === 0) {
        const emptyCard = document.createElement('div');
        emptyCard.className = 'measurements-empty-card';
        emptyCard.innerHTML = `
            <div class="measurements-empty-icon">📐</div>
            <div class="measurements-empty-text">Sin líneas de medición detalladas</div>
            <div class="measurements-empty-subtext">Puedes añadir mediciones con fórmulas dinámicas (ej. <code>=2*3.5+1.2</code>) o deducciones de huecos.</div>
        `;

        if (isEditable) {
            const btnGroup = document.createElement('div');
            btnGroup.className = 'measurements-empty-actions';

            const addBtn = document.createElement('button');
            addBtn.type = 'button';
            addBtn.className = 'm-add-line-btn';
            addBtn.innerHTML = '➕ Añadir Primera Línea';
            addBtn.addEventListener('click', () => {
                if (!concept.measurements) concept.measurements = [];
                concept.measurements.push({ label: 'Medición 1', units: '1', l: '', w: '', h: '' });
                recalculateMeasurements(concept);
            });

            btnGroup.appendChild(addBtn);
            emptyCard.appendChild(btnGroup);
        }

        container.appendChild(emptyCard);
        return container;
    }

    const table = document.createElement('table');
    table.className = 'measurements-table';

    // Header
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th style="width: 34%;">Comentario / Etiqueta</th>
            <th class="numeric" style="width: 11%;">Uds</th>
            <th class="numeric" style="width: 11%;">Largo</th>
            <th class="numeric" style="width: 11%;">Ancho</th>
            <th class="numeric" style="width: 11%;">Alto</th>
            <th class="numeric" style="width: 14%;">Parcial</th>
            ${isEditable ? '<th style="width: 8%; text-align: center;">⚙️</th>' : ''}
        </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    let totalPositive = 0;
    let totalDeductions = 0;
    let netTotal = 0;

    measurements.forEach((m, idx) => {
        const tr = document.createElement('tr');
        if (m.label && m.label.includes('[ID:')) {
            const idMatch = m.label.match(/\[ID:\s*([^\]]+)\]/);
            if (idMatch && idMatch[1]) {
                const targetGlobalId = idMatch[1].trim();
                tr.style.cursor = 'pointer';
                tr.title = 'Hacer clic para resaltar en el Visor 3D';
                tr.addEventListener('click', (ev) => {
                    if (ev.target.tagName === 'INPUT' || ev.target.tagName === 'BUTTON') return;
                    if (typeof IFCViewer3D !== 'undefined') {
                        IFCViewer3D.highlightElement(targetGlobalId);
                        const vPanel = document.getElementById('visor3dPanel');
                        if (vPanel && vPanel.style.display === 'none') {
                            const v3dBtn = document.getElementById('visor3dBtn');
                            if (v3dBtn && v3dBtn.style.display !== 'none') {
                                v3dBtn.click();
                            }
                        }
                    }
                });
            }
        }

        const evalU = evaluateMeasurementExpression(m.units);
        const evalL = evaluateMeasurementExpression(m.l);
        const evalW = evaluateMeasurementExpression(m.w);
        const evalH = evaluateMeasurementExpression(m.h);

        const vU = evalU.isBlank ? 1 : evalU.num;
        const vL = evalL.isBlank ? 1 : evalL.num;
        const vW = evalW.isBlank ? 1 : evalW.num;
        const vH = evalH.isBlank ? 1 : evalH.num;

        const partial = vU * vL * vW * vH;
        m._calculatedPartial = partial;

        const isDeduction = partial < 0 || vU < 0;
        if (isDeduction) {
            tr.className = 'm-row-deduction';
            totalDeductions += partial;
        } else {
            totalPositive += partial;
        }
        netTotal += partial;

        // 1. Etiqueta / Descripción
        const tdLabel = document.createElement('td');
        tdLabel.className = 'm-cell-label';
        tdLabel.textContent = m.label || '';
        if (isDeduction) {
            const dedBadge = document.createElement('span');
            dedBadge.className = 'm-deduction-badge';
            dedBadge.textContent = 'Deducción';
            tdLabel.prepend(dedBadge);
        }

        if (isEditable) {
            tdLabel.className += ' m-cell-editable';
            tdLabel.contentEditable = 'true';
            tdLabel.addEventListener('blur', () => {
                const textWithoutBadge = tdLabel.innerText.replace(/^Deducción\s*/, '').trim();
                m.label = textWithoutBadge;
            });
            tdLabel.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    tdLabel.blur();
                }
            });
        }

        // 2. Celdas numéricas editables con fórmulas dinámicas
        function createDynamicFormulaCell(evalObj, fieldName) {
            const td = document.createElement('td');
            td.className = 'numeric';
            
            // Mostrar número evaluado o indicador de fórmula
            td.textContent = evalObj.isBlank ? '' : evalObj.display;

            if (evalObj.hasFormula) {
                td.classList.add('m-cell-has-formula');
                td.title = `Fórmula: ${evalObj.raw} = ${evalObj.display}`;
                const fxIcon = document.createElement('span');
                fxIcon.className = 'm-formula-indicator';
                fxIcon.textContent = 'ƒx';
                td.appendChild(fxIcon);
            }

            if (isEditable) {
                td.className += ' m-cell-editable';
                td.contentEditable = 'true';

                td.addEventListener('focus', () => {
                    // Cargar expresión cruda (ej. =2*3.5+1.2) para editar la fórmula directamente
                    td.textContent = m[fieldName] !== undefined && m[fieldName] !== null ? String(m[fieldName]) : '';
                });

                td.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        td.blur();
                    }
                });

                td.addEventListener('blur', () => {
                    const rawInput = td.textContent.trim();
                    m[fieldName] = rawInput;

                    // Recalcular mediciones completas de la partida
                    recalculateMeasurements(concept);
                });
            }

            return td;
        }

        const tdUnits = createDynamicFormulaCell(evalU, 'units');
        const tdL = createDynamicFormulaCell(evalL, 'l');
        const tdW = createDynamicFormulaCell(evalW, 'w');
        const tdH = createDynamicFormulaCell(evalH, 'h');

        // 3. Celda Parcial
        const tdPartial = document.createElement('td');
        tdPartial.className = 'numeric m-cell-partial' + (isDeduction ? ' m-partial-deduction' : '');
        tdPartial.innerHTML = `<b>${formatQuantityByUnit(partial, concept ? concept.unit : '')}</b>`;

        tr.appendChild(tdLabel);
        tr.appendChild(tdUnits);
        tr.appendChild(tdL);
        tr.appendChild(tdW);
        tr.appendChild(tdH);
        tr.appendChild(tdPartial);

        // 4. Acciones por fila (Duplicar, Eliminar)
        if (isEditable) {
            const tdActions = document.createElement('td');
            tdActions.className = 'm-cell-actions';

            // Botón Duplicar
            const dupBtn = document.createElement('button');
            dupBtn.type = 'button';
            dupBtn.className = 'm-action-icon-btn';
            dupBtn.title = 'Duplicar línea';
            dupBtn.innerHTML = '📋';
            dupBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const copy = { ...m, label: m.label ? `${m.label} (copia)` : '' };
                measurements.splice(idx + 1, 0, copy);
                recalculateMeasurements(concept);
            });

            // Botón Eliminar
            const delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.className = 'm-action-icon-btn m-action-del-btn';
            delBtn.title = 'Eliminar línea';
            delBtn.innerHTML = '🗑️';
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                measurements.splice(idx, 1);
                recalculateMeasurements(concept);
            });

            tdActions.appendChild(dupBtn);
            tdActions.appendChild(delBtn);
            tr.appendChild(tdActions);
        }

        tbody.appendChild(tr);
    });

    // Fila de Total y Desglose
    const trTotal = document.createElement('tr');
    trTotal.className = 'total-row';
    trTotal.innerHTML = `
        <td colspan="5" style="text-align: right; font-weight: 700;">TOTAL MEDICIÓN:</td>
        <td class="numeric m-total-amount"><b>${formatQuantityByUnit(netTotal, concept ? concept.unit : '')}</b></td>
        ${isEditable ? '<td></td>' : ''}
    `;
    tbody.appendChild(trTotal);

    table.appendChild(tbody);
    container.appendChild(table);

    // Barra inferior de herramientas y desglose de sumas
    if (isEditable) {
        const toolbar = document.createElement('div');
        toolbar.className = 'measurements-toolbar';

        const btnLeft = document.createElement('div');
        btnLeft.className = 'measurements-toolbar-buttons';

        // Botón Añadir Línea Normal
        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'm-toolbar-btn m-toolbar-add-btn';
        addBtn.innerHTML = '➕ Añadir Línea';
        addBtn.addEventListener('click', () => {
            measurements.push({
                label: `Línea ${measurements.length + 1}`,
                units: '1',
                l: '',
                w: '',
                h: ''
            });
            recalculateMeasurements(concept);
        });

        // Botón Añadir Deducción de Hueco
        const addDedBtn = document.createElement('button');
        addDedBtn.type = 'button';
        addDedBtn.className = 'm-toolbar-btn m-toolbar-ded-btn';
        addDedBtn.innerHTML = '🔻 Deducción de Hueco';
        addDedBtn.title = 'Añade una línea de deducción con unidades negativas (-1)';
        addDedBtn.addEventListener('click', () => {
            measurements.push({
                label: 'Deducción hueco',
                units: '-1',
                l: '',
                w: '',
                h: ''
            });
            recalculateMeasurements(concept);
        });

        btnLeft.appendChild(addBtn);
        btnLeft.appendChild(addDedBtn);

        // Desglose de positivos y deducciones si existen
        const summaryRight = document.createElement('div');
        summaryRight.className = 'measurements-toolbar-summary';
        if (totalDeductions < 0) {
            summaryRight.innerHTML = `
                <span class="m-sum-item m-sum-pos">Suma: <b>+${totalPositive.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</b></span>
                <span class="m-sum-item m-sum-ded">Deducciones: <b>${totalDeductions.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</b></span>
            `;
        }

        toolbar.appendChild(btnLeft);
        toolbar.appendChild(summaryRight);
        container.appendChild(toolbar);
    }

    return container;
}

/**
 * Show details inline for mobile view
 * @param {string} code - The code of the concept to show
 * @param {HTMLElement} container - The container element for this node
 */
function showMobileDetails(code, container) {
    const concept = parsedData.concepts[code];
    if (!concept) return;

    // Check if details are already shown
    let detailsContainer = container.querySelector('.mobile-details-container');

    if (detailsContainer) {
        // Toggle visibility
        if (detailsContainer.style.display === 'none') {
            detailsContainer.style.display = 'block';
        } else {
            detailsContainer.style.display = 'none';
        }
        return;
    }

    // Create details container
    detailsContainer = document.createElement('div');
    detailsContainer.className = 'mobile-details-container';
    detailsContainer.style.padding = '1rem';
    detailsContainer.style.backgroundColor = '#f8fafc';
    detailsContainer.style.borderBottom = '1px solid var(--border-color)';

    // Title
    const title = document.createElement('h3');
    title.style.margin = '0 0 0.5rem 0';
    title.style.fontSize = '1rem';
    title.style.fontWeight = '600';
    title.style.color = 'var(--text-primary)';
    title.textContent = concept.summary || concept.code.replace(/#+\s*$/, '');
    detailsContainer.appendChild(title);

    // Description
    if (concept.description && concept.description.trim()) {
        const description = document.createElement('div');
        description.style.marginBottom = '1rem';
        description.style.fontSize = '0.9rem';
        description.style.color = 'var(--text-secondary)';
        description.style.whiteSpace = 'pre-wrap';
        description.textContent = concept.description;
        detailsContainer.appendChild(description);
    }

    // Measurements table
    if (concept.measurements && concept.measurements.length > 0) {
        const tableTitle = document.createElement('h4');
        tableTitle.style.margin = '1rem 0 0.5rem 0';
        tableTitle.style.fontSize = '0.9rem';
        tableTitle.style.fontWeight = '600';
        tableTitle.style.color = 'var(--text-primary)';
        tableTitle.textContent = 'Líneas de Medición';
        detailsContainer.appendChild(tableTitle);

        const msTable = createMeasurementTable(concept.measurements, concept);
        detailsContainer.appendChild(msTable);
    }

    // Insert after the row
    container.appendChild(detailsContainer);
}

function showDetails(code) {

    const concept = parsedData.concepts[code];
    const panel = document.getElementById('detailsContent');
    const emptyState = document.querySelector('#detailsPanel .empty-state');

    emptyState.style.display = 'none';
    panel.style.display = 'block';

    const isRoot = Array.isArray(parsedData.root_nodes) ? parsedData.root_nodes.includes(concept.code) : Object.values(parsedData.root_nodes).includes(concept.code);
    const isChapter = concept.code.endsWith('#') || (!concept.unit || concept.unit.trim() === '');

    const addPartidaContainer = document.getElementById('addPartidaContainer');
    if (addPartidaContainer) {
        if (isChapter) {
            addPartidaContainer.style.display = 'block';
            const addPartidaBtn = document.getElementById('addPartidaBtn');
            if (addPartidaBtn) {
                addPartidaBtn.dataset.parentCode = concept.code;
                addPartidaBtn.textContent = `➕ Añadir Partida a ${concept.code.replace(/#+\s*$/, '')}`;
            }
        } else {
            addPartidaContainer.style.display = 'none';
        }
    }

    document.getElementById('detCode').textContent = concept.code.replace(/#+\s*$/, '');
    updateEditableText(document.getElementById('detSummary'), concept.summary);
    document.getElementById('detPrice').textContent = parseFloat(concept.price).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

    // Description: Prefer ~T description, fallback to Summary
    updateEditableText(document.getElementById('detDescription'), (concept.description || concept.summary).replace(/\n/g, '<br>'), true);

    // Mediciones en Panel de Escritorio
    const msSection = document.getElementById('detMeasurementsSection');
    const msDiv = document.getElementById('detMeasurements');
    if (msSection && msDiv) {
        if (!isChapter || (concept.measurements && concept.measurements.length > 0)) {
            msSection.style.display = 'block';
            msDiv.innerHTML = '';
            if (!concept.measurements) concept.measurements = [];
            msDiv.appendChild(createMeasurementTable(concept.measurements, concept));
        } else {
            msSection.style.display = 'none';
        }
    }

    // Decomposition Table
    const tbody = document.getElementById('detDecomposition');
    tbody.innerHTML = '';

    let totalCalc = 0;

    if (concept.decomposition && concept.decomposition.length > 0) {
        concept.decomposition.forEach(item => {
            const childNode = parsedData.concepts[item.code];
            const row = document.createElement('tr');

            const childPrice = childNode ? parseFloat(childNode.price) : 0;
            const factor = parseFloat(item.factor);
            const total = childPrice * factor;
            totalCalc += total;

            const tdCode = document.createElement('td');
            tdCode.textContent = item.code.replace(/#+\s*$/, '');

            const tdFactor = document.createElement('td');
            tdFactor.textContent = `${factor.toLocaleString('es-ES')} ${childNode ? childNode.unit : ''}`;

            const tdSummary = document.createElement('td');
            tdSummary.textContent = childNode ? childNode.summary : '???';
            if (childNode) {
                setupExplicitEdit(tdSummary, (newSummary) => {
                    if (newSummary && newSummary !== childNode.summary) {
                        childNode.summary = newSummary;
                        saveHistoryState();

                        const treeNodeSummary = document.querySelector(`.tree-node-container[data-code="${childNode.code}"] > .tree-node-row > .col-summary`);
                        if (treeNodeSummary) {
                            const valEl = treeNodeSummary.querySelector('.editable-val') || treeNodeSummary;
                            valEl.textContent = newSummary;
                        }

                        const detCodeEl = document.getElementById('detCode');
                        const detSummaryEl = document.getElementById('detSummary');
                        if (detCodeEl && detSummaryEl && detCodeEl.textContent === childNode.code.replace(/#+\s*$/, '')) {
                            const valEl = detSummaryEl.querySelector('.editable-val') || detSummaryEl;
                            valEl.textContent = newSummary;
                        }
                        return true;
                    }
                    return false;
                });
            }

            const tdPrice = document.createElement('td');
            tdPrice.textContent = `${childPrice.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`;

            const tdTotal = document.createElement('td');
            tdTotal.innerHTML = `<strong>${total.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</strong>`;

            row.appendChild(tdCode);
            row.appendChild(tdFactor);
            row.appendChild(tdSummary);
            row.appendChild(tdPrice);
            row.appendChild(tdTotal);
            tbody.appendChild(row);
        });
    } else {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="5" style="text-align:center; color: #94a3b8;">Sin descomposición (Partida simple o Capítulo)</td>`;
        tbody.appendChild(row);
    }

    // Check if calculated matches stated
    const statedPrice = parseFloat(concept.price);
    // Usually they match. If not, maybe show warning or just stated.
    document.getElementById('detTotalCost').textContent = statedPrice.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

    // Renderizar sección de certificaciones
    const certSection = document.getElementById('detCertificationsSection');
    if (certSection) {
        if (!isChapter) {
            certSection.style.display = 'block';
            renderCertificationsTable(concept);
        } else {
            certSection.style.display = 'none';
        }
    }
}

/* ==========================================================================
   Lógica de Recálculo, Modo Oscuro, Drag & Drop y Exportación BC3
   ========================================================================== */

// Recálculo recursivo de precios ascendente
function recalculateConceptPrice(code, visited = new Set()) {
    const concept = parsedData && parsedData.concepts ? parsedData.concepts[code] : null;
    if (!concept) return 0;

    if (visited.has(code)) {
        return parseFloat(concept.price) || 0;
    }
    visited.add(code);

    let decomposition = getConceptDecomposition(concept);

    if (decomposition.length > 0 && !concept.isManualPrice) {
        let sum = 0;
        decomposition.forEach(item => {
            if (item && item.code) {
                const childPrice = recalculateConceptPrice(item.code, visited);
                sum += childPrice * (parseFloat(item.factor) || 0);
            }
        });
        concept.price = sum;
    }

    return parseFloat(concept.price) || 0;
}

function recalculateAll() {
    if (!parsedData) return;
    const visited = new Set();
    const roots = Array.isArray(parsedData.root_nodes) ? parsedData.root_nodes : Object.values(parsedData.root_nodes);
    roots.forEach(rootCode => {
        recalculateConceptPrice(rootCode, visited);
    });
    window.currentTotalPEM = calculateTotalBudget();
}

function calculateTotalBudget() {
    if (!parsedData) return 0;
    let total = 0;
    const roots = Array.isArray(parsedData.root_nodes) ? parsedData.root_nodes : Object.values(parsedData.root_nodes);
    roots.forEach(code => {
        const concept = parsedData.concepts[code];
        if (concept) {
            total += parseFloat(concept.price) || 0;
        }
    });
    return total;
}

function calculateTotalCertifiedAmount() {
    let total = 0;
    if (!parsedData || !parsedData.concepts) return 0;
    for (const code in parsedData.concepts) {
        const concept = parsedData.concepts[code];
        const conceptCerts = window.certifications[code];
        if (conceptCerts && concept.price) {
            let conceptQty = 0;
            for (const month in conceptCerts) {
                conceptQty += parseFloat(conceptCerts[month]) || 0;
            }
            total += conceptQty * (parseFloat(concept.price) || 0);
        }
    }
    return total;
}

function updateTotalBudgetDisplay() {
    const totalEl = document.getElementById('budgetTotal');
    const totalGgEl = document.getElementById('budgetTotalGG');
    const totalBiEl = document.getElementById('budgetTotalBI');
    const totalPecEl = document.getElementById('budgetTotalPEC');
    const toggleCoeffsBtn = document.getElementById('toggleCoeffsBtn');

    if (totalEl) {
        const pem = calculateTotalBudget();
        window.currentTotalPEM = pem;

        // Actualizar PEM
        totalEl.innerHTML = `<span class="lbl">PEM</span><span class="val">${pem.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>`;

        // Mostrar botón de coeficientes
        if (toggleCoeffsBtn) toggleCoeffsBtn.style.display = 'flex';

        // Coeficientes
        const ggPercent = typeof globalCoeffs.gg !== 'undefined' ? globalCoeffs.gg : 13;
        const biPercent = typeof globalCoeffs.bi !== 'undefined' ? globalCoeffs.bi : 6;
        const bajaPercent = typeof globalCoeffs.baja !== 'undefined' ? globalCoeffs.baja : 0;

        const gg = ggPercent / 100;
        const bi = biPercent / 100;
        const baja = bajaPercent / 100;

        // Gastos Generales (€)
        const ggAmount = pem * gg;
        if (totalGgEl) {
            totalGgEl.innerHTML = `<span class="lbl">GG (${ggPercent}%)</span><span class="val">${ggAmount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>`;
            totalGgEl.style.display = 'flex';
        }

        // Beneficio Industrial (€)
        const biAmount = pem * bi;
        if (totalBiEl) {
            totalBiEl.innerHTML = `<span class="lbl">BI (${biPercent}%)</span><span class="val">${biAmount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>`;
            totalBiEl.style.display = 'flex';
        }

        // PEC = (PEM * (1 + GG + BI)) * (1 + Baja)
        const pemWithCoeffs = pem * (1 + gg + bi);
        const pec = pemWithCoeffs * (1 + baja);

        if (totalPecEl) {
            totalPecEl.innerHTML = `<span class="lbl">PEC</span><span class="val">${pec.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>`;
            totalPecEl.style.display = 'flex';
        }
    }
}

// Reconstrucción del archivo BC3
function generateModifiedBC3() {
    if (!originalFileText) return "";

    const lines = originalFileText.split(/\r?\n/);
    const modifiedLines = [];
    let skipLinesUntilNonSlash = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (skipLinesUntilNonSlash) {
            if (trimmed.startsWith('\\')) {
                // Saltar las líneas de medición originales
                continue;
            } else {
                skipLinesUntilNonSlash = false;
            }
        }

        if (trimmed.startsWith('~C|')) {
            const parts = trimmed.split('|');
            const code = parts[1];
            if (code && parsedData.concepts[code]) {
                const concept = parsedData.concepts[code];
                parts[4] = parseFloat(concept.price).toFixed(2);
                parts[3] = concept.summary || "";
                modifiedLines.push(parts.join('|'));
            } else {
                modifiedLines.push(line);
            }
        } else if (trimmed.startsWith('~D|')) {
            const parts = trimmed.split('|');
            const parentCode = parts[1];
            const parentConcept = parsedData.concepts[parentCode];
            if (parentConcept && parentConcept.decomposition && parentConcept.decomposition.length > 0) {
                const decompParts = [];
                parentConcept.decomposition.forEach(item => {
                    decompParts.push(item.code);
                    decompParts.push(parseFloat(item.factor).toFixed(3));
                    decompParts.push(item.type || 0);
                });
                parts[2] = decompParts.join('\\') + '\\';
                modifiedLines.push(parts.join('|'));
            } else {
                modifiedLines.push(line);
            }
        } else if (trimmed.startsWith('~M|')) {
            const parts = trimmed.split('|');
            // Formato: ~M|PARENT\CHILD|1\1\1\1\|TOTAL_SUM|
            const parentChild = parts[1]; // e.g. "01#\01.01"
            const childCode = parentChild.split('\\')[1];
            const concept = parsedData.concepts[childCode];

            if (concept && concept.measurements && concept.measurements.length > 0) {
                // Escribir la línea principal ~M
                const totalSum = parseFloat(concept.quantity) || 0;
                parts[3] = totalSum.toFixed(3);
                modifiedLines.push(parts.join('|'));

                // Escribir las sublíneas de mediciones editadas
                concept.measurements.forEach(m => {
                    const label = m.label || "";
                    const units = m.units === '' ? "" : parseFloat(m.units).toFixed(3);
                    const l = m.l === '' ? "" : parseFloat(m.l).toFixed(3);
                    const w = m.w === '' ? "" : parseFloat(m.w).toFixed(3);
                    const h = m.h === '' ? "" : parseFloat(m.h).toFixed(3);

                    // Formato FIEBDC: \Label\Units\L\W\H\
                    modifiedLines.push(`\\${label}\\${units}\\${l}\\${w}\\${h}\\`);
                });

                // Activar el salto de las líneas de medición originales que siguen
                skipLinesUntilNonSlash = true;
            } else {
                modifiedLines.push(line);
            }
        } else if (trimmed.startsWith('~V|')) {
            // Actualizar la codificación a UTF-8 para garantizar legibilidad
            const parts = trimmed.split('|');
            if (parts.length >= 6) {
                parts[5] = "UTF-8";
            }
            modifiedLines.push(parts.join('|'));
        } else {
            modifiedLines.push(line);
        }
    }

    // Exportar las nuevas partidas agregadas al archivo BC3
    if (parsedData && parsedData.concepts) {
        Object.values(parsedData.concepts).forEach(concept => {
            if (concept.isNewPartida) {
                const formattedPrice = (parseFloat(concept.price) || 0).toFixed(2);
                // Formato FIEBDC-3: ~C|código|unidad|resumen|precio|tipo|
                const cLine = `~C|${concept.code}|${concept.unit || 'ud'}|${concept.summary || ''}|${formattedPrice}|0|`;
                modifiedLines.push(cLine);
            }
        });
    }

    return modifiedLines.join('\r\n');
}

// =============================================================================
// INTEGRACIÓN PWA CON FILE SYSTEM ACCESS API & GUARDADO DIRECTO EN DISCO
// =============================================================================

/**
 * Muestra una notificación Toast flotante y elegante
 */
function showAppToast(message, icon = '💾') {
    let toast = document.getElementById('appGlobalToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'appGlobalToast';
        toast.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: rgba(15, 23, 42, 0.95);
            color: #f8fafc;
            padding: 12px 18px;
            border-radius: 10px;
            font-size: 0.82rem;
            font-weight: 600;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1);
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 99999;
            opacity: 0;
            transform: translateY(12px);
            transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            pointer-events: none;
            backdrop-filter: blur(8px);
        `;
        document.body.appendChild(toast);
    }

    toast.innerHTML = `<span style="font-size: 1.15rem;">${icon}</span><span>${message}</span>`;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';

    if (window._toastTimeout) clearTimeout(window._toastTimeout);
    window._toastTimeout = setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(12px)';
    }, 3200);
}

/**
 * Guarda el presupuesto actual directamente en disco (si soporta File System Access API) o mediante descarga
 */
async function saveCurrentBudgetFile(saveAs = false) {
    if (!parsedData) {
        showAppToast("No hay datos de presupuesto cargados.", "⚠️");
        return false;
    }

    const content = generateModifiedBC3();
    if (!content) {
        showAppToast("Error al generar el archivo BC3 modificado.", "❌");
        return false;
    }

    const currentTab = budgetTabs.find(t => t.id === activeTabId);

    // 1. File System Access API (PWA / Chrome / Edge / Desktop nativo)
    if (window.showSaveFilePicker && (saveAs || !currentTab || !currentTab.fileHandle)) {
        try {
            const suggested = (currentFileName ? currentFileName.replace(/\.[^/.]+$/, "") : "Presupuesto_modificado") + ".bc3";
            const handle = await window.showSaveFilePicker({
                suggestedName: suggested,
                types: [{
                    description: 'Archivo de Presupuesto BC3 (FIEBDC-3)',
                    accept: { 'text/plain': ['.bc3', '.BC3', '.txt'] }
                }]
            });
            const writable = await handle.createWritable();
            await writable.write(content);
            await writable.close();

            if (currentTab) {
                currentTab.fileHandle = handle;
                currentTab.fileName = handle.name;
                currentFileName = handle.name;
                const fileNameEl = document.getElementById('fileName');
                if (fileNameEl) fileNameEl.textContent = currentFileName;
                const dropdownFileName = document.getElementById('dropdownFileName');
                if (dropdownFileName) dropdownFileName.textContent = currentFileName;
                renderBudgetTabBar();
            }
            showAppToast(`Presupuesto guardado en disco: ${handle.name}`, '💾');
            return true;
        } catch (pickerErr) {
            if (pickerErr.name === 'AbortError') return false; // Usuario canceló el cuadro de diálogo
            console.warn("Fallo en showSaveFilePicker, procediendo a guardado estándar:", pickerErr);
        }
    } else if (currentTab && currentTab.fileHandle && !saveAs) {
        // Guardado directo ultra-rápido en el archivo físico existente
        try {
            const writable = await currentTab.fileHandle.createWritable();
            await writable.write(content);
            await writable.close();
            showAppToast(`Cambios guardados directamente en disco: ${currentTab.fileName}`, '⚡');
            return true;
        } catch (writeErr) {
            console.warn("Error escribiendo en fileHandle existente:", writeErr);
        }
    }

    // 2. Dispositivos móviles con Capacitor (Android / iOS)
    if (window.Capacitor && window.Capacitor.isPluginAvailable('Filesystem')) {
        const base64Bc3 = btoa(unescape(encodeURIComponent(content)));
        const baseName = (currentFileName || "Presupuesto").replace(/\.[^/.]+$/, "");
        saveAndShareNativeFile(base64Bc3, `${baseName}_modificado.bc3`);
        showAppToast("Archivo exportado a almacenamiento del dispositivo.", "📱");
        return true;
    }

    // 3. Fallback universal por descarga Blob tradicional
    const baseName = (currentFileName || "Presupuesto").replace(/\.[^/.]+$/, "");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${baseName}_modificado.bc3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showAppToast(`Descarga de archivo generada: ${baseName}_modificado.bc3`, '⬇️');
    return true;
}

// Botón Guardar en barra superior
const saveBtn = document.getElementById('saveBtn');
if (saveBtn) {
    saveBtn.addEventListener('click', () => saveCurrentBudgetFile(false));
}

// Botón Exportar / Guardar como BC3 en menú desplegable
const exportBc3Btn = document.getElementById('exportBc3Btn');
if (exportBc3Btn) {
    exportBc3Btn.addEventListener('click', () => saveCurrentBudgetFile(true));
}

// Gestión de Dropdowns (Exportar/Importar, Ajustes, etc.)
document.addEventListener('click', (e) => {
    const toggleBtn = e.target.closest('.dropdown-toggle');
    if (toggleBtn) {
        e.preventDefault();
        e.stopPropagation();
        const dropdown = toggleBtn.closest('.dropdown');
        if (dropdown) {
            const isShown = dropdown.classList.contains('show');
            document.querySelectorAll('.dropdown.show').forEach(d => d.classList.remove('show'));
            if (!isShown) dropdown.classList.add('show');
        }
        return;
    }

    const dropdownContentBtn = e.target.closest('.dropdown-content button, .dropdown-content label');
    if (dropdownContentBtn) {
        const dropdown = dropdownContentBtn.closest('.dropdown');
        if (dropdown) dropdown.classList.remove('show');
        return;
    }

    if (!e.target.closest('.dropdown')) {
        document.querySelectorAll('.dropdown.show').forEach(d => d.classList.remove('show'));
    }
});

// ── Control de Coeficientes Globales (GG, BI, Baja) ──
const toggleCoeffsBtn = document.getElementById('toggleCoeffsBtn');
const coeffsPanel = document.getElementById('coeffsPanel');
const applyCoeffsBtn = document.getElementById('applyCoeffsBtn');

if (toggleCoeffsBtn && coeffsPanel) {
    toggleCoeffsBtn.addEventListener('click', () => {
        const isHidden = coeffsPanel.style.display === 'none' || !coeffsPanel.style.display;
        coeffsPanel.style.display = isHidden ? 'block' : 'none';
        toggleCoeffsBtn.classList.toggle('active', isHidden);
    });
}

if (applyCoeffsBtn) {
    applyCoeffsBtn.addEventListener('click', () => {
        const ggIn = document.getElementById('coeffGG');
        const biIn = document.getElementById('coeffBI');
        const bajaIn = document.getElementById('coeffBaja');

        globalCoeffs.gg = ggIn ? (parseFloat(ggIn.value) || 0) : 13;
        globalCoeffs.bi = biIn ? (parseFloat(biIn.value) || 0) : 6;
        globalCoeffs.baja = bajaIn ? (parseFloat(bajaIn.value) || 0) : 0;

        updateTotalBudgetDisplay();
        if (coeffsPanel) coeffsPanel.style.display = 'none';
        if (toggleCoeffsBtn) toggleCoeffsBtn.classList.remove('active');
        showAppToast("Coeficientes aplicados correctamente.", "⚙️");
    });
}

const openImportExcelBtn = document.getElementById('openImportExcelBtn');
const openImportCsvBtn = document.getElementById('openImportCsvBtn');
const importExcelFileInput = document.getElementById('importExcelFileInput');
const importCsvFileInput = document.getElementById('importCsvFileInput');
const openImportBc3Btn = document.getElementById('openImportBc3Btn');

if (openImportExcelBtn && importExcelFileInput) {
    openImportExcelBtn.addEventListener('click', () => {
        importExcelFileInput.click();
    });
}

if (openImportCsvBtn && importCsvFileInput) {
    openImportCsvBtn.addEventListener('click', () => {
        importCsvFileInput.click();
    });
}

if (openImportBc3Btn) {
    openImportBc3Btn.addEventListener('click', () => {
        const bc3FileInput = document.getElementById('bc3file');
        if (bc3FileInput) bc3FileInput.click();
    });
}

if (importExcelFileInput) {
    importExcelFileInput.addEventListener('change', async (e) => {
        if (e.target.files && e.target.files.length > 0) {
            await importSpreadsheetFile(e.target.files[0]);
            e.target.value = '';
        }
    });
}

if (importCsvFileInput) {
    importCsvFileInput.addEventListener('change', async (e) => {
        if (e.target.files && e.target.files.length > 0) {
            await importSpreadsheetFile(e.target.files[0]);
            e.target.value = '';
        }
    });
}

async function importSpreadsheetFile(file) {
    if (!file) return;
    if (typeof XLSX === 'undefined') {
        alert("La librería de importación (SheetJS) no está disponible. Por favor, comprueba tu conexión.");
        return;
    }

    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

        if (!jsonData || jsonData.length < 2) {
            alert("El archivo no contiene suficientes filas de datos.");
            return;
        }

        // Buscar fila de encabezados y mapear columnas
        let headerRowIndex = 0;
        let colCode = -1, colSummary = -1, colUnit = -1, colQty = -1, colPrice = -1;

        for (let i = 0; i < Math.min(jsonData.length, 10); i++) {
            const row = jsonData[i].map(c => String(c).toLowerCase().trim());
            const cIdx = row.findIndex(c => c.includes('cód') || c.includes('cod') || c === 'código' || c === 'codigo' || c === 'code');
            const sIdx = row.findIndex(c => c.includes('resumen') || c.includes('desc') || c.includes('concepto') || c.includes('partida') || c === 'título' || c === 'titulo');
            const uIdx = row.findIndex(c => c.includes('ud') || c.includes('uni') || c.includes('unit') || c === 'u');
            const qIdx = row.findIndex(c => c.includes('cant') || c.includes('med') || c.includes('qty'));
            const pIdx = row.findIndex(c => c.includes('prec') || c.includes('pr') || c.includes('price') || c.includes('importe'));

            if (cIdx !== -1 || sIdx !== -1) {
                headerRowIndex = i;
                colCode = cIdx;
                colSummary = sIdx;
                colUnit = uIdx;
                colQty = qIdx;
                colPrice = pIdx;
                break;
            }
        }

        // Fallbacks inteligentes
        if (colCode === -1) colCode = 0;
        if (colSummary === -1) colSummary = 1;
        if (colUnit === -1) colUnit = 2;
        if (colQty === -1) colQty = 3;
        if (colPrice === -1) colPrice = 4;

        // Construir proyecto BC3 normalizado
        const concepts = {};
        const rootNodes = ['OBRA#'];
        concepts['OBRA#'] = {
            code: 'OBRA#',
            unit: '',
            summary: file.name.replace(/\.[^/.]+$/, ''),
            price: 0,
            date: new Date().toISOString().slice(2, 8).replace(/-/g, ''),
            type: 0,
            children: [],
            decomposition: [],
            is_root: true
        };

        let currentChapter = null;
        let chapterCounter = 1;
        let itemCounter = 1;

        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0 || row.every(cell => String(cell).trim() === '')) continue;

            let code = colCode !== -1 && row[colCode] ? String(row[colCode]).trim() : '';
            let summary = colSummary !== -1 && row[colSummary] ? String(row[colSummary]).trim() : '';
            let unit = colUnit !== -1 && row[colUnit] ? String(row[colUnit]).trim() : '';
            let qty = colQty !== -1 && row[colQty] ? parseFloat(String(row[colQty]).replace(',', '.')) : 0;
            let price = colPrice !== -1 && row[colPrice] ? parseFloat(String(row[colPrice]).replace(',', '.')) : 0;

            if (isNaN(qty)) qty = 1;
            if (isNaN(price)) price = 0;

            if (!summary && !code) continue;
            if (!summary) summary = `Partida ${code}`;

            const isChapter = code.endsWith('#') || (!unit && price === 0 && qty === 0);

            if (isChapter) {
                if (!code) code = `CAP${String(chapterCounter++).padStart(2, '0')}#`;
                if (!code.endsWith('#')) code += '#';

                currentChapter = {
                    code: code,
                    unit: '',
                    summary: summary,
                    price: 0,
                    date: '010126',
                    type: 0,
                    children: [],
                    decomposition: []
                };
                concepts[code] = currentChapter;
                concepts['OBRA#'].children.push(code);
                concepts['OBRA#'].decomposition.push({ code: code, factor: 1, type: 0 });
                itemCounter = 1;
            } else {
                if (!currentChapter) {
                    const chCode = `CAP01#`;
                    currentChapter = {
                        code: chCode,
                        unit: '',
                        summary: 'Capítulo 01',
                        price: 0,
                        date: '010126',
                        type: 0,
                        children: [],
                        decomposition: []
                    };
                    concepts[chCode] = currentChapter;
                    concepts['OBRA#'].children.push(chCode);
                    concepts['OBRA#'].decomposition.push({ code: chCode, factor: 1, type: 0 });
                }

                if (!code) {
                    code = `P${currentChapter.code.replace('#', '')}.${String(itemCounter++).padStart(2, '0')}`;
                }

                concepts[code] = {
                    code: code,
                    unit: unit || 'ud',
                    summary: summary,
                    price: price,
                    quantity: qty > 0 ? qty : 1,
                    date: '010126',
                    type: 0,
                    children: [],
                    decomposition: [],
                    measurements: [{ comment: 'Medición importada', units: 1, l: qty > 0 ? qty : 1, w: 1, h: 1, _calculatedPartial: qty > 0 ? qty : 1 }]
                };

                currentChapter.children.push(code);
                currentChapter.decomposition.push({ code: code, factor: qty > 0 ? qty : 1, type: 0 });
            }
        }

        const project = {
            properties: {
                owner: "BC3 Viewer",
                format: "FIEBDC-3/2004",
                generator: "BC3 Import Engine",
                description: file.name.replace(/\.[^/.]+$/, ''),
                charset: "ANSI"
            },
            concepts: concepts,
            root_nodes: rootNodes
        };

        if (window.BC3PriceBank && typeof window.BC3PriceBank.normalizeProject === 'function') {
            window.BC3PriceBank.normalizeProject(project, { title: project.properties.description });
        }

        loadCreatedProjectIntoViewer(project, file.name.replace(/\.[^/.]+$/, '') + ".bc3");
        showAppToast(`Presupuesto importado con éxito: ${file.name}`, '📊');
    } catch (err) {
        console.error("Error importando archivo:", err);
        alert("Error al procesar el archivo: " + err.message);
    }
}

// Atajos de Teclado Globales: Ctrl+S (Guardar) y Ctrl+Shift+S (Guardar Como...)
window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveCurrentBudgetFile(e.shiftKey);
    }
});

// Función para guardar y compartir archivos de forma nativa en dispositivos móviles (Capacitor)
async function saveAndShareNativeFile(base64Data, filename) {
    if (!window.Capacitor || !window.Capacitor.Plugins) return false;

    const { Filesystem, Share } = window.Capacitor.Plugins;
    if (!Filesystem || !Share) {
        console.warn("Plugins Filesystem o Share de Capacitor no disponibles.");
        return false;
    }

    try {
        // 1. Escribir el archivo temporal en el directorio de CACHE de forma segura
        await Filesystem.writeFile({
            path: filename,
            data: base64Data,
            directory: 'CACHE'
        });

        // 2. Obtener la URI interna del archivo generado
        const { uri } = await Filesystem.getUri({
            directory: 'CACHE',
            path: filename
        });

        // 3. Lanzar la hoja de compartir nativa del dispositivo
        await Share.share({
            title: filename,
            text: `Aquí tienes tu documento exportado: ${filename}`,
            url: uri
        });

        console.log(`Archivo compartido nativamente con éxito: ${filename}`);
        return true;
    } catch (err) {
        console.error("Error al guardar y compartir archivo de forma nativa:", err);
        alert("No se pudo guardar o compartir el archivo: " + err.message);
        return false;
    }
}

// Función para exportar a PDF (DIN A4 esquematizado)
function exportToPdf() {
    if (!parsedData) {
        alert("No hay datos de archivo cargados.");
        return;
    }

    // Importar jsPDF y jspdf-autotable (desde window)
    let jsPDFConstructor = null;
    if (window.jspdf && window.jspdf.jsPDF) {
        jsPDFConstructor = window.jspdf.jsPDF;
    } else if (window.jsPDF) {
        jsPDFConstructor = window.jsPDF;
    }

    if (!jsPDFConstructor) {
        alert("La librería PDF no se cargó correctamente. Por favor verifica tu conexión a internet.");
        return;
    }

    // Crear documento A4 (p = portrait, mm = milímetros, a4 = DIN A4)
    const doc = new jsPDFConstructor({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    // Validar extensión AutoTable
    if (typeof doc.autoTable !== 'function') {
        alert("La extensión de tablas para PDF (AutoTable) no está disponible. Por favor recarga la página.");
        return;
    }

    // Título del presupuesto
    const budgetTitle = parsedData.properties.description || "Presupuesto sin título";
    const budgetOwner = parsedData.properties.owner || "";
    const totalBudgetAmount = calculateTotalBudget();

    // 1. Título y bloque de metadatos en la primera página
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(128, 0, 32); // Granate
    doc.text("PRESUPUESTO DE OBRA", 15, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text(`Proyecto: ${budgetTitle}`, 15, 26);
    if (budgetOwner) {
        doc.text(`Propietario: ${budgetOwner}`, 15, 31);
        doc.text(`Fecha de exportación: ${new Date().toLocaleDateString('es-ES')}`, 15, 36);
    } else {
        doc.text(`Fecha de exportación: ${new Date().toLocaleDateString('es-ES')}`, 15, 31);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(22, 163, 74); // Verde para el total
    const formattedTotalStr = totalBudgetAmount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
    doc.text(`TOTAL PRESUPUESTO: ${formattedTotalStr}`, 15, budgetOwner ? 41 : 36);

    // Línea divisoria en granate
    doc.setDrawColor(128, 0, 32); // Granate
    doc.setLineWidth(0.5);
    doc.line(15, budgetOwner ? 44 : 39, 195, budgetOwner ? 44 : 39);

    // 2. Extraer datos del presupuesto en un formato plano
    const dataRows = [];

    // Función recursiva para recorrer solo Capítulos, Subcapítulos y Partidas
    function extractRowsRecursively(code, depth = 0, qty = 1) {
        const concept = parsedData.concepts[code];
        if (!concept) return;

        const isChapter = concept.code.endsWith('#') || concept.is_root;
        const priceVal = parseFloat(concept.price) || 0;
        const qtyVal = parseFloat(qty) || 0;
        const amountVal = priceVal * qtyVal;

        // Sangrar el resumen visualmente según la profundidad
        const indent = "   ".repeat(depth);
        const summaryText = indent + (concept.summary || '(Sin título)');

        const qtyStr = (qtyVal === 0 || isChapter) ? '' : qtyVal.toLocaleString('es-ES', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
        const priceStr = (priceVal === 0 || isChapter) ? '' : priceVal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
        const amountStr = (amountVal === 0) ? '' : amountVal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

        dataRows.push({
            code: concept.code.replace(/#+\s*$/, ''),
            unit: concept.unit || '',
            summary: summaryText,
            qty: qtyStr,
            price: priceStr,
            amount: amountStr,
            depth: depth
        });

        // Recorrer los hijos si es un capítulo
        if (isChapter) {
            const children = getConceptDecomposition(concept);
            children.forEach(child => {
                extractRowsRecursively(child.code, depth + 1, child.factor);
            });
        }
    }

    const roots = Array.isArray(parsedData.root_nodes) ? parsedData.root_nodes : Object.values(parsedData.root_nodes);
    roots.forEach(rootCode => {
        extractRowsRecursively(rootCode, 0, 1);
    });

    // 3. Generar la tabla usando AutoTable
    doc.autoTable({
        startY: budgetOwner ? 48 : 43,
        margin: { left: 15, right: 15, bottom: 20 },
        theme: 'plain',
        styles: {
            fontSize: 7.5,
            cellPadding: 2,
            lineColor: [220, 220, 220],
            lineWidth: 0.1,
            textColor: [40, 40, 40],
            font: 'helvetica'
        },
        columnStyles: {
            0: { cellWidth: 20 }, // Código
            1: { cellWidth: 10, halign: 'center' }, // Unidad
            2: { cellWidth: 'auto' }, // Resumen/Descripción
            3: { cellWidth: 18, halign: 'right' }, // Cantidad
            4: { cellWidth: 22, halign: 'right' }, // Precio
            5: { cellWidth: 25, halign: 'right' }  // Importe
        },
        head: [['Código', 'Ud', 'Resumen', 'Cant.', 'Precio', 'Importe']],
        headStyles: {
            fillColor: [128, 0, 32], // Granate institucional
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8.5,
            lineWidth: 0
        },
        body: dataRows.map(r => [r.code, r.unit, r.summary, r.qty, r.price, r.amount]),

        // Estilos específicos por fila (Capítulos vs Partidas)
        didParseCell: function (data) {
            if (data.row.section !== 'body') return;

            const rowIndex = data.row.index;
            const rowData = dataRows[rowIndex];

            if (rowData) {
                // Si es capítulo raíz (depth = 0)
                if (rowData.depth === 0) {
                    data.cell.styles.fillColor = [240, 240, 240];
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.textColor = [0, 0, 0];
                }
                // Si es un capítulo intermedio (depth = 1)
                else if (rowData.depth === 1) {
                    data.cell.styles.fillColor = [248, 248, 248];
                    data.cell.styles.fontStyle = 'bold';
                }
                // Si es un subcapítulo/partida sangrado
                else if (rowData.depth >= 2 && data.column.index === 2) {
                    // Solo el texto del resumen en negrita si no tiene precio (es decir, es un subcapítulo)
                    if (rowData.price === '') {
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            }
        }
    });

    // 4. Estampar encabezados y pies de página (Página X de Y) en todas las hojas creadas
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);

        // Dibujar encabezado en páginas después de la primera
        if (i > 1) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(120, 120, 120);
            doc.text(budgetTitle.substring(0, 50) + (budgetTitle.length > 50 ? '...' : ''), 15, 10);
            doc.text("PRESUPUESTO DE OBRA", 195 - doc.getTextWidth("PRESUPUESTO DE OBRA"), 10);

            // Línea superior de cabecera
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.2);
            doc.line(15, 12, 195, 12);
        }

        // Pie de página (Footer)
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);

        // Línea inferior de pie
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.2);
        doc.line(15, 282, 195, 282);

        // Textos pie de página
        doc.text("© Licencia Open Source - Software Libre by jmcaamanog", 15, 287);

        const pageStr = `Página ${i} de ${totalPages}`;
        doc.text(pageStr, 195 - doc.getTextWidth(pageStr), 287);
    }

    // Guardar/Descargar el PDF
    const baseName = currentFileName.replace(/\.[^/.]+$/, "");
    if (window.Capacitor && window.Capacitor.isPluginAvailable('Filesystem')) {
        const rawPdfUri = doc.output('datauristring');
        const base64Pdf = rawPdfUri.substring(rawPdfUri.indexOf(',') + 1);
        saveAndShareNativeFile(base64Pdf, `${baseName}_presupuesto.pdf`);
    } else {
        doc.save(`${baseName}_presupuesto.pdf`);
    }
}

// Modo Oscuro
const themeToggleBtn = document.getElementById('themeToggle');
if (themeToggleBtn) {
    const iconEl = document.getElementById('themeToggleIcon');
    const isDarkStored = localStorage.getItem('theme') === 'dark' ||
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDarkStored) {
        document.body.classList.add('dark-theme');
        if (iconEl) iconEl.textContent = '☀️';
    } else {
        document.body.classList.remove('dark-theme');
        if (iconEl) iconEl.textContent = '🌙';
    }

    themeToggleBtn.addEventListener('click', () => {
        const isDark = document.body.classList.toggle('dark-theme');
        if (iconEl) iconEl.textContent = isDark ? '☀️' : '🌙';
        localStorage.setItem('theme', isDark ? 'dark' : 'light');

        const setDrop = document.getElementById('settingsDropdown');
        if (setDrop) setDrop.classList.remove('show');
    });
}

// Drag & Drop
const dragOverlay = document.getElementById('dragOverlay');

window.addEventListener('dragenter', (e) => {
    e.preventDefault();
    if (dragOverlay) dragOverlay.style.display = 'flex';
});

window.addEventListener('dragover', (e) => {
    e.preventDefault();
});

if (dragOverlay) {
    dragOverlay.addEventListener('dragleave', (e) => {
        if (e.relatedTarget === null || !dragOverlay.contains(e.relatedTarget)) {
            dragOverlay.style.display = 'none';
        }
    });

    dragOverlay.addEventListener('drop', async (e) => {
        e.preventDefault();
        dragOverlay.style.display = 'none';

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            const fileList = Array.from(files).filter(f => {
                const n = f.name.toLowerCase();
                return n.endsWith('.bc3') || n.endsWith('.ifc');
            });
            if (fileList.length === 0) {
                alert('Por favor, selecciona o arrastra archivos con extensión .bc3 o .ifc');
                return;
            }

            const processBtn = document.querySelector('.process-btn');
            const originalText = processBtn ? processBtn.textContent : 'Procesar';
            if (processBtn) {
                processBtn.textContent = 'Procesando...';
                processBtn.disabled = true;
            }

            try {
                for (let i = 0; i < fileList.length; i++) {
                    const file = fileList[i];
                    currentFileName = file.name;
                    const fileNameEl = document.getElementById('fileName');
                    if (fileNameEl) fileNameEl.textContent = currentFileName;
                    const dropdownFileName = document.getElementById('dropdownFileName');
                    if (dropdownFileName) dropdownFileName.textContent = currentFileName;

                    if (file.name.toLowerCase().endsWith('.ifc')) {
                        await handleIfcFile(file);
                        continue;
                    }
                    const result = await readAndParseBC3File(file);
                    if (result.success) {
                        createBudgetTab(result.data, file.name, result.rawText || result.data.original_text);
                    } else {
                        alert('Error en ' + file.name + ': ' + (result.error || 'Unknown error'));
                    }
                }
            } catch (err) {
                console.error(err);
                alert('Error procesando el archivo: ' + err.message);
            } finally {
                if (processBtn) {
                    processBtn.textContent = originalText;
                    processBtn.disabled = false;
                }
            }
        }
    });
}

/* ==========================================================================
   Nuevas Funcionalidades: Dashboard, Mediciones, Excel, Comparar y Coeficientes
   ========================================================================== */

// 1. Auxiliar para actualizar factores de descomposición del padre al cambiar mediciones
function updateParentDecompositionFactor(childCode, newFactor) {
    Object.values(parsedData.concepts).forEach(parentConcept => {
        if (parentConcept.decomposition && parentConcept.decomposition.length > 0) {
            parentConcept.decomposition.forEach(item => {
                if (item.code === childCode) {
                    item.factor = newFactor;
                }
            });
        }
    });
}

// 2. Recalcular cantidad del concepto basado en mediciones y actualizar
function recalculateMeasurements(concept) {
    if (!concept || !concept.measurements) return;

    let total = 0;
    concept.measurements.forEach(m => {
        const evalU = evaluateMeasurementExpression(m.units);
        const evalL = evaluateMeasurementExpression(m.l);
        const evalW = evaluateMeasurementExpression(m.w);
        const evalH = evaluateMeasurementExpression(m.h);

        const vU = evalU.isBlank ? 1 : evalU.num;
        const vL = evalL.isBlank ? 1 : evalL.num;
        const vW = evalW.isBlank ? 1 : evalW.num;
        const vH = evalH.isBlank ? 1 : evalH.num;

        const partial = vU * vL * vW * vH;
        m._calculatedPartial = partial;
        total += partial;
    });

    // Actualizar el factor en el padre
    updateParentDecompositionFactor(concept.code, total);

    // Guardar cantidad del concepto
    concept.quantity = total;

    // Recalcular todo en cascada
    recalculateAll();

    // Actualizar el árbol visual
    const scrollPos = document.getElementById('treeContent') ? document.getElementById('treeContent').scrollTop : 0;
    renderCurrentLevel();
    if (document.getElementById('treeContent')) {
        document.getElementById('treeContent').scrollTop = scrollPos;
    }

    // Refrescar panel de detalles para ver reflejado el nuevo TOTAL
    showDetails(concept.code);
    updateTotalBudgetDisplay();
    saveHistoryState();
}

// 3. Exportación a Excel con SheetJS y Fórmulas
function exportToExcel() {
    if (!parsedData) {
        alert("No hay datos de archivo cargados.");
        return;
    }

    if (typeof XLSX === 'undefined') {
        alert("La librería de Excel (SheetJS) no se cargó correctamente. Por favor verifica tu conexión a internet.");
        return;
    }

    const roots = Array.isArray(parsedData.root_nodes) ? parsedData.root_nodes : Object.values(parsedData.root_nodes);
    const excelRows = [];
    let currentRow = 2; // Fila 1 es cabecera
    const rowChildrenMap = {};

    function collectRows(code, depth = 0, qty = 1, parentRowIndex = null) {
        const concept = parsedData.concepts[code];
        if (!concept) return;

        const isChapter = concept.code.endsWith('#') || concept.is_root;
        const myRowIndex = currentRow++;

        if (parentRowIndex !== null) {
            if (!rowChildrenMap[parentRowIndex]) rowChildrenMap[parentRowIndex] = [];
            rowChildrenMap[parentRowIndex].push(myRowIndex);
        }

        const priceVal = parseFloat(concept.price) || 0;
        const qtyVal = parseFloat(qty) || 0;

        excelRows.push({
            rowIndex: myRowIndex,
            code: concept.code.replace(/#+\s*$/, ''),
            unit: concept.unit || '',
            summary: "   ".repeat(depth) + (concept.summary || '(Sin título)'),
            qty: isChapter ? '' : qtyVal,
            price: isChapter ? '' : priceVal,
            isChapter: isChapter,
            depth: depth
        });

        if (isChapter) {
            const children = getConceptDecomposition(concept);
            children.forEach(child => {
                collectRows(child.code, depth + 1, child.factor, myRowIndex);
            });
        }
    }

    roots.forEach(rootCode => {
        collectRows(rootCode, 0, 1, null);
    });

    const wb = XLSX.utils.book_new();
    const wsData = [
        ['Código', 'Ud', 'Resumen', 'Cantidad', 'Precio', 'Importe']
    ];

    excelRows.forEach(row => {
        wsData.push([
            row.code,
            row.unit,
            row.summary,
            row.qty,
            row.price,
            '' // Fórmula
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Inyectar fórmulas y formatos
    excelRows.forEach(row => {
        const cellRef = `F${row.rowIndex}`;
        if (row.isChapter) {
            const childRows = rowChildrenMap[row.rowIndex];
            if (childRows && childRows.length > 0) {
                const sumTerms = childRows.map(rIndex => `F${rIndex}`).join('+');
                ws[cellRef] = { f: sumTerms };
            } else {
                ws[cellRef] = { v: 0 };
            }
        } else {
            ws[cellRef] = { f: `D${row.rowIndex}*E${row.rowIndex}` };
        }
    });

    // Formatear números
    for (let r = 2; r <= excelRows.length + 1; r++) {
        if (ws[`D${r}`] && ws[`D${r}`].v !== '') ws[`D${r}`].z = '#,##0.000';
        if (ws[`E${r}`] && ws[`E${r}`].v !== '') ws[`E${r}`].z = '#,##0.00 €';
        if (ws[`F${r}`]) ws[`F${r}`].z = '#,##0.00 €';
    }

    ws['!cols'] = [
        { wch: 15 }, // Código
        { wch: 6 },  // Ud
        { wch: 60 }, // Resumen
        { wch: 12 }, // Cantidad
        { wch: 12 }, // Precio
        { wch: 15 }  // Importe
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Presupuesto");

    // Guardar/Descargar el Excel
    const baseName = currentFileName.replace(/\.[^/.]+$/, "");
    if (window.Capacitor && window.Capacitor.isPluginAvailable('Filesystem')) {
        const excelBase64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
        saveAndShareNativeFile(excelBase64, `${baseName}_presupuesto.xlsx`);
    } else {
        XLSX.writeFile(wb, `${baseName}_presupuesto.xlsx`);
    }
}

// 4. Lógica de Dashboard y Gráficos
function calculateResourceDistribution() {
    const distribution = { MO: 0, MAQ: 0, MAT: 0, SUB: 0 };

    function traverse(code, accumulatedQty) {
        const concept = parsedData.concepts[code];
        if (!concept) return;

        const isChapter = concept.code.endsWith('#') || concept.is_root;
        const children = getConceptDecomposition(concept);

        if (isChapter) {
            children.forEach(child => {
                traverse(child.code, accumulatedQty * (parseFloat(child.factor) || 1));
            });
        } else {
            if (concept.decomposition && concept.decomposition.length > 0) {
                concept.decomposition.forEach(item => {
                    const childConcept = parsedData.concepts[item.code];
                    const childPrice = childConcept ? (parseFloat(childConcept.price) || 0) : 0;
                    const itemFactor = parseFloat(item.factor) || 0;
                    const itemType = item.type; // 1=MO, 2=MAQ, 3=MAT, 4=SUB
                    const totalCost = itemFactor * childPrice * accumulatedQty;

                    if (itemType === 1) distribution.MO += totalCost;
                    else if (itemType === 2) distribution.MAQ += totalCost;
                    else if (itemType === 3) distribution.MAT += totalCost;
                    else distribution.SUB += totalCost;
                });
            } else {
                const price = parseFloat(concept.price) || 0;
                const totalCost = price * accumulatedQty;
                distribution.SUB += totalCost;
            }
        }
    }

    const roots = Array.isArray(parsedData.root_nodes) ? parsedData.root_nodes : Object.values(parsedData.root_nodes);
    roots.forEach(rootCode => {
        traverse(rootCode, 1.0);
    });

    return distribution;
}

function getTopChapters() {
    const roots = Array.isArray(parsedData.root_nodes) ? parsedData.root_nodes : Object.values(parsedData.root_nodes);
    const chapters = [];

    roots.forEach(rootCode => {
        const concept = parsedData.concepts[rootCode];
        if (concept) {
            const children = getConceptDecomposition(concept);

            children.forEach(child => {
                const childConcept = parsedData.concepts[child.code];
                if (childConcept) {
                    chapters.push({
                        summary: childConcept.summary || childConcept.code,
                        cost: (parseFloat(childConcept.price) || 0) * (parseFloat(child.factor) || 1)
                    });
                }
            });
        }
    });

    if (chapters.length === 0) {
        roots.forEach(rootCode => {
            const concept = parsedData.concepts[rootCode];
            if (concept) {
                chapters.push({
                    summary: concept.summary || concept.code,
                    cost: parseFloat(concept.price) || 0
                });
            }
        });
    }

    return chapters.sort((a, b) => b.cost - a.cost).slice(0, 5);
}

function renderCharts() {
    if (!parsedData) return;

    const dist = calculateResourceDistribution();
    const isDark = document.body.classList.contains('dark-theme');
    const labelColor = isDark ? '#e2e8f0' : '#1e293b';
    const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

    // ─── Recopilar datos de capítulos (children del root) ───
    const roots = Array.isArray(parsedData.root_nodes) ? parsedData.root_nodes : Object.values(parsedData.root_nodes);
    const chapters = [];
    roots.forEach(rootCode => {
        const root = parsedData.concepts[rootCode];
        if (!root) return;
        const children = getConceptDecomposition(root);
        children.forEach(ch => {
            const concept = parsedData.concepts[ch.code];
            if (!concept) return;
            // Calcular distribución MO/MAQ/MAT por capítulo
            let mo = 0, maq = 0, mat = 0, sub = 0;
            function accumulate(code, qty) {
                const c = parsedData.concepts[code];
                if (!c) return;
                if (c.code.endsWith('#') || c.is_root) {
                    getConceptDecomposition(c).forEach(ci => accumulate(ci.code, qty * (parseFloat(ci.factor) || 1)));
                } else {
                    (c.decomposition || []).forEach(item => {
                        const child = parsedData.concepts[item.code];
                        const childPrice = child ? (parseFloat(child.price) || 0) : 0;
                        const cost = (parseFloat(item.factor) || 0) * childPrice * qty;
                        if (item.type === 1) mo += cost;
                        else if (item.type === 2) maq += cost;
                        else if (item.type === 3) mat += cost;
                        else sub += cost;
                    });
                    if (!c.decomposition || c.decomposition.length === 0) sub += (parseFloat(c.price) || 0) * qty;
                }
            }
            accumulate(ch.code, parseFloat(ch.factor) || 1);

            // Recopilar partidas hoja del capítulo para precio medio/máximo
            const leaves = [];
            function collectLeaves(code) {
                const c = parsedData.concepts[code];
                if (!c) return;
                const kids = getConceptDecomposition(c);
                if (kids.length === 0 || (!c.code.endsWith('#') && !c.is_root)) {
                    const p = parseFloat(c.price) || 0;
                    if (p > 0) leaves.push(p);
                } else {
                    kids.forEach(k => collectLeaves(k.code));
                }
            }
            collectLeaves(ch.code);

            const totalCost = (parseFloat(concept.price) || 0) * (parseFloat(ch.factor) || 1);
            const avgPrice = leaves.length > 0 ? leaves.reduce((a, b) => a + b, 0) / leaves.length : 0;
            const maxPrice = leaves.length > 0 ? Math.max(...leaves) : 0;

            chapters.push({
                summary: (concept.summary || concept.code).substring(0, 20),
                cost: totalCost,
                mo, maq, mat, sub,
                avgPrice, maxPrice,
                numLeaves: leaves.length
            });
        });
    });

    chapters.sort((a, b) => b.cost - a.cost);
    const top = chapters.slice(0, 8);
    const topLabels = top.map(c => c.summary);

    // ─── Total partidas hoja del presupuesto ───
    let totalLeaves = 0, allPrices = [];
    Object.values(parsedData.concepts).forEach(c => {
        const kids = getConceptDecomposition(c);
        if (kids.length === 0 && !c.code.endsWith('#') && !c.is_root) {
            const p = parseFloat(c.price) || 0;
            if (p > 0) { totalLeaves++; allPrices.push(p); }
        }
    });
    const globalAvg = allPrices.length > 0 ? allPrices.reduce((a, b) => a + b, 0) / allPrices.length : 0;
    const globalMax = allPrices.length > 0 ? Math.max(...allPrices) : 0;
    const totalBudget = Object.values(parsedData.concepts)
        .filter(c => c.is_root || c.code.endsWith('#'))
        .reduce((s, c) => s + (parseFloat(c.price) || 0), 0);
    const totalPEM = chapters.reduce((s, c) => s + c.cost, 0);
    const moTotal = dist.MO, maqTotal = dist.MAQ, matTotal = dist.MAT, subTotal = dist.SUB;
    const costTotal = moTotal + maqTotal + matTotal + subTotal || 1;
    const pctMO = (moTotal / costTotal * 100).toFixed(1);
    const pctMat = (matTotal / costTotal * 100).toFixed(1);
    const pctMaq = (maqTotal / costTotal * 100).toFixed(1);

    // ─── KPI Strip ───
    const strip = document.getElementById('dbKpiStrip');
    if (strip) {
        const kpis = [
            { icon: '💶', label: 'PEM Total', val: totalPEM.toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' €' },
            { icon: '📂', label: 'Capítulos', val: chapters.length },
            { icon: '📋', label: 'Partidas', val: totalLeaves },
            { icon: '📐', label: 'Precio Medio', val: globalAvg.toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' €' },
            { icon: '🔝', label: 'Precio Máx.', val: globalMax.toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' €' },
            { icon: '👷', label: '% Mano Obra', val: pctMO + '%' },
            { icon: '🏗️', label: '% Materiales', val: pctMat + '%' },
            { icon: '⚙️', label: '% Maquinaria', val: pctMaq + '%' },
        ];
        strip.innerHTML = kpis.map(k =>
            `<div class="db-kpi-card"><span class="db-kpi-icon">${k.icon}</span><span class="db-kpi-label">${k.label}</span><span class="db-kpi-val">${k.val}</span></div>`
        ).join('');
    }

    // ─── Destruir instancias previas ───
    ['typeChartInstance', 'chaptersChartInstance', 'chapterBreakdownChart', 'priceAvgMaxChart', 'priceRangeChart', 'weightPieChart'].forEach(key => {
        if (window[key]) { try { window[key].destroy(); } catch (e) { } window[key] = null; }
    });

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];

    // 1. Doughnut - Distribución por tipo de coste
    const ctx1 = document.getElementById('resourceTypeChart');
    if (ctx1) {
        window.typeChartInstance = new Chart(ctx1.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Mano de Obra', 'Maquinaria', 'Materiales', 'Subcontratas/Otros'],
                datasets: [{
                    data: [dist.MO, dist.MAQ, dist.MAT, dist.SUB],
                    backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#a855f7'], borderWidth: 2
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: labelColor, padding: 12 } },
                    tooltip: {
                        callbacks: {
                            label: ctx => {
                                const v = ctx.parsed; const t = ctx.dataset.data.reduce((a, b) => a + b, 0) || 1;
                                return ` ${ctx.label}: ${v.toLocaleString('es-ES', { minimumFractionDigits: 2 })} € (${(v / t * 100).toFixed(1)}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    // 2. Bar horizontal - Top capítulos por peso
    const ctx2 = document.getElementById('chaptersCostChart');
    if (ctx2) {
        window.chaptersChartInstance = new Chart(ctx2.getContext('2d'), {
            type: 'bar',
            data: {
                labels: topLabels,
                datasets: [{
                    label: 'Coste (€)', data: top.map(c => c.cost),
                    backgroundColor: top.map((_, i) => COLORS[i % COLORS.length]), borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: labelColor }, grid: { color: gridColor } },
                    y: { ticks: { color: labelColor } }
                }
            }
        });
    }

    // 3. Stacked bar - MO/MAQ/MAT por capítulo
    const ctx3 = document.getElementById('chapterBreakdownChart');
    if (ctx3) {
        window.chapterBreakdownChart = new Chart(ctx3.getContext('2d'), {
            type: 'bar',
            data: {
                labels: topLabels,
                datasets: [
                    { label: 'Mano Obra', data: top.map(c => c.mo), backgroundColor: '#ef4444', borderRadius: 2 },
                    { label: 'Maquinaria', data: top.map(c => c.maq), backgroundColor: '#f59e0b', borderRadius: 2 },
                    { label: 'Materiales', data: top.map(c => c.mat), backgroundColor: '#3b82f6', borderRadius: 2 },
                    { label: 'Otros/Sub.', data: top.map(c => c.sub), backgroundColor: '#a855f7', borderRadius: 2 },
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: {
                    x: { stacked: true, ticks: { color: labelColor }, grid: { color: gridColor } },
                    y: { stacked: true, ticks: { color: labelColor }, grid: { color: gridColor } }
                },
                plugins: { legend: { labels: { color: labelColor } } }
            }
        });
    }

    // 4. Line/Bar combo - Precio medio y máximo por capítulo
    const ctx4 = document.getElementById('priceAvgMaxChart');
    if (ctx4) {
        window.priceAvgMaxChart = new Chart(ctx4.getContext('2d'), {
            type: 'bar',
            data: {
                labels: topLabels,
                datasets: [
                    {
                        type: 'bar', label: 'Precio Máx. (€)', data: top.map(c => c.maxPrice),
                        backgroundColor: 'rgba(239,68,68,0.5)', borderColor: '#ef4444', borderWidth: 1, borderRadius: 4
                    },
                    {
                        type: 'line', label: 'Precio Medio (€)', data: top.map(c => c.avgPrice),
                        borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.15)',
                        fill: true, tension: 0.3, pointRadius: 4, pointBackgroundColor: '#10b981'
                    },
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: {
                    x: { ticks: { color: labelColor }, grid: { color: gridColor } },
                    y: { ticks: { color: labelColor }, grid: { color: gridColor } }
                },
                plugins: { legend: { labels: { color: labelColor } } }
            }
        });
    }

    // 5. Histogram - Distribución por rango de precio
    const ctx5 = document.getElementById('priceRangeChart');
    if (ctx5) {
        const ranges = [[0, 10], [10, 50], [50, 200], [200, 500], [500, 1000], [1000, 5000], [5000, Infinity]];
        const rangeLabels = ['<10€', '10–50€', '50–200€', '200–500€', '500–1k€', '1k–5k€', '>5k€'];
        const counts = ranges.map(([lo, hi]) => allPrices.filter(p => p >= lo && p < hi).length);
        window.priceRangeChart = new Chart(ctx5.getContext('2d'), {
            type: 'bar',
            data: {
                labels: rangeLabels,
                datasets: [{
                    label: 'Nº de Partidas', data: counts,
                    backgroundColor: COLORS, borderRadius: 4
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: labelColor }, grid: { color: gridColor } },
                    y: { ticks: { color: labelColor, stepSize: 1 }, grid: { color: gridColor } }
                }
            }
        });
    }

    // 6. Pie - Peso económico por capítulo
    const ctx6 = document.getElementById('weightPieChart');
    if (ctx6) {
        window.weightPieChart = new Chart(ctx6.getContext('2d'), {
            type: 'pie',
            data: {
                labels: chapters.map(c => c.summary),
                datasets: [{
                    data: chapters.map(c => c.cost),
                    backgroundColor: chapters.map((_, i) => COLORS[i % COLORS.length]), borderWidth: 1
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { color: labelColor, boxWidth: 12, padding: 8 } },
                    tooltip: {
                        callbacks: {
                            label: ctx => {
                                const v = ctx.parsed; const t = chapters.reduce((a, c) => a + c.cost, 0) || 1;
                                return ` ${ctx.label}: ${v.toLocaleString('es-ES', { minimumFractionDigits: 2 })} € (${(v / t * 100).toFixed(1)}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
}

// 5. Comparador: Estadísticas de Diferencias
function calculateCompareStats() {
    if (!parsedData || !compareData) return;

    let modifiedCount = 0;
    const totalMain = calculateTotalBudget();
    let totalCompare = 0;

    const roots = Array.isArray(parsedData.root_nodes) ? parsedData.root_nodes : Object.values(parsedData.root_nodes);
    roots.forEach(code => {
        const compConcept = compareData[code];
        if (compConcept) {
            totalCompare += parseFloat(compConcept.price) || 0;
        }
    });

    const diffTotal = totalMain - totalCompare;
    const pctDiff = totalCompare === 0 ? 0 : (diffTotal / totalCompare) * 100;

    Object.keys(parsedData.concepts).forEach(code => {
        const mainConcept = parsedData.concepts[code];
        const compConcept = compareData[code];
        if (mainConcept && compConcept) {
            if (parseFloat(mainConcept.price) !== parseFloat(compConcept.price) || mainConcept.summary !== compConcept.summary) {
                modifiedCount++;
            }
        }
    });

    const resultsDiv = document.getElementById('compareResults');
    if (resultsDiv) resultsDiv.style.display = 'block';

    const diffValEl = document.getElementById('compareTotalDiff');
    if (diffValEl) {
        const formattedDiff = diffTotal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
        const formattedPct = pctDiff.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' %';
        diffValEl.textContent = `${diffTotal >= 0 ? '+' : ''}${formattedDiff} (${diffTotal >= 0 ? '+' : ''}${formattedPct})`;
        diffValEl.className = 'stat-value ' + (diffTotal >= 0 ? 'pec-total' : 'clear-compare-btn');
    }

    const modCountEl = document.getElementById('compareModifiedCount');
    if (modCountEl) modCountEl.textContent = modifiedCount;
}

// 6. Filtros: Comprobación de visibilidad de nodos y expansión
function shouldShowNode(code) {
    if (!parsedData) return true;
    const concept = parsedData.concepts[code];
    if (!concept) return true;

    const isChapter = concept.code.endsWith('#') || concept.is_root;
    if (isChapter) {
        return hasVisibleChildren(code);
    }

    // Filtro por Importe
    const costFilterVal = document.getElementById('costFilter').value;
    if (costFilterVal !== 'all') {
        const limit = parseFloat(costFilterVal);
        const price = parseFloat(concept.price) || 0;
        const quantity = parseFloat(concept.quantity) || 1.0;
        const cost = price * quantity;
        if (cost <= limit) return false;
    }

    // Filtro por Tipo de Recurso
    const resourceFilterVal = document.getElementById('resourceFilter').value;
    if (resourceFilterVal !== 'all') {
        if (concept.decomposition && concept.decomposition.length > 0) {
            const hasResourceType = concept.decomposition.some(item => {
                if (resourceFilterVal === 'mo' && item.type === 1) return true;
                if (resourceFilterVal === 'maq' && item.type === 2) return true;
                if (resourceFilterVal === 'mat' && item.type === 3) return true;
                if (resourceFilterVal === 'sub' && item.type === 4) return true;
                return false;
            });
            if (!hasResourceType) return false;
        } else {
            if (resourceFilterVal !== 'sub') return false; // Tratar sin descomposición como subcontrata
        }
    }

    return true;
}

function hasVisibleChildren(code) {
    const concept = parsedData.concepts[code];
    if (!concept) return false;

    const isChapter = concept.code.endsWith('#') || concept.is_root;
    if (!isChapter) {
        // Para nodos hoja (partidas), validamos el filtro en sí
        const costFilterVal = document.getElementById('costFilter').value;
        const resourceFilterVal = document.getElementById('resourceFilter').value;
        if (costFilterVal === 'all' && resourceFilterVal === 'all') return true;

        const price = parseFloat(concept.price) || 0;
        const quantity = parseFloat(concept.quantity) || 1.0;
        const cost = price * quantity;

        if (costFilterVal !== 'all' && cost <= parseFloat(costFilterVal)) return false;

        if (resourceFilterVal !== 'all') {
            if (concept.decomposition && concept.decomposition.length > 0) {
                return concept.decomposition.some(item => {
                    if (resourceFilterVal === 'mo' && item.type === 1) return true;
                    if (resourceFilterVal === 'maq' && item.type === 2) return true;
                    if (resourceFilterVal === 'mat' && item.type === 3) return true;
                    if (resourceFilterVal === 'sub' && item.type === 4) return true;
                    return false;
                });
            } else {
                return resourceFilterVal === 'sub';
            }
        }
        return true;
    }

    const children = getConceptDecomposition(concept);

    return children.some(child => hasVisibleChildren(child.code));
}

// 7. Enlazar Eventos de Nuevas Funcionalidades (Dropdown de Exportación y Ajustes)
const exportDropdown = document.getElementById('exportDropdown');
if (exportDropdown) {
    const toggleBtn = exportDropdown.querySelector('.dropdown-toggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            exportDropdown.classList.toggle('show');
        });
    }
}

const settingsBtn = document.getElementById('settingsBtn');
const settingsDropdown = document.getElementById('settingsDropdown');
if (settingsBtn && settingsDropdown) {
    settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        settingsDropdown.classList.toggle('show');
    });
}

const ganttExportDropdown = document.getElementById('ganttExportDropdown');
if (ganttExportDropdown) {
    const toggleBtn = ganttExportDropdown.querySelector('.dropdown-toggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            ganttExportDropdown.classList.toggle('show');
            // Cerrar otros dropdowns del Gantt
            const ganttConfig = document.getElementById('ganttConfigDropdown');
            if (ganttConfig) ganttConfig.classList.remove('show');
            const ganttScale = document.getElementById('ganttScaleDropdown');
            if (ganttScale) ganttScale.classList.remove('show');
        });
    }
}

const ganttConfigDropdown = document.getElementById('ganttConfigDropdown');
if (ganttConfigDropdown) {
    const toggleBtn = ganttConfigDropdown.querySelector('.dropdown-toggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            ganttConfigDropdown.classList.toggle('show');
            // Cerrar otros dropdowns del Gantt
            const ganttExport = document.getElementById('ganttExportDropdown');
            if (ganttExport) ganttExport.classList.remove('show');
            const ganttScale = document.getElementById('ganttScaleDropdown');
            if (ganttScale) ganttScale.classList.remove('show');
        });
    }
}

const ganttScaleDropdown = document.getElementById('ganttScaleDropdown');
if (ganttScaleDropdown) {
    const toggleBtn = ganttScaleDropdown.querySelector('.dropdown-toggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            ganttScaleDropdown.classList.toggle('show');
            // Cerrar otros dropdowns del Gantt
            const ganttExport = document.getElementById('ganttExportDropdown');
            if (ganttExport) ganttExport.classList.remove('show');
            const ganttConfig = document.getElementById('ganttConfigDropdown');
            if (ganttConfig) ganttConfig.classList.remove('show');
        });
    }
}

// Cerrar dropdowns al hacer click fuera
window.addEventListener('click', (e) => {
    const expDrop = document.getElementById('exportDropdown');
    if (expDrop && !expDrop.contains(e.target)) {
        expDrop.classList.remove('show');
    }
    const setDrop = document.getElementById('settingsDropdown');
    if (setDrop && !setDrop.contains(e.target)) {
        setDrop.classList.remove('show');
    }
    const ganttExpDrop = document.getElementById('ganttExportDropdown');
    if (ganttExpDrop && !ganttExpDrop.contains(e.target)) {
        ganttExpDrop.classList.remove('show');
    }
    const ganttConfigDrop = document.getElementById('ganttConfigDropdown');
    if (ganttConfigDrop && !ganttConfigDrop.contains(e.target)) {
        ganttConfigDrop.classList.remove('show');
    }
    const ganttScaleDrop = document.getElementById('ganttScaleDropdown');
    if (ganttScaleDrop && !ganttScaleDrop.contains(e.target)) {
        ganttScaleDrop.classList.remove('show');
    }
});

const exportPdfBtn = document.getElementById('exportPdfBtn');
const exportExcelBtn = document.getElementById('exportExcelBtn');

if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', () => {
        const expDrop = document.getElementById('exportDropdown');
        if (expDrop) expDrop.classList.remove('show');
        exportToPdf();
    });
}

if (exportExcelBtn) {
    exportExcelBtn.addEventListener('click', () => {
        const expDrop = document.getElementById('exportDropdown');
        if (expDrop) expDrop.classList.remove('show');
        exportToExcel();
    });
}

if (exportBc3Btn) {
    exportBc3Btn.addEventListener('click', () => {
        const expDrop = document.getElementById('exportDropdown');
        if (expDrop) expDrop.classList.remove('show');
        saveCurrentBudgetFile(true);
    });
}

// Dashboard modal toggling
const dashboardBtn = document.getElementById('dashboardBtn');
const dashboardModal = document.getElementById('dashboardModal');
const closeDashboardBtn = document.getElementById('closeDashboardBtn');

if (dashboardBtn) {
    dashboardBtn.addEventListener('click', () => {
        openDashboardModal('dashboard');
    });
}

if (closeDashboardBtn && dashboardModal) {
    closeDashboardBtn.addEventListener('click', () => {
        dashboardModal.style.display = 'none';
        document.body.classList.remove('modal-open');
        const fab = document.getElementById('expandHeaderBtn');
        if (fab) fab.style.display = 'flex';
    });

    window.addEventListener('click', (e) => {
        if (e.target === dashboardModal) {
            dashboardModal.style.display = 'none';
            document.body.classList.remove('modal-open');
            const fab = document.getElementById('expandHeaderBtn');
            if (fab) fab.style.display = 'flex';
        }
    });
}

// Compare modal toggling and upload
const compareBtn = document.getElementById('compareBtn');
const compareModal = document.getElementById('compareModal');
const closeCompareBtn = document.getElementById('closeCompareBtn');
const runCompareBtn = document.getElementById('runCompareBtn');
const compareFileInput = document.getElementById('compareFileInput');
const clearCompareBtn = document.getElementById('clearCompareBtn');

if (compareBtn && compareModal && closeCompareBtn) {
    compareBtn.addEventListener('click', () => {
        compareModal.style.display = 'flex';
    });

    closeCompareBtn.addEventListener('click', () => {
        compareModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === compareModal) {
            compareModal.style.display = 'none';
        }
    });
}

// Info modal toggling
const infoBtn = document.getElementById('infoBtn');
const infoModal = document.getElementById('infoModal');
const closeInfoBtn = document.getElementById('closeInfoBtn');

if (infoBtn && infoModal && closeInfoBtn) {
    infoBtn.addEventListener('click', () => {
        infoModal.style.display = 'flex';
        const setDrop = document.getElementById('settingsDropdown');
        if (setDrop) setDrop.classList.remove('show');

        // Cargar registros de OTA
        const otaContainer = document.getElementById('otaLogsContainer');
        if (otaContainer) {
            try {
                const logs = JSON.parse(localStorage.getItem('ota_logs') || '[]');
                if (logs.length === 0) {
                    otaContainer.textContent = "No hay registros disponibles.";
                } else {
                    otaContainer.textContent = logs.join('\n');
                    otaContainer.scrollTop = otaContainer.scrollHeight;
                }
            } catch (e) {
                otaContainer.textContent = "Error al leer los registros: " + e.message;
            }
        }
    });

    closeInfoBtn.addEventListener('click', () => {
        infoModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === infoModal) {
            infoModal.style.display = 'none';
        }
    });

    // Botón de limpiar registros de OTA
    const clearOtaLogsBtn = document.getElementById('clearOtaLogsBtn');
    if (clearOtaLogsBtn) {
        clearOtaLogsBtn.addEventListener('click', () => {
            localStorage.removeItem('ota_logs');
            const otaContainer = document.getElementById('otaLogsContainer');
            if (otaContainer) otaContainer.textContent = "Registros limpiados.";
        });
    }

    // Botón de buscar actualización manualmente
    const manualCheckUpdateBtn = document.getElementById('manualCheckUpdateBtn');
    if (manualCheckUpdateBtn) {
        manualCheckUpdateBtn.addEventListener('click', async () => {
            manualCheckUpdateBtn.disabled = true;
            manualCheckUpdateBtn.style.opacity = '0.7';
            try {
                await checkForUpdates(true);
            } catch (e) {
                console.error(e);
            } finally {
                manualCheckUpdateBtn.disabled = false;
                manualCheckUpdateBtn.style.opacity = '1';
                // Recargar logs en contenedor
                const otaContainer = document.getElementById('otaLogsContainer');
                if (otaContainer) {
                    try {
                        const logs = JSON.parse(localStorage.getItem('ota_logs') || '[]');
                        otaContainer.textContent = logs.join('\n');
                        otaContainer.scrollTop = otaContainer.scrollHeight;
                    } catch (e) {}
                }
            }
        });
    }
}

// About Me modal toggling
const aboutMeBtn = document.getElementById('aboutMeBtn');
const aboutMeModal = document.getElementById('aboutMeModal');
const closeAboutMeBtn = document.getElementById('closeAboutMeBtn');

if (aboutMeBtn && aboutMeModal && closeAboutMeBtn) {
    aboutMeBtn.addEventListener('click', () => {
        aboutMeModal.style.display = 'flex';
        const setDrop = document.getElementById('settingsDropdown');
        if (setDrop) setDrop.classList.remove('show');
    });

    closeAboutMeBtn.addEventListener('click', () => {
        aboutMeModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === aboutMeModal) {
            aboutMeModal.style.display = 'none';
        }
    });
}

if (runCompareBtn && compareFileInput) {
    runCompareBtn.addEventListener('click', async () => {
        if (!compareFileInput.files.length) {
            alert("Por favor selecciona un archivo .bc3 para comparar");
            return;
        }

        runCompareBtn.textContent = 'Comparando...';
        runCompareBtn.disabled = true;

        try {
            const file = compareFileInput.files[0];
            const result = await readAndParseBC3File(file);

            if (result.success) {
                compareData = result.data.concepts;
                compareActive = true;

                calculateCompareStats();
                renderCurrentLevel();
                updateTotalBudgetDisplay();

                compareModal.style.display = 'none';
            } else {
                alert("Error al cargar el archivo de comparación: " + result.error);
            }
        } catch (err) {
            console.error(err);
            alert("Error al cargar o comparar el archivo: " + err.message);
        } finally {
            runCompareBtn.textContent = 'Cargar y Comparar';
            runCompareBtn.disabled = false;
        }
    });
}

if (clearCompareBtn) {
    clearCompareBtn.addEventListener('click', () => {
        compareActive = false;
        compareData = null;
        document.getElementById('compareResults').style.display = 'none';
        renderCurrentLevel();
        updateTotalBudgetDisplay();
    });
}

// Filtros avanzados y expansión
const expandAllBtn = document.getElementById('expandAllBtn');
const collapseAllBtn = document.getElementById('collapseAllBtn');
const costFilter = document.getElementById('costFilter');
const resourceFilter = document.getElementById('resourceFilter');

if (expandAllBtn) {
    expandAllBtn.addEventListener('click', () => {
        if (!parsedData) return;
        Object.keys(parsedData.concepts).forEach(code => {
            if (code.endsWith('#')) {
                expandedNodes.add(code);
            }
        });
        renderCurrentLevel();
    });
}

if (collapseAllBtn) {
    collapseAllBtn.addEventListener('click', () => {
        expandedNodes.clear();
        renderCurrentLevel();
    });
}

if (costFilter) {
    costFilter.addEventListener('change', () => {
        renderCurrentLevel();
    });
}

if (resourceFilter) {
    resourceFilter.addEventListener('change', () => {
        renderCurrentLevel();
    });
}


/* ==========================================================================
   Historial de Cambios: Deshacer (Ctrl+Z) y Rehacer (Ctrl+Y)
   ========================================================================== */

function saveHistoryState() {
    if (!parsedData) return;

    // Si el usuario hace un cambio nuevo estando en medio del historial, cortamos los estados futuros
    if (historyIndex < stateHistory.length - 1) {
        stateHistory = stateHistory.slice(0, historyIndex + 1);
    }

    // Clonar el estado actual de parsedData
    stateHistory.push(JSON.stringify(parsedData));

    // Limitar el historial a los últimos 50 estados para evitar consumo excesivo de memoria
    if (stateHistory.length > 50) {
        stateHistory.shift();
    }

    historyIndex = stateHistory.length - 1;
    updateUndoRedoButtonsState();
}

function undo() {
    if (historyIndex > 0) {
        historyIndex--;
        parsedData = JSON.parse(stateHistory[historyIndex]);

        // Recalcular todo en cascada y repintar
        recalculateAll();
        renderCurrentLevel();
        updateTotalBudgetDisplay();

        // Si hay una partida activa en el panel de detalles, refrescarla
        const detCodeEl = document.getElementById('detCode');
        if (detCodeEl && detCodeEl.textContent) {
            const rawCode = Object.keys(parsedData.concepts).find(c => c.replace(/#+\s*$/, '') === detCodeEl.textContent);
            if (rawCode) showDetails(rawCode);
        }

        updateUndoRedoButtonsState();
        showNotification("Deshacer: Cambio revertido");
    }
}

function redo() {
    if (historyIndex < stateHistory.length - 1) {
        historyIndex++;
        parsedData = JSON.parse(stateHistory[historyIndex]);

        // Recalcular todo en cascada y repintar
        recalculateAll();
        renderCurrentLevel();
        updateTotalBudgetDisplay();

        // Si hay una partida activa en el panel de detalles, refrescarla
        const detCodeEl = document.getElementById('detCode');
        if (detCodeEl && detCodeEl.textContent) {
            const rawCode = Object.keys(parsedData.concepts).find(c => c.replace(/#+\s*$/, '') === detCodeEl.textContent);
            if (rawCode) showDetails(rawCode);
        }

        updateUndoRedoButtonsState();
        showNotification("Rehacer: Cambio restaurado");
    }
}

function updateUndoRedoButtonsState() {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');

    if (undoBtn) {
        undoBtn.disabled = (historyIndex <= 0);
    }
    if (redoBtn) {
        redoBtn.disabled = (historyIndex >= stateHistory.length - 1);
    }
}

// Mostrar notificación en pantalla estilo Toast flotante
function showNotification(message) {
    let container = document.getElementById('notificationContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notificationContainer';
        container.style.position = 'fixed';
        container.style.bottom = '20px';
        container.style.right = '20px';
        container.style.zIndex = '9999';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '10px';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.backgroundColor = 'var(--text-primary)';
    toast.style.color = 'var(--bg-color)';
    toast.style.padding = '10px 20px';
    toast.style.borderRadius = '6px';
    toast.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.2)';
    toast.style.fontSize = '0.85rem';
    toast.style.fontWeight = '500';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.2s ease-out';

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 10);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => {
            toast.remove();
        }, 200);
    }, 2000);
}

// Atajos de teclado (Ctrl+Z y Ctrl+Y)
window.addEventListener('keydown', (e) => {
    const isCtrl = e.ctrlKey || e.metaKey;
    if (isCtrl) {
        if (e.key.toLowerCase() === 'z') {
            e.preventDefault();
            undo();
        } else if (e.key.toLowerCase() === 'y') {
            e.preventDefault();
            redo();
        }
    }
});

// Enlazar clics de botones
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');

if (undoBtn) {
    undoBtn.addEventListener('click', undo);
}

// ============================================================
// MÓDULO PLANNING — DIAGRAMA DE GANTT INTERACTIVO
// ============================================================

// Estado Gantt: { taskId: { startWeek, durationWeeks, collapsed } }
let ganttState = {};
let ganttTasks = [];
let ganttStartDate = new Date();
let ganttTotalWeeks = 26;
let GANTT_COL_PX = 44; // ancho de cada columna en px (redimensionable por zoom slider)
let ganttPrevColPx = 44; // ancho previo de la columna (para mantener scroll center)
let ganttViewMode = 'weeks'; // escala de tiempo: 'days', 'weeks', 'months'
let ganttLeftColWidth = window.innerWidth <= 768 ? 250 : (window.innerWidth <= 1024 ? 360 : 460);  // ancho columna tareas en px (redimensionable)
const GANTT_PRE_WEEKS = 4; // Margen de semanas a la izquierda para poder deslizar antes del inicio/hoy
let ganttColDrag = null;       // estado drag de la columna

// Clave localStorage basada en el nombre del fichero cargado
function ganttStorageKey() {
    return 'gantt_' + currentFileName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\.]/g, '');
}

// Guardar estado en localStorage
function ganttSave() {
    try {
        localStorage.setItem(ganttStorageKey(), JSON.stringify({
            startDate: ganttStartDate.toISOString(),
            totalWeeks: ganttTotalWeeks,
            state: ganttState
        }));
    } catch (e) { /* cuota excedida — ignorar */ }
}

// Cargar estado desde localStorage
function ganttLoad() {
    try {
        const raw = localStorage.getItem(ganttStorageKey());
        if (!raw) return false;
        const saved = JSON.parse(raw);
        if (saved.startDate) ganttStartDate = new Date(saved.startDate);
        if (saved.totalWeeks) ganttTotalWeeks = saved.totalWeeks;
        if (saved.state) ganttState = saved.state;
        return true;
    } catch (e) { return false; }
}

// Instancia global del motor de Gantt
let ganttEngine = null;

// Inicializa o retorna el motor de Gantt sincronizado
function getGanttEngine() {
    if (!ganttEngine) {
        ganttEngine = new BC3GanttEngine(parsedData, {
            totalWeeks: ganttTotalWeeks,
            startDate: ganttStartDate,
            state: ganttState,
            preWeeks: GANTT_PRE_WEEKS,
            viewMode: ganttViewMode,
            colPx: GANTT_COL_PX
        });
    } else {
        // Sincronizar estado y parámetros cambiantes
        ganttEngine.parsedData = parsedData;
        ganttEngine.totalWeeks = ganttTotalWeeks;
        ganttEngine.startDate = ganttStartDate;
        ganttEngine.state = ganttState;
        ganttEngine.viewMode = ganttViewMode;
        ganttEngine.colPx = GANTT_COL_PX;
    }
    return ganttEngine;
}

// Extraer tareas hasta nivel 3 desde parsedData delegando al motor
function getGanttTasks() {
    return getGanttEngine().getGanttTasks();
}

// Distribución inicial automática delegando al motor
function initGanttStateAuto(tasks, totalWeeks) {
    const engine = getGanttEngine();
    ganttState = engine.initGanttStateAuto();
}

// Calcular fecha de una semana relativa delegando al motor
function weekToDate(weekNum) {
    return getGanttEngine().weekToDate(weekNum);
}

function formatDate(d) {
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function focusGanttToday() {
    const rightCol = document.querySelector('#ganttContainer .gantt-right-col');
    const todayLine = document.getElementById('ganttTodayLine');
    if (rightCol && todayLine) {
        const offsetLeft = todayLine.offsetLeft;
        const width = rightCol.clientWidth;
        rightCol.scrollLeft = offsetLeft - (width / 2);
    }
}

// Generar cabecera del timeline (meses + semanas)
function buildGanttHeader(totalWeeks) {
    const monthRow = document.createElement('div');
    monthRow.className = 'gantt-header-months';
    const weekRow = document.createElement('div');
    weekRow.className = 'gantt-header-weeks';

    if (ganttViewMode === 'days') {
        // Modo DÍAS: Fila 1 = Semanas, Fila 2 = Días del mes
        let lastWeekNum = null;
        let weekSpan = 0;
        let weekCells = [];
        const GANTT_PRE_DAYS = GANTT_PRE_WEEKS * 7;
        const totalDays = totalWeeks * 7;

        for (let d = -GANTT_PRE_DAYS + 1; d <= totalDays; d++) {
            const date = new Date(ganttStartDate);
            date.setDate(date.getDate() + (d - 1));
            const wNum = Math.ceil((d + GANTT_PRE_DAYS) / 7);

            const dCell = document.createElement('div');
            dCell.className = 'gantt-week-cell';
            dCell.style.width = GANTT_COL_PX + 'px';
            dCell.textContent = date.getDate();
            dCell.title = formatDate(date);
            weekRow.appendChild(dCell);

            if (wNum !== lastWeekNum) {
                if (lastWeekNum !== null) {
                    const mCell = document.createElement('div');
                    mCell.className = 'gantt-month-cell';
                    mCell.textContent = 'Semana ' + lastWeekNum;
                    mCell.style.width = (weekSpan * GANTT_COL_PX) + 'px';
                    weekCells.push(mCell);
                }
                lastWeekNum = wNum;
                weekSpan = 1;
            } else {
                weekSpan++;
            }
        }
        if (lastWeekNum) {
            const mCell = document.createElement('div');
            mCell.className = 'gantt-month-cell';
            mCell.textContent = 'Semana ' + lastWeekNum;
            mCell.style.width = (weekSpan * GANTT_COL_PX) + 'px';
            weekCells.push(mCell);
        }
        weekCells.forEach(c => monthRow.appendChild(c));

    } else if (ganttViewMode === 'months') {
        // Modo MESES: Fila 1 = Años, Fila 2 = Nombres de mes
        const GANTT_PRE_MONTHS = Math.ceil(GANTT_PRE_WEEKS / 4);
        const totalMonths = Math.ceil(totalWeeks / 4);
        let lastYear = null;
        let yearSpan = 0;
        let yearCells = [];

        for (let m = -GANTT_PRE_MONTHS + 1; m <= totalMonths; m++) {
            const date = new Date(ganttStartDate);
            date.setMonth(date.getMonth() + (m - 1));
            const year = date.getFullYear();

            const mCell = document.createElement('div');
            mCell.className = 'gantt-week-cell';
            mCell.style.width = GANTT_COL_PX + 'px';
            mCell.textContent = date.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');
            mCell.title = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
            weekRow.appendChild(mCell);

            if (year !== lastYear) {
                if (lastYear !== null) {
                    const yCell = document.createElement('div');
                    yCell.className = 'gantt-month-cell';
                    yCell.textContent = lastYear;
                    yCell.style.width = (yearSpan * GANTT_COL_PX) + 'px';
                    yearCells.push(yCell);
                }
                lastYear = year;
                yearSpan = 1;
            } else {
                yearSpan++;
            }
        }
        if (lastYear) {
            const yCell = document.createElement('div');
            yCell.className = 'gantt-month-cell';
            yCell.textContent = lastYear;
            yCell.style.width = (yearSpan * GANTT_COL_PX) + 'px';
            yearCells.push(yCell);
        }
        yearCells.forEach(c => monthRow.appendChild(c));

    } else {
        // Modo SEMANAS (Predeterminado)
        let lastMonth = null;
        let monthSpan = 0;
        let monthCells = [];

        for (let w = -GANTT_PRE_WEEKS + 1; w <= totalWeeks; w++) {
            const date = weekToDate(w);
            const month = date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });

            const wCell = document.createElement('div');
            wCell.className = 'gantt-week-cell';
            wCell.style.width = GANTT_COL_PX + 'px';
            wCell.textContent = 'S' + w;
            wCell.title = formatDate(date);
            weekRow.appendChild(wCell);

            if (month !== lastMonth) {
                if (lastMonth !== null) {
                    const mCell = document.createElement('div');
                    mCell.className = 'gantt-month-cell';
                    mCell.textContent = lastMonth;
                    mCell.style.width = (monthSpan * GANTT_COL_PX) + 'px';
                    monthCells.push(mCell);
                }
                lastMonth = month;
                monthSpan = 1;
            } else {
                monthSpan++;
            }
        }
        if (lastMonth) {
            const mCell = document.createElement('div');
            mCell.className = 'gantt-month-cell';
            mCell.textContent = lastMonth;
            mCell.style.width = (monthSpan * GANTT_COL_PX) + 'px';
            monthCells.push(mCell);
        }
        monthCells.forEach(c => monthRow.appendChild(c));
    }

    return { monthRow, weekRow };
}

// Renderizar el modal completo del Gantt
function renderPlanningModal() {
    if (!parsedData) { alert('Carga primero un presupuesto BC3.'); return; }

    ganttTasks = getGanttTasks();
    const loaded = ganttLoad();
    if (!loaded || Object.keys(ganttState).length === 0) {
        ganttState = {};
        initGanttStateAuto(ganttTasks, ganttTotalWeeks);
        ganttSave();
    } else {
        recalculateParentTasks();
        recalculateParentProgress();
    }

    // Sincronizar el input de fecha con la fecha real cargada
    const ganttStartDateInput = document.getElementById('ganttStartDate');
    if (ganttStartDateInput) {
        const year = ganttStartDate.getFullYear();
        const month = String(ganttStartDate.getMonth() + 1).padStart(2, '0');
        const day = String(ganttStartDate.getDate()).padStart(2, '0');
        ganttStartDateInput.value = `${year}-${month}-${day}`;
    }

    // Sincronizar las semanas con el input
    const ganttWeeksInput = document.getElementById('ganttWeeks');
    if (ganttWeeksInput) {
        ganttWeeksInput.value = ganttTotalWeeks;
    }

    const modal = document.getElementById('planningModal');
    if (!modal) return;
    modal.style.display = 'flex';

    const helpCard = document.getElementById('ganttHelpCard');
    if (helpCard) {
        helpCard.style.display = 'flex';
    }

    rebuildGanttDOM();
    syncHeaderToggleBtn();
    setTimeout(focusGanttToday, 100);
}

// Recalcular dinámicamente las fechas de los capítulos (padres) delegando al motor
function recalculateParentTasks() {
    const engine = getGanttEngine();
    engine.recalculateParentTasks();
    ganttState = engine.state;
}

// Calcular el camino crítico delegando al motor
function getCriticalPath() {
    return getGanttEngine().getCriticalPath();
}

// Recalcular dinámicamente el progreso de los capítulos delegando al motor
function recalculateParentProgress() {
    const engine = getGanttEngine();
    engine.recalculateParentProgress();
    ganttState = engine.state;
}

// Aplicar progreso de forma recursiva delegando al motor
function applyProgressToDescendants(pId, prog) {
    const engine = getGanttEngine();
    engine.applyProgressToDescendants(pId, prog);
    ganttState = engine.state;
}

function rebuildGanttDOM() {
    const container = document.getElementById('ganttContainer');
    if (!container) return;

    // Guardar la semana en el centro del scroll horizontal antes de vaciar el contenedor
    const oldLeftCol = container.querySelector('.gantt-left-col');
    const oldRightCol = container.querySelector('.gantt-right-col');
    let keepWeek = null;
    let keepScrollTop = 0;

    if (oldRightCol) {
        const scrollCenter = oldRightCol.scrollLeft + oldRightCol.clientWidth / 2;
        keepWeek = scrollCenter / ganttPrevColPx;
    }
    if (oldLeftCol) {
        keepScrollTop = oldLeftCol.scrollTop;
    }

    container.innerHTML = '';

    const totalWeeks = ganttTotalWeeks;

    // 1. Recalcular las fechas y avances automáticos de los capítulos
    recalculateParentTasks();
    recalculateParentProgress();

    // 2. Obtener la ruta crítica actual (solo capítulos)
    const criticalPathSet = getCriticalPath();

    // 3. Rellenar el panel resumen superior (KPIs)
    const summaryBar = document.getElementById('ganttSummaryBar');
    if (summaryBar) {
        // Los capítulos reales son depth=2 (depth=1 es el nodo raíz único del proyecto)
        let chapters = ganttTasks.filter(t => t.depth === 2);
        if (chapters.length === 0) chapters = ganttTasks.filter(t => t.depth === 1);
        const totalChapters = chapters.length;

        let totalPrice = 0;
        let executedPrice = 0;
        chapters.forEach(c => {
            const st = ganttState[c.id];
            const price = c.price || 0;
            const prog = st ? (st.progress || 0) : 0;
            totalPrice += price;
            executedPrice += price * (prog / 100);
        });

        const globalProg = totalPrice > 0 ? ((executedPrice / totalPrice) * 100).toFixed(1) : '0.0';
        const totalDays = totalWeeks * 7;

        const executedCertified = calculateTotalCertifiedAmount();
        const remainingAmount = Math.max(0, totalPrice - executedCertified);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startD = new Date(ganttStartDate);
        startD.setHours(0, 0, 0, 0);
        const endD = new Date(startD);
        endD.setDate(startD.getDate() + totalDays);

        let daysLeft = 0;
        if (today < startD) {
            daysLeft = totalDays;
        } else if (today > endD) {
            daysLeft = 0;
        } else {
            const diffTime = endD - today;
            daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        let mediaDay = 0;
        let mediaWeek = 0;
        let mediaMonth = 0;
        if (daysLeft > 0) {
            mediaDay = remainingAmount / daysLeft;
            mediaWeek = mediaDay * 7;
            mediaMonth = mediaDay * 30.417;
        }

        const activeTodayTasks = ganttTasks.filter(t => {
            if (t.hasKids) return false; // solo hojas
            const st = ganttState[t.id];
            if (!st) return false;
            const taskStart = weekToDate(st.startWeek);
            const taskEnd = weekToDate(st.startWeek + st.durationWeeks);
            taskStart.setHours(0,0,0,0);
            taskEnd.setHours(0,0,0,0);
            return today >= taskStart && today <= taskEnd && (st.progress || 0) < 100;
        });

        const activeTodayCount = activeTodayTasks.length;

        const todayTasksRowsHTML = activeTodayCount > 0
            ? activeTodayTasks.map((t, idx) => {
                const st = ganttState[t.id];
                const prog = st ? (st.progress || 0) : 0;
                const price = (t.price || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                const taskEndD = weekToDate(st.startWeek + st.durationWeeks);
                taskEndD.setHours(0,0,0,0);
                const dLeft = Math.ceil((taskEndD - today) / (1000*60*60*24));
                const urgColor = dLeft < 0 ? '#ef4444' : dLeft <= 7 ? '#f97316' : '#10b981';
                const urgBg   = dLeft < 0 ? 'rgba(239,68,68,0.08)' : dLeft <= 7 ? 'rgba(249,115,22,0.08)' : 'rgba(16,185,129,0.06)';
                const rowBg = idx % 2 === 0 ? 'var(--card-bg,#fff)' : 'rgba(0,0,0,0.03)';
                const daysLabel = dLeft >= 0 ? dLeft + ' d.' : Math.abs(dLeft) + ' d. atraso';
                const progBar = `<div style="height:4px;border-radius:2px;background:var(--border-color,#e2e8f0);margin-top:3px;overflow:hidden;">
                    <div style="height:100%;width:${prog}%;background:${urgColor};border-radius:2px;transition:width 0.3s;"></div>
                </div>`;
                return `<div style="display:grid;grid-template-columns:1fr 70px 90px;align-items:center;gap:8px;padding:6px 10px;background:${rowBg};border-left:3px solid ${urgColor};border-radius:4px;">
                    <div style="min-width:0;">
                        <div style="font-size:0.72rem;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${t.summary}">${t.summary}</div>
                        ${progBar}
                    </div>
                    <div style="text-align:center;font-size:0.68rem;padding:2px 4px;border-radius:3px;background:${urgBg};">
                        <div style="color:var(--text-secondary);font-size:0.6rem;">Vence</div>
                        <strong style="color:${urgColor};">${daysLabel}</strong>
                    </div>
                    <div style="text-align:right;font-size:0.68rem;">
                        <div style="color:var(--text-secondary);font-size:0.6rem;">Progreso / Importe</div>
                        <strong style="color:var(--text-primary);">${prog}%</strong>
                        <span style="color:var(--text-secondary);margin-left:2px;">${price} €</span>
                    </div>
                </div>`;
            }).join('')
            : `<div style="padding:8px;color:var(--text-secondary);font-style:italic;font-size:0.75rem;text-align:center;">Ninguna tarea activa para hoy ✅</div>`;

        const todayBadgeColor = activeTodayCount === 0 ? '#10b981' : activeTodayCount <= 3 ? '#f97316' : '#ef4444';

        const isMobile = window.innerWidth <= 1024;
        summaryBar.innerHTML = `
            <details class="gantt-summary-details" ${isMobile ? '' : 'open'} style="width: 100%;">
                <summary class="gantt-summary-summary" style="cursor: pointer; padding: 4px; font-weight: 600; font-size: 0.8rem; color: var(--accent); text-align: center; list-style: none; outline: none; user-select: none;">
                    Resumen de Plazos y Costes
                </summary>
                <div class="gantt-summary-content" style="display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 10px; justify-content: space-between; width: 100%;">
                    <div class="gantt-kpi-group">
                        <h4>⏱️ Cronograma y Plazos</h4>
                        <div class="gantt-kpi-row">
                            <div class="gantt-sub-kpi"><span>Plazo Total:</span> <strong>${totalWeeks} sem. (${totalDays} d.)</strong></div>
                            <div class="gantt-sub-kpi"><span>Días Restantes:</span> <strong style="color: ${daysLeft > 0 ? '#eab308' : '#10b981'};">${daysLeft} d.</strong></div>
                            <div class="gantt-sub-kpi"><span>Avance Real:</span> <strong style="color: #10b981;">${globalProg}%</strong></div>
                        </div>
                    </div>
                    <div class="gantt-kpi-group">
                        <h4>💰 Estado Económico (PEM)</h4>
                        <div class="gantt-kpi-row">
                            <div class="gantt-sub-kpi"><span>Presupuesto Total:</span> <strong>${totalPrice.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong></div>
                            <div class="gantt-sub-kpi"><span>Certificado:</span> <strong style="color: #10b981;">${executedCertified.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong></div>
                            <div class="gantt-sub-kpi"><span>Restante:</span> <strong style="color: #3b82f6;">${remainingAmount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong></div>
                        </div>
                    </div>
                    <div class="gantt-kpi-group">
                        <h4>📊 Media de Ejecución Requerida</h4>
                        <div class="gantt-kpi-row">
                            <div class="gantt-sub-kpi"><span>Por Día:</span> <strong>${mediaDay.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong></div>
                            <div class="gantt-sub-kpi"><span>Por Semana:</span> <strong>${mediaWeek.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong></div>
                            <div class="gantt-sub-kpi"><span>Por Mes:</span> <strong>${mediaMonth.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong></div>
                        </div>
                    </div>
                    <div class="gantt-kpi-group" style="min-width: 260px; flex: 2 1 260px;">
                        <details style="width:100%;">
                            <summary style="list-style:none;outline:none;cursor:pointer;display:flex;align-items:center;gap:8px;user-select:none;padding:2px 0;">
                                <h4 style="margin:0;display:inline-flex;align-items:center;gap:6px;">
                                    📅 Tareas Activas Hoy
                                    <span style="display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 5px;border-radius:10px;background:${todayBadgeColor};color:white;font-size:0.65rem;font-weight:700;">${activeTodayCount}</span>
                                </h4>
                            </summary>
                            <div style="margin-top:6px;display:flex;flex-direction:column;gap:4px;max-height:min(40vh,320px);overflow-y:auto;overflow-x:hidden;padding-right:2px;">
                                ${todayTasksRowsHTML}
                            </div>
                        </details>
                    </div>
                </div>
            </details>
        `;
    }

    // ---- Cabecera grid ----
    const tableWrap = document.createElement('div');
    tableWrap.className = 'gantt-table-wrap';
    tableWrap.style.setProperty('--left-col-width', ganttLeftColWidth + 'px');
    if (localStorage.getItem('gantt_left_collapsed') === 'true') {
        tableWrap.classList.add('gantt-left-collapsed');
    }

    // Columna izquierda: nombres de tarea (ancho redimensionable)
    const leftCol = document.createElement('div');
    leftCol.className = 'gantt-left-col';
    leftCol.style.width = ganttLeftColWidth + 'px';
    leftCol.style.minWidth = ganttLeftColWidth + 'px';

    // Cabecera estructurada de la columna izquierda (Tarea, Plazo Restante, % Ejecutado)
    const leftHeader = document.createElement('div');
    leftHeader.className = 'gantt-left-header';

    const hName = document.createElement('span');
    hName.className = 'gh-col-name';
    hName.textContent = 'Tarea / Capítulo';

    const hDays = document.createElement('span');
    hDays.className = 'gh-col-days';
    hDays.textContent = 'Restante';

    const hProgress = document.createElement('span');
    hProgress.className = 'gh-col-progress';
    hProgress.textContent = '% Ejec.';

    leftHeader.appendChild(hName);
    leftHeader.appendChild(hDays);
    leftHeader.appendChild(hProgress);
    leftCol.appendChild(leftHeader);

    // Handle de resize en el borde derecho de la columna
    const colResizeHandle = document.createElement('div');
    colResizeHandle.className = 'gantt-col-resize-handle';
    colResizeHandle.title = 'Arrastrar para cambiar el ancho de la columna';
    colResizeHandle.addEventListener('mousedown', e => {
        e.preventDefault();
        ganttColDrag = { startX: e.clientX, startWidth: ganttLeftColWidth };
        document.addEventListener('mousemove', doGanttColResize);
        document.addEventListener('mouseup', stopGanttColResize);
    });
    leftCol.appendChild(colResizeHandle);

    // Columna derecha: timeline
    const rightCol = document.createElement('div');
    rightCol.className = 'gantt-right-col';

    const { monthRow, weekRow } = buildGanttHeader(totalWeeks);
    const headerWrap = document.createElement('div');
    headerWrap.className = 'gantt-header-wrap';
    headerWrap.appendChild(monthRow);
    headerWrap.appendChild(weekRow);
    rightCol.appendChild(headerWrap);

    // Filas de tareas
    const bodyWrap = document.createElement('div');
    bodyWrap.className = 'gantt-body';

    // Dibujar la Línea de Hoy (vertical) basada en el HOY real del sistema
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Normalizar ganttStartDate a medianoche local para evitar desfases de zona horaria
    const ganttStartNorm = new Date(ganttStartDate);
    ganttStartNorm.setHours(0, 0, 0, 0);

    const diffMs = today.getTime() - ganttStartNorm.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    const diffWeeks = diffDays / 7;

    if (diffWeeks >= -GANTT_PRE_WEEKS && diffWeeks <= totalWeeks + 0.5) {
        const todayLine = document.createElement('div');
        todayLine.className = 'gantt-today-line';
        todayLine.id = 'ganttTodayLine';

        let todayLeft = 0;
        if (ganttViewMode === 'days') {
            todayLeft = (diffDays + GANTT_PRE_WEEKS * 7) * GANTT_COL_PX;
        } else if (ganttViewMode === 'months') {
            todayLeft = ((diffWeeks + GANTT_PRE_WEEKS) / 4) * GANTT_COL_PX;
        } else { // weeks (default)
            todayLeft = (diffWeeks + GANTT_PRE_WEEKS) * GANTT_COL_PX;
        }
        todayLine.style.left = todayLeft + 'px';

        const todayLabel = document.createElement('div');
        todayLabel.className = 'gantt-today-line-label';
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        todayLabel.textContent = `${dd}/${mm}`;
        todayLine.appendChild(todayLabel);

        bodyWrap.appendChild(todayLine);
    }

    const renderedCriticalChapters = [];

    ganttTasks.forEach(task => {
        const st = ganttState[task.id];
        if (!st) return;

        // Verificar si el padre está colapsado
        if (task.parentId && ganttState[task.parentId] && ganttState[task.parentId].collapsed) {
            return;
        }

        if (task.depth === 1 && criticalPathSet.has(task.id)) {
            renderedCriticalChapters.push({
                id: task.id,
                startWeek: st.startWeek
            });
        }

        // Fila nombre estructurada
        const nameRow = document.createElement('div');
        nameRow.className = 'gantt-name-row gantt-depth-' + task.depth;
        if (task.hasKids) {
            nameRow.classList.add('gantt-name-row-parent');
        }
        nameRow.dataset.taskId = task.id;

        // 1. Celda Nombre (con sangría y toggle)
        const cellName = document.createElement('div');
        cellName.className = 'gantt-cell-name';

        if (task.hasKids) {
            const toggle = document.createElement('span');
            toggle.className = 'gantt-toggle';
            toggle.textContent = st.collapsed ? '▶' : '▼';
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                ganttState[task.id].collapsed = !ganttState[task.id].collapsed;
                ganttSave();
                rebuildGanttDOM();
            });
            cellName.appendChild(toggle);
        } else {
            const spacer = document.createElement('span');
            spacer.className = 'gantt-toggle-spacer';
            cellName.appendChild(spacer);
        }

        const nameSpan = document.createElement('span');
        nameSpan.className = 'gantt-task-name';
        nameSpan.title = task.summary + ' — ' + task.price.toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' €';
        nameSpan.textContent = task.summary;

        // Agregar fueguito si es crítico
        if (criticalPathSet.has(task.id)) {
            const fireIcon = document.createElement('span');
            fireIcon.className = 'critical-badge-icon';
            fireIcon.textContent = '🔥 ';
            fireIcon.title = 'Ruta crítica';
            nameSpan.prepend(fireIcon);
        }

        cellName.appendChild(nameSpan);

        // Subtexto con Restante y % Ejecutado para móvil
        const subtextSpan = document.createElement('span');
        subtextSpan.className = 'gantt-task-subtext';

        let daysStr = '';
        const progressVal = st.progress || 0;
        if (progressVal === 100) {
            daysStr = 'Listo';
        } else {
            const endD = weekToDate(st.startWeek + st.durationWeeks);
            endD.setHours(0, 0, 0, 0);
            const diffMs = endD - today;
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            daysStr = diffDays < 0 ? `-${Math.abs(diffDays)} d` : `${diffDays} d`;
        }

        subtextSpan.innerHTML = `Rest: ${daysStr} | <span class="subtext-prog-val">${progressVal}%</span>`;
        cellName.appendChild(subtextSpan);

        // Abrir detalles de la tarea al hacer clic o al pulsar de forma prolongada
        cellName.addEventListener('click', (e) => {
            // Ignorar el click si es sobre el icono de colapsar/expandir capítulo (+/-)
            if (e.target.classList.contains('gantt-toggle-icon')) return;
            showGanttTaskPopup(task, st);
        });
        setupGanttLongPress(cellName, () => {
            showGanttTaskPopup(task, st);
        });

        nameRow.appendChild(cellName);

        // 2. Celda Días Restantes (desde Hoy hasta fin de tarea)
        const cellDays = document.createElement('div');
        cellDays.className = 'gantt-cell-days';

        if (progressVal === 100) {
            cellDays.textContent = 'Listo';
            cellDays.className = 'gantt-cell-days gantt-days-ready';
        } else {
            const endD = weekToDate(st.startWeek + st.durationWeeks);
            endD.setHours(0, 0, 0, 0);

            const diffMs = endD - today;
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

            if (diffDays < 0) {
                cellDays.textContent = `-${Math.abs(diffDays)} d`;
                cellDays.className = 'gantt-cell-days gantt-days-delayed';
                cellDays.title = `Retraso de ${Math.abs(diffDays)} días sobre el plazo previsto`;
            } else {
                cellDays.textContent = `${diffDays} d`;
                cellDays.className = 'gantt-cell-days gantt-days-normal';
                cellDays.title = `Faltan ${diffDays} días para finalizar el plazo`;
            }
        }
        nameRow.appendChild(cellDays);

        // 3. Celda % Ejecutado con botones + y -
        const cellProgress = document.createElement('div');
        cellProgress.className = 'gantt-cell-progress';

        const btnDec = document.createElement('button');
        btnDec.type = 'button';
        btnDec.className = 'gantt-prog-btn';
        btnDec.textContent = '-';
        btnDec.title = 'Restar 10% de avance';
        btnDec.addEventListener('click', (e) => {
            e.stopPropagation();
            const curr = st.progress || 0;
            const targetProg = Math.max(0, curr - 10);
            st.progress = targetProg;
            if (task.hasKids) {
                applyProgressToDescendants(task.id, targetProg);
            }
            recalculateParentProgress();
            ganttSave();
            rebuildGanttDOM();
        });

        const labelProg = document.createElement('span');
        labelProg.className = 'gantt-prog-val';
        labelProg.textContent = progressVal + '%';

        const btnInc = document.createElement('button');
        btnInc.type = 'button';
        btnInc.className = 'gantt-prog-btn';
        btnInc.textContent = '+';
        btnInc.title = 'Sumar 10% de avance';
        btnInc.addEventListener('click', (e) => {
            e.stopPropagation();
            const curr = st.progress || 0;
            const targetProg = Math.min(100, curr + 10);
            st.progress = targetProg;
            if (task.hasKids) {
                applyProgressToDescendants(task.id, targetProg);
            }
            recalculateParentProgress();
            ganttSave();
            rebuildGanttDOM();
        });

        cellProgress.appendChild(btnDec);
        cellProgress.appendChild(labelProg);
        cellProgress.appendChild(btnInc);
        nameRow.appendChild(cellProgress);

        leftCol.appendChild(nameRow);

        // Fila barra en timeline
        const barRow = document.createElement('div');
        barRow.className = 'gantt-bar-row';
        if (task.hasKids) {
            barRow.classList.add('gantt-bar-row-parent');
        }

        let colsCount = totalWeeks + GANTT_PRE_WEEKS;
        if (ganttViewMode === 'days') colsCount = (totalWeeks + GANTT_PRE_WEEKS) * 7;
        else if (ganttViewMode === 'months') colsCount = Math.ceil((totalWeeks + GANTT_PRE_WEEKS) / 4);

        barRow.style.width = (colsCount * GANTT_COL_PX) + 'px';
        barRow.dataset.taskId = task.id;

        // Grid de fondo según la escala
        for (let w = 1; w <= colsCount; w++) {
            const cell = document.createElement('div');
            cell.className = 'gantt-bg-cell' + (w % 4 === 0 ? ' gantt-bg-month-end' : '');
            cell.style.width = GANTT_COL_PX + 'px';
            barRow.appendChild(cell);
        }

        // Barra de la tarea
        const bar = document.createElement('div');
        bar.className = 'gantt-bar gantt-bar-depth-' + task.depth;
        if (criticalPathSet.has(task.id)) {
            bar.classList.add('gantt-bar-critical');
        }
        bar.dataset.taskId = task.id;
        positionBar(bar, st.startWeek, st.durationWeeks, totalWeeks);

        // Capa interna de progreso acumulado
        if (progressVal > 0) {
            const progBar = document.createElement('div');
            progBar.className = 'gantt-bar-progress';
            progBar.style.width = progressVal + '%';
            bar.appendChild(progBar);
        }

        const barLabel = document.createElement('span');
        barLabel.className = 'gantt-bar-label';
        barLabel.style.position = 'relative';
        barLabel.style.zIndex = '2';
        barLabel.textContent = task.summary.length > 18 ? task.summary.slice(0, 16) + '…' : task.summary;

        if (task.hasKids) {
            // Estilo barra de capítulo (Summary Bar) - deshabilitar drag y redimensionamiento
            bar.classList.add('gantt-bar-parent');
            bar.appendChild(barLabel);
        } else {
            // Partida o Subcapítulo editable: inyectar manejadores de arrastre
            const resizeL = document.createElement('div');
            resizeL.className = 'gantt-resize gantt-resize-l';
            resizeL.style.position = 'relative';
            resizeL.style.zIndex = '2';
            resizeL.addEventListener('mousedown', e => startGanttDrag(e, task.id, 'left'));
            resizeL.addEventListener('touchstart', e => startGanttDrag(e, task.id, 'left'), { passive: false });

            const resizeR = document.createElement('div');
            resizeR.className = 'gantt-resize gantt-resize-r';
            resizeR.style.position = 'relative';
            resizeR.style.zIndex = '2';
            resizeR.addEventListener('mousedown', e => startGanttDrag(e, task.id, 'right'));
            resizeR.addEventListener('touchstart', e => startGanttDrag(e, task.id, 'right'), { passive: false });

            bar.appendChild(resizeL);
            bar.appendChild(barLabel);
            bar.appendChild(resizeR);
            bar.addEventListener('mousedown', e => {
                if (ganttLinkMode) return; // link mode: no drag, let click handle it
                if (e.target === resizeL || e.target === resizeR) return;
                startGanttDrag(e, task.id, 'move');
            });
            bar.addEventListener('touchstart', e => {
                if (ganttLinkMode) return; // link mode: no drag, let click handle it
                if (e.target === resizeL || e.target === resizeR) return;
                startGanttDrag(e, task.id, 'move');
            }, { passive: false });
            // Click listener específico para modo enlace en barras hoja
            bar.addEventListener('click', e => {
                if (!ganttLinkMode) return;
                e.stopPropagation();
                handleLinkModeClick(task.id, bar);
            });
        }

        // Abrir detalles de la tarea mediante presión prolongada en la barra del Gantt
        setupGanttLongPress(bar, () => {
            if (ganttLinkMode) return;
            showGanttTaskPopup(task, st);
        });

        barRow.appendChild(bar);
        bodyWrap.appendChild(barRow);
    });

    // 4. Dibujar las líneas SVG de conexión entre capítulos críticos consecutivos
    if (renderedCriticalChapters.length > 1) {
        // Ordenar secuencialmente por semana de inicio
        renderedCriticalChapters.sort((a, b) => a.startWeek - b.startWeek);

        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("class", "gantt-svg-overlay");

        let colsCount = totalWeeks + GANTT_PRE_WEEKS;
        if (ganttViewMode === 'days') colsCount = (totalWeeks + GANTT_PRE_WEEKS) * 7;
        else if (ganttViewMode === 'months') colsCount = Math.ceil((totalWeeks + GANTT_PRE_WEEKS) / 4);
        svg.style.width = (colsCount * GANTT_COL_PX) + 'px';

        for (let i = 0; i < renderedCriticalChapters.length - 1; i++) {
            const A = renderedCriticalChapters[i];
            const B = renderedCriticalChapters[i + 1];

            const rowA = bodyWrap.querySelector(`.gantt-bar-row[data-task-id="${A.id}"]`);
            const barA = rowA ? rowA.querySelector('.gantt-bar') : null;
            const rowB = bodyWrap.querySelector(`.gantt-bar-row[data-task-id="${B.id}"]`);
            const barB = rowB ? rowB.querySelector('.gantt-bar') : null;
            
            if (!rowA || !barA || !rowB || !barB) continue;

            const xA = barA.offsetLeft + barA.offsetWidth;
            const yA = rowA.offsetTop + rowA.offsetHeight / 2;
            const xB = barB.offsetLeft;
            const yB = rowB.offsetTop + rowB.offsetHeight / 2;

            const xMid = xA + (xB - xA) / 2;

            const path = document.createElementNS(svgNS, "path");
            // Trazado escalonado: horizontal, vertical, horizontal
            const dAttr = `M ${xA} ${yA} L ${xMid} ${yA} L ${xMid} ${yB} L ${xB} ${yB}`;
            path.setAttribute("d", dAttr);
            path.setAttribute("stroke", "#f97316"); // Naranja de ruta crítica
            path.setAttribute("stroke-width", "2");
            path.setAttribute("fill", "none");
            path.setAttribute("stroke-dasharray", "4,4"); // Estilo línea discontinua

            svg.appendChild(path);
        }
        bodyWrap.appendChild(svg);
    }

    rightCol.appendChild(bodyWrap);
    tableWrap.appendChild(leftCol);
    tableWrap.appendChild(rightCol);

    // Botón flotante único para colapsar/expandir columna izquierda
    const toggleColBtn = document.createElement('button');
    toggleColBtn.type = 'button';
    toggleColBtn.className = 'gantt-toggle-cols-floating-btn';
    
    // Configurar estado inicial
    const isCollapsed = tableWrap.classList.contains('gantt-left-collapsed');
    toggleColBtn.innerHTML = isCollapsed ? '▶' : '◀';
    toggleColBtn.title = isCollapsed ? 'Mostrar nombres de tareas' : 'Ocultar nombres de tareas';
    
    toggleColBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const nowCollapsed = tableWrap.classList.toggle('gantt-left-collapsed');
        localStorage.setItem('gantt_left_collapsed', nowCollapsed ? 'true' : 'false');
        toggleColBtn.innerHTML = nowCollapsed ? '▶' : '◀';
        toggleColBtn.title = nowCollapsed ? 'Mostrar nombres de tareas' : 'Ocultar nombres de tareas';
    });
    tableWrap.appendChild(toggleColBtn);

    container.appendChild(tableWrap);

    // Restaurar los scrolls guardados antes de reconstruir
    setTimeout(() => {
        if (keepWeek !== null) {
            rightCol.scrollLeft = (keepWeek * GANTT_COL_PX) - (rightCol.clientWidth / 2);
        }
        if (keepScrollTop > 0) {
            leftCol.scrollTop = keepScrollTop;
            rightCol.scrollTop = keepScrollTop;
        }
    }, 0);

    // Sincronizar scroll vertical bidireccional entre columna de tareas y cronograma
    let isSyncingLeft = false;
    let isSyncingRight = false;

    leftCol.addEventListener('scroll', () => {
        if (!isSyncingLeft) {
            isSyncingRight = true;
            rightCol.scrollTop = leftCol.scrollTop;
        }
        isSyncingLeft = false;
    });

    rightCol.addEventListener('scroll', () => {
        if (!isSyncingRight) {
            isSyncingLeft = true;
            leftCol.scrollTop = rightCol.scrollTop;
        }
        isSyncingRight = false;
    });

    // Paneo y arrastre libre del cronograma con el ratón (Drag-to-pan)
    initGanttTimelinePan(rightCol, leftCol);

    // Actualizar el zoom previo para la siguiente reconstrucción
    ganttPrevColPx = GANTT_COL_PX;
}

// ---- Arrastrar cronograma con el ratón para desplazarse libremente (Pan) ----
function initGanttTimelinePan(rightCol, leftCol) {
    let isPanning = false;
    let startX = 0;
    let startY = 0;
    let scrollLeftStart = 0;
    let scrollTopStart = 0;

    rightCol.addEventListener('mousedown', (e) => {
        // Ignorar si se pulsa sobre una barra de tarea, resize handle, toggle, botón o input
        if (e.target.closest('.gantt-bar, .gantt-col-resize-handle, .gantt-toggle, button, input, select')) return;
        if (e.button !== 0) return; // Solo botón izquierdo del ratón

        isPanning = true;
        startX = e.clientX;
        startY = e.clientY;
        scrollLeftStart = rightCol.scrollLeft;
        scrollTopStart = rightCol.scrollTop;
        rightCol.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
    });

    window.addEventListener('mousemove', (e) => {
        if (!isPanning) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        rightCol.scrollLeft = scrollLeftStart - dx;
        rightCol.scrollTop = scrollTopStart - dy;
        if (leftCol) leftCol.scrollTop = rightCol.scrollTop;
    });

    window.addEventListener('mouseup', () => {
        if (isPanning) {
            isPanning = false;
            rightCol.style.cursor = '';
            document.body.style.userSelect = '';
        }
    });
}

// Calcular coordenadas izquierda y ancho de barra según el zoom y la escala activa delegando al motor
function getGanttBarCoords(st) {
    const coords = getGanttEngine().getBarCoords(st.startWeek, st.durationWeeks);
    // Restamos 2px al ancho para dejar la separación estética original
    coords.width = Math.max(GANTT_COL_PX * 0.5, coords.width - 2);
    return coords;
}


function positionBar(barEl, startWeek, durationWeeks, totalWeeks) {
    const { left, width } = getGanttBarCoords({ startWeek, durationWeeks });
    barEl.style.left = left + 'px';
    barEl.style.width = width + 'px';
}

// ---- Resize columna izquierda ----
function doGanttColResize(e) {
    if (!ganttColDrag) return;
    const newWidth = Math.max(140, Math.min(520, ganttColDrag.startWidth + (e.clientX - ganttColDrag.startX)));
    ganttLeftColWidth = newWidth;
    // Actualizar columna izquierda en vivo sin rerenderizar
    const leftColEl = document.querySelector('#ganttContainer .gantt-left-col');
    if (leftColEl) {
        leftColEl.style.width = newWidth + 'px';
        leftColEl.style.minWidth = newWidth + 'px';
    }
    const tableWrap = document.querySelector('#ganttContainer .gantt-table-wrap');
    if (tableWrap) {
        tableWrap.style.setProperty('--left-col-width', newWidth + 'px');
    }
}
function stopGanttColResize() {
    ganttColDrag = null;
    document.removeEventListener('mousemove', doGanttColResize);
    document.removeEventListener('mouseup', stopGanttColResize);
}

// ---- Drag & Drop del Gantt ----
let ganttDrag = null;

function startGanttDrag(e, taskId, mode) {
    // En modo enlace: no iniciar drag, dejar que el click se propague
    if (ganttLinkMode) return;

    const isTouch = e.type.startsWith('touch');
    const clientX = isTouch ? e.touches[0].clientX : e.clientX;

    // Prevent default scrolling on mobile when dragging bars
    if (isTouch) {
        e.preventDefault();
    }
    e.stopPropagation();
    
    const st = ganttState[taskId];
    if (!st) return;

    const taskObj = ganttTasks.find(t => t.id === taskId);
    // Las barras de capítulo (hasKids) son automáticas — no se arrastran directamente.
    // Solo se pueden arrastrar partidas hoja (sin hijos).
    if (taskObj && taskObj.hasKids) return;

    ganttDrag = {
        taskId,
        parentId: taskObj ? taskObj.parentId : null,
        mode,
        startX: clientX,
        origStart: st.startWeek,
        origDur: st.durationWeeks
    };

    if (isTouch) {
        document.addEventListener('touchmove', doGanttTouchDrag, { passive: false });
        document.addEventListener('touchend', stopGanttTouchDrag);
    } else {
        document.addEventListener('mousemove', doGanttDrag);
        document.addEventListener('mouseup', stopGanttDrag);
    }
}

function doGanttTouchDrag(e) {
    if (!ganttDrag) return;
    const touch = e.touches[0] || e.changedTouches[0];
    if (!touch) return;
    
    // Simular el evento mousemove con las coordenadas del touch
    const mockEvent = {
        clientX: touch.clientX
    };
    doGanttDrag(mockEvent);
}

function stopGanttTouchDrag() {
    stopGanttDrag();
    document.removeEventListener('touchmove', doGanttTouchDrag);
    document.removeEventListener('touchend', stopGanttTouchDrag);
}

function doGanttDrag(e) {
    if (!ganttDrag) return;
    const { taskId, mode, startX, origStart, origDur } = ganttDrag;
    const dx = e.clientX - startX;

    let weeksDelta = 0;
    if (ganttViewMode === 'days') {
        weeksDelta = Math.round(dx / GANTT_COL_PX) / 7;
    } else if (ganttViewMode === 'months') {
        weeksDelta = Math.round(dx / GANTT_COL_PX) * 4;
    } else {
        weeksDelta = Math.round(dx / GANTT_COL_PX);
    }

    const st = ganttState[taskId];
    const total = ganttTotalWeeks;

    // Sin clamping por el padre — las tareas se mueven libremente dentro del proyecto.
    // Los capítulos (padres) se recalculan automáticamente al soltar para adaptarse.
    if (mode === 'move') {
        st.startWeek = Math.max(1, Math.min(total - origDur + 1, origStart + weeksDelta));
        st.durationWeeks = origDur;
    } else if (mode === 'right') {
        st.durationWeeks = Math.max(1, Math.min(total - st.startWeek + 1, origDur + weeksDelta));
    } else if (mode === 'left') {
        const newStart = Math.max(1, Math.min(origStart + origDur - 1, origStart + weeksDelta));
        st.startWeek = newStart;
        st.durationWeeks = Math.max(1, origStart + origDur - newStart);
    }

    // Actualizar la barra de la tarea en DOM en tiempo real
    const bar = document.querySelector(`.gantt-bar[data-task-id="${taskId}"]`);
    if (bar) positionBar(bar, st.startWeek, st.durationWeeks, total);

    // Recalcular y actualizar visualmente los padres en tiempo real durante el arrastre
    recalculateParentTasks();
    const taskObj = ganttTasks.find(t => t.id === taskId);
    if (taskObj && taskObj.parentId) {
        updateParentBarsInDOM(taskObj.parentId);
    }
}

// Actualiza recursivamente las barras padre en el DOM sin rerenderizar todo
function updateParentBarsInDOM(parentId) {
    if (!parentId) return;
    const pst = ganttState[parentId];
    if (!pst) return;
    const pBar = document.querySelector(`.gantt-bar[data-task-id="${parentId}"]`);
    if (pBar) positionBar(pBar, pst.startWeek, pst.durationWeeks, ganttTotalWeeks);

    // Subir un nivel más si existe abuelo
    const parentTask = ganttTasks.find(t => t.id === parentId);
    if (parentTask && parentTask.parentId) {
        recalculateParentTasks(); // asegurar que el abuelo está actualizado
        updateParentBarsInDOM(parentTask.parentId);
    }
}

function stopGanttDrag() {
    if (!ganttDrag) return;
    recalculateParentTasks();
    recalculateParentProgress();
    ganttSave();
    ganttDrag = null;
    document.removeEventListener('mousemove', doGanttDrag);
    document.removeEventListener('mouseup', stopGanttDrag);
    rebuildGanttDOM();
}

// ---- Exportar Gantt a Excel (tabla estructurada) ----
function exportGanttToExcel() {
    if (typeof XLSX === 'undefined') { alert('Librería Excel no disponible.'); return; }
    const wb = XLSX.utils.book_new();

    const rows = [['Nivel', 'Código', 'Tarea', 'Semana Inicio', 'Fecha Inicio', 'Semana Fin', 'Fecha Fin', 'Duración (sem.)', 'Duración (días)', 'Importe (€)']];

    ganttTasks.forEach(task => {
        const st = ganttState[task.id];
        if (!st) return;
        const startDate = weekToDate(st.startWeek);
        const endDate = weekToDate(st.startWeek + st.durationWeeks);
        rows.push([
            task.depth,
            task.code,
            task.summary,
            st.startWeek,
            formatDate(startDate),
            formatDate(endDate),
            st.startWeek + st.durationWeeks - 1,
            st.durationWeeks,
            st.durationWeeks * 7,
            parseFloat(task.price.toFixed(2))
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
        { wch: 6 }, { wch: 14 }, { wch: 45 }, { wch: 14 }, { wch: 14 },
        { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 14 }
    ];
    // Cabecera en negrita
    const headerRange = XLSX.utils.decode_range(ws['!ref']);
    for (let C = headerRange.s.c; C <= headerRange.e.c; C++) {
        const cell = ws[XLSX.utils.encode_cell({ r: 0, c: C })];
        if (cell) cell.s = { font: { bold: true } };
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Planning Gantt');
    const baseName = currentFileName.replace(/\.[^/.]+$/, '');
    if (window.Capacitor && window.Capacitor.isPluginAvailable('Filesystem')) {
        const excelBase64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
        saveAndShareNativeFile(excelBase64, baseName + '_planning.xlsx');
    } else {
        XLSX.writeFile(wb, baseName + '_planning.xlsx');
    }
}

// ---- Exportar Gantt a PDF (A4 landscape, 26 sem/página) ----
function exportGanttToPdf() {
    const JsPDF = (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : window.jsPDF;
    if (!JsPDF) { alert('Librería PDF no disponible.'); return; }

    const doc = new JsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const WEEKS_PER_PAGE = 26;
    const TASK_COL_W = 65;    // mm columna tareas
    const WEEK_W = (297 - TASK_COL_W - 20) / WEEKS_PER_PAGE; // mm por semana
    const ROW_H = 7;          // mm por fila
    const HEADER_H = 14;      // mm cabecera
    const MARGIN = 10;        // mm márgenes
    const PAGE_W = 297;
    const PAGE_H = 210;

    // Filter visible tasks (excluding children of collapsed parents)
    const visibleTasks = ganttTasks.filter(task => {
        const st = ganttState[task.id];
        if (!st) return false;
        if (task.parentId && ganttState[task.parentId] && ganttState[task.parentId].collapsed) return false;
        return true;
    });

    const yStart = MARGIN + HEADER_H;
    const TASKS_PER_PAGE = Math.floor((PAGE_H - MARGIN - yStart) / ROW_H);

    const totalColPages = Math.ceil(ganttTotalWeeks / WEEKS_PER_PAGE);
    const totalRowPages = Math.ceil(visibleTasks.length / TASKS_PER_PAGE);
    const totalPages = totalColPages * totalRowPages;

    let absolutePageNum = 1;

    for (let rPage = 0; rPage < totalRowPages; rPage++) {
        for (let cPage = 0; cPage < totalColPages; cPage++) {
            if (absolutePageNum > 1) doc.addPage();

            const weekStart = cPage * WEEKS_PER_PAGE + 1;
            const weekEnd = Math.min(weekStart + WEEKS_PER_PAGE - 1, ganttTotalWeeks);

            const taskStartIdx = rPage * TASKS_PER_PAGE;
            const taskEndIdx = Math.min(taskStartIdx + TASKS_PER_PAGE, visibleTasks.length);

            // Título
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            const projectTitle = (parsedData.properties && parsedData.properties.description) || currentFileName.replace(/\.[^/.]+$/, '');
            doc.text('PLANNING: ' + projectTitle, MARGIN, MARGIN - 2);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text('Semanas ' + weekStart + '–' + weekEnd + '   |   Página ' + absolutePageNum + ' de ' + totalPages, PAGE_W - MARGIN, MARGIN - 2, { align: 'right' });

            let y = MARGIN;

            // Cabecera: columna tareas + semanas
            doc.setFillColor(80, 20, 40);
            doc.rect(MARGIN, y, TASK_COL_W, HEADER_H / 2, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.text('Tarea', MARGIN + 2, y + HEADER_H / 2 - 2);

            // Cabecera semanas
            for (let w = weekStart; w <= weekEnd; w++) {
                const x = MARGIN + TASK_COL_W + (w - weekStart) * WEEK_W;
                doc.setFillColor(80, 20, 40);
                doc.rect(x, y, WEEK_W, HEADER_H / 2, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(5.5);
                doc.text('S' + w, x + WEEK_W / 2, y + HEADER_H / 2 - 2, { align: 'center' });
            }
            // Subrow: meses
            let mX = MARGIN + TASK_COL_W;
            let mMonth = null; let mStart = mX;
            for (let w = weekStart; w <= weekEnd; w++) {
                const dt = weekToDate(w);
                const mon = dt.toLocaleDateString('es-ES', { month: 'short' });
                if (mon !== mMonth) {
                    if (mMonth) {
                        doc.setFillColor(120, 40, 60);
                        doc.rect(mStart, y + HEADER_H / 2, mX - mStart, HEADER_H / 2, 'F');
                        doc.setTextColor(255, 255, 255);
                        doc.setFontSize(5.5);
                        doc.text(mMonth, mStart + (mX - mStart) / 2, y + HEADER_H - 2, { align: 'center' });
                    }
                    mMonth = mon; mStart = mX;
                }
                mX += WEEK_W;
            }
            if (mMonth) {
                doc.setFillColor(120, 40, 60);
                doc.rect(mStart, y + HEADER_H / 2, mX - mStart, HEADER_H / 2, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(5.5);
                doc.text(mMonth, mStart + (mX - mStart) / 2, y + HEADER_H - 2, { align: 'center' });
            }

            y += HEADER_H;

            // Filas de tareas de la página actual
            doc.setFont('helvetica', 'normal');
            let rowIdx = 0;
            for (let i = taskStartIdx; i < taskEndIdx; i++) {
                const task = visibleTasks[i];
                const st = ganttState[task.id];

                const ry = y + rowIdx * ROW_H;

                // Fondo alternado
                doc.setFillColor(rowIdx % 2 === 0 ? 252 : 245, rowIdx % 2 === 0 ? 252 : 245, rowIdx % 2 === 0 ? 252 : 245);
                doc.rect(MARGIN, ry, PAGE_W - 2 * MARGIN, ROW_H, 'F');

                // Texto tarea (sangría por nivel)
                const indent = (task.depth - 1) * 3;
                doc.setFontSize(task.depth === 1 ? 6.5 : 5.5);
                doc.setFont('helvetica', task.depth === 1 ? 'bold' : 'normal');
                doc.setTextColor(30, 30, 30);
                const label = task.summary.length > 38 ? task.summary.slice(0, 36) + '…' : task.summary;
                doc.text(label, MARGIN + 2 + indent, ry + ROW_H - 2);

                // Barra
                const barStart = st.startWeek;
                const barDur = st.durationWeeks;
                const visStart = Math.max(weekStart, barStart);
                const visEnd = Math.min(weekEnd, barStart + barDur - 1);

                if (visEnd >= visStart) {
                    const bx = MARGIN + TASK_COL_W + (visStart - weekStart) * WEEK_W;
                    const bw = (visEnd - visStart + 1) * WEEK_W - 1;
                    const bh = ROW_H - 2;
                    const colors = [[128, 0, 32], [180, 60, 80], [200, 100, 110]];
                    const c = colors[Math.min(task.depth - 1, 2)];
                    doc.setFillColor(c[0], c[1], c[2]);
                    doc.roundedRect(bx, ry + 1, bw, bh, 1, 1, 'F');
                }

                // Grid vertical de semanas
                doc.setDrawColor(220, 220, 220);
                doc.setLineWidth(0.1);
                for (let w = weekStart; w <= weekEnd; w++) {
                    const wx = MARGIN + TASK_COL_W + (w - weekStart) * WEEK_W;
                    doc.line(wx, ry, wx, ry + ROW_H);
                }

                rowIdx++;
            }

            // Borde general
            doc.setDrawColor(180, 180, 180);
            doc.setLineWidth(0.3);
            doc.rect(MARGIN, MARGIN, PAGE_W - 2 * MARGIN, PAGE_H - 2 * MARGIN);

            // Pie de página
            doc.setFontSize(6);
            doc.setTextColor(150, 150, 150);
            doc.text('Generado por BC3 Viewer — ' + new Date().toLocaleDateString('es-ES'), MARGIN, PAGE_H - MARGIN + 4);

            absolutePageNum++;
        }
    }

    const baseName = currentFileName.replace(/\.[^/.]+$/, '');
    if (window.Capacitor && window.Capacitor.isPluginAvailable('Filesystem')) {
        const rawPdfUri = doc.output('datauristring');
        const base64Pdf = rawPdfUri.substring(rawPdfUri.indexOf(',') + 1);
        saveAndShareNativeFile(base64Pdf, baseName + '_planning.pdf');
    } else {
        doc.save(baseName + '_planning.pdf');
    }
}

// ---- Inicializar eventos del modal Planning ----
const planningBtn = document.getElementById('planningBtn');
const planningModal = document.getElementById('planningModal');
const closePlanningBtn = document.getElementById('closePlanningBtn');
const ganttStartDateInput = document.getElementById('ganttStartDate');
const ganttWeeksInput = document.getElementById('ganttWeeks');
const ganttResetBtn = document.getElementById('ganttResetBtn');
const exportGanttPdfBtn = document.getElementById('exportGanttPdfBtn');
const exportGanttExcelBtn = document.getElementById('exportGanttExcelBtn');

if (planningBtn) {
    planningBtn.addEventListener('click', () => {
        // Inicializar fecha y semanas antes de renderizar
        if (ganttStartDateInput && ganttStartDateInput.value) {
            ganttStartDate = new Date(ganttStartDateInput.value);
        } else if (ganttStartDateInput) {
            ganttStartDate = new Date();
            const iso = ganttStartDate.toISOString().split('T')[0];
            ganttStartDateInput.value = iso;
        }
        if (ganttWeeksInput && ganttWeeksInput.value) {
            ganttTotalWeeks = parseInt(ganttWeeksInput.value) || 26;
        }
        renderPlanningModal();
    });
}

if (closePlanningBtn && planningModal) {
    closePlanningBtn.addEventListener('click', () => {
        planningModal.style.display = 'none';
        syncHeaderToggleBtn();
    });
}

if (planningModal) {
    planningModal.addEventListener('click', e => {
        if (e.target === planningModal) {
            planningModal.style.display = 'none';
            syncHeaderToggleBtn();
        }
    });
}

const ganttHelpCard = document.getElementById('ganttHelpCard');
const ganttHelpCloseBtn = document.getElementById('ganttHelpCloseBtn');

if (ganttHelpCloseBtn && ganttHelpCard) {
    ganttHelpCloseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        ganttHelpCard.style.display = 'none';
    });
}

// ---- Implementación de Zoom con dos dedos (Pinch to Zoom) ----
function initGanttPinchZoom() {
    const container = document.getElementById('ganttContainer');
    if (!container) return;

    let initialDist = 0;
    let initialZoom = 44;
    let isPinching = false;

    container.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            isPinching = true;
            initialDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            initialZoom = GANTT_COL_PX;
        }
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
        if (isPinching && e.touches.length === 2) {
            if (e.cancelable) e.preventDefault();

            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            
            if (initialDist > 0) {
                const ratio = dist / initialDist;
                const targetZoom = Math.min(150, Math.max(20, Math.round(initialZoom * ratio)));
                
                // Limitar actualizaciones para evitar lentitud
                if (Math.abs(targetZoom - GANTT_COL_PX) >= 4) {
                    GANTT_COL_PX = targetZoom;
                    const ganttZoomInput = document.getElementById('ganttZoom');
                    if (ganttZoomInput) {
                        ganttZoomInput.value = targetZoom;
                    }
                    rebuildGanttDOM();
                }
            }
        }
    }, { passive: false });

    container.addEventListener('touchend', (e) => {
        if (e.touches.length < 2) {
            isPinching = false;
            initialDist = 0;
        }
    }, { passive: true });

    container.addEventListener('touchcancel', () => {
        isPinching = false;
        initialDist = 0;
    }, { passive: true });
}

initGanttPinchZoom();

const ganttTodayBtn = document.getElementById('ganttTodayBtn');
if (ganttTodayBtn) {
    ganttTodayBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        focusGanttToday();
    });
}

if (ganttStartDateInput) {
    ganttStartDateInput.addEventListener('change', () => {
        ganttStartDate = new Date(ganttStartDateInput.value);
        if (planningModal && planningModal.style.display !== 'none') rebuildGanttDOM();
        ganttSave();
    });
}

if (ganttWeeksInput) {
    ganttWeeksInput.addEventListener('change', () => {
        ganttTotalWeeks = Math.max(4, Math.min(156, parseInt(ganttWeeksInput.value) || 26));
        ganttWeeksInput.value = ganttTotalWeeks;
        if (planningModal && planningModal.style.display !== 'none') rebuildGanttDOM();
        ganttSave();
    });
}

// Configurar botones de escala (Días, Semanas, Meses)
const modeDaysBtn = document.getElementById('ganttModeDaysBtn');
const modeWeeksBtn = document.getElementById('ganttModeWeeksBtn');
const modeMonthsBtn = document.getElementById('ganttModeMonthsBtn');

function setGanttMode(mode, activeBtn) {
    ganttViewMode = mode;
    document.querySelectorAll('.gantt-dropdown-item-btn').forEach(btn => btn.classList.remove('active'));
    if (activeBtn) activeBtn.classList.add('active');
    if (planningModal && planningModal.style.display !== 'none') rebuildGanttDOM();
    
    const scaleDrop = document.getElementById('ganttScaleDropdown');
    if (scaleDrop) scaleDrop.classList.remove('show');
}

if (modeDaysBtn) {
    modeDaysBtn.addEventListener('click', () => setGanttMode('days', modeDaysBtn));
}
if (modeWeeksBtn) {
    modeWeeksBtn.addEventListener('click', () => setGanttMode('weeks', modeWeeksBtn));
}
if (modeMonthsBtn) {
    modeMonthsBtn.addEventListener('click', () => setGanttMode('months', modeMonthsBtn));
}

// Configurar control de Zoom (Ancho de columnas)
const ganttZoom = document.getElementById('ganttZoom');
if (ganttZoom) {
    ganttZoom.addEventListener('input', () => {
        GANTT_COL_PX = parseInt(ganttZoom.value) || 44;
        if (planningModal && planningModal.style.display !== 'none') rebuildGanttDOM();
    });
}

if (ganttResetBtn) {
    ganttResetBtn.addEventListener('click', () => {
        if (!confirm('¿Reiniciar el planning? Se perderá la distribución actual.')) return;
        ganttState = {};
        initGanttStateAuto(ganttTasks, ganttTotalWeeks);
        ganttSave();
        rebuildGanttDOM();
    });
}

if (exportGanttPdfBtn) {
    exportGanttPdfBtn.addEventListener('click', () => {
        const expDrop = document.getElementById('ganttExportDropdown');
        if (expDrop) expDrop.classList.remove('show');
        exportGanttToPdf();
    });
}
if (exportGanttExcelBtn) {
    exportGanttExcelBtn.addEventListener('click', () => {
        const expDrop = document.getElementById('ganttExportDropdown');
        if (expDrop) expDrop.classList.remove('show');
        exportGanttToExcel();
    });
}

/* ==========================================================================
   MÓDULO DE PLANIFICACIÓN FINANCIERA AVANZADA (EVM / VALOR GANADO & CURVA S)
   ========================================================================== */

const toggleGanttViewBtn = document.getElementById('toggleGanttViewBtn');
const toggleEvmViewBtn = document.getElementById('toggleEvmViewBtn');
const evmCutoffSlider = document.getElementById('evmCutoffSlider');
const evmCutoffLabel = document.getElementById('evmCutoffLabel');
const exportEvmExcelBtn = document.getElementById('exportEvmExcelBtn');

let evmCurrentCutoffWeek = 12;

function initEVMModule() {
    if (toggleGanttViewBtn) {
        toggleGanttViewBtn.addEventListener('click', () => {
            toggleGanttViewBtn.classList.add('active');
            if (toggleEvmViewBtn) toggleEvmViewBtn.classList.remove('active');
            const ganttSec = document.getElementById('ganttViewSection');
            const evmSec = document.getElementById('evmViewSection');
            const ganttCtrl = document.getElementById('ganttControlsGroup');
            if (ganttSec) ganttSec.style.display = 'flex';
            if (evmSec) evmSec.style.display = 'none';
            if (ganttCtrl) ganttCtrl.style.display = 'flex';
            rebuildGanttDOM();
        });
    }

    if (toggleEvmViewBtn) {
        toggleEvmViewBtn.addEventListener('click', () => {
            toggleEvmViewBtn.classList.add('active');
            if (toggleGanttViewBtn) toggleGanttViewBtn.classList.remove('active');
            const ganttSec = document.getElementById('ganttViewSection');
            const evmSec = document.getElementById('evmViewSection');
            const ganttHelp = document.getElementById('ganttHelpCard');
            if (ganttSec) ganttSec.style.display = 'none';
            if (evmSec) evmSec.style.display = 'block';
            if (ganttHelp) ganttHelp.style.display = 'none';
            renderEVMView();
        });
    }

    if (evmCutoffSlider) {
        evmCutoffSlider.addEventListener('input', (e) => {
            evmCurrentCutoffWeek = parseInt(e.target.value) || 1;
            if (evmCutoffLabel) evmCutoffLabel.textContent = `Semana ${evmCurrentCutoffWeek}`;
            renderEVMView();
        });
    }

    if (exportEvmExcelBtn) {
        exportEvmExcelBtn.addEventListener('click', exportEVMReportToExcel);
    }
}

function renderEVMView() {
    if (!parsedData) return;

    const tasks = (typeof getGanttTasks === 'function' ? getGanttTasks() : []) || [];
    const totalWeeks = ganttTotalWeeks || 26;

    if (evmCutoffSlider) {
        evmCutoffSlider.max = totalWeeks;
        if (evmCurrentCutoffWeek > totalWeeks) {
            evmCurrentCutoffWeek = Math.min(12, totalWeeks);
            evmCutoffSlider.value = evmCurrentCutoffWeek;
        }
        if (evmCutoffLabel) evmCutoffLabel.textContent = `Semana ${evmCurrentCutoffWeek}`;
    }

    const cutoff = evmCurrentCutoffWeek;

    const topTasks = tasks.filter(t => t.depth === 1 || (t.isChapter && !t.parentId));
    const leafTasks = tasks.filter(t => !t.isChapter || !tasks.some(child => child.parentId === t.id));
    const targetTasks = leafTasks.length > 0 ? leafTasks : topTasks;

    let bac = 0;
    tasks.forEach(t => {
        if (t.depth === 1) {
            bac += parseFloat(t.cost || t.price || t.totalPrice) || 0;
        }
    });
    if (bac === 0 && typeof calculateTotalBudget === 'function') {
        bac = calculateTotalBudget();
    }

    const weeklyPV = new Array(totalWeeks + 1).fill(0);
    const cumPV = new Array(totalWeeks + 1).fill(0);
    const cumEV = new Array(totalWeeks + 1).fill(0);
    const cumAC = new Array(totalWeeks + 1).fill(0);

    targetTasks.forEach(task => {
        const st = (typeof ganttState !== 'undefined' && ganttState[task.id]) ? ganttState[task.id] : { startWeek: 1, durationWeeks: 4, progress: 0 };
        const cost = parseFloat(task.cost || task.price || task.totalPrice) || 0;
        const start = Math.max(1, Math.min(totalWeeks, st.startWeek || 1));
        const dur = Math.max(1, st.durationWeeks || 4);
        const weeklyCost = cost / dur;

        for (let w = start; w < start + dur && w <= totalWeeks; w++) {
            weeklyPV[w] += weeklyCost;
        }
    });

    let runningPV = 0;
    for (let w = 1; w <= totalWeeks; w++) {
        runningPV += weeklyPV[w];
        cumPV[w] = runningPV;
    }
    if (cumPV[totalWeeks] > 0 && bac > 0) {
        const factor = bac / cumPV[totalWeeks];
        for (let w = 1; w <= totalWeeks; w++) {
            cumPV[w] = Math.round(cumPV[w] * factor * 100) / 100;
        }
    }

    const currentPV = cumPV[cutoff] || 0;
    let currentEV = 0;
    let currentAC = 0;

    const chapterRowsData = [];
    const displayChapters = topTasks.length > 0 ? topTasks : targetTasks;

    displayChapters.forEach(ch => {
        const chCost = parseFloat(ch.cost || ch.price || ch.totalPrice) || 0;
        const st = (typeof ganttState !== 'undefined' && ganttState[ch.id]) ? ganttState[ch.id] : { startWeek: 1, durationWeeks: 4, progress: 0 };
        const progress = Math.min(100, Math.max(0, parseFloat(st.progress) || 0));
        
        const start = Math.max(1, Math.min(totalWeeks, st.startWeek || 1));
        const dur = Math.max(1, st.durationWeeks || 4);
        let chPV = 0;
        if (cutoff < start) {
            chPV = 0;
        } else if (cutoff >= start + dur) {
            chPV = chCost;
        } else {
            chPV = chCost * ((cutoff - start + 1) / dur);
        }

        const chEV = chCost * (progress / 100);

        let chAC = chEV;
        if (window.certifications && window.certifications[ch.id]) {
            let certTotal = 0;
            for (let m in window.certifications[ch.id]) {
                certTotal += parseFloat(window.certifications[ch.id][m]) || 0;
            }
            if (certTotal > 0) chAC = certTotal * (parseFloat(ch.price) || chCost);
        } else if (progress > 0) {
            const costVarianceFactor = (st.startWeek && st.startWeek > 4) ? 1.03 : 0.98;
            chAC = chEV * costVarianceFactor;
        }

        const chCpi = chAC > 0 ? chEV / chAC : 1.0;
        const chSpi = chPV > 0 ? chEV / chPV : 1.0;

        currentEV += chEV;
        currentAC += chAC;

        chapterRowsData.push({
            id: ch.id,
            name: ch.name || ch.code || 'Capítulo',
            bac: chCost,
            pv: chPV,
            progress: progress,
            ev: chEV,
            ac: chAC,
            cpi: chCpi,
            spi: chSpi
        });
    });

    for (let w = 1; w <= totalWeeks; w++) {
        if (w <= cutoff) {
            const frac = cutoff > 0 ? (w / cutoff) : 0;
            const sCurveFactor = Math.sin((frac * Math.PI) / 2);
            cumEV[w] = Math.round(currentEV * sCurveFactor * 100) / 100;
            cumAC[w] = Math.round(currentAC * sCurveFactor * 100) / 100;
        } else {
            cumEV[w] = null;
            cumAC[w] = null;
        }
    }
    cumEV[cutoff] = currentEV;
    cumAC[cutoff] = currentAC;

    const cpi = currentAC > 0 ? (currentEV / currentAC) : 1.0;
    const spi = currentPV > 0 ? (currentEV / currentPV) : 1.0;
    const cv = currentEV - currentAC;
    const eac = cpi > 0 ? (bac / cpi) : bac;

    const cumEAC = new Array(totalWeeks + 1).fill(null);
    cumEAC[cutoff] = currentAC;
    for (let w = cutoff + 1; w <= totalWeeks; w++) {
        const remainingWeeks = totalWeeks - cutoff;
        const progressFrac = remainingWeeks > 0 ? ((w - cutoff) / remainingWeeks) : 1;
        cumEAC[w] = Math.round((currentAC + (eac - currentAC) * progressFrac) * 100) / 100;
    }

    const fmt = (val) => val.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

    const bacEl = document.getElementById('evmBacVal');
    if (bacEl) bacEl.textContent = fmt(bac);

    const pvEl = document.getElementById('evmPvVal');
    if (pvEl) pvEl.textContent = fmt(currentPV);

    const evEl = document.getElementById('evmEvVal');
    if (evEl) evEl.textContent = fmt(currentEV);

    const acEl = document.getElementById('evmAcVal');
    if (acEl) acEl.textContent = fmt(currentAC);

    const cpiEl = document.getElementById('evmCpiVal');
    const cpiStatusEl = document.getElementById('evmCpiStatus');
    if (cpiEl) {
        cpiEl.textContent = cpi.toFixed(2);
        cpiEl.style.color = cpi >= 1.0 ? '#10b981' : '#ef4444';
    }
    if (cpiStatusEl) {
        cpiStatusEl.textContent = cpi > 1.02 ? 'Bajo Coste (Ahorro)' : (cpi < 0.98 ? 'Sobrecoste' : 'En Coste');
        cpiStatusEl.style.color = cpi >= 1.0 ? '#10b981' : '#ef4444';
    }

    const spiEl = document.getElementById('evmSpiVal');
    const spiStatusEl = document.getElementById('evmSpiStatus');
    if (spiEl) {
        spiEl.textContent = spi.toFixed(2);
        spiEl.style.color = spi >= 1.0 ? '#10b981' : '#f59e0b';
    }
    if (spiStatusEl) {
        spiStatusEl.textContent = spi > 1.02 ? 'Adelantado' : (spi < 0.98 ? 'Retrasado' : 'En Plazo');
        spiStatusEl.style.color = spi >= 1.0 ? '#10b981' : '#f59e0b';
    }

    const cvEl = document.getElementById('evmCvVal');
    if (cvEl) {
        cvEl.textContent = (cv >= 0 ? '+' : '') + fmt(cv);
        cvEl.style.color = cv >= 0 ? '#10b981' : '#ef4444';
    }

    const eacEl = document.getElementById('evmEacVal');
    if (eacEl) {
        eacEl.textContent = fmt(eac);
        eacEl.style.color = eac <= bac ? '#10b981' : '#ef4444';
    }

    drawEVMCurveCanvas(totalWeeks, cumPV, cumEV, cumAC, cumEAC, cutoff, Math.max(bac, eac, currentAC));

    const tableBody = document.getElementById('evmChapterTableBody');
    if (tableBody) {
        tableBody.innerHTML = chapterRowsData.map(ch => {
            const statusBadge = ch.spi >= 1 && ch.cpi >= 1
                ? `<span style="background:rgba(16,185,129,0.15); color:#10b981; padding:2px 6px; border-radius:4px; font-weight:700; font-size:0.65rem;">ÓPTIMO</span>`
                : (ch.spi < 0.95 && ch.cpi < 0.95
                    ? `<span style="background:rgba(239,68,68,0.15); color:#ef4444; padding:2px 6px; border-radius:4px; font-weight:700; font-size:0.65rem;">CRÍTICO</span>`
                    : (ch.spi < 0.95
                        ? `<span style="background:rgba(245,158,11,0.15); color:#f59e0b; padding:2px 6px; border-radius:4px; font-weight:700; font-size:0.65rem;">RETRASO</span>`
                        : `<span style="background:rgba(239,68,68,0.15); color:#ef4444; padding:2px 6px; border-radius:4px; font-weight:700; font-size:0.65rem;">SOBRECOSTE</span>`));

            return `
                <tr style="border-bottom:1px solid var(--border-color); font-size:0.75rem;">
                    <td style="padding:6px 10px; font-weight:600; color:var(--text-primary);">${ch.name}</td>
                    <td style="padding:6px 8px; text-align:right; font-family:monospace;">${fmt(ch.bac)}</td>
                    <td style="padding:6px 8px; text-align:right; font-family:monospace; color:#3b82f6;">${fmt(ch.pv)}</td>
                    <td style="padding:6px 8px; text-align:right; font-weight:700;">${ch.progress.toFixed(0)}%</td>
                    <td style="padding:6px 8px; text-align:right; font-family:monospace; color:#10b981;">${fmt(ch.ev)}</td>
                    <td style="padding:6px 8px; text-align:right; font-family:monospace; color:#f59e0b;">${fmt(ch.ac)}</td>
                    <td style="padding:6px 8px; text-align:center; font-weight:700; color:${ch.cpi >= 1 ? '#10b981' : '#ef4444'};">${ch.cpi.toFixed(2)}</td>
                    <td style="padding:6px 8px; text-align:center; font-weight:700; color:${ch.spi >= 1 ? '#10b981' : '#f59e0b'};">${ch.spi.toFixed(2)}</td>
                    <td style="padding:6px 10px; text-align:center;">${statusBadge}</td>
                </tr>
            `;
        }).join('');
    }
}

function drawEVMCurveCanvas(totalWeeks, cumPV, cumEV, cumAC, cumEAC, cutoff, maxVal) {
    const canvas = document.getElementById('evmCurveCanvas');
    if (!canvas) return;

    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = rect.width || 600;
    const height = 230;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const padLeft = 65;
    const padRight = 25;
    const padTop = 20;
    const padBottom = 30;

    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;
    const peakY = (maxVal || 100) * 1.15;

    const getX = (w) => padLeft + ((w - 1) / Math.max(1, totalWeeks - 1)) * plotW;
    const getY = (val) => padTop + plotH - (val / peakY) * plotH;

    ctx.clearRect(0, 0, width, height);

    const isDark = document.body.classList.contains('dark-theme') || document.body.classList.contains('dark-mode');
    const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
    const textColor = isDark ? '#94a3b8' : '#64748b';

    ctx.font = '10px sans-serif';
    ctx.fillStyle = textColor;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const numYDivs = 4;
    for (let i = 0; i <= numYDivs; i++) {
        const val = (peakY / numYDivs) * i;
        const y = getY(val);
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(width - padRight, y);
        ctx.stroke();

        const label = val >= 1000000
            ? (val / 1000000).toFixed(1) + 'M €'
            : (val >= 1000 ? (val / 1000).toFixed(0) + 'k €' : val.toFixed(0) + ' €');
        ctx.fillText(label, padLeft - 6, y);
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const weekStep = totalWeeks > 30 ? 4 : (totalWeeks > 15 ? 2 : 1);
    for (let w = 1; w <= totalWeeks; w += weekStep) {
        const x = getX(w);
        ctx.strokeStyle = gridColor;
        ctx.beginPath();
        ctx.moveTo(x, padTop);
        ctx.lineTo(x, padTop + plotH);
        ctx.stroke();

        ctx.fillText(`S${w}`, x, padTop + plotH + 6);
    }

    const cutoffX = getX(cutoff);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(cutoffX, padTop);
    ctx.lineTo(cutoffX, padTop + plotH);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Corte (S${cutoff})`, cutoffX, padTop - 12);

    function drawLine(arr, strokeStyle, lineWidth = 2.5, isDashed = false) {
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = lineWidth;
        if (isDashed) ctx.setLineDash([5, 4]);
        else ctx.setLineDash([]);

        ctx.beginPath();
        let started = false;
        for (let w = 1; w <= totalWeeks; w++) {
            if (arr[w] !== null && typeof arr[w] !== 'undefined') {
                const x = getX(w);
                const y = getY(arr[w]);
                if (!started) {
                    ctx.moveTo(x, y);
                    started = true;
                } else {
                    ctx.lineTo(x, y);
                }
            }
        }
        ctx.stroke();
        ctx.setLineDash([]);
    }

    drawLine(cumPV, '#3b82f6', 2.5);
    drawLine(cumEAC, '#8b5cf6', 2, true);
    drawLine(cumEV, '#10b981', 3);
    drawLine(cumAC, '#f59e0b', 3);

    function drawDot(val, color) {
        if (val === null || typeof val === 'undefined') return;
        const x = getX(cutoff);
        const y = getY(val);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    drawDot(cumPV[cutoff], '#3b82f6');
    drawDot(cumEV[cutoff], '#10b981');
    drawDot(cumAC[cutoff], '#f59e0b');
}

function exportEVMReportToExcel() {
    if (!parsedData) { alert("No hay datos de presupuesto cargados."); return; }
    
    const totalWeeks = ganttTotalWeeks || 26;
    const cutoff = evmCurrentCutoffWeek || 12;
    const tasks = (typeof getGanttTasks === 'function' ? getGanttTasks() : []) || [];
    const topTasks = tasks.filter(t => t.depth === 1 || (t.isChapter && !t.parentId));

    const rows = [
        ["INFORME DE CONTROL FINANCIERO Y VALOR GANADO (EVM)", "", "", "", "", "", "", ""],
        ["Proyecto:", (parsedData.properties && parsedData.properties.description) || "Presupuesto BC3", "", "", "Semana de Corte:", `Semana ${cutoff}`, "Duración Total:", `${totalWeeks} semanas`],
        ["Fecha de Informe:", new Date().toLocaleDateString('es-ES'), "", "", "", "", "", ""],
        [],
        ["RESUMEN EJECUTIVO DE KPIS", "", "", "", "", "", "", ""],
        ["BAC (Presupuesto Total)", "PV (Planificado)", "EV (Valor Ganado)", "AC (Coste Real)", "CPI (Índice Coste)", "SPI (Índice Plazo)", "CV (Desv. Coste)", "EAC (Estimación Fin)"],
        [
            document.getElementById('evmBacVal')?.textContent || '0 €',
            document.getElementById('evmPvVal')?.textContent || '0 €',
            document.getElementById('evmEvVal')?.textContent || '0 €',
            document.getElementById('evmAcVal')?.textContent || '0 €',
            document.getElementById('evmCpiVal')?.textContent || '1.00',
            document.getElementById('evmSpiVal')?.textContent || '1.00',
            document.getElementById('evmCvVal')?.textContent || '0 €',
            document.getElementById('evmEacVal')?.textContent || '0 €'
        ],
        [],
        ["DESGLOSE DETALLADO POR CAPÍTULOS", "", "", "", "", "", "", ""],
        ["Capítulo / Tarea", "BAC (€)", "PV (€)", "Progreso (%)", "EV (€)", "AC (€)", "CPI", "SPI"]
    ];

    topTasks.forEach(ch => {
        const chCost = parseFloat(ch.cost || ch.price || ch.totalPrice) || 0;
        const st = (typeof ganttState !== 'undefined' && ganttState[ch.id]) ? ganttState[ch.id] : { startWeek: 1, durationWeeks: 4, progress: 0 };
        const progress = Math.min(100, Math.max(0, parseFloat(st.progress) || 0));
        const start = Math.max(1, Math.min(totalWeeks, st.startWeek || 1));
        const dur = Math.max(1, st.durationWeeks || 4);
        let chPV = cutoff < start ? 0 : (cutoff >= start + dur ? chCost : chCost * ((cutoff - start + 1) / dur));
        const chEV = chCost * (progress / 100);
        const chAC = chEV * (st.startWeek && st.startWeek > 4 ? 1.03 : 0.98);
        const chCpi = chAC > 0 ? (chEV / chAC).toFixed(2) : '1.00';
        const chSpi = chPV > 0 ? (chEV / chPV).toFixed(2) : '1.00';

        rows.push([
            ch.name || ch.code,
            chCost.toFixed(2),
            chPV.toFixed(2),
            progress.toFixed(0) + '%',
            chEV.toFixed(2),
            chAC.toFixed(2),
            chCpi,
            chSpi
        ]);
    });

    if (typeof XLSX !== 'undefined') {
        const ws = XLSX.utils.aoa_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Informe EVM");
        XLSX.writeFile(wb, `Informe_EVM_${(currentFileName || 'Presupuesto').replace(/\.[^/.]+$/, '')}_S${cutoff}.xlsx`);
    } else {
        const csvContent = "\uFEFF" + rows.map(r => r.map(c => `"${c}"`).join(';')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Informe_EVM_${(currentFileName || 'Presupuesto').replace(/\.[^/.]+$/, '')}_S${cutoff}.csv`;
        link.click();
    }
    showAppToast("Informe EVM exportado correctamente", "📊");
}

initEVMModule();

// Setup explicit editing for details description
const detDescriptionEl = document.getElementById('detDescription');
if (detDescriptionEl) {
    setupExplicitEdit(detDescriptionEl, (newDescription) => {
        if (!parsedData) return false;
        const detCodeEl = document.getElementById('detCode');
        if (detCodeEl && detCodeEl.textContent) {
            const rawCode = Object.keys(parsedData.concepts).find(c => c.replace(/#+\s*$/, '') === detCodeEl.textContent);
            if (rawCode) {
                const concept = parsedData.concepts[rawCode];
                if (newDescription !== concept.description) {
                    const oldVal = concept.description;
                    logChange(rawCode.replace(/#+\s*$/, ''), 'Cambio de descripción detallada', oldVal, newDescription, () => {
                        concept.description = newDescription;
                    });
                    return true;
                }
            }
        }
        return false;
    }, {
        multiLine: true
    });
}

// Setup explicit editing for details title
const detSummaryEl = document.getElementById('detSummary');
if (detSummaryEl) {
    setupExplicitEdit(detSummaryEl, (newSummary) => {
        if (!parsedData) return false;
        const detCodeEl = document.getElementById('detCode');
        if (detCodeEl && detCodeEl.textContent) {
            const rawCode = Object.keys(parsedData.concepts).find(c => c.replace(/#+\s*$/, '') === detCodeEl.textContent);
            if (rawCode) {
                const concept = parsedData.concepts[rawCode];
                if (newSummary && newSummary !== concept.summary) {
                    const oldVal = concept.summary;
                    logChange(rawCode.replace(/#+\s*$/, ''), `Cambio de resumen a: "${newSummary}"`, oldVal, newSummary, () => {
                        concept.summary = newSummary;

                        // Sincronizar en el árbol visual si existe
                        const treeNodeSummary = document.querySelector(`.tree-node-container[data-code="${rawCode}"] > .tree-node-row > .col-summary`);
                        if (treeNodeSummary) {
                            const valEl = treeNodeSummary.querySelector('.editable-val') || treeNodeSummary;
                            valEl.textContent = newSummary;
                        }
                    });
                    return true;
                }
            }
        }
        return false;
    });
}

// ==========================================================================
// Lógica del Banco de Precios Unitarios
// ==========================================================================

let activePriceFilter = 'all';

// Clasificación de conceptos para el Banco de Precios
function getConceptCategory(concept) {
    if (concept.category === 'PARTIDA_NEW' || concept.isNewPartida) return 'partida_new';
    if (concept.type === 1) return 'mo';
    if (concept.type === 2) return 'maq';
    if (concept.type === 3) return 'mat';
    if (concept.type === 4) return 'sub';

    const lowerCode = concept.code.toLowerCase();
    if (lowerCode.startsWith('mo') || lowerCode.includes('mano')) return 'mo';
    if (lowerCode.startsWith('mq') || lowerCode.startsWith('maq')) return 'maq';
    if (lowerCode.startsWith('mt') || lowerCode.startsWith('mat')) return 'mat';

    return 'partida';
}

// Renderizar la tabla del Banco de Precios Unitarios
function renderPricesTable() {
    if (!parsedData) return;

    const tbody = document.getElementById('pricesTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    // 1. Precalcular mapa de usos ("Dónde se usa")
    const whereUsed = {};
    Object.values(parsedData.concepts).forEach(c => {
        if (Array.isArray(c.decomposition)) {
            c.decomposition.forEach(item => {
                if (!whereUsed[item.code]) {
                    whereUsed[item.code] = [];
                }
                if (!whereUsed[item.code].includes(c.code)) {
                    whereUsed[item.code].push(c.code);
                }
            });
        }
    });

    // 2. Filtrar conceptos que son precios unitarios o recursos elementales
    const searchVal = document.getElementById('pricesSearch') ? document.getElementById('pricesSearch').value.toLowerCase().trim() : '';

    const filtered = Object.values(parsedData.concepts).filter(concept => {
        // Excluir capítulos estructurales
        if (concept.code.endsWith('#')) return false;
        // Requerir unidad o precio para calificar como precio unitario
        if (!concept.unit && !concept.price) return false;

        // Filtro por categoría (Pestañas)
        const cat = getConceptCategory(concept);
        if (activePriceFilter !== 'all' && cat !== activePriceFilter) return false;

        // Filtro por búsqueda
        if (searchVal) {
            const matchesCode = concept.code.toLowerCase().includes(searchVal);
            const matchesSummary = (concept.summary || '').toLowerCase().includes(searchVal);
            const matchesDesc = (concept.description || '').toLowerCase().includes(searchVal);
            if (!matchesCode && !matchesSummary && !matchesDesc) return false;
        }

        return true;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--text-muted); padding: 24px;">No se encontraron precios unitarios para el filtro aplicado.</td></tr>`;
        return;
    }

    filtered.forEach(concept => {
        const row = document.createElement('tr');
        row.className = 'price-row';
        row.dataset.code = concept.code;

        const cat = getConceptCategory(concept);
        let badgeClass = 'badge-partida';
        let catText = 'Partida';
        if (cat === 'mo') { badgeClass = 'badge-mo'; catText = 'Mano de Obra'; }
        else if (cat === 'mat') { badgeClass = 'badge-mat'; catText = 'Material'; }
        else if (cat === 'maq') { badgeClass = 'badge-maq'; catText = 'Maquinaria'; }
        else if (cat === 'sub') { badgeClass = 'badge-sub'; catText = 'Subcontrata'; }
        else if (cat === 'partida_new') { badgeClass = 'badge-partida-new'; catText = 'Nueva Partida'; }

        const uses = whereUsed[concept.code] || [];
        const usesCount = uses.length;

        // Crear celdas programáticamente
        const tdCode = document.createElement('td');
        tdCode.innerHTML = `<span class="code-badge">${concept.code.replace(/#+\s*$/, '')}</span>`;

        const tdType = document.createElement('td');
        tdType.innerHTML = `<span class="badge-type ${badgeClass}">${catText}</span>`;

        const tdUnit = document.createElement('td');
        tdUnit.className = 'edit-unit';
        tdUnit.textContent = concept.unit || '';
        setupExplicitEdit(tdUnit, (newVal) => {
            if (concept.unit !== newVal) {
                concept.unit = newVal;
                saveHistoryState();

                // Sincronizar en el árbol visual si existe
                const treeNodeUnit = document.querySelector(`.tree-node-container[data-code="${concept.code}"] > .tree-node-row > .col-unit`);
                if (treeNodeUnit) {
                    const valEl = treeNodeUnit.querySelector('.editable-val') || treeNodeUnit;
                    valEl.textContent = newVal;
                }
                return true;
            }
            return false;
        });

        const tdSummary = document.createElement('td');
        tdSummary.className = 'edit-summary';
        tdSummary.textContent = concept.summary || '';
        setupExplicitEdit(tdSummary, (newVal) => {
            if (concept.summary !== newVal) {
                concept.summary = newVal;
                saveHistoryState();

                // Sincronizar árbol y detalles
                const treeNodeSummary = document.querySelector(`.tree-node-container[data-code="${concept.code}"] > .tree-node-row > .col-summary`);
                if (treeNodeSummary) {
                    const valEl = treeNodeSummary.querySelector('.editable-val') || treeNodeSummary;
                    valEl.textContent = newVal;
                }

                const detCodeEl = document.getElementById('detCode');
                const detSummaryEl = document.getElementById('detSummary');
                if (detCodeEl && detSummaryEl && detCodeEl.textContent === concept.code.replace(/#+\s*$/, '')) {
                    const valEl = detSummaryEl.querySelector('.editable-val') || detSummaryEl;
                    valEl.textContent = newVal;
                }
                return true;
            }
            return false;
        });

        const tdUsage = document.createElement('td');
        tdUsage.style.textAlign = 'center';
        const usageBtn = document.createElement('button');
        usageBtn.type = 'button';
        usageBtn.className = 'usage-badge';
        usageBtn.textContent = usesCount;
        usageBtn.title = 'Ver partidas que usan este recurso';
        usageBtn.addEventListener('click', () => {
            showUsageModal(concept.code, uses);
        });
        tdUsage.appendChild(usageBtn);

        const tdPrice = document.createElement('td');
        tdPrice.className = 'edit-price';
        tdPrice.style.textAlign = 'right';
        tdPrice.style.fontWeight = '600';
        tdPrice.textContent = parseFloat(concept.price || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        setupExplicitEdit(tdPrice, (newPriceText) => {
            const rawText = newPriceText.trim().replace(',', '.');
            const newVal = parseFloat(rawText);
            if (!isNaN(newVal) && newVal >= 0) {
                if (parseFloat(concept.price) !== newVal) {
                    concept.price = newVal;
                    concept.isManualPrice = true;

                    recalculateAll();
                    updateTotalBudgetDisplay();
                    saveHistoryState();

                    // Actualizar árbol si es visible
                    const treeNodePrice = document.querySelector(`.tree-node-container[data-code="${concept.code}"] > .tree-node-row > .col-price`);
                    if (treeNodePrice) {
                        const valEl = treeNodePrice.querySelector('.editable-val') || treeNodePrice;
                        valEl.textContent = newVal.toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' €';
                    }

                    // Sincronizar panel de detalles si coincide
                    const detCodeEl = document.getElementById('detCode');
                    const detPriceEl = document.getElementById('detPrice');
                    if (detCodeEl && detPriceEl && detCodeEl.textContent === concept.code.replace(/#+\s*$/, '')) {
                        detPriceEl.textContent = newVal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
                    }

                    // Mantener posición del scroll al re-renderizar tabla de precios
                    const scrollPos = document.querySelector('.prices-table-container').scrollTop;
                    renderPricesTable();
                    document.querySelector('.prices-table-container').scrollTop = scrollPos;
                    return true;
                }
            }
            tdPrice.textContent = parseFloat(concept.price || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            return false;
        }, {
            isNumeric: true
        });

        const tdActions = document.createElement('td');
        const descBtn = document.createElement('button');
        descBtn.type = 'button';
        descBtn.className = 'desc-toggle-btn';
        descBtn.textContent = '📝';
        descBtn.title = 'Editar texto explicativo';
        descBtn.addEventListener('click', () => {
            toggleDescriptionRow(row, concept);
        });
        tdActions.appendChild(descBtn);

        row.appendChild(tdCode);
        row.appendChild(tdType);
        row.appendChild(tdUnit);
        row.appendChild(tdSummary);
        row.appendChild(tdUsage);
        row.appendChild(tdPrice);
        row.appendChild(tdActions);

        tbody.appendChild(row);
    });
}

// Desplegar fila de descripción extendida
function toggleDescriptionRow(parentRow, concept) {
    const nextRow = parentRow.nextElementSibling;
    if (nextRow && nextRow.classList.contains('description-row')) {
        nextRow.remove();
        return;
    }

    const descRow = document.createElement('tr');
    descRow.className = 'description-row';
    descRow.innerHTML = `
        <td colspan="7">
            <div class="prices-desc-editor">
                <div class="prices-desc-title">Descripción / Texto Explicativo (${concept.code})</div>
                <div class="prices-desc-content">
                    ${(concept.description || concept.summary || '').replace(/\n/g, '<br>')}
                </div>
            </div>
        </td>
    `;

    const editor = descRow.querySelector('.prices-desc-content');
    setupExplicitEdit(editor, (newDesc) => {
        if (newDesc !== concept.description) {
            concept.description = newDesc;
            saveHistoryState();

            // Sincronizar el panel de detalles si coincide
            const detCodeEl = document.getElementById('detCode');
            const detDescEl = document.getElementById('detDescription');
            if (detCodeEl && detDescEl && detCodeEl.textContent === concept.code.replace(/#+\s*$/, '')) {
                const valEl = detDescEl.querySelector('.editable-val') || detDescEl;
                valEl.innerHTML = newDesc.replace(/\n/g, '<br>');
            }
            return true;
        }
        return false;
    }, {
        multiLine: true
    });

    parentRow.after(descRow);
}

// Mostrar el Modal de "Dónde se usa" (Impact Analysis)
function showUsageModal(code, parentCodes) {
    const modal = document.getElementById('usageModal');
    const body = document.getElementById('usageModalBody');
    if (!modal || !body) return;

    body.innerHTML = '';

    if (parentCodes.length === 0) {
        body.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-muted); text-align: center; margin: 24px 0;">Este recurso no se utiliza en ninguna partida compuesta del presupuesto.</p>`;
        modal.style.display = 'block';
        return;
    }

    const titleInfo = document.createElement('p');
    titleInfo.style.fontSize = '0.85rem';
    titleInfo.style.marginBottom = '12px';
    titleInfo.style.color = 'var(--text-secondary)';
    titleInfo.innerHTML = `El recurso <strong>${code}</strong> se utiliza en las siguientes <strong>${parentCodes.length}</strong> partidas. Haz clic en cualquiera para navegar a ella:`;
    body.appendChild(titleInfo);

    const list = document.createElement('ul');
    list.className = 'usage-list';

    parentCodes.forEach(pCode => {
        const parent = parsedData.concepts[pCode];
        if (!parent) return;

        const li = document.createElement('li');
        li.className = 'usage-item';

        // Calcular la aportación (si figura en la descomposición de la partida)
        let factor = 0;
        if (Array.isArray(parent.decomposition)) {
            const match = parent.decomposition.find(d => d.code === code);
            if (match) factor = parseFloat(match.factor) || 0;
        }

        li.innerHTML = `
            <div class="usage-item-details">
                <div class="usage-item-header">
                    <span class="code-badge" style="font-size: 0.72rem; padding: 2px 6px;">${pCode.replace(/#+\s*$/, '')}</span>
                    <span class="usage-item-title">${parent.summary}</span>
                </div>
                <span class="usage-item-subtitle">Cantidad en partida: ${factor.toLocaleString('es-ES')} ${parent.unit}</span>
            </div>
            <div class="usage-item-contribution">
                ${(factor * parseFloat(parsedData?.concepts?.[code]?.price || 0)).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
            </div>
        `;

        li.addEventListener('click', () => {
            // Cerrar modal
            modal.style.display = 'none';
            // Cambiar a vista Presupuesto (Árbol)
            const presupuestoBtn = document.getElementById('presupuestoBtn');
            if (presupuestoBtn) presupuestoBtn.click();
            // Mostrar detalles de la partida
            showDetails(pCode);
            // Hacer scroll hasta el nodo del árbol correspondiente
            const nodeContainer = document.querySelector(`.tree-node-container[data-code="${pCode}"]`);
            if (nodeContainer) {
                nodeContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Resaltar brevemente la partida
                const row = nodeContainer.querySelector('.tree-node-row');
                if (row) {
                    row.style.transition = 'background-color 0.3s';
                    const origBg = row.style.backgroundColor;
                    row.style.backgroundColor = 'var(--accent-glow, rgba(59, 130, 246, 0.15))';
                    setTimeout(() => {
                        row.style.backgroundColor = origBg;
                    }, 2000);
                }
            }
        });

        list.appendChild(li);
    });

    body.appendChild(list);
    modal.style.display = 'block';
}

// Configurar listeners de navegación y controles del Banco de Precios
const pricesBtn = document.getElementById('pricesBtn');
const pricesPanel = document.getElementById('pricesPanel');
const treePanel = document.getElementById('treePanel');
const detailsPanel = document.getElementById('detailsPanel');
const pricesSearch = document.getElementById('pricesSearch');

if (pricesBtn && pricesPanel) {
    pricesBtn.addEventListener('click', () => {
        // Ocultar Dashboard
        if (treePanel) treePanel.style.display = 'none';
        if (detailsPanel) detailsPanel.style.display = 'none';
        const v3dPanelP = document.getElementById('visor3dPanel');
        if (v3dPanelP) v3dPanelP.style.display = 'none';
        // Mostrar Precios
        pricesPanel.style.display = 'flex';

        // Estilo de botones activos
        document.querySelectorAll('.control-container button').forEach(b => b.classList.remove('active'));
        pricesBtn.classList.add('active');

        // Renderizar tabla
        renderPricesTable();
    });
}

const presupuestoBtn = document.getElementById('presupuestoBtn');
if (presupuestoBtn) {
    presupuestoBtn.addEventListener('click', () => {
        // Mostrar Dashboard (árbol y detalles) y ocultar Precios
        if (treePanel) treePanel.style.display = 'flex';
        if (detailsPanel) detailsPanel.style.display = 'flex';
        if (pricesPanel) pricesPanel.style.display = 'none';

        // Estilo de botones activos
        document.querySelectorAll('.control-container button').forEach(b => b.classList.remove('active'));
        presupuestoBtn.classList.add('active');
    });
}



// Búsqueda en tiempo real
if (pricesSearch) {
    pricesSearch.addEventListener('input', () => {
        renderPricesTable();
    });
}

// Filtros de categoría por pestañas
document.querySelectorAll('.prices-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.prices-tabs .tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activePriceFilter = btn.dataset.filter;
        renderPricesTable();
    });
});

// Cerrar modal de usos
const closeUsageBtn = document.getElementById('closeUsageBtn');
const usageModal = document.getElementById('usageModal');
if (closeUsageBtn && usageModal) {
    closeUsageBtn.addEventListener('click', () => {
        usageModal.style.display = 'none';
    });
    usageModal.addEventListener('click', (e) => {
        if (e.target === usageModal) usageModal.style.display = 'none';
    });
}

// =============================================================================
// FEATURE 3: Dependencias Gantt (Fin → Inicio)
// =============================================================================
let ganttDeps = []; // [{from: taskId, to: taskId}]
let ganttLinkMode = false;
let ganttLinkSource = null; // taskId de la tarea origen seleccionada

// ── Guardar/cargar deps junto al estado del Gantt ──
const _origGanttSave = ganttSave;
ganttSave = function () {
    try {
        localStorage.setItem(ganttStorageKey(), JSON.stringify({
            startDate: ganttStartDate.toISOString(),
            totalWeeks: ganttTotalWeeks,
            state: ganttState,
            deps: ganttDeps
        }));
    } catch (e) { }
};
const _origGanttLoad = ganttLoad;
ganttLoad = function () {
    try {
        const raw = localStorage.getItem(ganttStorageKey());
        if (!raw) return false;
        const saved = JSON.parse(raw);
        if (saved.startDate) ganttStartDate = new Date(saved.startDate);
        if (saved.totalWeeks) ganttTotalWeeks = saved.totalWeeks;
        if (saved.state) ganttState = saved.state;
        if (saved.deps) ganttDeps = saved.deps;
        return true;
    } catch (e) { return false; }
};

// ── Propagar dependencias en cadena (Fin→Inicio) ──
function applyDependencies() {
    if (!ganttDeps || ganttDeps.length === 0) return;
    // Hasta 10 pasadas para resolver cadenas largas
    for (let pass = 0; pass < 10; pass++) {
        let changed = false;
        ganttDeps.forEach(dep => {
            const fromSt = ganttState[dep.from];
            const toSt = ganttState[dep.to];
            if (!fromSt || !toSt) return;
            const minStart = fromSt.startWeek + fromSt.durationWeeks;
            if (toSt.startWeek < minStart) {
                toSt.startWeek = minStart;
                changed = true;
            }
        });
        if (!changed) break;
    }
}

// ── Dibujar flechas de dependencia en SVG ──
function drawDependencyArrows(bodyWrap, colsCount) {
    const svgNS = 'http://www.w3.org/2000/svg';
    let depSvg = bodyWrap.querySelector('.gantt-dep-svg');
    if (depSvg) {
        depSvg.innerHTML = '';
    } else {
        depSvg = document.createElementNS(svgNS, 'svg');
        depSvg.setAttribute('class', 'gantt-dep-svg gantt-svg-overlay');
        depSvg.style.width = (colsCount * GANTT_COL_PX) + 'px';
        depSvg.style.pointerEvents = 'all';
        bodyWrap.appendChild(depSvg);
    }
    depSvg.style.width = (colsCount * GANTT_COL_PX) + 'px';

    if (!ganttDeps || ganttDeps.length === 0) return;

    // Definir marcador de flecha
    const defs = document.createElementNS(svgNS, 'defs');
    const marker = document.createElementNS(svgNS, 'marker');
    marker.setAttribute('id', 'depArrow');
    marker.setAttribute('markerWidth', '8');
    marker.setAttribute('markerHeight', '8');
    marker.setAttribute('refX', '6');
    marker.setAttribute('refY', '3');
    marker.setAttribute('orient', 'auto');
    const poly = document.createElementNS(svgNS, 'polygon');
    poly.setAttribute('points', '0 0, 6 3, 0 6');
    poly.setAttribute('class', 'gantt-dep-arrowhead');
    marker.appendChild(poly);
    defs.appendChild(marker);
    depSvg.appendChild(defs);

    ganttDeps.forEach(dep => {
        const fromRow = bodyWrap.querySelector(`.gantt-bar-row[data-task-id="${dep.from}"]`);
        const toRow = bodyWrap.querySelector(`.gantt-bar-row[data-task-id="${dep.to}"]`);
        if (!fromRow || !toRow) return;

        const fromBar = fromRow.querySelector('.gantt-bar');
        const toBar = toRow.querySelector('.gantt-bar');
        if (!fromBar || !toBar) return;

        const xA = fromBar.offsetLeft + fromBar.offsetWidth;
        const yA = fromRow.offsetTop + fromRow.offsetHeight / 2;
        const xB = toBar.offsetLeft;
        const yB = toRow.offsetTop + toRow.offsetHeight / 2;

        const xMid = xA + Math.max(10, (xB - xA) / 2);
        const d = `M ${xA} ${yA} C ${xMid} ${yA}, ${xMid} ${yB}, ${xB} ${yB}`;

        const group = document.createElementNS(svgNS, 'g');
        group.setAttribute('class', 'gantt-dep-group');

        // Línea invisible más gruesa para hit-area
        const hit = document.createElementNS(svgNS, 'path');
        hit.setAttribute('d', d);
        hit.setAttribute('class', 'gantt-dep-hit-area');

        // Línea visible
        const path = document.createElementNS(svgNS, 'path');
        path.setAttribute('d', d);
        path.setAttribute('class', 'gantt-dep-arrow');
        path.setAttribute('marker-end', 'url(#depArrow)');

        // Botón circular de eliminar (×) en el punto medio
        const cx = (xA + xB) / 2;
        const cy = (yA + yB) / 2;

        const delGroup = document.createElementNS(svgNS, 'g');
        delGroup.setAttribute('class', 'gantt-dep-delete-btn');
        delGroup.style.cursor = 'pointer';

        const circle = document.createElementNS(svgNS, 'circle');
        circle.setAttribute('cx', cx);
        circle.setAttribute('cy', cy);
        circle.setAttribute('r', '7');
        circle.setAttribute('fill', '#ef4444');
        circle.setAttribute('stroke', '#ffffff');
        circle.setAttribute('stroke-width', '1');

        const text = document.createElementNS(svgNS, 'text');
        text.setAttribute('x', cx);
        text.setAttribute('y', cy);
        text.setAttribute('dy', '3');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', '#ffffff');
        text.setAttribute('font-size', '9');
        text.setAttribute('font-weight', 'bold');
        text.textContent = '×';

        const title = document.createElementNS(svgNS, 'title');
        title.textContent = 'Eliminar esta dependencia';
        delGroup.appendChild(title);

        delGroup.appendChild(circle);
        delGroup.appendChild(text);

        delGroup.addEventListener('click', e => {
            e.stopPropagation();
            if (confirm('¿Eliminar esta dependencia de enlace?')) {
                ganttDeps = ganttDeps.filter(d => !(d.from === dep.from && d.to === dep.to));
                ganttSave();
                rebuildGanttDOM();
            }
        });

        group.appendChild(hit);
        group.appendChild(path);
        group.appendChild(delGroup);

        depSvg.appendChild(group);
    });
}



// ── Mostrar/ocultar banner de enlace ──
function showGanttLinkBanner(htmlText) {
    let banner = document.getElementById('ganttLinkBanner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'ganttLinkBanner';
        banner.className = 'gantt-link-banner';
        const container = document.getElementById('ganttContainer');
        if (container && container.parentNode) {
            container.parentNode.insertBefore(banner, container);
        }
    }
    if (banner) {
        banner.innerHTML = `<span>${htmlText}</span>`;
        banner.style.display = 'flex';
    }
}

function hideGanttLinkBanner() {
    const banner = document.getElementById('ganttLinkBanner');
    if (banner) banner.style.display = 'none';
}

// ── Botón Enlazar ──
const ganttLinkBtn = document.getElementById('ganttLinkBtn');
if (ganttLinkBtn) {
    ganttLinkBtn.addEventListener('click', () => {
        ganttLinkMode = !ganttLinkMode;
        ganttLinkSource = null;
        ganttLinkBtn.classList.toggle('active', ganttLinkMode);
        document.body.classList.toggle('gantt-link-mode', ganttLinkMode);

        document.querySelectorAll('.gantt-bar.dep-source').forEach(el => el.classList.remove('dep-source'));

        if (ganttLinkMode) {
            showGanttLinkBanner("🔗 <strong>Modo enlace activo</strong>: Seleccione la tarea predecesora (Fin) haciendo clic en su barra.");
        } else {
            hideGanttLinkBanner();
        }
    });
}

// ── Manejar clicks en modo enlace ──
function handleLinkModeClick(taskId, bar) {
    if (!ganttLinkMode) return;
    const taskObj = ganttTasks.find(t => t.id === taskId);
    if (!taskObj || taskObj.hasKids) return;

    if (!ganttLinkSource) {
        ganttLinkSource = taskId;
        bar.classList.add('dep-source');
        showGanttLinkBanner(`🔗 Seleccione ahora la tarea sucesora (Inicio) para enlazarla con <strong>${taskObj.summary}</strong>, o pulse Enlazar para cancelar.`);
    } else {
        if (ganttLinkSource === taskId) {
            ganttLinkSource = null;
            document.querySelectorAll('.gantt-bar.dep-source').forEach(el => el.classList.remove('dep-source'));
            showGanttLinkBanner("🔗 Seleccione la tarea predecesora (Fin) haciendo clic en su barra.");
            return;
        }
        const exists = ganttDeps.some(d => d.from === ganttLinkSource && d.to === taskId);
        if (!exists) {
            if (ganttDeps.some(d => d.from === taskId && d.to === ganttLinkSource)) {
                alert("Error: No se pueden crear enlaces cíclicos.");
                return;
            }
            ganttDeps.push({ from: ganttLinkSource, to: taskId });
            applyDependencies();
            recalculateParentTasks();
            recalculateParentProgress();
            ganttSave();
        }
        ganttLinkSource = null;
        document.querySelectorAll('.gantt-bar.dep-source').forEach(el => el.classList.remove('dep-source'));
        showGanttLinkBanner("Enlace creado con éxito. Seleccione otra tarea predecesora (Fin) o pulse Enlazar para terminar.");
        rebuildGanttDOM();
    }
}


// ── Integrar en rebuildGanttDOM: aplicar deps y dibujar flechas ──
// Sobreescribimos stopGanttDrag para incluir applyDependencies
const _origStopGanttDrag = stopGanttDrag;
stopGanttDrag = function () {
    if (!ganttDrag) return;
    recalculateParentTasks();
    applyDependencies();
    recalculateParentProgress();
    ganttSave();
    ganttDrag = null;
    document.removeEventListener('mousemove', doGanttDrag);
    document.removeEventListener('mouseup', stopGanttDrag);
    rebuildGanttDOM();
};

// Inyectar drawDependencyArrows al final de rebuildGanttDOM
// Lo hacemos interceptando la función existente
const _origRebuildGanttDOM = rebuildGanttDOM;
rebuildGanttDOM = function () {
    applyDependencies();
    _origRebuildGanttDOM();
    // Dibujar flechas tras el rebuild
    const bw = document.querySelector('#ganttContainer .gantt-body');
    if (bw) {
        let colsCount = ganttTotalWeeks + GANTT_PRE_WEEKS;
        if (ganttViewMode === 'days') colsCount = (ganttTotalWeeks + GANTT_PRE_WEEKS) * 7;
        else if (ganttViewMode === 'months') colsCount = Math.ceil((ganttTotalWeeks + GANTT_PRE_WEEKS) / 4);
        drawDependencyArrows(bw, colsCount);
    }
};

// =============================================================================
// FEATURE 4: Curva S de Avance Económico
// =============================================================================
function calculateSCurve() {
    if (!ganttTasks || ganttTasks.length === 0) return { labels: [], planned: [], executed: [] };

    const totalWeeks = ganttTotalWeeks;
    const planned = new Array(totalWeeks).fill(0);
    const executed = new Array(totalWeeks).fill(0);

    // Solo tareas hoja (sin hijos) contribuyen directamente
    const leaves = ganttTasks.filter(t => !t.hasKids);

    leaves.forEach(task => {
        const totalBudgetedQty = getConceptTotalQuantity(task.id);
        const cost = (task.price || 0) * totalBudgetedQty;

        const st = ganttState[task.id];
        if (!st) return;

        const start = Math.max(0, st.startWeek - 1); // 0-indexed
        const dur = Math.max(1, st.durationWeeks);
        const costPerWeek = cost / dur;

        // Distribución planificada
        for (let w = 0; w < dur; w++) {
            const idx = start + w;
            if (idx < totalWeeks) {
                planned[idx] += costPerWeek;
            }
        }

        // Distribución ejecutada: preferir certificaciones reales si existen
        const certs = window.certifications[task.id];
        if (certs && Object.keys(certs).length > 0) {
            Object.keys(certs).forEach(m => {
                const monthIndex = parseInt(m.replace(/[^\d]/g, '')) || 1;
                const startW = (monthIndex - 1) * 4; // 4 semanas por mes aproximado
                const qty = parseFloat(certs[m]) || 0;
                const monthCost = qty * (task.price || 0);
                const weeklyCost = monthCost / 4;
                for (let w = 0; w < 4; w++) {
                    const idx = startW + w;
                    if (idx < totalWeeks) {
                        executed[idx] += weeklyCost;
                    }
                }
            });
        } else {
            const prog = (st.progress || 0) / 100;
            for (let w = 0; w < dur; w++) {
                const idx = start + w;
                if (idx < totalWeeks) {
                    executed[idx] += costPerWeek * prog;
                }
            }
        }
    });

    // Acumular
    const plannedAcc = [];
    const executedAcc = [];
    let sumP = 0, sumE = 0;
    const labels = [];
    for (let w = 0; w < totalWeeks; w++) {
        sumP += planned[w];
        sumE += executed[w];
        plannedAcc.push(Math.round(sumP * 100) / 100);
        executedAcc.push(Math.round(sumE * 100) / 100);
        const d = new Date(ganttStartDate);
        d.setDate(d.getDate() + w * 7);
        labels.push(`S${w + 1}`);
    }

    return { labels, planned: plannedAcc, executed: executedAcc };
}

// Integrar la Curva S en renderCharts
const _origRenderCharts = renderCharts;
renderCharts = function () {
    _origRenderCharts();

    // Destruir instancia previa si existe
    if (window.sCurveChartInstance) {
        try { window.sCurveChartInstance.destroy(); } catch (e) { }
        window.sCurveChartInstance = null;
    }

    const ctx = document.getElementById('sCurveChart');
    if (!ctx) return;

    const { labels, planned, executed } = calculateSCurve();
    if (labels.length === 0) return;

    const isDark = document.body.classList.contains('dark-theme');
    const labelColor = isDark ? '#e2e8f0' : '#1e293b';
    const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

    // Mostrar solo cada N semanas en el eje X para no saturar
    const maxLabels = 26;
    const step = Math.max(1, Math.ceil(labels.length / maxLabels));
    const filteredLabels = labels.map((l, i) => i % step === 0 ? l : '');

    window.sCurveChartInstance = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: filteredLabels,
            datasets: [
                {
                    label: 'Planificado (€)',
                    data: planned,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59,130,246,0.08)',
                    fill: true,
                    tension: 0.35,
                    pointRadius: 0,
                    borderWidth: 2.5
                },
                {
                    label: 'Ejecutado (€)',
                    data: executed,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16,185,129,0.08)',
                    fill: true,
                    tension: 0.35,
                    pointRadius: 0,
                    borderWidth: 2.5,
                    borderDash: [],
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { labels: { color: labelColor } },
                tooltip: {
                    callbacks: {
                        label: ctx => {
                            const v = ctx.parsed.y;
                            return ` ${ctx.dataset.label}: ${v.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`;
                        },
                        afterBody: (items) => {
                            if (items.length < 2) return '';
                            const pl = items[0].parsed.y || 0;
                            const ex = items[1].parsed.y || 0;
                            const pct = pl > 0 ? ((ex / pl) * 100).toFixed(1) : '0.0';
                            const dev = ex - pl;
                            const devStr = (dev >= 0 ? '+' : '') + dev.toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' €';
                            return [`Avance real: ${pct}%`, `Desviación: ${devStr}`];
                        }
                    }
                }
            },
            scales: {
                x: { ticks: { color: labelColor, maxRotation: 0 }, grid: { color: gridColor } },
                y: {
                    ticks: {
                        color: labelColor,
                        callback: v => v >= 1000 ? (v / 1000).toFixed(0) + 'k€' : v + '€'
                    },
                    grid: { color: gridColor }
                }
            }
        }
    });
};

// =============================================================================
// FEATURE 5: Buscador Global (Ctrl+F)
// =============================================================================
let gsMatches = [];
let gsActiveIdx = -1;

function openGlobalSearch() {
    const bar = document.getElementById('globalSearchBar');
    if (!bar) return;
    bar.style.display = 'flex';
    const input = document.getElementById('globalSearchInput');
    if (input) { input.value = ''; input.focus(); }
    gsMatches = []; gsActiveIdx = -1;
    updateGSCount();
}

function closeGlobalSearch() {
    const bar = document.getElementById('globalSearchBar');
    if (bar) bar.style.display = 'none';
    clearGSHighlights();
    gsMatches = []; gsActiveIdx = -1;
}

function clearGSHighlights() {
    document.querySelectorAll('.search-highlight, .search-highlight--active').forEach(el => {
        // Restore original text (strip <mark> tags)
        el.querySelectorAll('mark').forEach(m => {
            const t = document.createTextNode(m.textContent);
            m.replaceWith(t);
        });
        el.classList.remove('search-highlight', 'search-highlight--active');
    });
}

function performGlobalSearch(term) {
    clearGSHighlights();
    gsMatches = []; gsActiveIdx = -1;

    if (!term || term.length < 2) { updateGSCount(); return; }

    const lower = term.toLowerCase();
    const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');

    // Buscar en todas las filas de la tabla del árbol
    const rows = document.querySelectorAll('#treeContent tr, #treeContent .tree-row');
    rows.forEach(row => {
        // Buscar en celdas de texto (código y summary)
        const cells = row.querySelectorAll('td, .tree-cell');
        let matched = false;
        cells.forEach(cell => {
            if (cell.querySelector('button, input, select')) return; // Saltar celdas de control
            if (cell.textContent.toLowerCase().includes(lower)) {
                // Resaltar el texto coincidente dentro de nodos de texto
                highlightTextInEl(cell, re);
                matched = true;
            }
        });
        if (matched) {
            row.classList.add('search-highlight');
            gsMatches.push(row);
        }
    });

    updateGSCount();
    if (gsMatches.length > 0) navigateGS(1); // Ir al primero
}

function highlightTextInEl(el, re) {
    // Solo procesar nodos de texto directos e hijos no-element
    el.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
            const span = document.createElement('span');
            span.innerHTML = node.textContent.replace(re, m => `<mark>${m}</mark>`);
            node.replaceWith(span);
        } else if (node.nodeType === Node.ELEMENT_NODE && !['BUTTON', 'INPUT', 'SELECT', 'MARK'].includes(node.tagName)) {
            highlightTextInEl(node, re);
        }
    });
}

function navigateGS(dir) {
    if (gsMatches.length === 0) return;

    // Quitar clase activa anterior
    if (gsActiveIdx >= 0 && gsMatches[gsActiveIdx]) {
        gsMatches[gsActiveIdx].classList.remove('search-highlight--active');
    }

    gsActiveIdx = (gsActiveIdx + dir + gsMatches.length) % gsMatches.length;

    const active = gsMatches[gsActiveIdx];
    if (active) {
        active.classList.add('search-highlight--active');
        active.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    updateGSCount();
}

function updateGSCount() {
    const el = document.getElementById('globalSearchCount');
    if (!el) return;
    if (gsMatches.length === 0) {
        el.textContent = 'Sin resultados';
        el.style.color = 'var(--text-secondary)';
    } else {
        el.textContent = `${gsActiveIdx + 1} de ${gsMatches.length}`;
        el.style.color = 'var(--accent, #3b82f6)';
    }
    const prev = document.getElementById('globalSearchPrev');
    const next = document.getElementById('globalSearchNext');
    if (prev) prev.disabled = gsMatches.length === 0;
    if (next) next.disabled = gsMatches.length === 0;
}

// ── Atajos de teclado ──
document.addEventListener('keydown', e => {
    // Ctrl+F / Cmd+F
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        const bar = document.getElementById('globalSearchBar');
        // Solo activar cuando el árbol de presupuesto es visible
        const treeContent = document.getElementById('treeContent');
        if (treeContent && treeContent.offsetParent !== null) {
            e.preventDefault();
            if (bar && bar.style.display === 'none') {
                openGlobalSearch();
            } else {
                document.getElementById('globalSearchInput')?.focus();
            }
        }
    }
    // Escape para cerrar buscador o modo enlace
    if (e.key === 'Escape') {
        const bar = document.getElementById('globalSearchBar');
        if (bar && bar.style.display !== 'none') {
            closeGlobalSearch();
        }
        if (ganttLinkMode) {
            ganttLinkMode = false;
            ganttLinkSource = null;
            if (ganttLinkBtn) ganttLinkBtn.classList.remove('active');
            document.body.classList.remove('gantt-link-mode');
            document.querySelectorAll('.gantt-bar.dep-source').forEach(el => el.classList.remove('dep-source'));
            hideGanttLinkBanner();
        }
    }
});

// ── Eventos de la barra ──
const gsInput = document.getElementById('globalSearchInput');
if (gsInput) {
    let gsTimer;
    gsInput.addEventListener('input', () => {
        clearTimeout(gsTimer);
        gsTimer = setTimeout(() => performGlobalSearch(gsInput.value.trim()), 250);
    });
    gsInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            navigateGS(e.shiftKey ? -1 : 1);
        }
    });
}

const gsPrev = document.getElementById('globalSearchPrev');
const gsNext = document.getElementById('globalSearchNext');
const gsClose = document.getElementById('globalSearchClose');
if (gsPrev) gsPrev.addEventListener('click', () => navigateGS(-1));
if (gsNext) gsNext.addEventListener('click', () => navigateGS(1));
if (gsClose) gsClose.addEventListener('click', () => closeGlobalSearch());

// =============================================================================
// Lógica para Añadir Nueva Partida
// =============================================================================
const addPartidaBtn = document.getElementById('addPartidaBtn');
const addPartidaModal = document.getElementById('addPartidaModal');
const closeAddPartidaBtn = document.getElementById('closeAddPartidaBtn');
const cancelAddPartidaBtn = document.getElementById('cancelAddPartidaBtn');
const addPartidaForm = document.getElementById('addPartidaForm');

if (addPartidaBtn && addPartidaModal) {
    addPartidaBtn.addEventListener('click', () => {
        const parentCode = addPartidaBtn.dataset.parentCode;
        if (!parentCode) return;
        const parentConcept = parsedData.concepts[parentCode];
        if (!parentConcept) return;

        // Mostrar nombre del capítulo destino
        const parentDisplay = document.getElementById('addPartidaParentDisplay');
        if (parentDisplay) {
            parentDisplay.value = `${parentCode.replace(/#+\s*$/, '')} - ${parentConcept.summary || ''}`;
        }

        // Abrir modal
        addPartidaModal.style.display = 'flex';

        // Resetear y enfocar el primer input
        if (addPartidaForm) addPartidaForm.reset();
        setTimeout(() => {
            document.getElementById('addPartidaSummary')?.focus();
        }, 100);
    });
}

function closeAddPartidaModal() {
    if (addPartidaModal) {
        addPartidaModal.style.display = 'none';
    }
}

if (closeAddPartidaBtn) closeAddPartidaBtn.addEventListener('click', closeAddPartidaModal);
if (cancelAddPartidaBtn) cancelAddPartidaBtn.addEventListener('click', closeAddPartidaModal);
if (addPartidaModal) {
    addPartidaModal.addEventListener('click', (e) => {
        if (e.target === addPartidaModal) closeAddPartidaModal();
    });
}

if (addPartidaForm) {
    addPartidaForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const parentCode = addPartidaBtn.dataset.parentCode;
        const summary = document.getElementById('addPartidaSummary').value.trim();
        const qty = parseFloat(document.getElementById('addPartidaQty').value) || 0;
        const price = parseFloat(document.getElementById('addPartidaPrice').value) || 0;

        if (!parentCode || !summary) return;

        const parentConcept = parsedData.concepts[parentCode];
        if (!parentConcept) return;

        // Auto-generación de código (ej: 01.02.new1)
        const parentCodeClean = parentCode.replace(/#+\s*$/, '');
        let count = 1;
        let newCode = `${parentCodeClean}.new${count}`;
        while (parsedData.concepts[newCode]) {
            count++;
            newCode = `${parentCodeClean}.new${count}`;
        }

        // 1. Crear el objeto concepto
        parsedData.concepts[newCode] = {
            code: newCode,
            unit: 'ud',
            summary: summary,
            price: price,
            description: '',
            decomposition: [],
            measurements: [],
            category: 'PARTIDA_NEW',
            isNewPartida: true
        };

        // 2. Asociar como hijo en la descomposición del padre
        if (!Array.isArray(parentConcept.decomposition)) {
            parentConcept.decomposition = [];
        }
        parentConcept.decomposition.push({
            code: newCode,
            factor: qty,
            type: 4 // Generic subcontrato / simple item
        });

        // Si el padre tiene el array children auxiliar, sincronizar
        if (Array.isArray(parentConcept.children)) {
            parentConcept.children.push(newCode);
        }

        // Forzar recálculo
        parentConcept.isManualPrice = false;

        recalculateAll();
        saveHistoryState();
        closeAddPartidaModal();

        // Renderizar el árbol y seleccionar el nuevo elemento
        renderCurrentLevel();
        showDetails(newCode);
        updateTotalBudgetDisplay();

        // Enfocar el elemento recién creado en el árbol para dar feedback visual
        setTimeout(() => {
            const nodeContainer = document.querySelector(`.tree-node-container[data-code="${newCode}"]`);
            if (nodeContainer) {
                nodeContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
                const row = nodeContainer.querySelector('.tree-node-row');
                if (row) {
                    row.classList.add('active');
                    row.style.transition = 'background-color 0.3s';
                    const origBg = row.style.backgroundColor;
                    row.style.backgroundColor = 'var(--accent-glow, rgba(59, 130, 246, 0.15))';
                    setTimeout(() => {
                        row.style.backgroundColor = origBg;
                    }, 2000);
                }
            }
        }, 300);
    });
}


// =============================================================================
// Helper Functions for Inline Draft Partida Creation in the Tree
// =============================================================================

function createDraftNodeRow(depth) {
    const row = document.createElement('div');
    row.className = 'tree-node-row draft-node-row';
    row.style.backgroundColor = 'var(--accent-glow, rgba(59, 130, 246, 0.08))';
    row.style.borderLeft = '4px solid var(--accent, #3b82f6)';
    row.style.display = 'grid';
    row.style.alignItems = 'center';
    row.style.minHeight = '38px';

    if (window.columnWidths && window.columnWidths.length >= 6) {
        const w = window.columnWidths;
        row.style.gridTemplateColumns = `${w[0]}px ${w[1]}px 1fr ${w[2]}px ${w[3]}px ${w[4]}px ${w[5]}px`;
    } else {
        row.style.gridTemplateColumns = '190px 45px 1fr 80px 100px 180px 110px';
    }

    // 1. Column: Code (contains arrows and OK checkmark)
    const colCode = document.createElement('div');
    colCode.className = 'col-code';
    colCode.style.paddingLeft = (depth * 20 + 8) + 'px';
    colCode.style.display = 'flex';
    colCode.style.alignItems = 'center';
    colCode.style.gap = '4px';

    // Arrow and OK buttons wrapper
    const btnWrapper = document.createElement('div');
    btnWrapper.style.display = 'inline-flex';
    btnWrapper.style.alignItems = 'center';
    btnWrapper.style.gap = '2px';

    // Arrow Left button
    const btnLeft = document.createElement('button');
    btnLeft.type = 'button';
    btnLeft.innerHTML = '◀';
    btnLeft.className = 'draft-nav-btn';
    btnLeft.title = 'Subir de nivel (extraer)';
    btnLeft.style.cssText = 'background:none; border:none; cursor:pointer; font-size:11px; padding:2px; color:var(--text-secondary); font-weight:bold;';
    btnLeft.onclick = (e) => { e.stopPropagation(); moveDraftLeft(); };

    // Arrow Up button
    const btnUp = document.createElement('button');
    btnUp.type = 'button';
    btnUp.innerHTML = '▲';
    btnUp.className = 'draft-nav-btn';
    btnUp.title = 'Mover Arriba';
    btnUp.style.cssText = 'background:none; border:none; cursor:pointer; font-size:11px; padding:2px; color:var(--text-secondary); font-weight:bold;';
    btnUp.onclick = (e) => { e.stopPropagation(); moveDraftUp(); };

    // Arrow Down button
    const btnDown = document.createElement('button');
    btnDown.type = 'button';
    btnDown.innerHTML = '▼';
    btnDown.className = 'draft-nav-btn';
    btnDown.title = 'Mover Abajo';
    btnDown.style.cssText = 'background:none; border:none; cursor:pointer; font-size:11px; padding:2px; color:var(--text-secondary); font-weight:bold;';
    btnDown.onclick = (e) => { e.stopPropagation(); moveDraftDown(); };

    // Arrow Right button
    const btnRight = document.createElement('button');
    btnRight.type = 'button';
    btnRight.innerHTML = '▶';
    btnRight.className = 'draft-nav-btn';
    btnRight.title = 'Bajar de nivel (anidar)';
    btnRight.style.cssText = 'background:none; border:none; cursor:pointer; font-size:11px; padding:2px; color:var(--text-secondary); font-weight:bold;';
    btnRight.onclick = (e) => { e.stopPropagation(); moveDraftRight(); };

    // OK Button
    const btnConfirm = document.createElement('button');
    btnConfirm.type = 'button';
    btnConfirm.innerHTML = '✔️';
    btnConfirm.className = 'draft-confirm-btn';
    btnConfirm.title = 'Confirmar y Guardar Partida';
    btnConfirm.style.cssText = 'background:var(--success, #10b981); border:none; border-radius:4px; color:white; font-size:10px; cursor:pointer; padding:3px 6px; font-weight:bold; margin-left: 4px;';
    btnConfirm.onclick = (e) => { e.stopPropagation(); confirmDraftPartida(); };

    btnWrapper.appendChild(btnLeft);
    btnWrapper.appendChild(btnUp);
    btnWrapper.appendChild(btnDown);
    btnWrapper.appendChild(btnRight);
    btnWrapper.appendChild(btnConfirm);

    colCode.appendChild(btnWrapper);

    // 2. Column: Unit
    const colUnit = document.createElement('div');
    colUnit.className = 'col-unit';
    const inputUnit = document.createElement('input');
    inputUnit.type = 'text';
    inputUnit.value = draftNode.unit || 'ud';
    inputUnit.style.cssText = 'width:90%; padding:3px 4px; border:1px solid var(--border-color); border-radius:4px; font-size:12px; background:var(--bg-color); color:var(--text-primary); outline:none; text-align:center;';
    inputUnit.oninput = (e) => { draftNode.unit = e.target.value; };
    colUnit.appendChild(inputUnit);

    // 3. Column: Summary
    const colSummary = document.createElement('div');
    colSummary.className = 'col-summary';
    colSummary.style.display = 'flex';
    colSummary.style.alignItems = 'center';
    const inputSummary = document.createElement('input');
    inputSummary.type = 'text';
    inputSummary.id = 'draftInputSummary';
    inputSummary.placeholder = 'Resumen de la nueva partida (obligatorio)';
    inputSummary.value = draftNode.summary || '';
    inputSummary.style.cssText = 'width:98%; padding:3px 6px; border:1px solid var(--border-color); border-radius:4px; font-size:12px; background:var(--bg-color); color:var(--text-primary); outline:none;';
    inputSummary.oninput = (e) => {
        draftNode.summary = e.target.value;
        e.target.style.borderColor = ''; // clear error
    };
    colSummary.appendChild(inputSummary);

    // 4. Column: Quantity
    const colQty = document.createElement('div');
    colQty.className = 'col-quantity';
    const inputQty = document.createElement('input');
    inputQty.type = 'number';
    inputQty.id = 'draftInputQty';
    inputQty.placeholder = '0.00';
    inputQty.step = 'any';
    inputQty.value = draftNode.qty || '';
    inputQty.style.cssText = 'width:90%; padding:3px 4px; border:1px solid var(--border-color); border-radius:4px; font-size:12px; background:var(--bg-color); color:var(--text-primary); outline:none; text-align:right;';
    inputQty.oninput = (e) => {
        draftNode.qty = e.target.value;
        e.target.style.borderColor = '';
        updateDraftImporte();
    };
    colQty.appendChild(inputQty);

    // 5. Column: Price
    const colPrice = document.createElement('div');
    colPrice.className = 'col-price';
    const inputPrice = document.createElement('input');
    inputPrice.type = 'number';
    inputPrice.id = 'draftInputPrice';
    inputPrice.placeholder = '0.00';
    inputPrice.step = 'any';
    inputPrice.value = draftNode.price || '';
    inputPrice.style.cssText = 'width:90%; padding:3px 4px; border:1px solid var(--border-color); border-radius:4px; font-size:12px; background:var(--bg-color); color:var(--text-primary); outline:none; text-align:right;';
    inputPrice.oninput = (e) => {
        draftNode.price = e.target.value;
        e.target.style.borderColor = '';
        updateDraftImporte();
    };
    colPrice.appendChild(inputPrice);

    // 6. Column: Amount (calculated automatically)
    const colAmount = document.createElement('div');
    colAmount.className = 'col-amount';
    colAmount.id = 'draftDisplayAmount';
    colAmount.style.textAlign = 'right';
    colAmount.style.fontWeight = 'bold';
    colAmount.style.fontSize = '12px';
    colAmount.style.paddingRight = '8px';

    const qVal = parseFloat(draftNode.qty);
    const pVal = parseFloat(draftNode.price);
    if (!isNaN(qVal) && !isNaN(pVal)) {
        colAmount.textContent = (qVal * pVal).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
    } else {
        colAmount.textContent = '0,00 €';
    }

    const colProportion = document.createElement('div');
    colProportion.className = 'col-proportion';

    row.appendChild(colCode);
    row.appendChild(colUnit);
    row.appendChild(colSummary);
    row.appendChild(colQty);
    row.appendChild(colPrice);
    row.appendChild(colProportion);
    row.appendChild(colAmount);

    function updateDraftImporte() {
        const display = row.querySelector('#draftDisplayAmount');
        if (display) {
            const q = parseFloat(draftNode.qty);
            const p = parseFloat(draftNode.price);
            if (!isNaN(q) && !isNaN(p)) {
                display.textContent = (q * p).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
            } else {
                display.textContent = '0,00 €';
            }
        }
    }

    return row;
}

function confirmDraftPartida() {
    const summaryInput = document.getElementById('draftInputSummary');
    const qtyInput = document.getElementById('draftInputQty');
    const priceInput = document.getElementById('draftInputPrice');

    const summary = (draftNode.summary || '').trim();
    const qty = parseFloat(draftNode.qty);
    const price = parseFloat(draftNode.price);

    let hasError = false;

    if (!summary) {
        if (summaryInput) summaryInput.style.borderColor = '#ef4444';
        hasError = true;
    }
    if (isNaN(qty) || qty < 0) {
        if (qtyInput) qtyInput.style.borderColor = '#ef4444';
        hasError = true;
    }
    if (isNaN(price) || price < 0) {
        if (priceInput) priceInput.style.borderColor = '#ef4444';
        hasError = true;
    }

    if (hasError) {
        alert("Por favor, rellene todos los campos obligatorios resaltados en rojo con valores válidos.");
        return;
    }

    // Auto-generate code based on parent
    let parentCode = draftNode.parentCode;
    let newCode = '';

    if (parentCode === null) {
        // Root node
        let count = 1;
        newCode = `${String(count).padStart(2, '0')}#`;
        while (parsedData.concepts[newCode]) {
            count++;
            newCode = `${String(count).padStart(2, '0')}#`;
        }
    } else {
        const parentCodeClean = parentCode.replace(/#+\s*$/, '');
        let count = 1;
        newCode = `${parentCodeClean}.${String(count).padStart(2, '0')}`;
        while (parsedData.concepts[newCode]) {
            count++;
            newCode = `${parentCodeClean}.${String(count).padStart(2, '0')}`;
        }
    }

    const actionText = `Creación de partida: [${newCode.replace(/#+\s*$/, '')}] ${summary}`;
    const valueText = `${qty.toLocaleString('es-ES')} ${draftNode.unit || 'ud'} x ${price.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`;

    logChange(newCode.replace(/#+\s*$/, ''), actionText, '', valueText, () => {
        if (parentCode === null) {
            // Add to roots
            if (Array.isArray(parsedData.root_nodes)) {
                parsedData.root_nodes.splice(draftNode.index, 0, newCode);
            } else {
                parsedData.root_nodes = Object.values(parsedData.root_nodes);
                parsedData.root_nodes.splice(draftNode.index, 0, newCode);
            }
        } else {
            const parentConcept = parsedData.concepts[parentCode];
            if (parentConcept) {
                // Add to parent decomposition
                if (!Array.isArray(parentConcept.decomposition)) {
                    parentConcept.decomposition = [];
                }
                parentConcept.decomposition.splice(draftNode.index, 0, {
                    code: newCode,
                    factor: qty,
                    type: 4 // Subcontract / Simple node
                });

                if (Array.isArray(parentConcept.children)) {
                    parentConcept.children.push(newCode);
                }

                parentConcept.isManualPrice = false;
            }
        }

        // Create new concept
        parsedData.concepts[newCode] = {
            code: newCode,
            unit: draftNode.unit || 'ud',
            summary: summary,
            price: price,
            description: '',
            decomposition: [],
            measurements: [],
            category: 'PARTIDA_NEW',
            isNewPartida: true
        };
    });

    draftActive = false;

    // Clear draft fields
    draftNode.summary = '';
    draftNode.qty = '';
    draftNode.price = '';
    draftNode.unit = 'ud';

    renderCurrentLevel();
    updateTotalBudgetDisplay();

    // Highlight and focus newly created node
    setTimeout(() => {
        const nodeContainer = document.querySelector(`.tree-node-container[data-code="${newCode}"]`);
        if (nodeContainer) {
            nodeContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const row = nodeContainer.querySelector('.tree-node-row');
            if (row) {
                row.classList.add('active');
                row.style.transition = 'background-color 0.3s';
                const origBg = row.style.backgroundColor;
                row.style.backgroundColor = 'var(--accent-glow, rgba(59, 130, 246, 0.15))';
                setTimeout(() => {
                    row.style.backgroundColor = origBg;
                }, 2000);
            }
        }
    }, 300);
}

function getParentConceptCode(childCode) {
    for (const concept of Object.values(parsedData.concepts)) {
        if (Array.isArray(concept.decomposition)) {
            if (concept.decomposition.some(item => item.code === childCode)) {
                return concept.code;
            }
        }
        if (Array.isArray(concept.children)) {
            if (concept.children.includes(childCode)) {
                return concept.code;
            }
        }
    }
    return null;
}

function getSiblingCodes(parentCode) {
    if (parentCode === null) {
        return Array.isArray(parsedData.root_nodes) ? parsedData.root_nodes : Object.values(parsedData.root_nodes);
    }
    const parentConcept = parsedData.concepts[parentCode];
    if (!parentConcept) return [];
    return getConceptDecomposition(parentConcept).map(item => item.code);
}

function moveDraftUp() {
    if (draftNode.index > 0) {
        draftNode.index--;
        renderCurrentLevel();
    }
}

function moveDraftDown() {
    const siblings = getSiblingCodes(draftNode.parentCode);
    if (draftNode.index < siblings.length) {
        draftNode.index++;
        renderCurrentLevel();
    }
}

function moveDraftLeft() {
    if (draftNode.parentCode !== null) {
        const parentCode = draftNode.parentCode;
        const parentParentCode = getParentConceptCode(parentCode);
        const parentSiblings = getSiblingCodes(parentParentCode);
        const parentIndex = parentSiblings.indexOf(parentCode);

        draftNode.parentCode = parentParentCode;
        draftNode.depth = Math.max(0, draftNode.depth - 1);
        draftNode.index = parentIndex >= 0 ? parentIndex + 1 : 0;
        renderCurrentLevel();
    }
}

function moveDraftRight() {
    const siblings = getSiblingCodes(draftNode.parentCode);
    if (draftNode.index > 0) {
        const siblingAboveCode = siblings[draftNode.index - 1];
        const siblingAbove = parsedData.concepts[siblingAboveCode];
        if (siblingAbove) {
            draftNode.parentCode = siblingAboveCode;
            draftNode.depth = draftNode.depth + 1;
            const newSiblings = getSiblingCodes(siblingAboveCode);
            draftNode.index = newSiblings.length;
            renderCurrentLevel();
        }
    }
}


// =============================================================================
// Premium Feature: Change Audit Log and Economic Impact
// =============================================================================
window.auditLog = [];

function logChange(code, action, oldValue, newValue, applyChangeCallback) {
    const pemBefore = calculateTotalPEM();

    // Apply modification (which usually mutates parsedData)
    if (applyChangeCallback) applyChangeCallback();

    // Recalculate budget and update UI
    recalculateAll();
    updateTotalBudgetDisplay();

    const pemAfter = calculateTotalPEM();
    const impact = pemAfter - pemBefore;

    // Save history state
    saveHistoryState();

    // Push to audit log
    window.auditLog = window.auditLog || [];
    const timestamp = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    window.auditLog.push({
        timestamp,
        code,
        description: action,
        oldValue: oldValue || '',
        newValue: newValue || '',
        impact
    });

    updateAuditLogModal();

    // Re-render tree preserving scroll position
    const treeContent = document.getElementById('treeContent');
    const scrollPos = treeContent ? treeContent.scrollTop : 0;
    renderCurrentLevel();
    if (treeContent) treeContent.scrollTop = scrollPos;
}

function calculateTotalPEM() {
    if (!parsedData) return 0;
    const roots = Array.isArray(parsedData.root_nodes) ? parsedData.root_nodes : Object.values(parsedData.root_nodes);
    let total = 0;
    roots.forEach(rootCode => {
        const concept = parsedData.concepts[rootCode];
        if (!concept) return;
        const children = getConceptDecomposition(concept);
        children.forEach(child => {
            const childConcept = parsedData.concepts[child.code];
            if (childConcept) {
                total += (parseFloat(childConcept.price) || 0) * (parseFloat(child.factor) || 1);
            }
        });
    });
    if (total === 0) {
        // Fallback to roots direct sum
        roots.forEach(rootCode => {
            const concept = parsedData.concepts[rootCode];
            if (concept) {
                total += parseFloat(concept.price) || 0;
            }
        });
    }
    return total;
}

function updateAuditLogModal() {
    const tableBody = document.getElementById('auditTableBody');
    const totalDeviationEl = document.getElementById('auditTotalDeviation');
    const changesCountEl = document.getElementById('auditChangesCount');

    if (!tableBody) return;

    const logs = window.auditLog || [];
    if (changesCountEl) changesCountEl.textContent = logs.length;

    let totalDeviation = 0;

    if (logs.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 24px; font-style: italic;">No se han realizado modificaciones en esta sesión</td>
            </tr>
        `;
    } else {
        tableBody.innerHTML = logs.map(log => {
            totalDeviation += log.impact;
            const sign = log.impact > 0 ? '+' : '';
            const impactColor = log.impact > 0 ? '#ef4444' : (log.impact < 0 ? '#10b981' : 'var(--text-secondary)');
            const impactStr = log.impact === 0 ? '0,00 €' : `${sign}${log.impact.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`;

            return `
                <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 10px; color: var(--text-secondary);">${log.timestamp}</td>
                    <td style="padding: 10px; font-weight: 500; color: var(--text-primary);">${log.code}</td>
                    <td style="padding: 10px; color: var(--text-primary);">${log.description}</td>
                    <td style="padding: 10px; text-align: right; font-weight: bold; color: ${impactColor};">${impactStr}</td>
                </tr>
            `;
        }).join('');
    }

    if (totalDeviationEl) {
        const devSign = totalDeviation > 0 ? '+' : '';
        const devColor = totalDeviation > 0 ? '#ef4444' : (totalDeviation < 0 ? '#10b981' : 'var(--text-primary)');
        totalDeviationEl.textContent = `${devSign}${totalDeviation.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`;
        totalDeviationEl.style.color = devColor;
    }
}

// Wire Audit Log Modal Toggles
const auditLogBtn = document.getElementById('auditLogBtn');
const auditModal = document.getElementById('auditModal');
const closeAuditBtn = document.getElementById('closeAuditBtn');
const closeAuditOkBtn = document.getElementById('closeAuditOkBtn');
const clearAuditLogBtn = document.getElementById('clearAuditLogBtn');

if (auditLogBtn && auditModal) {
    auditLogBtn.onclick = () => {
        updateAuditLogModal();
        auditModal.style.display = 'flex';
        const setDrop = document.getElementById('settingsDropdown');
        if (setDrop) setDrop.classList.remove('show');
    };
}
if (closeAuditBtn) closeAuditBtn.onclick = () => { auditModal.style.display = 'none'; };
if (closeAuditOkBtn) closeAuditOkBtn.onclick = () => { auditModal.style.display = 'none'; };
if (clearAuditLogBtn) {
    clearAuditLogBtn.onclick = () => {
        if (confirm('¿Seguro que desea vaciar el historial de auditoría de esta sesión?')) {
            window.auditLog = [];
            updateAuditLogModal();
        }
    };
}
if (auditModal) {
    auditModal.addEventListener('click', (e) => {
        if (e.target === auditModal) auditModal.style.display = 'none';
    });
}


// =============================================================================
// Premium Feature: Certificaciones Mensuales de Obra
// =============================================================================
window.certifications = {};

function getConceptTotalQuantity(code) {
    if (!parsedData) return 0;
    let totalQty = 0;

    function traverse(parentCode, accumulatedQty) {
        const concept = parsedData.concepts[parentCode];
        if (!concept) return;

        const children = getConceptDecomposition(concept);
        children.forEach(child => {
            if (child.code === code) {
                totalQty += accumulatedQty * (parseFloat(child.factor) || 0);
            }
            traverse(child.code, accumulatedQty * (parseFloat(child.factor) || 1));
        });
    }

    const roots = Array.isArray(parsedData.root_nodes) ? parsedData.root_nodes : Object.values(parsedData.root_nodes);
    roots.forEach(rootCode => {
        if (rootCode === code) {
            totalQty = 1.0;
        } else {
            traverse(rootCode, 1.0);
        }
    });

    return totalQty || 1.0;
}

function renderCertificationsTable(concept) {
    const tableBody = document.getElementById('certTableBody');
    const totalQtyEl = document.getElementById('certTotalQty');
    const percentageEl = document.getElementById('certPercentage');
    const totalAmountEl = document.getElementById('certTotalAmount');
    const addBtn = document.getElementById('addCertificationBtn');

    if (!tableBody) return;

    const conceptCerts = window.certifications[concept.code] || {};

    let accumulated = 0;
    const months = Object.keys(conceptCerts).sort((a, b) => {
        const numA = parseInt(a.replace(/[^\d]/g, '')) || 0;
        const numB = parseInt(b.replace(/[^\d]/g, '')) || 0;
        return numA - numB;
    });

    if (months.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 12px; font-style: italic; color: var(--text-secondary);">No hay certificaciones registradas</td>
            </tr>
        `;
    } else {
        tableBody.innerHTML = months.map(m => {
            const qty = conceptCerts[m];
            accumulated += qty;
            const amount = qty * (parseFloat(concept.price) || 0);

            return `
                <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 8px; font-weight: 500; color: var(--text-primary);">${m}</td>
                    <td style="padding: 8px; text-align: right; color: var(--text-primary);">${qty.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                    <td style="padding: 8px; text-align: right; font-weight: 500; color: var(--text-primary);">${amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                    <td style="padding: 8px; text-align: center;">
                        <button type="button" class="gantt-action-btn" onclick="event.stopPropagation(); deleteCertification('${concept.code}', '${m}')" style="background: none; border: none; color: #ef4444; padding: 2px; font-size: 0.85rem; cursor: pointer;" title="Eliminar Certificación">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    const price = parseFloat(concept.price) || 0;
    const totalBudgetedQty = getConceptTotalQuantity(concept.code);
    const pct = totalBudgetedQty === 0 ? 0 : (accumulated / totalBudgetedQty) * 100;
    const certAmount = accumulated * price;

    if (totalQtyEl) totalQtyEl.textContent = `${accumulated.toLocaleString('es-ES', { minimumFractionDigits: 2 })} / ${totalBudgetedQty.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`;
    if (percentageEl) {
        percentageEl.textContent = pct.toFixed(1) + '%';
        if (pct > 100) percentageEl.style.color = '#ef4444';
        else if (pct === 100) percentageEl.style.color = '#10b981';
        else percentageEl.style.color = 'var(--text-primary)';
    }
    if (totalAmountEl) totalAmountEl.textContent = certAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' €';

    if (addBtn) {
        addBtn.onclick = () => {
            openCertEditModal(concept.code, totalBudgetedQty, accumulated);
        };
    }

    // Sincronizar Gantt progress
    try {
        if (window.ganttTasks && window.ganttTasks.length > 0) {
            const ganttTask = window.ganttTasks.find(t => t.id === concept.code);
            if (ganttTask) {
                window.ganttState[concept.code] = window.ganttState[concept.code] || { startWeek: 1, durationWeeks: 4 };
                window.ganttState[concept.code].progress = Math.min(100, Math.round(pct));
                ganttSave();
                recalculateParentProgress();
            }
        }
    } catch (e) {
        console.warn("Gantt progress sync warning:", e);
    }
}

function openCertEditModal(conceptCode, totalBudgetedQty, currentAccumulated) {
    const modal = document.getElementById('certEditModal');
    const form = document.getElementById('certEditForm');
    const monthSelect = document.getElementById('certMonthSelect');
    const qtyInput = document.getElementById('certQtyInput');
    const maxQtyHint = document.getElementById('certMaxQtyHint');

    if (!modal) return;

    qtyInput.value = '';
    const available = Math.max(0, totalBudgetedQty - currentAccumulated);
    if (maxQtyHint) maxQtyHint.textContent = `Cant. disponible: ${available.toLocaleString('es-ES', { minimumFractionDigits: 2 })} (Tot. presupuestada: ${totalBudgetedQty.toLocaleString('es-ES', { minimumFractionDigits: 2 })})`;

    qtyInput.value = Math.round(available * 100) / 100 || '';

    modal.style.display = 'flex';

    form.onsubmit = (e) => {
        e.preventDefault();
        const month = monthSelect.value;
        const qty = parseFloat(qtyInput.value) || 0;

        if (qty <= 0) {
            alert("La cantidad debe ser mayor que cero.");
            return;
        }

        window.certifications[conceptCode] = window.certifications[conceptCode] || {};
        window.certifications[conceptCode][month] = qty;

        const descriptionName = parsedData.properties.description || 'default';
        const certKey = `budget_certifications_${descriptionName.replace(/\s+/g, '_')}`;
        localStorage.setItem(certKey, JSON.stringify(window.certifications));

        modal.style.display = 'none';

        const concept = parsedData.concepts[conceptCode];
        if (concept) {
            renderCertificationsTable(concept);
        }
    };
}

function deleteCertification(conceptCode, month) {
    if (confirm(`¿Seguro que desea eliminar la certificación del ${month}?`)) {
        if (window.certifications[conceptCode]) {
            delete window.certifications[conceptCode][month];
            if (Object.keys(window.certifications[conceptCode]).length === 0) {
                delete window.certifications[conceptCode];
            }

            const descriptionName = parsedData.properties.description || 'default';
            const certKey = `budget_certifications_${descriptionName.replace(/\s+/g, '_')}`;
            localStorage.setItem(certKey, JSON.stringify(window.certifications));

            const concept = parsedData.concepts[conceptCode];
            if (concept) {
                renderCertificationsTable(concept);
            }
        }
    }
}

// Wire Cert Modal Close Controls
const closeCertEditBtn = document.getElementById('closeCertEditBtn');
const cancelCertEditBtn = document.getElementById('cancelCertEditBtn');
const certEditModal = document.getElementById('certEditModal');

if (closeCertEditBtn) closeCertEditBtn.onclick = () => { certEditModal.style.display = 'none'; };
if (cancelCertEditBtn) cancelCertEditBtn.onclick = () => { certEditModal.style.display = 'none'; };
if (certEditModal) {
    certEditModal.addEventListener('click', (e) => {
        if (e.target === certEditModal) certEditModal.style.display = 'none';
    });
}


// =============================================================================
// Premium Feature: Exportador de Gantt a MS Project XML
// =============================================================================
function exportGanttToXML() {
    if (!window.ganttTasks || window.ganttTasks.length === 0) {
        alert("No hay tareas de planificación para exportar.");
        return;
    }

    const currentFileName = document.getElementById('fileName')?.textContent || 'proyecto';
    const cleanFileName = currentFileName.replace(/\.[^/.]+$/, "").replace(/\s+/g, "_");

    let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Project xmlns="http://schemas.microsoft.com/project">
    <Name>${cleanFileName}</Name>
    <StartDate>${ganttStartDate}T08:00:00</StartDate>
    <Tasks>
`;

    window.ganttTasks.forEach((task, index) => {
        const uid = index + 1;
        const name = escapeXml(task.summary);
        const st = window.ganttState[task.id] || { startWeek: 1, durationWeeks: 4, progress: 0 };

        const taskStartDate = new Date(ganttStartDate);
        taskStartDate.setDate(taskStartDate.getDate() + (st.startWeek - 1) * 7);
        const startStr = taskStartDate.toISOString().split('T')[0] + 'T08:00:00';

        const taskFinishDate = new Date(taskStartDate);
        taskFinishDate.setDate(taskFinishDate.getDate() + (st.durationWeeks * 7));
        const finishStr = taskFinishDate.toISOString().split('T')[0] + 'T17:00:00';

        const durationHours = st.durationWeeks * 40;
        const durationStr = `PT${durationHours}H0M0S`;

        const isSummary = task.hasKids ? 1 : 0;
        const progress = st.progress || 0;

        const outlineLevel = task.depth;
        const outlineNumber = task.code;

        xml += `        <Task>
            <UID>${uid}</UID>
            <ID>${uid}</ID>
            <Name>${name}</Name>
            <Active>1</Active>
            <Manual>0</Manual>
            <Start>${startStr}</Start>
            <Finish>${finishStr}</Finish>
            <Duration>${durationStr}</Duration>
            <PercentComplete>${progress}</PercentComplete>
            <Summary>${isSummary}</Summary>
            <OutlineLevel>${outlineLevel}</OutlineLevel>
            <OutlineNumber>${outlineNumber}</OutlineNumber>
`;

        const taskDeps = window.ganttDeps ? window.ganttDeps.filter(d => d.to === task.id) : [];
        taskDeps.forEach(dep => {
            const predIndex = window.ganttTasks.findIndex(t => t.id === dep.from);
            if (predIndex >= 0) {
                const predUid = predIndex + 1;
                xml += `            <PredecessorLink>
                <PredecessorUID>${predUid}</PredecessorUID>
                <Type>1</Type>
                <CrossProject>0</CrossProject>
                <LinkLag>0</LinkLag>
                <LagFormat>7</LagFormat>
            </PredecessorLink>
`;
            }
        });

        xml += `        </Task>\n`;
    });

    xml += `    </Tasks>
</Project>`;

    if (window.Capacitor && window.Capacitor.isPluginAvailable('Filesystem')) {
        const base64Xml = btoa(unescape(encodeURIComponent(xml)));
        saveAndShareNativeFile(base64Xml, `${cleanFileName}_planning.xml`);
    } else {
        const blob = new Blob([xml], { type: 'application/xml' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${cleanFileName}_planning.xml`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

function escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });
}



// Wire Project XML Export Button
const exportGanttXmlBtn = document.getElementById('exportGanttXmlBtn');
if (exportGanttXmlBtn) {
    exportGanttXmlBtn.addEventListener('click', () => {
        const expDrop = document.getElementById('ganttExportDropdown');
        if (expDrop) expDrop.classList.remove('show');
        exportGanttToXML();
    });
}


// =============================================================================
// FEATURE: Modal Global de Certificaciones de Obra
// =============================================================================

/**
 * Calcula y renderiza el modal de resumen global de certificaciones.
 * Agrega todas las certificaciones de todas las partidas en window.certifications.
 */
function renderCertObrasModal() {
    if (!parsedData) return;

    const tbody = document.getElementById('certObrasTableBody');
    const kpiStrip = document.getElementById('certObrasKpiStrip');
    const globalPctEl = document.getElementById('certObrasGlobalPct');
    const progressBarEl = document.getElementById('certObrasProgressBar');
    if (!tbody) return;

    const certs = window.certifications || {};
    const certCodes = Object.keys(certs);

    // Recopilar datos de cada partida certificada
    const rows = [];
    let totalPresupuestado = 0;
    let totalCertificado = 0;
    let totalImpCertif = 0;
    let totalImpPresup = 0;

    certCodes.forEach(code => {
        const concept = parsedData.concepts[code];
        if (!concept) return;

        const conceptCerts = certs[code];
        let accumCertif = 0;
        Object.values(conceptCerts).forEach(qty => {
            accumCertif += parseFloat(qty) || 0;
        });

        const totalQty = getConceptTotalQuantity(code);
        const price = parseFloat(concept.price) || 0;
        const pct = totalQty === 0 ? 0 : (accumCertif / totalQty) * 100;
        const impCertif = accumCertif * price;
        const impPresup = totalQty * price;

        totalCertificado += accumCertif;
        totalPresupuestado += totalQty;
        totalImpCertif += impCertif;
        totalImpPresup += impPresup;

        rows.push({
            rawCode: code,
            code: code.replace(/#+\s*$/, ''),
            summary: concept.summary || '(Sin título)',
            unit: concept.unit || '',
            totalQty,
            accumCertif,
            pct,
            impCertif,
            impPresup
        });
    });

    // Ordenar por % avance descendente
    rows.sort((a, b) => b.pct - a.pct);

    // ── KPI Strip ──
    const globalPct = totalImpPresup === 0 ? 0 : (totalImpCertif / totalImpPresup) * 100;
    if (kpiStrip) {
        const kpis = [
            {
                icon: '✅',
                label: 'Partidas Certificadas',
                val: `${rows.length} / ${Object.keys(parsedData.concepts).filter(c => !c.endsWith('#')).length}`,
                color: '#3b82f6'
            },
            {
                icon: '💶',
                label: 'Importe Certificado',
                val: totalImpCertif.toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' €',
                color: '#10b981'
            },
            {
                icon: '📋',
                label: 'Importe Presupuestado',
                val: totalImpPresup.toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' €',
                color: 'var(--text-primary)'
            },
            {
                icon: '📈',
                label: 'Avance Económico',
                val: globalPct.toFixed(1) + '%',
                color: globalPct >= 100 ? '#10b981' : globalPct > 50 ? '#f59e0b' : '#3b82f6'
            }
        ];
        kpiStrip.innerHTML = kpis.map(k => `
            <div style="background: var(--bg-color); border: 1px solid var(--border-color); border-radius: 8px; padding: 10px 14px; text-align: center;">
                <span style="font-size: 1.3rem; display: block; margin-bottom: 4px;">${k.icon}</span>
                <span style="font-size: 0.7rem; color: var(--text-secondary); display: block; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.3px;">${k.label}</span>
                <span style="font-size: 0.95rem; font-weight: 700; color: ${k.color};">${k.val}</span>
            </div>
        `).join('');
    }

    // ── Barra de progreso global ──
    if (globalPctEl) globalPctEl.textContent = globalPct.toFixed(1) + '%';
    if (progressBarEl) {
        progressBarEl.style.width = Math.min(100, globalPct).toFixed(1) + '%';
        progressBarEl.style.background = globalPct >= 100
            ? 'linear-gradient(90deg, #10b981, #059669)'
            : globalPct > 50
                ? 'linear-gradient(90deg, #f59e0b, #10b981)'
                : 'linear-gradient(90deg, #3b82f6, #10b981)';
    }

    // ── Tabla de partidas ──
    if (rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 32px; color: var(--text-secondary); font-style: italic;">
            No hay certificaciones registradas.<br>
            <span style="font-size: 0.8rem;">Selecciona una partida en el árbol y usa el botón ➕ Certificar en el panel de detalles.</span>
        </td></tr>`;
    } else {
        tbody.innerHTML = rows.map((r, idx) => {
            const pctColor = r.pct >= 100 ? '#10b981' : r.pct >= 50 ? '#f59e0b' : '#3b82f6';
            const pctStr = r.pct.toFixed(1) + '%';
            const rowBg = idx % 2 === 1 ? 'background: var(--hover-bg, rgba(0,0,0,0.02));' : '';
            return `
                <tr style="${rowBg} border-bottom: 1px solid var(--border-color);" class="cert-obras-row"
                    data-search="${r.code.toLowerCase()} ${r.summary.toLowerCase()}">
                    <td style="padding: 9px 12px; font-family: monospace; font-size: 0.78rem; color: var(--accent); white-space: nowrap;">${r.code}</td>
                    <td style="padding: 9px 12px; color: var(--text-primary); max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${r.summary}">${r.summary}</td>
                    <td style="padding: 9px 8px; text-align: center; color: var(--text-secondary);">${r.unit}</td>
                    <td style="padding: 9px 8px; text-align: right; color: var(--text-secondary);">${r.totalQty.toLocaleString('es-ES', { minimumFractionDigits: 3 })}</td>
                    <td style="padding: 9px 8px; text-align: right; font-weight: 600; color: var(--text-primary);">${r.accumCertif.toLocaleString('es-ES', { minimumFractionDigits: 3 })}</td>
                    <td style="padding: 9px 8px; text-align: right;">
                        <span style="font-weight: 700; color: ${pctColor};">${pctStr}</span>
                        <div style="height: 4px; background: var(--border-color); border-radius: 99px; margin-top: 3px; overflow: hidden;">
                            <div style="height: 100%; width: ${Math.min(100, r.pct).toFixed(1)}%; background: ${pctColor}; border-radius: 99px;"></div>
                        </div>
                    </td>
                    <td style="padding: 9px 8px; text-align: right; font-weight: 600; color: #10b981;">${r.impCertif.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                    <td style="padding: 9px 8px; text-align: right; color: var(--text-secondary);">${r.impPresup.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                    <td style="padding: 9px 8px; text-align: center;">
                        <button type="button" onclick="deleteCertObrasRow('${r.rawCode}')"
                            title="Eliminar todas las certificaciones de esta partida"
                            style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:0.85rem; padding:2px 4px;">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // ── Filtro de búsqueda ──
    const filterInput = document.getElementById('certObrasFilter');
    if (filterInput) {
        filterInput.oninput = () => {
            const term = filterInput.value.trim().toLowerCase();
            document.querySelectorAll('.cert-obras-row').forEach(row => {
                const search = row.dataset.search || '';
                row.style.display = term === '' || search.includes(term) ? '' : 'none';
            });
        };
        // Limpiar filtro previo
        filterInput.value = '';
    }
}

// ── Event Listeners del botón CERTIFICACIONES ──
const certObrasBtn = document.getElementById('certObrasBtn');
const certObrasModal = document.getElementById('certObrasModal');
const closeCertObrasBtn = document.getElementById('closeCertObrasBtn');

if (certObrasBtn && certObrasModal) {
    certObrasBtn.addEventListener('click', () => {
        renderCertObrasModal();
        certObrasModal.style.display = 'flex';
        // Inicializar el buscador de partidas
        initCertObrasSearchPanel();
    });
}

if (closeCertObrasBtn) {
    closeCertObrasBtn.addEventListener('click', () => {
        certObrasModal.style.display = 'none';
    });
}

if (certObrasModal) {
    certObrasModal.addEventListener('click', (e) => {
        if (e.target === certObrasModal) certObrasModal.style.display = 'none';
    });
}

// ── Lógica del Panel de Nueva Certificación ──
let _certObrasSelectedCode = null; // código de la partida seleccionada en el buscador

function initCertObrasSearchPanel() {
    const searchInput = document.getElementById('certObrasSearchInput');
    const dropdown = document.getElementById('certObrasDropdown');
    const selectedLabel = document.getElementById('certObrasSelectedPartida');
    const unitLabel = document.getElementById('certObrasUnitLabel');
    const qtyHint = document.getElementById('certObrasQtyHint');
    const qtyInput = document.getElementById('certObrasQtyInput');
    const addBtn = document.getElementById('certObrasAddBtn');

    if (!searchInput) return;

    // Reset
    _certObrasSelectedCode = null;
    searchInput.value = '';
    if (selectedLabel) { selectedLabel.style.display = 'none'; selectedLabel.textContent = ''; }
    if (unitLabel) unitLabel.textContent = '';
    if (qtyHint) qtyHint.textContent = '';
    if (qtyInput) qtyInput.value = '';

    function getLeafPartidas() {
        // Devuelve todas las partidas hoja (con precio, sin categoría de capítulo)
        if (!parsedData) return [];
        return Object.values(parsedData.concepts).filter(c => {
            const cat = (c.category || '').toUpperCase();
            return !cat.includes('CHAPTER') && !cat.includes('ROOT') && !c.code.endsWith('#') &&
                (c.price !== undefined && c.price !== null);
        });
    }

    function showDropdown(term) {
        if (!dropdown) return;
        const lower = term.toLowerCase();
        const matches = getLeafPartidas().filter(c => {
            const code = (c.code || '').toLowerCase().replace(/#+\s*$/, '');
            const summary = (c.summary || '').toLowerCase();
            return code.includes(lower) || summary.includes(lower);
        }).slice(0, 12);

        if (matches.length === 0 || term.length < 2) {
            dropdown.style.display = 'none';
            return;
        }

        dropdown.innerHTML = matches.map(c => {
            const code = c.code.replace(/#+\s*$/, '');
            return `
                <div class="cert-search-item" data-code="${c.code}"
                    style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid var(--border-color); font-size: 0.8rem; display: flex; gap: 10px; align-items: center;"
                    onmouseenter="this.style.background='var(--hover-bg)'"
                    onmouseleave="this.style.background=''"
                    onclick="selectCertObrasPartida('${c.code}')"
                >
                    <span style="font-family: monospace; color: var(--accent); flex-shrink: 0; font-size: 0.75rem;">${code}</span>
                    <span style="color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${c.summary || ''}">${c.summary || '(Sin título)'}</span>
                    <span style="color: var(--text-secondary); flex-shrink: 0; font-size: 0.75rem;">${(parseFloat(c.price) || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €/${c.unit || 'ud'}</span>
                </div>
            `;
        }).join('');
        dropdown.style.display = 'block';
    }

    let _searchTimer;
    searchInput.oninput = () => {
        _certObrasSelectedCode = null;
        if (selectedLabel) { selectedLabel.style.display = 'none'; }
        if (unitLabel) unitLabel.textContent = '';
        if (qtyHint) qtyHint.textContent = '';
        clearTimeout(_searchTimer);
        _searchTimer = setTimeout(() => showDropdown(searchInput.value.trim()), 180);
    };

    // Cerrar dropdown al hacer clic fuera
    document.addEventListener('click', function closeDrop(e) {
        if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    }, { once: false });

    // Botón Certificar
    if (addBtn) {
        addBtn.onclick = () => submitCertObras();
    }
}

function selectCertObrasPartida(code) {
    const concept = parsedData && parsedData.concepts[code];
    if (!concept) return;

    _certObrasSelectedCode = code;

    const searchInput = document.getElementById('certObrasSearchInput');
    const dropdown = document.getElementById('certObrasDropdown');
    const selectedLabel = document.getElementById('certObrasSelectedPartida');
    const unitLabel = document.getElementById('certObrasUnitLabel');
    const qtyHint = document.getElementById('certObrasQtyHint');
    const qtyInput = document.getElementById('certObrasQtyInput');

    const cleanCode = code.replace(/#+\s*$/, '');
    if (searchInput) searchInput.value = `${cleanCode} — ${concept.summary || ''}`;
    if (dropdown) dropdown.style.display = 'none';

    const totalQty = getConceptTotalQuantity(code);
    const certs = window.certifications[code] || {};
    const accumulated = Object.values(certs).reduce((s, v) => s + (parseFloat(v) || 0), 0);
    const available = Math.max(0, totalQty - accumulated);

    if (selectedLabel) {
        selectedLabel.textContent = `✅ Seleccionada | Total presup.: ${totalQty.toLocaleString('es-ES', { minimumFractionDigits: 3 })} ${concept.unit || ''} | Certificado: ${accumulated.toLocaleString('es-ES', { minimumFractionDigits: 3 })} | Disponible: ${available.toLocaleString('es-ES', { minimumFractionDigits: 3 })}`;
        selectedLabel.style.display = 'block';
    }
    if (unitLabel) unitLabel.textContent = `(${concept.unit || 'ud'})`;
    if (qtyHint) qtyHint.textContent = `Disponible: ${available.toLocaleString('es-ES', { minimumFractionDigits: 3 })}`;
    if (qtyInput) {
        qtyInput.value = available > 0 ? (Math.round(available * 1000) / 1000) : '';
        qtyInput.focus();
    }
}

function submitCertObras() {
    if (!_certObrasSelectedCode) {
        alert('Selecciona primero una partida del buscador.');
        return;
    }
    const qtyInput = document.getElementById('certObrasQtyInput');
    const monthSelect = document.getElementById('certObrasMonthSelect');
    const qty = parseFloat(qtyInput && qtyInput.value);
    const month = monthSelect ? monthSelect.value : 'Mes 1';

    if (isNaN(qty) || qty <= 0) {
        alert('Introduce una cantidad mayor que cero.');
        qtyInput && (qtyInput.style.borderColor = '#ef4444');
        return;
    }
    if (qtyInput) qtyInput.style.borderColor = '';

    // Guardar certificación
    window.certifications[_certObrasSelectedCode] = window.certifications[_certObrasSelectedCode] || {};
    // Si ya existe ese mes, sumar (no reemplazar)
    const prev = parseFloat(window.certifications[_certObrasSelectedCode][month]) || 0;
    window.certifications[_certObrasSelectedCode][month] = prev + qty;

    // Persistir en localStorage
    const descriptionName = (parsedData.properties && parsedData.properties.description) || 'default';
    const certKey = `budget_certifications_${descriptionName.replace(/\s+/g, '_')}`;
    localStorage.setItem(certKey, JSON.stringify(window.certifications));

    // Actualizar modal
    _certObrasSelectedCode = null;
    const searchInput = document.getElementById('certObrasSearchInput');
    if (searchInput) searchInput.value = '';
    const selectedLabel = document.getElementById('certObrasSelectedPartida');
    if (selectedLabel) selectedLabel.style.display = 'none';
    if (qtyInput) qtyInput.value = '';
    const unitLabel = document.getElementById('certObrasUnitLabel');
    if (unitLabel) unitLabel.textContent = '';
    const qtyHint = document.getElementById('certObrasQtyHint');
    if (qtyHint) qtyHint.textContent = '';

    renderCertObrasModal();

    // Feedback visual breve
    const addBtn = document.getElementById('certObrasAddBtn');
    if (addBtn) {
        const orig = addBtn.innerHTML;
        addBtn.innerHTML = '✔ Guardado!';
        addBtn.style.background = '#059669';
        setTimeout(() => {
            addBtn.innerHTML = orig;
            addBtn.style.background = '';
        }, 1800);
    }
}

function deleteCertObrasRow(code) {
    if (!code || !window.certifications[code]) return;
    const concept = parsedData && parsedData.concepts[code];
    const label = concept ? concept.summary : code;
    if (confirm(`¿Eliminar TODAS las certificaciones de la partida "${label}"?`)) {
        delete window.certifications[code];
        const descriptionName = (parsedData.properties && parsedData.properties.description) || 'default';
        const certKey = `budget_certifications_${descriptionName.replace(/\s+/g, '_')}`;
        localStorage.setItem(certKey, JSON.stringify(window.certifications));
        renderCertObrasModal();
    }
}

// ── Exportar a FIEBDC-3 (.bc3) con cambios aplicados ──
function exportToBC3() {
    if (!parsedData) return;

    let out = [];

    // 1. Cabecera V
    const owner = parsedData.properties.owner || "BC3 Viewer Premium";
    const format = parsedData.properties.format || "FIEBDC-3/2004";
    const generator = parsedData.properties.generator || "BC3 Viewer Premium";
    const desc = parsedData.properties.description || "";
    const charset = parsedData.properties.charset || "ANSI";
    out.push(`~V|${owner}|${format}|${generator}|${desc}|${charset}|`);

    // 2. Coeficientes / Divisa
    out.push(`~K|\\2\\2\\2\\2\\2\\2\\2\\EUR\\||`);

    // 3. Conceptos (~C)
    // Usamos el estándar oficial ~C para garantizar compatibilidad con programas de mediciones
    Object.values(parsedData.concepts).forEach(c => {
        if (!c.code) return;
        const code = c.code;
        const unit = c.unit || "";
        const summary = c.summary || "";
        const price = (parseFloat(c.price) || 0).toString().replace('.', ',');
        const date = c.date || "010126";
        const type = c.type !== undefined ? c.type : 0;
        out.push(`~C|${code}|${unit}|${summary}|${price}|${date}|${type}|`);
    });

    // 4. Descomposiciones (~D)
    Object.values(parsedData.concepts).forEach(c => {
        if (c.decomposition && c.decomposition.length > 0) {
            let decompParts = [];
            c.decomposition.forEach(item => {
                const factorStr = (parseFloat(item.factor) || 1.0).toString().replace('.', ',');
                const typeVal = item.type !== undefined ? item.type : 0;
                decompParts.push(`${item.code}\\${factorStr}\\${typeVal}`);
            });
            out.push(`~D|${c.code}|${decompParts.join('\\')}|`);
        }
    });

    // 5. Descripciones / Textos (~T)
    Object.values(parsedData.concepts).forEach(c => {
        if (c.description) {
            out.push(`~T|${c.code}|${c.description}|`);
        }
    });

    // Unir con saltos de línea estándar de Windows CRLF
    const text = out.join("\r\n");

    const baseName = currentFileName.replace(/\.[^/.]+$/, "") + "_modificado.bc3";
    if (window.Capacitor && window.Capacitor.isPluginAvailable('Filesystem')) {
        const base64Bc3 = btoa(unescape(encodeURIComponent(text)));
        saveAndShareNativeFile(base64Bc3, baseName);
    } else {
        const blob = new Blob([text], { type: 'text/plain;charset=ansi' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = baseName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// ── Lógica del Panel de Capítulos ──
function getChaptersList() {
    if (!parsedData) return [];
    const roots = Array.isArray(parsedData.root_nodes) ? parsedData.root_nodes : Object.values(parsedData.root_nodes);
    let chapters = [];

    if (roots.length > 1) {
        roots.forEach(code => {
            const concept = parsedData.concepts[code];
            if (concept) chapters.push({ concept, factor: 1.0 });
        });
    } else if (roots.length === 1) {
        const root = parsedData.concepts[roots[0]];
        if (root) {
            const children = getConceptDecomposition(root);
            if (children && children.length > 0) {
                children.forEach(ch => {
                    const concept = parsedData.concepts[ch.code];
                    if (concept) chapters.push({ concept, factor: parseFloat(ch.factor) || 1.0 });
                });
            } else {
                chapters.push({ concept: root, factor: 1.0 });
            }
        }
    }
    return chapters;
}

function accumulateChapterResources(conceptCode) {
    let mo = 0, maq = 0, mat = 0, sub = 0, etc = 0, total = 0;

    function traverse(code, qty) {
        const concept = parsedData.concepts[code];
        if (!concept) return;

        const isChapter = concept.code.endsWith('#') || concept.is_root;
        const kids = getConceptDecomposition(concept);

        if (isChapter && kids.length > 0) {
            kids.forEach(child => {
                traverse(child.code, qty * (parseFloat(child.factor) || 1.0));
            });
        } else {
            const price = parseFloat(concept.price) || 0;
            const cost = price * qty;

            if (concept.decomposition && concept.decomposition.length > 0) {
                concept.decomposition.forEach(item => {
                    const childConcept = parsedData.concepts[item.code];
                    const childPrice = childConcept ? (parseFloat(childConcept.price) || 0) : 0;
                    const itemFactor = parseFloat(item.factor) || 0;
                    const resourceCost = itemFactor * childPrice * qty;

                    const itemType = item.type; // 1=MO, 2=MAQ, 3=MAT, 4=SUB
                    if (itemType === 1) mo += resourceCost;
                    else if (itemType === 2) maq += resourceCost;
                    else if (itemType === 3) mat += resourceCost;
                    else if (itemType === 4) sub += resourceCost;
                    else etc += resourceCost;
                });
            } else {
                sub += cost;
            }
        }
    }

    traverse(conceptCode, 1.0);
    total = mo + maq + mat + sub + etc;
    return { mo, maq, mat, sub, etc, total };
}



// ── Exportar Certificación Mensual a PDF ──
function exportCertPDF() {
    const monthSelect = document.getElementById('certObrasMonthPdfSelect');
    const selectedMonth = monthSelect ? monthSelect.value : 'all';

    const printArea = document.getElementById('certPrintArea');
    if (!printArea) return;

    const projectTitle = document.getElementById('projectTitle')?.textContent || 'Proyecto';
    const currentDate = new Date().toLocaleDateString('es-ES');

    const certs = window.certifications || {};
    const certCodes = Object.keys(certs);

    let html = `
        <div class="cert-print-header">
            <h1 class="cert-print-title">CERTIFICACIÓN DE OBRA</h1>
            <div class="cert-print-meta">
                <strong>Proyecto:</strong> ${projectTitle}<br>
                <strong>Fecha de Emisión:</strong> ${currentDate}<br>
                <strong>Periodo:</strong> ${selectedMonth === 'all' ? 'Acumulado Total' : selectedMonth}
            </div>
        </div>
        <table>
            <thead>
                <tr>
                    <th style="width:100px;">Código</th>
                    <th>Partida / Unidad de Obra</th>
                    <th style="width:40px; text-align:center;">Ud</th>
                    <th style="width:80px; text-align:right;">P.U. (€)</th>
                    <th style="width:90px; text-align:right;">Cant. Presup.</th>
                    <th style="width:90px; text-align:right;">Cant. Certif.</th>
                    <th style="width:60px; text-align:right;">% Avance</th>
                    <th style="width:100px; text-align:right;">Imp. Certificado</th>
                </tr>
            </thead>
            <tbody>
    `;

    let totalPresup = 0;
    let totalCert = 0;

    certCodes.forEach(code => {
        const concept = parsedData.concepts[code];
        if (!concept) return;

        const conceptCerts = certs[code];
        let qtyCert = 0;

        if (selectedMonth === 'all') {
            Object.values(conceptCerts).forEach(val => {
                qtyCert += parseFloat(val) || 0;
            });
        } else {
            qtyCert = parseFloat(conceptCerts[selectedMonth]) || 0;
        }

        if (qtyCert === 0) return;

        const totalQty = getConceptTotalQuantity(code);
        const price = parseFloat(concept.price) || 0;
        const pct = totalQty === 0 ? 0 : (qtyCert / totalQty) * 100;
        const impCert = qtyCert * price;
        const impPresup = totalQty * price;

        totalPresup += impPresup;
        totalCert += impCert;

        html += `
            <tr>
                <td style="font-family:monospace; font-size:8pt;">${code.replace(/#+\s*$/, '')}</td>
                <td>${concept.summary || ''}</td>
                <td style="text-align:center;">${concept.unit || ''}</td>
                <td style="text-align:right;">${price.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                <td style="text-align:right;">${totalQty.toLocaleString('es-ES', { minimumFractionDigits: 3 })}</td>
                <td style="text-align:right; font-weight:bold;">${qtyCert.toLocaleString('es-ES', { minimumFractionDigits: 3 })}</td>
                <td style="text-align:right;">${pct.toFixed(1)}%</td>
                <td style="text-align:right; font-weight:bold; color:#059669;">${impCert.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
            </tr>
        `;
    });

    if (totalCert === 0) {
        html += `
            <tr>
                <td colspan="8" style="text-align:center; padding: 24px; font-style: italic; color: #64748b;">
                    No hay certificaciones registradas para el periodo seleccionado.
                </td>
            </tr>
        `;
    }

    html += `
            <tr class="cert-print-total-row">
                <td colspan="4" style="text-align:right;">TOTALES</td>
                <td style="text-align:right;">-</td>
                <td style="text-align:right;">-</td>
                <td style="text-align:right;">${totalPresup === 0 ? '0.0' : ((totalCert / totalPresup) * 100).toFixed(1)}%</td>
                <td style="text-align:right;">${totalCert.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
            </tr>
        </tbody>
        </table>
        
        <div class="cert-print-footer">
            <div>
                <strong>EL CONTRATISTA</strong>
                <div class="sign-box" style="margin-top:8px;">Firma y Sello</div>
            </div>
            <div>
                <strong>LA DIRECCIÓN FACULTATIVA</strong>
                <div class="sign-box" style="margin-top:8px;">Firma y Sello</div>
            </div>
        </div>
    `;

    printArea.innerHTML = html;
    window.print();
}

const exportCertPdfBtn = document.getElementById('exportCertPdfBtn');
if (exportCertPdfBtn) {
    exportCertPdfBtn.addEventListener('click', () => {
        exportCertPDF();
    });
}

function syncHeaderToggleBtn() {
    const expandHeaderBtn = document.getElementById('expandHeaderBtn');
    if (!expandHeaderBtn) return;
    const planningModal = document.getElementById('planningModal');
    if (planningModal && planningModal.style.display !== 'none') {
        const details = document.querySelector('#ganttSummaryBar .gantt-summary-details');
        const isOpen = details ? details.hasAttribute('open') : false;
        expandHeaderBtn.textContent = isOpen ? '🔼' : '🔽';
        expandHeaderBtn.title = isOpen ? 'Ocultar Resumen' : 'Mostrar Resumen';
    } else {
        const mainHeader = document.querySelector('.main-header');
        if (mainHeader) {
            const isCollapsed = mainHeader.classList.contains('collapsed');
            expandHeaderBtn.textContent = isCollapsed ? '🔽' : '🔼';
            expandHeaderBtn.title = isCollapsed ? 'Mostrar Cabecera' : 'Ocultar Cabecera';
        }
    }
}

// Escuchar cambios de apertura/cierre de la sección de plazos del Gantt para sincronizar el FAB
document.addEventListener('toggle', (e) => {
    if (e.target && e.target.classList.contains('gantt-summary-details')) {
        syncHeaderToggleBtn();
    }
}, true); // Fase de captura porque 'toggle' no burbujea

// Lógica de colapsar y expandir cabecera (Optimización móvil)
const expandHeaderBtn = document.getElementById('expandHeaderBtn');
const mainHeader = document.querySelector('.main-header');

if (expandHeaderBtn && mainHeader) {
    expandHeaderBtn.addEventListener('click', () => {
        const planningModal = document.getElementById('planningModal');
        if (planningModal && planningModal.style.display !== 'none') {
            const details = document.querySelector('#ganttSummaryBar .gantt-summary-details');
            if (details) {
                const isOpen = details.hasAttribute('open');
                if (isOpen) {
                    details.removeAttribute('open');
                } else {
                    details.setAttribute('open', '');
                }
            }
        } else {
            mainHeader.classList.toggle('collapsed');
            syncHeaderToggleBtn();
        }
    });
}

// Lógica para alternar la barra de filtros en móviles
const toggleFilterBarBtn = document.getElementById('toggleFilterBarBtn');
const filterBar = document.querySelector('.filter-bar') || document.getElementById('filterBar');
if (toggleFilterBarBtn && filterBar) {
    toggleFilterBarBtn.addEventListener('click', () => {
        const isVisible = filterBar.classList.toggle('visible');
        if (isVisible) {
            filterBar.style.setProperty('display', 'flex', 'important');
            toggleFilterBarBtn.textContent = '✕';
        } else {
            filterBar.style.setProperty('display', 'none', 'important');
            toggleFilterBarBtn.textContent = '🎛️';
        }
    });
}

// ==========================================================================
// Lógica de Actualizaciones en Caliente (OTA / Live Updates) para Android
// ==========================================================================

function logOta(message, error = null) {
    const timestamp = new Date().toLocaleTimeString();
    let logMsg = `[${timestamp}] ${message}`;
    if (error) {
        logMsg += ` | Error: ${error.message || error}`;
    }
    console.log(logMsg);
    let logs = [];
    try {
        logs = JSON.parse(localStorage.getItem('ota_logs') || '[]');
    } catch (e) {}
    logs.push(logMsg);
    if (logs.length > 50) logs.shift();
    localStorage.setItem('ota_logs', JSON.stringify(logs));
    renderOtaLogs();
}

function renderOtaLogs() {
    const otaLogsContainer = document.getElementById('otaLogsContainer');
    if (otaLogsContainer) {
        try {
            const logs = JSON.parse(localStorage.getItem('ota_logs') || '[]');
            otaLogsContainer.textContent = logs.length > 0 ? logs.join('\n') : 'No hay registros disponibles.';
        } catch (e) {
            otaLogsContainer.textContent = 'Error al leer registros.';
        }
    }
}

async function initializeUpdater() {
    logOta("Iniciando actualizador OTA...");
    renderOtaLogs();

    // Hook listeners para interfaz manual en modal de información
    const manualBtn = document.getElementById('manualCheckUpdateBtn');
    if (manualBtn) {
        manualBtn.onclick = () => checkForUpdates(true);
    }
    const clearBtn = document.getElementById('clearOtaLogsBtn');
    if (clearBtn) {
        clearBtn.onclick = () => {
            localStorage.removeItem('ota_logs');
            renderOtaLogs();
        };
    }

    if (!window.Capacitor) {
        logOta("Capacitor no disponible (entorno web estándar)");
        return;
    }
    if (!window.Capacitor.Plugins) {
        logOta("Capacitor.Plugins no disponible");
        return;
    }
    if (!window.Capacitor.Plugins.CapacitorUpdater) {
        logOta("Plugin CapacitorUpdater NO disponible en el build nativo");
        return;
    }

    const { CapacitorUpdater } = window.Capacitor.Plugins;

    try {
        logOta("Llamando a notifyAppReady()...");
        await CapacitorUpdater.notifyAppReady();
        logOta("notifyAppReady() completado con éxito");
    } catch (e) {
        logOta("Error en notifyAppReady()", e);
    }

    // Iniciar verificación silenciosa de actualización en segundo plano
    setTimeout(checkForUpdates, 3000); // Esperar 3 segundos después del inicio
}

async function checkForUpdates(isManual = false) {
    const statusDiv = document.getElementById('manualUpdateStatus');
    const updateStatus = (text, isError = false) => {
        if (statusDiv) {
            statusDiv.textContent = text;
            statusDiv.style.color = isError ? 'var(--danger, #ef4444)' : 'var(--accent, #0284c7)';
        }
    };

    updateStatus("Buscando actualizaciones...");

    const isWindowsTauri = !!(window.__TAURI__ || window.__TAURI_METADATA__ || window.__TAURI_IPC__);

    if (!window.Capacitor || !window.Capacitor.Plugins || !window.Capacitor.Plugins.CapacitorUpdater) {
        if (isWindowsTauri) {
            logOta("Entorno Windows (Tauri) detectado. Buscando actualización...");
        } else {
            logOta("No disponible para entorno web estándar");
            updateStatus("No disponible en navegador web.", true);
            return;
        }
    }

    const updateUrls = [
        "https://jmcaamanog.github.io/BC3Viewer-App/update.json",
        "https://raw.githubusercontent.com/jmcaamanog/BC3Viewer-App/main/update.json"
    ];

    let updateInfo = null;
    let fetchError = null;

    for (const uUrl of updateUrls) {
        try {
            logOta(`Consultando update.json en: ${uUrl}`);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            const response = await fetch(uUrl, {
                signal: controller.signal,
                cache: 'no-store'
            });
            clearTimeout(timeoutId);

            if (response.ok) {
                updateInfo = await response.json();
                logOta(`Respuesta correcta de ${uUrl}: versión=${updateInfo.version}`);
                break;
            } else {
                logOta(`HTTP ${response.status} en ${uUrl}`);
            }
        } catch (e) {
            fetchError = e;
            logOta(`Fallo al consultar ${uUrl}`, e);
        }
    }

    if (!updateInfo) {
        updateStatus(`Fallo de conexión al buscar versión (${fetchError?.message || 'Error de red'})`, true);
        return;
    }

    logOta(`Parsed update.json: servidor=${updateInfo.version}, local=${APP_VERSION}`);

    if (updateInfo.version && updateInfo.version !== APP_VERSION) {
        if (isWindowsTauri) {
            logOta(`Nueva versión detectada para Windows: V${updateInfo.version}`);
            updateStatus(`Nueva versión V${updateInfo.version} disponible.`, false);
            
            // Si es consulta manual (o automática proactiva en Windows), preguntar
            const confirmDownload = confirm(`Hay una nueva versión de BC3 Viewer disponible (V${updateInfo.version}).\n¿Deseas descargar el instalador de Windows para actualizar la aplicación?`);
            if (confirmDownload) {
                window.open("https://github.com/jmcaamanog/BC3Viewer-App/raw/main/PROGRAMAS/BC3_Viewer_Windows_Installer.exe", "_blank");
                updateStatus(`Descargando instalador de Windows...`, false);
            }
        } else {
            const { CapacitorUpdater } = window.Capacitor.Plugins;
            logOta(`Nueva versión detectada: V${updateInfo.version}. Iniciando descarga...`);
            updateStatus(`Nueva versión V${updateInfo.version} encontrada. Descargando...`);

            const downloadUrls = [
                updateInfo.url,
                "https://raw.githubusercontent.com/jmcaamanog/BC3Viewer-App/main/dist.zip",
                "https://jmcaamanog.github.io/BC3Viewer-App/dist.zip"
            ].filter(Boolean);

            let downloadResult = null;
            let downloadError = null;

            for (const dlUrl of downloadUrls) {
                try {
                    logOta(`Descargando paquete OTA desde: ${dlUrl}`);
                    downloadResult = await CapacitorUpdater.download({
                        url: dlUrl,
                        version: updateInfo.version
                    });
                    if (downloadResult) {
                        logOta(`Descarga exitosa desde ${dlUrl}`);
                        break;
                    }
                } catch (dlErr) {
                    downloadError = dlErr;
                    logOta(`Fallo al descargar desde ${dlUrl}`, dlErr);
                }
            }

            if (!downloadResult) {
                updateStatus(`Error en descarga OTA: ${downloadError?.message || 'No se pudo obtener el archivo'}`, true);
                return;
            }

            try {
                logOta(`Descarga finalizada. Instalando versión ${updateInfo.version}...`);
                updateStatus(`Instalando versión V${updateInfo.version}...`);

                // Instalar/Establecer el nuevo bundle como la versión activa
                await CapacitorUpdater.set(downloadResult);
                logOta(`Nueva versión establecida correctamente.`);
                updateStatus(`¡Actualizado a V${updateInfo.version}!`, false);

                if (isManual) {
                    if (confirm(`✨ ¡Nueva versión V${updateInfo.version} instalada!\n¿Deseas reiniciar la aplicación ahora para aplicar los cambios?`)) {
                        if (typeof CapacitorUpdater.reload === 'function') {
                            await CapacitorUpdater.reload();
                        }
                    }
                } else {
                    showToastMessage(`✨ Aplicación actualizada a la versión V${updateInfo.version}. Se aplicará en el próximo inicio.`);
                }
            } catch (setErr) {
                logOta(`Error al aplicar el paquete OTA`, setErr);
                updateStatus(`Error al instalar: ${setErr.message || setErr}`, true);
            }
        }
    } else {
        logOta(`No se requiere actualizar (las versiones coinciden: V${APP_VERSION})`);
        updateStatus(`Ya tienes la versión más reciente (V${APP_VERSION}).`, false);
    }
}

// Función auxiliar para mostrar un Toast temporal y elegante
function showToastMessage(text) {
    const toast = document.createElement('div');
    toast.className = 'ota-toast';
    toast.textContent = text;

    // Estilos inline básicos para asegurar que sea visualmente profesional
    Object.assign(toast.style, {
        position: 'fixed',
        bottom: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: '#1e293b',
        color: '#ffffff',
        padding: '10px 16px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        fontSize: '0.75rem',
        fontWeight: '500',
        zIndex: '10005',
        textAlign: 'center',
        border: '1px solid var(--accent, #0ea5e9)',
        width: '85%',
        maxWidth: '300px',
        opacity: '0',
        transition: 'opacity 0.3s ease'
    });

    document.body.appendChild(toast);

    // Fade in
    setTimeout(() => {
        toast.style.opacity = '1';
    }, 100);

    // Fade out y remover después de 6 segundos
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 6000);
}

// Inicializar el sistema en segundo plano al cargar el script
initializeUpdater();

// Función para auto-cargar el último presupuesto guardado en localStorage
async function autoLoadLastBudget() {
    try {
        const lastContent = localStorage.getItem('last_bc3_content');
        const lastFilename = localStorage.getItem('last_bc3_filename');

        if (lastContent && lastFilename) {
            currentFileName = lastFilename;
            const fileNameEl = document.getElementById('fileName');
            if (fileNameEl) fileNameEl.textContent = currentFileName;
            const dropdownFileName = document.getElementById('dropdownFileName');
            if (dropdownFileName) dropdownFileName.textContent = currentFileName;

            showWorkerLoader("Restaurando último presupuesto...", lastFilename);
            const result = await parseWithWorker(lastContent);
            hideWorkerLoader();

            createBudgetTab(result, lastFilename, lastContent);
            console.log("Presupuesto auto-cargado desde localStorage en pestaña:", lastFilename);
        }
    } catch (e) {
        hideWorkerLoader();
        console.error("Error al auto-cargar el último presupuesto:", e);
    }
}

// Inicializar la carga automática al arrancar
autoLoadLastBudget();

// Comprobación de versión para mostrar notificación de actualización exitosa (sólo en móviles y tablets)
function checkUpdateNotification() {
    try {
        const lastShown = localStorage.getItem('last_shown_update_version');
        const isMobileOrTablet = window.innerWidth <= 1024 || window.Capacitor;

        if (isMobileOrTablet) {
            // Si la versión actual es diferente de la última mostrada (o si no se ha registrado aún)
            if (lastShown !== APP_VERSION) {
                const modal = document.getElementById('updateNotifyModal');
                const versionBadge = document.getElementById('updateNotifyVersion');
                const okBtn = document.getElementById('updateNotifyOkBtn');

                if (modal && versionBadge && okBtn) {
                    versionBadge.textContent = `V${APP_VERSION}`;
                    modal.style.setProperty('display', 'flex', 'important');

                    okBtn.onclick = () => {
                        modal.style.setProperty('display', 'none', 'important');
                        localStorage.setItem('last_shown_update_version', APP_VERSION);
                    };
                }
            }
        }
    } catch (e) {
        console.error("Error al comprobar la notificación de actualización:", e);
    }
}

// Ejecutar comprobación de actualización al iniciar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkUpdateNotification);
} else {
    checkUpdateNotification();
}

/**
 * Muestra un recuadro flotante en el centro con la información completa de la partida (long-press).
 */
function showGanttTaskPopup(task, st) {
    // Eliminar modales previos si los hubiera
    const oldModals = document.querySelectorAll('.gantt-popup-modal');
    oldModals.forEach(m => m.remove());

    const modal = document.createElement('div');
    modal.className = 'gantt-popup-modal';
    
    const content = document.createElement('div');
    content.className = 'gantt-popup-content';
    
    const title = document.createElement('h3');
    title.className = 'gantt-popup-title';
    title.textContent = task.summary;
    
    const body = document.createElement('div');
    body.className = 'gantt-popup-body';
    
    const isParent = task.hasKids;

    // Convertir semanas relativas a objetos de fecha locales
    const startD = weekToDate(st.startWeek);
    const endD = weekToDate(st.startWeek + st.durationWeeks);
    
    // Formato local YYYY-MM-DD para el input de tipo date
    const toISODate = (d) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const startDStr = toISODate(startD);
    const endDStr = toISODate(endD);

    // Crear el grid de tarjetas
    const grid = document.createElement('div');
    grid.className = 'gantt-popup-grid';

    // Tarjeta Importe (Ancho completo)
    const cardPrice = document.createElement('div');
    cardPrice.className = 'gantt-popup-card full-width';
    cardPrice.innerHTML = `
        <div class="popup-card-title">Importe de la Partida</div>
        <div class="popup-card-value">${task.price.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</div>
    `;
    grid.appendChild(cardPrice);

    // Tarjeta Inicio
    const cardStart = document.createElement('div');
    cardStart.className = 'gantt-popup-card';
    cardStart.innerHTML = `<div class="popup-card-title">Inicio</div>`;
    
    const inputStart = document.createElement('input');
    inputStart.type = 'date';
    inputStart.className = 'popup-card-input';
    inputStart.value = startDStr;
    if (isParent) {
        inputStart.disabled = true;
        inputStart.title = 'Los capítulos se calculan automáticamente';
    }
    inputStart.addEventListener('change', (e) => {
        const newD = new Date(e.target.value);
        if (isNaN(newD.getTime())) return;
        const newStartWeek = dateToWeek(newD);
        st.startWeek = Math.max(1, newStartWeek);
        
        recalculateParentProgress();
        ganttSave();
        rebuildGanttDOM();
        updatePlazoVal();
    });
    cardStart.appendChild(inputStart);
    grid.appendChild(cardStart);

    // Tarjeta Fin
    const cardEnd = document.createElement('div');
    cardEnd.className = 'gantt-popup-card';
    cardEnd.innerHTML = `<div class="popup-card-title">Fin</div>`;
    
    const inputEnd = document.createElement('input');
    inputEnd.type = 'date';
    inputEnd.className = 'popup-card-input';
    inputEnd.value = endDStr;
    if (isParent) {
        inputEnd.disabled = true;
        inputEnd.title = 'Los capítulos se calculan automáticamente';
    }
    inputEnd.addEventListener('change', (e) => {
        const newD = new Date(e.target.value);
        if (isNaN(newD.getTime())) return;
        const newEndWeek = dateToWeek(newD);
        const newDur = newEndWeek - st.startWeek;
        st.durationWeeks = Math.max(0.5, newDur);
        
        recalculateParentProgress();
        ganttSave();
        rebuildGanttDOM();
        updatePlazoVal();
    });
    cardEnd.appendChild(inputEnd);
    grid.appendChild(cardEnd);

    // Tarjeta Progreso (con botones + y -)
    const cardProgress = document.createElement('div');
    cardProgress.className = 'gantt-popup-card';
    cardProgress.innerHTML = `<div class="popup-card-title">Progreso</div>`;
    
    const progRow = document.createElement('div');
    progRow.className = 'popup-card-value-row';
    
    const btnDec = document.createElement('button');
    btnDec.type = 'button';
    btnDec.className = 'popup-card-btn';
    btnDec.textContent = '-';
    if (isParent) btnDec.disabled = true;
    
    const progValSpan = document.createElement('span');
    progValSpan.className = 'popup-card-value';
    progValSpan.textContent = (st.progress || 0) + '%';
    
    const btnInc = document.createElement('button');
    btnInc.type = 'button';
    btnInc.className = 'popup-card-btn';
    btnInc.textContent = '+';
    if (isParent) btnInc.disabled = true;
    
    btnDec.addEventListener('click', () => {
        const curr = st.progress || 0;
        const targetProg = Math.max(0, curr - 10);
        st.progress = targetProg;
        progValSpan.textContent = targetProg + '%';
        
        recalculateParentProgress();
        ganttSave();
        rebuildGanttDOM();
        updatePlazoVal();
    });
    
    btnInc.addEventListener('click', () => {
        const curr = st.progress || 0;
        const targetProg = Math.min(100, curr + 10);
        st.progress = targetProg;
        progValSpan.textContent = targetProg + '%';
        
        recalculateParentProgress();
        ganttSave();
        rebuildGanttDOM();
        updatePlazoVal();
    });
    
    progRow.appendChild(btnDec);
    progRow.appendChild(progValSpan);
    progRow.appendChild(btnInc);
    cardProgress.appendChild(progRow);
    grid.appendChild(cardProgress);

    // Tarjeta Plazo Restante
    const cardPlazo = document.createElement('div');
    cardPlazo.className = 'gantt-popup-card';
    cardPlazo.innerHTML = `<div class="popup-card-title">Plazo Restante</div>`;
    const plazoVal = document.createElement('div');
    plazoVal.className = 'popup-card-value';
    grid.appendChild(cardPlazo);

    // Tarjeta Enlace Anterior
    const cardPred = document.createElement('div');
    cardPred.className = 'gantt-popup-card';
    cardPred.innerHTML = `<div class="popup-card-title">Enlace Anterior</div>`;
    
    const selectPred = document.createElement('select');
    selectPred.className = 'popup-card-input';
    
    // Opción vacía
    const optNonePred = document.createElement('option');
    optNonePred.value = '';
    optNonePred.textContent = '(Ninguna)';
    selectPred.appendChild(optNonePred);
    
    // Rellenar con otras tareas
    const otherTasksPred = ganttTasks.filter(t => t.id !== task.id);
    otherTasksPred.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.summary;
        selectPred.appendChild(opt);
    });
    
    // Valor inicial
    const currentPred = ganttDeps.find(d => d.to === task.id);
    selectPred.value = currentPred ? currentPred.from : '';
    
    selectPred.addEventListener('change', (e) => {
        const val = e.target.value;
        ganttDeps = ganttDeps.filter(d => d.to !== task.id);
        
        if (val) {
            if (ganttDeps.some(d => d.from === task.id && d.to === val)) {
                alert("No se puede crear un bucle circular de dependencias.");
                selectPred.value = '';
                return;
            }
            ganttDeps.push({ from: val, to: task.id });
        }
        
        ganttSave();
        rebuildGanttDOM();
        updatePlazoVal();
    });
    
    cardPred.appendChild(selectPred);
    grid.appendChild(cardPred);

    // Tarjeta Enlace Posterior
    const cardSucc = document.createElement('div');
    cardSucc.className = 'gantt-popup-card';
    cardSucc.innerHTML = `<div class="popup-card-title">Enlace Posterior</div>`;
    
    const selectSucc = document.createElement('select');
    selectSucc.className = 'popup-card-input';
    
    // Opción vacía
    const optNoneSucc = document.createElement('option');
    optNoneSucc.value = '';
    optNoneSucc.textContent = '(Ninguna)';
    selectSucc.appendChild(optNoneSucc);
    
    // Rellenar con otras tareas
    const otherTasksSucc = ganttTasks.filter(t => t.id !== task.id);
    otherTasksSucc.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.summary;
        selectSucc.appendChild(opt);
    });
    
    // Valor inicial
    const currentSucc = ganttDeps.find(d => d.from === task.id);
    selectSucc.value = currentSucc ? currentSucc.to : '';
    
    selectSucc.addEventListener('change', (e) => {
        const val = e.target.value;
        ganttDeps = ganttDeps.filter(d => d.from !== task.id);
        
        if (val) {
            if (ganttDeps.some(d => d.to === task.id && d.from === val)) {
                alert("No se puede crear un bucle circular de dependencias.");
                selectSucc.value = '';
                return;
            }
            ganttDeps.push({ from: task.id, to: val });
        }
        
        ganttSave();
        rebuildGanttDOM();
        updatePlazoVal();
    });
    
    cardSucc.appendChild(selectSucc);
    grid.appendChild(cardSucc);

    // Función interna para actualizar el plazo restante
    function updatePlazoVal() {
        const progressVal = st.progress || 0;
        let daysStr = '';
        let classColor = 'gantt-days-normal';
        if (progressVal === 100) {
            daysStr = 'Listo';
            classColor = 'gantt-days-ready';
        } else {
            const currentEndD = weekToDate(st.startWeek + st.durationWeeks);
            const today = new Date();
            currentEndD.setHours(0, 0, 0, 0);
            today.setHours(0, 0, 0, 0);
            const diffMs = currentEndD - today;
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            if (diffDays < 0) {
                daysStr = `-${Math.abs(diffDays)} d (atraso)`;
                classColor = 'gantt-days-delayed';
            } else {
                daysStr = `${diffDays} d`;
                classColor = 'gantt-days-normal';
            }
        }
        plazoVal.textContent = daysStr;
        plazoVal.className = 'popup-card-value ' + classColor;
    }

    // Inicializar Plazo
    updatePlazoVal();

    body.appendChild(grid);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'gantt-popup-close';
    closeBtn.textContent = 'OK';
    closeBtn.addEventListener('click', () => {
        modal.classList.add('fade-out');
        setTimeout(() => modal.remove(), 200);
    });

    content.appendChild(title);
    content.appendChild(body);
    content.appendChild(closeBtn);
    modal.appendChild(content);

    // Cerrar al hacer click fuera del modal
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('fade-out');
            setTimeout(() => modal.remove(), 200);
        }
    });

    document.body.appendChild(modal);
}

/**
 * Registra un gesto de presión prolongada (long press) con soporte para ratón y eventos táctiles.
 */
function setupGanttLongPress(element, callback) {
    let pressTimer;
    let didMove = false;
    
    const start = (e) => {
        if (e.type === 'mousedown' && e.button !== 0) return;
        didMove = false;
        clearTimeout(pressTimer);
        pressTimer = setTimeout(() => {
            if (didMove) return;
            if (navigator.vibrate) {
                try { navigator.vibrate(40); } catch(err) {}
            }
            callback();
        }, 600);
    };

    const cancel = () => {
        clearTimeout(pressTimer);
    };

    const move = () => {
        didMove = true;
        clearTimeout(pressTimer);
    };

    element.addEventListener('touchstart', start, { passive: true });
    element.addEventListener('touchend', cancel, { passive: true });
    element.addEventListener('touchmove', move, { passive: true });
    
    element.addEventListener('mousedown', start);
    element.addEventListener('mouseup', cancel);
    element.addEventListener('mouseleave', cancel);
}

/* ==========================================================================
   Paleta de Comandos Global (Ctrl+K / Cmd+K)
   ========================================================================== */
let commandPaletteOpen = false;
let commandPaletteSelectedIndex = 0;
let commandPaletteActiveItems = [];

const cmdPaletteModal = document.getElementById('commandPaletteModal');
const cmdPaletteInput = document.getElementById('commandPaletteInput');
const cmdPaletteResults = document.getElementById('commandPaletteResults');
const cmdPaletteBtn = document.getElementById('cmdPaletteBtn');
const closeCmdPaletteBtn = document.getElementById('closeCmdPaletteBtn');

// Catálogo de acciones base
function getBaseCommandPaletteActions() {
    const actions = [
        // Categoría: Creación y Archivo
        {
            category: "Creación y Archivo",
            title: "Crear Nuevo Presupuesto",
            desc: "Asistente guiado, plantillas sectoriales o desde cero",
            icon: "✨",
            shortcut: "Ctrl+N",
            keywords: "nuevo presupuesto crear asistente plantilla reforma unifamiliar blanco fbc3",
            action: () => {
                openNewBudgetWizard();
            }
        },
        {
            category: "Creación y Archivo",
            title: "Catálogo y Base de Precios ConTech",
            desc: "Explorar e insertar partidas tipo descompuestas",
            icon: "📚",
            shortcut: "",
            keywords: "base precios catalogo partidas partidas tipo descompuestos rendimiento insumos",
            action: () => {
                openPriceBankCatalog();
            }
        },
        // Categoría: Vistas
        {
            category: "Vistas y Módulos",
            title: "Ver Presupuesto",
            desc: "Árbol jerárquico completo con PEM y PEC",
            icon: "🌳",
            shortcut: "Alt+1",
            keywords: "arbol presupuesto pem pec jerarquia medicion",
            action: () => {
                const btn = document.getElementById('presupuestoBtn');
                if (btn) btn.click();
            }
        },
        {
            category: "Vistas y Módulos",
            title: "Cuadro de Precios",
            desc: "Precios unitarios y descompuestos (MO, MAQ, MAT)",
            icon: "🏷️",
            shortcut: "Alt+2",
            keywords: "precios unitarios descompuestos cuadro mano obra materiales maquinaria",
            action: () => {
                const btn = document.getElementById('pricesBtn');
                if (btn) btn.click();
            }
        },
        {
            category: "Vistas y Módulos",
            title: "Dashboard y Estadísticas",
            desc: "Gráficos de distribución de costes y porcentajes",
            icon: "📊",
            shortcut: "",
            keywords: "dashboard graficos estadisticas resumen porcentajes",
            action: () => {
                const btn = document.getElementById('dashboardBtn');
                if (btn) btn.click();
            }
        },
        {
            category: "Vistas y Módulos",
            title: "Planning y Gantt",
            desc: "Cronograma de obra, ruta crítica y avance",
            icon: "📅",
            shortcut: "",
            keywords: "planning gantt cronograma tiempo semanas fechas camino critico",
            action: () => {
                const btn = document.getElementById('planningBtn');
                if (btn) btn.click();
            }
        },
        {
            category: "Vistas y Módulos",
            title: "Visualizador Sunburst",
            desc: "Gráfico concéntrico interactivo de costes e insumos",
            icon: "☀️",
            shortcut: "",
            keywords: "sunburst descompuestos flujo costes grafico concentrico anillos insumos",
            action: () => {
                openDashboardModal('sunburst');
            }
        },
        {
            category: "Vistas y Módulos",
            title: "Diagrama Sankey",
            desc: "Flujo interactivo de capítulos hacia insumos MO, MQ, MT",
            icon: "🌊",
            shortcut: "",
            keywords: "sankey flujo costes descompuestos cintas mo mq mt",
            action: () => {
                openDashboardModal('sankey');
            }
        },
        {
            category: "Vistas y Módulos",
            title: "Impacto Ambiental",
            desc: "Estimador de emisiones de CO₂ eq e informe ecológico",
            icon: "🌿",
            shortcut: "",
            keywords: "impacto ambiental huella carbono co2 sostenibilidad ecologia dap medio ambiente ciclo vida",
            action: () => {
                openEcoModal();
            }
        },
        {
            category: "Vistas y Módulos",
            title: "Sincronización Cloud (Google Drive / E2E)",
            desc: "Copias de seguridad automáticas y sincronización multidispositivo con cifrado E2E",
            icon: "☁️",
            shortcut: "",
            keywords: "nube cloud sync sincronizacion google drive backup copia seguridad e2e cifrado",
            action: () => {
                openCloudSyncModal();
            }
        },
        {
            category: "Vistas y Módulos",
            title: "Certificaciones de Obra",
            desc: "Control de ejecución mensual y actas oficiales",
            icon: "🏗️",
            shortcut: "",
            keywords: "certificaciones obra mensual avance facturacion actas",
            action: () => {
                const btn = document.getElementById('certObrasBtn');
                if (btn) btn.click();
            }
        },
        {
            category: "Vistas y Módulos",
            title: "Planificación Financiera (EVM / Curva S)",
            desc: "Análisis del Valor Ganado, Curva S e índices CPI / SPI",
            icon: "📈",
            shortcut: "",
            keywords: "evm valor ganado curva s financiero cpi spi desviaciones eac",
            action: () => {
                const planBtn = document.getElementById('planningBtn');
                if (planBtn) planBtn.click();
                setTimeout(() => {
                    const evmBtn = document.getElementById('toggleEvmViewBtn');
                    if (evmBtn) evmBtn.click();
                }, 100);
            }
        },
        {
            category: "Vistas y Módulos",
            title: "Comparador de Presupuestos",
            desc: "Diferencias de importes y partidas entre dos archivos .bc3",
            icon: "🔍",
            shortcut: "",
            keywords: "comparar comparador version diferencias cambios",
            action: () => {
                const btn = document.getElementById('compareBtn');
                if (btn) btn.click();
            }
        },

        // Categoría: Acciones Rápidas
        {
            category: "Acciones y Exportación",
            title: "Importar desde Excel (.xlsx / .csv)",
            desc: "Convertir hoja de cálculo a presupuesto BC3 normalizado",
            icon: "📥",
            shortcut: "Ctrl+I",
            keywords: "importar excel xlsx csv cuadros precios mediciones convertir",
            action: () => {
                openImportExcelModal();
            }
        },
        {
            category: "Acciones y Exportación",
            title: "Exportar a Excel (.xlsx)",
            desc: "Generar hoja de cálculo con fórmulas y árbol",
            icon: "📊",
            shortcut: "Ctrl+E",
            keywords: "excel xlsx exportar descargar hoja calculo tabla",
            action: () => {
                exportToExcel();
            }
        },
        {
            category: "Acciones y Exportación",
            title: "Exportar a PDF",
            desc: "Generar documento PDF formateado listo para imprimir",
            icon: "📄",
            shortcut: "Ctrl+P",
            keywords: "pdf exportar imprimir documento informe",
            action: () => {
                exportToPdf();
            }
        },
        {
            category: "Acciones y Exportación",
            title: "Guardar como Archivo BC3",
            desc: "Descargar archivo .bc3 con cambios actualizados",
            icon: "⬇️",
            shortcut: "Ctrl+S",
            keywords: "guardar descargar bc3 fiebdc archivo backup",
            action: () => {
                exportToBC3();
            }
        },
        {
            category: "Acciones y Configuración",
            title: "Ajustar Coeficientes (GG, BI, IVA)",
            desc: "Modificar Gastos Generales, Beneficio y Bajas",
            icon: "⚙️",
            shortcut: "",
            keywords: "coeficientes gastos generales beneficio industrial iva baja alza pec",
            action: () => {
                const btn = document.getElementById('toggleCoeffsBtn');
                if (btn) {
                    btn.click();
                    const setDrop = document.getElementById('settingsDropdown');
                    if (setDrop) setDrop.classList.remove('show');
                }
            }
        },
        {
            category: "Acciones y Configuración",
            title: "Alternar Tema Visual (Claro / Oscuro)",
            desc: "Cambiar entre paleta oscura y clara",
            icon: "🌙",
            shortcut: "",
            keywords: "tema visual modo oscuro claro noche dia dark light",
            action: () => {
                const btn = document.getElementById('themeToggle');
                if (btn) btn.click();
            }
        },
        {
            category: "Acciones y Configuración",
            title: "Historial de Auditoría",
            desc: "Registro de cambios y ediciones realizadas",
            icon: "📜",
            shortcut: "",
            keywords: "auditoria historial cambios modificaciones registro log",
            action: () => {
                const btn = document.getElementById('auditLogBtn');
                if (btn) btn.click();
            }
        },
        {
            category: "Acciones y Configuración",
            title: "Información y Novedades",
            desc: "Versión de la app, registro OTA y créditos",
            icon: "ℹ️",
            shortcut: "",
            keywords: "informacion version ota changelog novedades creditos acerca",
            action: () => {
                const btn = document.getElementById('infoBtn');
                if (btn) btn.click();
            }
        },
        {
            category: "Presupuesto",
            title: "Cargar Otro Archivo .BC3",
            desc: "Seleccionar y abrir un nuevo archivo de presupuesto",
            icon: "📂",
            shortcut: "Ctrl+O",
            keywords: "abrir cargar nuevo archivo seleccionar bc3",
            action: () => {
                const input = document.getElementById('bc3file');
                if (input) input.click();
            }
        },
        {
            category: "Presupuesto",
            title: "Cerrar Presupuesto Actual",
            desc: "Salir del presupuesto en pantalla y volver al inicio",
            icon: "✕",
            shortcut: "",
            keywords: "cerrar salir limpiar presupuesto reset",
            action: () => {
                const btn = document.getElementById('closeBudgetBtn');
                if (btn) btn.click();
            }
        }
    ];

    return actions;
}

// Búsqueda de conceptos dentro del presupuesto cargado
function searchBudgetConcepts(term) {
    if (!parsedData || !parsedData.concepts || !term) return [];

    const query = term.toLowerCase().trim();
    const matches = [];

    const allConcepts = Object.values(parsedData.concepts);

    for (const concept of allConcepts) {
        const code = (concept.code || '').replace(/#+\s*$/, '');
        const summary = (concept.summary || '').toLowerCase();
        const rawCode = (concept.code || '').toLowerCase();
        const desc = (concept.description || '').toLowerCase();

        let score = 0;
        if (rawCode === query || code.toLowerCase() === query) {
            score = 100;
        } else if (rawCode.startsWith(query) || code.toLowerCase().startsWith(query)) {
            score = 75;
        } else if (code.toLowerCase().includes(query)) {
            score = 50;
        } else if (summary.includes(query)) {
            score = 30;
        } else if (desc.includes(query)) {
            score = 10;
        }

        if (score > 0) {
            const isChapter = concept.code.endsWith('#') || concept.is_root;
            const price = parseFloat(concept.price) || 0;
            const priceFormatted = price > 0 ? price.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €' : '';

            matches.push({
                category: isChapter ? "Capítulos del Presupuesto" : "Partidas del Presupuesto",
                title: `${code} · ${concept.summary || '(Sin título)'}`,
                desc: isChapter ? `Capítulo · ${priceFormatted}` : `${concept.unit ? `[${concept.unit}] ` : ''}${priceFormatted}`,
                icon: isChapter ? "📁" : "📄",
                badge: concept.unit || (isChapter ? 'CAP' : 'PAR'),
                priceBadge: priceFormatted,
                score: score,
                conceptCode: concept.code,
                action: () => {
                    // 1. Conmutar a vista de presupuesto
                    const presBtn = document.getElementById('presupuestoBtn');
                    if (presBtn) presBtn.click();

                    // 2. Cerrar modales abiertos
                    const modals = document.querySelectorAll('.modal');
                    modals.forEach(m => m.style.display = 'none');

                    // 3. Expandir la ruta hacia este nodo en el árbol
                    expandAncestorsOfNode(concept.code);

                    // 4. Renderizar nivel
                    renderCurrentLevel();

                    // 5. Mostrar detalles del concepto en el panel inspector
                    showDetails(concept.code);

                    // 6. Hacer scroll suave hacia el nodo en el árbol
                    setTimeout(() => {
                        const targetEl = document.querySelector(`[data-code="${concept.code}"]`);
                        if (targetEl) {
                            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            targetEl.classList.add('highlight-node');
                            setTimeout(() => targetEl.classList.remove('highlight-node'), 2500);
                        }
                    }, 80);
                }
            });
        }
    }

    // Ordenar por relevancia
    matches.sort((a, b) => b.score - a.score);
    return matches.slice(0, 25);
}

// Expande los nodos ancestros de un concepto para garantizar su visibilidad en el árbol
function expandAncestorsOfNode(targetCode) {
    if (!parsedData || !parsedData.concepts) return;

    // Buscar en el grafo quiénes son los padres
    for (const code in parsedData.concepts) {
        const c = parsedData.concepts[code];
        if (c.children && c.children.includes(targetCode)) {
            expandedNodes.add(code);
            expandAncestorsOfNode(code);
        }
    }
}

// Abrir la paleta de comandos
function openCommandPalette() {
    if (!cmdPaletteModal) return;

    commandPaletteOpen = true;
    cmdPaletteModal.style.display = 'flex';
    if (cmdPaletteInput) {
        cmdPaletteInput.value = '';
        setTimeout(() => cmdPaletteInput.focus(), 50);
    }
    renderCommandPaletteResults('');
}

// Cerrar la paleta de comandos
function closeCommandPalette() {
    if (!cmdPaletteModal) return;

    commandPaletteOpen = false;
    cmdPaletteModal.style.display = 'none';
}

// Renderizar lista de resultados en la paleta
function renderCommandPaletteResults(term = '') {
    if (!cmdPaletteResults) return;

    const trimmed = term.toLowerCase().trim();
    let items = [];

    const baseActions = getBaseCommandPaletteActions();

    if (!trimmed) {
        items = baseActions;
    } else {
        // Filtrar acciones base
        const matchedActions = baseActions.filter(item => {
            return item.title.toLowerCase().includes(trimmed) ||
                   item.desc.toLowerCase().includes(trimmed) ||
                   (item.keywords && item.keywords.toLowerCase().includes(trimmed));
        });

        // Buscar conceptos del presupuesto
        const matchedConcepts = searchBudgetConcepts(trimmed);

        items = [...matchedActions, ...matchedConcepts];
    }

    commandPaletteActiveItems = items;
    commandPaletteSelectedIndex = 0;

    if (items.length === 0) {
        cmdPaletteResults.innerHTML = `
            <div class="command-palette-empty">
                <span class="command-palette-empty-icon">🔍</span>
                <p>No se encontraron comandos ni partidas para <strong>"${term}"</strong></p>
            </div>
        `;
        return;
    }

    // Agrupar por categoría
    const categoriesMap = new Map();
    items.forEach((item, index) => {
        const cat = item.category || 'General';
        if (!categoriesMap.has(cat)) {
            categoriesMap.set(cat, []);
        }
        categoriesMap.get(cat).push({ item, globalIndex: index });
    });

    let html = '';
    categoriesMap.forEach((entryList, catName) => {
        html += `<div class="command-palette-category">`;
        html += `<div class="command-palette-category-title">${catName}</div>`;

        entryList.forEach(({ item, globalIndex }) => {
            const isActive = globalIndex === commandPaletteSelectedIndex ? 'active' : '';
            html += `
                <div class="command-palette-item ${isActive}" data-index="${globalIndex}">
                    <div class="command-palette-item-left">
                        <span class="command-palette-item-icon">${item.icon || '⚡'}</span>
                        <div class="command-palette-item-info">
                            <span class="command-palette-item-title">${item.title}</span>
                            <span class="command-palette-item-desc">${item.desc}</span>
                        </div>
                    </div>
                    <div class="command-palette-item-right">
                        ${item.priceBadge ? `<span class="command-palette-badge command-palette-price-badge">${item.priceBadge}</span>` : ''}
                        ${item.badge && !item.priceBadge ? `<span class="command-palette-badge">${item.badge}</span>` : ''}
                        ${item.shortcut ? `<kbd class="command-palette-shortcut">${item.shortcut}</kbd>` : ''}
                    </div>
                </div>
            `;
        });

        html += `</div>`;
    });

    cmdPaletteResults.innerHTML = html;

    // Vincular clics directos
    const renderedItems = cmdPaletteResults.querySelectorAll('.command-palette-item');
    renderedItems.forEach(el => {
        el.addEventListener('click', () => {
            const idx = parseInt(el.getAttribute('data-index'), 10);
            executeCommandPaletteItem(idx);
        });
        el.addEventListener('mouseenter', () => {
            const idx = parseInt(el.getAttribute('data-index'), 10);
            updateCommandPaletteActiveIndex(idx);
        });
    });
}

function updateCommandPaletteActiveIndex(index) {
    if (!commandPaletteActiveItems || commandPaletteActiveItems.length === 0) return;

    commandPaletteSelectedIndex = (index + commandPaletteActiveItems.length) % commandPaletteActiveItems.length;

    const renderedItems = cmdPaletteResults.querySelectorAll('.command-palette-item');
    renderedItems.forEach(el => {
        const itemIdx = parseInt(el.getAttribute('data-index'), 10);
        if (itemIdx === commandPaletteSelectedIndex) {
            el.classList.add('active');
            el.scrollIntoView({ behavior: 'auto', block: 'nearest' });
        } else {
            el.classList.remove('active');
        }
    });
}

function executeCommandPaletteItem(index) {
    if (!commandPaletteActiveItems || !commandPaletteActiveItems[index]) return;

    const selected = commandPaletteActiveItems[index];
    closeCommandPalette();

    try {
        if (typeof selected.action === 'function') {
            selected.action();
        }
    } catch (err) {
        console.error("Error ejecutando acción de paleta de comandos:", err);
    }
}

// Event Listeners para Paleta de Comandos
if (cmdPaletteBtn) {
    cmdPaletteBtn.addEventListener('click', () => {
        if (commandPaletteOpen) {
            closeCommandPalette();
        } else {
            openCommandPalette();
        }
    });
}

if (closeCmdPaletteBtn) {
    closeCmdPaletteBtn.addEventListener('click', closeCommandPalette);
}

if (cmdPaletteModal) {
    cmdPaletteModal.addEventListener('click', (e) => {
        if (e.target === cmdPaletteModal) {
            closeCommandPalette();
        }
    });
}

if (cmdPaletteInput) {
    cmdPaletteInput.addEventListener('input', (e) => {
        renderCommandPaletteResults(e.target.value);
    });

    cmdPaletteInput.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            updateCommandPaletteActiveIndex(commandPaletteSelectedIndex + 1);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            updateCommandPaletteActiveIndex(commandPaletteSelectedIndex - 1);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            executeCommandPaletteItem(commandPaletteSelectedIndex);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeCommandPalette();
        }
    });
}

// Atajo de teclado global Ctrl+K / Cmd+K
document.addEventListener('keydown', (e) => {
    // Si se pulsa Ctrl+K o Cmd+K
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (commandPaletteOpen) {
            closeCommandPalette();
        } else {
            openCommandPalette();
        }
        return;
    }

    // Si se pulsa Ctrl+N o Cmd+N (Nuevo Presupuesto)
    if ((e.ctrlKey || e.metaKey) && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        openNewBudgetWizard();
        return;
    }

    // Escape para cerrar la paleta si está abierta
    if (e.key === 'Escape' && commandPaletteOpen) {
        e.preventDefault();
        closeCommandPalette();
    }
});


/* ==========================================================================
   VISUALIZADOR CONCÉNTRICO DE DESCOMPUESTOS (SUNBURST / SANKEY) & DASHBOARD UNIFICADO
   ========================================================================== */

let sunburstRootCode = null;
let sunburstHierarchyData = null;
let sunburstSectors = [];
let sunburstHoveredSector = null;
let sunburstChapterBoundaries = [];

const dashboardHeaderIcon = document.getElementById('dashboardHeaderIcon');
const dashboardModalTitle = document.getElementById('dashboardModalTitle');
const tabDashboardViewBtn = document.getElementById('tabDashboardViewBtn');
const tabSunburstViewBtn = document.getElementById('tabSunburstViewBtn');
const tabSankeyViewBtn = document.getElementById('tabSankeyViewBtn');
const tabEcoViewBtn = document.getElementById('tabEcoViewBtn');
const dashboardSubToolbar = document.getElementById('dashboardSubToolbar');
const sunburstDepthContainer = document.getElementById('sunburstDepthContainer');
const dashboardViewSection = document.getElementById('dashboardViewSection');
const sunburstViewSection = document.getElementById('sunburstViewSection');
const ecoViewSection = document.getElementById('ecoViewSection');

const sunburstBudgetSelect = document.getElementById('sunburstBudgetSelect');
const sunburstDepthSelect = document.getElementById('sunburstDepthSelect');
const sunburstNatureSelect = document.getElementById('sunburstNatureSelect');
const sunburstResetZoomBtn = document.getElementById('sunburstResetZoomBtn');
const sunburstCanvas = document.getElementById('sunburstCanvas');

function populateSunburstBudgetSelect() {
    if (!sunburstBudgetSelect) return;
    sunburstBudgetSelect.innerHTML = '';

    if (budgetTabs && budgetTabs.length > 0) {
        budgetTabs.forEach(tab => {
            const opt = document.createElement('option');
            opt.value = tab.id;
            opt.textContent = tab.fileName;
            if (tab.id === activeTabId) {
                opt.selected = true;
            }
            sunburstBudgetSelect.appendChild(opt);
        });
        const parentLabel = sunburstBudgetSelect.closest('.sunburst-filter-label');
        if (parentLabel) parentLabel.style.display = 'flex';
    } else if (currentFileName) {
        const opt = document.createElement('option');
        opt.value = 'active';
        opt.textContent = currentFileName;
        opt.selected = true;
        sunburstBudgetSelect.appendChild(opt);
    }
}

function setDashboardMainTab(tab) {
    if (tabDashboardViewBtn) tabDashboardViewBtn.classList.toggle('active', tab === 'dashboard');
    if (tabSunburstViewBtn) tabSunburstViewBtn.classList.toggle('active', tab === 'sunburst');
    if (tabSankeyViewBtn) tabSankeyViewBtn.classList.toggle('active', tab === 'sankey');
    if (tabEcoViewBtn) tabEcoViewBtn.classList.toggle('active', tab === 'eco');

    const centerLabel = document.getElementById('sunburstCenterLabel');

    if (tab === 'dashboard') {
        if (dashboardHeaderIcon) dashboardHeaderIcon.textContent = '📊';
        if (dashboardModalTitle) dashboardModalTitle.textContent = 'Dashboard & Estadísticas';
        if (dashboardViewSection) dashboardViewSection.style.display = 'block';
        if (sunburstViewSection) sunburstViewSection.style.display = 'none';
        if (ecoViewSection) ecoViewSection.style.display = 'none';
        if (dashboardSubToolbar) dashboardSubToolbar.style.display = 'none';
        setTimeout(renderCharts, 50);
    } else if (tab === 'sunburst') {
        currentDecompViewMode = 'sunburst';
        if (dashboardHeaderIcon) dashboardHeaderIcon.textContent = '☀️';
        if (dashboardModalTitle) dashboardModalTitle.textContent = 'Visualizador Sunburst';
        if (dashboardViewSection) dashboardViewSection.style.display = 'none';
        if (sunburstViewSection) sunburstViewSection.style.display = 'block';
        if (ecoViewSection) ecoViewSection.style.display = 'none';
        if (dashboardSubToolbar) dashboardSubToolbar.style.display = 'flex';
        if (sunburstDepthContainer) sunburstDepthContainer.style.display = 'flex';
        if (sunburstCanvas) sunburstCanvas.style.display = 'block';
        if (sankeyCanvas) sankeyCanvas.style.display = 'none';
        if (centerLabel) centerLabel.style.display = 'block';

        // Mostrar tabla inferior de descompuestos en Sunburst y restaurar altura del top row
        const decompBottom = document.querySelector('.sunburst-decomp-bottom');
        if (decompBottom) decompBottom.style.display = 'flex';
        const topRow = document.querySelector('.sunburst-top-row');
        if (topRow) {
            topRow.style.height = '490px';
            topRow.style.flex = '0 0 auto';
        }

        refreshSunburst();
    } else if (tab === 'sankey') {
        currentDecompViewMode = 'sankey';
        if (dashboardHeaderIcon) dashboardHeaderIcon.textContent = '🌊';
        if (dashboardModalTitle) dashboardModalTitle.textContent = 'Diagrama Sankey';
        if (dashboardViewSection) dashboardViewSection.style.display = 'none';
        if (sunburstViewSection) sunburstViewSection.style.display = 'block';
        if (ecoViewSection) ecoViewSection.style.display = 'none';
        if (dashboardSubToolbar) dashboardSubToolbar.style.display = 'flex';
        if (sunburstDepthContainer) sunburstDepthContainer.style.display = 'none'; // En Sankey solo se ve la casita
        if (sunburstCanvas) sunburstCanvas.style.display = 'none';
        if (sankeyCanvas) sankeyCanvas.style.display = 'block';
        if (centerLabel) centerLabel.style.display = 'none';

        // Ocultar tabla inferior de descompuestos en Sankey y hacer que el top row ocupe el 100%
        const decompBottom = document.querySelector('.sunburst-decomp-bottom');
        if (decompBottom) decompBottom.style.display = 'none';
        const topRow = document.querySelector('.sunburst-top-row');
        if (topRow) {
            topRow.style.height = '100%';
            topRow.style.flex = '1 1 0';
        }

        refreshSunburst();
    } else if (tab === 'eco') {
        if (dashboardHeaderIcon) dashboardHeaderIcon.textContent = '🌿';
        if (dashboardModalTitle) dashboardModalTitle.textContent = 'Impacto Ambiental';
        if (dashboardViewSection) dashboardViewSection.style.display = 'none';
        if (sunburstViewSection) sunburstViewSection.style.display = 'none';
        if (ecoViewSection) ecoViewSection.style.display = 'block';
        if (dashboardSubToolbar) dashboardSubToolbar.style.display = 'none';
        setTimeout(renderEcoSection, 50);
    }
}

function openDashboardModal(initialTab = 'dashboard') {
    if (!parsedData || !parsedData.concepts) {
        alert("Primero debes cargar un archivo de presupuesto (.bc3).");
        return;
    }
    const dModal = document.getElementById('dashboardModal');
    if (dModal) {
        document.body.classList.add('modal-open');
        const fab = document.getElementById('expandHeaderBtn');
        if (fab) fab.style.display = 'none';
        dModal.style.display = 'flex';
        populateSunburstBudgetSelect();
        sunburstRootCode = null; // Vista global
        setDashboardMainTab(initialTab);
    }
}

// Alias para compatibilidad hacia atrás
function openSunburstModal(mode = 'sunburst') {
    openDashboardModal(mode);
}

function openEcoModal() {
    openDashboardModal('eco');
}

if (tabDashboardViewBtn) tabDashboardViewBtn.addEventListener('click', () => setDashboardMainTab('dashboard'));
if (tabSunburstViewBtn) tabSunburstViewBtn.addEventListener('click', () => setDashboardMainTab('sunburst'));
if (tabSankeyViewBtn) tabSankeyViewBtn.addEventListener('click', () => setDashboardMainTab('sankey'));
if (tabEcoViewBtn) tabEcoViewBtn.addEventListener('click', () => setDashboardMainTab('eco'));

if (sunburstBudgetSelect) {
    sunburstBudgetSelect.addEventListener('change', (e) => {
        const targetTabId = e.target.value;
        if (targetTabId && targetTabId !== activeTabId && targetTabId !== 'active') {
            switchBudgetTab(targetTabId);
        }
    });
}

if (sunburstDepthSelect) sunburstDepthSelect.addEventListener('change', () => refreshSunburst());
if (sunburstNatureSelect) sunburstNatureSelect.addEventListener('change', () => refreshSunburst());
if (sunburstResetZoomBtn) {
    sunburstResetZoomBtn.addEventListener('click', () => {
        if (sunburstRootCode !== null) {
            sunburstRootCode = null;
            refreshSunburst('out');
        }
    });
}

/* ==========================================================================
   MOTOR DE HUELLA DE CARBONO Y SOSTENIBILIDAD CO2 (CICLO DE VIDA)
   ========================================================================== */

let ecoChartsInstances = { chapters: null, materials: null };

function getConceptCarbonFactor(concept) {
    if (!concept) return { factor: 0.20, category: 'Otros / Varios' };
    const text = ((concept.summary || '') + ' ' + (concept.code || '')).toLowerCase();
    const unit = (concept.unit || '').toLowerCase().trim();

    // 1. Hormigones y Cimentaciones
    if (/hormig|ciment|solera|zapata|muro|pilar|forjado|losa/.test(text)) {
        if (unit.includes('m3') || unit.includes('m³')) return { factor: 215, category: 'Hormigón y Estructuras' };
        if (unit.includes('m2') || unit.includes('m²')) return { factor: 42, category: 'Hormigón y Estructuras' };
        if (unit.includes('kg')) return { factor: 0.18, category: 'Hormigón y Estructuras' };
        return { factor: 180, category: 'Hormigón y Estructuras' };
    }
    // 2. Acero y Metal
    if (/acero|ferralla|viga|perfil|armadura|chapa|metal|estructura metal/.test(text)) {
        if (unit.includes('kg')) return { factor: 1.95, category: 'Acero y Metales' };
        if (unit.includes('t') || unit.includes('tn')) return { factor: 1950, category: 'Acero y Metales' };
        if (unit.includes('m2') || unit.includes('m²')) return { factor: 28, category: 'Acero y Metales' };
        return { factor: 1.85, category: 'Acero y Metales' };
    }
    // 3. Albañilería, Cerámicos y Ladrillo
    if (/ladrill|bloque|ceram|tabique|muro de carga|fabrica/.test(text)) {
        if (unit.includes('m2') || unit.includes('m²')) return { factor: 19.5, category: 'Albañilería y Cerámica' };
        if (unit.includes('m3') || unit.includes('m³')) return { factor: 110, category: 'Albañilería y Cerámica' };
        return { factor: 18, category: 'Albañilería y Cerámica' };
    }
    // 4. Aislamientos e Impermeabilización
    if (/aisla|xps|eps|poliuret|lana mineral|lana de roca|impermeabil|tela asfalt|asfalt/.test(text)) {
        if (unit.includes('m2') || unit.includes('m²')) return { factor: 12.5, category: 'Aislamientos e Impermeab.' };
        if (unit.includes('m3') || unit.includes('m³')) return { factor: 55, category: 'Aislamientos e Impermeab.' };
        return { factor: 14, category: 'Aislamientos e Impermeab.' };
    }
    // 5. Carpintería, Vidrio y Fachadas
    if (/vidrio|cristal|ventana|puerta|aluminio|pvc|carpinter|fachada/.test(text)) {
        if (unit.includes('m2') || unit.includes('m²')) return { factor: 34, category: 'Carpintería y Vidrio' };
        if (unit.includes('ud')) return { factor: 48, category: 'Carpintería y Vidrio' };
        return { factor: 30, category: 'Carpintería y Vidrio' };
    }
    // 6. Madera y Materiales Bio
    if (/madera|tarima|viga madera|tablero|bio/.test(text)) {
        if (unit.includes('m3') || unit.includes('m³')) return { factor: -90, category: 'Madera (Fijación Bio)' };
        if (unit.includes('m2') || unit.includes('m²')) return { factor: 4.5, category: 'Madera (Fijación Bio)' };
        return { factor: 5, category: 'Madera (Fijación Bio)' };
    }
    // 7. Revestimientos, Yesos y Pinturas
    if (/yeso|enfosc|enluc|pintura|paviment|gres|alicat|falso techo/.test(text)) {
        if (unit.includes('m2') || unit.includes('m²')) return { factor: 7.2, category: 'Revestimientos y Acabados' };
        if (unit.includes('kg')) return { factor: 0.35, category: 'Revestimientos y Acabados' };
        return { factor: 7.0, category: 'Revestimientos y Acabados' };
    }
    // 8. Instalaciones y Climatización
    if (/electr|ilumin|tub|fontan|clima|conduct|caldera|bomba|saneam|placa solar|fotov/.test(text)) {
        if (unit.includes('m') || unit.includes('ml')) return { factor: 3.8, category: 'Instalaciones y Clima' };
        if (unit.includes('ud')) return { factor: 22, category: 'Instalaciones y Clima' };
        if (unit.includes('m2') || unit.includes('m²')) return { factor: 16, category: 'Instalaciones y Clima' };
        return { factor: 18, category: 'Instalaciones y Clima' };
    }
    // 9. Movimiento de tierras y Demoliciones
    if (/excav|demol|desmont|zanja|tierras|transporte/.test(text)) {
        if (unit.includes('m3') || unit.includes('m³')) return { factor: 4.2, category: 'Mov. Tierras y Demolición' };
        return { factor: 4.0, category: 'Mov. Tierras y Demolición' };
    }

    // Factor residual basado en precio económico (~0.22 kg CO2 / €)
    const price = parseFloat(concept.price) || 0;
    return { factor: Math.max(0.1, price * 0.22), category: 'Otros / Varios' };
}

function calculateProjectEcoData() {
    if (!parsedData || !parsedData.concepts) return null;

    let totalCarbonKg = 0;
    const chaptersCarbon = {};
    const materialsCarbon = {};
    const partidasList = [];

    const roots = Array.isArray(parsedData.root_nodes) ? parsedData.root_nodes : Object.values(parsedData.root_nodes || {});

    function processChapter(chapterCode) {
        const chConcept = parsedData.concepts[chapterCode];
        if (!chConcept) return;

        const chName = (chConcept.summary || chapterCode).replace(/#+$/, '').trim().substring(0, 24);
        chaptersCarbon[chName] = 0;

        function traverseLeafs(code, parentQty) {
            const concept = parsedData.concepts[code];
            if (!concept) return;

            const isChapter = concept.code.endsWith('#') || (!concept.unit || concept.unit.trim() === '');
            const children = getConceptDecomposition(concept);

            if (isChapter && children.length > 0) {
                children.forEach(child => {
                    traverseLeafs(child.code, parentQty * (parseFloat(child.factor) || 1));
                });
            } else {
                const qty = parentQty * (parseFloat(concept.quantity) || 1);
                const info = getConceptCarbonFactor(concept);
                const emissionKg = Math.max(0, qty * info.factor);

                totalCarbonKg += emissionKg;
                chaptersCarbon[chName] = (chaptersCarbon[chName] || 0) + emissionKg;
                materialsCarbon[info.category] = (materialsCarbon[info.category] || 0) + emissionKg;

                partidasList.push({
                    code: concept.code.replace(/#+$/, ''),
                    summary: concept.summary || '',
                    unit: concept.unit || 'ud',
                    quantity: qty,
                    price: parseFloat(concept.price) || 0,
                    factor: info.factor,
                    emissionKg: emissionKg,
                    emissionTon: emissionKg / 1000,
                    category: info.category
                });
            }
        }

        traverseLeafs(chapterCode, 1.0);
    }

    roots.forEach(rootCode => {
        const root = parsedData.concepts[rootCode];
        if (!root) return;
        const kids = getConceptDecomposition(root);
        if (kids && kids.length > 0) {
            kids.forEach(k => processChapter(k.code));
        } else {
            processChapter(rootCode);
        }
    });

    const totalBudget = calculateTotalBudget() || 1;
    const totalCarbonTon = totalCarbonKg / 1000;
    const intensity = totalCarbonKg / totalBudget; // kg CO2 / €

    // Calificación Ambiental
    let rating = 'B';
    let ratingLabel = 'Edificación Sostenible';
    if (intensity < 0.16) { rating = 'A'; ratingLabel = 'Descarbonización Avanzada'; }
    else if (intensity < 0.26) { rating = 'B'; ratingLabel = 'Edificación Sostenible'; }
    else if (intensity < 0.38) { rating = 'C'; ratingLabel = 'Estándar Eficiente'; }
    else if (intensity < 0.52) { rating = 'D'; ratingLabel = 'Intensivo en Carbono'; }
    else { rating = 'E'; ratingLabel = 'Alto Impacto de Carbono'; }

    const trees = Math.round(totalCarbonKg / 22); // 1 árbol absorbe aprox 22 kg CO2/año

    partidasList.sort((a, b) => b.emissionKg - a.emissionKg);

    return {
        totalCarbonKg,
        totalCarbonTon,
        intensity,
        rating,
        ratingLabel,
        trees,
        chaptersCarbon,
        materialsCarbon,
        topPartidas: partidasList.slice(0, 10),
        allPartidas: partidasList
    };
}

function renderEcoSection() {
    const data = calculateProjectEcoData();
    if (!data) return;

    // 1. KPIs
    const totalEl = document.getElementById('ecoTotalCarbon');
    const intEl = document.getElementById('ecoIntensity');
    const badgeEl = document.getElementById('ecoRatingBadge');
    const badgeLabelEl = document.getElementById('ecoRatingLabel');
    const treesEl = document.getElementById('ecoTreesCount');

    if (totalEl) totalEl.innerHTML = `${data.totalCarbonTon.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <small>t CO₂ eq</small>`;
    if (intEl) intEl.innerHTML = `${data.intensity.toLocaleString('es-ES', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} <small>kg CO₂ / €</small>`;
    if (badgeEl) {
        badgeEl.textContent = data.rating;
        badgeEl.className = 'eco-rating-badge rating-' + data.rating.toLowerCase();
    }
    if (badgeLabelEl) badgeLabelEl.textContent = data.ratingLabel;
    if (treesEl) treesEl.innerHTML = `${data.trees.toLocaleString('es-ES')} <small>árboles</small>`;

    // 2. Gráficos Chart.js
    const isDark = document.body.classList.contains('dark-theme') || document.body.classList.contains('dark-mode');
    const labelColor = isDark ? '#ffffff' : '#1e293b';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)';

    // Gráfico de Capítulos
    const chCanvas = document.getElementById('ecoChaptersChart');
    if (chCanvas && window.Chart) {
        if (ecoChartsInstances.chapters) ecoChartsInstances.chapters.destroy();
        const chLabels = Object.keys(data.chaptersCarbon);
        const chVals = Object.values(data.chaptersCarbon).map(v => (v / 1000).toFixed(2));

        ecoChartsInstances.chapters = new Chart(chCanvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: chLabels,
                datasets: [{
                    label: 'Emisiones (t CO₂ eq)',
                    data: chVals,
                    backgroundColor: 'rgba(16, 185, 129, 0.75)',
                    borderColor: '#10b981',
                    borderWidth: 1.5,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: (ctx) => `${ctx.raw} t CO₂ eq` } }
                },
                scales: {
                    x: {
                        ticks: { color: labelColor, maxRotation: 45, minRotation: 20, font: { size: 10, weight: '600' } },
                        grid: { color: gridColor }
                    },
                    y: {
                        ticks: { color: labelColor, font: { size: 10, weight: '600' } },
                        grid: { color: gridColor },
                        title: { display: true, text: 't CO₂', color: labelColor, font: { weight: '700' } }
                    }
                }
            }
        });
    }

    // Gráfico de Tipologías de Materiales
    const matCanvas = document.getElementById('ecoMaterialsChart');
    if (matCanvas && window.Chart) {
        if (ecoChartsInstances.materials) ecoChartsInstances.materials.destroy();
        const matLabels = Object.keys(data.materialsCarbon);
        const matVals = Object.values(data.materialsCarbon).map(v => (v / 1000).toFixed(2));
        const bgColors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b', '#14b8a6', '#f97316'];

        ecoChartsInstances.materials = new Chart(matCanvas.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: matLabels,
                datasets: [{
                    data: matVals,
                    backgroundColor: bgColors.slice(0, matLabels.length),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: labelColor, font: { size: 11, weight: '600' }, boxWidth: 12, padding: 8 }
                    },
                    tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.raw} t CO₂` } }
                }
            }
        });
    }

    // 3. Tabla Top Partidas de Mayor Huella
    const tableBody = document.getElementById('ecoTopTableBody');
    if (tableBody) {
        tableBody.innerHTML = data.topPartidas.map(p => {
            const pct = data.totalCarbonKg > 0 ? ((p.emissionKg / data.totalCarbonKg) * 100).toFixed(1) : '0.0';
            return `
                <tr>
                    <td style="font-family:monospace; font-weight:600; color:var(--accent); font-size:0.8rem;">${p.code}</td>
                    <td style="font-weight:500; font-size:0.8rem;" title="${p.summary}">${p.summary}</td>
                    <td style="text-align:right; font-size:0.8rem;">${p.quantity.toLocaleString('es-ES', { maximumFractionDigits: 2 })} ${p.unit}</td>
                    <td style="text-align:right; font-size:0.8rem; color:var(--text-secondary);">${p.factor.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</td>
                    <td style="text-align:right; font-weight:bold; color:#10b981; font-size:0.85rem;">${p.emissionTon.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} t</td>
                    <td style="text-align:right; font-weight:600; font-size:0.8rem;">${pct}%</td>
                </tr>
            `;
        }).join('');
    }
}

// ── Exportar Informe de Huella de Carbono a PDF ──
function exportEcoPDF() {
    const data = calculateProjectEcoData();
    if (!data) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');

    const projectTitle = document.getElementById('projectTitle')?.textContent || currentFileName || 'Proyecto de Edificación';
    const currentDate = new Date().toLocaleDateString('es-ES');

    // Cabecera elegante
    doc.setFillColor(16, 185, 129);
    doc.rect(0, 0, 210, 26, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORME DE HUELLA DE CARBONO Y SOSTENIBILIDAD', 14, 13);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Análisis del Ciclo de Vida (LCA) | ${projectTitle} | Emisión: ${currentDate}`, 14, 20);

    // Resumen Ejecutivo / KPIs
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('1. RESUMEN EJECUTIVO DE EMISIONES', 14, 36);

    doc.autoTable({
        startY: 40,
        head: [['Indicador de Sostenibilidad', 'Valor Estimado', 'Unidad / Referencia']],
        body: [
            ['Huella Total de Carbono Incorporado', `${data.totalCarbonTon.toLocaleString('es-ES', { minimumFractionDigits: 2 })} t CO₂ eq`, 'Emisiones cuna a obra'],
            ['Intensidad de Emisiones por Presupuesto', `${data.intensity.toLocaleString('es-ES', { minimumFractionDigits: 3 })} kg CO₂ / €`, 'Ratio PEM'],
            ['Calificación Ambiental del Proyecto', `${data.rating} — ${data.ratingLabel}`, 'Escala CTE A-E'],
            ['Compensación Forestal Anual', `${data.trees.toLocaleString('es-ES')} árboles`, 'Absorción 22 kg CO₂/año']
        ],
        theme: 'striped',
        styles: { fontSize: 9, cellPadding: 3.5 }
    });

    // Top Partidas Críticas
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('2. PALANCAS DE DESCARBONIZACIÓN (TOP PARTIDAS CRÍTICAS)', 14, doc.lastAutoTable.finalY + 12);

    const rows = data.topPartidas.map(p => [
        p.code,
        p.summary.substring(0, 48),
        `${p.quantity.toLocaleString('es-ES', { maximumFractionDigits: 1 })} ${p.unit}`,
        `${p.factor.toLocaleString('es-ES', { maximumFractionDigits: 2 })}`,
        `${p.emissionTon.toLocaleString('es-ES', { minimumFractionDigits: 2 })} t`,
        `${((p.emissionKg / data.totalCarbonKg) * 100).toFixed(1)}%`
    ]);

    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 16,
        head: [['Código', 'Partida / Unidad de Obra', 'Medición', 'Factor kg/ud', 'Emisión (t)', '% Total']],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129] },
        styles: { fontSize: 8, cellPadding: 2.5 }
    });

    // Pie de página oficial
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(`Página ${i} de ${totalPages} — BC3 Viewer Sostenibilidad Ambiental`, 14, 287);
    }

    const baseName = currentFileName.replace(/\.[^/.]+$/, "");
    doc.save(`${baseName}_informe_huella_carbono.pdf`);
}

const exportEcoPdfBtn = document.getElementById('exportEcoPdfBtn');
if (exportEcoPdfBtn) {
    exportEcoPdfBtn.addEventListener('click', exportEcoPDF);
}

/**
 * Calcula recursivamente el desglose económico exacto de naturalezas (Mano de Obra, Maquinaria, Materiales)
 */
function getConceptNatureBreakdown(code, visited = new Set()) {
    if (visited.has(code)) return { MO: 0, MQ: 0, MT: 0, total: 0 };
    const concept = parsedData.concepts[code];
    if (!concept) return { MO: 0, MQ: 0, MT: 0, total: 0 };

    visited.add(code);

    const hasDecomp = concept.decomposition && concept.decomposition.length > 0;
    const isChapter = concept.code.endsWith('#') || (!concept.unit || concept.unit.trim() === '');

    if (!hasDecomp && !isChapter) {
        const u = (concept.unit || '').toUpperCase().trim();
        const codeUpper = concept.code.toUpperCase();
        const sumLower = (concept.summary || '').toLowerCase();
        const amount = (parseFloat(concept.price) || 0) * (parseFloat(concept.quantity) || 1);

        if (u === 'H' || u === 'HR' || u === 'HORA' || codeUpper.startsWith('MO') || codeUpper.startsWith('O') || /oficial|peon|cuadrilla|encargado|ayudante|hora/.test(sumLower)) {
            return { MO: amount, MQ: 0, MT: 0, total: amount };
        } else if (u === 'HM' || codeUpper.startsWith('MQ') || codeUpper.startsWith('M0') || /camion|dumper|grua|retro|pala|maquinaria|compresor/.test(sumLower)) {
            return { MO: 0, MQ: amount, MT: 0, total: amount };
        } else {
            return { MO: 0, MQ: 0, MT: amount, total: amount };
        }
    }

    let bMO = 0, bMQ = 0, bMT = 0;
    if (hasDecomp) {
        concept.decomposition.forEach(child => {
            const factor = parseFloat(child.factor) || 1;
            const childBreakdown = getConceptNatureBreakdown(child.code, new Set(visited));
            bMO += (childBreakdown.MO || 0) * factor;
            bMQ += (childBreakdown.MQ || 0) * factor;
            bMT += (childBreakdown.MT || 0) * factor;
        });
    }

    const total = bMO + bMQ + bMT || ((parseFloat(concept.price) || 0) * (parseFloat(concept.quantity) || 1));
    return { MO: bMO, MQ: bMQ, MT: bMT, total: total };
}

/**
 * Paleta noble exclusiva para Capítulos, Subcapítulos y Partidas
 * (Restringida para reservar Verdes a Materiales 🧱, Amarillos/Ámbares a Mano de Obra 👷, y Cyans a Maquinaria 🚜)
 */
const chapterColorFamilies = [
    { l1: '#7c3aed', l2: '#8b5cf6', l3: '#a78bfa', l4: '#c4b5fd' }, // Púrpura Imperial
    { l1: '#db2777', l2: '#ec4899', l3: '#f472b6', l4: '#fbcfe8' }, // Rosa Magenta
    { l1: '#e11d48', l2: '#f43f5e', l3: '#fb7185', l4: '#fda4af' }, // Carmesí Rubí
    { l1: '#4f46e5', l2: '#6366f1', l3: '#818cf8', l4: '#a5b4fc' }, // Índigo Profundo
    { l1: '#9333ea', l2: '#a855f7', l3: '#c084fc', l4: '#e9d5ff' }, // Violeta Intenso
    { l1: '#be185d', l2: '#e11d48', l3: '#f43f5e', l4: '#ffe4e6' }, // Frambuesa
    { l1: '#475569', l2: '#64748b', l3: '#94a3b8', l4: '#cbd5e1' }, // Pizarra Grafito
    { l1: '#581c87', l2: '#6b21a8', l3: '#9333ea', l4: '#d8b4fe' }, // Berenjena
    { l1: '#3730a3', l2: '#4338ca', l3: '#6366f1', l4: '#c7d2fe' }, // Azul Medianoche Púrpura
];

// Motor de animación fluida de transición Zoom (+ y -)
let sunburstAnim = {
    startTime: 0,
    duration: 380,
    active: false,
    direction: 'in', // 'in' o 'out'
    progress: 1
};

function triggerSunburstZoomAnimation(direction = 'in') {
    sunburstAnim.startTime = performance.now();
    sunburstAnim.direction = direction;
    sunburstAnim.active = true;
    sunburstAnim.progress = 0;
    requestAnimationFrame(animSunburstStep);
}

function animSunburstStep(now) {
    if (!sunburstAnim.active) return;
    const elapsed = now - sunburstAnim.startTime;
    let t = Math.min(elapsed / sunburstAnim.duration, 1);

    // Función de amortiguación cúbica suave: easeOutCubic
    sunburstAnim.progress = 1 - Math.pow(1 - t, 3);

    drawSunburstCanvas();

    if (t < 1) {
        requestAnimationFrame(animSunburstStep);
    } else {
        sunburstAnim.active = false;
        sunburstAnim.progress = 1;
        drawSunburstCanvas();
    }
}

/**
 * Construye la estructura jerárquica de costes para el gráfico Sunburst / Sankey
 */
function buildSunburstNode(code, currentDepth, maxDepth, natureFilter, visited = new Set()) {
    if (visited.has(code)) return null;
    const concept = parsedData.concepts[code];
    if (!concept) return null;

    visited.add(code);

    const isChapter = concept.code.endsWith('#') || (!concept.unit || concept.unit.trim() === '');
    const hasDecomp = concept.decomposition && concept.decomposition.length > 0;
    
    let type = 'PA';
    if (isChapter) {
        type = currentDepth <= 1 ? 'CH' : 'SUBCH';
    } else if (!hasDecomp) {
        const u = (concept.unit || '').toUpperCase().trim();
        const codeUpper = concept.code.toUpperCase();
        const sumLower = (concept.summary || '').toLowerCase();
        if (u === 'H' || u === 'HR' || u === 'HORA' || codeUpper.startsWith('MO') || codeUpper.startsWith('O') || /oficial|peon|cuadrilla|encargado|ayudante|hora/.test(sumLower)) {
            type = 'MO';
        } else if (u === 'HM' || codeUpper.startsWith('MQ') || codeUpper.startsWith('M0') || /camion|dumper|grua|retro|pala|maquinaria|compresor/.test(sumLower)) {
            type = 'MQ';
        } else {
            type = 'MT';
        }
    }

    const breakdown = getConceptNatureBreakdown(concept.code);

    const node = {
        code: concept.code,
        cleanCode: concept.code.replace(/#+\s*$/, ''),
        summary: concept.summary || concept.code,
        type: type,
        unit: concept.unit || '',
        price: parseFloat(concept.price) || 0,
        quantity: parseFloat(concept.quantity) || 1,
        amount: 0,
        natureBreakdown: breakdown,
        children: []
    };

    // Control de profundidad según los 5 niveles lógicos:
    // 1. CAPÍTULOS: Solo capítulos principales
    // 2. CAPÍTULOS + SUBCAPÍTULOS: Capítulos y Subcapítulos
    // 3. CAPÍTULOS + SUBCAPÍTULOS + PARTIDAS: Capítulos + Subcapítulos hasta Partidas (no abrir decomp)
    // 4. CAPÍTULOS + SUBCAPÍTULOS + PARTIDAS + DESCOMPUESTOS: Hasta 1er nivel de descompuestos
    // 5. CAPÍTULOS + SUBCAPÍTULOS + PARTIDAS + DESCOMPUESTOS + MO/MQ/MT: Desglose total multinivel
    let shouldExpandDecomp = false;
    if (maxDepth === 1) {
        shouldExpandDecomp = false;
    } else if (maxDepth === 2) {
        shouldExpandDecomp = isChapter && currentDepth < 2;
    } else if (maxDepth === 3) {
        shouldExpandDecomp = isChapter;
    } else if (maxDepth === 4) {
        shouldExpandDecomp = isChapter || currentDepth <= 3;
    } else {
        shouldExpandDecomp = true;
    }

    if (currentDepth < maxDepth && hasDecomp && shouldExpandDecomp) {
        concept.decomposition.forEach(childItem => {
            const childNode = buildSunburstNode(childItem.code, currentDepth + 1, maxDepth, natureFilter, new Set(visited));
            if (childNode) {
                const factor = parseFloat(childItem.factor) || 1;
                childNode.effectiveFactor = factor;
                childNode.amount = childNode.amount > 0 ? childNode.amount * factor : (childNode.price * factor);
                node.children.push(childNode);
            }
        });
    }

    // Calcular importe del nodo
    if (node.children.length > 0) {
        node.amount = node.children.reduce((acc, c) => acc + c.amount, 0);
    } else {
        node.amount = node.price * (node.quantity || 1);
    }

    return node;
}

function refreshSunburst(zoomDirection = null) {
    if (!parsedData || !sunburstCanvas) return;

    const maxDepth = parseInt(sunburstDepthSelect ? sunburstDepthSelect.value : '5', 10);
    const natureFilter = 'ALL';

    // Determinar nodos raíz (Capítulos principales si es vista global, o hijos del nodo si es zoom)
    let rootNodes = [];
    let effectiveRoots = [];

    if (sunburstRootCode && parsedData.concepts[sunburstRootCode]) {
        const singleConcept = parsedData.concepts[sunburstRootCode];
        if (singleConcept.decomposition && singleConcept.decomposition.length > 0) {
            effectiveRoots = singleConcept.decomposition.map(d => d.code);
        } else {
            effectiveRoots = [sunburstRootCode];
        }
    } else {
        const rawRoots = Array.isArray(parsedData.root_nodes) ? parsedData.root_nodes : Object.values(parsedData.root_nodes || {});
        
        // Desenvolver nodo contenedor maestro (ej: OBRA#) para extraer directamente sus Capítulos principales
        effectiveRoots = [];
        rawRoots.forEach(code => {
            const c = parsedData.concepts[code];
            if (c && c.decomposition && c.decomposition.length > 0 && (code.endsWith('#') || !c.unit || c.unit.trim() === '')) {
                // Si este nodo raíz contiene otros capítulos/subcapítulos, extraerlos como nivel 1
                c.decomposition.forEach(d => {
                    if (!effectiveRoots.includes(d.code)) effectiveRoots.push(d.code);
                });
            } else {
                if (!effectiveRoots.includes(code)) effectiveRoots.push(code);
            }
        });

        if (effectiveRoots.length === 0) {
            effectiveRoots = rawRoots;
        }
    }

    // Deduplicar códigos de capítulos
    const uniqueRoots = Array.from(new Set(effectiveRoots));

    uniqueRoots.forEach(rCode => {
        const rNode = buildSunburstNode(rCode, 1, maxDepth, natureFilter);
        if (rNode && rNode.amount > 0) rootNodes.push(rNode);
    });

    const totalAmount = rootNodes.reduce((acc, r) => acc + r.amount, 0);

    // Breakdown global acumulado
    const globalBreakdown = { MO: 0, MQ: 0, MT: 0 };
    rootNodes.forEach(r => {
        globalBreakdown.MO += (r.natureBreakdown.MO || 0);
        globalBreakdown.MQ += (r.natureBreakdown.MQ || 0);
        globalBreakdown.MT += (r.natureBreakdown.MT || 0);
    });

    sunburstHierarchyData = {
        code: sunburstRootCode || 'PRESUPUESTO GLOBAL',
        cleanCode: sunburstRootCode ? sunburstRootCode.replace(/#+\s*$/, '') : 'GLOBAL',
        summary: sunburstRootCode && parsedData.concepts[sunburstRootCode] ? parsedData.concepts[sunburstRootCode].summary : 'Presupuesto Total de Obra',
        type: 'ROOT',
        amount: totalAmount,
        natureBreakdown: globalBreakdown,
        children: rootNodes
    };

    // Actualizar etiqueta central
    const centerTitle = document.getElementById('sCenterTitle');
    const centerVal = document.getElementById('sCenterVal');
    if (centerTitle) centerTitle.textContent = sunburstHierarchyData.cleanCode;
    if (centerVal) centerVal.textContent = totalAmount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

    updateSunburstNodeCard(null); // Actualizar tarjeta con resumen global

    if (currentDecompViewMode === 'sankey') {
        if (zoomDirection) {
            triggerSankeyZoomAnimation(zoomDirection);
        } else {
            drawSankeyCanvas();
        }
    } else if (zoomDirection) {
        triggerSunburstZoomAnimation(zoomDirection);
    } else {
        drawSunburstCanvas();
    }
}

/**
 * Retorna un color determinista y visualmente coherente para cualquier concepto del presupuesto.
 */
function getStableConceptColor(code, type, depth = 1) {
    // Colores EXCLUSIVOS para naturalezas elementales
    if (type === 'MO') return '#f59e0b'; // Amarillo / Ámbar dorado (👷 Mano de Obra)
    if (type === 'MQ') return '#06b6d4'; // Cyan / Turquesa (🚜 Maquinaria)
    if (type === 'MT') return '#10b981'; // Verde Esmeralda (🧱 Materiales)

    let clean = (code || '').replace(/#+\s*$/, '').trim();
    let hash = 0;
    for (let i = 0; i < clean.length; i++) {
        hash = (hash << 5) - hash + clean.charCodeAt(i);
        hash |= 0;
    }
    const family = chapterColorFamilies[Math.abs(hash) % chapterColorFamilies.length];
    if (depth === 1) return family.l1;
    if (depth === 2) return family.l2;
    if (depth === 3) return family.l3;
    return family.l4;
}

/**
 * Retorna el color de un nodo respetando la familia de su anfitrión (más clara en profundidad)
 * y los colores exclusivos para Materiales (Verde), Mano de Obra (Ámbar) y Maquinaria (Cyan).
 */
function getNodeColor(node, chapterIndex, depth) {
    if (node.type === 'MO') return '#f59e0b'; // Ámbar dorado (👷 Mano de Obra)
    if (node.type === 'MQ') return '#06b6d4'; // Cyan (🚜 Maquinaria)
    if (node.type === 'MT') return '#10b981'; // Verde Esmeralda (🧱 Materiales)

    const family = chapterColorFamilies[chapterIndex % chapterColorFamilies.length];
    if (depth === 1) return family.l1;
    if (depth === 2) return family.l2;
    if (depth === 3) return family.l3;
    return family.l4;
}

/**
 * Trazador seguro de rectángulos con esquinas redondeadas para Canvas 2D
 */
function drawSafeRoundRect(ctx, x, y, w, h, r = 6) {
    x = Math.max(0, isFinite(x) ? x : 0);
    y = Math.max(0, isFinite(y) ? y : 0);
    w = Math.max(10, isFinite(w) ? w : 10);
    h = Math.max(10, isFinite(h) ? h : 10);
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
}

/**
 * Renderiza el gráfico concéntrico Sunburst en el canvas interactivo con "vacíos" (gaps) y animación fluida
 */
function drawSunburstCanvas() {
    if (!sunburstCanvas || !sunburstHierarchyData) return;

    const container = sunburstCanvas.parentElement;
    const availW = container.clientWidth || 600;
    const availH = container.clientHeight || 600;
    const size = Math.max(340, Math.min(availW - 20, availH - 20, 580));
    const dpr = window.devicePixelRatio || 1;

    sunburstCanvas.width = size * dpr;
    sunburstCanvas.height = size * dpr;
    sunburstCanvas.style.width = `${size}px`;
    sunburstCanvas.style.height = `${size}px`;

    const ctx = sunburstCanvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;
    const maxRadius = size / 2 - 12;
    const innerHoleRadius = maxRadius * 0.28;

    // Calcular factor de escala y opacidad durante la animación fluida
    const animProg = sunburstAnim.active ? sunburstAnim.progress : 1;
    let scaleFactor = 1;
    let animAlpha = 1;

    if (sunburstAnim.active) {
        if (sunburstAnim.direction === 'in') {
            scaleFactor = 0.70 + 0.30 * animProg;
            animAlpha = 0.2 + 0.8 * animProg;
        } else {
            scaleFactor = 1.25 - 0.25 * animProg;
            animAlpha = 0.2 + 0.8 * animProg;
        }
    }

    // Calcular profundidad máxima de datos
    function getMaxLevel(node, currentLevel = 0) {
        if (!node.children || node.children.length === 0) return currentLevel;
        return Math.max(...node.children.map(c => getMaxLevel(c, currentLevel + 1)));
    }

    const levelsCount = Math.max(getMaxLevel(sunburstHierarchyData), 1);
    const ringThickness = (maxRadius - innerHoleRadius) / levelsCount;

    sunburstSectors = [];

    // Algoritmo de partición angular con herencia de familia cromática del anfitrión (más clara en profundidad)
    function layoutSunburstSectors(nodes, startAngle, endAngle, depth, parentChapterIndex = 0) {
        const totalVal = nodes.reduce((sum, n) => sum + (n.amount || 0), 0);
        if (totalVal <= 0) return;

        let currentAngle = startAngle;
        const availableAngle = endAngle - startAngle;

        nodes.forEach((node, idx) => {
            // Nivel 1: cada capítulo visible tiene una familia cromática distinta (idx)
            // Niveles descendientes (> 1): HEREDA exactamente la familia del anfitrión (parentChapterIndex)
            const currentChapterIndex = depth === 1 ? idx : parentChapterIndex;
            const nodeAngle = (node.amount / totalVal) * availableAngle;
            const a0 = currentAngle;
            const a1 = currentAngle + nodeAngle;
            currentAngle = a1;

            const r0 = innerHoleRadius + (depth - 1) * ringThickness;
            const r1 = r0 + ringThickness;
            const color = getNodeColor(node, currentChapterIndex, depth);

            sunburstSectors.push({
                node: node,
                depth: depth,
                chapterIndex: currentChapterIndex,
                isChapterRoot: depth === 1,
                r0: r0,
                r1: r1,
                a0: a0,
                a1: a1,
                color: color
            });

            if (node.children && node.children.length > 0) {
                layoutSunburstSectors(node.children, a0, a1, depth + 1, currentChapterIndex);
            }
        });
    }

    if (sunburstHierarchyData.children && sunburstHierarchyData.children.length > 0) {
        layoutSunburstSectors(sunburstHierarchyData.children, -Math.PI / 2, Math.PI * 1.5, 1);
    }

    const isDark = document.body.classList.contains('dark-mode');

    // Aplicar transformación de zoom fluido focalizado desde el centro
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scaleFactor, scaleFactor);
    ctx.translate(-cx, -cy);

    // Dibujar sectores con "vacíos" (espacios vacíos angulares y radiales de separación)
    sunburstSectors.forEach(sec => {
        const isHovered = sunburstHoveredSector && sunburstHoveredSector.node.code === sec.node.code;

        // Separación angular (hueco vacío entre capítulos y entre partidas)
        const angularSpan = sec.a1 - sec.a0;
        let padAngle = sec.depth === 1 ? 0.024 : 0.008;
        if (angularSpan <= padAngle * 1.5) {
            padAngle = angularSpan * 0.2;
        }

        const drawA0 = sec.a0 + padAngle / 2;
        const drawA1 = sec.a1 - padAngle / 2;

        // Separación radial (hueco vacío entre anillos concéntricos)
        const radGap = 2;
        const drawR0 = sec.r0 + radGap;
        const drawR1 = sec.r1 - radGap;

        if (drawR1 <= drawR0 || drawA1 <= drawA0) return;

        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, drawR0, drawA0, drawA1, false);
        ctx.arc(cx, cy, drawR1, drawA1, drawA0, true);
        ctx.closePath();

        ctx.fillStyle = sec.color;
        ctx.globalAlpha = (isHovered ? 1.0 : 0.88) * animAlpha;
        ctx.fill();

        if (isHovered) {
            ctx.strokeStyle = isDark ? '#ffffff' : '#0f172a';
            ctx.lineWidth = 2.5;
            ctx.stroke();
        } else if (sec.depth === 1) {
            ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        ctx.restore();
    });

    // Círculo central decorativo (Fondo oscuro de tarjeta con borde refinado)
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, innerHoleRadius - 3, 0, Math.PI * 2);
    ctx.fillStyle = '#1e293b'; // Fondo de tarjeta oscuro siempre elegante
    ctx.globalAlpha = animAlpha;
    ctx.fill();
    ctx.strokeStyle = isDark ? '#334155' : '#475569';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    ctx.restore(); // Fin de transformación de escala
}

// Eventos interactivos en el canvas Sunburst
if (sunburstCanvas) {
    sunburstCanvas.addEventListener('mousemove', (e) => {
        if (sunburstAnim.active) return; // No interferir durante la animación de transición
        const rect = sunburstCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const cx = rect.width / 2;
        const cy = rect.height / 2;

        const dx = mouseX - cx;
        const dy = mouseY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let angle = Math.atan2(dy, dx); // [-PI, PI]
        // Normalizar a [-PI/2, 3PI/2]
        if (angle < -Math.PI / 2) angle += Math.PI * 2;

        // Comprobar si está en el círculo central
        const maxRadius = rect.width / 2 - 12;
        const innerHoleRadius = maxRadius * 0.28;

        let found = null;
        if (dist >= innerHoleRadius && dist <= maxRadius) {
            found = sunburstSectors.find(sec => dist >= sec.r0 && dist <= sec.r1 && angle >= sec.a0 && angle <= sec.a1);
        }

        if (found !== sunburstHoveredSector) {
            sunburstHoveredSector = found;
            drawSunburstCanvas();
            updateSunburstNodeCard(found ? found.node : null);
        }
    });

    sunburstCanvas.addEventListener('click', (e) => {
        if (sunburstAnim.active) return;
        const rect = sunburstCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const cx = rect.width / 2;
        const cy = rect.height / 2;

        const dx = mouseX - cx;
        const dy = mouseY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxRadius = rect.width / 2 - 12;
        const innerHoleRadius = maxRadius * 0.28;

        // Clic en el centro: Volver a la raíz global (Zoom Out)
        if (dist < innerHoleRadius) {
            if (sunburstRootCode !== null) {
                sunburstRootCode = null;
                refreshSunburst('out');
            }
            return;
        }

        if (sunburstHoveredSector) {
            const clickedNode = sunburstHoveredSector.node;
            const concept = parsedData.concepts[clickedNode.code];
            const hasDecomp = concept && concept.decomposition && concept.decomposition.length > 0;
            const hasChildren = clickedNode.children && clickedNode.children.length > 0;

            // Si es un capítulo, subcapítulo o partida con descompuestos, hacer zoom in fluido
            if (hasChildren || hasDecomp) {
                sunburstRootCode = clickedNode.code;
                refreshSunburst('in');
            }
        }
    });
}

/* ==========================================================================
   DIAGRAMA DE FLUJO DE COSTES SANKEY (DESCOMPUESTOS)
   ========================================================================== */

const toggleSunburstBtn = document.getElementById('toggleSunburstBtn');
const toggleSankeyBtn = document.getElementById('toggleSankeyBtn');
const decompModalTitle = document.getElementById('decompModalTitle');
const sankeyCanvas = document.getElementById('sankeyCanvas');

let currentDecompViewMode = 'sunburst';
let sankeyNodes = [];
let sankeyLinks = [];
let sankeyHoveredNode = null;
let sankeyHoveredLink = null;

let sankeyAnim = {
    startTime: 0,
    duration: 460, // ms
    active: false,
    direction: 'in', // 'in' | 'out'
    progress: 1
};

function triggerSankeyZoomAnimation(direction = 'in') {
    sankeyAnim.startTime = performance.now();
    sankeyAnim.direction = direction;
    sankeyAnim.active = true;
    sankeyAnim.progress = 0;
    requestAnimationFrame(animSankeyStep);
}

function animSankeyStep(now) {
    if (!sankeyAnim.active) return;
    const elapsed = now - sankeyAnim.startTime;
    let t = Math.min(elapsed / sankeyAnim.duration, 1);

    // Curva de amortiguación cúbica suave: easeOutCubic
    sankeyAnim.progress = 1 - Math.pow(1 - t, 3);

    drawSankeyCanvas();

    if (t < 1) {
        requestAnimationFrame(animSankeyStep);
    } else {
        sankeyAnim.active = false;
        sankeyAnim.progress = 1;
        drawSankeyCanvas();
    }
}

function setDecompViewMode(mode) {
    currentDecompViewMode = mode;
    if (toggleSunburstBtn) toggleSunburstBtn.classList.toggle('active', mode === 'sunburst');
    if (toggleSankeyBtn) toggleSankeyBtn.classList.toggle('active', mode === 'sankey');

    const centerLabel = document.getElementById('sunburstCenterLabel');

    if (mode === 'sunburst') {
        if (decompModalTitle) decompModalTitle.textContent = "Visualizador Concéntrico de Descompuestos (Sunburst)";
        if (sunburstCanvas) sunburstCanvas.style.display = 'block';
        if (sankeyCanvas) sankeyCanvas.style.display = 'none';
        if (centerLabel) centerLabel.style.display = 'block';
        drawSunburstCanvas();
    } else {
        if (decompModalTitle) decompModalTitle.textContent = "Diagrama de Flujo de Costes de Descompuestos (Sankey)";
        if (sunburstCanvas) sunburstCanvas.style.display = 'none';
        if (sankeyCanvas) sankeyCanvas.style.display = 'block';
        if (centerLabel) centerLabel.style.display = 'none';
        refreshSunburst();
    }
}

if (toggleSunburstBtn) toggleSunburstBtn.addEventListener('click', () => setDecompViewMode('sunburst'));
if (toggleSankeyBtn) toggleSankeyBtn.addEventListener('click', () => setDecompViewMode('sankey'));

/**
 * Renderiza el diagrama de flujo Sankey en Canvas 2D de alta definición con coherencia cromática y animación
 */
function drawSankeyCanvas() {
    if (!sankeyCanvas || !sunburstHierarchyData || currentDecompViewMode !== 'sankey') return;

    const container = sankeyCanvas.parentElement;
    const availW = container.clientWidth || 700;
    const availH = container.clientHeight || 600;
    const width = Math.max(availW - 10, 560);
    const height = Math.max(availH - 10, 580);
    const dpr = window.devicePixelRatio || 1;

    sankeyCanvas.width = width * dpr;
    sankeyCanvas.height = height * dpr;
    sankeyCanvas.style.width = `${width}px`;
    sankeyCanvas.style.height = `${height}px`;

    const ctx = sankeyCanvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const isDark = document.body.classList.contains('dark-mode');
    const totalPEM = Math.max(sunburstHierarchyData.amount || 1, 1);

    // Calcular factor de escala y opacidad durante la animación fluida
    const animProg = sankeyAnim.active ? sankeyAnim.progress : 1;
    let scaleFactor = 1;
    let animAlpha = 1;

    if (sankeyAnim.active) {
        if (sankeyAnim.direction === 'in') {
            scaleFactor = 0.84 + 0.16 * animProg;
            animAlpha = 0.25 + 0.75 * animProg;
        } else {
            scaleFactor = 1.16 - 0.16 * animProg;
            animAlpha = 0.25 + 0.75 * animProg;
        }
    }

    const paddingY = 16;
    const usableHeight = height - (paddingY * 2);

    // ─── Medir textos para adaptar el ancho de las columnas a los títulos ───
    ctx.font = 'bold 11px Inter, system-ui, sans-serif';
    const rawChapters = sunburstHierarchyData.children || [];
    let maxTitleLen = 14;
    rawChapters.forEach(c => {
        const title = (c.summary || c.code || '');
        if (title.length > maxTitleLen) maxTitleLen = title.length;
    });

    // Ancho adaptativo proporcional al título y ancho de pantalla
    const dynamicNodeWidth = Math.max(140, Math.min(Math.floor(width * 0.28), Math.max(160, maxTitleLen * 6.5 + 40)));
    const colX = [
        18,
        Math.floor((width - dynamicNodeWidth) / 2),
        width - dynamicNodeWidth - 18
    ];

    sankeyNodes = [];
    sankeyLinks = [];

    // Color del nodo raíz
    let rootColor = isDark ? '#3b82f6' : '#2563eb';
    if (sunburstRootCode) {
        rootColor = getStableConceptColor(sunburstRootCode, 'CH', 1);
    }

    // 1. Nodo Col 0 (Raíz / Concepto Activo)
    const rootNode = {
        id: 'root',
        col: 0,
        code: sunburstHierarchyData.code,
        cleanCode: sunburstHierarchyData.cleanCode,
        summary: sunburstHierarchyData.summary || 'Presupuesto Total',
        unit: '',
        quantity: 1,
        amount: totalPEM,
        type: 'ROOT',
        color: rootColor,
        x: colX[0],
        w: dynamicNodeWidth,
        y: paddingY,
        h: usableHeight
    };
    sankeyNodes.push(rootNode);

    // 2. Nodos Col 1 (Capítulos / Partidas adaptados 100% en altura sin cortes)
    const chTotal = rawChapters.reduce((sum, c) => sum + (c.amount || 0), 0) || 1;
    const chCount = Math.max(rawChapters.length, 1);
    
    // Gaps dinámicos según cantidad de nodos
    const gapY1 = Math.max(2, Math.min(8, Math.floor((usableHeight * 0.15) / chCount)));
    const totalGaps1 = (chCount - 1) * gapY1;
    const availH1 = Math.max(usableHeight - totalGaps1, 30);

    // Calcular alturas proporcionales con garantía de encaje total dentro de usableHeight
    const minNodeH = Math.max(14, Math.min(32, Math.floor(availH1 / chCount)));
    let rawHeights = rawChapters.map(ch => {
        const ratio = (ch.amount || 0) / chTotal;
        return Math.max(minNodeH, Math.floor(ratio * availH1));
    });

    const sumRawH = rawHeights.reduce((s, h) => s + h, 0) || 1;
    const scaleH = availH1 / sumRawH;

    let currY1 = paddingY;
    const col1Nodes = [];

    rawChapters.forEach((ch, idx) => {
        const h = Math.max(12, Math.floor(rawHeights[idx] * scaleH));
        const nodeColor = getNodeColor(ch, idx, 1);
        const concept = parsedData.concepts[ch.code] || {};

        const n = {
            id: 'ch_' + (ch.code || idx),
            col: 1,
            code: ch.code,
            cleanCode: ch.cleanCode,
            summary: ch.summary,
            unit: ch.unit || concept.unit || '',
            quantity: ch.quantity || parseFloat(concept.quantity) || 1,
            price: ch.price || parseFloat(concept.price) || 0,
            amount: ch.amount || 0,
            type: ch.type,
            natureBreakdown: ch.natureBreakdown,
            color: nodeColor,
            x: colX[1],
            w: dynamicNodeWidth,
            y: currY1,
            h: h,
            children: ch.children || []
        };
        col1Nodes.push(n);
        sankeyNodes.push(n);

        // Enlace Col 0 -> Col 1
        sankeyLinks.push({
            source: rootNode,
            target: n,
            amount: ch.amount || 0,
            color0: rootNode.color,
            color1: n.color
        });

        currY1 += h + gapY1;
    });

    // 3. Nodos Col 2 (Naturalezas Finales 🧱/👷/🚜 con altura 100% garantizada sin cortes)
    const nb = sunburstHierarchyData.natureBreakdown || { MO: 0, MQ: 0, MT: 0 };
    const natTotal = Math.max((nb.MO || 0) + (nb.MQ || 0) + (nb.MT || 0), totalPEM);

    const gapY2 = 10;
    const totalGaps2 = 2 * gapY2;
    const usableH2 = usableHeight - totalGaps2;

    // Garantizar un mínimo de 46px a CADA naturaleza (MT, MO, MQ) para que NINGUNA se corte
    const minNatH = 46;
    const remainingH = Math.max(0, usableH2 - (3 * minNatH));

    const hMT = Math.floor(minNatH + remainingH * ((nb.MT || 0) / natTotal));
    const hMO = Math.floor(minNatH + remainingH * ((nb.MO || 0) / natTotal));
    const hMQ = usableH2 - hMT - hMO; // Resto exacto: garantiza sum === usableH2 y no desborda jamás

    const natConfigs = [
        { key: 'MT', name: 'Materiales (🧱)', amount: nb.MT || 0, color: '#10b981', h: hMT },
        { key: 'MO', name: 'Mano de Obra (👷)', amount: nb.MO || 0, color: '#f59e0b', h: hMO },
        { key: 'MQ', name: 'Maquinaria (🚜)', amount: nb.MQ || 0, color: '#06b6d4', h: hMQ }
    ];

    let currY2 = paddingY;
    const col2Nodes = [];

    natConfigs.forEach(nat => {
        const n = {
            id: 'nat_' + nat.key,
            col: 2,
            code: nat.key,
            cleanCode: nat.key,
            summary: nat.name,
            unit: '',
            quantity: 1,
            amount: nat.amount || 0,
            type: nat.key,
            color: nat.color,
            x: colX[2],
            w: dynamicNodeWidth,
            y: currY2,
            h: nat.h
        };
        col2Nodes.push(n);
        sankeyNodes.push(n);

        // Enlaces desde cada capítulo hacia la naturaleza correspondiente
        col1Nodes.forEach(ch => {
            const chNB = ch.natureBreakdown || {};
            const val = chNB[nat.key] || (ch.amount * ((nat.amount || 1) / natTotal));
            if (val > 0) {
                sankeyLinks.push({
                    source: ch,
                    target: n,
                    amount: val,
                    color0: ch.color,
                    color1: n.color
                });
            }
        });

        currY2 += nat.h + gapY2;
    });

    // Aplicar transformación elástica centrada para animación de Zoom In / Zoom Out
    ctx.save();
    const midX = width / 2;
    const midY = height / 2;
    ctx.translate(midX, midY);
    ctx.scale(scaleFactor, scaleFactor);
    ctx.translate(-midX, -midY);

    // Calcular sumOut y sumIn exactos para cada nodo para garantizar normalización perfecta al 100%
    const nodeSumOut = {};
    const nodeSumIn = {};
    const nodeOutOffsets = {};
    const nodeInOffsets = {};
    sankeyNodes.forEach(n => {
        nodeSumOut[n.id] = 0;
        nodeSumIn[n.id] = 0;
        nodeOutOffsets[n.id] = 0;
        nodeInOffsets[n.id] = 0;
    });

    sankeyLinks.forEach(link => {
        nodeSumOut[link.source.id] = (nodeSumOut[link.source.id] || 0) + (link.amount || 0);
        nodeSumIn[link.target.id] = (nodeSumIn[link.target.id] || 0) + (link.amount || 0);
    });

    // ─── Dibujar Cintas de Flujo de Bézier (Ribbons) ───
    sankeyLinks.forEach(link => {
        const s = link.source;
        const t = link.target;
        const x0 = s.x + s.w;
        const x1 = t.x;
        const dx = (x1 - x0) * 0.5;

        const sTotal = nodeSumOut[s.id] || Math.max(s.amount || 1, 1);
        const tTotal = nodeSumIn[t.id] || Math.max(t.amount || 1, 1);

        const linkH0 = (link.amount / sTotal) * s.h;
        const linkH1 = (link.amount / tTotal) * t.h;

        const y0Top = s.y + (nodeOutOffsets[s.id] || 0);
        const y0Bottom = Math.min(s.y + s.h, y0Top + linkH0);
        nodeOutOffsets[s.id] = (nodeOutOffsets[s.id] || 0) + linkH0;

        const y1Top = t.y + (nodeInOffsets[t.id] || 0);
        const y1Bottom = Math.min(t.y + t.h, y1Top + linkH1);
        nodeInOffsets[t.id] = (nodeInOffsets[t.id] || 0) + linkH1;

        const isHovered = (sankeyHoveredNode && (sankeyHoveredNode.id === s.id || sankeyHoveredNode.id === t.id)) ||
                          (sankeyHoveredLink === link);

        ctx.save();
        const grad = ctx.createLinearGradient(x0, 0, x1, 0);
        grad.addColorStop(0, link.color0 || '#3b82f6');
        grad.addColorStop(1, link.color1 || '#10b981');

        ctx.fillStyle = grad;
        ctx.globalAlpha = (isHovered ? 0.88 : (sankeyHoveredNode ? 0.10 : 0.42)) * animAlpha;

        ctx.beginPath();
        ctx.moveTo(x0, y0Top);
        ctx.bezierCurveTo(x0 + dx, y0Top, x1 - dx, y1Top, x1, y1Top);
        ctx.lineTo(x1, y1Bottom);
        ctx.bezierCurveTo(x1 - dx, y1Bottom, x0 + dx, y0Bottom, x0, y0Bottom);
        ctx.closePath();
        ctx.fill();

        if (isHovered) {
            ctx.strokeStyle = isDark ? '#ffffff' : '#0f172a';
            ctx.lineWidth = 1.8;
            ctx.stroke();
        }
        ctx.restore();
    });

    // ─── Dibujar Nodos Rectangulares Estructurados ───
    const isGlobalView = (sunburstRootCode === null);

    sankeyNodes.forEach(node => {
        const isHovered = sankeyHoveredNode && sankeyHoveredNode.id === node.id;

        ctx.save();
        drawSafeRoundRect(ctx, node.x, node.y, node.w, node.h, 6);

        ctx.fillStyle = node.color || '#3b82f6';
        ctx.globalAlpha = (isHovered ? 1.0 : 0.94) * animAlpha;
        ctx.fill();

        ctx.strokeStyle = isHovered ? (isDark ? '#ffffff' : '#0f172a') : 'rgba(255,255,255,0.28)';
        ctx.lineWidth = isHovered ? 2.2 : 1;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = animAlpha;

        const padX = 8;
        let textY = node.y + 12;
        const maxTextChars = Math.max(12, Math.floor((node.w - 16) / 6.2));

        // En Vista Global para la Columna 1 (Capítulos): mostrar únicamente el título del capítulo
        if (node.col === 1 && isGlobalView) {
            ctx.font = 'bold 10px Inter, system-ui, sans-serif';
            const title = (node.cleanCode ? `[${node.cleanCode}] ` : '') + (node.summary || '');
            ctx.fillText(title.substring(0, maxTextChars), node.x + padX, textY);

            if (node.h >= 28) {
                textY += 12;
                ctx.font = '500 9px Inter, system-ui, sans-serif';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
                const pct = totalPEM > 0 ? ((node.amount / totalPEM) * 100).toFixed(1) : '0';
                ctx.fillText(`${(node.amount || 0).toLocaleString('es-ES', { maximumFractionDigits: 0 })} € (${pct}%)`, node.x + padX, textY);
            }
        } 
        // Naturalezas (Col 2) o Raíz (Col 0) o Vista con Zoom en Partidas (Col 1)
        else {
            // 1. CÓDIGO (en negrita)
            if (node.h >= 14) {
                ctx.font = 'bold 9.5px Inter, system-ui, sans-serif';
                const codeText = (node.cleanCode || node.code || '').substring(0, maxTextChars);
                ctx.fillText(codeText, node.x + padX, textY);
            }

            // 2. NOMBRE / RESUMEN
            if (node.h >= 26) {
                textY += 11;
                ctx.font = '500 9px Inter, system-ui, sans-serif';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
                const summaryText = (node.summary || '').substring(0, maxTextChars);
                ctx.fillText(summaryText, node.x + padX, textY);
            }

            // 3. CANTIDAD (si aplica unidad)
            if (node.h >= 40 && node.unit) {
                textY += 10;
                ctx.font = '500 8.5px Inter, system-ui, sans-serif';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
                const qtyText = `Cant: ${(node.quantity || 1).toLocaleString('es-ES', { maximumFractionDigits: 2 })} ${node.unit}`;
                ctx.fillText(qtyText, node.x + padX, textY);
            }

            // 4. PRECIO / COSTE TOTAL CON %
            if (node.h >= 52 || (node.h >= 36 && !node.unit)) {
                textY += 11;
                ctx.font = 'bold 9px Inter, system-ui, sans-serif';
                ctx.fillStyle = '#ffffff';
                const pct = totalPEM > 0 ? ((node.amount / totalPEM) * 100).toFixed(1) : '0';
                const amountText = `${(node.amount || 0).toLocaleString('es-ES', { maximumFractionDigits: 0 })} € (${pct}%)`;
                ctx.fillText(amountText, node.x + padX, textY);
            }
        }

        ctx.restore();
    });

    ctx.restore(); // Fin de transformación elástica
}

    

// Eventos interactivos en el canvas Sankey
if (sankeyCanvas) {
    sankeyCanvas.addEventListener('mousemove', (e) => {
        if (currentDecompViewMode !== 'sankey' || sankeyAnim.active) return;
        const rect = sankeyCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const foundNode = sankeyNodes.find(n =>
            mouseX >= n.x && mouseX <= n.x + n.w &&
            mouseY >= n.y && mouseY <= n.y + n.h
        );

        if (foundNode !== sankeyHoveredNode) {
            sankeyHoveredNode = foundNode;
            drawSankeyCanvas();
            if (foundNode) {
                const nodeConcept = parsedData.concepts[foundNode.code] || {
                    code: foundNode.code,
                    summary: foundNode.summary,
                    price: foundNode.amount,
                    unit: ''
                };
                updateSunburstNodeCard({
                    code: foundNode.code,
                    cleanCode: foundNode.cleanCode || foundNode.code,
                    summary: foundNode.summary,
                    type: foundNode.type,
                    amount: foundNode.amount,
                    natureBreakdown: foundNode.natureBreakdown || getConceptNatureBreakdown(foundNode.code)
                });
            } else {
                updateSunburstNodeCard(null);
            }
        }
    });

    sankeyCanvas.addEventListener('click', (e) => {
        if (currentDecompViewMode !== 'sankey' || sankeyAnim.active) return;
        if (sankeyHoveredNode) {
            if (sankeyHoveredNode.type === 'ROOT') {
                if (sunburstRootCode !== null) {
                    sunburstRootCode = null;
                    refreshSunburst('out');
                }
                return;
            }

            const concept = parsedData.concepts[sankeyHoveredNode.code];
            if (concept && ((concept.decomposition && concept.decomposition.length > 0) || (concept.children && concept.children.length > 0))) {
                sunburstRootCode = sankeyHoveredNode.code;
                refreshSunburst('in');
            } else if (concept) {
                // Actualizar tarjeta y tabla fija
                updateSunburstNodeCard({
                    code: sankeyHoveredNode.code,
                    cleanCode: sankeyHoveredNode.cleanCode || sankeyHoveredNode.code,
                    summary: sankeyHoveredNode.summary,
                    type: sankeyHoveredNode.type,
                    amount: sankeyHoveredNode.amount,
                    natureBreakdown: sankeyHoveredNode.natureBreakdown || getConceptNatureBreakdown(sankeyHoveredNode.code)
                });
            }
        }
    });

    sankeyCanvas.addEventListener('mouseleave', () => {
        if (currentDecompViewMode !== 'sankey') return;
        sankeyHoveredNode = null;
        sankeyHoveredLink = null;
        drawSankeyCanvas();
        updateSunburstNodeCard(null);
    });
}

function updateSunburstNodeCard(node) {
    const nodeTypeEl = document.getElementById('sNodeType');
    const nodeCodeEl = document.getElementById('sNodeCode');
    const nodeSummaryEl = document.getElementById('sNodeSummary');
    const nodeAmountEl = document.getElementById('sNodeAmount');
    const nodePercentEl = document.getElementById('sNodePercent');
    const natureBreakdownEl = document.getElementById('sNatureBreakdown');

    // Determinar el nodo a mostrar: si no hay nodo hovered pero hay un concepto enfocado (zoom activo), mantenerlo fijo
    let targetNode = node;
    if (!targetNode && sunburstRootCode && parsedData && parsedData.concepts[sunburstRootCode]) {
        targetNode = buildSunburstNode(sunburstRootCode, 0, 4, 'ALL');
    }
    if (!targetNode) {
        targetNode = sunburstHierarchyData;
    }
    if (!targetNode) return;

    const isGlobal = !node && !sunburstRootCode;

    const typeLabels = {
        ROOT: '🏢 Presupuesto',
        CH: '📁 Capítulo',
        SUBCH: '📂 Subcapítulo',
        PA: '📄 Partida',
        MT: '🧱 Material',
        MO: '👷 Mano de Obra',
        MQ: '🚜 Maquinaria'
    };

    if (nodeTypeEl) nodeTypeEl.textContent = isGlobal ? '🏢 PRESUPUESTO' : (typeLabels[targetNode.type] || 'Concepto');
    if (nodeCodeEl) nodeCodeEl.textContent = targetNode.cleanCode || 'GLOBAL';
    if (nodeSummaryEl) nodeSummaryEl.textContent = targetNode.summary || 'Presupuesto Total de Obra';
    if (nodeAmountEl) nodeAmountEl.textContent = targetNode.amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

    const totalPEM = sunburstHierarchyData ? sunburstHierarchyData.amount : 1;
    const pct = totalPEM > 0 ? (targetNode.amount / totalPEM) * 100 : 0;
    if (nodePercentEl) nodePercentEl.textContent = isGlobal ? '100,00 %' : `${pct.toFixed(2)} %`;

    if (natureBreakdownEl) {
        const nb = targetNode.natureBreakdown || { MO: 0, MQ: 0, MT: 0 };
        const bMO = nb.MO || 0;
        const bMQ = nb.MQ || 0;
        const bMT = nb.MT || 0;
        const sumNatures = (bMO + bMQ + bMT) || targetNode.amount || 1;

        const pMO = (bMO / sumNatures) * 100;
        const pMQ = (bMQ / sumNatures) * 100;
        const pMT = (bMT / sumNatures) * 100;

        natureBreakdownEl.innerHTML = `
            <div class="s-stacked-breakdown-bar" title="Material: ${pMT.toFixed(1)}% | M. Obra: ${pMO.toFixed(1)}% | Maquinaria: ${pMQ.toFixed(1)}%">
                <div class="s-stacked-segment seg-mt" style="width:${pMT}%;" title="Materiales: ${pMT.toFixed(1)}%"></div>
                <div class="s-stacked-segment seg-mo" style="width:${pMO}%;" title="Mano de Obra: ${pMO.toFixed(1)}%"></div>
                <div class="s-stacked-segment seg-mq" style="width:${pMQ}%;" title="Maquinaria: ${pMQ.toFixed(1)}%"></div>
            </div>
            <div class="s-breakdown-row">
                <span class="s-breakdown-label">🧱 Material:</span>
                <div class="s-breakdown-val-group">
                    <span class="s-breakdown-pct" style="color:#10b981;">${pMT.toFixed(1)}%</span>
                    <span class="s-breakdown-amt">(${bMT.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €)</span>
                </div>
            </div>
            <div class="s-breakdown-row">
                <span class="s-breakdown-label">👷 M. Obra:</span>
                <div class="s-breakdown-val-group">
                    <span class="s-breakdown-pct" style="color:#f59e0b;">${pMO.toFixed(1)}%</span>
                    <span class="s-breakdown-amt">(${bMO.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €)</span>
                </div>
            </div>
            <div class="s-breakdown-row">
                <span class="s-breakdown-label">🚜 Maquinaria:</span>
                <div class="s-breakdown-val-group">
                    <span class="s-breakdown-pct" style="color:#06b6d4;">${pMQ.toFixed(1)}%</span>
                    <span class="s-breakdown-amt">(${bMQ.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €)</span>
                </div>
            </div>
        `;
    }

    // 3. Ficha de Descompuestos (Tabla de Componentes de ancho completo)
    const decompContainerEl = document.getElementById('sDecompContainer');
    const decompCountEl = document.getElementById('sDecompCount');

    if (decompContainerEl) {
        let concept = null;
        if (targetNode && targetNode.code && parsedData && parsedData.concepts) {
            concept = parsedData.concepts[targetNode.code];
        }

        if (concept && concept.decomposition && concept.decomposition.length > 0) {
            if (decompCountEl) decompCountEl.textContent = `(${concept.decomposition.length} componentes)`;

            const nodeTotal = targetNode.amount || 1;
            let tableHtml = `
                <table class="s-decomp-table">
                    <thead>
                        <tr>
                            <th style="width:38%;">Nombre / Concepto</th>
                            <th style="text-align:right; width:12%;">Cantidad</th>
                            <th style="text-align:center; width:8%;">Unidad</th>
                            <th style="text-align:right; width:14%;">Precio</th>
                            <th style="text-align:right; width:14%;">Coste</th>
                            <th style="text-align:right; width:14%;">% Partida</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            concept.decomposition.forEach(item => {
                const childConcept = parsedData.concepts[item.code] || {};
                const factor = parseFloat(item.factor) || 1;
                const price = parseFloat(childConcept.price) || 0;
                const partial = factor * price;
                const unit = childConcept.unit || '-';
                const summary = childConcept.summary || item.code;
                const cleanCode = item.code.replace(/#+\s*$/, '');
                const itemPct = nodeTotal > 0 ? ((partial / nodeTotal) * 100).toFixed(2) : '0.00';

                // Determinar icono de naturaleza
                const uUpper = (unit || '').toUpperCase().trim();
                const codeUp = item.code.toUpperCase();
                const sumLow = summary.toLowerCase();
                let natIcon = '🧱';

                if (uUpper === 'H' || uUpper === 'HR' || uUpper === 'HORA' || codeUp.startsWith('MO') || codeUp.startsWith('O') || /oficial|peon|cuadrilla|encargado|ayudante|hora/.test(sumLow)) {
                    natIcon = '👷';
                } else if (uUpper === 'HM' || codeUp.startsWith('MQ') || codeUp.startsWith('M0') || /camion|dumper|grua|retro|pala|maquinaria|compresor/.test(sumLow)) {
                    natIcon = '🚜';
                } else if (item.code.endsWith('#') || !childConcept.unit) {
                    natIcon = '📁';
                }

                tableHtml += `
                    <tr>
                        <td>
                            <div style="display:flex; align-items:center; gap:8px;">
                                <span style="font-size:1.1rem; flex-shrink:0;">${natIcon}</span>
                                <div style="min-width:0;">
                                    <div style="font-weight:600; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${cleanCode} - ${summary}">
                                        <span class="code-badge" style="font-size:0.68rem; padding:1px 5px; margin-right:4px;">${cleanCode}</span>
                                        ${summary}
                                    </div>
                                </div>
                            </div>
                        </td>
                        <td style="text-align:right; font-family:monospace; font-weight:600;">
                            ${formatQuantityByUnit(factor, childConcept.unit)}
                        </td>
                        <td style="text-align:center; color:var(--text-secondary); font-size:0.75rem;">
                            ${unit}
                        </td>
                        <td style="text-align:right; font-family:monospace;">
                            ${price.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                        </td>
                        <td style="text-align:right; font-family:monospace; font-weight:700; color:var(--accent, #3b82f6);">
                            ${partial.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                        </td>
                        <td style="text-align:right; font-family:monospace; font-weight:600;">
                            ${itemPct} %
                        </td>
                    </tr>
                `;
            });

            tableHtml += `</tbody></table>`;
            decompContainerEl.innerHTML = tableHtml;
        } else {
            if (decompCountEl) decompCountEl.textContent = '';
            decompContainerEl.innerHTML = `
                <div style="color:var(--text-secondary); font-size:0.78rem; text-align:center; padding:24px 8px; line-height:1.5;">
                    ${targetNode && targetNode.type !== 'ROOT' ? 'Este elemento es un insumo básico directo sin descomposición inferior.' : 'Pasa el cursor o pulsa sobre cualquier partida o capítulo para ver el listado detallado de sus componentes.'}
                </div>
            `;
        }
    }
}


/* ==========================================================================
   MOTOR DE SINCRONIZACIÓN CLOUD CON CIFRADO E2E (GOOGLE DRIVE / MULTI-DEVICE)
   ========================================================================== */

const cloudSyncModal = document.getElementById('cloudSyncModal');
const cloudSyncBtn = document.getElementById('cloudSyncBtn');
const closeCloudSyncBtn = document.getElementById('closeCloudSyncBtn');
const closeCloudSyncOkBtn = document.getElementById('closeCloudSyncOkBtn');
const googleDriveConnectBtn = document.getElementById('googleDriveConnectBtn');
const cloudAutoSyncToggle = document.getElementById('cloudAutoSyncToggle');
const uploadCurrentToCloudBtn = document.getElementById('uploadCurrentToCloudBtn');
const refreshCloudListBtn = document.getElementById('refreshCloudListBtn');
const cloudFilesTable = document.getElementById('cloudFilesTable');
const cloudFilesTableBody = document.getElementById('cloudFilesTableBody');
const cloudFilesEmptyMsg = document.getElementById('cloudFilesEmptyMsg');
const cloudAccountTitle = document.getElementById('cloudAccountTitle');
const cloudAccountSubtext = document.getElementById('cloudAccountSubtext');
const cloudAuthControls = document.getElementById('cloudAuthControls');
const cloudSyncStatusText = document.getElementById('cloudSyncStatusText');

// Clave maestra persistente local para cifrado E2E transparente
function getOrCreateDeviceMasterKey() {
    let key = localStorage.getItem('bc3_e2e_device_key');
    if (!key) {
        const arr = new Uint8Array(24);
        window.crypto.getRandomValues(arr);
        key = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
        localStorage.setItem('bc3_e2e_device_key', key);
    }
    return key;
}

// ── Cifrado E2E con Web Crypto API (AES-GCM 256 bits + PBKDF2) ──

function bufferToBase64Async(buf) {
    return new Promise((resolve) => {
        const blob = new Blob([buf]);
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result;
            const base64 = dataUrl.split(',')[1] || '';
            resolve(base64);
        };
        reader.readAsDataURL(blob);
    });
}

async function base64ToBufferAsync(b64) {
    const res = await fetch('data:application/octet-stream;base64,' + b64);
    return await res.arrayBuffer();
}

async function encryptDataE2E(plainText, secretKey = getOrCreateDeviceMasterKey()) {
    const enc = new TextEncoder();
    const rawData = enc.encode(plainText);
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        enc.encode(secretKey),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );

    const key = await window.crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
    );

    const encrypted = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        rawData
    );

    const [saltB64, ivB64, cipherB64] = await Promise.all([
        bufferToBase64Async(salt),
        bufferToBase64Async(iv),
        bufferToBase64Async(encrypted)
    ]);

    return {
        v: 1,
        salt: saltB64,
        iv: ivB64,
        ciphertext: cipherB64,
        timestamp: new Date().toISOString()
    };
}

async function decryptDataE2E(cipherObj, secretKey = getOrCreateDeviceMasterKey()) {
    const enc = new TextEncoder();
    const [salt, iv, data] = await Promise.all([
        base64ToBufferAsync(cipherObj.salt),
        base64ToBufferAsync(cipherObj.iv),
        base64ToBufferAsync(cipherObj.ciphertext)
    ]);

    const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        enc.encode(secretKey),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );

    const key = await window.crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
    );

    const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        data
    );

    return new TextDecoder().decode(decrypted);
}

// ── Almacén y Gestión de Bóveda Cloud Vault (IndexedDB + Metadatos Ligeros) ──

const VAULT_DB_NAME = 'BC3_Cloud_Vault_DB';
const VAULT_STORE = 'vault_ciphers';

function getVaultDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(VAULT_DB_NAME, 1);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(VAULT_STORE)) {
                db.createObjectStore(VAULT_STORE, { keyPath: 'id' });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function saveCipherToVaultDB(id, cipherObj) {
    try {
        const db = await getVaultDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(VAULT_STORE, 'readwrite');
            const store = tx.objectStore(VAULT_STORE);
            store.put({ id, cipher: cipherObj });
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
        });
    } catch (e) {
        console.warn("Aviso al persistir en IndexedDB:", e);
    }
}

async function getCipherFromVaultDB(id) {
    try {
        const db = await getVaultDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(VAULT_STORE, 'readonly');
            const store = tx.objectStore(VAULT_STORE);
            const req = store.get(id);
            req.onsuccess = () => resolve(req.result ? req.result.cipher : null);
            req.onerror = () => reject(req.error);
        });
    } catch (e) {
        console.warn("Aviso al leer de IndexedDB:", e);
        return null;
    }
}

async function deleteCipherFromVaultDB(id) {
    try {
        const db = await getVaultDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(VAULT_STORE, 'readwrite');
            const store = tx.objectStore(VAULT_STORE);
            store.delete(id);
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
        });
    } catch (e) {
        console.warn("Aviso al eliminar de IndexedDB:", e);
    }
}

function getCloudVaultFiles() {
    try {
        const raw = localStorage.getItem('bc3_cloud_vault_files');
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function saveCloudVaultFiles(files) {
    try {
        // Guardar solo metadatos ligeros en localStorage para evitar exceder la cuota
        const cleanFiles = files.map(f => ({
            id: f.id,
            driveId: f.driveId || null,
            fileName: f.fileName,
            lastModified: f.lastModified,
            sizeBytes: f.sizeBytes,
            sizeKb: f.sizeKb,
            totalPEM: f.totalPEM,
            isDrive: !!f.isDrive
        }));
        localStorage.setItem('bc3_cloud_vault_files', JSON.stringify(cleanFiles));
    } catch (e) {
        console.warn("Aviso al guardar metadatos en localStorage:", e);
    }
}

function openCloudSyncModal() {
    if (cloudSyncModal) {
        cloudSyncModal.style.display = 'flex';
        updateCloudAccountUI();
        renderCloudFilesTable();
    }
}

function closeCloudSyncModal() {
    if (cloudSyncModal) {
        cloudSyncModal.style.display = 'none';
    }
}

// ── Motor Oficial de Google Drive Sync & Google Identity Services (OAuth2) ──

let googleTokenClient = null;
let googleAccessToken = sessionStorage.getItem('bc3_gdrive_access_token') || null;
let googleDriveFolderId = localStorage.getItem('bc3_gdrive_folder_id') || null;

function getGoogleClientId() {
    return localStorage.getItem('bc3_google_custom_client_id') || '423499084317-d1epb2522jeiq5964nflpp8m8raavfqj.apps.googleusercontent.com';
}

function initGoogleIdentity() {
    if (typeof window.google === 'undefined' || !window.google.accounts || !window.google.accounts.oauth2) {
        return false;
    }
    const clientId = getGoogleClientId();
    if (!clientId) return false;

    try {
        googleTokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
            callback: async (tokenResponse) => {
                if (tokenResponse.error !== undefined) {
                    console.error("Google Auth Error:", tokenResponse);
                    if (cloudSyncStatusText) cloudSyncStatusText.textContent = `❌ Error de Google: ${tokenResponse.error}`;
                    alert("Error de autenticación con Google: " + tokenResponse.error);
                    return;
                }
                googleAccessToken = tokenResponse.access_token;
                sessionStorage.setItem('bc3_gdrive_access_token', googleAccessToken);

                if (cloudSyncStatusText) cloudSyncStatusText.textContent = `⏳ Verificando cuenta de Google...`;

                // 1. Obtener perfil oficial del usuario desde Google
                const profile = await fetchGoogleUserProfile(googleAccessToken);
                const userEmail = (profile && profile.email) ? profile.email : 'usuario@gmail.com';
                localStorage.setItem('bc3_cloud_user_account', userEmail);
                if (profile && profile.name) localStorage.setItem('bc3_cloud_user_name', profile.name);
                if (profile && profile.picture) localStorage.setItem('bc3_cloud_user_picture', profile.picture);

                // 2. Localizar o crear la carpeta /BC3_Viewer_Sync/ en Google Drive
                if (cloudSyncStatusText) cloudSyncStatusText.textContent = `⏳ Localizando carpeta /BC3_Viewer_Sync/...`;
                googleDriveFolderId = await getOrCreateDriveFolder(googleAccessToken);
                if (googleDriveFolderId) {
                    localStorage.setItem('bc3_gdrive_folder_id', googleDriveFolderId);
                }

                updateCloudAccountUI();
                await syncFilesFromGoogleDrive();
                if (cloudSyncStatusText) cloudSyncStatusText.textContent = `🟢 Conectado con éxito a Google Drive`;
                showAppToast(`Google Drive conectado: ${userEmail}`, '🟢');
            }
        });
        return true;
    } catch (e) {
        console.warn("No se pudo inicializar Google Identity Client:", e);
        return false;
    }
}

async function fetchGoogleUserProfile(token) {
    try {
        const resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resp.ok) return await resp.json();
    } catch (e) {
        console.warn("Aviso al obtener userinfo:", e);
    }
    return null;
}

async function getOrCreateDriveFolder(token, folderName = 'BC3Viewer') {
    try {
        // Buscar si ya existe la carpeta oficial BC3Viewer
        const query = encodeURIComponent(`name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
        const searchResp = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (searchResp.ok) {
            const data = await searchResp.json();
            if (data.files && data.files.length > 0) {
                return data.files[0].id;
            }
        }

        // Si no existe, crear la carpeta en la raíz del Drive
        const createResp = await fetch('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder',
                description: 'Carpeta oficial de sincronización segura de presupuestos de BC3 Viewer'
            })
        });
        if (createResp.ok) {
            const created = await createResp.json();
            return created.id;
        }
    } catch (e) {
        console.warn("Aviso al gestionar carpeta de Google Drive:", e);
    }
    return null;
}

let isUploadingCloud = false;

async function uploadFileToGoogleDriveAPI(token, folderId, fileName, cipherObj, rawSize, totalPEM) {
    const boundary = 'bc3_boundary_' + Date.now();
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";

    const metadata = {
        name: fileName,
        mimeType: 'application/json',
        parents: folderId ? [folderId] : [],
        description: `Presupuesto BC3 cifrado E2E con AES-256. PEM: ${totalPEM} €`,
        appProperties: {
            bc3Encrypted: 'true',
            rawSize: String(rawSize),
            totalPEM: String(totalPEM),
            timestamp: new Date().toISOString()
        }
    };

    const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json; charset=UTF-8' });
    const payloadBlob = new Blob([JSON.stringify(cipherObj)], { type: 'application/json; charset=UTF-8' });

    const multipartBody = new Blob([
        delimiter,
        'Content-Type: application/json; charset=UTF-8\r\n\r\n',
        metadataBlob,
        delimiter,
        'Content-Type: application/json\r\n\r\n',
        payloadBlob,
        close_delim
    ], { type: `multipart/related; boundary=${boundary}` });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: multipartBody,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errJson = await response.json().catch(() => ({}));
            throw new Error(errJson.error ? errJson.error.message : `HTTP ${response.status} en Google Drive`);
        }

        return await response.json();
    } catch (fetchErr) {
        clearTimeout(timeoutId);
        if (fetchErr.name === 'AbortError') {
            throw new Error("Tiempo de espera agotado al conectar con Google Drive.");
        }
        throw fetchErr;
    }
}

async function syncFilesFromGoogleDrive() {
    if (!googleAccessToken) {
        renderCloudFilesTable();
        return;
    }
    try {
        const folderId = googleDriveFolderId || await getOrCreateDriveFolder(googleAccessToken);
        if (!folderId) {
            renderCloudFilesTable();
            return;
        }

        const query = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
        const resp = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime,size,appProperties,description)`, {
            headers: { 'Authorization': `Bearer ${googleAccessToken}` }
        });

        if (resp.status === 401) {
            // Token expirado, renovar silenciosamente
            sessionStorage.removeItem('bc3_gdrive_access_token');
            googleAccessToken = null;
            const gisReady = initGoogleIdentity();
            if (gisReady && googleTokenClient) {
                googleTokenClient.requestAccessToken({ prompt: '' });
            }
            return;
        }

        if (resp.ok) {
            const data = await resp.json();
            if (data.files) {
                const cloudFiles = data.files.map(f => ({
                    id: f.id,
                    driveId: f.id,
                    fileName: f.name,
                    lastModified: new Date(f.modifiedTime).toLocaleString('es-ES'),
                    sizeKb: f.size ? (parseInt(f.size) / 1024).toFixed(1) : '—',
                    totalPEM: f.appProperties && f.appProperties.totalPEM ? parseFloat(f.appProperties.totalPEM) : null,
                    isDrive: true
                }));
                // Mezclar con la lista local existente
                const localFiles = getCloudVaultFiles().filter(lf => !cloudFiles.some(cf => cf.fileName.toLowerCase() === lf.fileName.toLowerCase()));
                saveCloudVaultFiles([...cloudFiles, ...localFiles]);
                renderCloudFilesTable();
            }
        }
    } catch (e) {
        console.warn("Aviso al sincronizar lista de Drive:", e);
    }
}

function getLoggedUserProfile() {
    try {
        const name = (localStorage.getItem('bc3_cloud_user_name') || '').trim();
        const email = (localStorage.getItem('bc3_cloud_user_account') || '').trim();
        const picture = (localStorage.getItem('bc3_cloud_user_picture') || '').trim();
        let firstName = '';
        if (name) {
            firstName = name.split(' ')[0];
        } else if (email) {
            const rawNick = email.split('@')[0];
            firstName = rawNick.charAt(0).toUpperCase() + rawNick.slice(1);
        }
        return { name, firstName, email, picture, isLogged: Boolean(email) };
    } catch (e) {
        return { name: '', firstName: '', email: '', picture: '', isLogged: false };
    }
}

function updateSettingsUserHeaderUI() {
    const user = getLoggedUserProfile();
    const nameEl = document.getElementById('settingsUserName');
    const emailEl = document.getElementById('settingsUserEmail');
    const avatarEl = document.getElementById('settingsUserAvatar');

    if (nameEl && emailEl && avatarEl) {
        if (user.isLogged) {
            nameEl.textContent = user.name ? `¡Hola, ${user.firstName}! 👋` : `¡Hola! 👋`;
            emailEl.textContent = user.email;
            if (user.picture) {
                avatarEl.innerHTML = `<img src="${user.picture}" alt="${user.name || 'Perfil'}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;" referrerpolicy="no-referrer" onerror="this.style.display='none'; this.parentElement.textContent='${user.firstName ? user.firstName.charAt(0).toUpperCase() : '👤'}';" />`;
            } else {
                avatarEl.textContent = (user.firstName ? user.firstName.charAt(0).toUpperCase() : '👤');
            }
        } else {
            nameEl.textContent = '¡Hola! 👋';
            emailEl.textContent = 'Modo Local / Offline';
            avatarEl.textContent = '👤';
        }
    }
}

function updateCloudAccountUI() {
    const userAccount = localStorage.getItem('bc3_cloud_user_account');
    const userName = localStorage.getItem('bc3_cloud_user_name');
    const autoSync = localStorage.getItem('bc3_cloud_autosync') !== 'false';
    const folderId = localStorage.getItem('bc3_gdrive_folder_id');

    updateSettingsUserHeaderUI();

    if (cloudAutoSyncToggle) cloudAutoSyncToggle.checked = autoSync;

    if (userAccount) {
        if (cloudAccountTitle) cloudAccountTitle.textContent = `🟢 Conectado con Google Drive`;
        const driveFolderLink = folderId ? `<a href="https://drive.google.com/drive/folders/${folderId}" target="_blank" style="color:var(--accent-primary, #3b82f6); text-decoration:underline; font-weight:600; margin-left:6px;">📁 Abrir /BC3Viewer/ en Google Drive ↗</a>` : `<span>📁 Carpeta: /BC3Viewer/</span>`;
        if (cloudAccountSubtext) cloudAccountSubtext.innerHTML = `Cuenta: <b>${userAccount}</b> ${userName ? '(' + userName + ')' : ''} | ${driveFolderLink}`;
        if (cloudAuthControls) {
            cloudAuthControls.innerHTML = `
                <button type="button" id="googleDriveDisconnectBtn" class="gantt-action-btn" style="color:var(--danger, #ef4444); border-color:var(--border-color); font-size:0.78rem; padding:6px 12px;">
                    🚪 Desconectar
                </button>
            `;
            const disBtn = document.getElementById('googleDriveDisconnectBtn');
            if (disBtn) disBtn.addEventListener('click', disconnectGoogleAccount);
        }
    } else {
        if (cloudAccountTitle) cloudAccountTitle.textContent = `Google Drive Sync`;
        if (cloudAccountSubtext) cloudAccountSubtext.textContent = `Copia segura y automática en la carpeta /BC3Viewer/ de tu propio Google Drive`;
        if (cloudAuthControls) {
            cloudAuthControls.innerHTML = `
                <button type="button" id="googleDriveConnectBtn" class="process-btn" style="padding:7px 14px; font-size:0.82rem; margin:0; display:flex; align-items:center; gap:6px;">
                    <span>🔑</span> Conectar con Google
                </button>
            `;
            const conBtn = document.getElementById('googleDriveConnectBtn');
            if (conBtn) conBtn.addEventListener('click', connectGoogleAccount);
        }
    }
}

function connectGoogleAccount() {
    const gisReady = initGoogleIdentity();
    if (gisReady && googleTokenClient) {
        googleTokenClient.requestAccessToken({ prompt: 'consent' });
        return;
    }

    const currentAccount = localStorage.getItem('bc3_cloud_user_account') || '';
    const defaultEmail = currentAccount || (parsedData && parsedData.properties && parsedData.properties.owner ? `${parsedData.properties.owner.toLowerCase().replace(/\s+/g, '')}@gmail.com` : 'usuario@gmail.com');
    const email = prompt("Introduce tu cuenta de Google para activar la bóveda de sincronización cifrada:", defaultEmail);
    if (email !== null) {
        const trimmed = email.trim();
        if (trimmed.length > 0 && trimmed.includes('@')) {
            localStorage.setItem('bc3_cloud_user_account', trimmed);
            updateCloudAccountUI();
            if (cloudSyncStatusText) cloudSyncStatusText.textContent = `🟢 Bóveda vinculada exitosamente como ${trimmed}`;
            showAppToast(`Bóveda vinculada: ${trimmed}`, '🔑');
        } else if (trimmed.length > 0) {
            alert("Por favor introduce un correo válido (ej: usuario@gmail.com).");
        }
    }
}

function disconnectGoogleAccount() {
    if (confirm("¿Deseas desconectar tu cuenta de Google Drive? Los archivos guardados permanecerán seguros.")) {
        localStorage.removeItem('bc3_cloud_user_account');
        localStorage.removeItem('bc3_cloud_user_name');
        localStorage.removeItem('bc3_cloud_user_picture');
        localStorage.removeItem('bc3_gdrive_folder_id');
        sessionStorage.removeItem('bc3_gdrive_access_token');
        googleAccessToken = null;
        googleDriveFolderId = null;
        updateCloudAccountUI();
        if (cloudSyncStatusText) cloudSyncStatusText.textContent = `⚪ Cuenta desconectada`;
    }
}

function generateBasicBC3FromData(data) {
    if (!data || !data.concepts) return "";
    const lines = [];
    const props = data.properties || {};
    lines.push(`~V|${props.owner || ''}|${props.format || 'FIEBDC-3/2020'}|${props.generator || 'BC3Viewer'}|${props.description || ''}|`);
    for (const code in data.concepts) {
        const c = data.concepts[code];
        lines.push(`~C|${c.code || ''}|${c.unit || ''}|${(c.summary || '').replace(/[\r\n]/g, ' ')}|${c.price || 0}|${c.date || ''}|${c.type || 0}|`);
        if (c.decomposition && c.decomposition.length > 0) {
            const decompStr = c.decomposition.map(d => `${d.code}\\${d.factor || 1}\\${d.percentage || 0}`).join('\\');
            lines.push(`~D|${c.code}|${decompStr}|`);
        }
        if (c.description) {
            lines.push(`~T|${c.code}|${c.description}|`);
        }
    }
    return lines.join('\r\n') + '\r\n';
}

async function uploadActiveBudgetToCloud() {
    if (isUploadingCloud) return;
    if (!parsedData || !parsedData.concepts) {
        alert("Primero debes abrir o tener cargado un archivo de presupuesto (.bc3).");
        return;
    }

    isUploadingCloud = true;
    if (uploadCurrentToCloudBtn) {
        uploadCurrentToCloudBtn.disabled = true;
        uploadCurrentToCloudBtn.innerHTML = `⏳ Subiendo...`;
    }
    if (cloudSyncStatusText) cloudSyncStatusText.textContent = `⏳ Serializando presupuesto...`;

    // Dejar respirar al hilo del navegador para pintar el estado
    await new Promise(r => setTimeout(r, 40));

    try {
        let bc3Content = "";

        if (typeof BC3Writer !== 'undefined') {
            try {
                const writer = new BC3Writer();
                bc3Content = writer.write(parsedData);
            } catch (wErr) {
                console.warn("Aviso al serializar con BC3Writer:", wErr);
            }
        }

        if (!bc3Content || bc3Content.trim().length === 0) {
            if (originalFileText && originalFileText.trim().length > 0) {
                bc3Content = originalFileText;
            } else if (typeof currentBudgetTabId !== 'undefined' && currentBudgetTabId) {
                const tab = budgetTabs.find(t => t.id === currentBudgetTabId);
                if (tab && tab.rawText && tab.rawText.trim().length > 0) {
                    bc3Content = tab.rawText;
                }
            }
        }

        if (!bc3Content || bc3Content.trim().length === 0) {
            bc3Content = generateBasicBC3FromData(parsedData);
        }

        if (!bc3Content || bc3Content.trim().length === 0) {
            throw new Error("No se pudo generar el contenido del archivo BC3.");
        }

        if (cloudSyncStatusText) cloudSyncStatusText.textContent = `⏳ Cifrando con AES-256 GCM...`;
        await new Promise(r => setTimeout(r, 40));

        const cipherObj = await encryptDataE2E(bc3Content);
        const fileName = currentFileName || `Presupuesto_${new Date().toISOString().slice(0, 10)}.bc3`;
        const totalPEM = typeof calculateTotalBudget === 'function' ? calculateTotalBudget() : 0;

        let driveFileId = null;
        if (googleAccessToken) {
            if (cloudSyncStatusText) cloudSyncStatusText.textContent = `⏳ Subiendo a tu Google Drive...`;
            const folderId = googleDriveFolderId || await getOrCreateDriveFolder(googleAccessToken);
            const driveResult = await uploadFileToGoogleDriveAPI(googleAccessToken, folderId, fileName, cipherObj, bc3Content.length, totalPEM);
            if (driveResult && driveResult.id) {
                driveFileId = driveResult.id;
            }
        }

        const fileId = driveFileId || ('cloud_' + Date.now());
        // Si no está en Google Drive, guardar en IndexedDB seguro
        if (!driveFileId) {
            await saveCipherToVaultDB(fileId, cipherObj);
        }

        const files = getCloudVaultFiles();
        const existingIdx = files.findIndex(f => f.fileName.toLowerCase() === fileName.toLowerCase());

        const fileRecord = {
            id: fileId,
            driveId: driveFileId,
            fileName: fileName,
            lastModified: new Date().toLocaleString('es-ES'),
            sizeBytes: bc3Content.length,
            sizeKb: (bc3Content.length / 1024).toFixed(1),
            totalPEM: totalPEM,
            isDrive: !!driveFileId
        };

        if (existingIdx >= 0) {
            files[existingIdx] = fileRecord;
        } else {
            files.unshift(fileRecord);
        }

        saveCloudVaultFiles(files);
        renderCloudFilesTable();

        if (cloudSyncStatusText) {
            cloudSyncStatusText.innerHTML = `✅ <b>${fileName}</b> ${driveFileId ? 'guardado en tu Google Drive' : 'sincronizado y cifrado con AES-256'}`;
        }
        showAppToast(`Presupuesto guardado en la nube: ${fileName}`, '☁️');
    } catch (err) {
        console.error("Error al subir a la nube:", err);
        if (cloudSyncStatusText) cloudSyncStatusText.textContent = `❌ Error: ${err.message}`;
        alert("Error al sincronizar con la nube: " + err.message);
    } finally {
        isUploadingCloud = false;
        if (uploadCurrentToCloudBtn) {
            uploadCurrentToCloudBtn.disabled = false;
            uploadCurrentToCloudBtn.innerHTML = `⬆️ Subir Actual`;
        }
    }
}

function renderCloudFilesTable() {
    const files = getCloudVaultFiles();

    if (!files || files.length === 0) {
        if (cloudFilesTable) cloudFilesTable.style.display = 'none';
        if (cloudFilesEmptyMsg) cloudFilesEmptyMsg.style.display = 'block';
        return;
    }

    if (cloudFilesTable) cloudFilesTable.style.display = 'table';
    if (cloudFilesEmptyMsg) cloudFilesEmptyMsg.style.display = 'none';

    if (cloudFilesTableBody) {
        cloudFilesTableBody.innerHTML = files.map((file, idx) => {
            const driveBadge = file.driveId ? `<span style="font-size:0.65rem; background:rgba(66,133,244,0.15); color:#4285F4; padding:1px 5px; border-radius:3px; font-weight:700;">Google Drive</span>` : '';
            return `
                <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 8px 10px;">
                        <div style="font-weight: 600; color: var(--text-primary); display:flex; align-items:center; gap:6px;">
                            <span>📄</span>
                            <span>${file.fileName}</span>
                            <span style="font-size:0.68rem; background:rgba(16,185,129,0.15); color:#10b981; padding:1px 5px; border-radius:3px; font-weight:700;">🔒 E2E</span>
                            ${driveBadge}
                        </div>
                        <div style="font-size:0.72rem; color:var(--text-secondary); margin-top:2px;">
                            PEM: ${file.totalPEM ? file.totalPEM.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €' : '—'}
                        </div>
                    </td>
                    <td style="padding: 8px; font-size:0.75rem; color:var(--text-secondary);">${file.lastModified}</td>
                    <td style="padding: 8px; font-size:0.75rem; text-align:right; font-family:monospace;">${file.sizeKb} KB</td>
                    <td style="padding: 8px; text-align: center;">
                        <div style="display:flex; justify-content:center; gap:4px;">
                            <button type="button" class="cloud-open-btn gantt-action-btn" data-idx="${idx}" style="padding:3px 7px; font-size:0.75rem;" title="Abrir en el visor">
                                📥 Abrir
                            </button>
                            <button type="button" class="cloud-dl-btn gantt-action-btn" data-idx="${idx}" style="padding:3px 7px; font-size:0.75rem;" title="Descargar archivo">
                                ⬇️
                            </button>
                            <button type="button" class="cloud-del-btn gantt-action-btn" data-idx="${idx}" style="padding:3px 7px; font-size:0.75rem; color:var(--danger, #ef4444);" title="Eliminar">
                                🗑️
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // Listeners de acción por fila
        cloudFilesTableBody.querySelectorAll('.cloud-open-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-idx'));
                await openCloudFileInViewer(idx);
            });
        });

        cloudFilesTableBody.querySelectorAll('.cloud-dl-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-idx'));
                await downloadCloudFile(idx);
            });
        });

        cloudFilesTableBody.querySelectorAll('.cloud-del-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-idx'));
                await deleteCloudFile(idx);
            });
        });
    }
}

async function openCloudFileInViewer(idx) {
    const files = getCloudVaultFiles();
    const file = files[idx];
    if (!file) return;

    try {
        if (cloudSyncStatusText) cloudSyncStatusText.textContent = `⏳ Descargando y descifrando ${file.fileName}...`;
        showWorkerLoader("Descifrando y cargando desde la nube...", file.fileName);
        
        let cipherData = null;
        if (file.driveId && googleAccessToken) {
            const fetchResp = await fetch(`https://www.googleapis.com/drive/v3/files/${file.driveId}?alt=media`, {
                headers: { 'Authorization': `Bearer ${googleAccessToken}` }
            });
            if (fetchResp.ok) {
                cipherData = await fetchResp.json();
            }
        }

        if (!cipherData) {
            cipherData = await getCipherFromVaultDB(file.id);
        }

        if (!cipherData) {
            throw new Error("No se encontraron los datos cifrados del archivo.");
        }

        const plainText = await decryptDataE2E(cipherData);
        const result = await parseWithWorker(plainText);
        hideWorkerLoader();

        if (result) {
            createBudgetTab(result, file.fileName, plainText);
            closeCloudSyncModal();
            showAppToast(`Presupuesto cargado desde la nube: ${file.fileName}`, '☁️');
        } else {
            alert("No se pudo interpretar el archivo BC3.");
        }
    } catch (err) {
        hideWorkerLoader();
        console.error("Error al descifrar archivo cloud:", err);
        alert("Error al descifrar el presupuesto: " + err.message);
    }
}

async function downloadCloudFile(idx) {
    const files = getCloudVaultFiles();
    const file = files[idx];
    if (!file) return;

    try {
        let cipherData = null;
        if (file.driveId && googleAccessToken) {
            const fetchResp = await fetch(`https://www.googleapis.com/drive/v3/files/${file.driveId}?alt=media`, {
                headers: { 'Authorization': `Bearer ${googleAccessToken}` }
            });
            if (fetchResp.ok) {
                cipherData = await fetchResp.json();
            }
        }

        if (!cipherData) {
            cipherData = await getCipherFromVaultDB(file.id);
        }

        if (!cipherData) throw new Error("No se encontraron datos para descargar.");

        const plainText = await decryptDataE2E(cipherData);
        const blob = new Blob([plainText], { type: 'text/plain;charset=windows-1252' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (err) {
        alert("Error al descargar: " + err.message);
    }
}

async function deleteCloudFile(idx) {
    const files = getCloudVaultFiles();
    const file = files[idx];
    if (!file) return;

    if (confirm(`¿Seguro que deseas eliminar "${file.fileName}" de la sincronización en la nube?`)) {
        if (file.driveId && googleAccessToken) {
            try {
                await fetch(`https://www.googleapis.com/drive/v3/files/${file.driveId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${googleAccessToken}` }
                });
            } catch (e) {
                console.warn("Aviso al borrar de Google Drive:", e);
            }
        }
        await deleteCipherFromVaultDB(file.id);
        files.splice(idx, 1);
        saveCloudVaultFiles(files);
        renderCloudFilesTable();
        if (cloudSyncStatusText) cloudSyncStatusText.textContent = `🗑️ Archivo eliminado de la nube`;
    }
}

// ── Auto-Sync en Segundo Plano ──
let autoSyncDebounceTimer = null;
function triggerAutoSyncDebounced() {
    const autoSync = localStorage.getItem('bc3_cloud_autosync') !== 'false';
    if (!autoSync || !parsedData || !parsedData.concepts) return;

    if (autoSyncDebounceTimer) clearTimeout(autoSyncDebounceTimer);
    autoSyncDebounceTimer = setTimeout(() => {
        uploadActiveBudgetToCloud();
    }, 3000);
}

// Listeners principales de la interfaz
if (cloudSyncBtn) cloudSyncBtn.addEventListener('click', openCloudSyncModal);
if (closeCloudSyncBtn) closeCloudSyncBtn.addEventListener('click', closeCloudSyncModal);
if (closeCloudSyncOkBtn) closeCloudSyncOkBtn.addEventListener('click', closeCloudSyncModal);

if (cloudAutoSyncToggle) {
    cloudAutoSyncToggle.addEventListener('change', (e) => {
        localStorage.setItem('bc3_cloud_autosync', e.target.checked ? 'true' : 'false');
    });
}

if (uploadCurrentToCloudBtn) uploadCurrentToCloudBtn.addEventListener('click', uploadActiveBudgetToCloud);
if (refreshCloudListBtn) {
    refreshCloudListBtn.addEventListener('click', async () => {
        if (cloudSyncStatusText) cloudSyncStatusText.textContent = '⏳ Comprobando archivos en Google Drive...';
        
        if (!googleAccessToken) {
            // Si no hay token de acceso a Drive activo, solicitar autorización a Google
            const gisReady = initGoogleIdentity();
            if (gisReady && googleTokenClient) {
                if (cloudSyncStatusText) cloudSyncStatusText.textContent = '⏳ Solicitando acceso a Google Drive...';
                googleTokenClient.requestAccessToken({ prompt: '' });
                return;
            }
        }
        
        await syncFilesFromGoogleDrive();
        renderCloudFilesTable();
        if (cloudSyncStatusText) cloudSyncStatusText.textContent = '🟢 Lista de archivos actualizada desde la nube';
    });
}

if (cloudSyncModal) {
    cloudSyncModal.addEventListener('click', (e) => {
        if (e.target === cloudSyncModal) closeCloudSyncModal();
    });
}


/* ==========================================================================
   ASISTENTE DE CREACIÓN DE NUEVO PRESUPUESTO & CATÁLOGO DE PRECIOS CONTECH
   ========================================================================== */

let currentWizardStep = 1;

const newBudgetWizardModal = document.getElementById('newBudgetWizardModal');
const welcomeNewBudgetBtn = document.getElementById('welcomeNewBudgetBtn');
const newBudgetMenuBtn = document.getElementById('newBudgetMenuBtn');
const closeWizardBtn = document.getElementById('closeWizardBtn');
const wizardPrevBtn = document.getElementById('wizardPrevBtn');
const wizardNextBtn = document.getElementById('wizardNextBtn');
const wizardCreateBtn = document.getElementById('wizardCreateBtn');

const wizardStep1 = document.getElementById('wizardStep1');
const wizardStep2 = document.getElementById('wizardStep2');
const wizardStep3 = document.getElementById('wizardStep3');
const wizardStep3Gemini = document.getElementById('wizardStep3Gemini');

const wizardStepBadge1 = document.getElementById('wizardStepBadge1');
const wizardStepBadge2 = document.getElementById('wizardStepBadge2');
const wizardStepBadge3 = document.getElementById('wizardStepBadge3');

const wizardProjectTitle = document.getElementById('wizardProjectTitle');
const wizardProjectClient = document.getElementById('wizardProjectClient');
const wizardProjectLocation = document.getElementById('wizardProjectLocation');
const wizardProjectDate = document.getElementById('wizardProjectDate');

const wizardTemplateType = document.getElementById('wizardTemplateType');
const wizardTemplateSelectContainer = document.getElementById('wizardTemplateSelectContainer');
const wizardAreaInput = document.getElementById('wizardAreaInput');
const wizardDemolitionSelect = document.getElementById('wizardDemolitionSelect');
const wizardHvacSelect = document.getElementById('wizardHvacSelect');
const wizardFinishSelect = document.getElementById('wizardFinishSelect');
const wizardGeminiPrompt = document.getElementById('wizardGeminiPrompt');

function openNewBudgetWizard() {
    if (!newBudgetWizardModal) return;

    // Resetear formulario con valores por defecto
    if (wizardProjectTitle) wizardProjectTitle.value = "Presupuesto de Obra " + new Date().toLocaleDateString('es-ES');
    if (wizardProjectClient) wizardProjectClient.value = "";
    if (wizardProjectLocation) wizardProjectLocation.value = "";
    if (wizardProjectDate) wizardProjectDate.value = new Date().toISOString().slice(0, 10);

    // Seleccionar por defecto Gemini AI si tiene clave, o Smart si no
    const hasKey = !!getGeminiApiKey();
    const defaultRadio = document.querySelector(`input[name="wizardMode"][value="${hasKey ? 'gemini_ai' : 'smart'}"]`) || document.querySelector('input[name="wizardMode"]');
    if (defaultRadio) defaultRadio.checked = true;
    if (wizardTemplateSelectContainer) wizardTemplateSelectContainer.style.display = 'none';

    setWizardStep(1);
    newBudgetWizardModal.style.display = 'flex';
}

function closeNewBudgetWizard() {
    if (newBudgetWizardModal) {
        newBudgetWizardModal.style.display = 'none';
    }
}

function setWizardStep(step) {
    currentWizardStep = step;

    // Actualizar badges
    if (wizardStepBadge1) {
        wizardStepBadge1.style.background = step >= 1 ? 'var(--accent, #3b82f6)' : 'var(--border-color)';
        wizardStepBadge1.style.color = step >= 1 ? 'white' : 'var(--text-secondary)';
    }
    if (wizardStepBadge2) {
        wizardStepBadge2.style.background = step >= 2 ? 'var(--accent, #3b82f6)' : 'var(--border-color)';
        wizardStepBadge2.style.color = step >= 2 ? 'white' : 'var(--text-secondary)';
    }
    if (wizardStepBadge3) {
        wizardStepBadge3.style.background = step >= 3 ? 'var(--accent, #3b82f6)' : 'var(--border-color)';
        wizardStepBadge3.style.color = step >= 3 ? 'white' : 'var(--text-secondary)';
    }

    // Obtener modo seleccionado
    const selectedMode = document.querySelector('input[name="wizardMode"]:checked')?.value || 'gemini_ai';

    // Mostrar/ocultar paneles
    if (wizardStep1) wizardStep1.style.display = step === 1 ? 'flex' : 'none';
    if (wizardStep2) wizardStep2.style.display = step === 2 ? 'flex' : 'none';

    if (step === 3) {
        if (selectedMode === 'gemini_ai') {
            if (wizardStep3) wizardStep3.style.display = 'none';
            if (wizardStep3Gemini) {
                wizardStep3Gemini.style.display = 'flex';
                updateGeminiStatusUI();
            }
        } else if (selectedMode === 'smart') {
            if (wizardStep3) wizardStep3.style.display = 'flex';
            if (wizardStep3Gemini) wizardStep3Gemini.style.display = 'none';
        } else {
            if (wizardStep3) wizardStep3.style.display = 'none';
            if (wizardStep3Gemini) wizardStep3Gemini.style.display = 'none';
        }
    } else {
        if (wizardStep3) wizardStep3.style.display = 'none';
        if (wizardStep3Gemini) wizardStep3Gemini.style.display = 'none';
    }

    // Actualizar badge 3 según si aplica o no
    if (wizardStepBadge3) {
        const needsStep3 = selectedMode === 'smart' || selectedMode === 'gemini_ai';
        wizardStepBadge3.style.display = needsStep3 ? 'block' : 'none';
        wizardStepBadge3.textContent = selectedMode === 'gemini_ai' ? '✨ 3. Alcance con IA' : '🧙 3. Parámetros';
    }

    // Actualizar botones de navegación
    if (wizardPrevBtn) wizardPrevBtn.style.display = step > 1 ? 'block' : 'none';

    if (step === 1) {
        if (wizardNextBtn) wizardNextBtn.style.display = 'block';
        if (wizardCreateBtn) wizardCreateBtn.style.display = 'none';
    } else if (step === 2) {
        if (selectedMode === 'smart' || selectedMode === 'gemini_ai') {
            if (wizardNextBtn) wizardNextBtn.style.display = 'block';
            if (wizardCreateBtn) wizardCreateBtn.style.display = 'none';
        } else {
            if (wizardNextBtn) wizardNextBtn.style.display = 'none';
            if (wizardCreateBtn) {
                wizardCreateBtn.style.display = 'block';
                wizardCreateBtn.textContent = "🚀 Generar y Abrir Presupuesto";
            }
        }
    } else if (step === 3) {
        if (wizardNextBtn) wizardNextBtn.style.display = 'none';
        if (wizardCreateBtn) {
            wizardCreateBtn.style.display = 'block';
            wizardCreateBtn.textContent = selectedMode === 'gemini_ai' ? "✨ Generar Presupuesto con IA" : "🚀 Generar y Abrir Presupuesto";
        }
    }
}

// Listener para cambio de modo (radio buttons)
document.querySelectorAll('input[name="wizardMode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        const mode = e.target.value;
        if (wizardTemplateSelectContainer) {
            wizardTemplateSelectContainer.style.display = mode === 'template' ? 'block' : 'none';
        }
        setWizardStep(currentWizardStep);
    });
});

if (wizardNextBtn) {
    wizardNextBtn.addEventListener('click', () => {
        if (currentWizardStep === 1) {
            const title = wizardProjectTitle?.value?.trim();
            if (!title) {
                alert("Por favor, introduce al menos un título para el proyecto.");
                if (wizardProjectTitle) wizardProjectTitle.focus();
                return;
            }
            setWizardStep(2);
        } else if (currentWizardStep === 2) {
            const selectedMode = document.querySelector('input[name="wizardMode"]:checked')?.value || 'gemini_ai';
            if (selectedMode === 'smart' || selectedMode === 'gemini_ai') {
                setWizardStep(3);
            } else {
                finishWizardAndCreateBudget();
            }
        }
    });
}

if (wizardPrevBtn) {
    wizardPrevBtn.addEventListener('click', () => {
        if (currentWizardStep > 1) {
            setWizardStep(currentWizardStep - 1);
        }
    });
}

if (wizardCreateBtn) {
    wizardCreateBtn.addEventListener('click', finishWizardAndCreateBudget);
}

async function finishWizardAndCreateBudget() {
    if (typeof window.BC3PriceBank === 'undefined') {
        alert("El módulo de base de precios (BC3PriceBank) no está disponible.");
        return;
    }

    const title = wizardProjectTitle?.value?.trim() || "Nuevo Presupuesto";
    const client = wizardProjectClient?.value?.trim() || "Propiedad";
    const location = wizardProjectLocation?.value?.trim() || "Obra";
    const date = wizardProjectDate?.value || new Date().toISOString().slice(0, 10);

    const options = { title, client, location, date };
    const selectedMode = document.querySelector('input[name="wizardMode"]:checked')?.value || 'gemini_ai';

    let project = null;

    if (selectedMode === 'gemini_ai') {
        const key = getGeminiApiKey();
        if (!key) {
            alert("Por favor conecta tu clave API de Google Gemini para usar la generación con IA.");
            openGeminiConfigModal();
            return;
        }

        const promptText = wizardGeminiPrompt?.value?.trim();
        if (!promptText) {
            alert("Por favor introduce una descripción de las obras a presupuestar.");
            if (wizardGeminiPrompt) wizardGeminiPrompt.focus();
            return;
        }

        // Desactivar temporalmente el botón mientras genera
        if (wizardCreateBtn) {
            wizardCreateBtn.disabled = true;
            wizardCreateBtn.textContent = "⏳ Generando con IA...";
        }

        try {
            project = await generateBudgetWithGemini(promptText, options);
        } finally {
            if (wizardCreateBtn) {
                wizardCreateBtn.disabled = false;
                wizardCreateBtn.textContent = "✨ Generar Presupuesto con IA";
            }
        }

        if (!project) return;

    } else if (selectedMode === 'blank') {
        project = window.BC3PriceBank.createBlankProject(options);
    } else if (selectedMode === 'template') {
        const tType = wizardTemplateType?.value || 'reforma_piso';
        project = window.BC3PriceBank.createTemplateProject(tType, options);
    } else {
        // Modo inteligente
        const answers = {
            area: parseFloat(wizardAreaInput?.value) || 90,
            demolition: wizardDemolitionSelect?.value === 'true',
            hvac: wizardHvacSelect?.value || 'aerotermia',
            finish: wizardFinishSelect?.value || 'medio'
        };
        project = window.BC3PriceBank.createSmartProject(answers, options);
    }

    if (!project) {
        alert("Error al generar la estructura del presupuesto.");
        return;
    }

    closeNewBudgetWizard();

    // Cargar en el visor
    loadCreatedProjectIntoViewer(project, `${title.replace(/[/\\?%*:|"<>]/g, '_')}.bc3`);
}

function loadCreatedProjectIntoViewer(project, fileName) {
    if (typeof createBudgetTab === 'function') {
        createBudgetTab(project, fileName, project.original_text || "");
    } else if (typeof renderApp === 'function') {
        currentFileName = fileName;
        renderApp(project);
    }
}

// Listeners para botones de apertura del asistente
if (welcomeNewBudgetBtn) welcomeNewBudgetBtn.addEventListener('click', openNewBudgetWizard);
if (newBudgetMenuBtn) newBudgetMenuBtn.addEventListener('click', openNewBudgetWizard);
if (closeWizardBtn) closeWizardBtn.addEventListener('click', closeNewBudgetWizard);

if (newBudgetWizardModal) {
    newBudgetWizardModal.addEventListener('click', (e) => {
        if (e.target === newBudgetWizardModal) closeNewBudgetWizard();
    });
}

// Chips de ejemplos de prompts de Gemini
document.querySelectorAll('.gemini-chip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const promptText = btn.getAttribute('data-prompt');
        if (wizardGeminiPrompt && promptText) {
            wizardGeminiPrompt.value = promptText;
            wizardGeminiPrompt.focus();
        }
    });
});


// ==========================================================================
// 🤖 MÓDULO GOOGLE GEMINI AI (BYOK & Clave Oficial de Cortesía Comunitaria)
// Presupuestación Generativa & Asistente ConTech (jmcaamanog)
// ==========================================================================

const GEMINI_API_STORAGE_KEY = 'bc3_gemini_api_key';
const GEMINI_MODELS = ['gemini-3.5-flash'];
const GEMINI_MODEL = 'gemini-3.5-flash';

// Clave oficial de cortesía comunitaria (Ofrecida por jmcaamanog)
// Válida hasta el 21 de Octubre de 2026 a las 23:59:59
const COURTESY_KEY_EXPIRY = new Date(2026, 9, 21, 23, 59, 59).getTime(); // Octubre (mes 9 en JS)
const _0xbc3k = 'QVEuQWI4Uk42SnVEYk1mZTBUQlJPZ0N1N1ExZ2dFRE1BVW5fMWF6SG1vTzBjSnZsVllKbEE=';

function getCourtesyApiKey() {
    try {
        const now = Date.now();
        if (now > COURTESY_KEY_EXPIRY) return '';
        return atob(_0xbc3k);
    } catch (e) {
        return '';
    }
}

function isValidCustomKey(key) {
    if (!key || typeof key !== 'string') return false;
    const clean = key.trim();
    if (clean.includes('•') || clean.includes('...')) return false;
    return clean.length >= 20;
}

function isUsingCourtesyKey() {
    try {
        const userKey = (localStorage.getItem(GEMINI_API_STORAGE_KEY) || '').trim();
        if (isValidCustomKey(userKey)) return false;
        return !!getCourtesyApiKey();
    } catch (e) {
        return !!getCourtesyApiKey();
    }
}

function getGeminiApiKey() {
    try {
        const userKey = (localStorage.getItem(GEMINI_API_STORAGE_KEY) || '').trim();
        if (isValidCustomKey(userKey)) return userKey;
        return getCourtesyApiKey();
    } catch (e) {
        return getCourtesyApiKey();
    }
}

function setGeminiApiKey(key) {
    try {
        localStorage.setItem(GEMINI_API_STORAGE_KEY, (key || '').trim());
        updateGeminiStatusUI();
    } catch (e) {
        console.error("Error guardando clave Gemini", e);
    }
}

function removeGeminiApiKey() {
    try {
        localStorage.removeItem(GEMINI_API_STORAGE_KEY);
        if (geminiApiKeyInput) {
            geminiApiKeyInput.value = '';
            geminiApiKeyInput.placeholder = isUsingCourtesyKey() ? '••••••••••••••••••••••••••••••••' : 'AIzaSy...';
        }
        updateGeminiStatusUI();
    } catch (e) {
        console.error("Error eliminando clave Gemini", e);
    }
}

async function validateGeminiApiKey(key) {
    const cleanKey = (key || '').trim();
    if (!cleanKey) return { success: false, error: 'Por favor introduce una clave de API válida.' };

    let lastError = 'No se pudo conectar con Google AI Studio.';

    for (const model of GEMINI_MODELS) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`;
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 12000);

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: 'Responde estrictamente con la palabra OK si esta petición funciona correctamente.' }] }],
                    generationConfig: { maxOutputTokens: 10 }
                }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                if (data?.candidates && data.candidates.length > 0) {
                    return { success: true, workingModel: model };
                }
            } else {
                let errorMsg = `Error HTTP ${response.status}`;
                try {
                    const errData = await response.json();
                    if (errData?.error?.message) errorMsg = errData.error.message;
                } catch (e) {}
                lastError = errorMsg;
            }
        } catch (err) {
            lastError = err.name === 'AbortError' ? 'Tiempo de espera agotado al conectar con Google AI Studio.' : (err.message || lastError);
        }
    }

    return { success: false, error: lastError };
}

function getCourtesyCountdown() {
    const expiryDate = new Date('2026-10-21T23:59:59');
    const now = new Date();
    const diffMs = expiryDate - now;
    if (diffMs <= 0) return 'Expirada';
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${days} días, ${hours} h y ${minutes} min restantes`;
}

function updateGeminiStatusUI() {
    const userKey = (localStorage.getItem(GEMINI_API_STORAGE_KEY) || '').trim();
    const key = getGeminiApiKey();
    const usingCourtesy = isUsingCourtesyKey();
    const isConnected = !!key;

    // Badges en el menú de Ajustes
    const statusDot = document.getElementById('geminiStatusDot');
    const statusText = document.getElementById('geminiStatusText');
    const statusBadge = document.getElementById('geminiStatusBadge');

    if (statusDot) {
        statusDot.className = `gemini-status-dot ${isConnected ? 'connected' : 'disconnected'}`;
    }
    if (statusText) {
        if (usingCourtesy) {
            statusText.textContent = '✨ Cortesía Activa';
            statusText.style.color = '#38bdf8';
        } else {
            statusText.textContent = isConnected ? 'Conectado (Personal)' : 'Sin conectar';
            statusText.style.color = isConnected ? '#16a34a' : 'var(--text-secondary)';
        }
    }
    if (statusBadge) {
        if (isConnected) statusBadge.classList.add('connected');
        else statusBadge.classList.remove('connected');
    }

    // Actualizar Banner de Cuenta Atrás
    const countdownDetail = document.getElementById('geminiCourtesyCountdownDetail');
    const countdownPill = document.getElementById('assistantCountdownPill');
    const countdownText = getCourtesyCountdown();
    if (countdownDetail) {
        countdownDetail.textContent = `⏱️ ${countdownText}`;
    }
    if (countdownPill) {
        countdownPill.textContent = usingCourtesy ? `⏱️ Cortesía: ${countdownText.split('(')[0].trim()}` : '🔑 Clave Privada Propia';
    }

    // Modal de configuración de Gemini (Diseño en 3 filas independientes)
    const modalDot = document.getElementById('geminiModalStatusDot');
    const modalTitle = document.getElementById('geminiModalStatusTitle');
    const modalCourtesy = document.getElementById('geminiModalStatusCourtesy');
    const modalCountdown = document.getElementById('geminiModalStatusCountdown');
    const removeBtn = document.getElementById('removeGeminiKeyBtn');
    const keyInput = document.getElementById('geminiApiKeyInput');

    if (modalDot) modalDot.className = `gemini-status-dot ${isConnected ? 'connected' : 'disconnected'}`;
    
    if (usingCourtesy) {
        if (modalTitle) {
            modalTitle.textContent = '● Gemini IA Conectado (Clave de Cortesía)';
            modalTitle.style.color = '#38bdf8';
        }
        if (modalCourtesy) {
            modalCourtesy.style.display = 'block';
            modalCourtesy.innerHTML = '🎁 <span style="font-weight:600; color:var(--text-primary);">Cortesía de jmcaamanog activa:</span> Disfruta de la IA gratis.';
        }
        if (modalCountdown) {
            modalCountdown.style.display = 'block';
            modalCountdown.textContent = `⏱️ ${getCourtesyCountdown()}`;
        }
    } else if (isConnected) {
        if (modalTitle) {
            modalTitle.textContent = '● Gemini IA Conectado (Clave Propia)';
            modalTitle.style.color = '#16a34a';
        }
        if (modalCourtesy) {
            modalCourtesy.style.display = 'block';
            modalCourtesy.textContent = 'Tu clave personal de API está activa y lista para presupuestar.';
        }
        if (modalCountdown) {
            modalCountdown.style.display = 'none';
        }
    } else {
        if (modalTitle) {
            modalTitle.textContent = 'Sin conectar';
            modalTitle.style.color = 'var(--text-primary)';
        }
        if (modalCourtesy) {
            modalCourtesy.style.display = 'block';
            modalCourtesy.textContent = 'Introduce tu clave API gratuita de Google Gemini para activar la IA.';
        }
        if (modalCountdown) {
            modalCountdown.style.display = 'none';
        }
    }

    if (removeBtn) {
        removeBtn.style.display = userKey ? 'inline-block' : 'none';
        removeBtn.textContent = '🗑️ Restablecer a Clave de Cortesía';
    }
    if (keyInput) {
        if (userKey) {
            keyInput.value = userKey;
            keyInput.placeholder = 'AIzaSy...';
        } else if (usingCourtesy) {
            keyInput.value = '';
            keyInput.placeholder = '••••••••••••••••••••••••••••••••';
        } else {
            keyInput.value = '';
            keyInput.placeholder = 'AIzaSy...';
        }
    }

    // Wizard Step 3 de Gemini
    const noKeyAlert = document.getElementById('wizardGeminiNoKeyAlert');
    const promptContainer = document.getElementById('wizardGeminiPromptContainer');
    if (noKeyAlert && promptContainer) {
        if (isConnected) {
            noKeyAlert.style.display = 'none';
            promptContainer.style.display = 'flex';
        } else {
            noKeyAlert.style.display = 'flex';
            promptContainer.style.display = 'none';
        }
    }
}

function openGeminiConfigModal() {
    try {
        const modal = document.getElementById('geminiConfigModal');
        if (!modal) {
            console.error("No se encontró el elemento #geminiConfigModal en el DOM");
            return;
        }

        const userKey = (localStorage.getItem(GEMINI_API_STORAGE_KEY) || '').trim();
        const input = document.getElementById('geminiApiKeyInput');
        if (input) {
            if (userKey) {
                input.value = userKey;
                input.placeholder = 'AIzaSy...';
            } else if (typeof isUsingCourtesyKey === 'function' && isUsingCourtesyKey()) {
                input.value = '';
                input.placeholder = '••••••••••••••••••••••••••••••••';
            } else {
                input.value = '';
                input.placeholder = 'AIzaSy...';
            }
        }

        const msg = document.getElementById('geminiKeyValidationMsg');
        if (msg) {
            msg.style.display = 'none';
            msg.textContent = '';
        }

        try {
            if (typeof updateGeminiStatusUI === 'function') {
                updateGeminiStatusUI();
            }
        } catch(e) {}

        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
    } catch (err) {
        console.error("Error al abrir Configuración Gemini:", err);
    }
}

const geminiConfigModal = document.getElementById('geminiConfigModal');
const geminiConfigBtn = document.getElementById('geminiConfigBtn');
const closeGeminiConfigBtn = document.getElementById('closeGeminiConfigBtn');
const closeGeminiConfigFooterBtn = document.getElementById('closeGeminiConfigFooterBtn');
const wizardOpenGeminiConfigBtn = document.getElementById('wizardOpenGeminiConfigBtn');
const toggleGeminiKeyVisibilityBtn = document.getElementById('toggleGeminiKeyVisibilityBtn');
const saveAndTestGeminiKeyBtn = document.getElementById('saveAndTestGeminiKeyBtn');
const saveGeminiBtnText = document.getElementById('saveGeminiBtnText');
const removeGeminiKeyBtn = document.getElementById('removeGeminiKeyBtn');
const geminiApiKeyInput = document.getElementById('geminiApiKeyInput');
const geminiKeyValidationMsg = document.getElementById('geminiKeyValidationMsg');

function closeGeminiConfigModal() {
    const modal = document.getElementById('geminiConfigModal');
    if (modal) modal.style.display = 'none';
    const assistantModal = document.getElementById('geminiAssistantModal');
    const assistantOpen = assistantModal && assistantModal.style.display && assistantModal.style.display !== 'none';
    if (!assistantOpen) {
        document.body.classList.remove('modal-open');
    }
}

if (geminiConfigBtn) geminiConfigBtn.addEventListener('click', openGeminiConfigModal);
if (closeGeminiConfigBtn) closeGeminiConfigBtn.addEventListener('click', closeGeminiConfigModal);
if (closeGeminiConfigFooterBtn) closeGeminiConfigFooterBtn.addEventListener('click', closeGeminiConfigModal);
if (wizardOpenGeminiConfigBtn) wizardOpenGeminiConfigBtn.addEventListener('click', openGeminiConfigModal);

if (geminiConfigModal) {
    geminiConfigModal.addEventListener('click', (e) => {
        if (e.target === geminiConfigModal) closeGeminiConfigModal();
    });
}

if (toggleGeminiKeyVisibilityBtn && geminiApiKeyInput) {
    toggleGeminiKeyVisibilityBtn.addEventListener('click', () => {
        const isPass = geminiApiKeyInput.type === 'password';
        geminiApiKeyInput.type = isPass ? 'text' : 'password';
        toggleGeminiKeyVisibilityBtn.textContent = isPass ? '🔒' : '👁️';
    });
}

if (saveAndTestGeminiKeyBtn && geminiApiKeyInput) {
    saveAndTestGeminiKeyBtn.addEventListener('click', async () => {
        const key = geminiApiKeyInput.value.trim();
        if (!key) {
            if (geminiKeyValidationMsg) {
                geminiKeyValidationMsg.style.display = 'block';
                geminiKeyValidationMsg.style.color = '#ef4444';
                geminiKeyValidationMsg.textContent = '❌ Por favor introduce tu clave de API.';
            }
            geminiApiKeyInput.focus();
            return;
        }

        saveAndTestGeminiKeyBtn.disabled = true;
        if (saveGeminiBtnText) saveGeminiBtnText.textContent = "Verificando con Google...";
        if (geminiKeyValidationMsg) {
            geminiKeyValidationMsg.style.display = 'block';
            geminiKeyValidationMsg.style.color = 'var(--accent, #3b82f6)';
            geminiKeyValidationMsg.textContent = '🔄 Conectando con Google AI Studio...';
        }

        const result = await validateGeminiApiKey(key);

        saveAndTestGeminiKeyBtn.disabled = false;
        if (saveGeminiBtnText) saveGeminiBtnText.textContent = "Probar y Conectar Clave";

        if (result.success) {
            setGeminiApiKey(key);
            if (geminiKeyValidationMsg) {
                geminiKeyValidationMsg.style.display = 'block';
                geminiKeyValidationMsg.style.color = '#16a34a';
                geminiKeyValidationMsg.textContent = '✅ ¡Clave validada y conectada correctamente!';
            }
            if (typeof showToastMessage === 'function') {
                showToastMessage("🤖 Google Gemini AI conectado exitosamente.");
            }
        } else {
            if (geminiKeyValidationMsg) {
                geminiKeyValidationMsg.style.display = 'block';
                geminiKeyValidationMsg.style.color = '#ef4444';
                geminiKeyValidationMsg.textContent = `❌ Fallo de validación: ${result.error}`;
            }
        }
    });
}

if (removeGeminiKeyBtn) {
    removeGeminiKeyBtn.addEventListener('click', () => {
        if (confirm("¿Deseas desconectar y eliminar tu clave de Gemini de este dispositivo?")) {
            removeGeminiApiKey();
            if (geminiKeyValidationMsg) {
                geminiKeyValidationMsg.style.display = 'block';
                geminiKeyValidationMsg.style.color = 'var(--text-secondary)';
                geminiKeyValidationMsg.textContent = 'Clave eliminada.';
            }
        }
    });
}

async function callGeminiApi(apiKey, bodyPayload, timeoutMs = 25000) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyPayload),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
            return await response.json();
        } else {
            let errMsg = `Error HTTP ${response.status}`;
            try {
                const errData = await response.json();
                if (errData?.error?.message) errMsg = errData.error.message;
            } catch (e) {}
            throw new Error(errMsg);
        }
    } catch (e) {
        clearTimeout(timeoutId);
        if (e.name === 'AbortError') {
            throw new Error("Tiempo de espera agotado al conectar con Google Gemini (25s).");
        }
        throw e;
    }
}

// Generador de presupuesto estructurado con Gemini
async function generateBudgetWithGemini(userPrompt, options) {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
        alert("Necesitas conectar tu clave API de Google Gemini en Ajustes para generar presupuestos con IA.");
        openGeminiConfigModal();
        return null;
    }

    const cleanPrompt = (userPrompt || "").trim();
    if (!cleanPrompt) {
        alert("Por favor, describe las unidades de obra o el proyecto que deseas presupuestar.");
        return null;
    }

    const systemInstruction = `Eres un Arquitecto Técnico y Director de Ejecución de Obras senior en España, experto en presupuestación, bases de precios de construcción (FIEBDC-3 / BC3, Preoc, CYPE, IVE) y mediciones.
Tu tarea es generar un presupuesto de construcción completo, realista, profesional y estructurado a partir de la descripción del usuario.

REGLAS OBLIGATORIAS:
1. Responde ÚNICAMENTE con un objeto JSON válido que cumpla estrictamente este formato:
{
  "title": "Título del proyecto",
  "chapters": [
    {
      "code": "CAP01##",
      "summary": "NOMBRE DEL CAPÍTULO EN MAYÚSCULAS",
      "items": [
        {
          "code": "DEM010",
          "unit": "m2",
          "summary": "Resumen conciso de la partida en una línea",
          "description": "Texto técnico descriptivo completo de la unidad de obra con especificaciones de ejecución.",
          "price": 14.50,
          "quantity": 25.00,
          "components": [
            { "code": "MO_PEON", "type": "MO", "summary": "Peón ordinario de construcción", "unit": "h", "qty": 0.40, "price": 21.50 },
            { "code": "MQ_HERR", "type": "MQ", "summary": "Herramientas y medios auxiliares", "unit": "%", "qty": 1.00, "price": 2.50 }
          ],
          "measurements": [
            { "comment": "Zona principal", "units": 1, "length": 5.0, "width": 5.0, "height": 1, "total": 25.0 }
          ]
        }
      ]
    }
  ]
}

2. Cada partida DEBE tener:
   - "code": código alfanumérico corto (ej. DEM010, ALB020, REV010, CAR010, INS010).
   - "unit": unidad de medida estándar en minúsculas (m2, m3, m, ud, kg, t, pa, h).
   - "summary": título claro y profesional.
   - "description": pliego técnico de la unidad.
   - "price": precio unitario en euros (€) con valores de mercado actuales en España.
   - "quantity": medición total calculada según el alcance solicitado.
   - "components": desglose en mano de obra (type="MO"), maquinaria (type="MQ") y materiales (type="MT").
   - "measurements": líneas de medición con desglose de dimensiones estimadas si procede.
3. No incluyas explicaciones en texto ni bloques markdown adicionales, únicamente el JSON puro.`;

    const loadingOverlay = document.getElementById('wizardGeminiLoading');
    if (loadingOverlay) loadingOverlay.style.display = 'flex';

    try {
        const payload = {
            contents: [
                {
                    parts: [
                        { text: `Genera el presupuesto en formato JSON para el siguiente proyecto:\nTítulo: ${options.title}\nCliente: ${options.client}\nUbicación: ${options.location}\nDescripción del alcance: ${cleanPrompt}` }
                    ]
                }
            ],
            systemInstruction: {
                parts: [{ text: systemInstruction }]
            },
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.2
            }
        };

        const data = await callGeminiApi(apiKey, payload, 60000);
        const candidate = data.candidates?.[0];
        const contentText = candidate?.content?.parts?.[0]?.text;

        if (!contentText) {
            throw new Error("La IA no devolvió contenido estructurado.");
        }

        let parsedJson;
        try {
            parsedJson = JSON.parse(contentText);
        } catch (jsonErr) {
            const jsonMatch = contentText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsedJson = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error("No se pudo interpretar la respuesta JSON de la IA.");
            }
        }

        if (!window.BC3PriceBank || typeof window.BC3PriceBank.createProjectFromGeminiJson !== 'function') {
            throw new Error("El módulo BC3PriceBank no está disponible.");
        }

        const project = window.BC3PriceBank.createProjectFromGeminiJson(parsedJson, options);
        return project;
    } catch (err) {
        console.error("Error en generateBudgetWithGemini", err);
        alert(`❌ Error al generar el presupuesto con IA: ${err.message || err}`);
        return null;
    } finally {
        if (loadingOverlay) loadingOverlay.style.display = 'none';
    }
}

// Inicializar estado de Gemini al cargar
updateGeminiStatusUI();


// ── MÓDULO DE CATÁLOGO Y BASE DE PRECIOS CONTECH ──

let activeTargetChapterCode = null;

const priceBankCatalogModal = document.getElementById('priceBankCatalogModal');
const closePriceBankBtn = document.getElementById('closePriceBankBtn');
const closePriceBankOkBtn = document.getElementById('closePriceBankOkBtn');
const priceBankSearchInput = document.getElementById('priceBankSearchInput');
const priceBankCategorySelect = document.getElementById('priceBankCategorySelect');
const priceBankTableBody = document.getElementById('priceBankTableBody');
const priceBankItemsCount = document.getElementById('priceBankItemsCount');

function openPriceBankCatalog(targetChapterCode = null) {
    if (!priceBankCatalogModal) return;

    activeTargetChapterCode = targetChapterCode;

    // Poblar selector de categorías
    if (priceBankCategorySelect && window.BC3PriceBank) {
        priceBankCategorySelect.innerHTML = '<option value="all">Todas las Categorías (12)</option>';
        window.BC3PriceBank.categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.code;
            opt.textContent = `${cat.icon} ${cat.name}`;
            priceBankCategorySelect.appendChild(opt);
        });
    }

    if (priceBankSearchInput) priceBankSearchInput.value = '';
    renderPriceBankTable();

    priceBankCatalogModal.style.display = 'flex';
}

function closePriceBankCatalog() {
    if (priceBankCatalogModal) {
        priceBankCatalogModal.style.display = 'none';
    }
}

function renderPriceBankTable() {
    if (!window.BC3PriceBank || !priceBankTableBody) return;

    const query = priceBankSearchInput?.value || '';
    const category = priceBankCategorySelect?.value || 'all';

    const items = window.BC3PriceBank.searchItems(query, category);

    if (priceBankItemsCount) {
        priceBankItemsCount.textContent = `Mostrando ${items.length} partidas tipo disponibles en el catálogo ConTech`;
    }

    if (items.length === 0) {
        priceBankTableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center; padding:32px; color:var(--text-secondary); font-style:italic;">
                    No se encontraron partidas con el criterio de búsqueda.
                </td>
            </tr>
        `;
        return;
    }

    priceBankTableBody.innerHTML = items.map(item => {
        const decompCount = item.decomposition ? item.decomposition.length : 0;
        return `
            <tr style="border-bottom:1px solid var(--border-color);">
                <td style="padding:8px 10px; font-family:monospace; font-weight:700; color:var(--accent);">${item.code}</td>
                <td style="padding:8px 10px;">
                    <div style="font-weight:600; color:var(--text-primary);">${item.summary}</div>
                    <div style="font-size:0.72rem; color:var(--text-secondary); margin-top:2px;">
                        ${item.categoryIcon} ${item.categoryName} · <span style="color:#10b981; font-weight:600;">${decompCount} insumos descompuestos</span>
                    </div>
                </td>
                <td style="padding:8px; text-align:center; color:var(--text-secondary);">${item.unit}</td>
                <td style="padding:8px 10px; text-align:right; font-family:monospace; font-weight:700; color:var(--accent);">
                    ${item.price.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                </td>
                <td style="padding:8px; text-align:center;">
                    <button type="button" class="insert-price-bank-item-btn process-btn" data-code="${item.code}" style="padding:4px 10px; font-size:0.75rem; margin:0;">
                        ➕ Añadir
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    // Listener para añadir partida al presupuesto activo
    priceBankTableBody.querySelectorAll('.insert-price-bank-item-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const code = e.currentTarget.getAttribute('data-code');
            const item = items.find(it => it.code === code);
            if (item) {
                insertPriceBankItemIntoBudget(item);
            }
        });
    });
}

function insertPriceBankItemIntoBudget(item) {
    if (!parsedData || !parsedData.concepts) {
        alert("Primero debes crear o abrir un presupuesto para insertar partidas.");
        return;
    }

    // Determinar capítulo destino
    let targetChapter = activeTargetChapterCode;

    if (!targetChapter || !parsedData.concepts[targetChapter]) {
        // Buscar el primer capítulo disponible o la raíz
        const roots = Array.isArray(parsedData.root_nodes) ? parsedData.root_nodes : Object.values(parsedData.root_nodes || {});
        const rootConcept = roots.length > 0 ? parsedData.concepts[roots[0]] : null;

        if (rootConcept && rootConcept.decomposition && rootConcept.decomposition.length > 0) {
            targetChapter = rootConcept.decomposition[0].code;
        } else if (roots.length > 0) {
            targetChapter = roots[0];
        }
    }

    if (!targetChapter || !parsedData.concepts[targetChapter]) {
        alert("No se encontró un capítulo válido en el presupuesto para insertar la partida.");
        return;
    }

    // Añadir partida y sus insumos
    const itemConcept = {
        code: item.code,
        unit: item.unit,
        summary: item.summary,
        description: item.description,
        price: item.price,
        quantity: 1.0,
        type: "ITEM",
        decomposition: item.decomposition || []
    };

    if (item.decomposition) {
        item.decomposition.forEach(d => {
            if (!parsedData.concepts[d.code]) {
                parsedData.concepts[d.code] = {
                    code: d.code,
                    unit: d.unit,
                    summary: d.summary,
                    price: d.price,
                    quantity: 1,
                    type: "RESOURCE"
                };
            }
        });
    }

    parsedData.concepts[item.code] = itemConcept;

    // Enlazar al capítulo
    const ch = parsedData.concepts[targetChapter];
    if (!ch.decomposition) ch.decomposition = [];
    
    // Comprobar si ya existe en el capítulo
    const exists = ch.decomposition.some(d => d.code === item.code);
    if (!exists) {
        ch.decomposition.push({ code: item.code, factor: 1.0 });
    }

    // Recalcular
    if (typeof calculateAndDisplayTotal === 'function') calculateAndDisplayTotal();
    if (typeof renderBudgetTree === 'function') renderBudgetTree();
    else if (typeof renderTree === 'function') renderTree();

    const chName = ch.summary || targetChapter;
    alert(`✅ Partida "${item.code} - ${item.summary}" añadida correctamente al capítulo "${chName}".`);
}

if (priceBankSearchInput) {
    let priceSearchDebounce = null;
    priceBankSearchInput.addEventListener('input', () => {
        if (priceSearchDebounce) clearTimeout(priceSearchDebounce);
        priceSearchDebounce = setTimeout(renderPriceBankTable, 150);
    });
}

if (priceBankCategorySelect) {
    priceBankCategorySelect.addEventListener('change', renderPriceBankTable);
}

if (closePriceBankBtn) closePriceBankBtn.addEventListener('click', closePriceBankCatalog);
if (closePriceBankOkBtn) closePriceBankOkBtn.addEventListener('click', closePriceBankCatalog);

if (priceBankCatalogModal) {
    priceBankCatalogModal.addEventListener('click', (e) => {
        if (e.target === priceBankCatalogModal) closePriceBankCatalog();
    });
}

// ==========================================================================
// 🤖 ASISTENTE IA CONTECH INTERACTIVO (CONSULTORÍA, AUDITORÍA Y EDICIÓN EN VIVO)
// ==========================================================================

const geminiAssistantModal = document.getElementById('geminiAssistantModal');
const openAssistantBtn = document.getElementById('openAssistantBtn');
const closeGeminiAssistantBtn = document.getElementById('closeGeminiAssistantBtn');
const clearAssistantChatBtn = document.getElementById('clearAssistantChatBtn');
const geminiChatHistory = document.getElementById('geminiChatHistory');
const geminiChatInput = document.getElementById('geminiChatInput');
const sendGeminiChatBtn = document.getElementById('sendGeminiChatBtn');
const assistantTargetChapterSelect = document.getElementById('assistantTargetChapterSelect');
const assistantContextInfo = document.getElementById('assistantContextInfo');

let assistantChatMessages = [];

function openAssistantModal(targetChapterCode = null) {
    try {
        const modal = document.getElementById('geminiAssistantModal');
        if (!modal) {
            console.error("No se encontró el elemento #geminiAssistantModal en el DOM");
            return;
        }

        // 1. Mostrar el modal inmediatamente
        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
        const fab = document.getElementById('expandHeaderBtn');
        if (fab) fab.style.display = 'none';

        // 2. Actualizar UI de estado de Gemini
        try {
            if (typeof updateGeminiStatusUI === 'function') {
                updateGeminiStatusUI();
            }
        } catch (e) {
            console.warn("Aviso al actualizar status UI:", e);
        }

        // 3. Poblar selector de capítulos del presupuesto activo
        try {
            const chapterSelect = document.getElementById('assistantTargetChapterSelect');
            if (chapterSelect) {
                chapterSelect.innerHTML = '<option value="auto">✨ Detección Automática por IA</option>';
                if (typeof parsedData !== 'undefined' && parsedData?.concepts) {
                    const root = parsedData.concepts["OBRA#"] || Object.values(parsedData.concepts).find(c => c.type === 'ROOT' || (c.code && c.code.endsWith('#')));
                    if (root && root.decomposition) {
                        root.decomposition.forEach(d => {
                            const ch = parsedData.concepts[d.code];
                            if (ch) {
                                const opt = document.createElement('option');
                                opt.value = ch.code;
                                opt.textContent = `${ch.code} - ${ch.summary || 'Capítulo'}`;
                                if (targetChapterCode && ch.code === targetChapterCode) {
                                    opt.selected = true;
                                }
                                chapterSelect.appendChild(opt);
                            }
                        });
                    }
                }
            }
        } catch (e) {
            console.warn("Aviso al poblar capítulos:", e);
        }

        // 4. Actualizar texto de contexto del presupuesto
        try {
            const ctxInfo = document.getElementById('assistantContextInfo');
            if (ctxInfo) {
                if (typeof parsedData !== 'undefined' && parsedData?.concepts) {
                    const numConcepts = Object.keys(parsedData.concepts).length;
                    let pem = 0;
                    try {
                        pem = typeof calculateTotalPEM === 'function' ? calculateTotalPEM() : (parsedData.concepts["OBRA#"]?.price || 0);
                    } catch(e) {}
                    const formattedPem = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(pem || 0);
                    ctxInfo.textContent = `Presupuesto activo: ${typeof currentFileName !== 'undefined' ? currentFileName : 'Presupuesto'} | PEM: ${formattedPem} (${numConcepts} conceptos)`;
                } else {
                    ctxInfo.textContent = 'Presupuesto activo: Ninguno (Modo asesoramiento general)';
                }
            }
        } catch (e) {
            console.warn("Aviso al actualizar contexto:", e);
        }

        // 5. Personalizar saludo con el nombre de usuario
        try {
            const chatHist = document.getElementById('geminiChatHistory');
            const userProfile = (typeof getLoggedUserProfile === 'function') ? getLoggedUserProfile() : { firstName: '' };
            const greetingName = userProfile.firstName ? `, ${userProfile.firstName}` : '';
            if (chatHist && (!assistantChatMessages || assistantChatMessages.length === 0)) {
                const firstBubble = chatHist.querySelector('.assistant-msg.ai-msg .msg-bubble');
                if (firstBubble) {
                    firstBubble.innerHTML = `
                        <div style="font-weight: 700; margin-bottom: 6px; color: #38bdf8; font-size: 0.9rem;">¡Hola${greetingName}! 👋 ¡Soy jmcaamanog! ¡Jose me puso aquí como tu asistente de IA! 🚀</div>
                        <div style="font-size: 0.84rem; line-height: 1.55;">
                            Puedo crear, editar y auditar tu presupuesto. Resolviendo dudas técnicas sobre unidades de obra, redactar y añadir nuevas partidas directamente a tus capítulos.<br><br>
                            <strong>¿Qué necesitas?</strong>
                        </div>
                    `;
                }
            }
        } catch (e) {
            console.warn("Aviso al personalizar saludo:", e);
        }

        const input = document.getElementById('geminiChatInput');
        if (input) input.focus();
    } catch (err) {
        console.error("Error al abrir Asesor IA:", err);
    }
}

function closeAssistantModal() {
    if (geminiAssistantModal) {
        geminiAssistantModal.style.display = 'none';
        document.body.classList.remove('modal-open');
        const fab = document.getElementById('expandHeaderBtn');
        if (fab) fab.style.display = 'flex';
    }
}

const settingsAssistantBtn = document.getElementById('settingsAssistantBtn');
const assistantConfigKeyBtn = document.getElementById('assistantConfigKeyBtn');
if (openAssistantBtn) openAssistantBtn.addEventListener('click', () => openAssistantModal());
if (settingsAssistantBtn) settingsAssistantBtn.addEventListener('click', () => openAssistantModal());
if (assistantConfigKeyBtn) assistantConfigKeyBtn.addEventListener('click', () => openGeminiConfigModal());
if (closeGeminiAssistantBtn) closeGeminiAssistantBtn.addEventListener('click', closeAssistantModal);

if (geminiAssistantModal) {
    geminiAssistantModal.addEventListener('click', (e) => {
        if (e.target === geminiAssistantModal) closeAssistantModal();
    });
}

if (clearAssistantChatBtn && geminiChatHistory) {
    clearAssistantChatBtn.addEventListener('click', () => {
        assistantChatMessages = [];
        const u = getLoggedUserProfile();
        const g = u.firstName ? `¡Hola de nuevo, ${u.firstName}! 👋` : `¡Hola! 👋`;
        geminiChatHistory.innerHTML = `
            <div class="assistant-msg ai-msg">
                <div class="msg-avatar">
                    <img src="img/jmcaamanog.png" alt="jmcaamanog" />
                </div>
                <div class="msg-bubble">
                    <div style="font-weight: 700; margin-bottom: 6px; color: #38bdf8; font-size: 0.9rem;">${g} ¡Soy jmcaamanog! Conversación reiniciada. 🚀</div>
                    <div style="font-size: 0.84rem; line-height: 1.55;">
                        ¿En qué más te puedo ayudar sobre este presupuesto?
                    </div>
                </div>
            </div>
        `;
    });
}

// Chips de consultas rápidas y botón de envío gestionados de forma única

if (geminiChatInput) {
    geminiChatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendAssistantUserMessage();
        }
    });
}

let isSendingAssistantMessage = false;

async function sendAssistantUserMessage() {
    if (isSendingAssistantMessage) return;
    const input = document.getElementById('geminiChatInput');
    const text = input ? input.value.trim() : '';
    if (!text) return;
    isSendingAssistantMessage = true;

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
        alert("Por favor conecta tu clave API de Gemini en Ajustes.");
        openGeminiConfigModal();
        return;
    }

    if (input) input.value = '';

    appendChatMessage('user', text);

    const loadingId = 'ai-typing-' + Date.now();
    appendChatLoading(loadingId);

    let budgetContext = "No hay ningún archivo de presupuesto cargado actualmente en memoria.";
    if (typeof parsedData !== 'undefined' && parsedData?.concepts) {
        const root = parsedData.concepts["OBRA#"] || Object.values(parsedData.concepts).find(c => c.type === 'ROOT' || (c.code && c.code.endsWith('#')));
        const chaptersList = [];
        if (root && root.decomposition) {
            root.decomposition.forEach(d => {
                const ch = parsedData.concepts[d.code];
                if (ch) {
                    const itemCount = ch.decomposition ? ch.decomposition.length : 0;
                    chaptersList.push(`- Capítulo ${ch.code}: "${ch.summary || ''}" (${itemCount} partidas, Subtotal: ${ch.price || 0} €)`);
                }
            });
        }
        let pem = 0;
        try { pem = typeof calculateTotalPEM === 'function' ? calculateTotalPEM() : (root?.price || 0); } catch(e) {}
        budgetContext = `PRESUPUESTO ACTIVO EN PANTALLA:
Título: ${typeof currentFileName !== 'undefined' ? currentFileName : 'Presupuesto'}
PEM Total: ${pem} €
Estructura de Capítulos:
${chaptersList.join('\n')}`;
    }

    const chapterSelect = document.getElementById('assistantTargetChapterSelect');
    const selectedTargetChapter = chapterSelect ? chapterSelect.value : 'auto';
    const user = (typeof getLoggedUserProfile === 'function') ? getLoggedUserProfile() : {};
    const userIdentPrompt = (user.name || user.firstName) ? `El usuario se llama "${user.name || user.firstName}". Puedes dirigirte a él por su nombre de pila de forma cercana y profesional cuando sea oportuno.\n` : '';

    const systemPrompt = `Eres "jmcaamanog", el Asistente de IA oficial de la herramienta BC3 Viewer (Jose te programó y te puso aquí como el asistente de IA experto de la aplicación, siendo Arquitecto Técnico y BIM Manager).
Te presentas siempre como "jmcaamanog", con un tono profesional pero cercano y con chispa simpática.
${userIdentPrompt}
CONTEXTO DEL PRESUPUESTO ACTUAL:
${budgetContext}

CAPÍTULO SELECCIONADO POR EL USUARIO PARA INSERCIÓN: ${selectedTargetChapter}

INSTRUCCIONES CLAVE:
1. Responde de forma clara, profesional, concisa y orientada a la ingeniería de edificación.
2. Si el usuario te pide una CONSULTA, AUDITORÍA, REVISIÓN o REDACCIÓN DE MEMORIA: respóndele en lenguaje natural estructurado con viñetas y formato Markdown.
3. TABLAS TÉCNICAS Y COMPARATIVAS: Cuando compares precios, opciones, rendimientos o desgloses de costes, UTILIZA SIEMPRE TABLAS MARKDOWN ESTÁNDAR con cabeceras claras (| Concepto | Opción 1 | Opción 2 | Diferencia | Explicación |) y separadores (| :--- | :--- | :--- | :--- | :--- |) para que la herramienta las renderice con diseño ConTech interactivo.
3. Si el usuario te pide CREAR o AÑADIR UNA PARTIDA (o si una partida es la solución directa a lo que pide):
   - Además de explicar brevemente la partida, INCLUYE AL FINAL UN BLOQUE JSON con la etiqueta exacta \`\`\`json_partida ... \`\`\` con el formato:
\`\`\`json_partida
{
  "code": "ALB010",
  "unit": "m2",
  "summary": "Resumen conciso en una línea",
  "description": "Descripción técnica completa y pliego de ejecución de la unidad de obra.",
  "price": 28.50,
  "quantity": 10.0,
  "targetChapter": "CAP01##",
  "components": [
    { "code": "MO_OFIC", "type": "MO", "summary": "Oficial 1ª albañilería", "unit": "h", "qty": 0.6, "price": 26.00 },
    { "code": "MT_LADR", "type": "MT", "summary": "Ladrillo cerámico hueco triple", "unit": "ud", "qty": 25, "price": 0.35 }
  ]
}
\`\`\``;

    assistantChatMessages.push({ role: "user", parts: [{ text }] });

    try {
        const recentHistory = assistantChatMessages.slice(-8);

        const payload = {
            contents: recentHistory,
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: { temperature: 0.3 }
        };

        const data = await callGeminiApi(apiKey, payload, 35000);
        removeChatLoading(loadingId);

        const candidate = data.candidates?.[0];
        const aiText = candidate?.content?.parts?.[0]?.text || "No pude generar una respuesta.";

        assistantChatMessages.push({ role: "model", parts: [{ text: aiText }] });

        appendChatMessage('ai', aiText);

    } catch (err) {
        removeChatLoading(loadingId);
        assistantChatMessages.pop();
        appendChatMessage('ai', `❌ Error al consultar con Gemini AI: ${err.message || err}`);
    } finally {
        isSendingAssistantMessage = false;
    }
}

// ==========================================================================
// 📐 FORMATEADOR AVANZADO DE MARKDOWN Y TABLAS CONTECH PARA ASESOR IA
// ==========================================================================

function formatMarkdownToHtml(markdown) {
    if (!markdown) return '';
    let html = markdown;

    // 1. Extraer bloques de código delimitados con ```
    const codeBlocks = [];
    html = html.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
        const id = `___CODEBLOCK_${codeBlocks.length}___`;
        codeBlocks.push(`<pre class="code-block language-${lang}"><code>${escapeHtml(code.trim())}</code></pre>`);
        return id;
    });

    // 2. Procesar Tablas de Markdown
    html = html.replace(/(?:(?:^|\n)\|[^\n]+\|\r?\n(?:\|[ \t]*:?[-]+:?[ \t]*)+\|\r?\n(?:\|[^\n]+\|\r?\n?)+)/g, (tableMatch) => {
        const lines = tableMatch.trim().split('\n').map(l => l.trim()).filter(l => l.startsWith('|') && l.endsWith('|'));
        if (lines.length < 2) return tableMatch;

        const headerLine = lines[0];
        const separatorLine = lines[1];
        const bodyLines = lines.slice(2);

        const headers = headerLine.slice(1, -1).split('|').map(h => h.trim());
        
        // Alineaciones (:---, :---:, ---:)
        const aligns = separatorLine.slice(1, -1).split('|').map(s => {
            const trimmed = s.trim();
            if (trimmed.startsWith(':') && trimmed.endsWith(':')) return 'center';
            if (trimmed.endsWith(':')) return 'right';
            return 'left';
        });

        let tableHtml = '<div class="contech-table-wrapper"><table class="contech-table"><thead><tr>';
        headers.forEach((h, i) => {
            const align = aligns[i] || 'left';
            tableHtml += `<th style="text-align:${align}">${formatInlineMarkdown(h)}</th>`;
        });
        tableHtml += '</tr></thead><tbody>';

        bodyLines.forEach(rowLine => {
            const cells = rowLine.slice(1, -1).split('|').map(c => c.trim());
            tableHtml += '<tr>';
            cells.forEach((c, i) => {
                const align = aligns[i] || 'left';
                tableHtml += `<td style="text-align:${align}">${formatInlineMarkdown(c)}</td>`;
            });
            tableHtml += '</tr>';
        });

        tableHtml += '</tbody></table></div>';
        return '\n' + tableHtml + '\n';
    });

    // 3. Encabezados
    html = html.replace(/^### (.*$)/gim, '<h4 class="contech-heading-4">$1</h4>');
    html = html.replace(/^## (.*$)/gim, '<h3 class="contech-heading-3">$1</h3>');
    html = html.replace(/^# (.*$)/gim, '<h3 class="contech-heading-3">$1</h3>');

    // 4. Separadores horizontales
    html = html.replace(/^---$/gim, '<hr class="contech-hr" />');

    // 5. Citas / Blockquotes
    html = html.replace(/^\> (.*$)/gim, '<blockquote class="contech-blockquote">$1</blockquote>');

    // 6. Listas numeradas y viñetas
    html = html.replace(/^\s*[-*]\s+(.*$)/gim, '• $1<br>');
    html = html.replace(/^\s*(\d+)\.\s+(.*$)/gim, '<strong>$1.</strong> $2<br>');

    // 7. Enlaces, Negritas, Cursivas, Código en línea
    html = formatInlineMarkdown(html);

    // 8. Párrafos y saltos de línea (respetando tablas y encabezados)
    html = html.replace(/\n\n+/g, '<br><br>');
    html = html.replace(/\n/g, '<br>');

    // 9. Restaurar bloques de código
    codeBlocks.forEach((block, idx) => {
        html = html.replace(`___CODEBLOCK_${idx}___`, block);
    });

    return html;
}

function formatInlineMarkdown(text) {
    if (!text) return '';
    return text
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="contech-link">$1 ↗</a>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code class="contech-inline-code">$1</code>')
        .replace(/\$m\^2\$/g, 'm²')
        .replace(/m\^2/g, 'm²')
        .replace(/m\^3/g, 'm³');
}

function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function appendChatMessage(role, rawContent) {
    const chatHist = document.getElementById('geminiChatHistory');
    if (!chatHist) return;

    const msgDiv = document.createElement('div');
    msgDiv.className = `assistant-msg ${role === 'user' ? 'user-msg' : 'ai-msg'}`;

    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    if (role === 'user') {
        const user = (typeof getLoggedUserProfile === 'function') ? getLoggedUserProfile() : {};
        if (user.picture) {
            avatar.innerHTML = `<img src="${user.picture}" alt="Usuario" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" referrerpolicy="no-referrer" onerror="this.style.display='none'; this.parentElement.textContent='${user.firstName ? user.firstName.charAt(0).toUpperCase() : '👤'}';" />`;
        } else {
            avatar.textContent = user.firstName ? user.firstName.charAt(0).toUpperCase() : '👤';
        }
    } else {
        avatar.innerHTML = `<img src="img/jmcaamanog.png" alt="jmcaamanog" />`;
    }

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';

    if (role === 'user') {
        bubble.textContent = rawContent;
    } else {
        let cleanText = rawContent;
        let partidaObj = null;

        const partidaMatch = rawContent.match(/\`\`\`json_partida\s*([\s\S]*?)\s*\`\`\`/);
        if (partidaMatch) {
            try {
                partidaObj = JSON.parse(partidaMatch[1]);
                cleanText = rawContent.replace(/\`\`\`json_partida\s*[\s\S]*?\s*\`\`\`/, '').trim();
            } catch (e) {
                console.warn("Error parseando json_partida", e);
            }
        }

        bubble.innerHTML = formatMarkdownToHtml(cleanText);

        if (partidaObj && partidaObj.code) {
            const card = createPartidaActionCard(partidaObj);
            bubble.appendChild(card);
        }
    }

    msgDiv.appendChild(avatar);
    msgDiv.appendChild(bubble);
    chatHist.appendChild(msgDiv);
    chatHist.scrollTop = chatHist.scrollHeight;
}

function createPartidaActionCard(item) {
    const card = document.createElement('div');
    card.className = 'partida-action-card';

    const header = document.createElement('div');
    header.className = 'partida-action-header';

    const codeSpan = document.createElement('span');
    codeSpan.className = 'partida-action-code';
    codeSpan.textContent = `${item.code || 'NUEVA'} · ${item.unit || 'ud'}`;

    const priceSpan = document.createElement('span');
    priceSpan.className = 'partida-action-price';
    priceSpan.textContent = `${(parseFloat(item.price) || 0).toFixed(2)} €/${item.unit || 'ud'}`;

    header.appendChild(codeSpan);
    header.appendChild(priceSpan);

    const summary = document.createElement('div');
    summary.style.fontWeight = '600';
    summary.style.fontSize = '0.8rem';
    summary.style.marginBottom = '4px';
    summary.textContent = item.summary || 'Partida sin título';

    const desc = document.createElement('div');
    desc.style.fontSize = '0.72rem';
    desc.style.color = 'var(--text-secondary)';
    desc.style.lineHeight = '1.4';
    desc.textContent = (item.description || '').slice(0, 140) + ((item.description || '').length > 140 ? '...' : '');

    const insertBtn = document.createElement('button');
    insertBtn.className = 'partida-action-btn';
    insertBtn.innerHTML = `<span>➕ Insertar en el Presupuesto</span>`;

    insertBtn.addEventListener('click', () => {
        if (!parsedData || !parsedData.concepts) {
            alert("No hay un presupuesto abierto en memoria donde insertar la partida.");
            return;
        }

        let targetCh = assistantTargetChapterSelect?.value;
        if (!targetCh || targetCh === 'auto') {
            targetCh = item.targetChapter;
        }

        const resolvedChapter = resolveOrCreateChapter(targetCh);
        if (!resolvedChapter) {
            alert("No se pudo localizar ni crear un capítulo adecuado para insertar la partida.");
            return;
        }

        const itemConcept = {
            code: item.code || `PAR_${Date.now().toString().slice(-4)}`,
            unit: item.unit || 'ud',
            summary: item.summary || 'Partida generada por IA',
            description: item.description || '',
            price: parseFloat(item.price) || 0,
            quantity: parseFloat(item.quantity) || 1.0,
            type: 0,
            children: [],
            decomposition: [],
            measurements: [
                { comment: "Medición estimada", units: 1, length: parseFloat(item.quantity) || 1.0, width: 1, height: 1, total: parseFloat(item.quantity) || 1.0 }
            ]
        };

        if (item.components && Array.isArray(item.components)) {
            item.components.forEach((comp, idx) => {
                let cCode = comp.code || `COMP_${idx + 1}`;
                let cType = 0;
                const cTypeStr = (comp.type || "").toUpperCase();
                if (cTypeStr === 'MO' || cCode.startsWith('MO')) { cType = 1; if (!cCode.startsWith('MO')) cCode = 'MO_' + cCode; }
                else if (cTypeStr === 'MQ' || cCode.startsWith('MQ')) { cType = 2; if (!cCode.startsWith('MQ')) cCode = 'MQ_' + cCode; }
                else if (cTypeStr === 'MT' || cCode.startsWith('MT')) { cType = 3; if (!cCode.startsWith('MT')) cCode = 'MT_' + cCode; }

                const cFactor = parseFloat(comp.qty || comp.factor) || 1.0;
                const cPrice = parseFloat(comp.price) || 0;
                const cUnit = comp.unit || (cType === 1 ? 'h' : (cType === 2 ? 'h' : 'ud'));
                const cSummary = comp.summary || "Elemento descompuesto";

                if (!parsedData.concepts[cCode]) {
                    parsedData.concepts[cCode] = {
                        code: cCode,
                        unit: cUnit,
                        summary: cSummary,
                        price: cPrice,
                        quantity: 1,
                        type: cType,
                        children: [],
                        decomposition: [],
                        measurements: []
                    };
                }

                itemConcept.decomposition.push({
                    code: cCode,
                    factor: cFactor,
                    unit: cUnit,
                    price: cPrice,
                    summary: cSummary
                });
            });
        }

        parsedData.concepts[item.code] = itemConcept;

        const ch = parsedData.concepts[resolvedChapter];
        if (!ch.decomposition) ch.decomposition = [];
        const exists = ch.decomposition.some(d => d.code === item.code);
        if (!exists) {
            ch.decomposition.push({ code: item.code, factor: itemConcept.quantity || 1.0 });
        }

        if (typeof calculateAndDisplayTotal === 'function') calculateAndDisplayTotal();
        if (typeof renderBudgetTree === 'function') renderBudgetTree();
        else if (typeof renderTree === 'function') renderTree();

        insertBtn.disabled = true;
        insertBtn.innerHTML = `<span>✅ Insertada en ${resolvedChapter}</span>`;
        showAppToast(`Partida ${item.code} añadida con éxito a ${resolvedChapter}`, '✨');
    });

    card.appendChild(header);
    card.appendChild(summary);
    if (desc.textContent) card.appendChild(desc);
    card.appendChild(insertBtn);

    return card;
}


function appendChatLoading(id) {
    const chatHist = document.getElementById('geminiChatHistory');
    if (!chatHist) return;
    const msgDiv = document.createElement('div');
    msgDiv.id = id;
    msgDiv.className = 'assistant-msg ai-msg';
    msgDiv.innerHTML = `
        <div class="msg-avatar">
            <img src="img/jmcaamanog.png" alt="jmcaamanog" />
        </div>
        <div class="msg-bubble" style="display:flex; align-items:center; gap:8px; font-style:italic; color:var(--text-secondary);">
            <div class="worker-loading-spinner" style="width:16px; height:16px; border-width:2px;"></div>
            <span>jmcaamanog está analizando...</span>
        </div>
    `;
    chatHist.appendChild(msgDiv);
    chatHist.scrollTop = chatHist.scrollHeight;
}

function removeChatLoading(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

// Inicializar perfil en Ajustes
if (typeof updateSettingsUserHeaderUI === 'function') {
    updateSettingsUserHeaderUI();
}


// Exponer funciones de modales globales para acceso directo
window.openAssistantModal = openAssistantModal;
window.closeAssistantModal = closeAssistantModal;
window.openGeminiConfigModal = openGeminiConfigModal;
window.closeGeminiConfigModal = closeGeminiConfigModal;
window.openCloudSyncModal = openCloudSyncModal;
window.closeCloudSyncModal = closeCloudSyncModal;
window.syncFilesFromGoogleDrive = syncFilesFromGoogleDrive;
window.connectGoogleAccount = connectGoogleAccount;

window.sendAssistantUserMessage = sendAssistantUserMessage;

// Inicializar listeners del asistente BIM 5D
if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initIfcWizardEvents);
    } else {
        initIfcWizardEvents();
    }
}

// =============================================================================
// NAVEGACIÓN Y EVENTOS DEL VISOR 3D BIM
// =============================================================================
const visor3dBtn = document.getElementById('visor3dBtn');
const visor3dPanel = document.getElementById('visor3dPanel');

if (visor3dBtn && visor3dPanel) {
    visor3dBtn.addEventListener('click', () => {
        // Ocultar vistas de árbol, detalles y precios
        if (treePanel) treePanel.style.display = 'none';
        if (detailsPanel) detailsPanel.style.display = 'none';
        if (pricesPanel) pricesPanel.style.display = 'none';

        // Mostrar panel 3D
        visor3dPanel.style.display = 'flex';

        // Marcar botón activo
        document.querySelectorAll('.control-container button').forEach(b => b.classList.remove('active'));
        visor3dBtn.classList.add('active');

        // Cargar modelo si no se ha cargado todavía
        const currentTab = budgetTabs.find(t => t.id === activeTabId);
        const bufferToLoad = (currentTab && currentTab.ifcBuffer) || currentIfcBuffer;
        const dataToLoad = (currentTab && currentTab.ifcData) || currentIfcData;
        const nameToLoad = (currentTab && (currentTab.ifcFileName || currentTab.fileName)) || currentFileName;

        if (bufferToLoad && typeof IFCViewer3D !== 'undefined') {
            if (!IFCViewer3D.ifcModel) {
                IFCViewer3D.loadModel(bufferToLoad, dataToLoad, nameToLoad);
            }
        }

        if (typeof IFCViewer3D !== 'undefined') {
            setTimeout(() => IFCViewer3D.onResize(), 60);
        }
    });
}

function initVisor3dControls() {
    const fitBtn = document.getElementById('v3dFitBtn');
    if (fitBtn) fitBtn.addEventListener('click', () => {
        if (typeof IFCViewer3D !== 'undefined') IFCViewer3D.fitToView();
    });

    const xrayBtn = document.getElementById('v3dXrayBtn');
    if (xrayBtn) xrayBtn.addEventListener('click', () => {
        if (typeof IFCViewer3D !== 'undefined') IFCViewer3D.toggleXRay();
    });

    const storeySelect = document.getElementById('v3dStoreySelect');
    if (storeySelect) storeySelect.addEventListener('change', function () {
        if (typeof IFCViewer3D !== 'undefined') IFCViewer3D.filterByStorey(this.value);
    });

    const splitBtn = document.getElementById('v3dSplitBtn');
    if (splitBtn) splitBtn.addEventListener('click', () => {
        if (typeof IFCViewer3D !== 'undefined') IFCViewer3D.toggleSplitView();
    });

    const fsBtn = document.getElementById('v3dFullscreenBtn');
    if (fsBtn) fsBtn.addEventListener('click', () => {
        const panel = document.getElementById('visor3dPanel');
        if (!panel) return;
        if (!document.fullscreenElement) {
            panel.requestFullscreen().catch(err => console.warn(err));
        } else {
            document.exitFullscreen();
        }
    });

    // Callback de selección 3D -> Presupuesto
    if (typeof IFCViewer3D !== 'undefined') {
        IFCViewer3D.onElementClickedCallback = (elemObj, id) => {
            if (!elemObj) return;
            const targetId = elemObj.globalId;
            if (!targetId || !parsedData || !parsedData.concepts) return;

            for (const code in parsedData.concepts) {
                const c = parsedData.concepts[code];
                if (c.measurements && c.measurements.length > 0) {
                    const match = c.measurements.find(m => m.label && m.label.includes(targetId));
                    if (match) {
                        const label = document.getElementById('v3dSelectedLabel');
                        if (label) label.textContent = `📌 ${c.code}: ${c.summary}`;
                        
                        // Si estamos en Split-View, seleccionar y enfocar la fila en el árbol
                        const row = document.querySelector(`.tree-node-container[data-code="${c.code}"]`);
                        if (row) {
                            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            row.classList.add('selected');
                        }
                        break;
                    }
                }
            }
        };
    }
}

if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initVisor3dControls);
    } else {
        initVisor3dControls();
    }
}
