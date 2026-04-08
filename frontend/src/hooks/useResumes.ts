import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Resume } from "@/types";

export function useResumes() {
  return useQuery<Resume[]>({
    queryKey: ["resumes"],
    queryFn: async () => (await api.get("/resumes")).data,
  });
}

export function useResumeSkills(): string[] {
  const { data: resumes } = useResumes();

  if (!resumes || resumes.length === 0) return [];

  // Get the primary resume, or the first one
  const primary = resumes.find((r) => r.isPrimary) || resumes[0];

  if (!primary?.parsedData?.skills) return [];

  return primary.parsedData.skills;
}
