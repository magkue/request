import type { VMAccessRequest } from "@/types/vm-access-request";

import { api } from "./api";

export interface VMAccessRequestResponse {
  id: string;
  hostname: string;
  justification: string;
  contact_person: string | null;
  ssh_key_type: string;
  status: string;
  requester_username: string;
  ticket_key: string | null;
  ticket_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface VMAccessRequestListItem {
  id: string;
  hostname: string;
  status: string;
  requester_username: string;
  ticket_key: string | null;
  ticket_url: string | null;
  created_at: string;
}

export const vmAccessRequestsService = {
  create: async (data: VMAccessRequest): Promise<VMAccessRequestResponse> => {
    return api.post<VMAccessRequestResponse>("/vm-access-requests", data);
  },

  list: async (): Promise<VMAccessRequestListItem[]> => {
    return api.get<VMAccessRequestListItem[]>("/vm-access-requests");
  },

  get: async (id: string): Promise<VMAccessRequestResponse> => {
    return api.get<VMAccessRequestResponse>(`/vm-access-requests/${id}`);
  },

  update: async (
    id: string,
    data: Record<string, unknown>,
  ): Promise<VMAccessRequestResponse> => {
    return api.patch<VMAccessRequestResponse>(
      `/vm-access-requests/${id}`,
      data,
    );
  },

  withdraw: async (id: string): Promise<VMAccessRequestResponse> => {
    return api.post<VMAccessRequestResponse>(
      `/vm-access-requests/${id}/withdraw`,
      {},
    );
  },

  reopen: async (id: string): Promise<VMAccessRequestResponse> => {
    return api.post<VMAccessRequestResponse>(
      `/vm-access-requests/${id}/reopen`,
      {},
    );
  },
};
