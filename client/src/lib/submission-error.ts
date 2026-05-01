import { toast } from "sonner";
import { supportRequestsService } from "@/services/support-requests";
import type { SupportRequest } from "@/types/support-request";

interface ContactInfo {
  fullName: string;
  email: string;
}

interface SubmissionErrorOptions {
  formType: string;
  formData: unknown;
  errorMessage?: string;
  isAuthenticated: boolean;
  contactInfo?: ContactInfo;
}

function buildDescription(
  formType: string,
  formData: unknown,
  errorMessage?: string,
): string {
  const parts = [
    `Form: ${formType}`,
    `Page: ${window.location.pathname}`,
    `Time: ${new Date().toISOString()}`,
  ];

  if (errorMessage) {
    parts.push(`Error: ${errorMessage}`);
  }

  parts.push("", "Request body:", JSON.stringify(formData, null, 2));

  return parts.join("\n");
}

let isReporting = false;

async function submitReport(options: SubmissionErrorOptions) {
  if (isReporting) return;
  isReporting = true;
  const { formType, formData, errorMessage, isAuthenticated, contactInfo } =
    options;

  const subject = `[Auto-Report] Failed ${formType} submission`;
  const description = buildDescription(formType, formData, errorMessage);

  let supportRequest: SupportRequest;
  if (isAuthenticated) {
    supportRequest = {
      isLoggedIn: true,
      subject,
      description,
      category: "bug",
    };
  } else if (contactInfo) {
    supportRequest = {
      isLoggedIn: false,
      fullName: contactInfo.fullName,
      email: contactInfo.email,
      subject,
      description,
      category: "bug",
    };
  } else {
    isReporting = false;
    toast.error("Could not submit report", {
      description: "Please sign in or contact support directly.",
    });
    return;
  }

  try {
    const response = await supportRequestsService.create(supportRequest);
    const { ticket_url } = response;
    toast.success("Report submitted", {
      description: "Thank you — our team will investigate the issue.",
      ...(ticket_url && {
        action: {
          label: "View Ticket",
          onClick: () =>
            window.open(ticket_url, "_blank", "noopener,noreferrer"),
        },
      }),
    });
  } catch {
    toast.error("Could not submit report", {
      description: "Please contact support directly.",
    });
  } finally {
    isReporting = false;
  }
}

export function showSubmissionError(
  description: string,
  options: SubmissionErrorOptions,
) {
  toast.error("Submission failed", {
    description,
    action: {
      label: "Report",
      onClick: () => submitReport(options),
    },
  });
}

export function handleSubmissionFailure(
  formType: string,
  formData: unknown,
  isAuthenticated: boolean,
  setSubmitFailed: (v: boolean) => void,
  failure:
    | { apiError?: string; statusCode?: number }
    | { caughtError: unknown },
) {
  setSubmitFailed(true);

  const isCaughtError = "caughtError" in failure;
  const errorMessage = isCaughtError
    ? failure.caughtError instanceof Error
      ? failure.caughtError.message
      : "Unknown error"
    : failure.apiError;

  let description: string;
  if (isCaughtError) {
    description = "An unexpected error occurred. Please try again later.";
  } else if (
    failure.statusCode &&
    failure.statusCode >= 400 &&
    failure.statusCode < 500
  ) {
    description =
      "Please review your data and try again. If the problem persists, contact support.";
  } else {
    description = "Our server ran into a problem. Please try again later.";
  }

  const contactInfo = isAuthenticated
    ? undefined
    : extractContactInfo(formType, formData as Record<string, unknown>);

  showSubmissionError(description, {
    formType,
    formData,
    errorMessage,
    isAuthenticated,
    contactInfo,
  });
}

export function extractContactInfo(
  formType: string,
  formData: Record<string, unknown>,
): ContactInfo | undefined {
  switch (formType) {
    case "Support Request": {
      const fullName = formData.fullName as string | undefined;
      const email = formData.email as string | undefined;
      if (fullName && email) return { fullName, email };
      break;
    }
    case "Artemis Developer Access": {
      const name = formData.name as string | undefined;
      const mainEmail = formData.mainEmail as string | undefined;
      if (name && mainEmail) return { fullName: name, email: mainEmail };
      break;
    }
    case "TUM Guest Account": {
      const firstName = formData.firstName as string | undefined;
      const lastName = formData.lastName as string | undefined;
      const email = formData.email as string | undefined;
      if (firstName && lastName && email)
        return { fullName: `${firstName} ${lastName}`, email };
      break;
    }
  }
  return undefined;
}
