export const STATUS_COLORS: Record<string, string> = {
  SAVED: "bg-gray-100 text-gray-700 dark:bg-gray-500/15 dark:text-gray-400",
  APPLIED: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  INTERVIEWING:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400",
  OFFERED:
    "bg-green-100 text-green-700 dark:bg-emerald-500/15 dark:text-emerald-400",
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
  { value: "CEREBRAS", label: "Llama 3.3 70B (Cerebras)" },
  { value: "CEREBRAS_QWEN", label: "Qwen 3 235B Instruct" },
  { value: "CEREBRAS_GPT_OSS", label: "OpenAI GPT OSS" },
  { value: "CEREBRAS_GLM", label: "Z.ai GLM 4.7" },
  { value: "CEREBRAS_LLAMA_8B", label: "Llama 3.1 8B (Cerebras)" },
];

export const GROQ_MODELS = [
  { value: "GROQ", label: "Llama 3.3 70B Versatile (Groq)" },
  { value: "GROQ_LLAMA_8B", label: "Llama 3.1 8B Instant" },
  { value: "GROQ_LLAMA_4_SCOUT", label: "Llama 4 Scout 17B" },
  { value: "GROQ_COMPOUND", label: "Groq Compound" },
  { value: "GROQ_COMPOUND_MINI", label: "Groq Compound Mini" },
  { value: "GROQ_GPT_OSS_120B", label: "OpenAI GPT OSS 120B (Groq)" },
  { value: "GROQ_GPT_OSS_20B", label: "OpenAI GPT OSS 20B (Groq)" },
];

export const TOGETHER_MODELS = [
  { value: "TOGETHER", label: "Llama 3.3 70B Turbo (Together)" },
  { value: "TOGETHER_DEEPSEEK_R1", label: "DeepSeek R1-0528" },
  { value: "TOGETHER_DEEPSEEK_V3", label: "DeepSeek V3.1" },
  { value: "TOGETHER_QWEN35_397B", label: "Qwen3.5 397B A17B" },
  { value: "TOGETHER_QWEN35_9B", label: "Qwen3.5 9B" },
  { value: "TOGETHER_QWEN3_CODER", label: "Qwen3 Coder 480B" },
  { value: "TOGETHER_GLM51", label: "GLM 5.1 FP4" },
  { value: "TOGETHER_KIMI_K2", label: "Kimi K2.5" },
  { value: "TOGETHER_GPT_OSS_120B", label: "OpenAI GPT-OSS 120B (Together)" },
  { value: "TOGETHER_GPT_OSS_20B", label: "OpenAI GPT-OSS 20B (Together)" },
  { value: "TOGETHER_MISTRAL_SMALL", label: "Mistral Small 24B" },
  { value: "TOGETHER_MIXTRAL", label: "Mixtral 8x7B Instruct" },
  { value: "TOGETHER_LLAMA_8B", label: "Meta Llama 3 8B Lite" },
  { value: "TOGETHER_COGITO", label: "Cogito v2.1 671B" },
];

export const HYPERBOLIC_MODELS = [
  { value: "HYPERBOLIC", label: "Llama 3.3 70B (Hyperbolic)" },
  { value: "HYPERBOLIC_DEEPSEEK_R1", label: "DeepSeek R1 (Hyperbolic)" },
  {
    value: "HYPERBOLIC_DEEPSEEK_R1_0528",
    label: "DeepSeek R1-0528 (Hyperbolic)",
  },
  { value: "HYPERBOLIC_DEEPSEEK_V3", label: "DeepSeek V3-0324 (Hyperbolic)" },
  { value: "HYPERBOLIC_QWEN3_CODER", label: "Qwen3 Coder 480B (Hyperbolic)" },
];

export const DEEPSEEK_MODELS = [
  { value: "DEEPSEEK", label: "DeepSeek V3 (Chat)" },
  { value: "DEEPSEEK_R1", label: "DeepSeek R1 (Reasoner)" },
];

export const ALL_AI_PROVIDERS = [
  ...AI_PROVIDERS,
  ...DEEPSEEK_MODELS,
  ...HYPERBOLIC_MODELS,
  ...CEREBRAS_MODELS,
  ...GROQ_MODELS,
  ...TOGETHER_MODELS,
];
