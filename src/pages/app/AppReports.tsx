import PageContainer from "@/components/shared/PageContainer";
import CardWidget from "@/components/shared/CardWidget";
import { TrendingUp, Scissors, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from "recharts";
import { mockWeeklyRevenue } from "@/data/mockData";

const serviceData = [
  { name: 'Corte + Barba', value: 45 },
  { name: 'Degradê', value: 25 },
  { name: 'Hidratação', value: 15 },
  { name: 'Corte', value: 15 },
];

const COLORS = ['hsl(43, 96%, 56%)', 'hsl(20, 70%, 50%)', 'hsl(200, 60%, 50%)', 'hsl(160, 60%, 45%)'];

const AppReports = () => (
  <PageContainer title="Relatórios" description="Análise de desempenho">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <CardWidget title="Faturamento Mensal" value="R$ 12.450" change="+8%" icon={TrendingUp} trend="up" />
      <CardWidget title="Atendimentos" value="186" icon={Scissors} />
      <CardWidget title="Clientes Ativos" value="94" icon={Users} />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold mb-4">Faturamento Semanal</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={mockWeeklyRevenue}>
            <XAxis dataKey="day" stroke="hsl(30, 8%, 50%)" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="hsl(30, 8%, 50%)" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background: 'hsl(20, 10%, 8%)', border: '1px solid hsl(20, 8%, 18%)', borderRadius: '8px', color: 'hsl(40, 15%, 93%)' }} />
            <Bar dataKey="value" fill="hsl(43, 96%, 56%)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold mb-4">Serviços Mais Vendidos</h3>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={serviceData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} fontSize={11} stroke="none">
              {serviceData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
            </Pie>
            <Tooltip contentStyle={{ background: 'hsl(20, 10%, 8%)', border: '1px solid hsl(20, 8%, 18%)', borderRadius: '8px', color: 'hsl(40, 15%, 93%)' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  </PageContainer>
);

export default AppReports;
