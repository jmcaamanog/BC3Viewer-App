import { describe, it, expect } from 'vitest';
import { BC3Parser } from '../src/index.js';

describe('BC3Parser Tests', () => {
    it('Debería inicializar las propiedades vacías en el constructor', () => {
        const parser = new BC3Parser();
        expect(parser.concepts).toEqual({});
        expect(parser.properties).toEqual({});
    });

    it('Debería procesar registros básicos de versión ~V y conceptos ~C', () => {
        const bc3Content = `~V|José Manuel Caamaño|FIEBDC-3/2020|JMC-Gen|Presupuesto de prueba|UTF-8|
~C|OBRA#||Presupuesto de Obra Nueva|0|0|4|
~C|CAP_01||Movimiento de Tierras|0|0|1|
~C|PART_01|m3|Excavación de zanjas|45.50|0|0|
~D|OBRA#|CAP_01\\1.0\\\\|
~D|CAP_01|PART_01\\200.0\\\\|
~T|PART_01|Excavación manual de zanjas para cimentación en terreno de consistencia media.|
`;

        const parser = new BC3Parser();
        const result = parser.parse(bc3Content);

        // Validar propiedades generales (~V)
        expect(result.properties.owner).toBe('José Manuel Caamaño');
        expect(result.properties.format).toBe('FIEBDC-3/2020');
        expect(result.properties.generator).toBe('JMC-Gen');

        // Validar que se crearon los conceptos (~C)
        expect(result.concepts['OBRA#']).toBeDefined();
        expect(result.concepts['OBRA#'].summary).toBe('Presupuesto de Obra Nueva');
        expect(result.concepts['OBRA#'].type).toBe(4);

        expect(result.concepts['PART_01']).toBeDefined();
        expect(result.concepts['PART_01'].summary).toBe('Excavación de zanjas');
        expect(result.concepts['PART_01'].price).toBe(45.50);
        expect(result.concepts['PART_01'].unit).toBe('m3');

        // Validar desglose de texto largo (~T)
        expect(result.concepts['PART_01'].description).toContain('Excavación manual de zanjas');

        // Validar descomposición jerárquica (~D)
        expect(result.concepts['OBRA#'].children).toContain('CAP_01');
        expect(result.concepts['CAP_01'].children).toContain('PART_01');

        // Validar cálculo de nodos raíz
        expect(result.root_nodes).toContain('OBRA#');
    });
});
