"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Shield, CreditCard, Lock, CheckCircle } from "@/components/ui/icons";
import type { PaymentOrder } from "@/types";

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
  resumeId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function PaymentModal({ open, resumeId, onClose, onSuccess }: Props) {
  const [error, setError] = useState("");
  const country = Intl.DateTimeFormat().resolvedOptions().locale?.includes("IN") ? "IN" : "US";

  const createOrderMutation = useMutation({
    mutationFn: async (): Promise<PaymentOrder> => {
      const res = await api.post(`/payments/create-order?resumeId=${resumeId}&country=${country}`);
      return res.data;
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (params: {
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    }) => {
      const res = await api.post("/payments/verify", { ...params, resumeId });
      return res.data;
    },
    onSuccess: () => { onSuccess(); onClose(); },
    onError: () => setError("Payment verification failed. Please contact support."),
  });

  const handlePay = async () => {
    setError("");
    const order = await createOrderMutation.mutateAsync();

    if (order.orderId?.startsWith("admin_bypass_") || order.amount === 0) {
      onSuccess();
      onClose();
      return;
    }

    const loaded = await loadRazorpayScript();
    if (!loaded) { setError("Failed to load payment gateway. Please try again."); return; }

    const options = {
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: "Rolevo",
      description: "Optimized Resume Download",
      order_id: order.orderId,
      handler: (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) => {
        verifyMutation.mutate({
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        });
      },
      prefill: {},
      theme: { color: "#4F46E5" },
      modal: { ondismiss: () => setError("") },
    };

    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", () => setError("Payment failed. Please try again."));
    rzp.open();
  };

  const isPaying = createOrderMutation.isPending || verifyMutation.isPending;

  return (
    <Modal open={open} onClose={onClose} title="Unlock Full Resume">
      <div className="space-y-4">
        {/* What you get */}
        <div
          className="rounded-[4px] border-2 border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 p-4 space-y-2"
          style={{ boxShadow: "3px 3px 0 #6366f1" }}
        >
          <p className="text-xs font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-wide mb-2">What you get:</p>
          {[
            "AI-optimized, ATS-ready resume",
            "Complete multi-page resume",
            "PDF download",
            "Professional formatting",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 text-xs font-medium text-indigo-800 dark:text-indigo-300">
              <CheckCircle className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              {item}
            </div>
          ))}
        </div>

        {/* Price */}
        <div className="rounded-[4px] border-2 border-black dark:border-[#30363d] bg-white dark:bg-[#161b22] p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-black text-black dark:text-white uppercase tracking-wide">One-time payment</p>
            <p className="text-xs font-medium text-gray-500 dark:text-[#8b949e]">
              {country === "IN" ? "Includes 8% cess" : "Includes 25% international cess"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-black dark:text-white">
              {country === "IN" ? "₹54" : "$0.76"}
            </p>
            <p className="text-xs font-medium text-gray-400 dark:text-[#8b949e]">
              {country === "IN" ? "INR" : "USD equivalent"}
            </p>
          </div>
        </div>

        {/* Security notices */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-[#8b949e]">
            <Lock className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            Secured by Razorpay · 256-bit SSL encryption
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-[#8b949e]">
            <Shield className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            One-time charge · No subscription · No auto-renewal
          </div>
        </div>

        {error && (
          <div className="rounded-[4px] border-2 border-red-500 bg-red-50 dark:bg-red-900/20 p-3 text-sm font-bold text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={isPaying}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handlePay} loading={isPaying}>
            <CreditCard className="h-4 w-4" />
            Pay &amp; Download
          </Button>
        </div>
      </div>
    </Modal>
  );
}
