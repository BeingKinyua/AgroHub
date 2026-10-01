import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_ROLES } from '@/lib/permissions/rbac';
import { INITIAL_USERS } from '@/lib/services/initial-data';
import { generateRoleAwareOperationalBrief } from '@/lib/ai/operational-intelligence';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      openOrdersCount = 4,
      expiringBatchesCount = 2,
      pendingApprovalsCount = 2,
      overdueReceivablesKes = 295000,
      upcomingPayablesKes = 2010500,
    } = body;

    const user =
      INITIAL_USERS.find((u) => u.id === userId) || INITIAL_USERS[0];

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
