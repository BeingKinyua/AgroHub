import { GoogleGenAI } from '@google/genai';
import { InternalUser, RoleDefinition } from '@/types/domain/bos';
import { hasPermission } from '@/lib/permissions/rbac';

export interface OperationalDigestInput {
  user: InternalUser;
  roles: RoleDefinition[];
  openOrdersCount: number;
  expiringBatchesCount: number;
  pendingApprovalsCount: number;
  overdueReceivablesKes: number;
  upcomingPayablesKes: number;
}

export async function generateRoleAwareOperationalBrief(
  input: OperationalDigestInput
): Promise<{
  headline: string;
  priorities: string[];
  riskAlert: string;
}> {
  const { user, roles } = input;
  const canSeeFinance = hasPermission(user, 'finance.view', roles);
  const canSeeInventory = hasPermission(user, 'inventory.view', roles);
  const canSeeApprovals = hasPermission(user, 'approvals.view', roles);

  // Build RBAC-filtered operational summary so AI never accesses or reveals unauthorized records
  const authorizedFacts: string[] = [
    `Active Operator: ${user.fullName} (${user.roleName})`,
    `Open Institutional & Retail Orders in Pipeline: ${input.openOrdersCount}`,
  ];
  if (canSeeInventory) {
    authorizedFacts.push(
      `FEFO Perishable Batches Nearing Expiry (<72h): ${input.expiringBatchesCount}`
    );
  }
  if (canSeeApprovals) {
    authorizedFacts.push(
      `Pending Governance Approvals in Inbox: ${input.pendingApprovalsCount}`
    );
  }
  if (canSeeFinance) {
    authorizedFacts.push(
      `Overdue Institutional Accounts Receivable: KES ${input.overdueReceivablesKes.toLocaleString()}`,
      `Supplier Accounts Payable Due: KES ${input.upcomingPayablesKes.toLocaleString()}`
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are the internal operational intelligence layer for Agro-Deliveries Kenya BOS.
Summarize immediate operational priorities in a calm, concise tone strictly using only these RBAC-authorized facts:
${authorizedFacts.join('\n')}
Return JSON with keys: headline (string), priorities (array of 3 concise strings), riskAlert (string).`,
        config: {
          responseMimeType: 'application/json',
        },
      });
      if (response.text) {
        const parsed = JSON.parse(response.text);
        if (parsed.headline && Array.isArray(parsed.priorities)) {
          return parsed;
        }
      }
    } catch {
      // Fallback to deterministic RBAC-safe brief
    }
  }

  const priorities: string[] = [];
  if (canSeeInventory) {
    priorities.push(
      `Prioritize FEFO dispatch for ${input.expiringBatchesCount} perishable cold-hub batches expiring within 72 hours (LOT-2609-SKM-C1 & LOT-2609-TOM-A1).`
    );
  }
  if (canSeeApprovals && input.pendingApprovalsCount > 0) {
    priorities.push(
      `Review ${input.pendingApprovalsCount} pending governance requests in the Approval Center to unblock Mwea rice replenishment and school boarding dispatch.`
    );
  }
  if (canSeeFinance) {
    priorities.push(
      `Follow up on KES ${input.overdueReceivablesKes.toLocaleString()} overdue institutional receivables while scheduling KES ${input.upcomingPayablesKes.toLocaleString()} cooperative payables.`
    );
  }
  if (priorities.length < 3) {
    priorities.push(
      `Coordinate ${input.openOrdersCount} active institutional orders across Nairobi Cold Hub A, Embakasi Dry Bulk B, and Westlands Cross-Dock C.`
    );
  }

  return {
    headline: `${user.roleName} Shift Brief · Nairobi Central Hub`,
    priorities: priorities.slice(0, 3),
    riskAlert: canSeeInventory
      ? 'Cold Chain Alert: Allocate LOT-2609-TOM-A1 (420 kg remaining) to tomorrow’s hospital & hotel orders before LOT-2609-TOM-A2.'
      : 'Ensure all dispatched institutional runs have signed electronic Proof of Delivery (POD) before shift close.',
  };
}
