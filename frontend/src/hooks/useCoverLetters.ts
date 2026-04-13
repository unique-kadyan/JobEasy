import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { CoverLetter, PagedResponse } from "@/types";

export function useCoverLetters(page = 0) {
  return useQuery<PagedResponse<CoverLetter>>({
    queryKey: ["cover-letters", page],
    queryFn: async () => {
      const res = await api.get(`/cover-letters?page=${page}`);
      return res.data;
    },
  });
}

export function useGenerateCoverLetter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { jobId: string; templateId?: string; provider?: string }) => {
      const res = await api.post<CoverLetter>("/cover-letters/generate", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cover-letters"] });
    },
  });
}
