import { ReactNode } from "react";

interface PageContainerProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

const PageContainer = ({ title, description, actions, children }: PageContainerProps) => (
  <div className="animate-fade-in">
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && (
          <div className="text-muted-foreground text-sm mt-1">{description}</div>
        )}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
    {children}
  </div>
);

export default PageContainer;
