import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
import { FormNavigation } from "@/components/ui/form-navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  type ArtemisRequest,
  artemisRequestSchema,
  type GitHubUser,
  type GitHubVerificationResult,
  getDefaultArtemisRequestValues,
} from "@/types/artemis-request";
import {
  ARTEMIS_REQUEST_STEPS,
  ARTEMIS_REQUEST_STEPS_ANONYMOUS,
  StepProgress,
} from "./StepProgress";
import { AnonymousInfoStep } from "./steps/AnonymousInfoStep";
import { ContactStep } from "./steps/ContactStep";
import { GitHubStep } from "./steps/GitHubStep";
import { ReviewStep } from "./steps/ReviewStep";

interface ArtemisRequestFormProps {
  onSubmit: (data: ArtemisRequest, githubUser?: GitHubUser) => Promise<void>;
  isSubmitting: boolean;
  submitFailed?: boolean;
}

export function ArtemisRequestForm({
  onSubmit,
  isSubmitting,
  submitFailed,
}: ArtemisRequestFormProps) {
  const { isAuthenticated, user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [githubVerification, setGithubVerification] =
    useState<GitHubVerificationResult | null>(null);

  const steps = isAuthenticated
    ? ARTEMIS_REQUEST_STEPS
    : ARTEMIS_REQUEST_STEPS_ANONYMOUS;

  const form = useForm<ArtemisRequest>({
    resolver: zodResolver(artemisRequestSchema) as never,
    defaultValues: getDefaultArtemisRequestValues(
      isAuthenticated,
      user?.email ?? undefined,
    ),
    mode: "onChange",
  });

  const { errors } = form.formState;

  // Map step numbers to actual step content based on login status
  const getStepContent = (step: number) => {
    if (isAuthenticated) {
      // Logged in: GitHub (1), Contact (2), Review (3)
      switch (step) {
        case 1:
          return "github";
        case 2:
          return "contact";
        case 3:
          return "review";
        default:
          return null;
      }
    } else {
      // Anonymous: Personal Info (1), GitHub (2), Contact (3), Review (4)
      switch (step) {
        case 1:
          return "anonymous";
        case 2:
          return "github";
        case 3:
          return "contact";
        case 4:
          return "review";
        default:
          return null;
      }
    }
  };

  const getFieldsForStep = (): string[] => {
    const stepContent = getStepContent(currentStep);
    switch (stepContent) {
      case "anonymous":
        return ["name", "mainEmail"];
      case "github":
        return ["githubUsername", "profileAcknowledgment"];
      case "contact":
        return [
          "slackEmail",
          "contactPerson",
          "advisor",
          "subteams",
          "otherSubteam",
        ];
      case "review":
        return ["additionalComments"];
      default:
        return [];
    }
  };

  const validateCurrentStep = async (): Promise<boolean> => {
    const stepContent = getStepContent(currentStep);

    if (stepContent === "review") {
      return form.trigger();
    }

    // For GitHub step, also check that verification was successful
    if (stepContent === "github") {
      const isValid = await form.trigger(["githubUsername"]);
      if (!isValid) return false;

      // Require verified GitHub account
      if (!githubVerification?.valid) {
        form.setError("githubUsername", {
          type: "manual",
          message: "Please verify your GitHub username",
        });
        return false;
      }
      return true;
    }

    const fieldsToValidate = getFieldsForStep();
    return form.trigger(fieldsToValidate as (keyof ArtemisRequest)[]);
  };

  const hasErrorsInCurrentStep = (): boolean => {
    const fields = getFieldsForStep();
    return fields.some((field) => {
      const error = errors[field as keyof typeof errors];
      return error !== undefined;
    });
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

  const handleFormSubmit = async () => {
    const isValid = await form.trigger();
    if (isValid) {
      const data = form.getValues();
      await onSubmit(data, githubVerification?.user);
    }
  };

  const renderStep = () => {
    const stepContent = getStepContent(currentStep);
    switch (stepContent) {
      case "anonymous":
        return <AnonymousInfoStep />;
      case "github":
        return <GitHubStep onVerificationChange={setGithubVerification} />;
      case "contact":
        return <ContactStep />;
      case "review":
        return <ReviewStep verification={githubVerification} />;
      default:
        return null;
    }
  };

  const preventFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (currentStep < steps.length) {
        handleNext();
      }
    }
  };

  // Check if Next should be disabled on GitHub step
  const isNextDisabled = () => {
    if (hasErrorsInCurrentStep()) return true;

    const stepContent = getStepContent(currentStep);
    if (stepContent === "github" && !githubVerification?.valid) {
      return true;
    }

    return false;
  };

  return (
    <FormProvider {...form}>
      <form
        onSubmit={preventFormSubmit}
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
          isNextDisabled={isNextDisabled()}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onSubmit={handleFormSubmit}
        />
      </form>
    </FormProvider>
  );
}
