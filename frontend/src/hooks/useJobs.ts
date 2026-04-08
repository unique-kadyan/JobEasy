import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Job, PagedResponse } from "@/types";

export function useJobSearch(
  query: string,
  locations: string[],
  source?: string,
  page = 0,
  size = 30
) {
  const locationStr = locations.join(", ");

  return useQuery<PagedResponse<Job>>({
    queryKey: ["jobs", query, locationStr, source, page, size],
    queryFn: async () => {
      const params = new URLSearchParams({
        query,
        page: String(page),
        size: String(size),
      });
      if (locationStr) params.set("location", locationStr);
      if (source) params.set("source", source);
      const res = await api.get(`/jobs/search?${params}`);
      return res.data;
    },
    enabled: query.length > 0,
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
