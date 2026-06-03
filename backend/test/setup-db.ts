import { PrismaClient } from '@prisma/client'

// Delete order matters because of foreign keys.
export async function resetDatabase(prisma: PrismaClient): Promise<void> {
  await prisma.activity.deleteMany()
  await prisma.card.deleteMany()
  await prisma.column.deleteMany()
  await prisma.board.deleteMany()
  await prisma.membership.deleteMany()
  await prisma.workspace.deleteMany()
  await prisma.refreshToken.deleteMany()
  await prisma.user.deleteMany()
}
