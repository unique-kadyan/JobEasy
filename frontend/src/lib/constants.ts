export const STATUS_COLORS: Record<string, string> = {
  SAVED: "bg-gray-100 text-gray-700",
  APPLIED: "bg-blue-100 text-blue-700",
  INTERVIEWING: "bg-yellow-100 text-yellow-700",
  OFFERED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  WITHDRAWN: "bg-gray-100 text-gray-500",
};

export const SOURCE_COLORS: Record<string, string> = {
  INDEED: "bg-purple-100 text-purple-700",
  LINKEDIN: "bg-sky-100 text-sky-700",
};

export const AI_PROVIDERS = [
  { value: "CLAUDE", label: "Claude (Anthropic)" },
  { value: "OPENAI", label: "GPT-4o (OpenAI)" },
];
