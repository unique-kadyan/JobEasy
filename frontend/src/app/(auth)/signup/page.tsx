"use client";

import SignupForm from "@/components/auth/SignupForm";
import { Zap } from "lucide-react";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 bg-indigo-600 items-center justify-center p-12">
        <div className="text-white max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <Zap className="h-10 w-10" />
            <span className="text-3xl font-bold">Kaddy</span>
          </div>
          <h1 className="text-4xl font-bold mb-4">
            Start Your Job Search Today
          </h1>
          <p className="text-indigo-200 text-lg">
            Join thousands of job seekers using AI to automate their
            applications. Upload your resume, find matching jobs, and apply with
            one click.
          </p>
        </div>
      </div>
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <Zap className="h-8 w-8 text-indigo-600" />
            <span className="text-2xl font-bold text-gray-900">Kaddy</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Create your account
          </h2>
          <p className="text-gray-500 mb-6">
            Get started with your AI-powered job search
          </p>
          <SignupForm />
        </div>
      </div>
    </div>
  );
}
