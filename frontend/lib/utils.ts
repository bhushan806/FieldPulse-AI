import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** User objects may arrive as snake_case (store) or camelCase (API interceptor). */
export function getUserProjectIds(user: { project_ids?: string[]; projectIds?: string[] } | null | undefined): string[] {
  if (!user) return [];
  if (Array.isArray(user.project_ids) && user.project_ids.length > 0) return user.project_ids;
  if (Array.isArray(user.projectIds) && user.projectIds.length > 0) return user.projectIds;
  return user.project_ids ?? user.projectIds ?? [];
}

export function getApiErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  const err = error as { response?: { data?: { detail?: unknown } }; message?: string };
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    if (typeof first === "string") return first;
    if (first?.msg) return String(first.msg);
  }
  if (err?.message) return err.message;
  return fallback;
}

/** Normalize phone input to +91XXXXXXXXXX when possible. */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (phone.trim().startsWith("+") && digits) return `+${digits}`;
  return digits ? `+${digits}` : phone.trim();
}
