"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { FileText, Upload, Star, Trash2, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Resume } from "@/types";

export default function ResumesPage() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: resumes, isLoading } = useQuery<Resume[]>({
    queryKey: ["resumes"],
    queryFn: async () => {
      const res = await api.get("/resumes", { params: { page: 0, size: 20 } });
      return Array.isArray(res.data) ? res.data : (res.data.content ?? []);
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/resumes/upload", formData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resumes"] });
      toast.success("Resume uploaded successfully!");
    },
    onError: () => {
      toast.error("Failed to upload resume. Please try a valid PDF file.");
    },
  });

  const setPrimaryMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.put(`/resumes/${id}/primary`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["resumes"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/resumes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resumes"] });
      toast.success("Resume deleted.");
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadMutation.mutateAsync(file);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#1d1d1f] dark:text-white">
            Resumes
          </h1>
          <p className="text-sm text-[#86868b] dark:text-[#8e8e93] mt-0.5">
            Upload and manage your resumes
          </p>
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleUpload}
          />
          <Button onClick={() => fileRef.current?.click()} loading={uploading}>
            <Upload className="h-4 w-4" /> Upload PDF
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : resumes && resumes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resumes.map((resume) => (
            <Card key={resume.id}>
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-600/10 shrink-0">
                    <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-[#1d1d1f] dark:text-white truncate">
                        {resume.filename}
                      </p>
                      {resume.isPrimary && (
                        <Badge className="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 shrink-0">
                          <Star className="h-3 w-3 mr-1" /> Primary
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-[#86868b] dark:text-[#8e8e93] mt-0.5">
                      Uploaded {formatDate(resume.createdAt)}
                      {resume.fileSize &&
                        ` · ${(resume.fileSize / 1024).toFixed(0)} KB`}
                    </p>
                    {resume.parsedData?.skills &&
                      (() => {
                        const allSkills = Object.values(
                          resume.parsedData.skills
                        )
                          .flat()
                          .filter(Boolean) as string[];
                        return allSkills.length > 0 ? (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {allSkills.slice(0, 8).map((skill) => (
                              <Badge
                                key={skill}
                                className="bg-[#f2f2f7] dark:bg-[#2c2c2e] text-[#6e6e73] dark:text-[#8e8e93] text-[10px]"
                              >
                                {skill}
                              </Badge>
                            ))}
                            {allSkills.length > 8 && (
                              <Badge className="bg-[#f2f2f7] dark:bg-[#2c2c2e] text-[#86868b] dark:text-[#636366] text-[10px]">
                                +{allSkills.length - 8} more
                              </Badge>
                            )}
                          </div>
                        ) : null;
                      })()}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {!resume.isPrimary && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPrimaryMutation.mutate(resume.id)}
                        title="Set as primary"
                      >
                        <Star className="h-4 w-4 text-amber-500" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(resume.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center py-16 gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-600/10">
            <FileText className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="text-lg font-semibold text-[#1d1d1f] dark:text-white">
            No resumes yet
          </h3>
          <p className="text-sm text-[#86868b] dark:text-[#8e8e93] max-w-xs">
            Upload your PDF resume to get started with AI-powered job matching
          </p>
        </div>
      )}
    </div>
  );
}
