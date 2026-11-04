# Laboratorio 3 — Conjuntos de réplicas en MongoDB.

**Curso:** TI4601 — Bases de Datos Avanzadas  
**Motor:** MongoDB 8.0  
**Conjunto de réplicas:** `rs-lab3` (tres nodos)

## Descripción

En este laboratorio configuramos un conjunto de réplicas de MongoDB con tres nodos mediante Docker Compose. Trabajamos con una base de datos de boletería para estudiar replicación, índices, operaciones atómicas, garantías de lectura y escritura, elecciones de primario y recuperación ante fallas.

La guía completa de las actividades y sus preguntas se encuentra en el material proporcionado por el profesor. Este README resume nuestra ejecución y cómo consultar las evidencias del equipo.

## Requisitos

- Docker Engine / Docker Desktop con Docker Compose v2.
- Recursos suficientes para ejecutar tres contenedores `mongo:8.0` y el cliente Python.
- Ejecutar los comandos desde la raíz del repositorio.

Los scripts se ejecutan dentro del servicio `app` de Docker Compose; no es necesario instalar `pymongo` directamente en Windows.

## Infraestructura

| Contenedor | Nodo del Replica Set | Función |
| --- | --- | --- |
| `ti4601-mongo-1` | `mongo-1:27017` | Miembro con voto; puede ser primario o secundario |
| `ti4601-mongo-2` | `mongo-2:27017` | Miembro con voto; puede ser primario o secundario |
| `ti4601-mongo-3` | `mongo-3:27017` | Miembro con voto; puede ser primario o secundario |

Los tres nodos usan el conjunto `rs-lab3`. El rol PRIMARY puede cambiar después de una elección; no debe asumirse que `mongo-1` es siempre el primario.

Para revisar el estado de los contenedores:

```cmd
docker ps
```

Para revisar los roles desde un nodo disponible (sustituir el número si ese contenedor no está funcionando):

```cmd
docker exec ti4601-mongo-3 mongosh --quiet --eval "printjson(rs.status().members.map(m=>({name:m.name,state:m.stateStr,health:m.health}))); printjson({term:rs.status().term})"
```

**Advertencia:** no volver a ejecutar `rs.initiate()` sobre un conjunto ya inicializado ni eliminar sus volúmenes de datos. Esta configuración es exclusivamente académica y no incluye autenticación ni TLS.

## Implementaciones realizadas

Los archivos del laboratorio se encuentran en `labs/lab3-mongo-replicas/`.

| Archivo | Trabajo |
| --- | --- |
| `cargar.py` | TODO 1: carga JSONL por lotes con `insert_many(..., ordered=False)`. TODO 2: índices compuestos para consultas de eventos y órdenes. |
| `comprar.py` | TODO 3: descuento atómico de entradas mediante `update_one` con `$elemMatch`, control de disponibilidad e idempotencia por identificador de orden. |
| `bench_write_concern.py` | TODO 4: medición de latencia por inserción con distintas garantías de escritura. |
| `verificar_rpo.py` | TODO 5: comparación de operaciones confirmadas, operaciones con error y documentos presentes para determinar pérdidas. |

La lógica de compra opera sobre documentos de `eventos` y `ordenes` sin una transacción multidocumento; las limitaciones de ese diseño se discuten en el informe.

## Ejecución y verificación

Desde la raíz del repositorio, con los contenedores del conjunto activos y configurados, se pueden ejecutar las siguientes comprobaciones:

**Verificación del Replica Set:**

```cmd
docker compose --profile lab3 run --rm --no-deps app python3 labs/lab3-mongo-replicas/verify_replica.py
```

**Prueba de compras concurrentes:**

```cmd
docker compose --profile lab3 run --rm --no-deps app python3 labs/lab3-mongo-replicas/comprar.py
```

**Pruebas sintéticas del RPO:**

```cmd
docker compose --profile lab3 run --rm --no-deps app python3 labs/lab3-mongo-replicas/verificar_rpo.py --autotest
```

**Comprobación de una corrida de escritura ya registrada:**

```cmd
docker compose --profile lab3 run --rm --no-deps app python3 labs/lab3-mongo-replicas/verificar_rpo.py --csv evidence/falla-c.csv
```

Las fallas fueron realizadas manualmente y con comandos de control sobre los contenedores. No se deben repetir las detenciones solo para consultar las evidencias: los archivos originales están guardados en `evidence/`.

## Resultados principales

### Lecturas en secundarios

Se realizaron 500 observaciones por modalidad:

| Modalidad | Lecturas obsoletas | Porcentaje |
| --- | ---: | ---: |
| `w1_secundario` | 493 | 98,60 % |
| `majority_secundario` | 0 | 0,00 % |
| `causal_majority` | 0 | 0,00 % |

Estos valores corresponden a esta ejecución; en particular, el 0 % observado con `majority_secundario` no constituye una garantía general de ausencia de lecturas obsoletas.

### Garantías de escritura

Se utilizaron 30 operaciones de calentamiento y 300 muestras por variante:

| Variante | n | p50 (ms) | p95 (ms) | p99 (ms) | Operaciones/s |
| --- | ---: | ---: | ---: | ---: | ---: |
| `w1` | 300 | 0,57 | 1,32 | 2,59 | 1404 |
| `w1_journal` | 300 | 6,35 | 12,80 | 20,49 | 137 |
| `majority` | 300 | 6,71 | 11,50 | 30,84 | 127 |
| `w3` | 300 | 1,36 | 1,90 | 3,59 | 680 |

La comparación depende del entorno de ejecución; todos los nodos se alojaron en una sola computadora, por lo que estos resultados no representan una configuración distribuida entre centros de datos.

### Pruebas de fallas

| Escenario | Intentos | Confirmadas | Errores | Confirmadas perdidas (RPO) | Recuperación observada |
| --- | ---: | ---: | ---: | ---: | --- |
| A: detener un secundario | 80 | 80 | 0 | 0 | No hubo interrupción de confirmaciones |
| B: detener el primario | 101 | 98 | 3 | 0 | 10,327 s |
| C: detener dos secundarios | 108 | 94 | 14 | 0 | 42,760 s |

Los tiempos de las fallas B y C se midieron entre la señal de caída y la primera escritura confirmada posteriormente. En la falla C, **cinco operaciones que devolvieron error sí quedaron almacenadas**; otras nueve no aparecieron en la base al verificarla. Un error de confirmación no equivale necesariamente a una escritura descartada.

## Evidencias

La carpeta `evidence/` incluye los comandos, registros y archivos CSV utilizados para respaldar los resultados:

```text
evidence/
├── comandos.md
├── cluster-start.txt
├── rs-inspect.txt
├── datos-manifest.txt
├── config-check.txt
├── explain-indices.txt
├── oplog.txt
├── lectura-secundario.txt
├── lectura-secundario.csv
├── comprar.txt
├── comprar-incorrecto.txt
├── write-concern.txt
├── write-concern.csv
├── rpo-baseline.txt
├── rpo-baseline.csv
├── falla-a* 
├── falla-b*
└── falla-c*
```

`comandos.md` registra el procedimiento paso a paso; los archivos `falla-*` contienen el estado inicial, las marcas temporales, los resultados de la sonda, el estado durante la falla, la recuperación y la verificación del RPO.

## Entrega

El análisis completo, las predicciones, las decisiones de implementación y la relación con CAP/PACELC se desarrollan en el **informe PDF del equipo** (máximo seis páginas), de acuerdo con la guía del laboratorio. El repositorio conserva el código y las evidencias crudas para permitir su revisión.
