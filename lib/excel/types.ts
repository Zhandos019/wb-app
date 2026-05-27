export type ChartPoint = {
  name: string;
  sales: number;
};

export type DashboardStats = {
  totalSales: number;
  orders: number;
  avgCheck: number;
  profit: number;
  chart: ChartPoint[];
  storage: number;
};

export const EMPTY_STATS: DashboardStats = {
  totalSales: 0,
  orders: 0,
  avgCheck: 0,
  profit: 0,
  chart: [],
  storage: 0,
};