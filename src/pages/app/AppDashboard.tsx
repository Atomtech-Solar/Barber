import CardWidget from "@/components/shared/CardWidget";
import { DollarSign, Users, Calendar, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { mockWeeklyRevenue, mockAppointments } from "@/data/mockData";

const AppDashboard = () => (
  <div className="space-y-6 animate-fade-in">
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground text-sm">Visão geral do seu negócio</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <CardWidget title="Faturamento Hoje" value="R$ 420" change="+12% vs ontem" icon={DollarSign} trend="up" />
      <CardWidget title="Atendimentos" value="8" change="+3 vs ontem" icon={Calendar} trend="up" />
      <CardWidget title="Clientes Novos" value="2" icon={Users} />
      <CardWidget title="Taxa Ocupação" value="75%" change="+5%" icon={TrendingUp} trend="up" />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold mb-4">Faturamento Semanal</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={mockWeeklyRevenue}>
            <XAxis dataKey="day" stroke="hsl(30, 8%, 50%)" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="hsl(30, 8%, 50%)" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                background: 'hsl(20, 10%, 8%)',
                border: '1px solid hsl(20, 8%, 18%)',
                borderRadius: '8px',
                color: 'hsl(40, 15%, 93%)',
              }}
            />
            <Bar dataKey="value" fill="hsl(43, 96%, 56%)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold mb-4">Próximos Horários</h3>
        <div className="space-y-3">
          {mockAppointments.slice(0, 4).map((apt) => (
            <div key={apt.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                {apt.time}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{apt.client}</p>
                <p className="text-xs text-muted-foreground">{apt.service}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default AppDashboard;
