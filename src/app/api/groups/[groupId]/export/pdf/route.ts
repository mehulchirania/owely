import PDFDocument from "pdfkit";
import { NextResponse } from "next/server";
import { requirePaidFeature } from "@/lib/entitlements";
import { fetchExpenses, fetchGroup, fetchSettlements } from "@/lib/read-model";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";

function formatInr(paise: number): string {
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  return `${sign}INR ${(abs / 100).toFixed(2)}`;
}

function formatDate(ms: number): string {
  if (!ms) return "Unknown date";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
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

async function renderPdf(doc: PDFKit.PDFDocument): Promise<Buffer> {
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  doc.end();
  return done;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ groupId: string }> },
): Promise<Response> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });
  }

  const paid = await requirePaidFeature(user.uid, "pdf-export");
  if (!paid.ok) {
    return NextResponse.json({ error: paid.error, code: paid.code }, { status: 402 });
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

  const doc = new PDFDocument({ margin: 48, size: "A4" });
  doc.info.Title = `Owely export - ${group.name}`;
  doc.info.Author = "Owely";

  doc.fontSize(22).text(group.name, { continued: false });
  doc.moveDown(0.2);
  doc.fontSize(10).fillColor("#666").text(`Generated ${formatDate(Date.now())}`);
  doc.fillColor("#000").moveDown();

  doc.fontSize(13).text("Members", { underline: true });
  doc.moveDown(0.3);
  for (const uid of group.members) {
    doc.fontSize(10).text(`- ${memberName(group.memberDetails, uid)}`);
  }
  doc.moveDown();

  doc.fontSize(13).text("Current Simplified Balances", { underline: true });
  doc.moveDown(0.3);
  if (group.simplifiedDebts.length === 0) {
    doc.fontSize(10).text("All settled.");
  } else {
    for (const debt of group.simplifiedDebts) {
      doc
        .fontSize(10)
        .text(
          `${memberName(group.memberDetails, debt.from)} pays ${memberName(group.memberDetails, debt.to)} ${formatInr(debt.amount)}`,
        );
    }
  }
  doc.moveDown();

  doc.fontSize(13).text("Expenses", { underline: true });
  doc.moveDown(0.3);
  if (expenses.length === 0) {
    doc.fontSize(10).text("No expenses recorded.");
  } else {
    for (const expense of expenses) {
      doc
        .fontSize(10)
        .text(
          `${formatDate(expense.createdAt)} | ${expense.title} | ${formatInr(expense.amount)} | paid by ${memberName(group.memberDetails, expense.paidBy)}`,
        );
    }
  }
  doc.moveDown();

  doc.fontSize(13).text("Settlement History", { underline: true });
  doc.moveDown(0.3);
  if (settlements.length === 0) {
    doc.fontSize(10).text("No settlements recorded.");
  } else {
    for (const settlement of settlements) {
      const method = settlement.method === "cash" ? "cash" : "UPI";
      const reference = settlement.paymentRef ? ` | ref: ${settlement.paymentRef}` : "";
      doc
        .fontSize(10)
        .text(
          `${formatDate(settlement.createdAt)} | ${memberName(group.memberDetails, settlement.from)} -> ${memberName(group.memberDetails, settlement.to)} | ${formatInr(settlement.amount)} | ${method} | ${settlement.status}${reference}`,
        );
    }
  }

  const pdf = new Uint8Array(await renderPdf(doc));
  return new Response(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeFilename(group.name)}-owely.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
