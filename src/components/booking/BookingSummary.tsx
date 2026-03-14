import { Calendar, Clock, Scissors, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface BookingSummaryProps {
  companyName?: string;
  serviceName?: string;
  professionalName?: string;
  date?: string;
  time?: string;
  duration?: number;
  totalPrice?: number;
  className?: string;
  compact?: boolean;
}

export function BookingSummary({
  companyName,
  serviceName,
  professionalName,
  date,
  time,
  duration,
  totalPrice,
  className,
  compact = false,
}: BookingSummaryProps) {
  const hasData =
    companyName ?? serviceName ?? professionalName ?? date ?? time;

  if (!hasData) return null;

  const formatDate = (d: string) => {
    const [y, m, day] = d.split("-");
    return `${day}/${m}`;
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4",
        compact && "p-3",
        className
      )}
    >
      <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
        Resumo
      </p>
      <div className={cn("space-y-1.5", compact && "space-y-1")}>
        {companyName && (
          <div className="flex items-center gap-2 text-sm">
            <Scissors size={14} className="text-muted-foreground shrink-0" />
            <span className="truncate">{companyName}</span>
          </div>
        )}
        {serviceName && (
          <div className="flex items-center gap-2 text-sm">
            <Scissors size={14} className="text-muted-foreground shrink-0" />
            <span className="truncate">{serviceName}</span>
          </div>
        )}
        {professionalName && (
          <div className="flex items-center gap-2 text-sm">
            <User size={14} className="text-muted-foreground shrink-0" />
            <span className="truncate">{professionalName}</span>
          </div>
        )}
        {date && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar size={14} className="text-muted-foreground shrink-0" />
            <span>{formatDate(date)}</span>
          </div>
        )}
        {time && (
          <div className="flex items-center gap-2 text-sm">
            <Clock size={14} className="text-muted-foreground shrink-0" />
            <span>
              {time}
              {duration ? ` · ${duration} min` : ""}
            </span>
          </div>
        )}
      </div>
      {totalPrice != null && totalPrice > 0 && (
        <p className="mt-3 pt-2 border-t border-border font-bold text-primary">
          R$ {totalPrice.toFixed(2)}
        </p>
      )}
    </div>
  );
}
