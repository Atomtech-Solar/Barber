export const mockCompanies = [
  { id: '1', name: 'Barbearia Premium', slug: 'barbearia-premium', phone: '(11) 99999-0001', email: 'contato@barbpremium.com', status: 'active' as const, logo: '✂️' },
  { id: '2', name: 'Studio Nails', slug: 'studio-nails', phone: '(11) 99999-0002', email: 'contato@studionails.com', status: 'active' as const, logo: '💅' },
  { id: '3', name: 'Salão Beleza Pura', slug: 'salao-beleza-pura', phone: '(11) 99999-0003', email: 'contato@belezapura.com', status: 'blocked' as const, logo: '💇' },
  { id: '4', name: 'Barber House', slug: 'barber-house', phone: '(11) 99999-0004', email: 'contato@barberhouse.com', status: 'active' as const, logo: '💈' },
];

export const mockServices = [
  { id: '1', name: 'Corte Masculino', duration: 30, price: 45 },
  { id: '2', name: 'Barba', duration: 30, price: 35 },
  { id: '3', name: 'Corte + Barba', duration: 60, price: 70 },
  { id: '4', name: 'Degradê', duration: 45, price: 55 },
  { id: '5', name: 'Hidratação', duration: 40, price: 50 },
];

export const mockProfessionals = [
  { id: '1', name: 'Carlos Silva', role: 'Barbeiro', avatar: '👨', services: ['1', '2', '3', '4'] },
  { id: '2', name: 'Ana Santos', role: 'Cabeleireira', avatar: '👩', services: ['1', '4', '5'] },
  { id: '3', name: 'Pedro Oliveira', role: 'Barbeiro', avatar: '🧔', services: ['1', '2', '3'] },
];

export const mockClients = [
  { id: '1', name: 'João Mendes', email: 'joao@email.com', phone: '(11) 98888-0001', visits: 12 },
  { id: '2', name: 'Maria Costa', email: 'maria@email.com', phone: '(11) 98888-0002', visits: 8 },
  { id: '3', name: 'Lucas Ferreira', email: 'lucas@email.com', phone: '(11) 98888-0003', visits: 5 },
  { id: '4', name: 'Fernanda Lima', email: 'fernanda@email.com', phone: '(11) 98888-0004', visits: 15 },
  { id: '5', name: 'Ricardo Alves', email: 'ricardo@email.com', phone: '(11) 98888-0005', visits: 3 },
];

export const mockAppointments = [
  { id: '1', client: 'João Mendes', service: 'Corte + Barba', professional: 'Carlos Silva', date: '2026-02-22', time: '09:00', duration: 60, status: 'confirmed' as const },
  { id: '2', client: 'Maria Costa', service: 'Hidratação', professional: 'Ana Santos', date: '2026-02-22', time: '10:00', duration: 40, status: 'confirmed' as const },
  { id: '3', client: 'Lucas Ferreira', service: 'Degradê', professional: 'Pedro Oliveira', date: '2026-02-22', time: '11:00', duration: 45, status: 'pending' as const },
  { id: '4', client: 'Fernanda Lima', service: 'Corte Masculino', professional: 'Carlos Silva', date: '2026-02-22', time: '14:00', duration: 30, status: 'confirmed' as const },
  { id: '5', client: 'Ricardo Alves', service: 'Barba', professional: 'Pedro Oliveira', date: '2026-02-22', time: '15:00', duration: 30, status: 'pending' as const },
];

export const mockProducts = [
  { id: '1', name: 'Pomada Modeladora', stock: 15, price: 35, minStock: 5 },
  { id: '2', name: 'Óleo para Barba', stock: 3, price: 45, minStock: 5 },
  { id: '3', name: 'Shampoo Profissional', stock: 22, price: 28, minStock: 10 },
  { id: '4', name: 'Cera Capilar', stock: 8, price: 40, minStock: 5 },
];

export const mockTransactions = [
  { id: '1', description: 'Corte + Barba - João', type: 'income' as const, amount: 70, date: '2026-02-22' },
  { id: '2', description: 'Pomada Modeladora', type: 'income' as const, amount: 35, date: '2026-02-22' },
  { id: '3', description: 'Produto Limpeza', type: 'expense' as const, amount: -25, date: '2026-02-22' },
  { id: '4', description: 'Hidratação - Maria', type: 'income' as const, amount: 50, date: '2026-02-22' },
  { id: '5', description: 'Degradê - Lucas', type: 'income' as const, amount: 55, date: '2026-02-22' },
];

export const mockWeeklyRevenue = [
  { day: 'Seg', value: 450 },
  { day: 'Ter', value: 380 },
  { day: 'Qua', value: 520 },
  { day: 'Qui', value: 490 },
  { day: 'Sex', value: 680 },
  { day: 'Sáb', value: 820 },
  { day: 'Dom', value: 0 },
];
