class BC3GanttEngine {
    constructor(parsedData = null, options = {}) {
        this.parsedData = parsedData;
        this.totalWeeks = options.totalWeeks || 26;
        this.startDate = options.startDate ? new Date(options.startDate) : new Date();
        this.state = options.state || {}; // { taskId: { startWeek, durationWeeks, collapsed, progress } }
        this.preWeeks = options.preWeeks !== undefined ? options.preWeeks : 4;
        this.viewMode = options.viewMode || 'weeks';
        this.colPx = options.colPx || 44;
        this.tasks = [];
    }

    // Extraer tareas hasta nivel 3
    getGanttTasks() {
        const tasks = [];
        if (!this.parsedData) return tasks;
        
        const roots = Array.isArray(this.parsedData.root_nodes)
            ? this.parsedData.root_nodes
            : Object.values(this.parsedData.root_nodes);

        const getDecomposition = (concept) => {
            if (!concept || !concept.decomposition) return [];
            return concept.decomposition;
        };

        const addTask = (code, depth, parentId) => {
            if (depth > 3) return;
            const concept = this.parsedData.concepts[code];
            if (!concept) return;
            
            const id = code;
            const price = parseFloat(concept.price) || 0;
            const children = getDecomposition(concept);
            const hasKids = children.length > 0 && depth < 3;

            tasks.push({
                id,
                code: concept.code.replace(/#+\s*$/, ''),
                summary: concept.summary || concept.code,
                depth,
                parentId,
                price,
                hasKids
            });

            if (hasKids) {
                children.forEach(child => addTask(child.code, depth + 1, id));
            }
        };

        roots.forEach(code => addTask(code, 1, null));
        this.tasks = tasks;
        return tasks;
    }

    // Distribución inicial proporcional
    initGanttStateAuto() {
        if (this.tasks.length === 0) {
            this.getGanttTasks();
        }
        
        let chapterDepth = this.tasks.some(t => t.depth === 2) ? 2 : 1;
        const total = this.tasks.filter(t => t.depth === chapterDepth).reduce((s, t) => s + t.price, 0) || 1;
        let cursor = 1;

        this.tasks.forEach(task => {
            if (this.state[task.id]) return;
            if (task.depth === chapterDepth) {
                const proportion = task.price / total;
                const dur = Math.max(1, Math.round(proportion * this.totalWeeks));
                this.state[task.id] = { startWeek: cursor, durationWeeks: dur, collapsed: false, progress: 0 };
                cursor += dur;
            }
        });

        // Subcapítulos y partidas
        this.tasks.forEach(task => {
            if (this.state[task.id]) return;
            if (task.depth > chapterDepth && task.parentId && this.state[task.parentId]) {
                const parent = this.state[task.parentId];
                const siblings = this.tasks.filter(t => t.parentId === task.parentId);
                const idx = siblings.indexOf(task);
                const dur = Math.max(1, Math.round(parent.durationWeeks / siblings.length));
                const start = parent.startWeek + idx * dur;
                this.state[task.id] = {
                    startWeek: Math.min(start, parent.startWeek + parent.durationWeeks - 1),
                    durationWeeks: dur,
                    collapsed: false,
                    progress: 0
                };
            }
        });

        // Nodo raíz
        this.tasks.forEach(task => {
            if (this.state[task.id]) return;
            if (task.depth < chapterDepth) {
                this.state[task.id] = { startWeek: 1, durationWeeks: this.totalWeeks, collapsed: false, progress: 0 };
            }
        });

        return this.state;
    }

    // Recalcular fechas de capítulos basados en hijos
    recalculateParentTasks() {
        if (this.tasks.length === 0) return;

        for (let d = 3; d >= 1; d--) {
            this.tasks.forEach(task => {
                if (task.depth === d && task.hasKids) {
                    const children = this.tasks.filter(c => c.parentId === task.id);
                    if (children.length > 0) {
                        let minStart = 9999;
                        let maxEnd = 0;

                        children.forEach(c => {
                            const cSt = this.state[c.id];
                            if (cSt) {
                                if (cSt.startWeek < minStart) minStart = cSt.startWeek;
                                const cEnd = cSt.startWeek + cSt.durationWeeks;
                                if (cEnd > maxEnd) maxEnd = cEnd;
                            }
                        });

                        if (minStart !== 9999 && maxEnd > 0) {
                            if (!this.state[task.id]) {
                                this.state[task.id] = { collapsed: false, progress: 0 };
                            }
                            this.state[task.id].startWeek = minStart;
                            this.state[task.id].durationWeeks = Math.max(1, maxEnd - minStart);
                        }
                    }
                }
            });
        }
    }

    // Recalcular progreso ponderado por coste de capítulos
    recalculateParentProgress() {
        if (this.tasks.length === 0) return;

        for (let d = 3; d >= 1; d--) {
            this.tasks.forEach(task => {
                if (task.depth === d && task.hasKids) {
                    const children = this.tasks.filter(c => c.parentId === task.id);
                    if (children.length > 0) {
                        let totalPrice = 0;
                        let executedPrice = 0;
                        children.forEach(c => {
                            const cSt = this.state[c.id];
                            const price = c.price || 0;
                            const prog = cSt ? (cSt.progress || 0) : 0;
                            totalPrice += price;
                            executedPrice += price * (prog / 100);
                        });
                        if (!this.state[task.id]) {
                            this.state[task.id] = { collapsed: false, progress: 0 };
                        }
                        this.state[task.id].progress = totalPrice > 0
                            ? Math.round((executedPrice / totalPrice) * 100)
                            : 0;
                    }
                }
            });
        }
    }

    // Aplicar progreso recursivamente a descendientes
    applyProgressToDescendants(pId, prog) {
        this.tasks.forEach(c => {
            if (c.parentId === pId) {
                if (!this.state[c.id]) this.state[c.id] = { startWeek: 1, durationWeeks: 1, collapsed: false };
                this.state[c.id].progress = prog;
                if (c.hasKids) {
                    this.applyProgressToDescendants(c.id, prog);
                }
            }
        });
    }

    // Calcular el camino crítico
    getCriticalPath() {
        const criticalIds = new Set();
        if (this.tasks.length === 0) return criticalIds;

        let chapters = this.tasks.filter(t => t.depth === 2);
        if (chapters.length === 0) chapters = this.tasks.filter(t => t.depth === 1);
        if (chapters.length === 0) return criticalIds;

        let maxEnd = 0;
        chapters.forEach(t => {
            const st = this.state[t.id];
            if (st) {
                const end = st.startWeek + st.durationWeeks;
                if (end > maxEnd) maxEnd = end;
            }
        });

        if (maxEnd === 0) return criticalIds;

        const endChapters = chapters.filter(t => {
            const st = this.state[t.id];
            return st && (st.startWeek + st.durationWeeks === maxEnd);
        });

        endChapters.forEach(t => criticalIds.add(t.id));

        let changed = true;
        while (changed) {
            changed = false;
            chapters.forEach(t => {
                if (criticalIds.has(t.id)) return;

                const st = this.state[t.id];
                if (!st) return;

                const tEnd = st.startWeek + st.durationWeeks;

                for (let cId of criticalIds) {
                    const cSt = this.state[cId];
                    if (!cSt) continue;

                    if (tEnd >= cSt.startWeek - 1 && tEnd <= cSt.startWeek && st.startWeek < cSt.startWeek) {
                        criticalIds.add(t.id);
                        changed = true;
                        break;
                    }
                }
            });
        }

        return criticalIds;
    }

    // Calcular coordenadas de la barra
    getBarCoords(startWeek, durationWeeks) {
        let leftVal = 0;
        let widthVal = 0;

        const startCol = startWeek + this.preWeeks - 1;
        
        if (this.viewMode === 'days') {
            leftVal = (startCol * 7) * this.colPx;
            widthVal = (durationWeeks * 7) * this.colPx;
        } else if (this.viewMode === 'months') {
            leftVal = (startCol / 4) * this.colPx;
            widthVal = (durationWeeks / 4) * this.colPx;
        } else { // weeks
            leftVal = startCol * this.colPx;
            widthVal = durationWeeks * this.colPx;
        }

        return { left: leftVal, width: widthVal };
    }

    // Convertir número de semana a fecha real
    weekToDate(weekNum) {
        const d = new Date(this.startDate);
        d.setDate(d.getDate() + (weekNum - 1) * 7);
        return d;
    }
}

export { BC3GanttEngine };
export default BC3GanttEngine;
