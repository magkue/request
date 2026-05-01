import { ArrowLeft, LogIn, UserX } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { RequestSuccessCard } from "@/components/shared/RequestSuccessCard";
import { SupportRequestForm } from "@/components/support-request/SupportRequestForm";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { submitSupportRequest } from "@/lib/api";
import { handleSubmissionFailure } from "@/lib/submission-error";
import type { SupportRequest } from "@/types/support-request";

export function SupportRequestPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading, login } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  const [continueAnonymous, setContinueAnonymous] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    requestId?: string;
    ticketUrl?: string | null;
  } | null>(null);

  const handleSubmit = async (data: SupportRequest) => {
    setIsSubmitting(true);
    setSubmitFailed(false);
    try {
      const response = await submitSupportRequest({
        ...data,
        user:
          isAuthenticated && user
            ? {
                id: user.id,
                email: user.email,
                username: user.username,
                fullName: user.fullName,
              }
            : undefined,
      });

      if (response.success && response.data) {
        setSubmitResult({
          success: true,
          requestId: response.data.requestId,
          ticketUrl: response.data.ticketUrl,
        });
      } else {
        handleSubmissionFailure(
          "Support Request",
          data,
          isAuthenticated,
          setSubmitFailed,
          { apiError: response.error, statusCode: response.statusCode },
        );
      }
    } catch (error) {
      handleSubmissionFailure(
        "Support Request",
        data,
        isAuthenticated,
        setSubmitFailed,
        { caughtError: error },
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitResult?.success) {
    return (
      <RequestSuccessCard
        requestId={submitResult.requestId ?? ""}
        ticketUrl={submitResult.ticketUrl}
        description="Your support request has been submitted successfully."
        onBack={() => navigate("/")}
      >
        <p className="text-sm text-muted-foreground">
          Our team will review your request and get back to you as soon as
          possible.
        </p>
      </RequestSuccessCard>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated && !continueAnonymous) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
          className="mb-8"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Sign in to continue</CardTitle>
            <CardDescription>
              If you have a TUM account, please sign in first. This will
              pre-fill your information and link the request to your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button onClick={login} className="w-full gap-2">
              <LogIn className="h-4 w-4" />
              Sign in with TUM account
            </Button>
            <Button
              variant="outline"
              onClick={() => setContinueAnonymous(true)}
              className="w-full gap-2"
            >
              <UserX className="h-4 w-4" />
              Continue without sign in
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Support Request</h1>
        <p className="mt-2 text-muted-foreground">
          Describe your issue or request and our team will get back to you.
        </p>
      </div>

      <SupportRequestForm
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitFailed={submitFailed}
      />
    </div>
  );
}
