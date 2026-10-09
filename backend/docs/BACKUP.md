# Backup SQLite (local y Railway)

## Automático al arrancar el API (recomendado en Railway)

En cada arranque, **antes de las migraciones**, el backend copia la base existente a un archivo con timestamp en el mismo directorio que `DATABASE_PATH` (el volumen persistente en Railway), por ejemplo `/data/database-20261008-213045.db`.

- Conserva solo los **últimos 5** archivos `database-YYYYMMDD-HHMMSS.db` (configurable con `SQLITE_BACKUP_RETENTION`).
- Si el backup falla, se registra en logs y **el servicio sigue arrancando**.
- No hace falta correr un comando manual antes de cada deploy: el primer request tras el deploy ya pasó por ese backup (si la DB ya existía).

Variables:

| Variable | Uso |
|----------|-----|
| `DATABASE_PATH` | Ruta del `.db` activo (ej. `/data/database.db` en Railway). |
| `SQLITE_BACKUP_DIR` | Opcional. Carpeta de copias; por defecto, el directorio de `DATABASE_PATH`. |
| `SQLITE_BACKUP_RETENTION` | Opcional. Cuántos backups timestamped conservar (default `5`). |

## Script manual (`scripts/sqlite_backup.py`)

Desde `backend/`:

```bash
python scripts/sqlite_backup.py
```

Útil en local o cuando el proceso que escribe la DB es tu máquina y `DATABASE_PATH` apunta al archivo real.

## Railway CLI: `railway run` **no** escribe en el volumen del contenedor

`railway run` ejecuta el comando **en tu PC** (o CI), inyectando las **variables de entorno** del proyecto Railway. **No** corre dentro del contenedor desplegado ni monta el volume de producción.

Por eso un `railway run python scripts/sqlite_backup.py` con `DATABASE_PATH=/data/database.db` en Windows/macOS **no** copia el `.db` que usa el API en el volume: esa ruta no existe localmente (o apunta a otra cosa).

Para copias en el volume de producción:

1. Confiá en el **backup automático al startup** del servicio API (arriba).
2. O usá las herramientas de Railway para acceder al volume del servicio en ejecución (shell / file browser según tu plan y la doc actual de Railway).
3. Descargá un `database-*.db` del volume para guardarlo fuera de Railway.

## Descargar una copia

1. En el dashboard del servicio, abrí el volume asociado a `DATABASE_PATH`.
2. Buscá archivos `database-YYYYMMDD-HHMMSS.db` generados en arranques anteriores.
3. Descargá el que quieras conservar.

## Restaurar

1. Detené el servicio API (o uvicorn local).
2. Reemplazá el archivo activo por el backup:

```bash
cp /data/database-YYYYMMDD-HHMMSS.db /data/database.db
```

3. Volvé a levantar el API.
