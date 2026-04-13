"use client";

import Button from "@/components/ui/Button";
import { ArrowLeft, Mail, Send, Zap } from "@/components/ui/icons";
import Input from "@/components/ui/Input";
import api from "@/lib/api";
import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f2ea] p-8 dark:bg-[#0d1117]">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center gap-2">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-[4px] border-2 border-black bg-indigo-600"
            style={{ boxShadow: "3px 3px 0 #000" }}
          >
            <Zap className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-black tracking-tight text-black uppercase dark:text-white">
            Rolevo
          </span>
        </div>

        <div
          className="rounded-[4px] border-2 border-black bg-white p-8 dark:border-white dark:bg-[#161b22]"
          style={{ boxShadow: "6px 6px 0 #000" }}
        >
          {sent ? (
            <div className="space-y-4 text-center">
              <div
                className="mx-auto flex h-16 w-16 items-center justify-center rounded-[4px] border-2 border-green-500 bg-green-50 dark:bg-green-900/20"
                style={{ boxShadow: "3px 3px 0 #22c55e" }}
              >
                <Mail className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-2xl font-black tracking-tight text-black uppercase dark:text-white">
                Check Your Email
              </h1>
              <p className="text-sm font-medium text-gray-500 dark:text-[#8b949e]">
                If an account exists with{" "}
                <strong className="text-black dark:text-white">{email}</strong>, we&apos;ve sent a
                password reset link. Check your inbox (and spam folder).
              </p>
              <Link href="/login">
                <Button variant="outline" className="mt-4">
                  <ArrowLeft className="h-4 w-4" /> Back to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <h1 className="mb-2 text-2xl font-black tracking-tight text-black uppercase dark:text-white">
                Forgot your password?
              </h1>
              <p className="mb-6 text-sm font-medium text-gray-500 dark:text-[#8b949e]">
                Enter your email and we&apos;ll send you a reset link.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-[4px] border-2 border-red-500 bg-red-50 p-3 text-sm font-bold text-red-700 dark:bg-red-900/20 dark:text-red-400">
                    {error}
                  </div>
                )}
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
                <Button type="submit" loading={loading} className="w-full" size="lg">
                  <Send className="h-4 w-4" />
                  Send Reset Link
                </Button>
                <p className="text-center text-sm font-medium text-gray-500 dark:text-[#8b949e]">
                  <Link
                    href="/login"
                    className="font-black text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    <ArrowLeft className="mr-1 inline h-3 w-3" />
                    Back to Sign In
                  </Link>
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
