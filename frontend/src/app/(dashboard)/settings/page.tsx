"use client";

import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { User, Save, CheckCircle } from "lucide-react";

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [location, setLocation] = useState(user?.location || "");
  const [title, setTitle] = useState(user?.title || "");
  const [summary, setSummary] = useState(user?.summary || "");
  const [saved, setSaved] = useState(false);

  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await api.put("/users/profile", data);
      return res.data;
    },
    onSuccess: (data) => {
      setUser(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const handleSave = () => {
    updateMutation.mutate({ name, phone, location, title, summary });
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-black text-black dark:text-white uppercase tracking-tight">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-[#8b949e] font-medium mt-0.5">Manage your profile and preferences</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-indigo-600" />
            <h2 className="font-black text-black dark:text-white uppercase tracking-wide text-sm">Profile</h2>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              label="Email"
              value={user?.email || ""}
              disabled
              className="bg-gray-50"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
            />
            <Input
              label="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="San Francisco, CA"
            />
          </div>
          <Input
            label="Job Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Senior Software Engineer"
          />
          <div>
            <label className="block text-xs font-black text-black dark:text-white uppercase tracking-wider mb-1.5">
              Professional Summary
            </label>
            <textarea
              className="block w-full rounded-[4px] border-2 border-black dark:border-[#30363d] bg-white dark:bg-[#0d1117] text-black dark:text-white px-3 py-2 text-sm font-medium nb-input-focus"
              rows={4}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief summary of your experience and goals..."
            />
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleSave} loading={updateMutation.isPending}>
              <Save className="h-4 w-4" /> Save Changes
            </Button>
            {saved && (
              <span className="flex items-center gap-1 text-xs font-black text-green-600 dark:text-green-400 uppercase tracking-wide border border-green-400 rounded-[3px] px-2 py-1 bg-green-50 dark:bg-green-900/20">
                <CheckCircle className="h-3.5 w-3.5" /> Saved
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
