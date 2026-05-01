import { ApiError } from "@/services/api";
import { artemisDeveloperRequestsService } from "@/services/artemis-developer-requests";
import { sshKeysService } from "@/services/ssh-keys";
import { supportRequestsService } from "@/services/support-requests";
import { tumGuestRequestsService } from "@/services/tum-guest-requests";
import { vmAccessRequestsService } from "@/services/vm-access-requests";
import { vmRequestsService } from "@/services/vm-requests";
import type {
  ArtemisRequest,
  GitHubUser,
  GitHubVerificationResult,
} from "@/types/artemis-request";
import type { SupportRequest } from "@/types/support-request";
import type { TUMGuestRequest } from "@/types/tum-guest-request";
import type { VMAccessRequest } from "@/types/vm-access-request";
import type { StoredSSHKey, VMRequest } from "@/types/vm-request";

/**
 * API client for the VM Request system
 * All request types now use the real backend
 */

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

export interface VMRequestSubmission extends VMRequest {
  user: {
    id: string;
    email: string | null;
    username: string | null;
    fullName: string | null;
  };
}

/**
 * Fetches stored SSH keys for the current user
 */
export async function fetchSSHKeys(): Promise<APIResponse<StoredSSHKey[]>> {
  try {
    const keys = await sshKeysService.list();
    return {
      success: true,
      data: keys,
    };
  } catch (error) {
    console.error("Failed to fetch SSH keys:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch SSH keys",
      statusCode: error instanceof ApiError ? error.status : undefined,
      data: [],
    };
  }
}

/**
 * Submits a VM request to the backend API
 */
export async function submitVMRequest(
  request: VMRequestSubmission,
): Promise<APIResponse<{ requestId: string; ticketUrl: string | null }>> {
  try {
    const { user: _user, ...vmRequestData } = request;
    const response = await vmRequestsService.create(vmRequestData);
    return {
      success: true,
      data: {
        requestId: response.id,
        ticketUrl: response.ticket_url,
      },
    };
  } catch (error) {
    console.error("Failed to submit VM request:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to submit request",
      statusCode: error instanceof ApiError ? error.status : undefined,
    };
  }
}

/**
 * Adds a new SSH key for the user
 */
export async function addSSHKey(
  name: string,
  publicKey: string,
): Promise<APIResponse<StoredSSHKey>> {
  try {
    const newKey = await sshKeysService.create({ name, publicKey });
    return {
      success: true,
      data: newKey,
    };
  } catch (error) {
    console.error("Failed to add SSH key:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add SSH key",
      statusCode: error instanceof ApiError ? error.status : undefined,
    };
  }
}

/**
 * Verifies a GitHub username via the GitHub REST API
 * Returns user info and warnings if profile is incomplete
 */
export async function verifyGitHubUsername(
  username: string,
): Promise<GitHubVerificationResult> {
  try {
    const response = await fetch(`https://api.github.com/users/${username}`, {
      headers: {
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (response.status === 404) {
      return {
        valid: false,
        error: "GitHub user not found",
        warnings: [],
      };
    }

    if (response.status === 403) {
      return {
        valid: false,
        error: "GitHub API rate limit exceeded. Please try again later.",
        warnings: [],
      };
    }

    if (!response.ok) {
      return {
        valid: false,
        error: `GitHub API error: ${response.status}`,
        warnings: [],
      };
    }

    const user: GitHubUser = await response.json();
    const warnings: string[] = [];

    if (!user.name || user.name.trim() === "") {
      warnings.push(
        "Your GitHub profile does not have a display name set. Please update your profile.",
      );
    }

    if (!user.avatar_url || user.avatar_url.includes("identicons")) {
      warnings.push(
        "Your GitHub profile does not have a custom profile picture. Please upload one.",
      );
    }

    return {
      valid: true,
      user,
      warnings,
    };
  } catch (error) {
    return {
      valid: false,
      error:
        error instanceof Error ? error.message : "Failed to verify GitHub user",
      warnings: [],
    };
  }
}

export type ArtemisRequestSubmission = ArtemisRequest & {
  user?: {
    id: string;
    email: string | null;
    username: string | null;
    fullName: string | null;
  };
  githubUser?: GitHubUser;
};

/**
 * Submits an Artemis developer request to the backend API
 * Supports both authenticated and anonymous requests
 */
export async function submitArtemisRequest(
  request: ArtemisRequestSubmission,
): Promise<APIResponse<{ requestId: string; ticketUrl: string | null }>> {
  try {
    // Extract the ArtemisRequest data and GitHub user info
    const { user: _user, githubUser, ...artemisRequestData } = request;
    const response = await artemisDeveloperRequestsService.create(
      artemisRequestData,
      githubUser,
    );
    return {
      success: true,
      data: {
        requestId: response.id,
        ticketUrl: response.ticket_url,
      },
    };
  } catch (error) {
    console.error("Failed to submit Artemis developer request:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to submit request",
      statusCode: error instanceof ApiError ? error.status : undefined,
    };
  }
}

export type VMAccessRequestSubmission = VMAccessRequest & {
  user: {
    id: string;
    email: string | null;
    username: string | null;
    fullName: string | null;
  };
};

/**
 * Submits a VM access request to the backend API
 */
export async function submitVMAccessRequest(
  request: VMAccessRequestSubmission,
): Promise<APIResponse<{ requestId: string; ticketUrl: string | null }>> {
  try {
    // Extract just the VMAccessRequest data (without user info which server gets from token)
    const { user: _user, ...vmAccessRequestData } = request;
    const response = await vmAccessRequestsService.create(vmAccessRequestData);
    return {
      success: true,
      data: {
        requestId: response.id,
        ticketUrl: response.ticket_url,
      },
    };
  } catch (error) {
    console.error("Failed to submit VM access request:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to submit request",
      statusCode: error instanceof ApiError ? error.status : undefined,
    };
  }
}

export type SupportRequestSubmission = SupportRequest & {
  user?: {
    id: string;
    email: string | null;
    username: string | null;
    fullName: string | null;
  };
};

/**
 * Submits a support request to the backend API
 * Supports both authenticated and anonymous requests
 */
export async function submitSupportRequest(
  request: SupportRequestSubmission,
): Promise<APIResponse<{ requestId: string; ticketUrl: string | null }>> {
  try {
    const { user: _user, ...supportRequestData } = request;
    const response = await supportRequestsService.create(supportRequestData);
    return {
      success: true,
      data: {
        requestId: response.id,
        ticketUrl: response.ticket_url,
      },
    };
  } catch (error) {
    console.error("Failed to submit support request:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to submit request",
      statusCode: error instanceof ApiError ? error.status : undefined,
    };
  }
}

export type TUMGuestRequestSubmission = TUMGuestRequest & {
  requester?: {
    id: string;
    email: string | null;
    username: string | null;
    fullName: string | null;
  };
};

/**
 * Submits a TUM guest account request to the backend API
 * Supports both authenticated and anonymous requests
 */
export async function submitTUMGuestRequest(
  request: TUMGuestRequestSubmission,
): Promise<APIResponse<{ requestId: string; ticketUrl: string | null }>> {
  try {
    // Extract just the TUMGuestRequest data (without requester info which server gets from token if logged in)
    const { requester: _requester, ...tumGuestRequestData } = request;
    const response = await tumGuestRequestsService.create(tumGuestRequestData);
    return {
      success: true,
      data: {
        requestId: response.id,
        ticketUrl: response.ticket_url,
      },
    };
  } catch (error) {
    console.error("Failed to submit TUM guest request:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to submit request",
      statusCode: error instanceof ApiError ? error.status : undefined,
    };
  }
}
