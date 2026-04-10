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
        <div className="space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto" />
          <p className="text-gray-600">Verifying your email...</p>
        </div>
      )}

      {status === "success" && (
        <div className="space-y-4">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold text-gray-900">Email Verified!</h1>
          <p className="text-gray-600">{message}</p>
          <Link href="/login">
            <Button size="lg" className="mt-4">
              Sign In to Your Account
            </Button>
          </Link>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-4">
          <XCircle className="h-16 w-16 text-red-500 mx-auto" />
          <h1 className="text-2xl font-bold text-gray-900">Verification Failed</h1>
          <p className="text-gray-600">{message}</p>
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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-8">
      <div className="w-full max-w-md text-center">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Zap className="h-8 w-8 text-indigo-600" />
          <span className="text-2xl font-bold text-gray-900">Kaddy</span>
        </div>
        <Suspense
          fallback={
            <div className="space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto" />
              <p className="text-gray-600">Loading...</p>
            </div>
          }
        >
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
