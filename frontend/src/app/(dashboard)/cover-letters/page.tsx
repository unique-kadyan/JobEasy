"use client";

import { useState } from "react";
import { useCoverLetters } from "@/hooks/useCoverLetters";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Mail, Loader2, Eye, Trash2, ChevronLeft, ChevronRight, Copy, Download } from "@/components/ui/icons";
import { formatDate } from "@/lib/utils";
import type { CoverLetter } from "@/types";
import Link from "next/link";

async function downloadCoverLetterPDF(text: string, filename = "cover-letter.pdf") {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 20;
  const lineHeight = 6.5;
  const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const lines = doc.splitTextToSize(text, maxWidth);
  let y = margin;
  for (const line of lines) {
    if (y + lineHeight > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
    doc.text(line, margin, y);
    y += lineHeight;
  }
  doc.save(filename);
}

export default function CoverLettersPage() {
  const [page, setPage] = useState(0);
  const { data, isLoading } = useCoverLetters(page);
  const queryClient = useQueryClient();
  const [viewing, setViewing] = useState<CoverLetter | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
          <h1 className="text-2xl font-semibold text-[#1d1d1f] dark:text-white">
            Cover Letters
          </h1>
          <p className="text-sm text-[#86868b] dark:text-[#8e8e93] mt-0.5">
            AI-generated cover letters for your applications
          </p>
        </div>
        <Link href="/jobs">
          <Button>
            <Mail className="h-4 w-4" />
            Generate New
          </Button>
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
                        <h3 className="text-sm font-semibold text-[#1d1d1f] dark:text-white">
                          {cl.jobTitle || "Untitled"}
                        </h3>
                        <Badge className="bg-[#f2f2f7] dark:bg-[#2c2c2e] text-[#86868b] dark:text-[#8e8e93] text-[10px]">
                          {cl.aiProvider}
                        </Badge>
                      </div>
                      <p className="text-xs text-[#86868b] dark:text-[#8e8e93]">
                        {cl.company} · {formatDate(cl.createdAt)}
                      </p>
                      <p className="text-xs text-[#6e6e73] dark:text-[#8e8e93] mt-2 line-clamp-2">
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
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(cl.content)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {copied ? "Copied!" : "Copy"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadCoverLetterPDF(cl.content, `cover-letter-${(cl.company ?? "").toLowerCase().replace(/\s+/g, "-")}.pdf`)}
                      >
                        <Download className="h-3.5 w-3.5" />
                        PDF
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
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </Button>
              <span className="px-3 py-1.5 text-xs font-medium text-[#86868b] dark:text-[#8e8e93] bg-[#f2f2f7] dark:bg-[#2c2c2e] rounded-full">
                {page + 1} / {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages - 1}
                onClick={() => setPage(page + 1)}
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center py-16 gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-600/10">
            <Mail className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#1d1d1f] dark:text-white">
              No cover letters yet
            </h3>
            <p className="text-sm text-[#86868b] dark:text-[#8e8e93] mt-1 max-w-xs">
              Generate one by finding a job and clicking &ldquo;Quick Apply&rdquo;
            </p>
          </div>
          <Link href="/jobs">
            <Button>
              <Mail className="h-4 w-4" />
              Find Jobs & Generate
            </Button>
          </Link>
        </div>
      )}

      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing ? `${viewing.jobTitle} — Cover Letter` : ""}
      >
        {viewing && (
          <div className="space-y-4">
            <p className="text-xs text-[#86868b] dark:text-[#8e8e93]">
              {viewing.company} · Generated by {viewing.aiProvider}
            </p>
            <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-[#f9f9f9] dark:bg-[#1c1c1e] p-4 max-h-80 overflow-y-auto text-sm text-[#1d1d1f] dark:text-[#e5e5ea] whitespace-pre-line leading-relaxed">
              {viewing.content}
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => downloadCoverLetterPDF(viewing.content, `cover-letter-${(viewing.company ?? "").toLowerCase().replace(/\s+/g, "-")}.pdf`)}
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
              <Button onClick={() => handleCopy(viewing.content)}>
                <Copy className="h-4 w-4" />
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
