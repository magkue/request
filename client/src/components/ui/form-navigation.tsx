import { ArrowLeft, ArrowRight, CircleX, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FormNavigationProps {
  currentStep: number;
  totalSteps: number;
  isSubmitting: boolean;
  submitFailed?: boolean;
  isNextDisabled?: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

export function FormNavigation({
  currentStep,
  totalSteps,
  isSubmitting,
  submitFailed = false,
  isNextDisabled = false,
  onPrevious,
  onNext,
  onSubmit,
}: FormNavigationProps) {
  const isLastStep = currentStep === totalSteps;

  return (
    <div className="flex justify-between">
      <Button
        type="button"
        variant="outline"
        onClick={onPrevious}
        disabled={currentStep === 1}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Previous
      </Button>

      {isLastStep ? (
        <Button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          variant={submitFailed ? "destructive" : "default"}
          className={cn(submitFailed && "animate-shake")}
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
      ) : (
        <Button type="button" onClick={onNext} disabled={isNextDisabled}>
          Next
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
