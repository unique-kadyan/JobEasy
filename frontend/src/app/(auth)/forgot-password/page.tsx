"use client";

import { useState } from "react";
import api from "@/lib/api";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { Zap, Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";

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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-8">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Zap className="h-8 w-8 text-indigo-600" />
          <span className="text-2xl font-bold text-gray-900">Kaddy</span>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mx-auto">
              <Mail className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Check Your Email</h1>
            <p className="text-gray-600">
              If an account exists with <strong>{email}</strong>, we&apos;ve sent a
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
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Forgot your password?
            </h1>
            <p className="text-gray-500 mb-6">
              Enter your email and we&apos;ll send you a reset link.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
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
                Send Reset Link
              </Button>
              <p className="text-center text-sm text-gray-500">
                <Link
                  href="/login"
                  className="font-medium text-indigo-600 hover:text-indigo-500"
                >
                  <ArrowLeft className="h-3 w-3 inline mr-1" />
                  Back to Sign In
                </Link>
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
