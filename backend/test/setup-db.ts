import { PrismaClient } from '@prisma/client'

/**
 * Wipe all tables between tests so each spec starts from a clean slate.
 * The order matters because of foreign keys: cards before columns before boards,
 * memberships before workspaces, refresh tokens before users.
 */
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
