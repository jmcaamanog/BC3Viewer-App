/**
 * BC3PriceBank.js - Base de Datos de Precios Estándar, Catálogo ConTech y Generador de Plantillas
 * Desarrollado para BC3 Viewer
 */

(function (global) {
    'use strict';

    const BC3PriceBank = {
        version: "1.0.0",

        // ── CATEGORÍAS Y PARTIDAS TIPO CON DESCOMPOSICIÓN COMPLETA ──
        categories: [
            {
                code: "01",
                name: "01. Demoliciones y Actuaciones Previas",
                icon: "🔨",
                items: [
                    {
                        code: "DEM010",
                        summary: "Demolición de tabique de ladrillo hueco",
                        unit: "m2",
                        price: 9.80,
                        description: "Demolición de tabique o partición de ladrillo hueco sencillo o doble por medios manuales, incluyendo retirada de escombros a pie de carga.",
                        decomposition: [
                            { code: "MO_PEON", summary: "Peón ordinario de construcción", unit: "h", factor: 0.35, price: 21.50 },
                            { code: "MQ_HERR", summary: "Medios auxiliares y herramientas", unit: "%", factor: 0.05, price: 7.52 },
                            { code: "MT_CONT", summary: "Contenedor para retirada de escombros", unit: "m3", factor: 0.03, price: 54.00 }
                        ]
                    },
                    {
                        code: "DEM020",
                        summary: "Levantado de pavimento cerámico y capa de mortero",
                        unit: "m2",
                        price: 12.40,
                        description: "Picado y levantado de pavimento de baldosas cerámicas, gres o terrazo, incluyendo base de mortero hasta forjado y acopio de escombros.",
                        decomposition: [
                            { code: "MO_PEON", summary: "Peón ordinario de construcción", unit: "h", factor: 0.45, price: 21.50 },
                            { code: "MQ_COMP", summary: "Martillo picador eléctrico", unit: "h", factor: 0.20, price: 8.50 },
                            { code: "MT_CONT", summary: "Contenedor de residuos", unit: "m3", factor: 0.02, price: 54.00 }
                        ]
                    },
                    {
                        code: "DEM030",
                        summary: "Desmontaje de carpintería de madera y cerrajería",
                        unit: "ud",
                        price: 24.50,
                        description: "Desmontaje de puerta de paso o ventana de madera, incluyendo tapajuntas, precerco y acopio para retirada.",
                        decomposition: [
                            { code: "MO_OFIC", summary: "Oficial 1ª albañilería / cerrajería", unit: "h", factor: 0.50, price: 26.00 },
                            { code: "MO_PEON", summary: "Peón ordinario", unit: "h", factor: 0.30, price: 21.50 },
                            { code: "MQ_HERR", summary: "Herramientas de desmontaje", unit: "ud", factor: 1.00, price: 5.05 }
                        ]
                    },
                    {
                        code: "DEM040",
                        summary: "Desmontaje y anulación de instalación eléctrica / fontanería",
                        unit: "ud",
                        price: 180.00,
                        description: "Retirada de mecanismos, cableado obsoleto y tuberías de plomo/cobre vistas o empotradas en vivienda tipo.",
                        decomposition: [
                            { code: "MO_OFIE", summary: "Oficial 1ª instalador", unit: "h", factor: 4.50, price: 28.00 },
                            { code: "MO_PEON", summary: "Peón especialista", unit: "h", factor: 2.00, price: 22.50 },
                            { code: "MQ_HERR", summary: "Herramientas y seguridad", unit: "ud", factor: 1.00, price: 9.00 }
                        ]
                    }
                ]
            },
            {
                code: "02",
                name: "02. Movimiento de Tierras y Cimentación",
                icon: "🚜",
                items: [
                    {
                        code: "CIM010",
                        summary: "Excavación de zanjas y pozos en terreno blando/medio",
                        unit: "m3",
                        price: 14.20,
                        description: "Excavación por medios mecánicos en zanjas para cimentación, perfilado manual y acopio lateral.",
                        decomposition: [
                            { code: "MQ_RETRO", summary: "Retroexcavadora sobre neumáticos", unit: "h", factor: 0.18, price: 58.00 },
                            { code: "MO_PEON", summary: "Peón ordinario de apoyo", unit: "h", factor: 0.15, price: 21.50 },
                            { code: "MQ_HERR", summary: "Herramientas de perfilado", unit: "%", factor: 0.03, price: 13.66 }
                        ]
                    },
                    {
                        code: "CIM020",
                        summary: "Hormigón de limpieza HL-150 en fondo de zanja e=10cm",
                        unit: "m2",
                        price: 9.40,
                        description: "Suministro y vertido de hormigón no estructural HL-150 para solera de limpieza de 10 cm de espesor.",
                        decomposition: [
                            { code: "MT_HL150", summary: "Hormigón HL-150/B/20 en central", unit: "m3", factor: 0.105, price: 68.00 },
                            { code: "MO_CUAD", summary: "Cuadrilla de vertido y regleado", unit: "h", factor: 0.08, price: 24.50 },
                            { code: "MQ_VIBR", summary: "Vibrador de hormigón", unit: "h", factor: 0.04, price: 7.50 }
                        ]
                    },
                    {
                        code: "CIM030",
                        summary: "Zapata armada con hormigón HA-25 y acero B-500S",
                        unit: "m3",
                        price: 215.00,
                        description: "Cimentación por zapatas aisladas o corridas con hormigón HA-25/B/20/IIa vertido con bomba, acero B-500S (45 kg/m3) y encofrado.",
                        decomposition: [
                            { code: "MT_HA25", summary: "Hormigón estructural HA-25 central", unit: "m3", factor: 1.05, price: 88.00 },
                            { code: "MT_ACERO", summary: "Acero corrugado B-500S colocado", unit: "kg", factor: 48.00, price: 1.65 },
                            { code: "MO_ESTR", summary: "Cuadrilla estructuristas", unit: "h", factor: 1.40, price: 27.50 },
                            { code: "MQ_BOMBA", summary: "Bomba de hormigón", unit: "h", factor: 0.08, price: 65.00 }
                        ]
                    },
                    {
                        code: "CIM040",
                        summary: "Solera de hormigón armado e=15cm con mallazo",
                        unit: "m2",
                        price: 26.80,
                        description: "Solera de hormigón HA-25 de 15 cm de espesor sobre encachado, mallazo electrosoldado ME 15x15 d:6mm y fratasado mecánico.",
                        decomposition: [
                            { code: "MT_HA25", summary: "Hormigón HA-25", unit: "m3", factor: 0.16, price: 88.00 },
                            { code: "MT_MALLA", summary: "Mallazo electrosoldado 15x15x6", unit: "m2", factor: 1.15, price: 4.20 },
                            { code: "MO_CUAD", summary: "Cuadrilla soleras", unit: "h", factor: 0.22, price: 25.00 },
                            { code: "MQ_FRAT", summary: "Fratasadora mecánica helicóptero", unit: "h", factor: 0.05, price: 42.00 }
                        ]
                    }
                ]
            },
            {
                code: "03",
                name: "03. Estructuras y Forjados",
                icon: "🏗️",
                items: [
                    {
                        code: "EST010",
                        summary: "Pilar de hormigón armado HA-25 sección rectangular",
                        unit: "m3",
                        price: 360.00,
                        description: "Pilar de hormigón armado HA-25/B/20/IIa, encofrado metálico a 4 caras, acero B-500S (95 kg/m3) y desencofrado.",
                        decomposition: [
                            { code: "MT_HA25", summary: "Hormigón HA-25 central", unit: "m3", factor: 1.05, price: 88.00 },
                            { code: "MT_ACERO", summary: "Acero B-500S elaborado y colocado", unit: "kg", factor: 100.00, price: 1.65 },
                            { code: "MT_ENCOF", summary: "Encofrado metálico recuperable", unit: "m2", factor: 9.50, price: 5.80 },
                            { code: "MO_ESTR", summary: "Cuadrilla estructuristas", unit: "h", factor: 2.10, price: 27.50 }
                        ]
                    },
                    {
                        code: "EST020",
                        summary: "Forjado unidireccional canto 25+5 cm semiviguetas",
                        unit: "m2",
                        price: 58.50,
                        description: "Forjado unidireccional de 30 cm de canto (25+5), con vigueta de hormigón pretensado, bovedilla de hormigón 25x20x60, capa de compresión de 5 cm de HA-25 y mallazo.",
                        decomposition: [
                            { code: "MT_VIGU", summary: "Vigueta pretensada T-11", unit: "m", factor: 1.50, price: 7.20 },
                            { code: "MT_BOVED", summary: "Bovedilla de hormigón 25 cm", unit: "ud", factor: 6.80, price: 1.25 },
                            { code: "MT_HA25", summary: "Hormigón capa compresión HA-25", unit: "m3", factor: 0.085, price: 88.00 },
                            { code: "MT_MALLA", summary: "Mallazo electrosoldado ME 15x15x5", unit: "m2", factor: 1.15, price: 3.80 },
                            { code: "MO_ESTR", summary: "Estructuristas y apuntalamiento", unit: "h", factor: 0.65, price: 27.50 }
                        ]
                    },
                    {
                        code: "EST030",
                        summary: "Estructura metálica en perfiles laminados S275JR",
                        unit: "kg",
                        price: 3.45,
                        description: "Suministro, corte, soldadura y montaje de estructura de acero laminado S275JR en perfiles IPE, HEB o tubulares, con imprimación antioxidante.",
                        decomposition: [
                            { code: "MT_PERF", summary: "Acero laminado estructural S275", unit: "kg", factor: 1.05, price: 1.85 },
                            { code: "MT_PINT", summary: "Pintura sintética anticorrosiva", unit: "kg", factor: 0.03, price: 8.50 },
                            { code: "MO_SOLD", summary: "Oficial 1ª montador soldador", unit: "h", factor: 0.04, price: 29.00 },
                            { code: "MQ_GRUA", summary: "Camión grúa para izado", unit: "h", factor: 0.003, price: 75.00 }
                        ]
                    }
                ]
            },
            {
                code: "04",
                name: "04. Albañilería y Particiones",
                icon: "🧱",
                items: [
                    {
                        code: "ALB010",
                        summary: "Tabique de ladrillo hueco doble e=7cm con mortero",
                        unit: "m2",
                        price: 18.90,
                        description: "Fábrica de tabique de ladrillo hueco doble 24x11,5x7 cm recibido con mortero de cemento M-5, incluso replanteo y ayudas.",
                        decomposition: [
                            { code: "MT_LADR", summary: "Ladrillo hueco doble 24x11.5x7", unit: "ud", factor: 36.00, price: 0.22 },
                            { code: "MT_MORT", summary: "Mortero M-5 en saco", unit: "kg", factor: 22.00, price: 0.12 },
                            { code: "MO_ALBA", summary: "Oficial 1ª albañil + peón", unit: "h", factor: 0.32, price: 25.50 }
                        ]
                    },
                    {
                        code: "ALB020",
                        summary: "Tabique de cartón-yeso (Pladur) 78/400 simple placa 15mm",
                        unit: "m2",
                        price: 29.50,
                        description: "Tabiquería de placas de yeso laminado de 15 mm tipo Standard sobre estructura de perfiles de chapa galvanizada de 48 mm con lana mineral de 45 mm en alma.",
                        decomposition: [
                            { code: "MT_PLACA", summary: "Placa yeso laminado 15 mm", unit: "m2", factor: 2.10, price: 4.80 },
                            { code: "MT_PERFP", summary: "Montantes y canales 48 mm", unit: "m", factor: 2.80, price: 1.95 },
                            { code: "MT_LANA", summary: "Lana mineral aislante 45 mm", unit: "m2", factor: 1.05, price: 3.40 },
                            { code: "MT_PASTA", summary: "Pasta de juntas y cinta", unit: "kg", factor: 0.80, price: 1.60 },
                            { code: "MO_MONT", summary: "Oficial 1ª montador placa", unit: "h", factor: 0.30, price: 26.50 }
                        ]
                    },
                    {
                        code: "ALB030",
                        summary: "Fábrica de ladrillo cerámico perforado tosco 1/2 pie",
                        unit: "m2",
                        price: 32.40,
                        description: "Fábrica de ladrillo cerámico perforado de 24x11,5x9 cm para cerramiento exterior o muro de carga de 1/2 pie con mortero M-7,5.",
                        decomposition: [
                            { code: "MT_TOSCO", summary: "Ladrillo cerámico perforado", unit: "ud", factor: 38.00, price: 0.28 },
                            { code: "MT_MORT", summary: "Mortero M-7,5", unit: "kg", factor: 35.00, price: 0.14 },
                            { code: "MO_ALBA", summary: "Oficial 1ª albañil + peón", unit: "h", factor: 0.65, price: 25.50 }
                        ]
                    }
                ]
            },
            {
                code: "05",
                name: "05. Aislamientos e Impermeabilizaciones",
                icon: "🛡️",
                items: [
                    {
                        code: "AIS010",
                        summary: "Aislamiento térmico de poliestireno extruido (XPS) e=60mm",
                        unit: "m2",
                        price: 13.80,
                        description: "Panel de poliestireno extruido XPS de 60 mm de espesor, fijado mecánicamente o con adhesivo en cubiertas o trasdosados.",
                        decomposition: [
                            { code: "MT_XPS60", summary: "Panel XPS 60 mm machihembrado", unit: "m2", factor: 1.05, price: 9.20 },
                            { code: "MT_FIJA", summary: "Fijaciones tipo seta y adhesivo", unit: "ud", factor: 4.00, price: 0.35 },
                            { code: "MO_APL", summary: "Oficial 1ª instalador", unit: "h", factor: 0.12, price: 26.00 }
                        ]
                    },
                    {
                        code: "AIS020",
                        summary: "Impermeabilización de cubierta con lámina asfáltica SBS bicapa",
                        unit: "m2",
                        price: 24.50,
                        description: "Impermeabilización con doble lámina de betún elastómero SBS de 4 kg/m2 armada con fieltro de poliéster, adherida con soplete.",
                        decomposition: [
                            { code: "MT_LAM1", summary: "Lámina asfáltica SBS 4kg", unit: "m2", factor: 2.30, price: 5.60 },
                            { code: "MT_IMPR", summary: "Imprimación asfáltica", unit: "kg", factor: 0.40, price: 3.20 },
                            { code: "MO_IMPE", summary: "Oficial 1ª impermeabilizador", unit: "h", factor: 0.30, price: 27.00 },
                            { code: "MQ_GAS", summary: "Soplete y gas propano", unit: "ud", factor: 1.00, price: 2.20 }
                        ]
                    }
                ]
            },
            {
                code: "06",
                name: "06. Revestimientos y Falsos Techos",
                icon: "✨",
                items: [
                    {
                        code: "REV010",
                        summary: "Enfoscado de mortero de cemento fratasado e=15mm",
                        unit: "m2",
                        price: 14.60,
                        description: "Revestimiento continuo exterior o interior con mortero de cemento 1:4 aplicado sobre paramento y maestreado con fratasado fino.",
                        decomposition: [
                            { code: "MT_MORT", summary: "Mortero de enfoscado M-7.5", unit: "kg", factor: 28.00, price: 0.13 },
                            { code: "MO_REV", summary: "Oficial 1ª albañil revoco", unit: "h", factor: 0.38, price: 25.50 },
                            { code: "MQ_AND", summary: "Andamio tubular de trabajo", unit: "m2", factor: 1.00, price: 1.25 }
                        ]
                    },
                    {
                        code: "REV020",
                        summary: "Guarnecido y enlucido de yeso a buena vista e=15mm",
                        unit: "m2",
                        price: 11.20,
                        description: "Revestimiento interior continuo de yeso negro y enlucido final con yeso fino blanco, listo para pintar.",
                        decomposition: [
                            { code: "MT_YESO", summary: "Yeso negro y yeso fino blanco", unit: "kg", factor: 16.00, price: 0.18 },
                            { code: "MO_YESA", summary: "Oficial 1ª yesero", unit: "h", factor: 0.30, price: 26.00 }
                        ]
                    },
                    {
                        code: "REV030",
                        summary: "Falso techo continuo de cartón-yeso 13mm con perfiles TC-47",
                        unit: "m2",
                        price: 26.40,
                        description: "Falso techo suspendido con placa de yeso laminado de 13 mm sobre perfilería oculta de acero galvanizado TC-47 y cuelgues.",
                        decomposition: [
                            { code: "MT_PLACA13", summary: "Placa yeso laminado 13 mm", unit: "m2", factor: 1.05, price: 4.10 },
                            { code: "MT_PERFTC", summary: "Perfilería TC-47 y cuelgues", unit: "m", factor: 2.60, price: 2.10 },
                            { code: "MT_PASTA", summary: "Pasta y cinta de juntas", unit: "kg", factor: 0.50, price: 1.60 },
                            { code: "MO_MONT", summary: "Oficial 1ª montador techos", unit: "h", factor: 0.45, price: 26.50 }
                        ]
                    }
                ]
            },
            {
                code: "07",
                name: "07. Pavimentos y Alicatados",
                icon: "📐",
                items: [
                    {
                        code: "PAV010",
                        summary: "Pavimento de gres porcelánico rectificado colocado con C2TE",
                        unit: "m2",
                        price: 42.00,
                        description: "Suministro y colocación de baldosa de gres porcelánico rectificado formato 60x60 o 60x120 cm, recibida con adhesivo flexible C2TE y lechada CG2WA.",
                        decomposition: [
                            { code: "MT_GRES", summary: "Baldosa porcelánica 60x60 1ª calidad", unit: "m2", factor: 1.08, price: 21.00 },
                            { code: "MT_C2TE", summary: "Adhesivo cementoso flexible C2TE", unit: "kg", factor: 5.50, price: 0.75 },
                            { code: "MT_BORDA", summary: "Mortero de juntas CG2WA", unit: "kg", factor: 0.40, price: 2.20 },
                            { code: "MO_SOLA", summary: "Oficial 1ª solador", unit: "h", factor: 0.55, price: 26.00 }
                        ]
                    },
                    {
                        code: "PAV020",
                        summary: "Alicatado con azulejo cerámico pasta blanca en baños/cocina",
                        unit: "m2",
                        price: 36.50,
                        description: "Revestimiento vertical con baldosas de azulejo cerámico pasta blanca formato 30x90 cm con adhesivo C1TE y rejuntado.",
                        decomposition: [
                            { code: "MT_AZUL", summary: "Azulejo cerámico rectificado", unit: "m2", factor: 1.08, price: 17.50 },
                            { code: "MT_C1TE", summary: "Adhesivo cementoso C1TE", unit: "kg", factor: 4.50, price: 0.55 },
                            { code: "MO_ALIC", summary: "Oficial 1ª alicatador", unit: "h", factor: 0.55, price: 26.00 }
                        ]
                    },
                    {
                        code: "PAV030",
                        summary: "Suelo laminado AC5 con lámina aislante acústica",
                        unit: "m2",
                        price: 28.50,
                        description: "Suministro e instalación de tarima flotante laminada calidad AC5 espesor 8mm con manta de subsuelo de 2mm y rodapié a juego.",
                        decomposition: [
                            { code: "MT_LAMI", summary: "Suelo laminado AC5 8mm", unit: "m2", factor: 1.06, price: 16.00 },
                            { code: "MT_FOAM", summary: "Manta aislante acústica EVA 2mm", unit: "m2", factor: 1.05, price: 1.80 },
                            { code: "MT_RODA", summary: "Rodapié lacado blanco 8cm", unit: "m", factor: 0.85, price: 3.20 },
                            { code: "MO_PARQ", summary: "Oficial 1ª parquetista", unit: "h", factor: 0.25, price: 26.00 }
                        ]
                    }
                ]
            },
            {
                code: "08",
                name: "08. Carpintería Exterior y Vidriería",
                icon: "🪟",
                items: [
                    {
                        code: "CAR010",
                        summary: "Ventana de PVC oscilobatiente 2 hojas 120x120 con persiana",
                        unit: "ud",
                        price: 480.00,
                        description: "Ventana de 2 hojas oscilobatiente de PVC serie 70mm con persiana de aluminio con aislamiento térmico y cajón monoblock.",
                        decomposition: [
                            { code: "MT_VENPVC", summary: "Ventana PVC 70mm con persiana", unit: "ud", factor: 1.00, price: 390.00 },
                            { code: "MT_ESPUM", summary: "Espuma de poliuretano y tornillería", unit: "ud", factor: 1.00, price: 12.00 },
                            { code: "MO_CARP", summary: "Oficial 1ª montador carpintería", unit: "h", factor: 2.80, price: 27.50 }
                        ]
                    },
                    {
                        code: "CAR020",
                        summary: "Doble acristalamiento bajo emisivo 4/16/4 con gas Argón",
                        unit: "m2",
                        price: 68.00,
                        description: "Vidrio aislante térmico formado por luna flotada de 4 mm, cámara de aire de 16 mm con 90% gas argón y luna bajo emisiva de 4 mm.",
                        decomposition: [
                            { code: "MT_VIDRIO", summary: "Vidrio Climalit Planitherm 4/16/4", unit: "m2", factor: 1.00, price: 54.00 },
                            { code: "MO_CRIS", summary: "Oficial 1ª cristalero", unit: "h", factor: 0.50, price: 27.50 }
                        ]
                    }
                ]
            },
            {
                code: "09",
                name: "09. Carpintería Interior y Cerrajería",
                icon: "🚪",
                items: [
                    {
                        code: "CIN010",
                        summary: "Puerta de paso maciza lacada en blanco 72.5x203cm",
                        unit: "ud",
                        price: 245.00,
                        description: "Puerta de paso interior abatible de 1 hoja ciega, hoja maciza lacada en blanco, block completo con pernios, picaporte magnético, manilla inox y tapajuntas.",
                        decomposition: [
                            { code: "MT_PUERTA", summary: "Block puerta lacada blanca 72.5", unit: "ud", factor: 1.00, price: 165.00 },
                            { code: "MT_HERRAJ", summary: "Manilla acero inoxidable y accesorios", unit: "ud", factor: 1.00, price: 16.00 },
                            { code: "MO_CARP", summary: "Oficial 1ª carpintero de taller/obra", unit: "h", factor: 2.30, price: 27.50 }
                        ]
                    },
                    {
                        code: "CIN020",
                        summary: "Frente de armario empotrado 2 puertas correderas",
                        unit: "m2",
                        price: 165.00,
                        description: "Frente de armario empotrado compuesto por 2 puertas correderas de suelo a techo con perfilería oculta de aluminio y paneles lacados.",
                        decomposition: [
                            { code: "MT_ARMAR", summary: "Kit puertas correderas lacadas", unit: "m2", factor: 1.00, price: 110.00 },
                            { code: "MO_CARP", summary: "Oficial 1ª carpintero", unit: "h", factor: 1.90, price: 27.50 }
                        ]
                    }
                ]
            },
            {
                code: "10",
                name: "10. Instalaciones (Fontanería, Electricidad, Clima)",
                icon: "⚡",
                items: [
                    {
                        code: "INS010",
                        summary: "Instalación eléctrica completa de vivienda (Grado Básico)",
                        unit: "ud",
                        price: 2450.00,
                        description: "Instalación eléctrica para vivienda según REBT compuesta por cuadro general de mando y protección, circuitos C1 a C5 y 45 puntos de utilización.",
                        decomposition: [
                            { code: "MT_CUADRO", summary: "Cuadro eléctrico ICP+IGA+DIF+PIAS", unit: "ud", factor: 1.00, price: 380.00 },
                            { code: "MT_CABLE", summary: "Tubo corrugado, cable libre halógenos", unit: "ud", factor: 1.00, price: 620.00 },
                            { code: "MT_MECAN", summary: "Mecanismos y tomas Schuko alta gama", unit: "ud", factor: 45.00, price: 8.50 },
                            { code: "MO_ELEC", summary: "Oficial 1ª electricista homologado", unit: "h", factor: 38.00, price: 27.50 }
                        ]
                    },
                    {
                        code: "INS020",
                        summary: "Red interior de fontanería completa con tubería multicapa",
                        unit: "ud",
                        price: 1250.00,
                        description: "Instalación completa de agua fría y caliente en baño y cocina mediante colector y tubería multicapa aislada con llaves de corte individuales.",
                        decomposition: [
                            { code: "MT_MULTI", summary: "Tubería multicapa y accesorios prensar", unit: "ud", factor: 1.00, price: 390.00 },
                            { code: "MT_VALVU", summary: "Colectores y válvulas de corte", unit: "ud", factor: 1.00, price: 140.00 },
                            { code: "MO_FONT", summary: "Oficial 1ª fontanero", unit: "h", factor: 26.00, price: 27.50 }
                        ]
                    },
                    {
                        code: "INS030",
                        summary: "Sistema de Aerotermia con Suelo Radiante y ACS",
                        unit: "ud",
                        price: 8900.00,
                        description: "Bomba de calor aerotérmica bibloc para calefacción, refrigeración y ACS de 8 kW con depósito acumulador de 200 L y suelo radiante/refrescante.",
                        decomposition: [
                            { code: "MT_AERO", summary: "Bomba de calor aerotermia 8 kW + Depósito", unit: "ud", factor: 1.00, price: 4850.00 },
                            { code: "MT_SUELO", summary: "Panel de nódulos, tubo PEX y colectores", unit: "ud", factor: 1.00, price: 2100.00 },
                            { code: "MO_CLIMA", summary: "Cuadrilla especializada climatización", unit: "h", factor: 68.00, price: 28.50 }
                        ]
                    }
                ]
            },
            {
                code: "11",
                name: "11. Pinturas y Acabados Finales",
                icon: "🎨",
                items: [
                    {
                        code: "PIN010",
                        summary: "Pintura plástica lisa mate lavable en paramentos interiores",
                        unit: "m2",
                        price: 6.80,
                        description: "Pintura plástica de emulsión vinílica o acrílica acabado mate, previa imprimación fijadora y plastecido de faltas a dos manos.",
                        decomposition: [
                            { code: "MT_PINTPLAS", summary: "Pintura plástica mate 1ª calidad", unit: "kg", factor: 0.35, price: 4.80 },
                            { code: "MT_PLASTE", summary: "Plaste de masillar y lija", unit: "kg", factor: 0.15, price: 2.20 },
                            { code: "MO_PIN", summary: "Oficial 1ª pintor", unit: "h", factor: 0.18, price: 25.50 }
                        ]
                    },
                    {
                        code: "PIN020",
                        summary: "Esmalte sintético satinado en carpintería metálica / rejas",
                        unit: "m2",
                        price: 14.50,
                        description: "Lijado, imprimación antioxidante al cromato de zinc y dos manos de esmalte sintético satinado en rejas y barandillas.",
                        decomposition: [
                            { code: "MT_ESMAL", summary: "Esmalte poliuretano satinado", unit: "kg", factor: 0.25, price: 11.50 },
                            { code: "MO_PIN", summary: "Oficial 1ª pintor", unit: "h", factor: 0.42, price: 25.50 }
                        ]
                    }
                ]
            },
            {
                code: "12",
                name: "12. Gestión de Residuos y Seguridad",
                icon: "🦺",
                items: [
                    {
                        code: "SEG010",
                        summary: "Plan y medidas de Seguridad y Salud en obra",
                        unit: "pa",
                        price: 950.00,
                        description: "Equipos de protección individual (EPIs), barandillas perimetrales provisionales, extintores y señalización reglamentaria.",
                        decomposition: [
                            { code: "MT_EPIS", summary: "Protecciones individuales y colectivas", unit: "ud", factor: 1.00, price: 580.00 },
                            { code: "MO_PEON", summary: "Mantenimiento e instalación de protecciones", unit: "h", factor: 16.00, price: 22.50 }
                        ]
                    },
                    {
                        code: "SEG020",
                        summary: "Gestión ambiental y transporte de residuos a vertedero RCD",
                        unit: "pa",
                        price: 680.00,
                        description: "Separación selectiva en obra, canon de vertido autorizado y canon de reciclaje según normativa RCD.",
                        decomposition: [
                            { code: "MT_CANON", summary: "Tasas y certificados de vertido RCD", unit: "ud", factor: 1.00, price: 420.00 },
                            { code: "MQ_CAMION", summary: "Transporte con camión de residuos", unit: "h", factor: 4.00, price: 65.00 }
                        ]
                    }
                ]
            }
        ],

        /**
         * Normaliza un objeto de proyecto para compatibilidad total con el motor del visor y parser
         */
        normalizeProject: function (project, options) {
            const title = options?.title || "Nuevo Presupuesto";
            const client = options?.client || "Propiedad";

            project.properties = {
                owner: client,
                format: "FIEBDC-3/2020",
                generator: "BC3Viewer-Pro",
                description: title,
                charset: "windows-1252"
            };

            project.root_nodes = ["OBRA#"];

            // Asegurar integridad de todos los conceptos
            for (const code in project.concepts) {
                const c = project.concepts[code];
                c.code = code;
                c.unit = c.unit || "";
                c.summary = c.summary || code;
                c.description = c.description || "";
                c.price = parseFloat(c.price) || 0;
                c.measurements = Array.isArray(c.measurements) ? c.measurements : [];
                c.decomposition = Array.isArray(c.decomposition) ? c.decomposition : [];
                
                // Construir lista de hijos a partir de la descomposición
                c.children = [];
                c.decomposition.forEach(d => {
                    if (d.code && !c.children.includes(d.code)) {
                        c.children.push(d.code);
                    }
                });

                if (typeof c.type === 'undefined' || c.type === null) {
                    const lCode = code.toLowerCase();
                    if (lCode.startsWith('mo') || lCode.startsWith('mano')) c.type = 1;
                    else if (lCode.startsWith('mq') || lCode.startsWith('maq')) c.type = 2;
                    else if (lCode.startsWith('mt') || lCode.startsWith('mat')) c.type = 3;
                    else c.type = 0;
                }
            }

            return project;
        },

        /**
         * Crea un presupuesto en blanco estructurado en formato FIEBDC-3
         */
        createBlankProject: function (options) {
            const title = options.title || "Nuevo Presupuesto";
            const client = options.client || "Propiedad";
            const location = options.location || "Obra";
            const dateStr = options.date || new Date().toISOString().slice(0, 10);

            const rootCode = "OBRA#";
            const concepts = {};

            // Raíz del proyecto
            concepts[rootCode] = {
                code: rootCode,
                unit: "",
                summary: title.toUpperCase(),
                price: 0,
                quantity: 1,
                type: 0,
                children: [],
                decomposition: [],
                measurements: []
            };

            const project = {
                header: {
                    software: "BC3Viewer-Pro",
                    version: "FIEBDC-3/2020",
                    propietario: client,
                    titulo: title,
                    fecha: dateStr,
                    moneda: "EUR"
                },
                concepts: concepts,
                root_nodes: [rootCode],
                coefficients: { direct_costs: 1.0, overheads: 13.0, industrial_profit: 6.0, vat: 21.0 }
            };

            return this.normalizeProject(project, options);
        },

        /**
         * Crea un presupuesto a partir de una plantilla sectorial preconfigurada
         */
        createTemplateProject: function (templateType, options) {
            const project = this.createBlankProject(options);
            const root = project.concepts["OBRA#"];

            let selectedCategoryCodes = [];

            if (templateType === "reforma_piso") {
                selectedCategoryCodes = ["01", "04", "06", "07", "08", "09", "10", "11", "12"];
            } else if (templateType === "unifamiliar") {
                selectedCategoryCodes = ["02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
            } else if (templateType === "local_comercial") {
                selectedCategoryCodes = ["01", "04", "06", "07", "08", "09", "10", "11", "12"];
            } else {
                // Todo el catálogo completo
                selectedCategoryCodes = this.categories.map(c => c.code);
            }

            selectedCategoryCodes.forEach((catCode, catIdx) => {
                const cat = this.categories.find(c => c.code === catCode);
                if (!cat) return;

                const chCode = `CAP${String(catIdx + 1).padStart(2, '0')}#`;
                const chConcept = {
                    code: chCode,
                    unit: "",
                    summary: cat.name.replace(/^\d+\.\s*/, ''),
                    price: 0,
                    quantity: 1,
                    type: 0,
                    children: [],
                    decomposition: [],
                    measurements: []
                };

                let chTotal = 0;

                cat.items.forEach(item => {
                    const itemCode = item.code;
                    let defQty = 1.0;

                    // Ajuste de cantidades orientativas por plantilla
                    if (item.unit === 'm2') defQty = 45.0;
                    else if (item.unit === 'm3') defQty = 12.0;
                    else if (item.unit === 'ud') defQty = 1.0;
                    else if (item.unit === 'kg') defQty = 250.0;

                    const itemConcept = {
                        code: itemCode,
                        unit: item.unit,
                        summary: item.summary,
                        description: item.description,
                        price: item.price,
                        quantity: defQty,
                        type: 0,
                        children: [],
                        decomposition: item.decomposition || [],
                        measurements: []
                    };

                    // Registrar insumos de descomposición
                    if (item.decomposition && item.decomposition.length > 0) {
                        item.decomposition.forEach(d => {
                            if (!project.concepts[d.code]) {
                                let dType = 0;
                                const lCode = d.code.toLowerCase();
                                if (lCode.startsWith('mo')) dType = 1;
                                else if (lCode.startsWith('mq')) dType = 2;
                                else if (lCode.startsWith('mt')) dType = 3;

                                project.concepts[d.code] = {
                                    code: d.code,
                                    unit: d.unit,
                                    summary: d.summary,
                                    price: d.price,
                                    quantity: 1,
                                    type: dType,
                                    children: [],
                                    decomposition: [],
                                    measurements: []
                                };
                            }
                        });
                    }

                    project.concepts[itemCode] = itemConcept;
                    chConcept.decomposition.push({ code: itemCode, factor: defQty });
                    chTotal += defQty * item.price;
                });

                chConcept.price = chTotal;
                project.concepts[chCode] = chConcept;
                root.decomposition.push({ code: chCode, factor: 1.0 });
                root.price += chTotal;
            });

            return this.normalizeProject(project, options);
        },

        /**
         * Genera un presupuesto inteligente respondiendo a preguntas de alcance
         */
        createSmartProject: function (answers, options) {
            const area = parseFloat(answers.area) || 90; // m²
            const hasDemolition = answers.demolition !== false;
            const structType = answers.structure || 'hormigon';
            const hvacType = answers.hvac || 'aerotermia';
            const finishLevel = answers.finish || 'medio'; // medio, alto, premium

            const multPrice = finishLevel === 'premium' ? 1.35 : (finishLevel === 'alto' ? 1.15 : 1.0);

            const project = this.createBlankProject(options);
            const root = project.concepts["OBRA#"];

            let chapterIdx = 1;

            function addChapter(name, items) {
                const chCode = `CAP${String(chapterIdx++).padStart(2, '0')}#`;
                const chConcept = {
                    code: chCode,
                    unit: "",
                    summary: name,
                    price: 0,
                    quantity: 1,
                    type: 0,
                    children: [],
                    decomposition: [],
                    measurements: []
                };

                let chSum = 0;
                items.forEach(it => {
                    const itConcept = {
                        code: it.code,
                        unit: it.unit,
                        summary: it.summary,
                        description: it.description,
                        price: it.price * multPrice,
                        quantity: it.quantity,
                        type: 0,
                        children: [],
                        decomposition: it.decomposition || [],
                        measurements: []
                    };

                    if (it.decomposition) {
                        it.decomposition.forEach(d => {
                            if (!project.concepts[d.code]) {
                                let dType = 0;
                                const lCode = d.code.toLowerCase();
                                if (lCode.startsWith('mo')) dType = 1;
                                else if (lCode.startsWith('mq')) dType = 2;
                                else if (lCode.startsWith('mt')) dType = 3;

                                project.concepts[d.code] = {
                                    code: d.code,
                                    unit: d.unit,
                                    summary: d.summary,
                                    price: d.price * multPrice,
                                    quantity: 1,
                                    type: dType,
                                    children: [],
                                    decomposition: [],
                                    measurements: []
                                };
                            }
                        });
                    }

                    project.concepts[it.code] = itConcept;
                    chConcept.decomposition.push({ code: it.code, factor: it.quantity });
                    chSum += it.quantity * itConcept.price;
                });

                chConcept.price = chSum;
                project.concepts[chCode] = chConcept;
                root.decomposition.push({ code: chCode, factor: 1.0 });
                root.price += chSum;
            }

            // 1. Demoliciones
            if (hasDemolition) {
                const demCat = BC3PriceBank.categories.find(c => c.code === "01");
                if (demCat) {
                    addChapter("DEMOLICIONES Y TRABAJOS PREVIOS", [
                        { ...demCat.items[0], quantity: Math.round(area * 0.45) },
                        { ...demCat.items[1], quantity: Math.round(area * 0.90) },
                        { ...demCat.items[2], quantity: Math.round(area / 18) }
                    ]);
                }
            }

            // 2. Albañilería
            const albCat = BC3PriceBank.categories.find(c => c.code === "04");
            if (albCat) {
                addChapter("ALBAÑILERÍA Y PARTICIONES", [
                    { ...albCat.items[1], quantity: Math.round(area * 1.8) },
                    { ...albCat.items[0], quantity: Math.round(area * 0.3) }
                ]);
            }

            // 3. Falsos Techos y Revestimientos
            const revCat = BC3PriceBank.categories.find(c => c.code === "06");
            if (revCat) {
                addChapter("REVESTIMIENTOS Y FALSOS TECHOS", [
                    { ...revCat.items[2], quantity: Math.round(area * 0.85) },
                    { ...revCat.items[1], quantity: Math.round(area * 1.6) }
                ]);
            }

            // 4. Pavimentos
            const pavCat = BC3PriceBank.categories.find(c => c.code === "07");
            if (pavCat) {
                addChapter("PAVIMENTOS Y ALICATADOS", [
                    { ...pavCat.items[0], quantity: Math.round(area * 0.35) },
                    { ...pavCat.items[2], quantity: Math.round(area * 0.65) },
                    { ...pavCat.items[1], quantity: Math.round(area * 0.50) }
                ]);
            }

            // 5. Carpintería
            const carCat = BC3PriceBank.categories.find(c => c.code === "08");
            const cinCat = BC3PriceBank.categories.find(c => c.code === "09");
            if (carCat && cinCat) {
                addChapter("CARPINTERÍA Y VIDRIERÍA", [
                    { ...carCat.items[0], quantity: Math.max(3, Math.round(area / 20)) },
                    { ...cinCat.items[0], quantity: Math.max(4, Math.round(area / 15)) }
                ]);
            }

            // 6. Instalaciones
            const insCat = BC3PriceBank.categories.find(c => c.code === "10");
            if (insCat) {
                const instItems = [
                    { ...insCat.items[0], quantity: 1 },
                    { ...insCat.items[1], quantity: 1 }
                ];
                if (hvacType === 'aerotermia') {
                    instItems.push({ ...insCat.items[2], quantity: 1 });
                }
                addChapter("INSTALACIONES (ELECTRICIDAD, FONTANERÍA, CLIMA)", instItems);
            }

            // 7. Pinturas y Acabados
            const pinCat = BC3PriceBank.categories.find(c => c.code === "11");
            if (pinCat) {
                addChapter("PINTURAS Y ACABADOS", [
                    { ...pinCat.items[0], quantity: Math.round(area * 2.8) }
                ]);
            }

            // 8. Seguridad y Residuos
            const segCat = BC3PriceBank.categories.find(c => c.code === "12");
            if (segCat) {
                addChapter("GESTIÓN DE RESIDUOS Y SEGURIDAD", [
                    { ...segCat.items[0], quantity: 1 },
                    { ...segCat.items[1], quantity: 1 }
                ]);
            }

            return this.normalizeProject(project, options);
        },

        /**
         * Genera un proyecto BC3 a partir del JSON estructurado devuelto por Google Gemini AI
         */
        createProjectFromGeminiJson: function (data, options) {
            const project = this.createBlankProject(options);
            const root = project.concepts["OBRA#"];
            root.summary = data.title || options.title || "Presupuesto Generado con IA";

            if (!data.chapters || !Array.isArray(data.chapters)) {
                return project;
            }

            let rootPrice = 0;

            data.chapters.forEach((chData, chIdx) => {
                let chCode = chData.code || `CAP${String(chIdx + 1).padStart(2, '0')}##`;
                if (!chCode.endsWith('#')) {
                    chCode = chCode + '##';
                }
                const chSummary = (chData.summary || chData.name || `Capítulo ${chIdx + 1}`).toUpperCase();

                const chConcept = {
                    code: chCode,
                    unit: "",
                    summary: chSummary,
                    price: 0,
                    quantity: 1,
                    type: 0,
                    children: [],
                    decomposition: [],
                    measurements: []
                };

                let chTotal = 0;

                if (chData.items && Array.isArray(chData.items)) {
                    chData.items.forEach((item, itemIdx) => {
                        const itemCode = item.code || `PAR_${String(chIdx + 1).padStart(2, '0')}${String(itemIdx + 1).padStart(2, '0')}`;
                        const itemPrice = parseFloat(item.price) || 0;
                        const itemQty = parseFloat(item.quantity) || 1.0;
                        const itemUnit = item.unit || "ud";
                        const itemSummary = item.summary || item.title || "Unidad de obra";
                        const itemDesc = item.description || item.text || itemSummary;

                        const decomp = [];
                        if (item.components && Array.isArray(item.components)) {
                            item.components.forEach((comp, cIdx) => {
                                let cCode = comp.code || `COMP_${cIdx + 1}`;
                                let cType = 0;
                                const cTypeStr = (comp.type || "").toUpperCase();
                                if (cTypeStr === 'MO' || cCode.startsWith('MO')) { 
                                    cType = 1; 
                                    if (!cCode.startsWith('MO')) cCode = 'MO_' + cCode; 
                                } else if (cTypeStr === 'MQ' || cCode.startsWith('MQ')) { 
                                    cType = 2; 
                                    if (!cCode.startsWith('MQ')) cCode = 'MQ_' + cCode; 
                                } else if (cTypeStr === 'MT' || cCode.startsWith('MT')) { 
                                    cType = 3; 
                                    if (!cCode.startsWith('MT')) cCode = 'MT_' + cCode; 
                                }

                                const cFactor = parseFloat(comp.qty || comp.factor) || 1.0;
                                const cPrice = parseFloat(comp.price) || 0;
                                const cUnit = comp.unit || (cType === 1 ? 'h' : (cType === 2 ? 'h' : 'ud'));
                                const cSummary = comp.summary || comp.name || "Elemento descompuesto";

                                if (!project.concepts[cCode]) {
                                    project.concepts[cCode] = {
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

                                decomp.push({
                                    code: cCode,
                                    factor: cFactor,
                                    unit: cUnit,
                                    price: cPrice,
                                    summary: cSummary
                                });
                            });
                        }

                        const measurements = [];
                        if (item.measurements && Array.isArray(item.measurements)) {
                            item.measurements.forEach(m => {
                                measurements.push({
                                    comment: m.comment || "",
                                    units: parseFloat(m.units) || 1,
                                    length: parseFloat(m.length) || 0,
                                    width: parseFloat(m.width) || 0,
                                    height: parseFloat(m.height) || 0,
                                    total: parseFloat(m.total) || ((parseFloat(m.units) || 1) * (parseFloat(m.length) || 1) * (parseFloat(m.width) || 1) * (parseFloat(m.height) || 1))
                                });
                            });
                        }

                        const itemConcept = {
                            code: itemCode,
                            unit: itemUnit,
                            summary: itemSummary,
                            price: itemPrice,
                            quantity: itemQty,
                            type: 0,
                            description: itemDesc,
                            children: [],
                            decomposition: decomp,
                            measurements: measurements
                        };

                        project.concepts[itemCode] = itemConcept;
                        chConcept.decomposition.push({ code: itemCode, factor: itemQty });
                        chTotal += itemQty * itemPrice;
                    });
                }

                chConcept.price = chTotal;
                project.concepts[chCode] = chConcept;
                root.decomposition.push({ code: chCode, factor: 1.0 });
                rootPrice += chTotal;
            });

            root.price = rootPrice;
            return this.normalizeProject(project, options);
        },

        /**
         * Busca partidas en la base de precios por texto libre o categoría
         */
        searchItems: function (query, categoryCode) {
            const q = (query || "").toLowerCase().trim();
            const results = [];

            this.categories.forEach(cat => {
                if (categoryCode && categoryCode !== "all" && cat.code !== categoryCode) return;

                cat.items.forEach(item => {
                    const matchText = (item.code + " " + item.summary + " " + (item.description || "")).toLowerCase();
                    if (!q || matchText.includes(q)) {
                        results.push({
                            ...item,
                            categoryCode: cat.code,
                            categoryName: cat.name,
                            categoryIcon: cat.icon
                        });
                    }
                });
            });

            return results;
        }
    };

    // Exportación global
    global.BC3PriceBank = BC3PriceBank;

})(typeof window !== 'undefined' ? window : this);
