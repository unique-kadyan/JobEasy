"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import Modal from "@/components/ui/Modal";
import { Crown, Zap, CheckCircle, Lock } from "lucide-react";
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
    iconBg: "bg-yellow-50",
    iconColor: "text-yellow-500",
    textColor: "text-yellow-700",
    border: "border-yellow-400 bg-gradient-to-br from-yellow-50 to-amber-50",
    btn: "bg-yellow-500 hover:bg-yellow-600 text-white",
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
    iconBg: "bg-slate-100",
    iconColor: "text-slate-400",
    textColor: "text-slate-600",
    border: "border-slate-400 bg-gradient-to-br from-slate-50 to-slate-100",
    btn: "bg-slate-700 hover:bg-slate-800 text-white",
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
        name: "Kaddy",
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
        theme: { color: tier === "PLATINUM" ? "#475569" : "#d97706" },
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
        <p className="text-sm text-gray-500">
          Unlock more jobs and powerful automation features.
        </p>

        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          <button
            onClick={() => setCycle("ANNUAL")}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
              cycle === "ANNUAL" ? "bg-white shadow text-gray-900" : "text-gray-500"
            }`}
          >
            Annual
            <span className="ml-1 text-green-600 font-semibold">Save 2 mo</span>
          </button>
          <button
            onClick={() => setCycle("SEMI_ANNUAL")}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
              cycle === "SEMI_ANNUAL" ? "bg-white shadow text-gray-900" : "text-gray-500"
            }`}
          >
            Semi-Annual
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const highlighted = targetTier === plan.tier;
            return (
              <div
                key={plan.tier}
                className={`rounded-xl border-2 p-4 space-y-3 transition-all ${
                  highlighted ? plan.border : "border-gray-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${plan.iconBg}`}>
                    <Icon className={`h-4 w-4 ${plan.iconColor}`} />
                  </div>
                  <span className={`font-semibold ${plan.textColor}`}>{plan.name}</span>
                  <span className={`ml-auto text-sm font-bold ${plan.textColor}`}>
                    ₹{plan.monthlyPrice}/mo
                  </span>
                </div>
                <p className="text-xs text-gray-400">{cycleTotal(plan.monthlyPrice, cycle)} billed</p>
                <ul className="space-y-1.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${plan.btn} disabled:opacity-60`}
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
          <p className="text-sm text-red-600 flex items-center gap-1">
            <Lock className="h-4 w-4" /> {error}
          </p>
        )}

        <p className="text-xs text-gray-400 text-center">
          Payments are secured by Razorpay. Cancel anytime.
        </p>
      </div>
    </Modal>
  );
}
