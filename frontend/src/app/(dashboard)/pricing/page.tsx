"use client";

import { useState } from "react";
import UpgradeModal from "@/components/subscription/UpgradeModal";
import Button from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth-store";
import { CheckCircle, Search, Crown, Zap } from "lucide-react";

type BillingCycle = "ANNUAL" | "SEMI_ANNUAL";
type PaidTier = "GOLD" | "PLATINUM";

const TIERS = [
  {
    name: "Free",
    price: null,
    tier: null as null,
    icon: Search,
    iconBg: "bg-gray-100 dark:bg-gray-700/50",
    iconColor: "text-gray-500 dark:text-gray-400",
    accentText: "text-gray-600 dark:text-gray-400",
    cardClass: "border-black dark:border-[#30363d] bg-white dark:bg-[#161b22]",
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
    iconBg: "bg-amber-100 dark:bg-yellow-900/30",
    iconColor: "text-amber-600 dark:text-yellow-400",
    accentText: "text-amber-600 dark:text-yellow-400",
    cardClass: "border-amber-500 dark:border-yellow-700 bg-amber-50 dark:bg-yellow-900/10",
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
    iconBg: "bg-indigo-100 dark:bg-indigo-900/30",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    accentText: "text-indigo-600 dark:text-indigo-400",
    cardClass: "border-indigo-500 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/10",
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
  const [upgradeModal, setUpgradeModal] = useState<{ open: boolean; targetTier?: PaidTier; cycle?: BillingCycle }>({ open: false });

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black text-black dark:text-white uppercase tracking-tight">Simple, Transparent Pricing</h1>
        <p className="text-sm font-medium text-gray-500 dark:text-[#8b949e]">Start free. Upgrade when you&apos;re ready to land your dream job faster.</p>
      </div>

      <div className="flex items-center justify-center gap-1 bg-gray-100 dark:bg-[#161b22] border-2 border-black dark:border-[#30363d] rounded-[4px] p-1 w-fit mx-auto">
        <button
          onClick={() => setCycle("ANNUAL")}
          className={`px-5 py-2 rounded-[3px] text-xs font-black uppercase tracking-wide transition-all ${
            cycle === "ANNUAL"
              ? "bg-white dark:bg-[#0d1117] text-black dark:text-white border-2 border-black dark:border-[#30363d]"
              : "text-gray-500 dark:text-[#8b949e] hover:text-black dark:hover:text-white border-2 border-transparent"
          }`}
        >
          Annual
          <span className="ml-1.5 text-[10px] text-green-600 dark:text-green-400 font-black">Save 2 mo</span>
        </button>
        <button
          onClick={() => setCycle("SEMI_ANNUAL")}
          className={`px-5 py-2 rounded-[3px] text-xs font-black uppercase tracking-wide transition-all ${
            cycle === "SEMI_ANNUAL"
              ? "bg-white dark:bg-[#0d1117] text-black dark:text-white border-2 border-black dark:border-[#30363d]"
              : "text-gray-500 dark:text-[#8b949e] hover:text-black dark:hover:text-white border-2 border-transparent"
          }`}
        >
          Semi-Annual
        </button>
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
              className={`relative rounded-[4px] border-2 p-6 space-y-5 flex flex-col ${plan.cardClass}`}
              style={{ boxShadow: "4px 4px 0 #000" }}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-black px-3 py-1 rounded-[3px] border-2 border-black dark:border-white uppercase tracking-widest">
                  Most Popular
                </span>
              )}

              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-[3px] border-2 border-black dark:border-white ${plan.iconBg}`}>
                  <Icon className={`h-5 w-5 ${plan.iconColor}`} />
                </div>
                <div>
                  <h2 className={`font-black text-lg uppercase tracking-tight ${plan.accentText}`}>{plan.name}</h2>
                  {pricing ? (
                    <p className="text-xs font-medium text-gray-500 dark:text-[#8b949e]">{pricing.total} billed</p>
                  ) : (
                    <p className="text-xs font-medium text-gray-500 dark:text-[#8b949e]">forever free</p>
                  )}
                </div>
                <span className={`ml-auto text-2xl font-black ${plan.accentText}`}>
                  {pricing ? pricing.monthly : "₹0"}
                </span>
              </div>

              <ul className="space-y-2 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm font-medium text-black dark:text-[#c9d1d9]">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
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

      <p className="text-center text-xs font-bold text-gray-400 dark:text-[#8b949e]">
        Payments are processed securely by Razorpay. No hidden fees.
      </p>
    </div>
  );
}
