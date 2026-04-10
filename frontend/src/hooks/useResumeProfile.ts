import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { ResumeProfile } from "@/types";

export function useResumeProfile() {
  return useQuery<ResumeProfile>({
    queryKey: ["resume-profile"],
    queryFn: () => api.get("/resume-profile").then((r) => r.data),
  });
}

export function usePatchResumeProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates: Partial<ResumeProfile>) =>
      api.patch("/resume-profile", updates).then((r) => r.data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["resume-profile"] }),
  });
}
