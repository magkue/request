import type { ArtemisRequest, GitHubUser } from "@/types/artemis-request";

import { api } from "./api";

export interface ArtemisDeveloperRequestResponse {
  id: string;
  is_authenticated_request: boolean;
  requester_username: string | null;
  requester_name: string | null;
  requester_email: string | null;
  anonymous_name: string | null;
  anonymous_email: string | null;
  github_username: string;
  github_user_id: number | null;
  github_avatar_url: string | null;
  github_profile_url: string | null;
  github_name: string | null;
  github_verified: boolean;
  slack_email: string;
  contact_person: string;
  advisor: string;
  subteams: string[];
  other_subteam: string | null;
  additional_comments: string | null;
  status: string;
  ticket_key: string | null;
  ticket_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArtemisDeveloperRequestListItem {
  id: string;
  is_authenticated_request: boolean;
  requester_username: string | null;
  anonymous_name: string | null;
  github_username: string;
  github_avatar_url: string | null;
  slack_email: string;
  subteams: string[];
  status: string;
  ticket_key: string | null;
  ticket_url: string | null;
  created_at: string;
}

// Transform client ArtemisRequest to API format
function transformToApiFormat(
  data: ArtemisRequest,
  githubUser?: GitHubUser,
): Record<string, unknown> {
  const baseFields = {
    githubUsername: data.githubUsername,
    githubInfo: githubUser
      ? {
          login: githubUser.login,
          id: githubUser.id,
          avatarUrl: githubUser.avatar_url,
          htmlUrl: githubUser.html_url,
          name: githubUser.name,
        }
      : undefined,
    slackEmail: data.slackEmail,
    contactPerson: data.contactPerson,
    advisor: data.advisor,
    subteams: data.subteams,
    otherSubteam: data.otherSubteam,
    additionalComments: data.additionalComments,
  };

  if (data.isLoggedIn) {
    // Authenticated user - simpler schema
    return baseFields;
  } else {
    // Anonymous user - includes name and mainEmail
    return {
      ...baseFields,
      name: data.name,
      mainEmail: data.mainEmail,
    };
  }
}

export const artemisDeveloperRequestsService = {
  create: async (
    data: ArtemisRequest,
    githubUser?: GitHubUser,
  ): Promise<ArtemisDeveloperRequestResponse> => {
    const apiData = transformToApiFormat(data, githubUser);
    return api.post<ArtemisDeveloperRequestResponse>(
      "/artemis-developer-requests",
      apiData,
    );
  },

  list: async (): Promise<ArtemisDeveloperRequestListItem[]> => {
    return api.get<ArtemisDeveloperRequestListItem[]>(
      "/artemis-developer-requests",
    );
  },

  get: async (id: string): Promise<ArtemisDeveloperRequestResponse> => {
    return api.get<ArtemisDeveloperRequestResponse>(
      `/artemis-developer-requests/${id}`,
    );
  },

  update: async (
    id: string,
    data: Record<string, unknown>,
  ): Promise<ArtemisDeveloperRequestResponse> => {
    return api.patch<ArtemisDeveloperRequestResponse>(
      `/artemis-developer-requests/${id}`,
      data,
    );
  },

  withdraw: async (id: string): Promise<ArtemisDeveloperRequestResponse> => {
    return api.post<ArtemisDeveloperRequestResponse>(
      `/artemis-developer-requests/${id}/withdraw`,
      {},
    );
  },

  reopen: async (id: string): Promise<ArtemisDeveloperRequestResponse> => {
    return api.post<ArtemisDeveloperRequestResponse>(
      `/artemis-developer-requests/${id}/reopen`,
      {},
    );
  },
};
