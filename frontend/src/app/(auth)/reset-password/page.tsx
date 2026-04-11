"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import api from "@/lib/api";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { Zap, CheckCircle, XCircle, Loader2, KeyRound } from "@/components/ui/icons";
import Link from "next/link";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-[4px] border-2 border-red-500 bg-red-50 dark:bg-red-900/20 mx-auto"
          style={{ boxShadow: "3px 3px 0 #ef4444" }}
        >
          <XCircle className="h-8 w-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-black text-black dark:text-white uppercase tracking-tight">Invalid Reset Link</h1>
        <p className="text-sm font-medium text-gray-500 dark:text-[#8b949e]">This password reset link is invalid or has expired.</p>
        <Link href="/forgot-password">
          <Button className="mt-4">Request New Reset Link</Button>
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/reset-password", {
        token,
        newPassword: password,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Reset failed. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-[4px] border-2 border-green-500 bg-green-50 dark:bg-green-900/20 mx-auto"
          style={{ boxShadow: "3px 3px 0 #22c55e" }}
        >
          <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <h1 className="text-2xl font-black text-black dark:text-white uppercase tracking-tight">Password Reset!</h1>
        <p className="text-sm font-medium text-gray-500 dark:text-[#8b949e]">Your password has been successfully reset.</p>
        <Link href="/login">
          <Button size="lg" className="mt-4">
            Sign In with New Password
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-black text-black dark:text-white uppercase tracking-tight mb-2">Set New Password</h1>
      <p className="text-sm font-medium text-gray-500 dark:text-[#8b949e] mb-6">Enter your new password below.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-[4px] border-2 border-red-500 bg-red-50 dark:bg-red-900/20 p-3 text-sm font-bold text-red-700 dark:text-red-400">
            {error}
          </div>
        )}
        <Input
          label="New Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min 6 characters"
          minLength={6}
          required
        />
        <Input
          label="Confirm Password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Re-enter password"
          required
        />
        <Button type="submit" loading={loading} className="w-full" size="lg">
          <KeyRound className="h-4 w-4" />
          Reset Password
        </Button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f2ea] dark:bg-[#0d1117] p-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-[4px] bg-indigo-600 border-2 border-black"
            style={{ boxShadow: "3px 3px 0 #000" }}
          >
            <Zap className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-black text-black dark:text-white uppercase tracking-tight">Rolevo</span>
          <span className="text-[10px] bg-black dark:bg-white text-white dark:text-black px-1.5 py-0.5 rounded-[2px] font-black uppercase tracking-widest">AI</span>
        </div>

        <div
          className="rounded-[4px] border-2 border-black dark:border-white bg-white dark:bg-[#161b22] p-8"
          style={{ boxShadow: "6px 6px 0 #000" }}
        >
          <Suspense
            fallback={
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              </div>
            }
          >
            <ResetPasswordContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
