import { describe, it, expect } from 'vitest';
import { BC3GanttEngine } from '../src/index.js';

describe('BC3GanttEngine Tests', () => {
    const mockParsedData = {
        root_nodes: ['OBRA#'],
        concepts: {
            'OBRA#': { code: 'OBRA#', summary: 'Obra Principal', price: 100000, decomposition: [
                { code: 'CAP_01', factor: 1, type: 0 }
            ]},
            'CAP_01': { code: 'CAP_01', summary: 'Cimentación', price: 40000, decomposition: [
                { code: 'PART_01', factor: 1, type: 0 },
                { code: 'PART_02', factor: 1, type: 0 }
            ]},
            'PART_01': { code: 'PART_01', summary: 'Zapata Corriente', price: 25000, decomposition: [] },
            'PART_02': { code: 'PART_02', summary: 'Zapata Centrada', price: 15000, decomposition: [] }
        }
    };

    it('Debería extraer tareas respetando la profundidad y las relaciones de descendencia', () => {
        const engine = new BC3GanttEngine(mockParsedData);
        const tasks = engine.getGanttTasks();
        
        expect(tasks.length).toBe(4);
        expect(tasks[0].id).toBe('OBRA#');
        expect(tasks[0].depth).toBe(1);

        expect(tasks[1].id).toBe('CAP_01');
        expect(tasks[1].depth).toBe(2);
        expect(tasks[1].parentId).toBe('OBRA#');

        expect(tasks[2].id).toBe('PART_01');
        expect(tasks[2].depth).toBe(3);
        expect(tasks[2].parentId).toBe('CAP_01');
    });

    it('Debería autoinicializar el estado Gantt prorrateando las duraciones por precio', () => {
        const engine = new BC3GanttEngine(mockParsedData, { totalWeeks: 10 });
        engine.initGanttStateAuto();

        // Validar que se crearon los plazos para el nodo raíz y los capítulos
        expect(engine.state['OBRA#']).toBeDefined();
        expect(engine.state['CAP_01']).toBeDefined();
        expect(engine.state['PART_01']).toBeDefined();

        // El capítulo CAP_01 es el único nivel 2, debería abarcar las 10 semanas de plazo
        expect(engine.state['CAP_01'].durationWeeks).toBe(10);

        // Las subpartidas se reparten las 10 semanas del padre
        expect(engine.state['PART_01'].durationWeeks).toBe(5);
        expect(engine.state['PART_02'].durationWeeks).toBe(5);
    });

    it('Debería recalcular el inicio/fin del capítulo basándose en sus partidas hijas', () => {
        const engine = new BC3GanttEngine(mockParsedData);
        engine.getGanttTasks();
        
        // Asignar plazos manuales a los hijos
        engine.state['PART_01'] = { startWeek: 2, durationWeeks: 4, progress: 0 };
        engine.state['PART_02'] = { startWeek: 5, durationWeeks: 3, progress: 0 };

        engine.recalculateParentTasks();

        // CAP_01 debería empezar en la minStart (semana 2) y durar hasta maxEnd (semana 8). Duración = 6 semanas.
        expect(engine.state['CAP_01'].startWeek).toBe(2);
        expect(engine.state['CAP_01'].durationWeeks).toBe(6);
    });

    it('Debería calcular el camino crítico de los capítulos', () => {
        const engine = new BC3GanttEngine(mockParsedData);
        engine.getGanttTasks();

        // Asignar plazos
        engine.state['OBRA#'] = { startWeek: 1, durationWeeks: 10 };
        engine.state['CAP_01'] = { startWeek: 1, durationWeeks: 10 };

        const criticalSet = engine.getCriticalPath();
        expect(criticalSet.has('CAP_01')).toBe(true);
    });

    it('Debería calcular de forma correcta las posiciones left y width para renderizar las barras en CSS', () => {
        const engine = new BC3GanttEngine(null, { preWeeks: 4, colPx: 40, viewMode: 'weeks' });
        
        // startWeek = 2. Desplazado por 4 semanas previas (preWeeks) = Columna 5.
        // Left esperado: (2 + 4 - 1) * 40px = 5 * 40 = 200px.
        // Width esperado para 3 semanas: 3 * 40 = 120px.
        const coords = engine.getBarCoords(2, 3);
        expect(coords.left).toBe(200);
        expect(coords.width).toBe(120);
    });
});
