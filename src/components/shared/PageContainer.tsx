import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps {
  /** Omitido quando o layout (ex.: header do dashboard) já exibe o título da página. */
  title?: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

const PageContainer = ({ title, description, actions, children }: PageContainerProps) => {
  const hasHeading = Boolean(title?.trim()) || Boolean(description);
  const hasToolbar = hasHeading || Boolean(actions);

  return (
    <div className="animate-fade-in">
      {hasToolbar ? (
        <div
          className={cn(
            "mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
            !hasHeading && Boolean(actions) && "sm:items-center sm:justify-end"
          )}
        >
          {hasHeading ? (
            <div className="min-w-0">
              {title?.trim() ? <h1 className="text-2xl font-bold">{title}</h1> : null}
              {description ? (
                <div
                  className={cn("text-sm text-muted-foreground", title?.trim() ? "mt-1" : undefined)}
                >
                  {description}
                </div>
              ) : null}
            </div>
          ) : null}
          {actions ? <div className="flex flex-wrap gap-2 sm:shrink-0">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
};

export default PageContainer;
