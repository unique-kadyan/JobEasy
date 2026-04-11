"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import api from "@/lib/api";
import Button from "@/components/ui/Button";
import { Zap, CheckCircle, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token provided.");
      return;
    }

    api
      .get(`/auth/verify-email?token=${token}`)
      .then(() => {
        setStatus("success");
        setMessage("Your email has been verified successfully!");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err.message || "Verification failed. The link may have expired.");
      });
  }, [token]);

  return (
    <>
      {status === "loading" && (
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-[#8b949e]">Verifying your email...</p>
        </div>
      )}

      {status === "success" && (
        <div className="space-y-4 text-center">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-[4px] border-2 border-green-500 bg-green-50 dark:bg-green-900/20 mx-auto"
            style={{ boxShadow: "3px 3px 0 #22c55e" }}
          >
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-black text-black dark:text-white uppercase tracking-tight">Email Verified!</h1>
          <p className="text-sm font-medium text-gray-500 dark:text-[#8b949e]">{message}</p>
          <Link href="/login">
            <Button size="lg" className="mt-4">
              Sign In to Your Account
            </Button>
          </Link>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-4 text-center">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-[4px] border-2 border-red-500 bg-red-50 dark:bg-red-900/20 mx-auto"
            style={{ boxShadow: "3px 3px 0 #ef4444" }}
          >
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-black text-black dark:text-white uppercase tracking-tight">Verification Failed</h1>
          <p className="text-sm font-medium text-gray-500 dark:text-[#8b949e]">{message}</p>
          <div className="flex gap-3 justify-center mt-4">
            <Link href="/login">
              <Button variant="outline">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button>Sign Up Again</Button>
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

export default function VerifyEmailPage() {
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
              <div className="space-y-4 text-center">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto" />
                <p className="text-sm font-medium text-gray-500 dark:text-[#8b949e]">Loading...</p>
              </div>
            }
          >
            <VerifyEmailContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
