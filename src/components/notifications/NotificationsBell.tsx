import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { notificationsService } from "@/services/notifications.service";
import { cn } from "@/lib/utils";

interface NotificationsBellProps {
  companyId: string | undefined;
  className?: string;
}

export function NotificationsBell({ companyId, className }: NotificationsBellProps) {
  const { data: count = 0 } = useQuery({
    queryKey: ["notifications-unread", companyId],
    queryFn: async () => {
      const r = await notificationsService.getUnreadCount(companyId!);
      if (r.error) throw new Error(r.error.message);
      return r.count;
    },
    enabled: !!companyId,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  if (!companyId) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn("relative shrink-0", className)}
        disabled
        title="Notificações"
        aria-label="Notificações"
      >
        <Bell className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Button variant="ghost" size="icon" className={cn("relative shrink-0", className)} asChild title="Notificações">
      <Link to="/app/notifications" aria-label="Notificações">
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-0.5 -right-0.5 h-5 min-w-5 px-1 flex items-center justify-center p-0 text-[10px] font-bold"
          >
            {count > 99 ? "99+" : count}
          </Badge>
        )}
      </Link>
    </Button>
  );
}
