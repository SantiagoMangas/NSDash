# Contraseña inicial del administrador

## Railway (producción)

1. En el servicio **backend** de Railway, agregá variables de entorno:
   - `SECRET_KEY` = secreto largo aleatorio (obligatorio; sin esto el servicio **no arranca**)
   - `ADMIN_INITIAL_PASSWORD` = una clave segura de **al menos 8 caracteres** (solo DB vacía)
2. Esa variable solo se usa cuando la tabla `users` está **vacía** (primer deploy con DB nueva). Crea `admin@ns.com` con ese valor.
3. Si la base ya tiene usuarios, **no** se resetea la contraseña en cada deploy.

## Cambiar la contraseña del admin después

1. Entrá a https://ns-dash.vercel.app con `admin@ns.com`.
2. Andá a **Mi perfil** (avatar en la barra superior).
3. Usá **Cambiar contraseña** (contraseña actual + nueva, mín. 8 caracteres).

Alternativa en servidor (SQLite en Railway): ejecutá localmente `python reset_admin_password.py` apuntando a una copia de la DB, o usá el panel de perfil.

## Desarrollo local

Copiá `backend/.env.example` a `backend/.env` (no commitear) y definí:

```
ADMIN_INITIAL_PASSWORD=tu-clave-local-min-8
SECRET_KEY=dev-secret-local
```

Si tu DB local ya existía con la contraseña antigua `1234`, actualizala desde **Perfil** o con `python reset_admin_password.py`.
