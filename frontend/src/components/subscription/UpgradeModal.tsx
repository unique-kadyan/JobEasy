"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import Modal from "@/components/ui/Modal";
import { Crown, Zap, CheckCircle, Lock, AlertCircle } from "@/components/ui/icons";
import { useAuthStore } from "@/store/auth-store";

interface RazorpayInstance {
  on(event: string, handler: () => void): void;
  open(): void;
}
interface RazorpayConstructor {
  new (options: Record<string, unknown>): RazorpayInstance;
}
declare global {
  interface Window {
    Razorpay: RazorpayConstructor;
  }
}

type BillingCycle = "ANNUAL" | "SEMI_ANNUAL";

interface Props {
  open: boolean;
  onClose: () => void;
  targetTier?: "GOLD" | "PLATINUM";
  billingCycle?: BillingCycle;
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

const PLANS = [
  {
    tier: "GOLD" as const,
    name: "Gold",
    monthlyPrice: 325,
    icon: Crown,
    iconBg: "bg-amber-50 dark:bg-yellow-900/30",
    iconColor: "text-amber-500",
    iconBorder: "border-amber-400",
    accentBorder: "border-amber-400",
    accentBg: "bg-amber-50 dark:bg-yellow-900/10",
    textColor: "text-amber-700 dark:text-amber-400",
    btnClass: "bg-amber-500 hover:bg-amber-600 text-white border-2 border-black dark:border-black",
    features: [
      "Up to 10 job results per search",
      "All job sources (Indeed, LinkedIn, JSearch...)",
      "Resume skills auto-detection",
      "AI cover letter generation",
      "Full application tracking",
    ],
  },
  {
    tier: "PLATINUM" as const,
    name: "Platinum",
    monthlyPrice: 500,
    icon: Zap,
    iconBg: "bg-slate-100 dark:bg-slate-800",
    iconColor: "text-indigo-500",
    iconBorder: "border-slate-400 dark:border-slate-600",
    accentBorder: "border-indigo-600",
    accentBg: "bg-slate-50 dark:bg-slate-900/30",
    textColor: "text-slate-700 dark:text-slate-300",
    btnClass: "bg-indigo-600 hover:bg-indigo-700 text-white border-2 border-black dark:border-black",
    features: [
      "Unlimited job results",
      "Auto-apply — AI fills & submits forms",
      "Scheduled auto job search",
      "Multi-select bulk apply",
      "Real-time application status tracking",
    ],
  },
];

function cycleTotal(monthlyPrice: number, cycle: BillingCycle) {
  const months = cycle === "ANNUAL" ? 12 : 6;
  const label = cycle === "ANNUAL" ? "yr" : "6 mo";
  return `₹${monthlyPrice * months}/${label}`;
}

export default function UpgradeModal({ open, onClose, targetTier, billingCycle = "ANNUAL" }: Props) {
  const { user, setUser } = useAuthStore();
  const [cycle, setCycle] = useState<BillingCycle>(billingCycle);
  const [paying, setPaying] = useState<"GOLD" | "PLATINUM" | null>(null);
  const [error, setError] = useState("");

  const createOrderMutation = useMutation({
    mutationFn: ({ tier, billingCycle: bc }: { tier: string; billingCycle: string }) =>
      api
        .post("/subscriptions/create-order", null, { params: { tier, billingCycle: bc } })
        .then((r) => r.data),
  });

  const verifyMutation = useMutation({
    mutationFn: (body: Record<string, string>) =>
      api.post("/subscriptions/verify", body).then((r) => r.data),
  });

  const handleSubscribe = async (tier: "GOLD" | "PLATINUM") => {
    setError("");
    setPaying(tier);
    try {
      const order = await createOrderMutation.mutateAsync({ tier, billingCycle: cycle });

      if (order.orderId?.startsWith("admin_bypass_") || order.amount === 0) {
        await verifyMutation.mutateAsync({
          razorpayOrderId: order.orderId,
          razorpayPaymentId: "admin_bypass",
          razorpaySignature: "admin_bypass",
          tier,
        });
        if (user) setUser({ ...user, subscriptionTier: tier });
        onClose();
        return;
      }

      const ok = await loadRazorpay();
      if (!ok) {
        setError("Payment gateway failed to load.");
        return;
      }

      const plan = PLANS.find((p) => p.tier === tier)!;
      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Rolevo",
        description: `${plan.name} Plan — ${cycle === "ANNUAL" ? "Annual" : "Semi-Annual"}`,
        order_id: order.orderId,
        handler: async (response: Record<string, string>) => {
          try {
            await verifyMutation.mutateAsync({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              tier,
            });
            if (user) setUser({ ...user, subscriptionTier: tier });
            onClose();
          } catch {
            setError("Payment verification failed. Please contact support.");
          }
        },
        prefill: { email: user?.email ?? "", name: user?.name ?? "" },
        theme: { color: tier === "PLATINUM" ? "#4f46e5" : "#f59e0b" },
      });
      rzp.on("payment.failed", () => setError("Payment failed. Please try again."));
      rzp.open();
    } catch {
      setError("Failed to initiate payment. Please try again.");
    } finally {
      setPaying(null);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Upgrade Your Plan">
      <div className="space-y-4">
        <p className="text-sm font-medium text-gray-500 dark:text-[#8b949e]">
          Unlock more jobs and powerful automation features.
        </p>

        {/* Billing cycle toggle */}
        <div className="flex items-center gap-0 rounded-[4px] border-2 border-black dark:border-[#30363d] p-0.5 w-fit bg-gray-50 dark:bg-[#161b22]">
          <button
            onClick={() => setCycle("ANNUAL")}
            className={`px-4 py-1.5 rounded-[3px] text-xs font-black uppercase tracking-wide transition-all ${
              cycle === "ANNUAL"
                ? "bg-white dark:bg-[#21262d] text-black dark:text-white border-2 border-black dark:border-[#30363d]"
                : "text-gray-500 dark:text-[#8b949e] border-2 border-transparent"
            }`}
            style={cycle === "ANNUAL" ? { boxShadow: "2px 2px 0 #000" } : {}}
          >
            Annual
            <span className="ml-1.5 text-green-600 dark:text-green-400 font-black normal-case tracking-normal">Save 2 mo</span>
          </button>
          <button
            onClick={() => setCycle("SEMI_ANNUAL")}
            className={`px-4 py-1.5 rounded-[3px] text-xs font-black uppercase tracking-wide transition-all ${
              cycle === "SEMI_ANNUAL"
                ? "bg-white dark:bg-[#21262d] text-black dark:text-white border-2 border-black dark:border-[#30363d]"
                : "text-gray-500 dark:text-[#8b949e] border-2 border-transparent"
            }`}
            style={cycle === "SEMI_ANNUAL" ? { boxShadow: "2px 2px 0 #000" } : {}}
          >
            Semi-Annual
          </button>
        </div>

        {/* Plan cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const highlighted = targetTier === plan.tier;
            return (
              <div
                key={plan.tier}
                className={`rounded-[4px] border-2 p-4 space-y-3 transition-all ${
                  highlighted
                    ? `${plan.accentBorder} ${plan.accentBg}`
                    : "border-black dark:border-[#30363d] bg-white dark:bg-[#161b22]"
                }`}
                style={highlighted ? { boxShadow: "4px 4px 0 #000" } : { boxShadow: "2px 2px 0 #000" }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-[3px] border-2 ${plan.iconBorder} ${plan.iconBg}`}
                  >
                    <Icon className={`h-4 w-4 ${plan.iconColor}`} />
                  </div>
                  <span className={`font-black uppercase tracking-wide text-sm ${plan.textColor}`}>
                    {plan.name}
                  </span>
                  <span className={`ml-auto text-sm font-black ${plan.textColor}`}>
                    ₹{plan.monthlyPrice}/mo
                  </span>
                </div>
                <p className="text-xs font-medium text-gray-400 dark:text-[#8b949e]">
                  {cycleTotal(plan.monthlyPrice, cycle)} billed
                </p>
                <ul className="space-y-1.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs font-medium text-gray-600 dark:text-[#8b949e]">
                      <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  className={`w-full py-2 rounded-[4px] text-xs font-black uppercase tracking-wide transition-colors ${plan.btnClass} disabled:opacity-60`}
                  style={{ boxShadow: "3px 3px 0 #000" }}
                  disabled={paying !== null}
                  onClick={() => handleSubscribe(plan.tier)}
                >
                  {paying === plan.tier
                    ? "Processing..."
                    : `Subscribe — ${cycleTotal(plan.monthlyPrice, cycle)}`}
                </button>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="rounded-[4px] border-2 border-red-500 bg-red-50 dark:bg-red-900/20 p-3 flex items-center gap-2 text-sm font-bold text-red-700 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <p className="text-xs font-medium text-gray-400 dark:text-[#8b949e] text-center">
          Payments are secured by Razorpay. Cancel anytime.
        </p>
      </div>
    </Modal>
  );
}
