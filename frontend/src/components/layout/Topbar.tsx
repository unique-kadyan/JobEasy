"use client";

import { useAuth } from "@/hooks/useAuth";
import { LogOut, User } from "lucide-react";
import Button from "@/components/ui/Button";

export default function Topbar() {
  const { user, logout } = useAuth();

  return (
    <header className="fixed top-0 left-64 right-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div>
        <h2 className="text-sm text-gray-500">Welcome back,</h2>
        <p className="text-sm font-semibold text-gray-900">{user?.name || "User"}</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
            <User className="h-4 w-4" />
          </div>
          <span className="font-medium">{user?.name}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={logout}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
