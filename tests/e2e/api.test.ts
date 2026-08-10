import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../../src/infrastructure/http/app.js'
import { prisma } from '../../src/infrastructure/persistence/prisma/prisma-client.js'
import { PasswordService } from '../../src/infrastructure/auth/password.service.js'

const app = createApp()

const adminEmail = 'admin@bodegascore.ai'
const adminPassword = 'Admin123!'
const phonePrefix = `+519${Date.now().toString().slice(-7)}`

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

afterAll(async () => {
  await prisma.creditApplication.deleteMany({
    where: { merchant: { is: { phone: { startsWith: phonePrefix } } } },
  })
  await prisma.merchant.deleteMany({ where: { phone: { startsWith: phonePrefix } } })
  await prisma.$disconnect()
})
