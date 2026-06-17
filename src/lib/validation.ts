/**
 * Validation layer — Zod schemas for every Server Action input, plus the
 * helpers that turn raw input (a `FormData` or a plain object) into either a
 * typed value or structured field errors.
 *
 * This module is pure (no React, no Firebase). Actions call `parse*` at their
 * boundary, then build money/splits with `src/lib/money.ts`. Keeping money
 * conversion out of Zod means the schemas stay declarative and the paise
 * arithmetic lives in exactly one place (the action + money utils).
 */

import { z } from "zod";
import { SUPPORTED_CURRENCY_CODES } from "@/lib/currency";
import type { ExpenseCategory, SplitType } from "@/types";

/** Result of a parse attempt — never throws, mirrors `ActionResult` ergonomics. */
export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; message: string; fieldErrors: Record<string, string[]> };

/** Flatten a FormData into a plain object. Repeated keys collapse to arrays. */
export function formDataToObject(formData: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key in out) {
      const existing = out[key];
      if (Array.isArray(existing)) existing.push(value);
      else out[key] = [existing, value];
    } else {
      out[key] = value;
    }
  }
  return out;
}

function toParseResult<T>(parsed: z.ZodSafeParseResult<T>): ParseResult<T> {
  if (parsed.success) return { success: true, data: parsed.data };
  const flat = z.flattenError(parsed.error);
  const fieldErrors: Record<string, string[]> = {};
  for (const [key, messages] of Object.entries(flat.fieldErrors)) {
    const list = messages as string[] | undefined;
    if (list && list.length > 0) fieldErrors[key] = list;
  }
  return {
    success: false,
    message: "Please check the highlighted fields.",
    fieldErrors,
  };
}

/** Parse a plain object against a schema. */
export function parseInput<T>(
  schema: z.ZodType<T>,
  data: unknown,
): ParseResult<T> {
  return toParseResult(schema.safeParse(data));
}

/** Parse a `FormData` against a schema (FormData → object → parse). */
export function parseActionData<T>(
  formData: FormData,
  schema: z.ZodType<T>,
): ParseResult<T> {
  return parseInput(schema, formDataToObject(formData));
}

// ── Shared field schemas ────────────────────────────────────────────────────

/**
 * Indian phone number, normalised to E.164 `+91XXXXXXXXXX`. Accepts a bare
 * 10-digit number, a `0`-prefixed number, or an already-`+91` number, and
 * strips spaces/dashes. Phone is the primary group-join key (Decision 5).
 */
export const PhoneSchema = z
  .string()
  .trim()
  .transform((raw) => raw.replace(/[\s-]/g, ""))
  .refine((v) => /^(\+91|91|0)?[6-9]\d{9}$/.test(v), {
    message: "Enter a valid 10-digit Indian mobile number.",
  })
  .transform((v) => {
    const digits = v.replace(/^\+?91|^0/, "");
    return `+91${digits}`;
  });

/** A rupee amount as the user typed it. Structural check only — the action
 * converts to paise via `rupeesToPaise` (which rejects sub-paise precision). */
const RupeeStringSchema = z
  .string()
  .trim()
  .refine((v) => /^\d+(\.\d{1,2})?$/.test(v.replace(/[,₹\s]/g, "")), {
    message: "Enter a valid amount, e.g. 250 or 250.50.",
  });

const UidSchema = z.string().min(1, "Missing member.");

const CATEGORIES: readonly ExpenseCategory[] = [
  "general", "food", "groceries", "rent", "utilities", "transport",
  "entertainment", "travel", "shopping", "health", "other",
];

const SPLIT_TYPES: readonly SplitType[] = ["equal", "unequal", "percentage"];
const TEMPLATE_SPLIT_TYPES = ["equal", "percentage"] as const;
const CurrencyCodeSchema = z.enum(SUPPORTED_CURRENCY_CODES);

// ── Group schemas ────────────────────────────────────────────────────────────

export const CreateGroupSchema = z.object({
  name: z.string().trim().min(1, "Name a group.").max(60, "Keep it under 60 characters."),
});
export type CreateGroupInput = z.infer<typeof CreateGroupSchema>;

export const RenameGroupSchema = z.object({
  groupId: UidSchema,
  name: z.string().trim().min(1, "Name can't be empty.").max(60),
});
export type RenameGroupInput = z.infer<typeof RenameGroupSchema>;

export const GroupIdSchema = z.object({ groupId: UidSchema });

export const InviteByPhoneSchema = z.object({
  groupId: UidSchema,
  phone: PhoneSchema,
  name: z.string().trim().min(1, "Give the invitee a name.").max(60),
});
export type InviteByPhoneInput = z.infer<typeof InviteByPhoneSchema>;

export const CreateDirectRelationshipSchema = z.object({
  phone: PhoneSchema,
  name: z.string().trim().min(1, "Give this person a name.").max(60),
});
export type CreateDirectRelationshipInput = z.infer<typeof CreateDirectRelationshipSchema>;

export const AcceptInviteSchema = z.object({ inviteId: UidSchema });

/** Raw phone strings (from a contact picker) to check for existing accounts.
 * Normalised + filtered in the action, so invalid entries are ignored there. */
export const FindUsersSchema = z.object({
  phones: z.array(z.string()).min(1, "No numbers to check.").max(500),
});
export type FindUsersInput = z.infer<typeof FindUsersSchema>;

/** Batch add people to a group by name + phone (registered → joined now;
 * unregistered → pending invite). */
export const AddMembersSchema = z.object({
  groupId: UidSchema,
  people: z
    .array(
      z.object({
        name: z.string().trim().min(1, "Each person needs a name.").max(60),
        phone: PhoneSchema,
      }),
    )
    .min(1, "Add at least one person.")
    .max(50, "Add up to 50 people at a time."),
});
export type AddMembersInput = z.infer<typeof AddMembersSchema>;

// ── Expense schemas ──────────────────────────────────────────────────────────

/**
 * Raw add/edit-expense input. `splitValues` is a record keyed by participant
 * uid: for `unequal` the values are rupee strings (exact amounts), for
 * `percentage` they are percent numbers; for `equal` it is ignored. The action
 * turns this into integer-paise splits and validates exact reconciliation.
 */
/** Client-generated idempotency key (UUID). Optional; enables offline replay. */
const ClientIdSchema = z.string().trim().min(8).max(64).optional();

export const ExpenseInputSchema = z.object({
  title: z.string().trim().min(1, "Add a description.").max(120),
  amountRupees: RupeeStringSchema,
  paidBy: UidSchema,
  category: z.enum(CATEGORIES as [ExpenseCategory, ...ExpenseCategory[]]),
  splitType: z.enum(SPLIT_TYPES as [SplitType, ...SplitType[]]),
  participants: z.array(UidSchema).min(1, "Pick at least one person."),
  splitValues: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
  clientId: ClientIdSchema,
});
export type ExpenseInput = z.infer<typeof ExpenseInputSchema>;

export const AddExpenseSchema = z.object({
  groupId: UidSchema,
  expense: ExpenseInputSchema,
});
export type AddExpenseInput = z.infer<typeof AddExpenseSchema>;

export const EditExpenseSchema = z.object({
  groupId: UidSchema,
  expenseId: UidSchema,
  expense: ExpenseInputSchema,
});
export type EditExpenseInput = z.infer<typeof EditExpenseSchema>;

export const DeleteExpenseSchema = z.object({
  groupId: UidSchema,
  expenseId: UidSchema,
});

// ── Own (personal, un-split) expense schemas ─────────────────────────────────

/** A personal expense the user tracks but never splits (no group, no splits). */
export const OwnExpenseInputSchema = z.object({
  title: z.string().trim().min(1, "Add a description.").max(120),
  amountRupees: RupeeStringSchema,
  category: z.enum(CATEGORIES as [ExpenseCategory, ...ExpenseCategory[]]),
  clientId: ClientIdSchema,
});
export type OwnExpenseInput = z.infer<typeof OwnExpenseInputSchema>;

export const AddOwnExpenseSchema = z.object({ expense: OwnExpenseInputSchema });
export const EditOwnExpenseSchema = z.object({
  expenseId: UidSchema,
  expense: OwnExpenseInputSchema,
});
export const DeleteOwnExpenseSchema = z.object({ expenseId: UidSchema });

// ── Recurring-expense schemas ────────────────────────────────────────────────

/** Day of month to auto-generate on, 1–28 (stays valid in every month). */
const DayOfMonthSchema = z
  .number({ message: "Pick a day of the month." })
  .int()
  .min(1, "Day must be between 1 and 28.")
  .max(28, "Day must be between 1 and 28.");

export const CreateSharedRecurringSchema = z.object({
  groupId: UidSchema,
  expense: ExpenseInputSchema,
  dayOfMonth: DayOfMonthSchema,
});
export type CreateSharedRecurringInput = z.infer<typeof CreateSharedRecurringSchema>;

export const CreateOwnRecurringSchema = z.object({
  expense: OwnExpenseInputSchema,
  dayOfMonth: DayOfMonthSchema,
});
export type CreateOwnRecurringInput = z.infer<typeof CreateOwnRecurringSchema>;

export const UpdateRecurringSchema = z.object({
  recurringId: UidSchema,
  active: z.boolean().optional(),
  dayOfMonth: DayOfMonthSchema.optional(),
});
export type UpdateRecurringInput = z.infer<typeof UpdateRecurringSchema>;

export const DeleteRecurringSchema = z.object({ recurringId: UidSchema });

// ── Relationship-category schemas ────────────────────────────────────────────

/** Design-system color tokens a category may use (drive the tile tint). */
const CATEGORY_COLORS = [
  "accent", "accent2", "mint", "coral", "pink", "cyan", "yellow", "orange", "muted",
] as const;

const CategoryScopeSchema = z.enum(["group", "direct", "both"]);

export const CreateCategorySchema = z.object({
  name: z.string().trim().min(1, "Name the category.").max(40),
  color: z.enum(CATEGORY_COLORS),
  icon: z.string().trim().min(1).max(32),
  appliesTo: CategoryScopeSchema,
});
export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;

export const UpdateCategorySchema = z.object({
  categoryId: UidSchema,
  name: z.string().trim().min(1).max(40).optional(),
  color: z.enum(CATEGORY_COLORS).optional(),
  icon: z.string().trim().min(1).max(32).optional(),
  appliesTo: CategoryScopeSchema.optional(),
});
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;

export const DeleteCategorySchema = z.object({ categoryId: UidSchema });

/** Assign a category to a group/direct relationship, or clear it (`null`). */
export const SetGroupCategorySchema = z.object({
  groupId: UidSchema,
  categoryId: z.string().trim().min(1).max(64).nullable(),
});
export type SetGroupCategoryInput = z.infer<typeof SetGroupCategorySchema>;

// Currency preference schemas

export const UpdateDisplayCurrencySchema = z.object({
  currency: CurrencyCodeSchema,
});
export type UpdateDisplayCurrencyInput = z.infer<typeof UpdateDisplayCurrencySchema>;

export const SetGroupBaseCurrencySchema = z.object({
  groupId: UidSchema,
  currency: CurrencyCodeSchema,
});
export type SetGroupBaseCurrencyInput = z.infer<typeof SetGroupBaseCurrencySchema>;

// â”€â”€ Split-template schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const BasisPointsSchema = z
  .number({ message: "Enter a percentage." })
  .int("Percentages must resolve to whole basis points.")
  .min(0, "Percentages must be zero or more.")
  .max(10000, "Percentages cannot exceed 100%.");

export const TemplateInputSchema = z.object({
  groupId: UidSchema,
  name: z.string().trim().min(1, "Name the template.").max(60),
  splitType: z.enum(TEMPLATE_SPLIT_TYPES),
  participants: z.array(UidSchema).min(1, "Pick at least one person.").max(50),
  weights: z.record(z.string(), BasisPointsSchema).optional(),
  category: z.enum(CATEGORIES as [ExpenseCategory, ...ExpenseCategory[]]).optional(),
});
export type TemplateInput = z.infer<typeof TemplateInputSchema>;

export const CreateTemplateSchema = TemplateInputSchema;
export type CreateTemplateInput = z.infer<typeof CreateTemplateSchema>;

export const UpdateTemplateSchema = TemplateInputSchema.extend({
  templateId: UidSchema,
});
export type UpdateTemplateInput = z.infer<typeof UpdateTemplateSchema>;

export const DeleteTemplateSchema = z.object({ templateId: UidSchema });

// ── Settlement schemas ───────────────────────────────────────────────────────

/**
 * The payer records a payment they made to `to`. `from` is always the
 * signed-in user (taken from the session, never the client), so it isn't part
 * of the input. An optional UPI reference (UTR) is captured for the payee to
 * verify against.
 */
export const SettleUpSchema = z.object({
  groupId: UidSchema,
  to: UidSchema,
  amountRupees: RupeeStringSchema,
  paymentRef: z.string().trim().max(64).optional(),
});
export type SettleUpInput = z.infer<typeof SettleUpSchema>;

export const DisputeSettlementSchema = z.object({
  groupId: UidSchema,
  settlementId: UidSchema,
});

// ── User profile schema ──────────────────────────────────────────────────────

export const UpdateProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(60).optional(),
  upiId: z
    .string()
    .trim()
    .regex(/^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/, "Enter a valid UPI ID, e.g. name@okaxis.")
    .optional()
    .or(z.literal("")),
});
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
