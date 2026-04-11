"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Link from "next/link";

export default function LoginForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-[4px] border-2 border-red-500 bg-red-50 dark:bg-red-900/20 p-3 text-sm font-bold text-red-700 dark:text-red-400">
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
      <Input
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Enter your password"
        required
      />
      <div className="flex justify-end">
        <Link
          href="/forgot-password"
          className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline uppercase tracking-wide"
        >
          Forgot password?
        </Link>
      </div>
      <Button type="submit" loading={loading} className="w-full" size="lg">
        Sign In
      </Button>
      <p className="text-center text-sm font-medium text-gray-500 dark:text-[#8b949e]">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-black text-indigo-600 dark:text-indigo-400 hover:underline">
          Sign up
        </Link>
      </p>
    </form>
  );
}
