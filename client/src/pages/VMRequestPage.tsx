import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { RequestSuccessCard } from "@/components/shared/RequestSuccessCard";
import { Button } from "@/components/ui/button";
import { VMRequestForm } from "@/components/vm-request/VMRequestForm";
import { useAuth } from "@/hooks/useAuth";
import { submitVMRequest } from "@/lib/api";
import { handleSubmissionFailure } from "@/lib/submission-error";
import { cleanProjectDetails } from "@/services/vm-requests";
import type { VMRequest } from "@/types/vm-request";

export function VMRequestPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    requestId?: string;
    ticketUrl?: string | null;
  } | null>(null);

  const handleSubmit = async (rawData: VMRequest) => {
    if (!user) return;

    const data = cleanProjectDetails(rawData);
    setIsSubmitting(true);
    setSubmitFailed(false);
    try {
      const response = await submitVMRequest({
        ...data,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          fullName: user.fullName,
        },
      });

      if (response.success && response.data) {
        setSubmitResult({
          success: true,
          requestId: response.data.requestId,
          ticketUrl: response.data.ticketUrl,
        });
      } else {
        handleSubmissionFailure("VM Request", data, true, setSubmitFailed, {
          apiError: response.error,
          statusCode: response.statusCode,
        });
      }
    } catch (error) {
      handleSubmissionFailure("VM Request", data, true, setSubmitFailed, {
        caughtError: error,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitResult?.success) {
    return (
      <RequestSuccessCard
        requestId={submitResult.requestId ?? ""}
        ticketUrl={submitResult.ticketUrl}
        description="Your VM request has been submitted successfully."
        onBack={() => navigate("/")}
      >
        <p className="text-sm text-muted-foreground">
          You will receive an email notification once your request has been
          processed.
        </p>
      </RequestSuccessCard>
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
        <h1 className="text-3xl font-bold">Request a New VM</h1>
        <p className="mt-2 text-muted-foreground">
          Fill out the form below to request a new virtual machine.
        </p>
      </div>

      <VMRequestForm
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitFailed={submitFailed}
      />
    </div>
  );
}
