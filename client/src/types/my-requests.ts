export type RequestType =
  | "vm"
  | "vm-access"
  | "artemis"
  | "tum-guest"
  | "support";

export type RequestStatus =
  | "open"
  | "approved"
  | "rejected"
  | "in_progress"
  | "completed"
  | "withdrawn";

export interface UnifiedRequestListItem {
  id: string;
  type: RequestType;
  title: string;
  subtitle: string;
  status: RequestStatus;
  ticketKey: string | null;
  ticketUrl: string | null;
  createdAt: string;
}

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  vm: "VM Request",
  "vm-access": "VM Access",
  artemis: "Artemis Developer",
  "tum-guest": "TUM Guest Account",
  support: "Support",
};

export const STATUS_LABELS: Record<RequestStatus, string> = {
  open: "Open",
  approved: "Approved",
  rejected: "Rejected",
  in_progress: "In Progress",
  completed: "Completed",
  withdrawn: "Withdrawn",
};

export const EDITABLE_STATUSES: Set<RequestStatus> = new Set([
  "open",
  "approved",
  "rejected",
  "in_progress",
]);

export const WITHDRAWABLE_STATUSES: Set<RequestStatus> = EDITABLE_STATUSES;
