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
    accentText: "text-gray-500",
    accentBg: "bg-gray-100",
    border: "border-gray-200 bg-white",
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
    accentText: "text-yellow-600",
    accentBg: "bg-yellow-50",
    border: "border-yellow-400 bg-gradient-to-br from-yellow-50 to-amber-50",
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
    accentText: "text-slate-500",
    accentBg: "bg-slate-100",
    border: "border-slate-400 bg-gradient-to-br from-slate-50 to-slate-100",
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
        <h1 className="text-3xl font-bold text-gray-900">Simple, Transparent Pricing</h1>
        <p className="text-gray-500">Start free. Upgrade when you&apos;re ready to land your dream job faster.</p>
      </div>

      <div className="flex items-center justify-center gap-1 bg-gray-100 rounded-xl p-1 w-fit mx-auto">
        <button
          onClick={() => setCycle("ANNUAL")}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
            cycle === "ANNUAL"
              ? "bg-white shadow text-gray-900"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Annual
          <span className="ml-1.5 text-xs text-green-600 font-semibold">Save 2 mo</span>
        </button>
        <button
          onClick={() => setCycle("SEMI_ANNUAL")}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
            cycle === "SEMI_ANNUAL"
              ? "bg-white shadow text-gray-900"
              : "text-gray-500 hover:text-gray-700"
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
              className={`relative rounded-2xl border-2 p-6 space-y-5 flex flex-col ${plan.border}`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-700 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Most Popular
                </span>
              )}

              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${plan.accentBg}`}>
                  <Icon className={`h-5 w-5 ${plan.accentText}`} />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 text-lg">{plan.name}</h2>
                  {pricing ? (
                    <p className="text-xs text-gray-500">{pricing.total} billed</p>
                  ) : (
                    <p className="text-xs text-gray-500">forever free</p>
                  )}
                </div>
                <span className={`ml-auto text-2xl font-extrabold ${plan.accentText}`}>
                  {pricing ? pricing.monthly : "₹0"}
                </span>
              </div>

              <ul className="space-y-2 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
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

      <p className="text-center text-sm text-gray-400">
        Payments are processed securely by Razorpay. No hidden fees.
      </p>
    </div>
  );
}
