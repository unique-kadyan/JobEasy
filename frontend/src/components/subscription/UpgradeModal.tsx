"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Zap, Briefcase, CheckCircle, Lock } from "lucide-react";
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

interface Props {
  open: boolean;
  onClose: () => void;
  targetTier?: "JOBS" | "AUTO_APPLY";
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
    tier: "JOBS" as const,
    name: "All Jobs",
    price: "₹299/mo",
    icon: Briefcase,
    color: "indigo",
    features: [
      "Unlimited job search results",
      "All job sources (Indeed, LinkedIn, JSearch...)",
      "Resume skills auto-detection",
      "Cover letter generation with AI",
      "Application tracking",
    ],
  },
  {
    tier: "AUTO_APPLY" as const,
    name: "Auto Apply",
    price: "₹599/mo",
    icon: Zap,
    color: "purple",
    features: [
      "Everything in All Jobs",
      "Multi-select jobs for bulk apply",
      "One-click AI auto-apply queue",
      "AI fills application forms automatically",
      "Real-time application status updates",
    ],
  },
];

export default function UpgradeModal({ open, onClose, targetTier }: Props) {
  const { user, setUser } = useAuthStore();
  const [paying, setPaying] = useState<"JOBS" | "AUTO_APPLY" | null>(null);
  const [error, setError] = useState("");

  const createOrderMutation = useMutation({
    mutationFn: (tier: string) =>
      api
        .post("/subscriptions/create-order", null, { params: { tier } })
        .then((r) => r.data),
  });

  const verifyMutation = useMutation({
    mutationFn: (body: Record<string, string>) =>
      api.post("/subscriptions/verify", body).then((r) => r.data),
  });

  const handleSubscribe = async (tier: "JOBS" | "AUTO_APPLY") => {
    setError("");
    setPaying(tier);
    try {
      const order = await createOrderMutation.mutateAsync(tier);

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

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Kaddy",
        description:
          tier === "AUTO_APPLY" ? "Auto Apply Plan" : "All Jobs Plan",
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
        theme: { color: tier === "AUTO_APPLY" ? "#7c3aed" : "#4f46e5" },
      });
      rzp.on("payment.failed", () =>
        setError("Payment failed. Please try again."),
      );
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
          You&apos;re on the <strong>Free</strong> plan — limited to 2 job
          results per search. Upgrade to unlock more.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const highlighted = targetTier === plan.tier;
            return (
              <div
                key={plan.tier}
                className={`rounded-xl border-2 p-4 space-y-3 transition-all ${
                  highlighted
                    ? plan.tier === "AUTO_APPLY"
                      ? "border-purple-500 bg-purple-50"
                      : "border-indigo-500 bg-indigo-50"
                    : "border-gray-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon
                    className={`h-5 w-5 ${
                      plan.tier === "AUTO_APPLY"
                        ? "text-purple-600"
                        : "text-indigo-600"
                    }`}
                  />
                  <span className="font-semibold text-gray-900">
                    {plan.name}
                  </span>
                  <span
                    className={`ml-auto text-sm font-bold ${
                      plan.tier === "AUTO_APPLY"
                        ? "text-purple-700"
                        : "text-indigo-700"
                    }`}
                  >
                    {plan.price}
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-sm text-gray-600"
                    >
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.tier === "AUTO_APPLY" ? "primary" : "primary"}
                  loading={paying === plan.tier}
                  onClick={() => handleSubscribe(plan.tier)}
                >
                  {paying === plan.tier
                    ? "Processing..."
                    : `Subscribe — ${plan.price}`}
                </Button>
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
