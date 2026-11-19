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
  if (canSeeInventory && input.expiringBatchesCount > 0) {
    priorities.push(
      `Review ${input.expiringBatchesCount} stock batches that are expired or nearing expiry.`
    );
  }
  if (canSeeApprovals && input.pendingApprovalsCount > 0) {
    priorities.push(
      `Review ${input.pendingApprovalsCount} pending requests in Approvals.`
    );
  }
  if (canSeeFinance && (input.overdueReceivablesKes || input.upcomingPayablesKes)) {
    priorities.push(
      `Follow up on KES ${input.overdueReceivablesKes.toLocaleString()} overdue institutional receivables while scheduling KES ${input.upcomingPayablesKes.toLocaleString()} cooperative payables.`
    );
  }
  if (priorities.length < 3 && input.openOrdersCount > 0) {
    priorities.push(
      `Review ${input.openOrdersCount} active customer orders.`
    );
  }

  return {
    headline: `${user.roleName} shift brief`,
    priorities: priorities.slice(0, 3),
    riskAlert: priorities[0] ?? 'No open work was reported for this brief.',
  };
}
