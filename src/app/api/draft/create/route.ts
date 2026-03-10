import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { leagueId, tournamentId } = await request.json();

    if (!leagueId || !tournamentId) {
      return NextResponse.json(
        { error: 'leagueId and tournamentId are required' },
        { status: 400 }
      );
    }

    // Verify league exists and get members
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: { members: true },
    });

    if (!league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 });
    }

    if (league.members.length !== 4) {
      return NextResponse.json(
        { error: 'League must have exactly 4 members for a draft' },
        { status: 400 }
      );
    }

    // Verify tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    // Check for existing draft
    const existing = await prisma.draft.findUnique({
      where: { leagueId_tournamentId: { leagueId, tournamentId } },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A draft already exists for this league and tournament' },
        { status: 409 }
      );
    }

    // Randomize order
    const userIds = league.members.map((m) => m.userId);
    const shuffled = userIds.sort(() => Math.random() - 0.5);

    const draft = await prisma.draft.create({
      data: {
        leagueId,
        tournamentId,
        status: 'active',
        currentRound: 1,
        currentPickIndex: 0,
        draftOrder: JSON.stringify(shuffled),
      },
    });

    return NextResponse.json({ draft }, { status: 201 });
  } catch (error) {
    console.error('Error creating draft:', error);
    return NextResponse.json({ error: 'Failed to create draft' }, { status: 500 });
  }
}
