"use client";

import { useState } from "react";
import { useCoverLetters } from "@/hooks/useCoverLetters";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Mail, Loader2, Eye, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { CoverLetter } from "@/types";
import Link from "next/link";

export default function CoverLettersPage() {
  const [page, setPage] = useState(0);
  const { data, isLoading } = useCoverLetters(page);
  const queryClient = useQueryClient();
  const [viewing, setViewing] = useState<CoverLetter | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/cover-letters/${id}`);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["cover-letters"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-black dark:text-white uppercase tracking-tight">
            Cover Letters
          </h1>
          <p className="text-sm text-gray-500 dark:text-[#8b949e] font-medium mt-0.5">
            AI-generated cover letters for your applications
          </p>
        </div>
        <Link
          href="/jobs"
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-black uppercase tracking-wide rounded-[3px] border-2 border-black dark:border-white nb-shadow nb-lift"
        >
          <Mail className="h-3.5 w-3.5" />
          Generate New
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : data?.content && data.content.length > 0 ? (
        <>
          <div className="space-y-3">
            {data.content.map((cl) => (
              <Card key={cl.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-black text-black dark:text-white text-sm uppercase tracking-wide">
                          {cl.jobTitle || "Untitled"}
                        </h3>
                        <Badge className="bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 border-gray-400 dark:border-gray-600 text-[10px]">
                          {cl.aiProvider}
                        </Badge>
                      </div>
                      <p className="text-xs font-medium text-gray-500 dark:text-[#8b949e]">
                        {cl.company} · {formatDate(cl.createdAt)}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-[#8b949e] mt-2 line-clamp-2 font-medium">
                        {cl.content.substring(0, 200)}...
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewing(cl)}
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(cl.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {data.totalPages > 1 && (
            <div className="flex justify-center items-center gap-3 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Previous
              </Button>
              <span className="px-3 py-1.5 text-xs font-black text-black dark:text-[#c9d1d9] uppercase tracking-wide border-2 border-black dark:border-[#30363d] rounded-[3px] bg-white dark:bg-[#161b22]">
                {page + 1} / {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages - 1}
                onClick={() => setPage(page + 1)}
              >
                Next
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center py-16 gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-[4px] border-2 border-black dark:border-white bg-indigo-50 dark:bg-indigo-600/10" style={{ boxShadow: "4px 4px 0 #000" }}>
            <Mail className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-black text-black dark:text-white uppercase tracking-tight">
              No cover letters yet
            </h3>
            <p className="text-sm text-gray-500 dark:text-[#8b949e] font-medium mt-1 max-w-xs">
              Generate one by finding a job and clicking &ldquo;Quick Apply&rdquo;
            </p>
          </div>
          <Link
            href="/jobs"
            className="px-4 py-2 bg-indigo-600 text-white text-xs font-black uppercase tracking-wide rounded-[3px] border-2 border-black dark:border-white nb-shadow nb-lift flex items-center gap-1.5"
          >
            <Mail className="h-3.5 w-3.5" />
            Find Jobs & Generate
          </Link>
        </div>
      )}

      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing ? `Cover Letter — ${viewing.jobTitle}` : ""}
      >
        {viewing && (
          <div className="max-h-96 overflow-y-auto">
            <p className="text-xs font-bold text-gray-500 dark:text-[#8b949e] mb-3 uppercase tracking-wide">
              {viewing.company} · Generated by {viewing.aiProvider}
            </p>
            <div className="text-sm text-gray-700 dark:text-[#c9d1d9] whitespace-pre-line font-medium leading-relaxed">
              {viewing.content}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
