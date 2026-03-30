import { format } from "date-fns";
import { ExternalLink, Pencil, RotateCcw, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { RequestTypeBadge } from "@/components/my-requests/RequestTypeBadge";
import { StatusBadge } from "@/components/my-requests/StatusBadge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { artemisDeveloperRequestsService } from "@/services/artemis-developer-requests";
import { supportRequestsService } from "@/services/support-requests";
import { tumGuestRequestsService } from "@/services/tum-guest-requests";
import { vmAccessRequestsService } from "@/services/vm-access-requests";
import { vmRequestsService } from "@/services/vm-requests";
import type {
  RequestStatus,
  RequestType,
  UnifiedRequestListItem,
} from "@/types/my-requests";
import { EDITABLE_STATUSES, WITHDRAWABLE_STATUSES } from "@/types/my-requests";

interface RequestDetailSheetProps {
  request: UnifiedRequestListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (
    request: UnifiedRequestListItem,
    detail: Record<string, unknown>,
  ) => void;
  onWithdraw: (request: UnifiedRequestListItem) => void;
  onReopen: (request: UnifiedRequestListItem) => void;
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-sm">{typeof value === "string" ? value : value}</p>
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold">{title}</h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

// biome-ignore lint/suspicious/noExplicitAny: dynamic detail rendering
function renderVMDetails(detail: any) {
  return (
    <>
      <DetailSection title="VM Information">
        <DetailField label="Hostname" value={detail.hostname} />
        <DetailField label="Description" value={detail.description} />
        <DetailField label="Project Type" value={detail.project_type} />
      </DetailSection>
      <DetailSection title="Resources">
        <DetailField label="CPU Cores" value={detail.cpu_cores} />
        <DetailField label="RAM (GB)" value={detail.ram_gb} />
        <DetailField
          label="Justification"
          value={detail.resource_justification}
        />
      </DetailSection>
      <DetailField
        label="Additional Users"
        value={detail.additional_users?.join(", ")}
      />
      <DetailField
        label="Additional Comments"
        value={detail.additional_comments}
      />
    </>
  );
}

// biome-ignore lint/suspicious/noExplicitAny: dynamic detail rendering
function renderVMAccessDetails(detail: any) {
  return (
    <>
      <DetailField label="Hostname" value={detail.hostname} />
      <DetailField label="Justification" value={detail.justification} />
      <DetailField label="Contact Person" value={detail.contact_person} />
    </>
  );
}

// biome-ignore lint/suspicious/noExplicitAny: dynamic detail rendering
function renderArtemisDetails(detail: any) {
  return (
    <>
      <DetailField label="GitHub Username" value={detail.github_username} />
      <DetailField label="Slack Email" value={detail.slack_email} />
      <DetailField label="Contact Person" value={detail.contact_person} />
      <DetailField label="Advisor" value={detail.advisor} />
      <DetailField label="Subteams" value={detail.subteams?.join(", ")} />
      <DetailField label="Other Subteam" value={detail.other_subteam} />
      <DetailField
        label="Additional Comments"
        value={detail.additional_comments}
      />
    </>
  );
}

// biome-ignore lint/suspicious/noExplicitAny: dynamic detail rendering
function renderTUMGuestDetails(detail: any) {
  return (
    <>
      <DetailSection title="Guest Information">
        <DetailField
          label="Name"
          value={`${detail.guest_first_name} ${detail.guest_last_name}`}
        />
        <DetailField label="Email" value={detail.guest_email} />
        <DetailField label="Birth Date" value={detail.guest_birth_date} />
        <DetailField label="Gender" value={detail.guest_gender} />
        <DetailField label="Nationality" value={detail.guest_nationality} />
      </DetailSection>
      <DetailField label="Guest Type" value={detail.guest_type} />
      <DetailField label="Contact Person" value={detail.contact_person} />
      <DetailField
        label="Additional Comments"
        value={detail.additional_comments}
      />
    </>
  );
}

// biome-ignore lint/suspicious/noExplicitAny: dynamic detail rendering
function renderSupportDetails(detail: any) {
  return (
    <>
      <DetailField label="Subject" value={detail.subject} />
      <DetailField label="Category" value={detail.category} />
      <DetailField label="Description" value={detail.description} />
    </>
  );
}

const detailRenderers: Record<
  RequestType,
  (detail: Record<string, unknown>) => React.ReactNode
> = {
  vm: renderVMDetails,
  "vm-access": renderVMAccessDetails,
  artemis: renderArtemisDetails,
  "tum-guest": renderTUMGuestDetails,
  support: renderSupportDetails,
};

const detailFetchers: Record<
  RequestType,
  (id: string) => Promise<Record<string, unknown>>
> = {
  // biome-ignore lint/suspicious/noExplicitAny: service return types
  vm: (id) => vmRequestsService.get(id) as any,
  // biome-ignore lint/suspicious/noExplicitAny: service return types
  "vm-access": (id) => vmAccessRequestsService.get(id) as any,
  // biome-ignore lint/suspicious/noExplicitAny: service return types
  artemis: (id) => artemisDeveloperRequestsService.get(id) as any,
  // biome-ignore lint/suspicious/noExplicitAny: service return types
  "tum-guest": (id) => tumGuestRequestsService.get(id) as any,
  // biome-ignore lint/suspicious/noExplicitAny: service return types
  support: (id) => supportRequestsService.get(id) as any,
};

export function RequestDetailSheet({
  request,
  open,
  onOpenChange,
  onEdit,
  onWithdraw,
  onReopen,
}: RequestDetailSheetProps) {
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!request) return;
    setLoading(true);
    setError(null);
    try {
      const data = await detailFetchers[request.type](request.id);
      setDetail(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load details");
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    if (open && request) {
      fetchDetail();
    } else {
      setDetail(null);
    }
  }, [open, request, fetchDetail]);

  if (!request) return null;

  const isEditable = EDITABLE_STATUSES.has(request.status);
  const isWithdrawable = WITHDRAWABLE_STATUSES.has(request.status);
  const isWithdrawn = request.status === "withdrawn";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {request.title}
          </SheetTitle>
          <div className="flex flex-wrap items-center gap-2">
            <RequestTypeBadge type={request.type} />
            <StatusBadge status={request.status as RequestStatus} />
          </div>
        </SheetHeader>

        <div className="mt-2 flex flex-col gap-4 px-4">
          <DetailField
            label="Created"
            value={format(new Date(request.createdAt), "PPp")}
          />

          {request.ticketUrl && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                Ticket
              </p>
              <a
                href={request.ticketUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                {request.ticketKey}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          <Separator />

          {loading && (
            <div className="space-y-3">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          {detail && detailRenderers[request.type](detail)}

          <Separator />

          <div className="flex flex-wrap gap-2">
            {isEditable && detail && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(request, detail)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
            {isWithdrawable && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => onWithdraw(request)}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Withdraw
              </Button>
            )}
            {isWithdrawn && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onReopen(request)}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reopen
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
