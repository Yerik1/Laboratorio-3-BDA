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

## Paso 7 — Lecturas obsoletas en secundarios

**Fecha y hora:** 01/11/2026, 00:01.

**Comando ejecutado:**
```bash
docker compose --profile lab3 run --rm --no-deps app python3 labs/lab3-mongo-replicas/lectura_secundario.py --n 500 --csv evidence/lectura-secundario.csv > evidence/lectura-secundario.txt 2>&1
```

**Resultados:**
- Se ejecutaron 500 intentos por modalidad, para un total de 1500 intentos.
- `w1_secundario`: 493 lecturas obsoletas (98.6 %).
- `majority_secundario`: 0 lecturas obsoletas (0.0 %).
- `causal_majority`: 0 lecturas obsoletas (0.0 %).
- La escritura con `w:1` presentó la mayor cantidad de lecturas obsoletas.
- En esta ejecución, las modalidades con `w="majority"` no presentaron lecturas obsoletas.
- El modo causal obtuvo el resultado esperado de 0 %.
- Se considera que los tres nodos comparten una misma computadora, por lo que las condiciones de replicación difieren de un entorno distribuido real.

**Evidencias:**
- `lectura-secundario.txt`
- `lectura-secundario.csv`

**Estado:** OK

## Paso 8 — Compra atómica e idempotente

**Fecha y hora:** 01/11/2026, 00:15.

**Archivo modificado:** `comprar.py`

**Implementación realizada:**
- TODO 3: registro de órdenes con identificador único e implementación del descuento atómico mediante `update_one()`.
- Uso de `$elemMatch` para comprobar disponibilidad en la zona correspondiente.
- Uso de `$inc` y del operador posicional `$` para descontar las entradas.
- Manejo de `DuplicateKeyError` para evitar descuentos repetidos por el mismo identificador de orden.
- Prueba adicional con una implementación incorrecta que separa la lectura y la actualización.

**Comando de prueba correcta:**
```bash
docker compose --profile lab3 run --rm --no-deps app python3 labs/lab3-mongo-replicas/comprar.py > evidence/comprar.txt 2>&1
```

**Resultados de la implementación correcta:**
- 200 compradores simultáneos.
- 120 compras confirmadas y 80 agotadas.
- Cero entradas restantes, sin disponibilidad negativa.
- 120 órdenes confirmadas registradas.
- Compras VIP: dos confirmadas, una agotada y dos entradas restantes.
- Cinco ejecuciones de la misma orden descontaron una sola entrada.
- Una zona inexistente devolvió `agotada`.
- Tiempo de ejecución: 0.66 segundos.
- Rendimiento: 301 compras por segundo.
- Las seis verificaciones terminaron correctamente.

**Prueba con implementación incorrecta:**

Se reemplazó temporalmente el descuento condicional por una lectura de disponibilidad seguida de una escritura independiente.

**Comando ejecutado:**
```bash
docker compose --profile lab3 run --rm --no-deps app python3 labs/lab3-mongo-replicas/comprar.py > evidence/comprar-incorrecto.txt 2>&1
```

**Resultados:**
- 188 compras confirmadas y 12 agotadas.
- Se produjeron 68 ventas por encima de la capacidad disponible.
- La disponibilidad de la zona General terminó en −68.
- En VIP se confirmaron tres compras de cuatro entradas, dejando −2 disponibles.
- Las pruebas de idempotencia y zona inexistente continuaron pasando.
- El resultado final indicó verificaciones fallidas.

**Conclusión:**
La versión incorrecta permitió condiciones de carrera porque verificaba la disponibilidad antes de ejecutar la actualización. La versión correcta evalúa la condición y realiza el descuento atómicamente en MongoDB.

**Evidencias:**
- `comprar.txt`
- `comprar-incorrecto.txt`

**Estado:** OK

## Paso 9 — Medición del costo de las garantías de escritura

**Fecha y hora:** 01/11/2026 00:33.

**Archivo modificado:** `bench_write_concern.py`

**Implementación realizada:**
- TODO 4: implementación de `medir_escrituras()` para medir la latencia de `insert_one()`.
- Configuración de las garantías mediante `WriteConcern` y `with_options()`.
- Medición del tiempo de cada inserción utilizando `time.perf_counter()`.
- Comparación de las modalidades `w1`, `w1_journal`, `majority` y `w3`.
- Se realizaron 30 inserciones de calentamiento y 300 mediciones por modalidad.

**Comando de prueba inicial:**
```bash
docker compose --profile lab3 run --rm --no-deps app python3 labs/lab3-mongo-replicas/bench_write_concern.py --n 10 --warmup 3 --csv evidence/write-concern-prueba.csv
```

**Resultado:** las cuatro modalidades completaron correctamente las 10 mediciones de prueba.

**Comando de medición definitiva:**
```bash
docker compose --profile lab3 run --rm --no-deps app python3 labs/lab3-mongo-replicas/bench_write_concern.py --n 300 --warmup 30 --csv evidence/write-concern.csv > evidence/write-concern.txt 2>&1
```

**Resultados:**

| Modalidad | n | p50 (ms) | p95 (ms) | p99 (ms) | Operaciones/s |
|---|---:|---:|---:|---:|---:|
| `w1` | 300 | 0.57 | 1.32 | 2.59 | 1404 |
| `w1_journal` | 300 | 6.35 | 12.80 | 20.49 | 137 |
| `majority` | 300 | 6.71 | 11.50 | 30.84 | 127 |
| `w3` | 300 | 1.36 | 1.90 | 3.59 | 680 |

**Verificaciones:**
- Las cuatro modalidades devolvieron la cantidad esperada de muestras.
- Se generaron 1200 mediciones individuales.
- El archivo CSV contiene 1201 líneas, incluyendo el encabezado.
- `w1` presentó la menor latencia mediana.
- `majority` presentó una latencia mediana aproximadamente 11.8 veces mayor que `w1`.
- `w3` presentó menor latencia que `majority` en esta ejecución, aunque esto no implica que sea una garantía generalmente más rápida.
- Los tres miembros del Replica Set comparten una misma computadora, sin latencia de red entre máquinas diferentes.

**Evidencias:**
- `write-concern.txt`
- `write-concern.csv`

**Estado:** OK

## Paso 10 — Verificación del RPO y línea base

**Fecha y hora:** 01/11/2026, 16:28.

**Archivo modificado:** `verificar_rpo.py`

**Implementación realizada:**
- TODO 5: implementación de `calcular_rpo()` mediante operaciones entre conjuntos.
- Clasificación de operaciones confirmadas perdidas, errores presentes, errores ausentes y documentos inesperados.
- Verificación del resultado utilizando lecturas con `readConcern: majority`.

**Comando de pruebas sintéticas:**
```bash
docker compose --profile lab3 run --rm --no-deps app python3 labs/lab3-mongo-replicas/verificar_rpo.py --autotest
```

**Resultado:** los tres casos sintéticos finalizaron correctamente.

**Comando de línea base:**
```bash
docker compose --profile lab3 run --rm --no-deps app python3 labs/lab3-mongo-replicas/sonda_escrituras.py --duration 10 --label Base --csv evidence/rpo-baseline.csv
```

**Comando de verificación del RPO:**
```bash
docker compose --profile lab3 run --rm --no-deps app python3 labs/lab3-mongo-replicas/verificar_rpo.py --csv evidence/rpo-baseline.csv > evidence/rpo-baseline.txt 2>&1
```

**Resultados:**
- Corrida: `r45dc2f28`.
- Intentos realizados: 20.
- Operaciones confirmadas: 20.
- Operaciones con error: 0.
- Documentos presentes en MongoDB: 20.
- Operaciones confirmadas perdidas: 0.
- Errores que sí quedaron escritos: 0.
- Errores que no quedaron escritos: 0.
- Documentos inesperados: 0.
- RPO observado sobre operaciones confirmadas: 0.

**Evidencias:**
- `rpo-baseline.csv`
- `rpo-baseline.txt`

**Estado:** OK

## Paso 11 — Falla A: caída de un secundario

**Fecha y hora:** 01/11/2026, 16:54.

**Escenario:** Se detuvo temporalmente `mongo-2` (SECONDARY) mientras la sonda continuaba realizando escrituras con `w="majority"`.

**Comando de la sonda:**
```cmd
docker compose --profile lab3 run --rm --no-deps app python3 labs/lab3-mongo-replicas/sonda_escrituras.py --duration 40 --label "Falla A" --signal-file evidence/falla-a-stop.epoch --csv evidence/falla-a.csv > evidence\falla-a.txt 2>&1
```

**Operaciones realizadas durante la falla:**
- Se detuvo `ti4601-mongo-2` mediante `docker stop --timeout 0`.
- Se registró el instante de la falla en `falla-a-stop.epoch` y `falla-a-stop.txt`.
- Se verificó mediante Docker que el contenedor estaba detenido (`Running: false`).
- Se consultó el estado del Replica Set durante la falla.
- Se mantuvo el secundario detenido aproximadamente 15 segundos y posteriormente se restauró mediante `docker start ti4601-mongo-2`.

**Comando de verificación del RPO:**
```cmd
docker compose --profile lab3 run --rm --no-deps app python3 labs/lab3-mongo-replicas/verificar_rpo.py --csv evidence/falla-a.csv > evidence\falla-a-rpo.txt 2>&1
```

**Resultados:**
- Corrida: `r81fe877b`.
- Durante la falla, `mongo-2` reportó `health: 0`.
- `mongo-1` permaneció como PRIMARY y `mongo-3` como SECONDARY.
- La mayoría de 2 de 3 miembros se mantuvo disponible.
- Intentos realizados: 80.
- Operaciones confirmadas: 80.
- Operaciones con error: 0.
- Documentos presentes después de la recuperación: 80.
- Operaciones confirmadas perdidas: 0.
- RPO observado: 0.
- No se observó interrupción de las escrituras confirmadas.

**Latencias registradas:**

| Métrica | Antes de la falla | Después de la falla |
|---|---:|---:|
| Operaciones confirmadas | 19 | 61 |
| p50 | 19.6 ms | 11.0 ms |
| p99 | 49.6 ms | 57.7 ms |

- Primera escritura confirmada después de la señal: secuencia 19, aproximadamente 470 ms después.
- No se observó un período de indisponibilidad; por tanto, no hubo un RTO de recuperación medible en este escenario.
- Después de restaurar el nodo se verificó nuevamente un PRIMARY y dos SECONDARY, todos con `health: 1`.

**Evidencias:**
- `falla-a-before.txt`
- `falla-a.txt`
- `falla-a.csv`
- `falla-a-stop.epoch`
- `falla-a-stop.txt`
- `falla-a-docker-status.txt`
- `falla-a-status.txt`
- `falla-a-recovered.txt`
- `falla-a-rpo.txt`

**Estado:** OK

## Paso 12 — Falla B: caída del primario

**Fecha y hora:** 01/11/2026, 17:04.

**Escenario:** Se detuvo `mongo-1` (PRIMARY) mientras la sonda realizaba escrituras con `w="majority"`. Los dos secundarios permanecieron disponibles para elegir un nuevo primario.

**Comando de la sonda:**
```cmd
docker compose --profile lab3 run --rm --no-deps app python3 labs/lab3-mongo-replicas/sonda_escrituras.py --duration 60 --label "Falla B" --signal-file evidence/falla-b-stop.epoch --csv evidence/falla-b.csv > evidence\falla-b.txt 2>&1
```

**Operaciones durante la falla:**
- Se detuvo `ti4601-mongo-1` mediante `docker kill`.
- Se registró el instante de caída en `falla-b-stop.epoch` y `falla-b-stop.txt`.
- Se comprobó que el contenedor estaba detenido (`Running: false`).
- Se esperaron 15 segundos para permitir una nueva elección.
- Se consultó el estado del Replica Set desde `mongo-2`.
- Se restauró `mongo-1` mediante `docker start`.

**Comando de verificación del RPO:**
```cmd
docker compose --profile lab3 run --rm --no-deps app python3 labs/lab3-mongo-replicas/verificar_rpo.py --csv evidence/falla-b.csv > evidence\falla-b-rpo.txt 2>&1
```

**Resultados:**
- Corrida: `r4115e834`.
- Antes de la falla, `mongo-1` era PRIMARY y el término de elección era 1.
- Durante la falla, `mongo-3` fue elegido PRIMARY y el término aumentó a 2.
- `mongo-1` regresó como SECONDARY después de la recuperación.
- Intentos: 101.
- Escrituras confirmadas: 98.
- Operaciones con error: 3.
- Tipo de error: `ServerSelectionTimeoutError`.
- Documentos presentes: 98.
- Operaciones confirmadas perdidas: 0.
- Los tres intentos con error resultaron ausentes en la base.
- RPO observado: 0 operaciones.

**Cálculo del RTO:**
- Marca de falla: `1793574106.109`.
- Primera confirmación posterior: `seq=14`, `1793574116.435820`.
- RTO = `1793574116.435820 - 1793574106.109`.
- **RTO observado: 10.327 segundos.**
- Ventana entre la última confirmación anterior y la primera posterior: 10.967 segundos.

**Latencias registradas:**

| Métrica | Antes de la falla | Después de la falla |
|---|---:|---:|
| Operaciones confirmadas | 11 | 87 |
| p50 | 9.7 ms | 26.5 ms |
| p99 | 48.7 ms | 170.0 ms |

**Evidencias:**
- `falla-b-before.txt`
- `falla-b.txt`
- `falla-b.csv`
- `falla-b-stop.epoch`
- `falla-b-stop.txt`
- `falla-b-docker-status.txt`
- `falla-b-status.txt`
- `falla-b-recovered.txt`
- `falla-b-rpo.txt`

**Estado:** OK

## Paso 13 — Falla C: pérdida de mayoría

**Fecha y hora:** 01/11/2026, 17:14 .

**Escenario:** Se detuvieron simultáneamente `mongo-1` y `mongo-2`, ambos SECONDARY, dejando solamente `mongo-3` disponible. Se ejecutaron escrituras con `w="majority"` y `wtimeout=2000 ms` para observar el comportamiento del conjunto al perder la mayoría.

**Comando de la sonda:**

```cmd
docker compose --profile lab3 run --rm --no-deps app python3 labs/lab3-mongo-replicas/sonda_escrituras.py --duration 90 --label "Falla C" --signal-file evidence/falla-c-stop.epoch --csv evidence/falla-c.csv > evidence\falla-c.txt 2>&1
```

**Operaciones realizadas durante la falla:**
- Se detuvieron los contenedores `ti4601-mongo-1` y `ti4601-mongo-2`.
- Se registró el instante de falla en `falla-c-stop.epoch` y `falla-c-stop.txt`.
- Docker confirmó que ambos contenedores estaban detenidos (`Running: false`).
- MongoDB reportó `health: 0` para ambos nodos.
- `mongo-3`, inicialmente PRIMARY, pasó a SECONDARY al perder la mayoría.
- Se restauraron los dos secundarios y se verificó la recuperación del Replica Set.

**Comando de verificación del RPO:**

```cmd
docker compose --profile lab3 run --rm --no-deps app python3 labs/lab3-mongo-replicas/verificar_rpo.py --csv evidence/falla-c.csv > evidence\falla-c-rpo.txt 2>&1
```

**Resultados:**
- Corrida: `rd1cf5314`.
- Intentos realizados: 108.
- Operaciones confirmadas: 94.
- Operaciones con error: 14.
- `WTimeoutError`: 4.
- `WriteConcernError`: 1.
- `ServerSelectionTimeoutError`: 9.
- Documentos presentes después de la recuperación: 99.
- Operaciones confirmadas perdidas: 0.
- Operaciones con error que sí quedaron almacenadas: 5 (secuencias 12, 13, 14, 15 y 16).
- Operaciones con error ausentes: 9.
- RPO observado de operaciones confirmadas: 0.

**Cálculo del tiempo de recuperación:**
- Marca de falla: `1793574621.517`.
- Primera escritura confirmada después de la falla: secuencia 26, aproximadamente `1793574664.277`.
- Tiempo desde la falla hasta la primera confirmación posterior: **42.760 segundos**.
- Ventana entre la última confirmación anterior y la primera posterior: **43.233 segundos**.

**Latencias de las escrituras confirmadas:**

| Métrica | Antes de la falla | Después de la falla |
|---|---:|---:|
| Operaciones | 12 | 82 |
| p50 | 10.7 ms | 14.3 ms |
| p99 | 42.7 ms | 296.9 ms |

**Estado del Replica Set:**
- Antes de la falla: `mongo-3` PRIMARY, término 2.
- Durante la falla: `mongo-3` SECONDARY, sin mayoría.
- Después de restaurar los nodos: `mongo-3` PRIMARY, término 3.
- Los tres nodos finalizaron saludables.

**Conclusión:** La pérdida de mayoría impidió confirmar nuevas escrituras con `w="majority"` hasta la recuperación del conjunto. Se observaron cinco operaciones con error que sí habían quedado almacenadas, lo cual demuestra que un error de confirmación no equivale necesariamente a una escritura descartada. No se perdió ninguna operación previamente confirmada.

**Evidencias:**
- `falla-c-before.txt`
- `falla-c.txt`
- `falla-c.csv`
- `falla-c-stop.epoch`
- `falla-c-stop.txt`
- `falla-c-docker-status.txt`
- `falla-c-status.txt`
- `falla-c-recovered.txt`
- `falla-c-rpo.txt`

**Estado:** OK
---
