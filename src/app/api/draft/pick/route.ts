import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getSnakeOrder(draftOrder: string[], round: number): string[] {
  const order = [...draftOrder];
  if (round % 2 === 0) {
    order.reverse();
  }
  return order;
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { draftId, golferId } = await request.json();

    if (!draftId || !golferId) {
      return NextResponse.json(
        { error: 'draftId and golferId are required' },
        { status: 400 }
      );
    }

    const draft = await prisma.draft.findUnique({
      where: { id: draftId },
      include: {
        picks: true,
        tournament: {
          include: { field: true },
        },
        league: {
          include: { members: true },
        },
      },
    });

    if (!draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    if (draft.status !== 'active') {
      return NextResponse.json(
        { error: 'Draft is not active' },
        { status: 400 }
      );
    }

    const draftOrder: string[] = JSON.parse(draft.draftOrder);
    const roundOrder = getSnakeOrder(draftOrder, draft.currentRound);
    const indexInRound = draft.currentPickIndex % 4;
    const expectedUserId = roundOrder[indexInRound];

    if (user.id !== expectedUserId) {
      return NextResponse.json(
        { error: 'It is not your turn to pick' },
        { status: 403 }
      );
    }

    // Verify golfer is in the tournament field
    const inField = draft.tournament.field.some((f) => f.golferId === golferId);
    if (!inField) {
      return NextResponse.json(
        { error: 'Golfer is not in the tournament field' },
        { status: 400 }
      );
    }

    // Verify golfer hasn't been drafted
    const alreadyDrafted = draft.picks.some((p) => p.golferId === golferId);
    if (alreadyDrafted) {
      return NextResponse.json(
        { error: 'Golfer has already been drafted' },
        { status: 400 }
      );
    }

    const pickNumber = draft.picks.length + 1;
    const currentRound = draft.currentRound;

    // Calculate next state
    const newPickIndex = draft.currentPickIndex + 1;
    const isRoundComplete = newPickIndex % 4 === 0;
    const isLastPick = pickNumber === 28;

    let nextRound = currentRound;
    let nextPickIndex = newPickIndex;
    let nextStatus = 'active';

    if (isLastPick) {
      nextStatus = 'complete';
    } else if (isRoundComplete) {
      nextRound = currentRound + 1;
      nextPickIndex = newPickIndex; // keeps incrementing overall
    }

    // Create pick and update draft in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const pick = await tx.draftPick.create({
        data: {
          draftId: draft.id,
          userId: user.id,
          golferId,
          round: currentRound,
          pickNumber,
        },
      });

      const updatedDraft = await tx.draft.update({
        where: { id: draft.id },
        data: {
          currentRound: nextRound,
          currentPickIndex: nextPickIndex,
          status: nextStatus,
        },
      });

      // If draft is complete, create Pick records for the rest of the app
      if (nextStatus === 'complete') {
        const allPicks = await tx.draftPick.findMany({
          where: { draftId: draft.id },
          orderBy: { pickNumber: 'asc' },
        });

        // Include the pick we just created
        const allPicksWithCurrent = [...allPicks];
        if (!allPicksWithCurrent.find((p) => p.id === pick.id)) {
          allPicksWithCurrent.push(pick);
        }

        // Group by userId
        const picksByUser: Record<string, typeof allPicksWithCurrent> = {};
        for (const p of allPicksWithCurrent) {
          if (!picksByUser[p.userId]) picksByUser[p.userId] = [];
          picksByUser[p.userId].push(p);
        }

        // Delete any existing picks for this league+tournament
        await tx.pick.deleteMany({
          where: {
            leagueId: draft.leagueId,
            tournamentId: draft.tournamentId,
          },
        });

        // Create Pick records
        for (const [userId, userPicks] of Object.entries(picksByUser)) {
          for (let i = 0; i < userPicks.length; i++) {
            await tx.pick.create({
              data: {
                leagueId: draft.leagueId,
                userId,
                tournamentId: draft.tournamentId,
                golferId: userPicks[i].golferId,
                pickOrder: i + 1,
              },
            });
          }
        }
      }

      return { pick, updatedDraft };
    });

    return NextResponse.json({
      pick: result.pick,
      draft: {
        status: result.updatedDraft.status,
        currentRound: result.updatedDraft.currentRound,
        currentPickIndex: result.updatedDraft.currentPickIndex,
      },
    });
  } catch (error) {
    console.error('Error making draft pick:', error);
    return NextResponse.json({ error: 'Failed to make pick' }, { status: 500 });
  }
}
