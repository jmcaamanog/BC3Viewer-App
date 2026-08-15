// Web Worker para procesamiento asíncrono de archivos FIEBDC-3 (BC3)
// Permite parsear y serializar presupuestos pesados sin bloquear el hilo principal de la UI.

try {
    importScripts('BC3Parser.js', 'BC3Writer.js');
} catch (e) {
    console.warn("Worker: Error cargando scripts externos en importScripts:", e);
}

self.onmessage = function (e) {
    const { id, action, payload } = e.data || {};

    if (!id || !action) {
        return;
    }

    try {
        switch (action) {
            case 'PARSE_BC3': {
                if (typeof BC3Parser === 'undefined') {
                    throw new Error("El motor BC3Parser no está disponible en el entorno del Worker.");
                }
                const parser = new BC3Parser();
                const result = parser.parse(payload.content);
                self.postMessage({ id, success: true, data: result });
                break;
            }

            case 'SERIALIZE_BC3': {
                if (typeof BC3Writer === 'undefined') {
                    throw new Error("El motor BC3Writer no está disponible en el entorno del Worker.");
                }
                const writer = new BC3Writer();
                const result = writer.write(payload.data);
                self.postMessage({ id, success: true, data: result });
                break;
            }

            default:
                throw new Error(`Acción desconocida en Worker: ${action}`);
        }
    } catch (err) {
        self.postMessage({
            id,
            success: false,
            error: err.message || String(err)
        });
    }
};
