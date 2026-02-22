import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface CardWidgetProps {
  title: string;
  value: string;
  change?: string;
  icon: LucideIcon;
  trend?: "up" | "down";
}

const CardWidget = ({ title, value, change, icon: Icon, trend }: CardWidgetProps) => (
  <div className="bg-card border border-border rounded-xl p-5">
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm text-muted-foreground">{title}</span>
      <Icon size={18} className="text-primary" />
    </div>
    <p className="text-2xl font-bold">{value}</p>
    {change && (
      <p className={cn("text-xs mt-1", trend === "up" ? "text-success" : "text-destructive")}>
        {change}
      </p>
    )}
  </div>
);

export default CardWidget;
