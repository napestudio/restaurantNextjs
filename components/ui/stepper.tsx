import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  title: string;
  description?: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export function Stepper({ steps, currentStep, className }: StepperProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = currentStep > stepNumber;
          const isCurrent = currentStep === stepNumber;
          const isUpcoming = currentStep < stepNumber;

          return (
            <div key={index} className="flex items-center flex-1">
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200",
                    {
                      "bg-green-600 border-green-600 text-white": isCompleted,
                      "bg-red-600 border-red-600 text-white scale-110":
                        isCurrent,
                      "bg-white border-gray-300 text-gray-400": isUpcoming,
                    }
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="font-semibold">{stepNumber}</span>
                  )}
                </div>
                <div className="mt-2 text-center">
                  <p
                    className={cn("text-sm font-medium", {
                      "text-gray-900": isCurrent,
                      "text-gray-600": isCompleted,
                      "text-gray-400": isUpcoming,
                    })}
                  >
                    {step.title}
                  </p>
                  {step.description && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-4 transition-all duration-200",
                    {
                      "bg-green-600": isCompleted,
                      "bg-red-600": isCurrent,
                      "bg-gray-300": isUpcoming,
                    }
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
