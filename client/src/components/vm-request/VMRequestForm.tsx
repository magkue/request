import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { SSHKeyStep } from "@/components/shared/SSHKeyStep";
import { Card, CardContent } from "@/components/ui/card";
import { FormNavigation } from "@/components/ui/form-navigation";
import {
  basicInfoStepSchema,
  defaultVMRequestValues,
  firewallStepSchema,
  resourcesStepSchema,
  sshKeyStepSchema,
  usersStepSchema,
  type VMRequest,
  vmRequestSchema,
} from "@/types/vm-request";
import { StepProgress, VM_REQUEST_STEPS } from "./StepProgress";
import { BasicInfoStep } from "./steps/BasicInfoStep";
import { FirewallStep } from "./steps/FirewallStep";
import { ResourcesStep } from "./steps/ResourcesStep";
import { ReviewStep } from "./steps/ReviewStep";
import { UsersStep } from "./steps/UsersStep";

interface VMRequestFormProps {
  onSubmit: (data: VMRequest) => Promise<void>;
  isSubmitting: boolean;
  submitFailed?: boolean;
}

const stepSchemas = [
  basicInfoStepSchema,
  resourcesStepSchema,
  firewallStepSchema,
  usersStepSchema,
  sshKeyStepSchema,
  null, // Review step - full validation
];

export function VMRequestForm({
  onSubmit,
  isSubmitting,
  submitFailed,
}: VMRequestFormProps) {
  const [currentStep, setCurrentStep] = useState(1);

  const form = useForm<VMRequest>({
    resolver: zodResolver(vmRequestSchema) as never,
    defaultValues: defaultVMRequestValues,
    mode: "onChange",
  });

  const { errors } = form.formState;

  const validateCurrentStep = async (): Promise<boolean> => {
    const schema = stepSchemas[currentStep - 1];

    if (!schema) {
      // Review step - validate full form
      return form.trigger();
    }

    // Get fields to validate based on step
    const fieldsToValidate = getFieldsForStep(currentStep);
    return form.trigger(fieldsToValidate);
  };

  const getFieldsForStep = (step: number): (keyof VMRequest)[] => {
    switch (step) {
      case 1:
        return [
          "hostname",
          "description",
          "projectType",
          "ipraktikum",
          "thesis",
          "chairProject",
        ];
      case 2:
        return ["resources"];
      case 3:
        return ["firewall"];
      case 4:
        return ["additionalUsers"];
      case 5:
        return ["sshKey"];
      case 6:
        return ["additionalComments"];
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
    if (isValid && currentStep < VM_REQUEST_STEPS.length) {
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
        return <BasicInfoStep />;
      case 2:
        return <ResourcesStep />;
      case 3:
        return <FirewallStep />;
      case 4:
        return <UsersStep />;
      case 5:
        return <SSHKeyStep />;
      case 6:
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
      if (currentStep < VM_REQUEST_STEPS.length) {
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
        <StepProgress steps={VM_REQUEST_STEPS} currentStep={currentStep} />

        <Card>
          <CardContent>{renderStep()}</CardContent>
        </Card>

        <FormNavigation
          currentStep={currentStep}
          totalSteps={VM_REQUEST_STEPS.length}
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
