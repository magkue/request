import { ArrowLeft, LogIn, UserX } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArtemisRequestForm } from "@/components/artemis-request/ArtemisRequestForm";
import { RequestSuccessCard } from "@/components/shared/RequestSuccessCard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { submitArtemisRequest } from "@/lib/api";
import { handleSubmissionFailure } from "@/lib/submission-error";
import type { ArtemisRequest, GitHubUser } from "@/types/artemis-request";

export function ArtemisRequestPage() {
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

  const handleSubmit = async (
    data: ArtemisRequest,
    githubUser?: GitHubUser,
  ) => {
    setIsSubmitting(true);
    setSubmitFailed(false);
    try {
      const response = await submitArtemisRequest({
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
        githubUser,
      });

      if (response.success && response.data) {
        setSubmitResult({
          success: true,
          requestId: response.data.requestId,
          ticketUrl: response.data.ticketUrl,
        });
      } else {
        handleSubmissionFailure(
          "Artemis Developer Access",
          data,
          isAuthenticated,
          setSubmitFailed,
          { apiError: response.error, statusCode: response.statusCode },
        );
      }
    } catch (error) {
      handleSubmissionFailure(
        "Artemis Developer Access",
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
        description="Your Artemis developer access request has been submitted successfully."
        onBack={() => navigate("/")}
      >
        <p className="text-sm text-muted-foreground">
          You will receive an email notification once your request has been
          processed and you have been added to the Artemis GitHub organization.
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
        <h1 className="text-3xl font-bold">Request Artemis Developer Access</h1>
        <p className="mt-2 text-muted-foreground">
          Fill out the form below to request access to the Artemis GitHub
          organization and Slack workspace.
        </p>
      </div>

      <ArtemisRequestForm
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitFailed={submitFailed}
      />
    </div>
  );
}
