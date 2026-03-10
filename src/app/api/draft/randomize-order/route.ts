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

    const { draftId } = await request.json();

    if (!draftId) {
      return NextResponse.json(
        { error: 'draftId is required' },
        { status: 400 }
      );
    }

    const draft = await prisma.draft.findUnique({
      where: { id: draftId },
      include: {
        picks: true,
        league: { include: { members: true } },
      },
    });

    if (!draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    if (draft.picks.length > 0) {
      return NextResponse.json(
        { error: 'Cannot randomize order after picks have been made' },
        { status: 400 }
      );
    }

    const userIds = draft.league.members.map((m) => m.userId);
    const shuffled = userIds.sort(() => Math.random() - 0.5);

    const updated = await prisma.draft.update({
      where: { id: draftId },
      data: { draftOrder: JSON.stringify(shuffled) },
    });

    return NextResponse.json({
      draft: {
        id: updated.id,
        draftOrder: JSON.parse(updated.draftOrder),
      },
    });
  } catch (error) {
    console.error('Error randomizing draft order:', error);
    return NextResponse.json(
      { error: 'Failed to randomize order' },
      { status: 500 }
    );
  }
}
