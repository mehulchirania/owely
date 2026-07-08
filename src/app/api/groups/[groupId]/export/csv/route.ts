import { NextResponse } from "next/server";
import { fetchExpenses } from "@/features/expenses/queries";
import { fetchGroup } from "@/features/groups/queries";
import { fetchSettlements } from "@/features/settlements/queries";
import { getSessionUser } from "@/features/auth/session";

export const runtime = "nodejs";

function formatInr(paise: number): string {
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  return `${sign}${(abs / 100).toFixed(2)}`;
}

function formatDate(ms: number): string {
  if (!ms) return "";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(ms));
}

function memberName(
  memberDetails: Record<string, { name: string }>,
  uid: string,
): string {
  return memberDetails[uid]?.name ?? "Someone";
}

function safeFilename(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64) || "owely-export";
}

// Simple CSV escape
function escapeCsv(field: string | undefined | null): string {
  if (!field) return "";
  const str = String(field);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ groupId: string }> },
): Promise<Response> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });
  }

  const { groupId } = await context.params;
  const group = await fetchGroup(groupId);
  if (!group || !group.members.includes(user.uid)) {
    return NextResponse.json({ error: "Group not found." }, { status: 404 });
  }

  const [expenses, settlements] = await Promise.all([
    fetchExpenses(groupId),
    fetchSettlements(groupId),
  ]);

  let csvContent = "";

  // 1. Group info
  csvContent += `Group Name,${escapeCsv(group.name)}\n`;
  csvContent += `Export Date,${escapeCsv(formatDate(Date.now()))}\n\n`;

  // 2. Simplified Debts
  csvContent += `Current Simplified Balances\n`;
  csvContent += `From,To,Amount (INR)\n`;
  if (group.simplifiedDebts.length === 0) {
    csvContent += `All settled.,,\n`;
  } else {
    for (const debt of group.simplifiedDebts) {
      csvContent += `${escapeCsv(memberName(group.memberDetails, debt.from))},${escapeCsv(memberName(group.memberDetails, debt.to))},${escapeCsv(formatInr(debt.amount))}\n`;
    }
  }
  csvContent += `\n`;

  // 3. Expenses
  csvContent += `Expenses\n`;
  csvContent += `Date,Title,Category,Paid By,Amount (INR),Notes\n`;
  if (expenses.length === 0) {
    csvContent += `No expenses recorded.,,,,,\n`;
  } else {
    for (const expense of expenses) {
      csvContent += `${escapeCsv(formatDate(expense.createdAt))},${escapeCsv(expense.title)},${escapeCsv(expense.category)},${escapeCsv(memberName(group.memberDetails, expense.paidBy))},${escapeCsv(formatInr(expense.amount))},${escapeCsv(expense.notes)}\n`;
    }
  }
  csvContent += `\n`;

  // 4. Settlements
  csvContent += `Settlement History\n`;
  csvContent += `Date,From,To,Method,Status,Reference,Amount (INR)\n`;
  if (settlements.length === 0) {
    csvContent += `No settlements recorded.,,,,,,\n`;
  } else {
    for (const settlement of settlements) {
      const method = settlement.method === "cash" ? "cash" : "UPI";
      csvContent += `${escapeCsv(formatDate(settlement.createdAt))},${escapeCsv(memberName(group.memberDetails, settlement.from))},${escapeCsv(memberName(group.memberDetails, settlement.to))},${escapeCsv(method)},${escapeCsv(settlement.status)},${escapeCsv(settlement.paymentRef)},${escapeCsv(formatInr(settlement.amount))}\n`;
    }
  }

  return new Response(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeFilename(group.name)}-owely.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
