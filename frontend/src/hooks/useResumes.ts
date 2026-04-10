import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Resume } from "@/types";

export function useResumes() {
  return useQuery<Resume[]>({
    queryKey: ["resumes"],
    queryFn: async () => {
      const res = await api.get("/resumes");
      // Backend returns Spring Data Page<Resume> — extract the content array
      return Array.isArray(res.data) ? res.data : (res.data?.content ?? []);
    },
  });
}

export function useResumeSkills(): string[] {
  const { data: resumes } = useResumes();

  if (!resumes || resumes.length === 0) return [];

  const primary = resumes.find((r) => r.isPrimary) || resumes[0];

  if (!primary?.parsedData?.skills) return [];

  return primary.parsedData.skills;
}
