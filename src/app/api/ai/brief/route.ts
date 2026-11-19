import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_ROLES } from '@/lib/permissions/rbac';
import { INITIAL_USERS } from '@/lib/services/initial-data';
import { generateRoleAwareOperationalBrief } from '@/lib/ai/operational-intelligence';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      openOrdersCount = 0,
      expiringBatchesCount = 0,
      pendingApprovalsCount = 0,
      overdueReceivablesKes = 0,
      upcomingPayablesKes = 0,
    } = body;

    const user = INITIAL_USERS.find((u) => u.id === userId);
    if (!user) return NextResponse.json({ error: 'Unknown operator.' }, { status: 400 });

    const brief = await generateRoleAwareOperationalBrief({
      user,
      roles: DEFAULT_ROLES,
      openOrdersCount,
      expiringBatchesCount,
      pendingApprovalsCount,
      overdueReceivablesKes,
      upcomingPayablesKes,
    });

    return NextResponse.json(brief);
  } catch {
    return NextResponse.json(
      { error: 'Unable to generate operational brief.' },
      { status: 500 }
    );
  }
}
