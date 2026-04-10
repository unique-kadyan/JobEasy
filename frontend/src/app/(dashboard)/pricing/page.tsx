"use client";

import { useState } from "react";
import UpgradeModal from "@/components/subscription/UpgradeModal";
import Button from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth-store";
import { CheckCircle, Zap, Briefcase, Search } from "lucide-react";

const TIERS = [
  {
    name: "Free",
    price: "₹0",
    period: "forever",
    tier: null as null,
    icon: Search,
    color: "gray",
    features: [
      "2 job results per search",
      "Resume upload & parsing",
      "AI cover letter generation",
      "Basic application tracking",
    ],
    cta: "Current Plan",
    ctaDisabled: true,
  },
  {
    name: "All Jobs",
    price: "₹299",
    period: "per month",
    tier: "JOBS" as const,
    icon: Briefcase,
    color: "indigo",
    features: [
      "Unlimited job search results",
      "All sources (Indeed, LinkedIn, JSearch...)",
      "Resume skills auto-detection",
      "AI cover letter generation",
      "Full application tracking",
      "Priority job scoring",
    ],
    cta: "Subscribe",
    ctaDisabled: false,
  },
  {
    name: "Auto Apply",
    price: "₹599",
    period: "per month",
    tier: "AUTO_APPLY" as const,
    icon: Zap,
    color: "purple",
    popular: true,
    features: [
      "Everything in All Jobs",
      "Multi-select jobs for bulk apply",
      "One-click AI auto-apply queue",
      "AI fills application forms automatically",
      "Real-time application status tracking",
      "Priority support",
    ],
    cta: "Subscribe",
    ctaDisabled: false,
  },
];

export default function PricingPage() {
  const { user } = useAuthStore();
  const currentTier = user?.subscriptionTier ?? "FREE";
  const [upgradeModal, setUpgradeModal] = useState<{ open: boolean; targetTier?: "JOBS" | "AUTO_APPLY" }>({ open: false });

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Simple, Transparent Pricing</h1>
        <p className="text-gray-500">Start free. Upgrade when you&apos;re ready to land your dream job faster.</p>
      </div>

      <UpgradeModal
        open={upgradeModal.open}
        targetTier={upgradeModal.targetTier}
        onClose={() => setUpgradeModal({ open: false })}
      />

      <div className="grid gap-6 md:grid-cols-3">
        {TIERS.map((plan) => {
          const Icon = plan.icon;
          const isCurrentPlan = currentTier === (plan.tier ?? "FREE");
          const isHigherTier =
            (plan.tier === "JOBS" && currentTier === "FREE") ||
            (plan.tier === "AUTO_APPLY" && currentTier !== "AUTO_APPLY");

          return (
            <div
              key={plan.name}
              className={`relative rounded-2xl border-2 p-6 space-y-5 flex flex-col ${
                plan.color === "purple"
                  ? "border-purple-400 bg-purple-50"
                  : plan.color === "indigo"
                  ? "border-indigo-300 bg-indigo-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Most Popular
                </span>
              )}
              <div className="flex items-center gap-3">
                <Icon
                  className={`h-6 w-6 ${
                    plan.color === "purple"
                      ? "text-purple-600"
                      : plan.color === "indigo"
                      ? "text-indigo-600"
                      : "text-gray-400"
                  }`}
                />
                <div>
                  <h2 className="font-bold text-gray-900 text-lg">{plan.name}</h2>
                  <p className="text-sm text-gray-500">{plan.period}</p>
                </div>
                <span
                  className={`ml-auto text-2xl font-extrabold ${
                    plan.color === "purple"
                      ? "text-purple-700"
                      : plan.color === "indigo"
                      ? "text-indigo-700"
                      : "text-gray-700"
                  }`}
                >
                  {plan.price}
                </span>
              </div>

              <ul className="space-y-2 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                className="w-full"
                disabled={plan.ctaDisabled || isCurrentPlan}
                onClick={() =>
                  plan.tier && isHigherTier
                    ? setUpgradeModal({ open: true, targetTier: plan.tier })
                    : undefined
                }
              >
                {isCurrentPlan ? "Current Plan" : plan.cta}
              </Button>
            </div>
          );
        })}
      </div>

      <p className="text-center text-sm text-gray-400">
        Payments are processed securely by Razorpay. No hidden fees.
      </p>
    </div>
  );
}
