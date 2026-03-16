import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";

export function useDashboardData() {
  return useQuery({
    queryKey: ["dashboard-data"],
    queryFn: () => apiGet("/analytics/dashboard"),
  });
}

export function useContentData() {
  return useQuery({
    queryKey: ["content-data"],
    queryFn: () => apiGet("/content"),
  });
}

export function useSourcesData() {
  return useQuery({
    queryKey: ["sources-data"],
    queryFn: () => apiGet("/sources"),
  });
}

export function useIngestionJobsData() {
  return useQuery({
    queryKey: ["ingestion-jobs"],
    queryFn: () => apiGet("/sources/jobs"),
    refetchInterval: 10_000,
  });
}

export function useUsersData() {
  return useQuery({
    queryKey: ["users-data"],
    queryFn: () => apiGet("/users-roles/users"),
  });
}

export function useTrainingPolicyData() {
  return useQuery({
    queryKey: ["training-policy"],
    queryFn: () => apiGet("/training/policy"),
  });
}

export function useSettingsData() {
  return useQuery({
    queryKey: ["settings-data"],
    queryFn: () => apiGet("/settings"),
  });
}

export function useAuditData() {
  return useQuery({
    queryKey: ["audit-entries"],
    queryFn: () => apiGet("/audit/entries"),
  });
}

export function useChatBootstrapData() {
  return useQuery({
    queryKey: ["chat-bootstrap"],
    queryFn: () => apiGet("/chat/bootstrap"),
  });
}

export function useAvatarProviderData() {
  return useQuery({
    queryKey: ["avatar-provider"],
    queryFn: () => apiGet("/avatar/provider-active"),
    refetchInterval: 15_000,
  });
}
