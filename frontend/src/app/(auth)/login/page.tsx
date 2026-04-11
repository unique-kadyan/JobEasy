"use client";

import LoginForm from "@/components/auth/LoginForm";
import { Zap, Sparkles, Send, TrendingUp } from "@/components/ui/icons";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen bg-[#f5f2ea] dark:bg-[#0d1117]">
      <div className="hidden lg:flex lg:w-1/2 bg-indigo-600 items-center justify-center p-12 border-r-2 border-black dark:border-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 border-2 border-white rotate-12" />
          <div className="absolute bottom-20 right-10 w-24 h-24 border-2 border-white -rotate-6" />
          <div className="absolute top-1/2 left-1/4 w-16 h-16 border-2 border-white rotate-45" />
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
            Land Your Dream Job with AI
          </h1>
          <p className="text-indigo-200 text-base font-medium leading-relaxed">
            Auto-apply to jobs with AI-generated cover letters customized for
            every position. Search Indeed & LinkedIn, generate personalized
            applications, and track everything in one place.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-3">
            {[
              { icon: Send, label: "Auto Apply", stat: "10x" },
              { icon: Sparkles, label: "AI Cover Letters", stat: "AI" },
              { icon: TrendingUp, label: "Track Progress", stat: "📊" },
            ].map((item) => (
              <div key={item.label} className="bg-white/10 border-2 border-white/30 rounded-[4px] p-3 text-center">
                <item.icon className="h-5 w-5 mx-auto mb-1 text-white" />
                <div className="font-black text-xl">{item.stat}</div>
                <div className="text-indigo-200 text-xs font-bold uppercase tracking-wide">{item.label}</div>
              </div>
            ))}
          </div>
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
            Welcome back
          </h2>
          <p className="text-sm font-medium text-gray-500 dark:text-[#8b949e] mb-6">
            Sign in to continue your job search
          </p>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
