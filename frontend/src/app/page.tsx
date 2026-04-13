"use client";

import Link from "next/link";
import { Zap, Search, Mail, Send, BarChart3, ArrowRight } from "@/components/ui/icons";
import Button from "@/components/ui/Button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Zap className="h-7 w-7 text-indigo-600" />
            <span className="text-xl font-bold text-gray-900">Rolevo</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-700">
          <Zap className="h-4 w-4" /> AI-Powered Job Applications
        </div>
        <h1 className="mb-6 text-5xl leading-tight font-bold text-gray-900 md:text-6xl">
          Land Your Dream Job
          <br />
          <span className="text-indigo-600">10x Faster</span>
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-xl text-gray-500">
          Search jobs from Indeed & LinkedIn, generate customized AI cover letters, and auto-apply
          with one click. Track every application in one dashboard.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/signup">
            <Button size="lg">
              Start Applying Free <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="lg">
              Sign In
            </Button>
          </Link>
        </div>
      </section>

      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-12 text-center text-3xl font-bold text-gray-900">How It Works</h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            {[
              {
                icon: Search,
                title: "Search Jobs",
                desc: "Browse Indeed & LinkedIn jobs from one place with smart filters and match scoring.",
              },
              {
                icon: Mail,
                title: "AI Cover Letter",
                desc: "Generate customized cover letters using Claude or GPT-4 tailored to each job post.",
              },
              {
                icon: Send,
                title: "One-Click Apply",
                desc: "Apply to jobs instantly with your resume and AI-generated cover letter attached.",
              },
              {
                icon: BarChart3,
                title: "Track & Analyze",
                desc: "Monitor applications with a dashboard. See your response rate and analytics.",
              },
            ].map((feature) => (
              <div key={feature.title} className="text-center">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">{feature.title}</h3>
                <p className="text-sm text-gray-500">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="mb-4 text-3xl font-bold text-gray-900">
            Ready to automate your job search?
          </h2>
          <p className="mb-8 text-lg text-gray-500">
            Join thousands of job seekers who use Rolevo to apply faster and smarter.
          </p>
          <Link href="/signup">
            <Button size="lg">
              Create Free Account <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-gray-100 py-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-indigo-600" />
            <span>Rolevo Auto Apply</span>
          </div>
          <p>&copy; 2026 KadyanIndustries. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
