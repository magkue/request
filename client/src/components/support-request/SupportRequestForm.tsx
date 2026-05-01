import { zodResolver } from "@hookform/resolvers/zod";
import { CircleX, Loader2 } from "lucide-react";
import { FormProvider, useForm } from "react-hook-form";
import { RequesterInfo } from "@/components/shared/RequesterInfo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import {
  CATEGORY_LABELS,
  getDefaultSupportRequestValues,
  type SupportRequest,
  supportCategories,
  supportRequestSchema,
} from "@/types/support-request";

interface SupportRequestFormProps {
  onSubmit: (data: SupportRequest) => void;
  isSubmitting: boolean;
  submitFailed?: boolean;
}

export function SupportRequestForm({
  onSubmit,
  isSubmitting,
  submitFailed,
}: SupportRequestFormProps) {
  const { isAuthenticated, user } = useAuth();

  const form = useForm<SupportRequest>({
    resolver: zodResolver(supportRequestSchema),
    defaultValues: getDefaultSupportRequestValues(isAuthenticated),
    mode: "onBlur",
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Requester Info (authenticated) */}
        {isAuthenticated && user && (
          <>
            <RequesterInfo user={user} />
            <Separator />
          </>
        )}

        {/* Anonymous identity fields */}
        {!isAuthenticated && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Information</CardTitle>
              <CardDescription>
                Please provide your contact details so we can follow up on your
                request.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="your.email@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tumId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>TUM Identifier (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., ab12cde" {...field} />
                    </FormControl>
                    <FormDescription>
                      If you have a TUM account, please provide your TUM
                      identifier.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        )}

        {/* Support request details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Support Details</CardTitle>
            <CardDescription>
              Describe your issue or request so we can help you as quickly as
              possible.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Brief summary of your request"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="grid grid-cols-2 gap-4 sm:grid-cols-4"
                    >
                      {supportCategories.map((cat) => (
                        <div key={cat}>
                          <RadioGroupItem
                            value={cat}
                            id={`cat-${cat}`}
                            className="peer sr-only"
                          />
                          <Label
                            htmlFor={`cat-${cat}`}
                            className="flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 text-center hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                          >
                            <span className="text-sm font-medium">
                              {CATEGORY_LABELS[cat]}
                            </span>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Please describe your issue or request in detail..."
                      className="min-h-[150px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Include any relevant details such as error messages, steps
                    to reproduce, or links.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSubmitting}
            variant={submitFailed ? "destructive" : "default"}
            className={submitFailed ? "animate-shake" : ""}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : submitFailed ? (
              <>
                <CircleX className="mr-2 h-4 w-4" />
                Retry Submission
              </>
            ) : (
              "Submit Request"
            )}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
