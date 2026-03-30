import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { artemisDeveloperRequestsService } from "@/services/artemis-developer-requests";
import { supportRequestsService } from "@/services/support-requests";
import { tumGuestRequestsService } from "@/services/tum-guest-requests";
import { vmAccessRequestsService } from "@/services/vm-access-requests";
import { vmRequestsService } from "@/services/vm-requests";
import type { RequestType, UnifiedRequestListItem } from "@/types/my-requests";

interface RequestEditSheetProps {
  request: UnifiedRequestListItem | null;
  detail: Record<string, unknown> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

type FieldConfig = {
  key: string;
  label: string;
  apiKey?: string;
} & (
  | { type: "text" | "textarea" }
  | { type: "select"; options: { value: string; label: string }[] }
);

const editableFields: Record<RequestType, FieldConfig[]> = {
  vm: [
    { key: "hostname", label: "Hostname", type: "text" },
    { key: "description", label: "Description", type: "textarea" },
    { key: "cpu_cores", label: "CPU Cores", type: "text", apiKey: "cpuCores" },
    { key: "ram_gb", label: "RAM (GB)", type: "text", apiKey: "ramGB" },
    {
      key: "resource_justification",
      label: "Resource Justification",
      type: "textarea",
      apiKey: "resourceJustification",
    },
    {
      key: "additional_comments",
      label: "Additional Comments",
      type: "textarea",
      apiKey: "additionalComments",
    },
  ],
  "vm-access": [
    { key: "hostname", label: "Hostname", type: "text" },
    { key: "justification", label: "Justification", type: "textarea" },
    {
      key: "contact_person",
      label: "Contact Person",
      type: "text",
      apiKey: "contactPerson",
    },
  ],
  artemis: [
    {
      key: "slack_email",
      label: "Slack Email",
      type: "text",
      apiKey: "slackEmail",
    },
    {
      key: "contact_person",
      label: "Contact Person",
      type: "text",
      apiKey: "contactPerson",
    },
    { key: "advisor", label: "Advisor", type: "text" },
    {
      key: "additional_comments",
      label: "Additional Comments",
      type: "textarea",
      apiKey: "additionalComments",
    },
  ],
  "tum-guest": [
    {
      key: "guest_first_name",
      label: "First Name",
      type: "text",
      apiKey: "firstName",
    },
    {
      key: "guest_last_name",
      label: "Last Name",
      type: "text",
      apiKey: "lastName",
    },
    { key: "guest_email", label: "Email", type: "text", apiKey: "email" },
    {
      key: "guest_gender",
      label: "Gender",
      type: "select",
      apiKey: "gender",
      options: [
        { value: "male", label: "Male" },
        { value: "female", label: "Female" },
        { value: "diverse", label: "Diverse" },
      ],
    },
    {
      key: "guest_nationality",
      label: "Nationality",
      type: "text",
      apiKey: "nationality",
    },
    {
      key: "contact_person",
      label: "Contact Person",
      type: "text",
      apiKey: "contactPerson",
    },
    {
      key: "additional_comments",
      label: "Additional Comments",
      type: "textarea",
      apiKey: "additionalComments",
    },
  ],
  support: [
    { key: "subject", label: "Subject", type: "text" },
    {
      key: "category",
      label: "Category",
      type: "select",
      options: [
        { value: "bug", label: "Bug Report" },
        { value: "feature_request", label: "Feature Request" },
        { value: "question", label: "Question" },
        { value: "other", label: "Other" },
      ],
    },
    { key: "description", label: "Description", type: "textarea" },
  ],
};

const updateServices: Record<
  RequestType,
  (id: string, data: Record<string, unknown>) => Promise<unknown>
> = {
  vm: (id, data) => vmRequestsService.update(id, data),
  "vm-access": (id, data) => vmAccessRequestsService.update(id, data),
  artemis: (id, data) => artemisDeveloperRequestsService.update(id, data),
  "tum-guest": (id, data) => tumGuestRequestsService.update(id, data),
  support: (id, data) => supportRequestsService.update(id, data),
};

export function RequestEditSheet({
  request,
  detail,
  open,
  onOpenChange,
  onSaved,
}: RequestEditSheetProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form data when sheet opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && detail && request) {
      const fields = editableFields[request.type];
      const initial: Record<string, string> = {};
      for (const field of fields) {
        const value = detail[field.key];
        initial[field.key] = value != null ? String(value) : "";
      }
      setFormData(initial);
      setError(null);
    }
    onOpenChange(isOpen);
  };

  const handleSave = async () => {
    if (!request) return;
    setSaving(true);
    setError(null);

    try {
      const fields = editableFields[request.type];
      const payload: Record<string, unknown> = {};
      for (const field of fields) {
        const originalValue = detail?.[field.key];
        const newValue = formData[field.key];
        if (String(originalValue ?? "") !== newValue) {
          const apiKey = field.apiKey ?? field.key;
          payload[apiKey] = newValue || null;
        }
      }

      if (Object.keys(payload).length === 0) {
        onOpenChange(false);
        return;
      }

      await updateServices[request.type](request.id, payload);
      onOpenChange(false);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  if (!request) return null;

  const fields = editableFields[request.type];

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Edit Request</SheetTitle>
        </SheetHeader>

        <div className="mt-2 flex flex-col gap-4 px-4">
          {fields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={field.key}>{field.label}</Label>
              {field.type === "select" ? (
                <Select
                  value={formData[field.key] ?? ""}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, [field.key]: value }))
                  }
                >
                  <SelectTrigger id={field.key} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field.type === "textarea" ? (
                <Textarea
                  id={field.key}
                  value={formData[field.key] ?? ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      [field.key]: e.target.value,
                    }))
                  }
                  rows={3}
                />
              ) : (
                <Input
                  id={field.key}
                  value={formData[field.key] ?? ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      [field.key]: e.target.value,
                    }))
                  }
                />
              )}
            </div>
          ))}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <SheetFooter className="mt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
