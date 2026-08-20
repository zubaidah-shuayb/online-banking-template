export type Profile = {
  id: string;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  country: string | null;
  avatar_url: string | null;
  preferred_skin: string;
  preferred_currency: string | null;
  kyc_status: string;
  is_frozen: boolean;
  notify_email?: boolean;
  notify_push?: boolean;
  notify_marketing?: boolean;
  daily_transfer_limit?: number | null;
  created_at: string;
};



export type Account = {
  id: string;
  user_id: string;
  account_number: string;
  iban: string | null;
  label: string;
  type: "checking" | "savings" | "investment";
  currency_code: string;
  balance: number;
  is_primary: boolean;
  is_frozen: boolean;
  created_at: string;
};

export type Transaction = {
  id: string;
  reference: string;
  account_id: string;
  counterparty_name: string | null;
  counterparty_number: string | null;
  type: "deposit" | "withdrawal" | "transfer" | "fee" | "interest" | "adjustment";
  status: "pending" | "completed" | "failed" | "reversed";
  amount: number;
  currency_code: string;
  balance_after: number | null;
  category: string;
  description: string;
  created_at: string;
};

export type Beneficiary = {
  id: string;
  name: string;
  account_number: string;
  bank_name: string;
  currency_code: string;
  avatar_url?: string | null;
  is_favorite: boolean;
};


export type Currency = {
  code: string;
  name: string;
  symbol: string;
  rate_to_usd: number;
  is_active: boolean;
};

export type Announcement = {
  id: string;
  title: string;
  body: string;
  severity: string;
  is_published: boolean;
  created_at: string;
};

export type NotificationRow = {
  id: string;
  title: string;
  body: string;
  kind: string;
  is_read: boolean;
  created_at: string;
};

export type ActivityLog = {
  id: string;
  actor_email: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
};

export type CardRow = {
  id: string;
  account_id: string;
  last4: string;
  is_frozen: boolean;
  spend_limit: number | null;
  pin_set: boolean;
  created_at: string;
};

export type ScheduledTransfer = {
  id: string;
  from_account: string;
  to_account_number: string;
  amount: number;
  description: string;
  frequency: "once" | "weekly" | "monthly";
  next_run: string;
  is_active: boolean;
  last_run_at: string | null;
  created_at: string;
};

export type BankSettings = {
  id?: string;
  bank_name?: string | null;
  support_email?: string | null;
  default_skin?: string | null;
  maintenance_mode?: boolean | null;
  maintenance_message?: string | null;
  transfer_fee_percent?: number | null;
};

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  kind: string;
  is_handled: boolean;
  created_at: string;
};


const symbols: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  INR: "₹",
  NGN: "₦",
};

export function formatMoney(amount: number, currency = "USD") {
  const symbol = symbols[currency] ?? "";
  const value = Math.abs(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${amount < 0 ? "-" : ""}${symbol}${value}${symbol ? "" : ` ${currency}`}`;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const CUSTOMER_LABELS: Record<string, string> = {
  deposit: "Credit",
  withdrawal: "Debit",
  transfer: "Transfer",
  fee: "Fee",
  interest: "Interest",
  adjustment: "Credit",
};

/** Customer-facing type label — never exposes internal adjustment wording. */
export function txnLabel(type: string) {
  return CUSTOMER_LABELS[type] ?? "Transaction";
}

/** Customer-facing description — internal/administrative wording is rewritten. */
export function txnDescription(t: {
  type: string;
  amount: number | string;
  description?: string | null;
  counterparty_name?: string | null;
}) {
  const raw = (t.description ?? "").trim();
  const internal = !raw || /admin|adjust|manual|correction|system/i.test(raw);
  if (!internal) return raw;
  if (t.counterparty_name) return `Transfer from ${t.counterparty_name}`;
  return Number(t.amount) >= 0 ? "Funds received" : "Payment";
}

/** Customer-facing category — hides internal buckets. */
export function txnCategory(category?: string | null) {
  if (!category || /adjust|admin|system/i.test(category)) return "banking";
  return category;
}

/** Rewrites any internal/administrative phrasing in notification copy. */
export function notificationText(text: string) {
  return text
    .replace(/your account balance was adjusted by\s*/i, "A credit of ")
    .replace(/balance (was )?adjusted/gi, "balance updated")
    .replace(/administrative(ly)?( adjustment)?/gi, "account")
    .replace(/\badjustment\b/gi, "transaction");
}
