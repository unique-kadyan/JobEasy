import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function timeAgo(date: string) {
  const seconds = Math.floor(
    (new Date().getTime() - new Date(date).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(date);
}

/**
 * Convert a skill/technology name to camelCase.
 * Single-token terms (JavaScript, AWS, SpringBoot) are left as-is to
 * preserve established tech-brand casing. Multi-word terms are joined:
 *   "spring boot"  → "springBoot"
 *   "machine learning" → "machineLearning"
 *   "Apache Kafka" → "apacheKafka"
 */
export function toCamelCase(str: string): string {
  const trimmed = str.trim();
  // No whitespace/separator → preserve existing casing (handles JS, AWS, etc.)
  if (!/[\s\-_]/.test(trimmed)) return trimmed;
  const words = trimmed.split(/[\s\-_]+/).filter(Boolean);
  return words
    .map((w, i) =>
      i === 0
        ? w.charAt(0).toLowerCase() + w.slice(1)
        : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    )
    .join("");
}
