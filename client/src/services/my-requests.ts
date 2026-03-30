import type { ArtemisDeveloperRequestListItem } from "@/services/artemis-developer-requests";
import { artemisDeveloperRequestsService } from "@/services/artemis-developer-requests";
import type { SupportRequestListItem } from "@/services/support-requests";
import { supportRequestsService } from "@/services/support-requests";
import type { TUMGuestRequestListItem } from "@/services/tum-guest-requests";
import { tumGuestRequestsService } from "@/services/tum-guest-requests";
import type { VMAccessRequestListItem } from "@/services/vm-access-requests";
import { vmAccessRequestsService } from "@/services/vm-access-requests";
import type { VMRequestListItem } from "@/services/vm-requests";
import { vmRequestsService } from "@/services/vm-requests";
import type {
  RequestStatus,
  UnifiedRequestListItem,
} from "@/types/my-requests";

function normalizeVMRequest(item: VMRequestListItem): UnifiedRequestListItem {
  const projectLabels: Record<string, string> = {
    ipraktikum: "iPraktikum",
    thesis: "Thesis",
    chair_project: "Chair Project",
  };
  return {
    id: item.id,
    type: "vm",
    title: item.hostname,
    subtitle: `Project: ${projectLabels[item.project_type] ?? item.project_type}`,
    status: item.status as RequestStatus,
    ticketKey: item.ticket_key,
    ticketUrl: item.ticket_url,
    createdAt: item.created_at,
  };
}

function normalizeVMAccessRequest(
  item: VMAccessRequestListItem,
): UnifiedRequestListItem {
  return {
    id: item.id,
    type: "vm-access",
    title: item.hostname,
    subtitle: "",
    status: item.status as RequestStatus,
    ticketKey: item.ticket_key,
    ticketUrl: item.ticket_url,
    createdAt: item.created_at,
  };
}

function normalizeArtemisRequest(
  item: ArtemisDeveloperRequestListItem,
): UnifiedRequestListItem {
  return {
    id: item.id,
    type: "artemis",
    title: item.github_username,
    subtitle: item.slack_email,
    status: item.status as RequestStatus,
    ticketKey: item.ticket_key,
    ticketUrl: item.ticket_url,
    createdAt: item.created_at,
  };
}

function normalizeTUMGuestRequest(
  item: TUMGuestRequestListItem,
): UnifiedRequestListItem {
  const guestTypeLabels: Record<string, string> = {
    "ipraktikum-customer": "iPraktikum Customer",
    artemis: "Artemis",
    other: "Other",
  };
  return {
    id: item.id,
    type: "tum-guest",
    title: `${item.guest_first_name} ${item.guest_last_name}`,
    subtitle: `Guest Type: ${guestTypeLabels[item.guest_type] ?? item.guest_type}`,
    status: item.status as RequestStatus,
    ticketKey: item.ticket_key,
    ticketUrl: item.ticket_url,
    createdAt: item.created_at,
  };
}

function normalizeSupportRequest(
  item: SupportRequestListItem,
): UnifiedRequestListItem {
  const categoryLabels: Record<string, string> = {
    bug: "Bug Report",
    feature_request: "Feature Request",
    question: "Question",
    other: "Other",
  };
  return {
    id: item.id,
    type: "support",
    title: item.subject,
    subtitle: `Category: ${categoryLabels[item.category] ?? item.category}`,
    status: item.status as RequestStatus,
    ticketKey: item.ticket_key,
    ticketUrl: item.ticket_url,
    createdAt: item.created_at,
  };
}

export async function fetchAllRequests(): Promise<UnifiedRequestListItem[]> {
  const results = await Promise.allSettled([
    vmRequestsService.list(),
    vmAccessRequestsService.list(),
    artemisDeveloperRequestsService.list(),
    tumGuestRequestsService.list(),
    supportRequestsService.list(),
  ]);

  const items: UnifiedRequestListItem[] = [];

  if (results[0].status === "fulfilled") {
    items.push(...results[0].value.map(normalizeVMRequest));
  }
  if (results[1].status === "fulfilled") {
    items.push(...results[1].value.map(normalizeVMAccessRequest));
  }
  if (results[2].status === "fulfilled") {
    items.push(...results[2].value.map(normalizeArtemisRequest));
  }
  if (results[3].status === "fulfilled") {
    items.push(...results[3].value.map(normalizeTUMGuestRequest));
  }
  if (results[4].status === "fulfilled") {
    items.push(...results[4].value.map(normalizeSupportRequest));
  }

  items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return items;
}
