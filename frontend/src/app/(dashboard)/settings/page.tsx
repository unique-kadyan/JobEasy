"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import RefundModal from "@/components/subscription/RefundModal";
import { User, Save, CheckCircle, ReceiptText } from "@/components/ui/icons";

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [location, setLocation] = useState(user?.location || "");
  const [title, setTitle] = useState(user?.title || "");
  const [summary, setSummary] = useState(user?.summary || "");
  const [saved, setSaved] = useState(false);
  const [showRefund, setShowRefund] = useState(false);

  const isPaidTier = user?.subscriptionTier === "GOLD" || user?.subscriptionTier === "PLATINUM";

  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await api.put("/users/profile", data);
      return res.data;
    },
    onSuccess: (data) => {
      setUser(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const handleSave = () => {
    updateMutation.mutate({ name, phone, location, title, summary });
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#1d1d1f] dark:text-white">Settings</h1>
        <p className="text-sm text-[#86868b] dark:text-[#8e8e93] mt-0.5">Manage your profile and preferences</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-semibold text-[#1d1d1f] dark:text-white">Profile</h2>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              label="Email"
              value={user?.email || ""}
              disabled
              className="opacity-50"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
            />
            <Input
              label="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="San Francisco, CA"
            />
          </div>
          <Input
            label="Job Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Senior Software Engineer"
          />
          <div>
            <label className="block text-xs font-medium text-[#86868b] dark:text-[#8e8e93] mb-1.5">
              Professional Summary
            </label>
            <textarea
              className="block w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1c1c1e] text-[#1d1d1f] dark:text-white px-3 py-2 text-sm nb-input-focus placeholder:text-[#86868b]"
              rows={4}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief summary of your experience and goals..."
            />
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleSave} loading={updateMutation.isPending}>
              <Save className="h-4 w-4" /> Save Changes
            </Button>
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                <CheckCircle className="h-4 w-4" /> Saved
              </span>
            )}
          </div>
        </CardContent>
      </Card>
      {isPaidTier && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ReceiptText className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-semibold text-[#1d1d1f] dark:text-white">Refund Policy</h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-[#86868b] dark:text-[#8e8e93]">
              You can request a refund within <span className="font-medium text-[#1d1d1f] dark:text-white">7 days</span> of subscribing.
              The refund amount is calculated as your subscription fee minus the cost of features you have already used.
            </p>
            <div className="text-xs text-[#86868b] dark:text-[#8e8e93] space-y-1">
              <p>Feature costs deducted from refund:</p>
              <ul className="list-disc list-inside space-y-0.5 pl-1">
                <li>Cover letter generated — ₹15 each</li>
                <li>Smart resume generated — ₹30 each</li>
                <li>Career path analysis — ₹50 each</li>
                <li>Auto-apply submission — ₹8 each</li>
                <li>Mock interview session — ₹25 each</li>
                <li>Resume translate / optimize — ₹20 each</li>
              </ul>
            </div>
            <Button variant="outline" onClick={() => setShowRefund(true)}>
              <ReceiptText className="h-4 w-4" />
              Check Refund Eligibility
            </Button>
          </CardContent>
        </Card>
      )}

      {showRefund && <RefundModal onClose={() => setShowRefund(false)} />}
    </div>
  );
}
