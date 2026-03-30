import { Code, HelpCircle, KeyRound, Server, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { REQUEST_TYPE_LABELS, type RequestType } from "@/types/my-requests";

export const typeIcons: Record<
  RequestType,
  React.ComponentType<{ className?: string }>
> = {
  vm: Server,
  "vm-access": KeyRound,
  artemis: Code,
  "tum-guest": UserPlus,
  support: HelpCircle,
};

export function RequestTypeBadge({ type }: { type: RequestType }) {
  const Icon = typeIcons[type];
  return (
    <Badge variant="outline">
      <Icon className="mr-1 h-3 w-3" />
      {REQUEST_TYPE_LABELS[type]}
    </Badge>
  );
}
