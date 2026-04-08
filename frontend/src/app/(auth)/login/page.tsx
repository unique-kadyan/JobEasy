"use client";

import LoginForm from "@/components/auth/LoginForm";
import { Zap } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 bg-indigo-600 items-center justify-center p-12">
        <div className="text-white max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <Zap className="h-10 w-10" />
            <span className="text-3xl font-bold">Kaddy</span>
          </div>
          <h1 className="text-4xl font-bold mb-4">
            Land Your Dream Job with AI
          </h1>
          <p className="text-indigo-200 text-lg">
            Auto-apply to jobs with AI-generated cover letters customized for
            every position. Search Indeed & LinkedIn, generate personalized
            applications, and track everything in one place.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
            <div className="bg-indigo-500/30 rounded-lg p-3">
              <div className="font-bold text-2xl">10x</div>
              <div className="text-indigo-200">Faster Applications</div>
            </div>
            <div className="bg-indigo-500/30 rounded-lg p-3">
              <div className="font-bold text-2xl">AI</div>
              <div className="text-indigo-200">Cover Letters</div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <Zap className="h-8 w-8 text-indigo-600" />
            <span className="text-2xl font-bold text-gray-900">Kaddy</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back
          </h2>
          <p className="text-gray-500 mb-6">
            Sign in to continue your job search
          </p>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
