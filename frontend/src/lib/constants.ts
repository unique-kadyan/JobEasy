export const STATUS_COLORS: Record<string, string> = {
  SAVED: "bg-gray-100 text-gray-700 dark:bg-gray-500/15 dark:text-gray-400",
  APPLIED: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  INTERVIEWING: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400",
  OFFERED: "bg-green-100 text-green-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  WITHDRAWN: "bg-gray-100 text-gray-500 dark:bg-gray-500/10 dark:text-gray-500",
};

export const SOURCE_COLORS: Record<string, string> = {
  INDEED: "bg-purple-100 text-purple-700",
  LINKEDIN: "bg-sky-100 text-sky-700",
};

export const AI_PROVIDERS = [
  { value: "CLAUDE", label: "Claude (Anthropic)" },
  { value: "OPENAI", label: "GPT-4o (OpenAI)" },
];

export const CEREBRAS_MODELS = [
  { value: "CEREBRAS_QWEN",    label: "Qwen 3 235B Instruct" },
  { value: "CEREBRAS_GPT_OSS", label: "OpenAI GPT OSS" },
  { value: "CEREBRAS_GLM",     label: "Z.ai GLM 4.7" },
  { value: "CEREBRAS_LLAMA_8B", label: "Llama 3.1 8B" },
];

export const ALL_AI_PROVIDERS = [
  ...AI_PROVIDERS,
  ...CEREBRAS_MODELS,
];
