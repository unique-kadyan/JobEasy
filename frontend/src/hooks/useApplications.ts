import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Application, PagedResponse } from "@/types";

export function useApplications(status?: string, page = 0, size = 20) {
  return useQuery<PagedResponse<Application>>({
    queryKey: ["applications", status, page, size],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), size: String(size) });
      if (status) params.set("status", status);
      const res = await api.get(`/applications?${params}`);
      return res.data;
    },
  });
}

export function useApply() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      jobId: string;
      coverLetterId?: string;
      resumeId?: string;
    }) => {
      const res = await api.post("/applications", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

export function useUpdateStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await api.put(`/applications/${id}/status`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

export function useSkipJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string) => {
      const res = await api.post("/applications", { jobId, status: "NOT_INTERESTED" });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });
}
