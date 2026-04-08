"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Shield, CreditCard, Lock, CheckCircle } from "lucide-react";
import type { PaymentOrder } from "@/types";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
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
    const loaded = await loadRazorpayScript();
    if (!loaded) { setError("Failed to load payment gateway. Please try again."); return; }

    const order = await createOrderMutation.mutateAsync();

    const options = {
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: "Kaddy Auto Apply",
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
      <div className="space-y-5">
        {/* What you get */}
        <div className="rounded-lg bg-indigo-50 p-4 space-y-2">
          <p className="font-semibold text-indigo-900">What you get:</p>
          {[
            "AI-optimized, ATS-ready resume",
            "Complete multi-page resume",
            "PDF download",
            "Professional formatting",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm text-indigo-800">
              <CheckCircle className="h-4 w-4 text-indigo-600 shrink-0" />
              {item}
            </div>
          ))}
        </div>

        {/* Pricing */}
        <div className="rounded-lg border border-gray-200 p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900">One-time payment</p>
            <p className="text-xs text-gray-500">
              {country === "IN" ? "Includes 8% cess" : "Includes 25% international cess"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">
              {country === "IN" ? "₹54" : "$0.76"}
            </p>
            <p className="text-xs text-gray-400">
              {country === "IN" ? "INR" : "USD equivalent"}
            </p>
          </div>
        </div>

        {/* Security note */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Lock className="h-4 w-4 text-gray-400 shrink-0" />
          Secured by Razorpay · 256-bit SSL encryption
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Shield className="h-4 w-4 text-gray-400 shrink-0" />
          One-time charge · No subscription · No auto-renewal
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>
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
