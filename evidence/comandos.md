# Registro de comandos — Laboratorio 3

## Paso 0 — Preparación

Fecha y hora: 10/31/226 8:17
Comandos:
- docker ps
- docker compose build app

Resultados:
- Docker funcionando correctamente.
- No había contenedores ejecutándose.
- Imagen ti4601:local construida.
- PyMongo 4.19.0 instalado.

Estado: OK

## Paso 1 — Levantar los nodos MongoDB

Comando:
- docker compose --profile lab3 up -d --build mongo-1 mongo-2 mongo-3

Verificaciones:
- Los tres contenedores aparecen como Up (healthy).
- Los tres utilizan MongoDB 8.0.
- rs.status() indica que todavía no existe configuración
  del conjunto de réplicas.

Estado: OK

## Paso 2 - Inicialización del Replica Set

- Se inicializó el conjunto de réplicas `rs-lab3`.
- Se eligió `mongo-1` como PRIMARY.
- `mongo-2` y `mongo-3` quedaron como SECONDARY.
- Los tres miembros reportan health: 1.
- La mayoría de votos y escrituras es de 2 miembros.
- Resultado: inicialización exitosa.
- Evidencia: replica-status.txt

Estado: OK