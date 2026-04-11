"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import type { RefundEligibility } from "@/types";
import { X, AlertCircle, CheckCircle, Clock, Loader2, ReceiptText } from "@/components/ui/icons";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const FEATURE_LABELS: Record<string, string> = {
  COVER_LETTER_GENERATED: "Cover Letter",
  SMART_RESUME_GENERATED: "Smart Resume",
  CAREER_PATH_ANALYZED: "Career Path",
  AUTO_APPLY_SUBMITTED: "Auto-Apply",
  MOCK_INTERVIEW_SESSION: "Mock Interview",
  RESUME_TRANSLATED: "Resume Translate",
  RESUME_OPTIMIZED: "Resume Optimize",
};

interface Props {
  onClose: () => void;
}

export default function RefundModal({ onClose }: Props) {
  const [confirmed, setConfirmed] = useState(false);
  const [refundDone, setRefundDone] = useState(false);
  const [refundMessage, setRefundMessage] = useState("");

  const { data: eligibility, isLoading } = useQuery<RefundEligibility>({
    queryKey: ["refund-eligibility"],
    queryFn: () => api.get("/subscriptions/refund-eligibility").then((r) => r.data),
  });

  const refundMutation = useMutation({
    mutationFn: () => api.post("/subscriptions/request-refund"),
    onSuccess: (res) => {
      setRefundDone(true);
      setRefundMessage(res.data.message ?? "Refund processed successfully.");
    },
  });

  const fmt = (paise: number) => `₹${(paise / 100).toFixed(0)}`;
  const fmtDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1c1c1e] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div className="flex items-center gap-2">
            <ReceiptText className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-semibold text-[#1d1d1f] dark:text-white">Refund Request</h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#86868b] dark:text-[#8e8e93] hover:text-[#1d1d1f] dark:hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {isLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            </div>
          )}

          {refundDone && (
            <div className="space-y-3 text-center py-4">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <p className="text-sm font-medium text-[#1d1d1f] dark:text-white">{refundMessage}</p>
              <Button onClick={onClose} className="mt-2">Close</Button>
            </div>
          )}

          {!isLoading && !refundDone && eligibility && (
            <>
              {/* Window info */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-[#f5f5f7] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08]">
                <Clock className="h-4 w-4 text-[#86868b] shrink-0 mt-0.5" />
                <div className="text-xs text-[#86868b] dark:text-[#8e8e93] space-y-0.5">
                  <p>Subscription started: <span className="font-medium text-[#1d1d1f] dark:text-white">{fmtDate(eligibility.subscriptionStartDate)}</span></p>
                  <p>Refund window ends: <span className="font-medium text-[#1d1d1f] dark:text-white">{fmtDate(eligibility.refundWindowEndsAt)}</span></p>
                </div>
              </div>

              {/* Breakdown */}
              <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] overflow-hidden">
                <div className="px-4 py-2.5 bg-[#f5f5f7] dark:bg-white/[0.04] border-b border-black/[0.06] dark:border-white/[0.08]">
                  <p className="text-xs font-medium text-[#86868b] dark:text-[#8e8e93] uppercase tracking-wider">Usage Breakdown</p>
                </div>
                <div className="divide-y divide-black/[0.04] dark:divide-white/[0.06]">
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-xs text-[#1d1d1f] dark:text-white font-medium">Subscription paid</span>
                    <span className="text-xs font-semibold text-[#1d1d1f] dark:text-white">{fmt(eligibility.subscriptionAmountPaise)}</span>
                  </div>
                  {eligibility.usageSummary.length === 0 ? (
                    <div className="px-4 py-2.5">
                      <span className="text-xs text-[#86868b] dark:text-[#8e8e93]">No features used yet</span>
                    </div>
                  ) : (
                    eligibility.usageSummary.map((u) => (
                      <div key={u.featureType} className="flex justify-between px-4 py-2 text-xs">
                        <span className="text-[#86868b] dark:text-[#8e8e93]">
                          {FEATURE_LABELS[u.featureType] ?? u.featureType}
                          <span className="ml-1 text-[10px]">×{u.count}</span>
                        </span>
                        <span className="text-red-500 dark:text-red-400">−{fmt(u.totalCostPaise)}</span>
                      </div>
                    ))
                  )}
                  <div className="flex justify-between px-4 py-2.5 bg-[#f5f5f7] dark:bg-white/[0.04]">
                    <span className="text-xs font-semibold text-[#1d1d1f] dark:text-white">Refund amount</span>
                    <span className={cn(
                      "text-xs font-bold",
                      eligibility.eligible ? "text-green-600 dark:text-green-400" : "text-[#86868b]"
                    )}>
                      {fmt(eligibility.refundAmountPaise)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className={cn(
                "flex items-start gap-2.5 p-3 rounded-xl text-xs",
                eligibility.eligible
                  ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                  : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
              )}>
                {eligibility.eligible
                  ? <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                  : <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />}
                <p className={eligibility.eligible
                  ? "text-green-700 dark:text-green-300"
                  : "text-red-600 dark:text-red-400"}>
                  {eligibility.reason}
                </p>
              </div>

              {eligibility.eligible && (
                <>
                  {!confirmed ? (
                    <div className="space-y-2">
                      <p className="text-xs text-[#86868b] dark:text-[#8e8e93]">
                        Requesting a refund will immediately cancel your subscription. Your account will revert to the Free plan.
                      </p>
                      <Button
                        className="w-full"
                        onClick={() => setConfirmed(true)}
                      >
                        Request {fmt(eligibility.refundAmountPaise)} Refund
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-[#1d1d1f] dark:text-white">
                        Are you sure? This will cancel your subscription immediately.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => setConfirmed(false)}
                        >
                          Go Back
                        </Button>
                        <Button
                          className="flex-1 bg-red-600 hover:bg-red-700"
                          loading={refundMutation.isPending}
                          onClick={() => refundMutation.mutate()}
                        >
                          Confirm Refund
                        </Button>
                      </div>
                      {refundMutation.isError && (
                        <p className="text-xs text-red-500">
                          {(refundMutation.error as any)?.message ?? "Refund failed. Please try again."}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}

              {!eligibility.eligible && (
                <Button variant="outline" className="w-full" onClick={onClose}>Close</Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
