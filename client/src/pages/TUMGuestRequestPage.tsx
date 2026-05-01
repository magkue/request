import { ArrowLeft, Mail } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { RequestSuccessCard } from "@/components/shared/RequestSuccessCard";
import { TUMGuestRequestForm } from "@/components/tum-guest-request/TUMGuestRequestForm";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { submitTUMGuestRequest } from "@/lib/api";
import { handleSubmissionFailure } from "@/lib/submission-error";
import type { TUMGuestRequest } from "@/types/tum-guest-request";

interface SubmitResult {
  success: true;
  requestId: string;
  ticketUrl: string | null;
  wasAuthenticated: boolean;
  requestingForSelf: boolean;
  guestEmail: string;
}

export function TUMGuestRequestPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);

  const handleSubmit = async (data: TUMGuestRequest) => {
    setIsSubmitting(true);
    setSubmitFailed(false);
    try {
      const response = await submitTUMGuestRequest({
        ...data,
        requester:
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
          wasAuthenticated: isAuthenticated,
          requestingForSelf: !data.isLoggedIn && data.requestingForSelf,
          guestEmail: data.email,
        });
      } else {
        handleSubmissionFailure(
          "TUM Guest Account",
          data,
          isAuthenticated,
          setSubmitFailed,
          { apiError: response.error, statusCode: response.statusCode },
        );
      }
    } catch (error) {
      handleSubmissionFailure(
        "TUM Guest Account",
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
    const {
      wasAuthenticated,
      requestingForSelf,
      guestEmail,
      ticketUrl,
      requestId,
    } = submitResult;

    return (
      <RequestSuccessCard
        requestId={requestId}
        ticketUrl={ticketUrl}
        description="Your TUM guest account request has been submitted successfully."
        onBack={() => navigate("/")}
      >
        <Alert>
          <Mail className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium mb-2">What happens next:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              {!wasAuthenticated && requestingForSelf ? (
                <>
                  <li>
                    You will receive an email confirming your request to{" "}
                    <strong>{guestEmail}</strong>
                  </li>
                  <li>
                    We will create the account for you - this may take a few
                    days since manual intervention is necessary
                  </li>
                  <li>
                    You will receive an email with a PIN code to the address you
                    supplied in this form. Please make sure to activate your
                    account within 7 days
                  </li>
                  <li>
                    Set a secure password in TUMonline (you will be prompted to
                    do so)
                  </li>
                  <li>
                    You can then log in to all our systems using your new TUMID
                    (e.g. ga12xyz) and the password you specified
                  </li>
                </>
              ) : (
                <>
                  <li>
                    We will create the account - this may take a few days since
                    manual intervention is necessary
                  </li>
                  <li>
                    The guest (<strong>{guestEmail}</strong>) will receive an
                    email with a PIN code
                  </li>
                  <li>
                    They must activate their account within 7 days of receiving
                    the PIN
                  </li>
                  <li>
                    They will set a secure password in TUMonline during
                    activation
                  </li>
                  <li>
                    Once activated, they can log in to all our systems using
                    their new TUMID and password
                  </li>
                </>
              )}
            </ol>
          </AlertDescription>
        </Alert>

        <p className="text-sm text-muted-foreground">
          If you encounter problems, please reach out to{" "}
          <a
            href="mailto:ls1.admin@in.tum.de"
            className="text-primary hover:underline"
          >
            ls1.admin@in.tum.de
          </a>
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

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
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
        <h1 className="text-3xl font-bold">Request TUM Guest Account</h1>
        <p className="mt-2 text-muted-foreground">
          {isAuthenticated
            ? "Request a TUM guest account for an external person."
            : "Request a TUM guest account for yourself or for someone else."}
        </p>
      </div>

      <TUMGuestRequestForm
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitFailed={submitFailed}
      />
    </div>
  );
}
