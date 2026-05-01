import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { SSHKeyStep } from "@/components/shared/SSHKeyStep";
import { Card, CardContent } from "@/components/ui/card";
import { FormNavigation } from "@/components/ui/form-navigation";
import {
  defaultVMAccessRequestValues,
  type VMAccessRequest,
  vmAccessRequestSchema,
} from "@/types/vm-access-request";
import { StepProgress, VM_ACCESS_STEPS } from "./StepProgress";
import { AccessDetailsStep } from "./steps/AccessDetailsStep";
import { ReviewStep } from "./steps/ReviewStep";

interface VMAccessRequestFormProps {
  onSubmit: (data: VMAccessRequest) => Promise<void>;
  isSubmitting: boolean;
  submitFailed?: boolean;
}

export function VMAccessRequestForm({
  onSubmit,
  isSubmitting,
  submitFailed,
}: VMAccessRequestFormProps) {
  const [currentStep, setCurrentStep] = useState(1);

  const form = useForm<VMAccessRequest>({
    resolver: zodResolver(vmAccessRequestSchema),
    defaultValues: defaultVMAccessRequestValues,
    mode: "onChange",
  });

  const { errors } = form.formState;

  const validateCurrentStep = async (): Promise<boolean> => {
    const fieldsToValidate = getFieldsForStep(currentStep);
    if (fieldsToValidate.length === 0) {
      // Review step - validate full form
      return form.trigger();
    }
    return form.trigger(fieldsToValidate);
  };

  const getFieldsForStep = (step: number): (keyof VMAccessRequest)[] => {
    switch (step) {
      case 1:
        return ["hostname", "justification", "contactPerson"];
      case 2:
        return ["sshKey"];
      default:
        return [];
    }
  };

  const hasErrorsInCurrentStep = (): boolean => {
    const fields = getFieldsForStep(currentStep);
    return fields.some((field) => {
      const error = errors[field];
      return error !== undefined;
    });
  };

  const handleNext = async () => {
    const isValid = await validateCurrentStep();
    if (isValid && currentStep < VM_ACCESS_STEPS.length) {
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
      await onSubmit(data);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <AccessDetailsStep />;
      case 2:
        return <SSHKeyStep />;
      case 3:
        return <ReviewStep />;
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
      if (currentStep < VM_ACCESS_STEPS.length) {
        handleNext();
      }
    }
  };

  return (
    <FormProvider {...form}>
      <form
        onSubmit={preventFormSubmit}
        onKeyDown={handleKeyDown}
        className="space-y-8"
      >
        <StepProgress steps={VM_ACCESS_STEPS} currentStep={currentStep} />

        <Card>
          <CardContent>{renderStep()}</CardContent>
        </Card>

        <FormNavigation
          currentStep={currentStep}
          totalSteps={VM_ACCESS_STEPS.length}
          isSubmitting={isSubmitting}
          submitFailed={submitFailed}
          isNextDisabled={hasErrorsInCurrentStep()}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onSubmit={handleFormSubmit}
        />
      </form>
    </FormProvider>
  );
}
