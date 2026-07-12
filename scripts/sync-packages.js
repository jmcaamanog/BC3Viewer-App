const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const parserSrc = path.join(rootDir, 'packages', 'bc3-parser-jmc-js', 'src', 'index.js');
const parserDest = path.join(rootDir, 'www', 'BC3Parser.js');

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

syncParser();
