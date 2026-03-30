import type { TUMGuestRequest } from "@/types/tum-guest-request";

import { api } from "./api";

export interface TUMGuestRequestResponse {
  id: string;
  is_authenticated_request: boolean;
  requesting_for_self: boolean;
  guest_first_name: string;
  guest_last_name: string;
  guest_email: string;
  guest_birth_date: string;
  guest_gender: string;
  guest_nationality: string;
  contact_person: string | null;
  guest_type: string;
  guest_type_details: Record<string, unknown>;
  additional_comments: string | null;
  status: string;
  requester_username: string | null;
  ticket_key: string | null;
  ticket_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface TUMGuestRequestListItem {
  id: string;
  guest_first_name: string;
  guest_last_name: string;
  guest_email: string;
  guest_type: string;
  status: string;
  requester_username: string | null;
  ticket_key: string | null;
  ticket_url: string | null;
  created_at: string;
}

// Transform client TUMGuestRequest to API format
function transformToApiFormat(data: TUMGuestRequest): Record<string, unknown> {
  // Only send the guest-type-specific fields that are relevant
  const guestTypeFields: Record<string, unknown> = {};
  if (data.guestType === "ipraktikum-customer") {
    guestTypeFields.ipraktikumFields = data.ipraktikumFields;
  } else if (data.guestType === "artemis") {
    guestTypeFields.artemisFields = data.artemisFields;
  } else if (data.guestType === "other") {
    guestTypeFields.otherFields = data.otherFields;
  }

  const baseFields = {
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    birthDate: data.birthDate,
    gender: data.gender,
    nationality:
      data.nationality === "other" ? data.nationalityOther : data.nationality,
    guestType: data.guestType,
    ...guestTypeFields,
    additionalComments: data.additionalComments,
  };

  if (data.isLoggedIn) {
    // Authenticated user - simpler schema
    return baseFields;
  } else {
    // Anonymous user - includes contactPerson and requestingForSelf
    return {
      ...baseFields,
      requestingForSelf: data.requestingForSelf,
      contactPerson: data.contactPerson,
    };
  }
}

export const tumGuestRequestsService = {
  create: async (data: TUMGuestRequest): Promise<TUMGuestRequestResponse> => {
    const apiData = transformToApiFormat(data);
    return api.post<TUMGuestRequestResponse>("/tum-guest-requests", apiData);
  },

  list: async (): Promise<TUMGuestRequestListItem[]> => {
    return api.get<TUMGuestRequestListItem[]>("/tum-guest-requests");
  },

  get: async (id: string): Promise<TUMGuestRequestResponse> => {
    return api.get<TUMGuestRequestResponse>(`/tum-guest-requests/${id}`);
  },

  update: async (
    id: string,
    data: Record<string, unknown>,
  ): Promise<TUMGuestRequestResponse> => {
    return api.patch<TUMGuestRequestResponse>(
      `/tum-guest-requests/${id}`,
      data,
    );
  },

  withdraw: async (id: string): Promise<TUMGuestRequestResponse> => {
    return api.post<TUMGuestRequestResponse>(
      `/tum-guest-requests/${id}/withdraw`,
      {},
    );
  },

  reopen: async (id: string): Promise<TUMGuestRequestResponse> => {
    return api.post<TUMGuestRequestResponse>(
      `/tum-guest-requests/${id}/reopen`,
      {},
    );
  },
};
