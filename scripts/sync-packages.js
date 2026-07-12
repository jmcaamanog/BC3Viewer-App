const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

// Parser configurations
const parserSrc = path.join(rootDir, 'packages', 'bc3-parser-jmc-js', 'src', 'index.js');
const parserDest = path.join(rootDir, 'www', 'BC3Parser.js');

// Gantt configurations
const ganttSrc = path.join(rootDir, 'packages', 'bc3-gantt-jmc-js', 'src', 'index.js');
const ganttDest = path.join(rootDir, 'www', 'BC3GanttEngine.js');

// Writer configurations
const writerSrc = path.join(rootDir, 'packages', 'bc3-writer-jmc-js', 'src', 'index.js');
const writerDest = path.join(rootDir, 'www', 'BC3Writer.js');

function syncParser() {
    console.log('🔄 Sincronizando bc3-parser-jmc-js con la aplicación web de producción...');
    
    if (!fs.existsSync(parserSrc)) {
        console.error(`❌ Error: No se encontró el código fuente del parser en: ${parserSrc}`);
        process.exit(1);
    }

    try {
        const content = fs.readFileSync(parserSrc, 'utf8');
        
        // Remove export lines for browser compatibility
        const cleanLines = content.split('\n').filter(line => {
            const trimmed = line.trim();
            return !trimmed.startsWith('export ');
        });

        const cleanContent = cleanLines.join('\n');
        
        // Add a generation header
        const finalContent = `// ⚠️ ARCHIVO AUTOGENERADO - NO EDITAR DIRECTAMENTE\n// Modificar en: packages/bc3-parser-jmc-js/src/index.js\n\n${cleanContent}`;
        
        fs.writeFileSync(parserDest, finalContent, 'utf8');
        console.log(`✅ Sincronización exitosa: ${parserDest}`);
    } catch (err) {
        console.error('❌ Error al procesar el archivo del parser:', err);
        process.exit(1);
    }
}

function syncGantt() {
    console.log('🔄 Sincronizando bc3-gantt-jmc-js con la aplicación web de producción...');
    
    if (!fs.existsSync(ganttSrc)) {
        console.error(`❌ Error: No se encontró el código fuente del gantt en: ${ganttSrc}`);
        process.exit(1);
    }

    try {
        const content = fs.readFileSync(ganttSrc, 'utf8');
        
        // Remove export lines for browser compatibility
        const cleanLines = content.split('\n').filter(line => {
            const trimmed = line.trim();
            return !trimmed.startsWith('export ');
        });

        const cleanContent = cleanLines.join('\n');
        
        // Add a generation header
        const finalContent = `// ⚠️ ARCHIVO AUTOGENERADO - NO EDITAR DIRECTAMENTE\n// Modificar en: packages/bc3-gantt-jmc-js/src/index.js\n\n${cleanContent}`;
        
        fs.writeFileSync(ganttDest, finalContent, 'utf8');
        console.log(`✅ Sincronización exitosa: ${ganttDest}`);
    } catch (err) {
        console.error('❌ Error al procesar el archivo del gantt:', err);
        process.exit(1);
    }
}

function syncWriter() {
    console.log('🔄 Sincronizando bc3-writer-jmc-js con la aplicación web de producción...');
    
    if (!fs.existsSync(writerSrc)) {
        console.error(`❌ Error: No se encontró el código fuente del writer en: ${writerSrc}`);
        process.exit(1);
    }

    try {
        const content = fs.readFileSync(writerSrc, 'utf8');
        
        // Remove export lines for browser compatibility
        const cleanLines = content.split('\n').filter(line => {
            const trimmed = line.trim();
            return !trimmed.startsWith('export ');
        });

        const cleanContent = cleanLines.join('\n');
        
        // Add a generation header
        const finalContent = `// ⚠️ ARCHIVO AUTOGENERADO - NO EDITAR DIRECTAMENTE\n// Modificar en: packages/bc3-writer-jmc-js/src/index.js\n\n${cleanContent}`;
        
        fs.writeFileSync(writerDest, finalContent, 'utf8');
        console.log(`✅ Sincronización exitosa: ${writerDest}`);
    } catch (err) {
        console.error('❌ Error al procesar el archivo del writer:', err);
        process.exit(1);
    }
}

syncParser();
syncGantt();
syncWriter();
