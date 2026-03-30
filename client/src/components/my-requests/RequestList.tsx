import { format } from "date-fns";
import {
  Ban,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  RotateCcw,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  RequestTypeBadge,
  typeIcons,
} from "@/components/my-requests/RequestTypeBadge";
import { StatusBadge } from "@/components/my-requests/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  RequestStatus,
  RequestType,
  UnifiedRequestListItem,
} from "@/types/my-requests";
import {
  EDITABLE_STATUSES,
  REQUEST_TYPE_LABELS,
  WITHDRAWABLE_STATUSES,
} from "@/types/my-requests";

type FilterTab = "all" | "open" | "active" | "completed" | "withdrawn";

const tabFilters: Record<FilterTab, (item: UnifiedRequestListItem) => boolean> =
  {
    all: () => true,
    open: (item) => item.status === "open",
    active: (item) =>
      item.status === "approved" || item.status === "in_progress",
    completed: (item) =>
      item.status === "completed" || item.status === "rejected",
    withdrawn: (item) => item.status === "withdrawn",
  };

const TYPE_ORDER: RequestType[] = [
  "vm",
  "vm-access",
  "artemis",
  "tum-guest",
  "support",
];

function groupByType(items: UnifiedRequestListItem[]) {
  const groups: { type: RequestType; items: UnifiedRequestListItem[] }[] = [];
  for (const type of TYPE_ORDER) {
    const matching = items.filter((i) => i.type === type);
    if (matching.length > 0) {
      groups.push({ type, items: matching });
    }
  }
  return groups;
}

interface RequestListProps {
  requests: UnifiedRequestListItem[];
  onView: (request: UnifiedRequestListItem) => void;
  onEdit: (request: UnifiedRequestListItem) => void;
  onWithdraw: (request: UnifiedRequestListItem) => void;
  onReopen: (request: UnifiedRequestListItem) => void;
}

function RequestCard({
  request,
  onView,
  onEdit,
  onWithdraw,
  onReopen,
}: {
  request: UnifiedRequestListItem;
  onView: () => void;
  onEdit: () => void;
  onWithdraw: () => void;
  onReopen: () => void;
}) {
  const isEditable = EDITABLE_STATUSES.has(request.status);
  const isWithdrawable = WITHDRAWABLE_STATUSES.has(request.status);
  const isWithdrawn = request.status === "withdrawn";

  return (
    <Card
      className="cursor-pointer gap-0 py-0 transition-colors hover:bg-muted/50"
      onClick={onView}
    >
      <CardContent className="flex items-center gap-4 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-medium">{request.title}</h3>
            <RequestTypeBadge type={request.type} />
            <StatusBadge status={request.status as RequestStatus} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {request.subtitle && <>{request.subtitle} &middot; </>}
            Created {format(new Date(request.createdAt), "PP")}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {request.ticketKey && (
            <Button
              variant="outline"
              size="sm"
              asChild
              onClick={(e) => e.stopPropagation()}
            >
              <a
                href={request.ticketUrl ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
              >
                View Ticket
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </a>
            </Button>
          )}

          {/* Inline actions on lg+ */}
          <div className="hidden items-center gap-1 lg:flex">
            {isEditable && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </Button>
            )}
            {isWithdrawable && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onWithdraw();
                }}
              >
                <Ban className="mr-1.5 h-3.5 w-3.5" />
                Withdraw
              </Button>
            )}
            {isWithdrawn && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onReopen();
                }}
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Reopen
              </Button>
            )}
          </div>

          {/* Dropdown on mobile */}
          <div className="lg:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isEditable && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit();
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                )}
                {isWithdrawable && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onWithdraw();
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Ban className="mr-2 h-4 w-4" />
                    Withdraw
                  </DropdownMenuItem>
                )}
                {isWithdrawn && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onReopen();
                    }}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reopen
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TypeGroupHeader({ type }: { type: RequestType }) {
  const Icon = typeIcons[type];
  return (
    <div className="flex items-center gap-2 pt-2 pb-1">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <h3 className="text-sm font-semibold text-muted-foreground">
        {REQUEST_TYPE_LABELS[type]}
      </h3>
    </div>
  );
}

export function RequestList({
  requests,
  onView,
  onEdit,
  onWithdraw,
  onReopen,
}: RequestListProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const filtered = requests.filter(tabFilters[activeTab]);
  const groups = useMemo(() => groupByType(filtered), [filtered]);

  const tabCounts: Record<FilterTab, number> = {
    all: requests.length,
    open: requests.filter(tabFilters.open).length,
    active: requests.filter(tabFilters.active).length,
    completed: requests.filter(tabFilters.completed).length,
    withdrawn: requests.filter(tabFilters.withdrawn).length,
  };

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FilterTab)}>
      <TabsList className="mb-4">
        <TabsTrigger value="all">All ({tabCounts.all})</TabsTrigger>
        <TabsTrigger value="open">Open ({tabCounts.open})</TabsTrigger>
        <TabsTrigger value="active">Active ({tabCounts.active})</TabsTrigger>
        <TabsTrigger value="completed">
          Completed ({tabCounts.completed})
        </TabsTrigger>
        <TabsTrigger value="withdrawn">
          Withdrawn ({tabCounts.withdrawn})
        </TabsTrigger>
      </TabsList>

      <TabsContent value={activeTab}>
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            No requests found.
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <div key={group.type}>
                <TypeGroupHeader type={group.type} />
                <div className="space-y-1.5">
                  {group.items.map((request) => (
                    <RequestCard
                      key={`${request.type}-${request.id}`}
                      request={request}
                      onView={() => onView(request)}
                      onEdit={() => onEdit(request)}
                      onWithdraw={() => onWithdraw(request)}
                      onReopen={() => onReopen(request)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
