"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import api from "@/lib/api";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { CheckCircle, Upload, Target, Rocket, Loader2 } from "lucide-react";

const STEPS = ["Upload Resume", "Your Goals", "All Set!"];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();

  const [step, setStep] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [targetRoles, setTargetRoles] = useState(
    (user?.preferences as Record<string, unknown> & { targetRoles?: string[] })?.targetRoles?.join(", ") ?? ""
  );
  const [location, setLocation] = useState(user?.location ?? "");
  const [savingGoals, setSavingGoals] = useState(false);

  const [completing, setCompleting] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadError("");
    try {
      const form = new FormData();
      form.append("file", file);
      await api.post("/resumes/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadDone(true);
    } catch {
      setUploadError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleGoals = async () => {
    setSavingGoals(true);
    try {
      const roles = targetRoles
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean);
      await api.put("/users/profile", { targetRoles: roles, location: location.trim() || undefined });
    } catch {

    } finally {
      setSavingGoals(false);
      setStep(2);
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      const res = await api.post("/users/onboarding/complete");
      if (user) setUser({ ...user, ...res.data, onboardingCompleted: true });
    } catch {
      if (user) setUser({ ...user, onboardingCompleted: true });
    } finally {
      setCompleting(false);
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-lg">

        <div className="flex items-center justify-between mb-8">
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1 flex flex-col items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-colors ${
                i < step ? "bg-indigo-600 text-white" : i === step ? "bg-indigo-100 text-indigo-700 ring-2 ring-indigo-600" : "bg-gray-200 text-gray-400"
              }`}>
                {i < step ? <CheckCircle className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`mt-1 text-xs text-center ${i === step ? "text-indigo-700 font-medium" : "text-gray-400"}`}>{label}</span>
              {i < STEPS.length - 1 && (
                <div className={`absolute hidden`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">

          {step === 0 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <Upload className="h-10 w-10 text-indigo-500 mx-auto" />
                <h2 className="text-xl font-bold text-gray-900">Upload your resume</h2>
                <p className="text-sm text-gray-500">
                  We&apos;ll auto-detect your skills and pre-fill your job search. PDF, DOC, or DOCX.
                </p>
              </div>

              {uploadDone ? (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg px-4 py-3 text-sm">
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  Resume uploaded successfully!
                </div>
              ) : (
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                >
                  {uploading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mx-auto" />
                  ) : (
                    <>
                      <p className="text-sm text-gray-500">Click to browse or drag & drop</p>
                      <p className="text-xs text-gray-400 mt-1">PDF · DOC · DOCX · up to 10 MB</p>
                    </>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                  />
                </div>
              )}

              {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                  Skip for now
                </Button>
                <Button className="flex-1" disabled={!uploadDone} onClick={() => setStep(1)}>
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <Target className="h-10 w-10 text-indigo-500 mx-auto" />
                <h2 className="text-xl font-bold text-gray-900">Set your job goals</h2>
                <p className="text-sm text-gray-500">
                  Tell us what you&apos;re looking for — we&apos;ll use this to personalise your job feed.
                </p>
              </div>

              <Input
                label="Target roles (comma-separated)"
                placeholder="e.g. Backend Engineer, Full Stack Developer"
                value={targetRoles}
                onChange={(e) => setTargetRoles(e.target.value)}
              />
              <Input
                label="Preferred location"
                placeholder="e.g. Bangalore, Remote, United States"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStep(0)}>
                  Back
                </Button>
                <Button className="flex-1" loading={savingGoals} onClick={handleGoals}>
                  Save & Continue
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 text-center">
              <Rocket className="h-12 w-12 text-indigo-500 mx-auto" />
              <h2 className="text-xl font-bold text-gray-900">You&apos;re all set!</h2>
              <p className="text-sm text-gray-500">
                Your profile is ready. Start searching jobs, generate AI cover letters, and apply in one click.
              </p>
              <Button className="w-full" loading={completing} onClick={handleComplete}>
                Go to Dashboard
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
