import { cn } from "@/lib/utils";

const STEPS = [
  "Serviço",
  "Profissional",
  "Data",
  "Horário",
  "Seus dados",
  "Confirmar",
];

interface BookingStepsProps {
  currentStep: number;
  className?: string;
}

export function BookingSteps({ currentStep, className }: BookingStepsProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-sm font-medium text-muted-foreground">
        Passo {currentStep + 1} de {STEPS.length}
      </p>
      <div className="flex gap-1">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-all duration-300",
              i <= currentStep ? "bg-primary" : "bg-muted"
            )}
          />
        ))}
      </div>
    </div>
  );
}
