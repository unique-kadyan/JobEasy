"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import Modal from "@/components/ui/Modal";
import { Crown, Zap, CheckCircle, AlertCircle } from "@/components/ui/icons";
import { useAuthStore } from "@/store/auth-store";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import ToggleButton from "@mui/material/ToggleButton";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";

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
    gradient: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
    glowColor: "rgba(245,158,11,0.25)",
    accentColor: "#f59e0b",
    features: [
      "Up to 10 job results per search",
      "All job sources (Indeed, LinkedIn, JSearch…)",
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
    gradient: "linear-gradient(135deg, #4f46e5 0%, #818cf8 100%)",
    glowColor: "rgba(99,102,241,0.25)",
    accentColor: "#6366f1",
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

export default function UpgradeModal({
  open,
  onClose,
  targetTier,
  billingCycle = "ANNUAL",
}: Props) {
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
      <Stack spacing={3}>
        <Typography variant="body2" color="text.secondary">
          Unlock more jobs and powerful automation features.
        </Typography>

        {/* Billing cycle toggle */}
        <Box>
          <ToggleButtonGroup
            value={cycle}
            exclusive
            onChange={(_, val) => val && setCycle(val)}
            size="small"
            sx={{
              "& .MuiToggleButton-root": {
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.8rem",
                px: 2,
                border: "1px solid",
                borderColor: "divider",
                "&.Mui-selected": {
                  bgcolor: "primary.main",
                  color: "white",
                  borderColor: "primary.main",
                  "&:hover": { bgcolor: "primary.dark" },
                },
              },
            }}
          >
            <ToggleButton value="ANNUAL">
              Annual
              <Chip
                label="Save 2 mo"
                size="small"
                color="success"
                sx={{ ml: 1, height: 18, fontSize: "0.6rem", fontWeight: 700 }}
              />
            </ToggleButton>
            <ToggleButton value="SEMI_ANNUAL">Semi-Annual</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Plan cards */}
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const highlighted = targetTier === plan.tier;
            const isProcessing = paying === plan.tier;

            return (
              <Box
                key={plan.tier}
                sx={{
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: highlighted ? plan.accentColor : "divider",
                  p: 2.5,
                  position: "relative",
                  overflow: "hidden",
                  transition: "all 0.2s ease",
                  boxShadow: highlighted
                    ? `0 0 0 2px ${plan.accentColor}40, 0 8px 24px ${plan.glowColor}`
                    : "0 1px 3px rgba(0,0,0,0.06)",
                  "&:hover": {
                    boxShadow: `0 0 0 2px ${plan.accentColor}60, 0 12px 32px ${plan.glowColor}`,
                    transform: "translateY(-2px)",
                  },
                  // gradient top border
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: plan.gradient,
                  },
                }}
              >
                {/* Header */}
                <Stack direction="row" alignItems="center" spacing={1.5} mb={0.75}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 2,
                      background: plan.gradient,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: `0 4px 12px ${plan.glowColor}`,
                    }}
                  >
                    <Icon style={{ fontSize: 18, color: "white" }} />
                  </Box>
                  <Box flex={1}>
                    <Typography variant="subtitle2" fontWeight={700}>
                      {plan.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ₹{plan.monthlyPrice}/mo
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={500}>
                    {cycleTotal(plan.monthlyPrice, cycle)}
                  </Typography>
                </Stack>

                <Divider sx={{ my: 1.5 }} />

                {/* Features */}
                <Stack spacing={1} mb={2}>
                  {plan.features.map((f) => (
                    <Stack key={f} direction="row" alignItems="flex-start" spacing={1}>
                      <CheckCircle
                        style={{ fontSize: 14, color: "#22c55e", marginTop: 2, flexShrink: 0 }}
                      />
                      <Typography variant="caption" color="text.secondary" lineHeight={1.5}>
                        {f}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>

                {/* CTA */}
                <Box
                  component="button"
                  disabled={paying !== null}
                  onClick={() => handleSubscribe(plan.tier)}
                  sx={{
                    width: "100%",
                    py: 1.25,
                    borderRadius: 2,
                    border: "none",
                    background: plan.gradient,
                    color: "white",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    cursor: paying !== null ? "not-allowed" : "pointer",
                    opacity: paying !== null ? 0.65 : 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 1,
                    transition: "all 0.15s ease",
                    boxShadow: `0 4px 14px ${plan.glowColor}`,
                    "&:hover:not(:disabled)": {
                      opacity: 0.9,
                      transform: "translateY(-1px)",
                      boxShadow: `0 6px 20px ${plan.glowColor}`,
                    },
                  }}
                >
                  {isProcessing && <CircularProgress size={14} color="inherit" />}
                  {isProcessing
                    ? "Processing…"
                    : `Subscribe — ${cycleTotal(plan.monthlyPrice, cycle)}`}
                </Box>
              </Box>
            );
          })}
        </Box>

        {error && (
          <Alert
            severity="error"
            variant="outlined"
            sx={{ borderRadius: 2 }}
            icon={<AlertCircle style={{ fontSize: 18 }} />}
          >
            {error}
          </Alert>
        )}

        <Typography variant="caption" color="text.disabled" textAlign="center">
          Payments secured by Razorpay. Cancel anytime.
        </Typography>
      </Stack>
    </Modal>
  );
}
