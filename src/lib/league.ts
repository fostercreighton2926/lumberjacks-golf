import { prisma } from '@/lib/prisma';

/**
 * Get the single league (Lumberjacks). This app only has one league.
 */
export async function getTheLeague() {
  const league = await prisma.league.findFirst();
  return league;
}
