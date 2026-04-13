"use client";

import { useState } from "react";
import UpgradeModal from "@/components/subscription/UpgradeModal";
import Button from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth-store";
import { CheckCircle, Search, Crown, Zap } from "@/components/ui/icons";

type BillingCycle = "ANNUAL" | "SEMI_ANNUAL";
type PaidTier = "GOLD" | "PLATINUM";

const TIERS = [
  {
    name: "Free",
    price: null,
    tier: null as null,
    icon: Search,
    iconBg: "bg-[#f2f2f7] dark:bg-[#2c2c2e]",
    iconColor: "text-[#86868b] dark:text-[#8e8e93]",
    accentText: "text-[#1d1d1f] dark:text-white",
    cardClass: "border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1c1c1e]",
    features: [
      "2 job results per search",
      "Resume upload & parsing",
      "AI cover letter generation",
      "Basic application tracking",
    ],
  },
  {
    name: "Gold",
    monthlyPrice: 325,
    tier: "GOLD" as PaidTier,
    icon: Crown,
    iconBg: "bg-amber-50 dark:bg-amber-900/20",
    iconColor: "text-amber-600 dark:text-yellow-400",
    accentText: "text-amber-600 dark:text-yellow-400",
    cardClass:
      "border border-amber-200/80 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-900/10",
    features: [
      "Up to 10 job results per search",
      "All job sources (Indeed, LinkedIn, JSearch...)",
      "Resume skills auto-detection",
      "AI cover letter generation",
      "Full application tracking",
      "Priority job scoring",
    ],
  },
  {
    name: "Platinum",
    monthlyPrice: 500,
    tier: "PLATINUM" as PaidTier,
    icon: Zap,
    popular: true,
    iconBg: "bg-indigo-50 dark:bg-indigo-900/30",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    accentText: "text-indigo-600 dark:text-indigo-400",
    cardClass:
      "border border-indigo-200/80 dark:border-indigo-900/40 bg-indigo-50/50 dark:bg-indigo-900/10",
    features: [
      "Unlimited job results",
      "Auto-apply — AI fills & submits forms",
      "Scheduled auto job search",
      "Multi-select bulk apply",
      "Real-time application status tracking",
      "Priority support",
    ],
  },
];

function formatPrice(monthlyPrice: number, cycle: BillingCycle) {
  const months = cycle === "ANNUAL" ? 12 : 6;
  const total = monthlyPrice * months;
  const label = cycle === "ANNUAL" ? "yr" : "6 mo";
  return { monthly: `₹${monthlyPrice}/mo`, total: `₹${total}/${label}` };
}

export default function PricingPage() {
  const { user } = useAuthStore();
  const currentTier = user?.subscriptionTier ?? "FREE";
  const [cycle, setCycle] = useState<BillingCycle>("ANNUAL");
  const [upgradeModal, setUpgradeModal] = useState<{
    open: boolean;
    targetTier?: PaidTier;
    cycle?: BillingCycle;
  }>({ open: false });

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold text-[#1d1d1f] dark:text-white">
          Simple, Transparent Pricing
        </h1>
        <p className="text-sm text-[#86868b] dark:text-[#8e8e93]">
          Start free. Upgrade when you&apos;re ready to land your dream job faster.
        </p>
      </div>

      <div className="flex items-center justify-center">
        <div className="flex items-center gap-1 rounded-xl border border-black/[0.06] bg-[#f2f2f7] p-1 dark:border-white/[0.08] dark:bg-[#1c1c1e]">
          <button
            onClick={() => setCycle("ANNUAL")}
            className={`rounded-lg px-5 py-2 text-xs font-medium transition-all ${
              cycle === "ANNUAL"
                ? "bg-white text-[#1d1d1f] shadow-sm dark:bg-[#2c2c2e] dark:text-white"
                : "text-[#86868b] hover:text-[#1d1d1f] dark:text-[#8e8e93] dark:hover:text-white"
            }`}
          >
            Annual
            <span className="ml-1.5 text-[10px] font-medium text-green-600 dark:text-green-400">
              Save 2 mo
            </span>
          </button>
          <button
            onClick={() => setCycle("SEMI_ANNUAL")}
            className={`rounded-lg px-5 py-2 text-xs font-medium transition-all ${
              cycle === "SEMI_ANNUAL"
                ? "bg-white text-[#1d1d1f] shadow-sm dark:bg-[#2c2c2e] dark:text-white"
                : "text-[#86868b] hover:text-[#1d1d1f] dark:text-[#8e8e93] dark:hover:text-white"
            }`}
          >
            Semi-Annual
          </button>
        </div>
      </div>

      <UpgradeModal
        open={upgradeModal.open}
        targetTier={upgradeModal.targetTier}
        billingCycle={upgradeModal.cycle ?? "ANNUAL"}
        onClose={() => setUpgradeModal({ open: false })}
      />

      <div className="grid gap-6 md:grid-cols-3">
        {TIERS.map((plan) => {
          const Icon = plan.icon;
          const isCurrentPlan = currentTier === (plan.tier ?? "FREE");
          const pricing = plan.monthlyPrice ? formatPrice(plan.monthlyPrice, cycle) : null;

          return (
            <div
              key={plan.name}
              className={`relative flex flex-col space-y-5 rounded-2xl p-6 shadow-sm ${plan.cardClass}`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-1 text-[10px] font-medium text-white">
                  Most Popular
                </span>
              )}

              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${plan.iconBg}`}
                >
                  <Icon className={`h-5 w-5 ${plan.iconColor}`} />
                </div>
                <div>
                  <h2 className={`text-lg font-semibold ${plan.accentText}`}>{plan.name}</h2>
                  {pricing ? (
                    <p className="text-xs text-[#86868b] dark:text-[#8e8e93]">
                      {pricing.total} billed
                    </p>
                  ) : (
                    <p className="text-xs text-[#86868b] dark:text-[#8e8e93]">forever free</p>
                  )}
                </div>
                <span className={`ml-auto text-2xl font-semibold ${plan.accentText}`}>
                  {pricing ? pricing.monthly : "₹0"}
                </span>
              </div>

              <ul className="flex-1 space-y-2">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-sm text-[#3c3c43] dark:text-[#c9d1d9]"
                  >
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                className="w-full"
                disabled={isCurrentPlan || plan.tier === null}
                onClick={() =>
                  plan.tier && !isCurrentPlan
                    ? setUpgradeModal({ open: true, targetTier: plan.tier, cycle })
                    : undefined
                }
              >
                {isCurrentPlan ? "Current Plan" : plan.tier ? "Subscribe" : "Free Forever"}
              </Button>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-[#86868b] dark:text-[#8e8e93]">
        Payments are processed securely by Razorpay. No hidden fees.
      </p>
    </div>
  );
}
