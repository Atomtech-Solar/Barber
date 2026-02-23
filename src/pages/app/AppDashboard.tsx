import { useQuery } from "@tanstack/react-query";
import CardWidget from "@/components/shared/CardWidget";
import { DollarSign, Users, Calendar, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { useTenant } from "@/contexts/TenantContext";
import { bookingService } from "@/services/booking.service";
import { serviceService } from "@/services/service.service";
import { clientService } from "@/services/client.service";
import { format, startOfWeek, addDays } from "date-fns";

const AppDashboard = () => {
  const { currentCompany } = useTenant();
  const companyId = currentCompany?.id ?? "";

  const today = format(new Date(), "yyyy-MM-dd");
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  const { data: todayStats } = useQuery({
    queryKey: ["booking-today", companyId],
    queryFn: () => bookingService.getTodayStats(companyId),
    enabled: !!companyId,
  });

  const { data: weekAppointments } = useQuery({
    queryKey: ["appointments-week", companyId],
    queryFn: () =>
      bookingService.listByCompany(
        companyId,
        format(weekStart, "yyyy-MM-dd"),
        format(addDays(weekStart, 6), "yyyy-MM-dd")
      ),
    enabled: !!companyId,
  });

  const { data: services } = useQuery({
    queryKey: ["services", companyId],
    queryFn: () => serviceService.listByCompany(companyId),
    enabled: !!companyId,
  });

  const { data: clients } = useQuery({
    queryKey: ["clients", companyId],
    queryFn: () => clientService.listByCompany(companyId),
    enabled: !!companyId,
  });

  const { data: todayAppointments } = useQuery({
    queryKey: ["appointments-today", companyId, today],
    queryFn: () => bookingService.listByCompany(companyId, today, today),
    enabled: !!companyId,
  });

  const appointmentsToday = todayStats?.appointmentsToday ?? 0;
  const clientsTotal = clients?.data?.length ?? 0;
  const newClientsToday = 0; // Would require tracking first appointment date
  const workMinutes = 8 * 60;
  const usedMinutes = todayStats?.totalDuration ?? 0;
  const occupancyRate = workMinutes > 0 ? Math.round((usedMinutes / workMinutes) * 100) : 0;

  const weekDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const weekRevenue = weekDays.map((day, i) => {
    const d = addDays(weekStart, i);
    const dayStr = format(d, "yyyy-MM-dd");
    const dayApts = (weekAppointments?.data ?? []).filter((a) => a.date === dayStr);
    const value = dayApts.reduce((acc, a) => {
      const svcIds = (a as { appointment_services?: { service_id: string }[] })?.appointment_services?.map(
        (s) => s.service_id
      ) ?? [];
      const total = (services?.data ?? []).reduce(
        (sum, s) => (svcIds.includes(s.id) ? sum + Number(s.price) : sum),
        0
      );
      return acc + total;
    }, 0);
    return { day, value };
  });

  const nextAppointments = (todayAppointments?.data ?? [])
    .slice(0, 4)
    .map((a) => ({
      id: a.id,
      time: a.start_time?.slice(0, 5) ?? "",
      client: (a as { client?: { full_name?: string } })?.client?.full_name ?? "Cliente",
      service: "Serviço",
    }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Visão geral do seu negócio</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <CardWidget
          title="Atendimentos Hoje"
          value={String(appointmentsToday)}
          icon={Calendar}
        />
        <CardWidget title="Clientes" value={String(clientsTotal)} icon={Users} />
        <CardWidget
          title="Taxa Ocupação"
          value={`${occupancyRate}%`}
          icon={TrendingUp}
        />
        <CardWidget
          title="Faturamento Hoje"
          value="R$ -"
          icon={DollarSign}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold mb-4">Faturamento Semanal</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={weekRevenue}>
              <XAxis
                dataKey="day"
                stroke="hsl(30, 8%, 50%)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(30, 8%, 50%)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(20, 10%, 8%)",
                  border: "1px solid hsl(20, 8%, 18%)",
                  borderRadius: "8px",
                  color: "hsl(40, 15%, 93%)",
                }}
              />
              <Bar
                dataKey="value"
                fill="hsl(43, 96%, 56%)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold mb-4">Próximos Horários</h3>
          <div className="space-y-3">
            {nextAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum agendamento para hoje
              </p>
            ) : (
              nextAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                    {apt.time}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{apt.client}</p>
                    <p className="text-xs text-muted-foreground">{apt.service}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppDashboard;
