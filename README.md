# BodegaScore AI

Motor de scoring crediticio orientado a bodegas y comercios de barrio. Evalúa solicitudes de crédito mediante modelos de IA, asigna un puntaje de riesgo (0–100) y produce una decisión operativa (APPROVED/REJECTED) junto con el monto aprobado y una justificación en lenguaje natural.

## Resumen ejecutivo

```
[Cliente] → POST /merchants (registro público) → POST /auth/login (admin, emite JWT) → POST /credit-applications (auth, dispara la evaluación)
│
▼
Caso de uso: EvaluateCreditApplicationUseCase
│
├─ 1. Crea la solicitud en estado PENDING
├─ 2. Invoca el motor de scoring (IA o mock)
├─ 3. Aplica las reglas de negocio del dominio
│      (clamp de score, umbral, monto aprobado)
└─ 4. Persiste el resultado y lo devuelve

[Cliente] → GET /credit-applications/:id (consultar estado) → GET /credit-applications (listado para admin)
```

## Reglas de negocio (capa de dominio)

- `score` es un entero en `[0, 100]`. Valores fuera de rango se clampan (se ajustan al rango válido).
- Umbral de aceptación: `score >= 60` → `APPROVED`; en caso contrario → `REJECTED`. La decisión final la determina siempre la lógica del dominio, incluso si la IA devuelve un `status` distinto.
- `approvedAmount` se acota a `[0, requestedAmount]`. Si la IA sugiere `0` o un valor inválido en una aprobación, se utiliza un valor derivado por defecto: `requestedAmount * score / 100`.
- `reasoning` se trunca a 2000 caracteres.
- `requestedAmount` debe ser positivo.
- Un comerciante no puede registrar teléfonos duplicados.

## Tecnologías

| Capa | Tecnología |
|------|------------|
| Runtime | Node.js 20 + TypeScript (`strict: true`) |
| Framework HTTP | Express 4 |
| Base de datos | PostgreSQL 16 + Prisma ORM |
| Validación | Zod (variables de entorno, entradas HTTP y salida de la IA) |
| IA | SDK oficial de OpenAI (Structured Outputs) |
| Auth | JWT (`jsonwebtoken`) + `bcryptjs` |
| Seguridad | Helmet + express-rate-limit |
| Tests | Vitest + Supertest |
| Calidad | ESLint + Prettier + `npm audit` |
| Contenedores | Docker / Docker Compose (multi-stage, usuario no-root) |

## Arquitectura

Monolito modular implementando Clean Architecture. El código está organizado por capas y módulos de dominio para aislar decisiones técnicas volátiles (framework HTTP, ORM, servicio de IA).

Estructura principal:

```
src/
├── config/                 # env.ts: variables de entorno validadas con zod
├── domain/                 # Entidades + contratos (sin dependencias externas)
│   ├── entities/           #   merchant, credit-application (reglas de negocio)
│   └── repositories/       #   interfaces de repositorios
├── application/            # Casos de uso + contratos de servicios
│   ├── services/           #   IAIScoringService, ITokenService, IPasswordService
│   └── use-cases/          #   register-merchant, evaluate-credit, login, consultas
├── infrastructure/         # Implementaciones concretas
│   ├── ai/                 #   OpenAIScoringService, MockScoringService, schema de salida
│   ├── auth/               #   JwtTokenService, PasswordService
│   ├── http/               #   controllers, middlewares, validators, rutas
│   └── persistence/prisma/ #   repositorios Prisma
└── shared/                 # Errores tipados
```

Por qué Clean Architecture:
- Testabilidad: IA y repositorios se inyectan como contratos y pueden reemplazarse por mocks en pruebas.
- Independencia de la IA: `OpenAIScoringService` y `MockScoringService` comparten la misma interfaz; sin `OPENAI_API_KEY` la API funciona con el mock.
- Evolución: cambiar Express o Prisma impacta solo `infrastructure/`.
- Seguridad por diseño: la sanitización y las reglas de negocio residen en el dominio.

## Cómo se usa la IA

Flujo:

1. `EvaluateCreditApplicationUseCase` obtiene el comerciante y serializa su ficha:

```json
{
  "name": "Bodega Don José",
  "phone": "+51999000111",
  "businessType": "ABARROTES",
  "monthlyRevenue": 25000,
  "yearsInBusiness": 6
}
```

Nota: actualmente el "historial" es un snapshot del comerciante (ingresos, antigüedad, rubro). Es el punto natural para extender con historial de pagos externos o buró.

2. `OpenAIScoringService` llama a `chat.completions.create` con:

- `temperature: 0` (determinismo).
- Structured Outputs (`response_format: json_schema`) usando un JSON Schema estricto (`additionalProperties: false`), que obliga a devolver:

```json
{
  "score": 78,
  "status": "APPROVED",
  "approvedAmount": 5000,
  "reasoning": "Bodega con 6 años de operación e ingresos estables. Riesgo bajo.",
  "riskFlags": []
}
```

La salida se valida con Zod (`aiEvaluationSchema`) antes de persistir cualquier dato en la base.

### Prompt y mitigación de prompt injection

- Se separan estrictamente las instrucciones (system prompt) de los datos (user message).
- El system prompt contiene solo las reglas de evaluación; los datos del comerciante se pasan como JSON marcado como untrusted data.
- Los campos de texto libre se truncan a 500 caracteres.
- El prompt instruye al modelo a tratar todos los campos como datos y a ignorar cualquier contenido que intente alterar su comportamiento o schema.

Esto evita inyección de instrucciones desde campos de usuario (por ejemplo, un nombre que intente anular las reglas).

### Umbrales y saneamiento

- Umbral de aprobación: `APPROVAL_SCORE_THRESHOLD = 60`.
- El `status` devuelto por la IA es solo advisory; la decisión se recalcula en el dominio según el score.
- El score se clampa a `[0, 100]`, `approvedAmount` a `[0, requestedAmount]` y `reasoning` se trunca según lo indicado.

### Modo mock (sin OpenAI)

Si no hay `OPENAI_API_KEY`, se utiliza `MockScoringService` con una fórmula determinista:

| Regla | Puntos |
|-------|--------|
| Base | 40 |
| ≥ 3 años de operación | +10 |
| ≥ 5 años de operación | +5 |
| Ingresos ≥ $15 000/mes | +10 |
| Ingresos ≥ $5 000/mes | +5 |
| Rubro `ABARROTES` o `MINIMARKET` | +5 |

Regla operativa: `score >= 60` → aprueba con `monthlyRevenue * 0.5`; si no, rechaza. Ideal para desarrollo y pruebas automatizadas.

## Cómo ejecutar localmente

Requisitos:

- Node.js 20+
- Docker + Docker Compose (para la base de datos; opcional si ya dispone de PostgreSQL 16)

Configuración del entorno:

```bash
cp .env.example .env
```

Editar `.env` al menos con:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/bodegascore?schema=public
JWT_SECRET=<una clave aleatoria de 32+ caracteres>
OPENAI_API_KEY=<tu key de OpenAI>   # opcional: sin ella usa el mock determinista
```

Levantar la base de datos:

```bash
docker compose up -d db        # PostgreSQL en el puerto 5433
```

Instalar dependencias y preparar la BD:

```bash
npm install
npx prisma migrate dev          # aplica las migraciones
npm run prisma:seed             # crea admin y 3 bodegas demo
```

El seed crea `admin@bodegascore.ai` / `Admin123!`

Ejecutar la API:

```bash
npm run dev
```

La API estará disponible en `http://localhost:3000`. Comprobar `GET http://localhost:3000/healthz`.

Opción Docker (sin Node local):

```bash
docker compose up -d --build    # construye y levanta api + db
```

La API aplica las migraciones automáticamente al arrancar.

### Ejemplo de uso rápido

```bash
# 1. Registrar un comerciante (público)
curl -X POST http://localhost:3000/api/v1/merchants \
  -H 'Content-Type: application/json' \
  -d '{"name":"Bodega Demo","phone":"+51999111222","businessType":"ABARROTES","monthlyRevenue":20000,"yearsInBusiness":4}'

# 2. Obtener token de admin
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@bodegascore.ai","password":"Admin123!"}'

# 3. Evaluar una solicitud de crédito (con el token del paso 2)
curl -X POST http://localhost:3000/api/v1/credit-applications \
  -H 'Authorization: Bearer <TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{"merchantId":"<MERCHANT_ID>","requestedAmount":5000}'
```

## Endpoints

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/healthz` | — | Healthcheck (ping a la BD) |
| `POST` | `/api/v1/auth/login` | — | Login de admin, devuelve JWT |
| `POST` | `/api/v1/merchants` | — | Registro de comerciante |
| `POST` | `/api/v1/credit-applications` | Admin | Crea y evalúa una solicitud |
| `GET` | `/api/v1/credit-applications/:id` | Admin | Consulta una solicitud |
| `GET` | `/api/v1/credit-applications` | Admin | Lista solicitudes (soporta `?status=APPROVED`) |

## Calidad y pruebas

Comandos útiles:

```bash
npm run typecheck    # TypeScript estricto
npm run lint         # ESLint
npm run format:check # Prettier
npm test             # 44 tests (unit + integración E2E)
npm audit            # dependencias sin vulnerabilidades conocidas
```

Scripts disponibles:

```bash
npm run dev             # servidor en modo watch
npm run build           # compila a dist/
npm start               # corre el build de producción
npm run prisma:seed     # seed (admin + bodegas demo)
npm run prisma:migrate  # nueva migración (dev)
npm run prisma:deploy   # aplica migraciones pendientes
```
