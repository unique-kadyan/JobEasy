import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Job, PagedResponse } from "@/types";

export function useJobSearch(
  query: string,
  locations: string[],
  page = 0,
  size = 30,
  minSalary?: number,
  maxSalary?: number,
  maxAgeDays?: number,

  aiSearchEnabled = false
) {
  const locationStr = locations.join(", ");

  const enabled = query.trim().length > 0 || aiSearchEnabled;

  return useQuery<PagedResponse<Job>>({
    queryKey: [
      "jobs",
      query,
      locationStr,
      page,
      size,
      minSalary,
      maxSalary,
      maxAgeDays,
      aiSearchEnabled,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), size: String(size) });
      if (query.trim()) params.set("query", query.trim());
      if (locationStr) params.set("location", locationStr);
      if (minSalary != null) params.set("minSalary", String(minSalary));
      if (maxSalary != null) params.set("maxSalary", String(maxSalary));
      if (maxAgeDays != null) params.set("maxAgeDays", String(maxAgeDays));
      const res = await api.get(`/jobs/search?${params}`);
      return res.data;
    },
    enabled,
  });
}

export function useJob(id: string) {
  return useQuery<Job>({
    queryKey: ["job", id],
    queryFn: async () => {
      const res = await api.get(`/jobs/${id}`);
      return res.data;
    },
  });
}

export function useSummarizeJob() {
  const queryClient = useQueryClient();
  return useMutation<Job, Error, string>({
    mutationFn: async (jobId: string) => {
      const res = await api.post(`/jobs/${jobId}/summarize`);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["job", data.id], data);
    },
  });
}

export function useJobMatch(jobId: string | undefined) {
  return useQuery<Job>({
    queryKey: ["job-match", jobId],
    queryFn: async () => {
      const res = await api.get(`/jobs/${jobId}/match`);
      return res.data;
    },
    enabled: false,
    staleTime: 0,
  });
}
