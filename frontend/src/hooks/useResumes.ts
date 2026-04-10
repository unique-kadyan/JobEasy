import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Resume } from "@/types";

export function useResumes() {
  return useQuery<Resume[]>({
    queryKey: ["resumes"],
    queryFn: async () => {
      const res = await api.get("/resumes");
      return Array.isArray(res.data) ? res.data : (res.data?.content ?? []);
    },
  });
}

export function useResumeSkills(): string[] {
  const { data: resumes } = useResumes();

  if (!resumes || resumes.length === 0) return [];

  const primary = resumes.find((r) => r.isPrimary) || resumes[0];
  const skills = primary?.parsedData?.skills;
  if (!skills) return [];

  return Object.values(skills).flat().filter(Boolean) as string[];
}
