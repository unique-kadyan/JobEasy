"use client";

import SignupForm from "@/components/auth/SignupForm";
import { Zap, CheckCircle } from "@/components/ui/icons";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen bg-[#f5f2ea] dark:bg-[#0d1117]">
      <div className="hidden lg:flex lg:w-1/2 bg-indigo-600 items-center justify-center p-12 border-r-2 border-black dark:border-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-10 w-32 h-32 border-2 border-white rotate-12" />
          <div className="absolute bottom-20 left-10 w-24 h-24 border-2 border-white -rotate-6" />
        </div>
        <div className="text-white max-w-md relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-[4px] bg-white border-2 border-black" style={{ boxShadow: "4px 4px 0 #000" }}>
              <Zap className="h-7 w-7 text-indigo-600" />
            </div>
            <span className="text-3xl font-black uppercase tracking-tight">Rolevo</span>
            <span className="text-xs bg-white text-indigo-600 px-2 py-0.5 rounded-[3px] font-black border-2 border-black uppercase tracking-widest">AI</span>
          </div>
          <h1 className="text-4xl font-black mb-4 uppercase tracking-tight leading-tight">
            Start Your Job Search Today
          </h1>
          <p className="text-indigo-200 text-base font-medium leading-relaxed mb-8">
            Join thousands of job seekers using AI to automate their
            applications. Upload your resume, find matching jobs, and apply with
            one click.
          </p>
          <ul className="space-y-3">
            {[
              "Free to start — no credit card required",
              "AI-generated cover letters in seconds",
              "Search Indeed, LinkedIn & more",
              "Track all applications in one place",
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-sm font-bold">
                <CheckCircle className="h-5 w-5 text-white shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8 bg-[#f5f2ea] dark:bg-[#0d1117]">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-[3px] bg-indigo-600 border-2 border-black" style={{ boxShadow: "3px 3px 0 #000" }}>
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-black text-black dark:text-white uppercase tracking-tight">Rolevo</span>
            <span className="text-xs bg-black dark:bg-white text-white dark:text-black px-1.5 py-0.5 rounded-[2px] font-black uppercase tracking-widest">AI</span>
          </div>
          <h2 className="text-2xl font-black text-black dark:text-white uppercase tracking-tight mb-2">
            Create your account
          </h2>
          <p className="text-sm font-medium text-gray-500 dark:text-[#8b949e] mb-6">
            Get started with your AI-powered job search
          </p>
          <SignupForm />
        </div>
      </div>
    </div>
  );
}
