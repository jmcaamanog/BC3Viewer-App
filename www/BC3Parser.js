class BC3Parser {
    constructor() {
        this.records = [];
        this.hierarchy = {};
        this.concepts = {};
        this.properties = {};
    }

    parse(content) {
        this.records = [];
        this.hierarchy = {};
        this.concepts = {};
        this.properties = {};

        // Split by lines. BC3 lines end with CRLF or LF.
        const lines = content.split(/\r\n|\n|\r/);
        let currentRecord = '';

        for (let line of lines) {
            line = line.trim();
            if (line.length === 0) continue;

            // If line starts with ~, it's a new record
            if (line[0] === '~') {
                if (currentRecord.length > 0) {
                    this.parseLine(currentRecord);
                }
                currentRecord = line;
            } else {
                // Continuation of previous record
                currentRecord += line;
            }
        }

        if (currentRecord.length > 0) {
            this.parseLine(currentRecord);
        }

        this.buildHierarchy();

        return {
            properties: this.properties,
            concepts: this.concepts,
            root_nodes: this.getRootNodes(),
            original_text: content
        };
    }

    parseLine(line) {
        // Format is ~TYPE|Field1|Field2|...
        const lineClean = line.substring(1);
        const parts = lineClean.split('|');

        const type = parts[0];
        parts.shift(); // Remove type from parts

        switch (type) {
            case 'V':
                this.parseVersion(parts);
                break;
            case 'C':
                this.parseConcept(parts);
                break;
            case 'D':
                this.parseDecomposition(parts);
                break;
            case 'M':
                this.parseMeasurement(line);
                break;
            case 'T':
                this.parseText(parts);
                break;
        }
    }

    parseVersion(parts) {
        // ~V|Owner|Format|Generator|Description|Charset|...
        this.properties['owner'] = parts[0] || '';
        this.properties['format'] = parts[1] || '';
        this.properties['generator'] = parts[2] || '';
        this.properties['description'] = parts[3] || '';
        this.properties['charset'] = parts[4] || '';
    }

    parseConcept(parts) {
        // ~C|Code|Unit|Summary|Price|Date|Type|
        const code = parts[0] || '';
        if (!code) return;

        const priceRaw = parts[3] || '0';
        const price = parseFloat(priceRaw.replace(',', '.'));
        const type = parseInt(parts[5] || '0', 10);

        this.concepts[code] = {
            code: code,
            unit: parts[1] || '',
            summary: parts[2] || '',
            price: isNaN(price) ? 0 : price,
            date: parts[4] || '',
            type: type,
            children: [],
            decomposition: [],
            description: '',
            measurements: []
        };
    }

    parseMeasurement(line) {
        // ~M|ParentCode\ChildCode|...|Total|...
        const parts = line.split('|');
        const relation = parts[1] || '';

        // Extract Child Code
        const relParts = relation.split('\\');
        const childCode = relParts[relParts.length - 1];

        if (!childCode) return;

        if (!this.concepts[childCode]) {
            this.concepts[childCode] = { code: childCode, children: [], decomposition: [], measurements: [] };
        }

        // Make sure measurements array exists
        if (!this.concepts[childCode].measurements) {
            this.concepts[childCode].measurements = [];
        }

        if (parts[4] !== undefined) {
            const rawM = parts[4];
            const mParts = rawM.split('\\');
            const len = mParts.length;

            let k = 1; // Skip initial empty before first \
            while (k + 4 < len) {
                const label = mParts[k];
                const units = mParts[k + 1];
                const l = mParts[k + 2];
                const w = mParts[k + 3];
                const h = mParts[k + 4];

                this.concepts[childCode].measurements.push({
                    label: label,
                    units: units,
                    l: l,
                    w: w,
                    h: h
                });

                k += 5;
                if (k < len && mParts[k] === '') {
                    k++;
                }
            }
        }
    }

    parseDecomposition(parts) {
        // ~D|ParentCode|ChildCode\Factor\Type\ChildCode\Factor\Type...|
        const parentCode = parts.shift();
        if (!parentCode) return;

        if (!this.concepts[parentCode]) {
            this.concepts[parentCode] = { code: parentCode, children: [], decomposition: [], measurements: [] };
        }

        // Make sure children and decomposition are arrays
        if (!this.concepts[parentCode].children) this.concepts[parentCode].children = [];
        if (!this.concepts[parentCode].decomposition) this.concepts[parentCode].decomposition = [];

        let decompositionString = parts.join('|');
        
        // Remove trailing backslash and pipe
        decompositionString = decompositionString.replace(/[\\|]+$/, '');
        // Trim leading pipe
        decompositionString = decompositionString.replace(/^\|+/, '');

        if (!decompositionString) return;

        const items = decompositionString.split('\\');
        const count = items.length;

        for (let i = 0; i < count; i++) {
            const childCode = (items[i] || '').trim();
            if (childCode.length === 0 || childCode === '|') continue;

            const factor1Raw = items[i + 1] || '';
            const factor2Raw = items[i + 2] || '';

            const f1 = factor1Raw === '' ? null : parseFloat(factor1Raw.replace(',', '.'));
            const f2 = factor2Raw === '' ? null : parseFloat(factor2Raw.replace(',', '.'));

            let factor = 1.0;
            if (f2 !== null && !isNaN(f2)) {
                factor = f2;
            } else if (f1 !== null && !isNaN(f1)) {
                factor = f1;
            }

            let type = 0;
            if (this.concepts[childCode]) {
                type = this.concepts[childCode].type || 0;
            }
            if (type === 0) {
                const lowerCode = childCode.toLowerCase();
                if (lowerCode.indexOf('mo') === 0 || lowerCode.indexOf('mano') === 0) {
                    type = 1;
                } else if (lowerCode.indexOf('mq') === 0 || lowerCode.indexOf('maq') === 0) {
                    type = 2;
                } else if (lowerCode.indexOf('mt') === 0 || lowerCode.indexOf('mat') === 0) {
                    type = 3;
                }
            }

            i += 2;

            if (!this.concepts[parentCode].children.includes(childCode)) {
                this.concepts[parentCode].children.push(childCode);
            }
            this.concepts[parentCode].decomposition.push({
                code: childCode,
                factor: factor,
                type: type
            });
        }
    }

    parseText(parts) {
        // ~T|Code|Text|
        const code = parts[0] || '';
        const text = parts[1] || '';

        if (code && this.concepts[code]) {
            this.concepts[code].description = text;
        }
    }

    buildHierarchy() {
        this.resolveReferences();

        const allChildren = {};
        for (const code in this.concepts) {
            const concept = this.concepts[code];
            if (concept.children) {
                for (const childCode of concept.children) {
                    allChildren[childCode] = true;
                }
            }
        }

        for (const code in this.concepts) {
            this.concepts[code].is_root = !allChildren[code];
        }
    }

    resolveReferences() {
        for (const parentCode in this.concepts) {
            const concept = this.concepts[parentCode];
            if (!concept.children) continue;

            for (let i = 0; i < concept.children.length; i++) {
                const childCode = concept.children[i];
                if (!this.concepts[childCode]) {
                    // Try appending #
                    if (this.concepts[childCode + '#']) {
                        const newCode = childCode + '#';
                        concept.children[i] = newCode;
                        for (let decompItem of concept.decomposition) {
                            if (decompItem.code === childCode) {
                                decompItem.code = newCode;
                            }
                        }
                    }
                    // Try removing #
                    else if (childCode.endsWith('#') && this.concepts[childCode.slice(0, -1)]) {
                        const newCode = childCode.slice(0, -1);
                        concept.children[i] = newCode;
                        for (let decompItem of concept.decomposition) {
                            if (decompItem.code === childCode) {
                                decompItem.code = newCode;
                            }
                        }
                    }
                }
            }
        }
    }

    getRootNodes() {
        const roots = [];
        for (const code in this.concepts) {
            const concept = this.concepts[code];
            if (concept.is_root && code.endsWith('#')) {
                roots.push(code);
            }
        }
        if (roots.length === 0 && Object.keys(this.concepts).length > 0) {
            for (const code in this.concepts) {
                if (code.endsWith('#')) {
                    roots.push(code);
                }
            }
        }
        return roots;
    }
}
