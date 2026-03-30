import { ClipboardList } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { RequestDetailSheet } from "@/components/my-requests/RequestDetailSheet";
import { RequestEditSheet } from "@/components/my-requests/RequestEditSheet";
import { RequestList } from "@/components/my-requests/RequestList";
import { WithdrawDialog } from "@/components/my-requests/WithdrawDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { artemisDeveloperRequestsService } from "@/services/artemis-developer-requests";
import { fetchAllRequests } from "@/services/my-requests";
import { supportRequestsService } from "@/services/support-requests";
import { tumGuestRequestsService } from "@/services/tum-guest-requests";
import { vmAccessRequestsService } from "@/services/vm-access-requests";
import { vmRequestsService } from "@/services/vm-requests";
import type { RequestType, UnifiedRequestListItem } from "@/types/my-requests";

const withdrawServices: Record<RequestType, (id: string) => Promise<unknown>> =
  {
    vm: (id) => vmRequestsService.withdraw(id),
    "vm-access": (id) => vmAccessRequestsService.withdraw(id),
    artemis: (id) => artemisDeveloperRequestsService.withdraw(id),
    "tum-guest": (id) => tumGuestRequestsService.withdraw(id),
    support: (id) => supportRequestsService.withdraw(id),
  };

const reopenServices: Record<RequestType, (id: string) => Promise<unknown>> = {
  vm: (id) => vmRequestsService.reopen(id),
  "vm-access": (id) => vmAccessRequestsService.reopen(id),
  artemis: (id) => artemisDeveloperRequestsService.reopen(id),
  "tum-guest": (id) => tumGuestRequestsService.reopen(id),
  support: (id) => supportRequestsService.reopen(id),
};

export function MyRequestsPage() {
  const [requests, setRequests] = useState<UnifiedRequestListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail sheet state
  const [detailRequest, setDetailRequest] =
    useState<UnifiedRequestListItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Edit sheet state
  const [editRequest, setEditRequest] = useState<UnifiedRequestListItem | null>(
    null,
  );
  const [editDetail, setEditDetail] = useState<Record<string, unknown> | null>(
    null,
  );
  const [editOpen, setEditOpen] = useState(false);

  // Withdraw dialog state
  const [withdrawRequest, setWithdrawRequest] =
    useState<UnifiedRequestListItem | null>(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllRequests();
      setRequests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleView = (request: UnifiedRequestListItem) => {
    setDetailRequest(request);
    setDetailOpen(true);
  };

  const handleEdit = (request: UnifiedRequestListItem) => {
    // Close detail sheet first, then open edit sheet
    setDetailOpen(false);
    setEditRequest(request);
    setEditDetail(null);
    setEditOpen(true);
  };

  const handleEditFromDetail = (
    request: UnifiedRequestListItem,
    detail: Record<string, unknown>,
  ) => {
    setDetailOpen(false);
    setEditRequest(request);
    setEditDetail(detail);
    setEditOpen(true);
  };

  const handleWithdraw = (request: UnifiedRequestListItem) => {
    setDetailOpen(false);
    setWithdrawRequest(request);
    setWithdrawOpen(true);
  };

  const handleConfirmWithdraw = async () => {
    if (!withdrawRequest) return;
    setWithdrawLoading(true);
    try {
      await withdrawServices[withdrawRequest.type](withdrawRequest.id);
      setWithdrawOpen(false);
      setWithdrawRequest(null);
      loadRequests();
    } catch (err) {
      console.error("Failed to withdraw:", err);
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleReopen = async (request: UnifiedRequestListItem) => {
    setDetailOpen(false);
    try {
      await reopenServices[request.type](request.id);
      loadRequests();
    } catch (err) {
      console.error("Failed to reopen:", err);
    }
  };

  return (
    <PageLayout>
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <ClipboardList className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">My Requests</h1>
        </div>

        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!loading && !error && (
          <RequestList
            requests={requests}
            onView={handleView}
            onEdit={handleEdit}
            onWithdraw={handleWithdraw}
            onReopen={handleReopen}
          />
        )}

        <RequestDetailSheet
          request={detailRequest}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onEdit={handleEditFromDetail}
          onWithdraw={handleWithdraw}
          onReopen={handleReopen}
        />

        <RequestEditSheet
          request={editRequest}
          detail={editDetail}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSaved={loadRequests}
        />

        <WithdrawDialog
          open={withdrawOpen}
          onOpenChange={setWithdrawOpen}
          onConfirm={handleConfirmWithdraw}
          loading={withdrawLoading}
          requestTitle={withdrawRequest?.title ?? ""}
        />
      </div>
    </PageLayout>
  );
}
