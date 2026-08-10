import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main(): Promise<void> {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@bodegascore.ai'
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!'
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } })
  if (!existing) {
    const passwordHash = await bcrypt.hash(adminPassword, 12)
    await prisma.user.create({
      data: { email: adminEmail, passwordHash, role: 'ADMIN' },
    })
    console.log(`Seeded admin user: ${adminEmail}`)
  }

  const merchants = [
    {
      name: 'Bodega Don José',
      phone: '+51999000111',
      businessType: 'ABARROTES',
      monthlyRevenue: 25000,
      yearsInBusiness: 6,
    },
    {
      name: 'Bodega La Esquina',
      phone: '+51999000222',
      businessType: 'MINIMARKET',
      monthlyRevenue: 8000,
      yearsInBusiness: 2,
    },
    {
      name: 'Bodega Santa Rosa',
      phone: '+51999000333',
      businessType: 'ABARROTES',
      monthlyRevenue: 45000,
      yearsInBusiness: 9,
    },
  ]
  for (const m of merchants) {
    const existingMerchant = await prisma.merchant.findUnique({ where: { phone: m.phone } })
    if (!existingMerchant) {
      await prisma.merchant.create({ data: m })
    }
  }
  console.log(`Seeded ${merchants.length} demo merchants`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
