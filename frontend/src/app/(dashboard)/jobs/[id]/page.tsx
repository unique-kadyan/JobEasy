"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useJob } from "@/hooks/useJobs";
import { useApply } from "@/hooks/useApplications";
import { useGenerateCoverLetter } from "@/hooks/useCoverLetters";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import { SOURCE_COLORS, AI_PROVIDERS } from "@/lib/constants";
import {
  MapPin, Building2, DollarSign, ExternalLink, Clock, Loader2, CheckCircle,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { CoverLetter } from "@/types";

export default function JobDetailPage() {
  const { id } = useParams();
  const { data: job, isLoading } = useJob(id as string);
  const applyMutation = useApply();
  const generateMutation = useGenerateCoverLetter();

  const [aiProvider, setAiProvider] = useState("CLAUDE");
  const [coverLetter, setCoverLetter] = useState<CoverLetter | null>(null);
  const [generating, setGenerating] = useState(false);
  const [applied, setApplied] = useState(false);

  const handleGenerate = async () => {
    if (!job) return;
    setGenerating(true);
    try {
      const cl = await generateMutation.mutateAsync({
        jobId: job.id,
        provider: aiProvider,
      });
      setCoverLetter(cl);
    } catch (err) {
      console.error("Generation failed:", err);
    } finally {
      setGenerating(false);
    }
  };

  const handleApply = async () => {
    if (!job) return;
    try {
      await applyMutation.mutateAsync({
        jobId: job.id,
        coverLetterId: coverLetter?.id,
      });
      setApplied(true);
    } catch (err) {
      console.error("Apply failed:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!job) {
    return <div className="text-center py-20 font-bold text-gray-500 dark:text-[#8b949e]">Job not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardContent className="py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h1 className="text-2xl font-black text-black dark:text-white uppercase tracking-tight">{job.title}</h1>
                <Badge className={SOURCE_COLORS[job.source]}>{job.source}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-gray-500 dark:text-[#8b949e]">
                <span className="flex items-center gap-1">
                  <Building2 className="h-4 w-4" /> {job.company}
                </span>
                {job.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" /> {job.location}
                  </span>
                )}
                {job.salary && (
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" /> {job.salary}
                  </span>
                )}
                {job.datePosted && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" /> {formatDate(job.datePosted)}
                  </span>
                )}
              </div>
            </div>
            <a href={job.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
              <Button variant="outline">
                <ExternalLink className="h-4 w-4" /> View Original
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="font-black text-black dark:text-white uppercase tracking-wide text-sm">Job Description</h2>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium text-gray-700 dark:text-[#c9d1d9] whitespace-pre-line leading-relaxed">
              {job.description || "No description available."}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <h2 className="font-black text-black dark:text-white uppercase tracking-wide text-sm">Apply</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              {applied ? (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-black uppercase tracking-wide text-sm">Applied successfully!</span>
                </div>
              ) : (
                <>
                  <Select
                    label="AI Provider"
                    value={aiProvider}
                    onChange={(e) => setAiProvider(e.target.value)}
                    options={AI_PROVIDERS}
                  />
                  <Button
                    className="w-full"
                    onClick={handleGenerate}
                    loading={generating}
                    disabled={!!coverLetter}
                  >
                    {coverLetter ? "Cover Letter Ready" : "Generate Cover Letter"}
                  </Button>
                  <Button
                    className="w-full"
                    variant={coverLetter ? "primary" : "secondary"}
                    onClick={handleApply}
                    loading={applyMutation.isPending}
                  >
                    {coverLetter ? "Apply with Cover Letter" : "Apply Without Cover Letter"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {coverLetter && (
            <Card>
              <CardHeader>
                <h2 className="font-black text-black dark:text-white uppercase tracking-wide text-sm">Generated Cover Letter</h2>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium text-gray-700 dark:text-[#c9d1d9] whitespace-pre-line max-h-96 overflow-y-auto leading-relaxed">
                  {coverLetter.content}
                </div>
                <p className="mt-2 text-xs font-bold text-gray-400 dark:text-[#8b949e] uppercase tracking-wide">
                  Generated by {coverLetter.aiProvider}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
