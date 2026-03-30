import { Badge } from "@/components/ui/badge";
import { type RequestStatus, STATUS_LABELS } from "@/types/my-requests";

const statusStyles: Record<RequestStatus, string> = {
  open: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-400/50 dark:bg-amber-950/20 dark:text-amber-400",
  approved:
    "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-400/50 dark:bg-blue-950/20 dark:text-blue-400",
  in_progress:
    "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-400/50 dark:bg-blue-950/20 dark:text-blue-400",
  completed:
    "border-green-300 bg-green-50 text-green-700 dark:border-green-400/50 dark:bg-green-950/20 dark:text-green-400",
  rejected:
    "border-red-300 bg-red-50 text-red-700 dark:border-red-400/50 dark:bg-red-950/20 dark:text-red-400",
  withdrawn:
    "border-gray-300 bg-gray-50 text-gray-500 dark:border-gray-400/50 dark:bg-gray-950/20 dark:text-gray-400",
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <Badge variant="outline" className={statusStyles[status]}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
