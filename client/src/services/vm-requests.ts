import type { VMRequest } from "@/types/vm-request";
import { api } from "./api";

export interface VMRequestResponse {
  id: string;
  hostname: string;
  description: string;
  project_type: string;
  project_details: Record<string, unknown>;
  cpu_cores: number;
  ram_gb: number;
  resource_justification: string | null;
  default_ports_enabled: boolean;
  additional_ports: Array<{ port: number; protocol: string; reason: string }>;
  additional_users: string[];
  ssh_key_type: string;
  additional_comments: string | null;
  status: string;
  requester_username: string;
  ticket_key: string | null;
  ticket_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface VMRequestListItem {
  id: string;
  hostname: string;
  project_type: string;
  status: string;
  requester_username: string;
  ticket_key: string | null;
  ticket_url: string | null;
  created_at: string;
}

export const vmRequestsService = {
  create: async (data: VMRequest): Promise<VMRequestResponse> => {
    return api.post<VMRequestResponse>("/vm-requests", data);
  },

  list: async (): Promise<VMRequestListItem[]> => {
    return api.get<VMRequestListItem[]>("/vm-requests");
  },

  get: async (id: string): Promise<VMRequestResponse> => {
    return api.get<VMRequestResponse>(`/vm-requests/${id}`);
  },

  update: async (
    id: string,
    data: Record<string, unknown>,
  ): Promise<VMRequestResponse> => {
    return api.patch<VMRequestResponse>(`/vm-requests/${id}`, data);
  },

  withdraw: async (id: string): Promise<VMRequestResponse> => {
    return api.post<VMRequestResponse>(`/vm-requests/${id}/withdraw`, {});
  },

  reopen: async (id: string): Promise<VMRequestResponse> => {
    return api.post<VMRequestResponse>(`/vm-requests/${id}/reopen`, {});
  },
};
