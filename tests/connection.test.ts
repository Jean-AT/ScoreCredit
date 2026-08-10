import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '../src/infrastructure/persistence/prisma/prisma-client.js'

describe('Database connection', () => {
  beforeAll(async () => {
    await prisma.$connect()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('can run a query against the database', async () => {
    const result = await prisma.$queryRawUnsafe<Array<{ now: Date }>>('SELECT NOW() as now')
    expect(result[0]?.now).toBeDefined()
  })

  it('has the expected tables', async () => {
    const tables = await prisma.$queryRawUnsafe<Array<{ tablename: string }>>(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public'",
    )
    const names = tables.map((t) => t.tablename)
    expect(names).toEqual(
      expect.arrayContaining(['Merchant', 'CreditApplication', 'User', '_prisma_migrations']),
    )
  })
})
