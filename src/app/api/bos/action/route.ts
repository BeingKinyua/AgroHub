import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_ROLES, hasPermission } from '@/lib/permissions/rbac';
import { INITIAL_USERS } from '@/lib/services/initial-data';
import { PermissionKey } from '@/types/domain/bos';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { actorEmail, requiredPermission, actionName, payload } = body as {
      actorEmail: string;
      requiredPermission?: PermissionKey;
      actionName: string;
      payload?: Record<string, unknown>;
    };

    const actor = INITIAL_USERS.find(
      (u) => u.email.toLowerCase() === (actorEmail || '').toLowerCase()
    );

    if (!actor) {
      return NextResponse.json(
        { error: 'Unauthorized: Internal operator session not recognized.' },
        { status: 401 }
      );
    }

    if (actor.status !== 'Active') {
      return NextResponse.json(
        {
          error: `Account Restricted: Operator status is ${actor.status}. Contact System Administrator.`,
        },
        { status: 403 }
      );
    }

    if (
      requiredPermission &&
      !hasPermission(actor, requiredPermission, DEFAULT_ROLES)
    ) {
      return NextResponse.json(
        {
          error: `RBAC Authorization Denied: Missing required permission '${requiredPermission}' for action '${actionName}'.`,
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      ok: true,
      verifiedAt: new Date().toISOString(),
      actor: {
        id: actor.id,
        fullName: actor.fullName,
        roleName: actor.roleName,
        email: actor.email,
      },
      actionName,
      payload,
    });
  } catch {
    return NextResponse.json(
      { error: 'Invalid server action request payload.' },
      { status: 400 }
    );
  }
}
