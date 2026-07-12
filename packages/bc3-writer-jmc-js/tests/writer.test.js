import { describe, it, expect } from 'vitest';
import { BC3Writer } from '../src/index.js';
import { BC3Parser } from '../../bc3-parser-jmc-js/src/index.js';

describe('BC3Writer Tests', () => {
    it('Debería generar un archivo FIEBDC-3 con formato estricto a partir de un JSON', () => {
        const mockData = {
            properties: {
                owner: 'José Manuel Caamaño',
                format: 'FIEBDC-3/2020',
                generator: 'JMC-Gen',
                description: 'Presupuesto Demo'
            },
            concepts: {
                'OBRA#': {
                    code: 'OBRA#',
                    summary: 'Obra Principal',
                    price: 0,
                    type: 4,
                    decomposition: [
                        { code: 'CAP_01', factor: 1.0, type: 0 }
                    ]
                },
                'CAP_01': {
                    code: 'CAP_01',
                    summary: 'Cimentación',
                    price: 250.45,
                    type: 1,
                    description: 'Capítulo de cimientos y excavación.',
                    measurements: [
                        { label: 'Zapata Corrida', units: '2', l: '4.50', w: '1.20', h: '0.60' }
                    ]
                }
            }
        };

        const writer = new BC3Writer();
        const bc3Text = writer.write(mockData);

        // Validar versión
        expect(bc3Text).toContain('~V|José Manuel Caamaño|FIEBDC-3/2020|JMC-Gen|Presupuesto Demo|');
        // Validar conceptos
        expect(bc3Text).toContain('~C|OBRA#||Obra Principal|0,0000||4|');
        expect(bc3Text).toContain('~C|CAP_01||Cimentación|250,4500||1|');
        // Validar descomposición
        expect(bc3Text).toContain('~D|OBRA#|CAP_01\\1,0000\\0\\|');
        // Validar textos largos
        expect(bc3Text).toContain('~T|CAP_01|Capítulo de cimientos y excavación.');
        // Validar mediciones
        expect(bc3Text).toContain('~M|\\CAP_01|||\\Zapata Corrida\\2\\4.50\\1.20\\0.60|6,480|');
    });

    it('Debería cumplir con la prueba de simetría (Roundtrip: Parser -> Writer -> Parser)', () => {
        const bc3Original = `~V|José Manuel Caamaño|FIEBDC-3/2020|JMC-Gen|Presupuesto de prueba|UTF-8|
~C|OBRA#||Presupuesto de Obra Nueva|0,0000||4|
~C|CAP_01||Movimiento de Tierras|0,0000||1|
~C|PART_01|m3|Excavación de zanjas|45,5000||0|
~D|OBRA#|CAP_01\\1,0000\\0\\|
~D|CAP_01|PART_01\\200,0000\\0\\|
~T|PART_01|Excavación manual de zanjas para cimentación en terreno de consistencia media.
`;

        const parser = new BC3Parser();
        const dataParsed = parser.parse(bc3Original);

        const writer = new BC3Writer();
        const bc3Generated = writer.write(dataParsed);

        // Volver a parsear el generado
        const dataReParsed = parser.parse(bc3Generated);

        // Comparar que la información crítica se mantenga equivalente
        expect(dataReParsed.properties.owner).toBe(dataParsed.properties.owner);
        expect(dataReParsed.concepts['PART_01'].price).toBe(dataParsed.concepts['PART_01'].price);
        expect(dataReParsed.concepts['PART_01'].summary).toBe(dataParsed.concepts['PART_01'].summary);
        expect(dataReParsed.concepts['OBRA#'].children).toContain('CAP_01');
    });
});
