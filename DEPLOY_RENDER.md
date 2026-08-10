# Deploy a Render (capa gratuita)

El proyecto está listo para desplegarse en **Render** con un blueprint que crea la API (Docker) y la base de datos PostgreSQL juntas. Se usa la capa gratuita de ambos servicios.

## Limites de la capa free

- **Web service:** se "duerme" tras 15 minutos sin tráfico y se despierta al recibir una petición (la primera respuesta puede tardar ~30s). 750 horas/mes.
- **PostgreSQL:** 1 GB gratis por 90 días. Pasado ese plazo la instancia se suspende salvo que la subas a un plan pago (~USD 7/mes). Puedes exportar datos y migrar de base sin tocar la API.

## 1. Requisitos

- Repositorio subido a GitHub (`main` con el código listo).
- Cuenta en [render.com](https://render.com) (usa el botón "New +" > Blueprint, o conecta el repo).

## 2. Deploy con el blueprint

1. En Render: **New +** > **Blueprint**.
2. Conecta tu cuenta de GitHub y selecciona el repo `ScoreCredit`.
3. Render detecta `render.yaml`. En la pantalla de configuración:
   - `JWT_SECRET`: pon una clave aleatoria de 32+ caracteres (ej. `openssl rand -hex 32`).
   - `OPENAI_API_KEY`: déjala vacía para usar el mock, o pon tu key real.
4. **Apply** y espera el build. En los logs debes ver `prisma migrate deploy` seguido de `BodegaScore AI listening`.

El blueprint crea:
- `bodegascore-db`: PostgreSQL 16 (la API conecta por la URL interna).
- `bodegascore-api`: web service Docker en `http://localhost:3000` interno, público en `https://bodegascore-api.onrender.com`.

## 3. Seed inicial (crear el admin)

El deploy NO crea el admin automáticamente (por seguridad). Una vez que la API esté live:

1. En Render abre la base `bodegascore-db` > **Info**, y copia la **External Database URL**.
2. Desde tu máquina local:

```bash
DATABASE_URL="<External Database URL de Render>" \
SEED_ADMIN_EMAIL="admin@bodegascore.ai" \
SEED_ADMIN_PASSWORD="<contraseña fuerte>" \
npm run prisma:seed
```

> El seed es idempotente: no duplica datos si ya existen. Los valores por defecto son `admin@bodegascore.ai` / `Admin123!` (solo para desarrollo local).

3. Verifica con el login:

```bash
curl -X POST https://bodegascore-api.onrender.com/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@bodegascore.ai","password":"<contraseña fuerte>"}'
```

## 4. Cambios posteriores

- **Nuevo código:** haz push a `main` y Render auto-deployea (aplica migraciones pendientes en el arranque).
- **Cambiar credenciales:** en el dashboard de la API, **Environment** > editar `JWT_SECRET`/`OPENAI_API_KEY` > **Save** (reinicia el servicio).
- **Resetear la base:** *bodegascore-db* > **Settings** > *Reset database*.

## Endpoints (production)

| Ruta | Uso |
|------|-----|
| `GET /healthz` | Healthcheck público |
| `POST /api/v1/auth/login` | Login admin → JWT |
| `POST /api/v1/merchants` | Registro de comerciante (público) |
| `POST /api/v1/credit-applications` | Crea y evalúa solicitud (JWT) |
| `GET /api/v1/credit-applications/:id` | Consulta solicitud (JWT) |
| `GET /api/v1/credit-applications` | Listado (JWT) |
