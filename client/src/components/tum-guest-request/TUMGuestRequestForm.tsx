import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
import { FormNavigation } from "@/components/ui/form-navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  getDefaultTUMGuestRequestValues,
  type TUMGuestRequest,
  tumGuestRequestSchema,
} from "@/types/tum-guest-request";
import {
  StepProgress,
  TUM_GUEST_STEPS_ANONYMOUS,
  TUM_GUEST_STEPS_LOGGED_IN,
} from "./StepProgress";
import { GuestInfoStep } from "./steps/GuestInfoStep";
import { GuestTypeStep } from "./steps/GuestTypeStep";
import { RequestTypeStep } from "./steps/RequestTypeStep";
import { ReviewStep } from "./steps/ReviewStep";

interface TUMGuestRequestFormProps {
  onSubmit: (data: TUMGuestRequest) => Promise<void>;
  isSubmitting: boolean;
  submitFailed?: boolean;
}

export function TUMGuestRequestForm({
  onSubmit,
  isSubmitting,
  submitFailed,
}: TUMGuestRequestFormProps) {
  const { isAuthenticated, login } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);

  const steps = isAuthenticated
    ? TUM_GUEST_STEPS_LOGGED_IN
    : TUM_GUEST_STEPS_ANONYMOUS;

  const form = useForm<TUMGuestRequest>({
    resolver: zodResolver(tumGuestRequestSchema),
    defaultValues: getDefaultTUMGuestRequestValues(isAuthenticated),
    mode: "onChange",
  });

  // Ensure isLoggedIn and requestingForSelf fields stay in sync with authentication state
  useEffect(() => {
    form.setValue("isLoggedIn" as keyof TUMGuestRequest, isAuthenticated);
    // Logged-in users always request for someone else (the guest)
    if (isAuthenticated) {
      form.setValue("requestingForSelf" as keyof TUMGuestRequest, false);
    }
  }, [isAuthenticated, form]);

  const isLastStep = currentStep === steps.length;

  const getFieldsForStep = (): string[] => {
    if (!isAuthenticated && currentStep === 1) {
      return ["requestingForSelf"];
    }

    const guestInfoStepNumber = isAuthenticated ? 1 : 2;
    if (currentStep === guestInfoStepNumber) {
      const fields = [
        "firstName",
        "lastName",
        "email",
        "birthDate",
        "gender",
        "nationality",
        "nationalityOther",
      ];
      if (!isAuthenticated) {
        fields.push("contactPerson");
      }
      return fields;
    }

    const guestTypeStepNumber = isAuthenticated ? 2 : 3;
    if (currentStep === guestTypeStepNumber) {
      return ["guestType", "ipraktikumFields", "artemisFields", "otherFields"];
    }

    return [];
  };

  const validateCurrentStep = async (): Promise<boolean> => {
    if (!isAuthenticated && currentStep === 1) {
      // Request type step - special handling
      const requestingForSelf = form.getValues(
        "requestingForSelf" as keyof TUMGuestRequest,
      );
      if (requestingForSelf === undefined) {
        form.setError("requestingForSelf" as keyof TUMGuestRequest, {
          message: "Please select who this request is for",
        });
        return false;
      }
      if (requestingForSelf === false) {
        return false;
      }
      return true;
    }

    // Review step - full form validation
    if (currentStep === steps.length) {
      return form.trigger();
    }

    const fields = getFieldsForStep();
    return form.trigger(fields as (keyof TUMGuestRequest)[]);
  };

  const handleNext = async () => {
    const isValid = await validateCurrentStep();
    if (isValid && currentStep < steps.length) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Explicit submit handler - only called when user clicks Submit button
  const handleSubmitClick = async () => {
    // Trigger validation first
    const isValid = await form.trigger();
    if (!isValid) {
      console.error("[TUM Guest Form] Validation failed");
      console.error("[TUM Guest Form] Errors:", form.formState.errors);
      return;
    }

    const data = form.getValues() as TUMGuestRequest;
    console.log("[TUM Guest Form] Submitting:", data);
    console.log("[TUM Guest Form] isAuthenticated:", isAuthenticated);
    console.log("[TUM Guest Form] isLoggedIn in data:", data.isLoggedIn);
    await onSubmit(data);
  };

  // Prevent any form submission via Enter key - use Next button instead
  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!isLastStep) {
        handleNext();
      }
    }
  };

  // Prevent native form submission entirely
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const renderStep = () => {
    if (!isAuthenticated) {
      // Anonymous flow
      switch (currentStep) {
        case 1:
          return <RequestTypeStep onLogin={login} />;
        case 2:
          return <GuestInfoStep />;
        case 3:
          return <GuestTypeStep />;
        case 4:
          return <ReviewStep />;
        default:
          return null;
      }
    }

    // Logged-in flow
    switch (currentStep) {
      case 1:
        return <GuestInfoStep />;
      case 2:
        return <GuestTypeStep />;
      case 3:
        return <ReviewStep />;
      default:
        return null;
    }
  };

  // For anonymous users on step 1, disable next if requesting for someone else
  const requestingForSelf = form.watch(
    "requestingForSelf" as keyof TUMGuestRequest,
  );
  const isNextDisabled =
    !isAuthenticated && currentStep === 1 && requestingForSelf === false;

  return (
    <FormProvider {...form}>
      <form
        onSubmit={handleFormSubmit}
        onKeyDown={handleKeyDown}
        className="space-y-8"
      >
        <StepProgress steps={steps} currentStep={currentStep} />

        <Card>
          <CardContent>{renderStep()}</CardContent>
        </Card>

        <FormNavigation
          currentStep={currentStep}
          totalSteps={steps.length}
          isSubmitting={isSubmitting}
          submitFailed={submitFailed}
          isNextDisabled={isNextDisabled}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onSubmit={handleSubmitClick}
        />
      </form>
    </FormProvider>
  );
}
