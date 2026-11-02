# Registro de comandos — Laboratorio 3

**Fecha de ejecución inicial:** 31/10/2026  
**Entorno:** Windows, Docker Compose, MongoDB 8.0 y Python 3.12  
**Replica Set:** `rs-lab3`  
**Base de datos:** `boleteria`

---

## Paso 0 — Preparación del entorno

**Fecha y hora:** 31/10/2026, 20:17

**Comandos ejecutados:**
```bash
docker compose version
docker ps
docker compose build app
```

**Resultados:**
- Docker y Docker Compose funcionando correctamente.
- No había contenedores ejecutándose al iniciar.
- Imagen `ti4601:local` construida exitosamente.
- Python 3.12 y PyMongo 4.19.0 disponibles.

**Evidencia:** Salida de la terminal durante la preparación.

**Estado:** OK

---

## Paso 1 — Levantar los nodos MongoDB

**Fecha y hora:** 31/10/2026, 20:19

**Comandos ejecutados:**
```bash
docker compose --profile lab3 up -d --build mongo-1 mongo-2 mongo-3
docker ps
docker exec ti4601-mongo-1 mongosh --quiet --eval "rs.status()"
```

**Resultados:**
- Los tres contenedores iniciaron correctamente.
- `ti4601-mongo-1`, `ti4601-mongo-2` y `ti4601-mongo-3` reportaron `Up (healthy)`.
- Los tres nodos utilizan MongoDB 8.0.
- `rs.status()` indicó que todavía no existía una configuración del Replica Set.
- El mensaje `no replset config has been received` era esperado antes de la inicialización.

**Evidencia:** `cluster-start.txt`

**Estado:** OK

---

## Paso 2 — Inicialización del Replica Set

**Fecha y hora:** 31/10/2026, 20:22

**Comandos ejecutados:**
```bash
docker exec ti4601-mongo-1 mongosh --quiet --eval "rs.initiate({_id:'rs-lab3',members:[{_id:0,host:'mongo-1:27017'},{_id:1,host:'mongo-2:27017'},{_id:2,host:'mongo-3:27017'}]})"
docker exec ti4601-mongo-1 mongosh --quiet --eval "rs.status()"
```

**Resultados:**
- Replica Set `rs-lab3` inicializado correctamente.
- `mongo-1` quedó como PRIMARY.
- `mongo-2` y `mongo-3` quedaron como SECONDARY.
- Los tres miembros reportaron `health: 1`.
- Mayoría de votos: 2 de 3 miembros.
- Mayoría requerida para escrituras con `w="majority"`: 2 miembros.
- La consulta de estado finalizó con `ok: 1`.

**Evidencia:** `replica-status.txt`

**Estado:** OK

---

## Paso 3 — Inspección del Replica Set

**Fecha y hora:** 31/10/2026, 20:24 

**Comandos ejecutados:**
```bash
docker exec ti4601-mongo-1 mongosh --quiet --eval "rs.status()"
```

Para guardar la inspección detallada:
```bash
docker exec ti4601-mongo-1 mongosh --quiet --eval "printjson(rs.status().members.map(m => ({name:m.name,state:m.stateStr,health:m.health,syncSource:m.syncSourceHost}))); printjson({term:rs.status().term}); printjson(rs.conf().settings); printjson(rs.conf().members.map(m => ({host:m.host,votes:m.votes,priority:m.priority}))); printjson(db.hello())" > evidence/rs-inspect.txt
```

**Resultados:**
- Se confirmó el nombre del conjunto: `rs-lab3`.
- `mongo-1` se identificó como PRIMARY.
- `mongo-2` y `mongo-3` se identificaron como SECONDARY.
- Los tres miembros reportaron `health: 1`.
- Ambos secundarios estaban sincronizando desde `mongo-1:27017`.
- Término de elección (`term`): 1.
- Intervalo entre heartbeats (`heartbeatIntervalMillis`): 2000 ms.
- Tiempo de espera para elecciones (`electionTimeoutMillis`): 10000 ms.
- Cada nodo tiene `votes: 1` y `priority: 1`.
- `db.hello()` confirmó `isWritablePrimary: true`, `secondary: false` y `setName: 'rs-lab3'`.
- La consulta finalizó con `ok: 1`.

**Evidencias:** `replica-status.txt` y `rs-inspect.txt`

**Estado:** OK

---

## Paso 4 — Generación de datos

**Fecha y hora:** 31/10/2026, 20:47

**Comando ejecutado:**
```bash
docker compose run --rm --no-deps app python3 labs/lab3-mongo-replicas/generar_datos.py > evidence/datos-manifest.txt
```

**Resultados:**
- Semilla utilizada: `2026`.
- Eventos generados: 400.
- Zonas generadas: 1189.
- Capacidad total: 162810.
- Archivo de datos generado: `data/eventos.jsonl`.
- SHA-256 de los eventos: `9fc6a2dbf450340038a53813d1bf85e9206da1f7f8460259bf8cf4609ad4774a`.
- Los archivos de `data/` se mantienen fuera del repositorio Git.

**Evidencia:** `datos-manifest.txt`

**Estado:** OK

---

## Paso 5 — Carga de eventos y creación de índices

**Fecha y hora:** 31/10/2026, 21:26

**Archivo modificado:** `cargar.py`

**Implementación realizada:**
- TODO 1: lectura de `eventos.jsonl` línea por línea e inserción por lotes mediante `insert_many()`.
- TODO 2: creación de dos índices compuestos mediante `create_index()`.

**Comando de carga:**
```bash
docker compose run --rm --no-deps app python3 labs/lab3-mongo-replicas/cargar.py --lote 100
```

**Resultados de la carga:**
- Escritura configurada con `w="majority"`.
- Se insertaron correctamente los 400 eventos.
- Se verificaron 1189 zonas y una capacidad total de 162810.
- Tiempo de carga final: 0.09 segundos.
- Rendimiento aproximado: 4507 documentos por segundo.
- Índice `categoria_1_fecha_1` creado en la colección `eventos`.
- Índice `evento_id_1_estado_1` creado en la colección `ordenes`.
- Las cinco verificaciones automáticas finalizaron correctamente.

**Comando de inspección de índices:**
```bash
docker exec ti4601-mongo-1 mongosh --quiet --eval "printjson(db.getSiblingDB('boleteria').eventos.getIndexes())"
```

**Resultados de la inspección:**
- Se confirmó el índice automático `_id_`.
- Se confirmó el índice compuesto `categoria_1_fecha_1`, con ambos campos en orden ascendente.
- La base de datos utilizada fue `boleteria`.

**Comando de verificación de configuración:**
```bash
docker compose --profile lab3 run --rm --no-deps app python3 labs/lab3-mongo-replicas/verify_replica.py > evidence/config-check.txt 2>&1
```

**Resultados de la verificación:**
- Se confirmó que el conjunto se llama `rs-lab3` y tiene tres miembros.
- Los tres miembros están saludables.
- Existe exactamente un PRIMARY y dos SECONDARY.
- Los tres miembros tienen derecho a voto y prioridad positiva.
- La colección `eventos` contiene los 400 documentos del manifiesto.
- Se confirmó la existencia de los índices compuestos de `eventos` y `ordenes`.
- Diferencia máxima de optime entre miembros: 0.0 segundos.
- Resultado final: **6/6 verificaciones exitosas**.

**Comando de análisis con índice:**
```bash
docker exec ti4601-mongo-1 mongosh --quiet --eval "const d=db.getSiblingDB('boleteria'); const e=d.eventos.find({categoria:'concierto',fecha:{$gte:'2026-12-01'}}).sort({fecha:1}).explain('executionStats'); print('=== CONSULTA CON INDICE ==='); printjson(e.queryPlanner.winningPlan); printjson(e.executionStats)" > evidence/explain-indices.txt
```

**Comando de análisis sin índice:**
```bash
docker exec ti4601-mongo-1 mongosh --quiet --eval "const d=db.getSiblingDB('boleteria'); const e=d.eventos.find({categoria:'concierto',fecha:{$gte:'2026-12-01'}}).sort({fecha:1}).hint({$natural:1}).explain('executionStats'); print('=== CONSULTA SIN INDICE ==='); printjson(e.queryPlanner.winningPlan); printjson(e.executionStats)" >> evidence/explain-indices.txt
```

**Resultados de `explain()`:**

| Métrica | Con índice | Sin índice |
|---|---|---|
| Etapa de acceso | IXSCAN | COLLSCAN |
| Índice utilizado | `categoria_1_fecha_1` | Ninguno |
| Documentos examinados | 67 | 400 |
| Claves examinadas | 67 | 0 |
| Documentos devueltos | 67 | 67 |
| Tiempo de ejecución | 2 ms | 1 ms |
| Etapa SORT separada | No | Sí |

**Observaciones de la comparación:**
- El índice permitió examinar 67 documentos en lugar de 400.
- Se redujo en un 83.25 % la cantidad de documentos examinados.
- El índice permitió resolver el ordenamiento sin una etapa `SORT` separada.
- Los tiempos registrados fueron muy pequeños y no permiten concluir una mejora de latencia con esta cantidad de datos.
- La diferencia en documentos examinados demuestra la utilidad del índice compuesto.

**Evidencias:**
- `config-check.txt` — seis verificaciones automáticas.
- `explain-indices.txt` — comparación de planes de ejecución.

**Estado:** OK

## Paso 6 — Observación del oplog y retraso de replicación

**Fecha y hora:** 31/10/2026, aproximadamente 23:50

**Comandos ejecutados:**

Inserción de una orden en el primario:
```bash
docker exec ti4601-mongo-1 mongosh --quiet --eval "printjson(db.getSiblingDB('boleteria').ordenes.insertOne({_id:'ORD-MANUAL-1',evento_id:'EV-0001',zona:'General',cantidad:2,estado:'confirmada'}))"
```

Consulta de la operación en el oplog:
```bash
docker exec ti4601-mongo-1 mongosh --quiet --eval "db.getSiblingDB('local').oplog.rs.find({ns:'boleteria.ordenes'}).sort({$natural:-1}).limit(3).forEach(printjson)"
```

Verificación de la orden desde un secundario:
```bash
docker exec ti4601-mongo-2 mongosh --quiet --eval "printjson(db.getSiblingDB('boleteria').ordenes.findOne({_id:'ORD-MANUAL-1'}))"
```

Prueba de escritura en un secundario:
```bash
docker exec ti4601-mongo-2 mongosh --quiet --eval "printjson(db.getSiblingDB('boleteria').ordenes.insertOne({_id:'ORD-NO',estado:'x'}))"
```

Generación de evidencia del oplog y retraso:
```bash
docker exec ti4601-mongo-1 mongosh --quiet --eval "db.getSiblingDB('local').oplog.rs.find({ns:'boleteria.ordenes'}).sort({$natural:-1}).limit(3).forEach(printjson); rs.printReplicationInfo(); rs.printSecondaryReplicationInfo()" > evidence/oplog.txt 2>&1
```

Consulta complementaria de tamaño y ventana del oplog:
```bash
docker exec ti4601-mongo-1 mongosh --quiet --eval "const o=db.getSiblingDB('local').oplog.rs; const primero=o.find().sort({$natural:1}).limit(1).next(); const ultimo=o.find().sort({$natural:-1}).limit(1).next(); printjson({tamanoMaximoBytes:o.stats().maxSize,primeraOperacion:primero.wall,ultimaOperacion:ultimo.wall,ventanaSegundos:ultimo.ts.getHighBits()-primero.ts.getHighBits()})" >> evidence/oplog.txt
```

**Resultados:**
- La orden `ORD-MANUAL-1` se insertó correctamente (`acknowledged: true`).
- Se encontró la operación en el oplog con `op: 'i'` y `ns: 'boleteria.ordenes'`.
- La operación se registró en el término de elección `t: 1`.
- Se verificó que `mongo-2` contenía el mismo documento insertado en el primario.
- Los secundarios `mongo-2` y `mongo-3` reportaron un retraso de replicación de 0 segundos.
- Tamaño máximo configurado del oplog: 50062255616 bytes.
- Primera operación registrada: `2026-11-01T02:21:47.094Z`.
- Última operación registrada: `2026-11-01T05:49:47.464Z`.
- Ventana temporal observada del oplog: 12480 segundos (3 horas y 28 minutos).
- Se confirmó que mongo-2, al actuar como SECONDARY, rechazó la escritura directa con el error MongoServerError: not primary.

**Evidencia:** `oplog.txt`

**Estado:** OK

---
