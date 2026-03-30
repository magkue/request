import type { SupportRequest } from "@/types/support-request";

import { api } from "./api";

export interface SupportRequestResponse {
  id: string;
  is_authenticated_request: boolean;
  requester_username: string | null;
  requester_name: string | null;
  requester_email: string | null;
  anonymous_name: string | null;
  anonymous_email: string | null;
  anonymous_tum_id: string | null;
  subject: string;
  description: string;
  category: string;
  status: string;
  ticket_key: string | null;
  ticket_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupportRequestListItem {
  id: string;
  is_authenticated_request: boolean;
  requester_username: string | null;
  anonymous_name: string | null;
  subject: string;
  category: string;
  status: string;
  ticket_key: string | null;
  ticket_url: string | null;
  created_at: string;
}

function transformToApiFormat(data: SupportRequest): Record<string, unknown> {
  const baseFields = {
    subject: data.subject,
    description: data.description,
    category: data.category,
  };

  if (data.isLoggedIn) {
    return baseFields;
  }

  return {
    ...baseFields,
    fullName: data.fullName,
    email: data.email,
    tumId: data.tumId,
  };
}

export const supportRequestsService = {
  create: async (data: SupportRequest): Promise<SupportRequestResponse> => {
    const apiData = transformToApiFormat(data);
    return api.post<SupportRequestResponse>("/support-requests", apiData);
  },

  list: async (): Promise<SupportRequestListItem[]> => {
    return api.get<SupportRequestListItem[]>("/support-requests");
  },

  get: async (id: string): Promise<SupportRequestResponse> => {
    return api.get<SupportRequestResponse>(`/support-requests/${id}`);
  },

  update: async (
    id: string,
    data: Record<string, unknown>,
  ): Promise<SupportRequestResponse> => {
    return api.patch<SupportRequestResponse>(`/support-requests/${id}`, data);
  },

  withdraw: async (id: string): Promise<SupportRequestResponse> => {
    return api.post<SupportRequestResponse>(
      `/support-requests/${id}/withdraw`,
      {},
    );
  },

  reopen: async (id: string): Promise<SupportRequestResponse> => {
    return api.post<SupportRequestResponse>(
      `/support-requests/${id}/reopen`,
      {},
    );
  },
};
