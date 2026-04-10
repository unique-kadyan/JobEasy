"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Link from "next/link";

export default function SignupForm() {
  const { signup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signup(name, email, password);
    } catch (err: any) {
      setError(err.message || "Signup failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <Input
        label="Full Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="John Doe"
        required
      />
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
        placeholder="Min 6 characters"
        minLength={6}
        required
      />
      <Button type="submit" loading={loading} className="w-full" size="lg">
        Create Account
      </Button>
      <p className="text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
          Sign in
        </Link>
      </p>
    </form>
  );
}
