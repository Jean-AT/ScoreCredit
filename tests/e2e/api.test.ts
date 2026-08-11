import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../../src/infrastructure/http/app.js'
import { prisma } from '../../src/infrastructure/persistence/prisma/prisma-client.js'
import { PasswordService } from '../../src/infrastructure/auth/password.service.js'

const app = createApp()

const adminEmail = 'admin@bodegascore.ai'
const adminPassword = 'Admin123!'
const phonePrefix = `+519${Date.now().toString().slice(-7)}`
const userEmailPrefix = `e2e_${Date.now().toString().slice(-7)}`

async function upsertAdmin(): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } })
  if (!existing) {
    const passwordService = new PasswordService()
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: await passwordService.hash(adminPassword),
        role: 'ADMIN',
      },
    })
  }
}

beforeAll(upsertAdmin)

async function login(): Promise<string> {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: adminEmail, password: adminPassword })
  if (res.status !== 200) {
    throw new Error(`Login failed: ${JSON.stringify(res.body)}`)
  }
  return res.body.token as string
}

describe('GET /healthz', () => {
  it('returns ok when the database is reachable', async () => {
    const res = await request(app).get('/healthz')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })
})

describe('POST /api/v1/auth/login', () => {
  it('returns a JWT for valid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password: adminPassword })
    expect(res.status).toBe(200)
    expect(res.body.token).toBeTypeOf('string')
    expect(res.body.user.email).toBe(adminEmail)
  })

  it('rejects invalid credentials with 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password: 'wrong-password' })
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('UNAUTHORIZED')
  })

  it('rejects a malformed body with 400', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'not-an-email' })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })
})

describe('POST /api/v1/merchants', () => {
  it('creates a merchant with valid data', async () => {
    const res = await request(app)
      .post('/api/v1/merchants')
      .send({
        name: 'Bodega E2E',
        phone: `${phonePrefix}01`,
        businessType: 'ABARROTES',
        monthlyRevenue: 20000,
        yearsInBusiness: 4,
      })
    expect(res.status).toBe(201)
    expect(res.body.id).toBeTypeOf('string')
    expect(res.body.name).toBe('Bodega E2E')
  })

  it('rejects invalid data with 400', async () => {
    const res = await request(app).post('/api/v1/merchants').send({
      name: 'B',
      phone: 'abc',
      businessType: 'INVALID',
      monthlyRevenue: -5,
      yearsInBusiness: -1,
    })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })
})

describe('Credit applications API', () => {
  let token: string
  let merchantId: string

  beforeAll(async () => {
    token = await login()
    const merchant = await request(app)
      .post('/api/v1/merchants')
      .send({
        name: 'Bodega E2E App',
        phone: `${phonePrefix}02`,
        businessType: 'MINIMARKET',
        monthlyRevenue: 35000,
        yearsInBusiness: 7,
      })
    merchantId = merchant.body.id as string
  })

  it('requires authentication', async () => {
    const res = await request(app)
      .post('/api/v1/credit-applications')
      .send({ merchantId, requestedAmount: 5000 })
    expect(res.status).toBe(401)
  })

  it('creates and evaluates a credit application', async () => {
    const res = await request(app)
      .post('/api/v1/credit-applications')
      .set('Authorization', `Bearer ${token}`)
      .send({ merchantId, requestedAmount: 5000 })
    expect(res.status).toBe(201)
    expect(res.body.status).toMatch(/^(APPROVED|REJECTED)$/)
    expect(res.body.score).toBeGreaterThanOrEqual(0)
    expect(res.body.score).toBeLessThanOrEqual(100)
    expect(res.body.requestedAmount).toBe(5000)
  })

  it('rejects a negative requestedAmount with 400', async () => {
    const res = await request(app)
      .post('/api/v1/credit-applications')
      .set('Authorization', `Bearer ${token}`)
      .send({ merchantId, requestedAmount: -100 })
    expect(res.status).toBe(400)
  })

  it('returns 404 for an unknown application id', async () => {
    const res = await request(app)
      .get('/api/v1/credit-applications/nonexistent-id')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(404)
  })

  it('lists applications for an authenticated admin', async () => {
    const created = await request(app)
      .post('/api/v1/credit-applications')
      .set('Authorization', `Bearer ${token}`)
      .send({ merchantId, requestedAmount: 3000 })
    const id = created.body.id as string

    const res = await request(app)
      .get('/api/v1/credit-applications')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.some((a: { id: string }) => a.id === id)).toBe(true)
  })

  it('lists applications filtered by status', async () => {
    const res = await request(app)
      .get('/api/v1/credit-applications?status=APPROVED')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    for (const application of res.body as Array<{ status: string }>) {
      expect(application.status).toBe('APPROVED')
    }
  })

  it('rejects a missing or invalid token with 401', async () => {
    const bad = await request(app)
      .get('/api/v1/credit-applications')
      .set('Authorization', 'Bearer not-a-token')
    expect(bad.status).toBe(401)
    const missing = await request(app).get('/api/v1/credit-applications')
    expect(missing.status).toBe(401)
  })
})

describe('Security hardening', () => {
  it('returns 404 JSON for unknown routes', async () => {
    const res = await request(app).get('/api/v1/does-not-exist')
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
  })

  it('hides the server technology header (helmet)', async () => {
    const res = await request(app).get('/healthz')
    expect(res.headers['x-powered-by']).toBeUndefined()
    expect(res.headers['content-security-policy']).toBeDefined()
  })
})

describe('Rate limiter', () => {
  it('blocks requests after exceeding the auth limit with 429', async () => {
    const limitedApp = createApp({
      rateLimit: { windowMs: 60_000, globalLimit: 100, authLimit: 3 },
    })

    for (let i = 0; i < 3; i++) {
      const res = await request(limitedApp)
        .post('/api/v1/auth/login')
        .send({ email: adminEmail, password: 'wrong' })
      expect(res.status).toBe(401)
    }

    const blocked = await request(limitedApp)
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password: 'wrong' })
    expect(blocked.status).toBe(429)
    expect(blocked.body.error.code).toBe('TOO_MANY_REQUESTS')
  })
})

describe('POST /api/v1/auth/register', () => {
  it('creates a MERCHANT user and returns a JWT', async () => {
    const email = `${userEmailPrefix}_1@test.com`
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email, password: 'StrongPass123' })
    expect(res.status).toBe(201)
    expect(res.body.token).toBeTypeOf('string')
    expect(res.body.user.role).toBe('MERCHANT')
    expect(res.body.user.email).toBe(email)
  })

  it('rejects a duplicate email with 400', async () => {
    const email = `${userEmailPrefix}_2@test.com`
    await request(app)
      .post('/api/v1/auth/register')
      .send({ email, password: 'StrongPass123' })
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email, password: 'OtherPass456' })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('DOMAIN_ERROR')
  })

  it('rejects a short password with 400', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: `${userEmailPrefix}_3@test.com`, password: 'short' })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })
})

describe('Merchant user flow (MERCHANT role)', () => {
  let token: string
  let otherMerchantId: string
  let myMerchantId: string

  beforeAll(async () => {
    const register = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: `${userEmailPrefix}_flow@test.com`, password: 'StrongPass123' })
    token = register.body.token as string

    const mine = await request(app)
      .post('/api/v1/merchants')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Mi Bodega',
        phone: `${phonePrefix}03`,
        businessType: 'ABARROTES',
        monthlyRevenue: 15000,
        yearsInBusiness: 5,
      })
    myMerchantId = mine.body.id as string

    const other = await request(app)
      .post('/api/v1/merchants')
      .send({
        name: 'Bodega Ajena',
        phone: `${phonePrefix}04`,
        businessType: 'BODEGA',
        monthlyRevenue: 9000,
        yearsInBusiness: 2,
      })
    otherMerchantId = other.body.id as string
  })

  it('auto-links the merchant to the registering user', async () => {
    const res = await request(app)
      .get('/api/v1/merchants/me')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.id).toBe(myMerchantId)
  })

  it('updates its own merchant data', async () => {
    const res = await request(app)
      .put('/api/v1/merchants/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ monthlyRevenue: 21000, yearsInBusiness: 6 })
    expect(res.status).toBe(200)
    expect(res.body.monthlyRevenue).toBe(21000)
    expect(res.body.yearsInBusiness).toBe(6)
  })

  it('evaluates a credit application for its own merchant', async () => {
    const res = await request(app)
      .post('/api/v1/credit-applications')
      .set('Authorization', `Bearer ${token}`)
      .send({ merchantId: myMerchantId, requestedAmount: 5000 })
    expect(res.status).toBe(201)
    expect(res.body.merchantId).toBe(myMerchantId)
    expect(res.body.status).toMatch(/^(APPROVED|REJECTED)$/)
  })

  it('is forbidden from evaluating another merchant', async () => {
    const res = await request(app)
      .post('/api/v1/credit-applications')
      .set('Authorization', `Bearer ${token}`)
      .send({ merchantId: otherMerchantId, requestedAmount: 5000 })
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  it('only lists its own applications', async () => {
    const res = await request(app)
      .get('/api/v1/credit-applications')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    for (const application of res.body as Array<{ merchantId: string }>) {
      expect(application.merchantId).toBe(myMerchantId)
    }
  })

  it('is forbidden from listing all merchants', async () => {
    const res = await request(app)
      .get('/api/v1/merchants')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(403)
  })
})

describe('Admin merchant listing', () => {
  it('lists all merchants for an admin', async () => {
    const token = await login()
    const res = await request(app)
      .get('/api/v1/merchants')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })
})

describe('CORS', () => {
  it('reflects the configured origin', async () => {
    const corsApp = createApp({ corsOrigin: 'https://example.com' })
    const res = await request(corsApp)
      .get('/healthz')
      .set('Origin', 'https://example.com')
    expect(res.status).toBe(200)
    expect(res.headers['access-control-allow-origin']).toBe('https://example.com')
  })

  it('rejects origins not allowed', async () => {
    const corsApp = createApp({ corsOrigin: 'https://example.com' })
    const res = await request(corsApp)
      .get('/healthz')
      .set('Origin', 'https://evil.com')
    expect(res.status).toBe(200)
    expect(res.headers['access-control-allow-origin']).toBeUndefined()
  })
})

afterAll(async () => {
  await prisma.creditApplication.deleteMany({
    where: { merchant: { is: { phone: { startsWith: phonePrefix } } } },
  })
  await prisma.merchant.deleteMany({ where: { phone: { startsWith: phonePrefix } } })
  await prisma.user.deleteMany({ where: { email: { startsWith: userEmailPrefix } } })
  await prisma.$disconnect()
})
