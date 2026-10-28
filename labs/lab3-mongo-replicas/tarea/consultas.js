// ============================================
// A1 - Conciertos en Heredia por rango de fecha
// ============================================

print("== A1 ==");

const filtroA1 = {
    categoria: "concierto",
    ciudad: "Heredia",
    fecha: {
        $gte: "2026-12-01",
        $lte: "2027-02-28"
    }
};

const proyeccionA1 = {
    _id: 0,
    nombre: 1,
    recinto: 1,
    fecha: 1
};

db.eventos
    .find(filtroA1, proyeccionA1)
    .sort({ fecha: 1 })
    .forEach(printjson);

// Eliminar el indice de A1 si ya existe,
// para reproducir la comparacion desde cero.

const nombreIndiceA1 = "categoria_1_ciudad_1_fecha_1";

if (db.eventos.getIndexes().some(indice => indice.name === nombreIndiceA1)) {
    db.eventos.dropIndex(nombreIndiceA1);
}

print("== A1 - INDICE INICIAL ELIMINADO ==");
printjson(db.eventos.getIndexes());

print("== A1 - EXPLAIN ANTES DEL INDICE ==");

const antesA1 = db.eventos
    .find(filtroA1, proyeccionA1)
    .sort({ fecha: 1 })
    .explain("executionStats");

printjson({
    totalDocsExamined: antesA1.executionStats.totalDocsExamined,
    totalKeysExamined: antesA1.executionStats.totalKeysExamined,
    nReturned: antesA1.executionStats.nReturned,
    plan: antesA1.queryPlanner.winningPlan
});

print("== A1 - CREACION DEL INDICE ==");

printjson(
    db.eventos.createIndex({
        categoria: 1,
        ciudad: 1,
        fecha: 1
    })
);

print("== A1 - EXPLAIN DESPUES DEL INDICE ==");

const despuesA1 = db.eventos
    .find(filtroA1, proyeccionA1)
    .sort({ fecha: 1 })
    .explain("executionStats");

printjson({
    totalDocsExamined: despuesA1.executionStats.totalDocsExamined,
    totalKeysExamined: despuesA1.executionStats.totalKeysExamined,
    nReturned: despuesA1.executionStats.nReturned,
    plan: despuesA1.queryPlanner.winningPlan
});

// ============================================
// A2 - Eventos con zona VIP menor a 48000
// ============================================

print("== A2 ==");

db.eventos.find(
    {
        zonas: {
            $elemMatch: {
                nombre: "VIP",
                precio: { $lt: 48000 }
            }
        }
    },
    {
        _id: 0,
        nombre: 1,
        zonas: {
            $elemMatch: {
                nombre: "VIP",
                precio: { $lt: 48000 }
            }
        }
    }
).forEach(printjson);

// ============================================
// A2 - Comparacion con y sin $elemMatch
// ============================================

print("== A2 - COMPARACION ==");

const sinElemMatch = db.eventos.countDocuments({
    "zonas.nombre": "VIP",
    "zonas.precio": { $lt: 48000 }
});

const conElemMatch = db.eventos.countDocuments({
    zonas: {
        $elemMatch: {
            nombre: "VIP",
            precio: { $lt: 48000 }
        }
    }
});

printjson({
    sinElemMatch: sinElemMatch,
    conElemMatch: conElemMatch,
    diferencia: sinElemMatch - conElemMatch
});

// ============================================
// A3 - Eventos accesibles sin teatro ni conferencia
// ============================================

print("== A3 ==");

db.eventos.find(
    {
        etiquetas: "accesible",
        categoria: {
            $nin: ["teatro", "conferencia"]
        }
    },
    {
        _id: 0,
        nombre: 1,
        categoria: 1,
        etiquetas: 1
    }
).forEach(printjson);

print("== A3 - TOTAL DE EVENTOS ==");

printjson({
    total: db.eventos.countDocuments({
        etiquetas: "accesible",
        categoria: {
            $nin: ["teatro", "conferencia"]
        }
    })
});

// ============================================
// A4 - Eventos sin patrocinador por categoria
// ============================================

print("== A4 ==");

db.eventos.aggregate([
    {
        $match: {
            patrocinador: { $exists: false }
        }
    },
    {
        $group: {
            _id: "$categoria",
            cantidad: { $sum: 1 }
        }
    },
    {
        $sort: {
            cantidad: -1
        }
    }
]).forEach(printjson);

// ============================================
// A5 - Capacidad total por ciudad
// ============================================

print("== A5 ==");

db.eventos.aggregate([
    {
        $unwind: "$zonas"
    },
    {
        $group: {
            _id: "$ciudad",
            capacidadTotal: {
                $sum: "$zonas.capacidad"
            }
        }
    },
    {
        $sort: {
            capacidadTotal: -1
        }
    }
]).forEach(printjson);

// ============================================
// B - Tamano BSON y estimacion de ordenes
// ============================================

print("== B - TAMANO BSON ==");

const ordenEjemplo = {
    _id: "ORD-000001",
    evento_id: "EV-0001",
    zona: "VIP",
    cantidad: 2,
    estado: "confirmada",
    creada_en: ISODate("2026-10-28T12:00:00Z")
};

const tamanoOrden = bsonsize(ordenEjemplo);
const limiteBSON = 16 * 1024 * 1024;

printjson({
    ordenEjemplo: ordenEjemplo,
    tamanoBytes: tamanoOrden,
    limiteDocumentoBytes: limiteBSON,
    estimacionTeorica: Math.floor(limiteBSON / tamanoOrden)
});