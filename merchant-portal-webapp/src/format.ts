// Small, shared presentation helpers. No business logic: every number and
// status shown in a page is read straight off the API response these format.

export function formatAmount(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString("en-KE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

type BadgeColor = "success" | "warning" | "error" | "info" | "default";

export function statusColor(status: string): BadgeColor {
  switch (status) {
    case "collected":
    case "paid":
      return "success";
    case "scheduled":
      return "info";
    case "withheld":
      return "warning";
    case "failed":
    case "reversed":
      return "error";
    default:
      return "default";
  }
}

export function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
