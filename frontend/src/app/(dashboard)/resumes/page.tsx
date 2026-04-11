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
          <h1 className="text-2xl font-black text-black dark:text-white uppercase tracking-tight">
            Resumes
          </h1>
          <p className="text-sm text-gray-500 dark:text-[#8b949e] font-medium mt-0.5">
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
                  <div className="flex h-10 w-10 items-center justify-center rounded-[3px] border-2 border-black dark:border-white bg-indigo-50 dark:bg-indigo-600/10 shrink-0">
                    <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-black text-black dark:text-white text-sm uppercase tracking-wide truncate">
                        {resume.filename}
                      </p>
                      {resume.isPrimary && (
                        <Badge className="bg-amber-100 dark:bg-yellow-900/30 text-amber-700 dark:text-yellow-400 border-amber-400 dark:border-yellow-600 shrink-0">
                          <Star className="h-3 w-3 mr-1" /> Primary
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs font-medium text-gray-500 dark:text-[#8b949e] mt-0.5">
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
                                className="bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 border-gray-400 dark:border-gray-600 text-[10px]"
                              >
                                {skill}
                              </Badge>
                            ))}
                            {allSkills.length > 8 && (
                              <Badge className="bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 border-gray-400 dark:border-gray-600 text-[10px]">
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
        <div className="flex flex-col items-center py-16 gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-[4px] border-2 border-black dark:border-white bg-indigo-50 dark:bg-indigo-600/10" style={{ boxShadow: "4px 4px 0 #000" }}>
            <FileText className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-black text-black dark:text-white uppercase tracking-tight">
              No resumes yet
            </h3>
            <p className="text-sm text-gray-500 dark:text-[#8b949e] font-medium mt-1 max-w-xs">
              Upload your PDF resume to get started with AI-powered job matching
            </p>
          </div>
          <Button onClick={() => fileRef.current?.click()} loading={uploading}>
            <Upload className="h-4 w-4" /> Upload PDF Resume
          </Button>
        </div>
      )}
    </div>
  );
}
