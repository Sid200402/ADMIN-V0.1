// Auth Types
export interface LoginRequest {
  loginId: string;
  password: string;
  lat?: string;
  lng?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
}

export interface AuthData {
  accessToken: string;
  refreshToken: string;
  roles?: string;
  user?: User;
}

export interface ActiveSession {
  sessionId: string;
  deviceInfo: string;
  city: string | null;
  country: string | null;
  ip: string;
  loginAt: string;
  lastActivity?: string;
}

export interface ApiResponse<T> {
  status: number;
  message: string;
  data?: T;
  error?: { code: string; details?: string; retryAfter?: number };
  code?: string;
}

// Dashboard Types
export interface DashboardMetrics {
  totalBills: number;
  saleAmount: number;
  totalReturns: number;
  profit: number;
  expense: number;
  estimatedIncome: number;
  actualIncome: number;
  totalPaid: number;
  totalDue: number;
  cogs: number;
  totalInventory: number;
  totalInventoryValue: number;
}

export interface IncomeExpensePoint {
  label: string;
  income: number;
  expense: number;
}

export interface DashboardMainData {
  storeId: string;
  period: { type: string; startDate: string; endDate: string };
  metrics: DashboardMetrics;
  incomeVsExpenses: IncomeExpensePoint[];
}

export interface StoreData extends DashboardMetrics {
  storeId: string;
  storeName: string;
  storeCode: string;
}

export interface AllStoresData {
  period: { startDate: string; endDate: string };
  combined: Omit<DashboardMetrics, "totalInventory" | "totalInventoryValue">;
  stores: StoreData[];
}

export interface DateWiseEntry extends Omit<DashboardMetrics, "totalInventory" | "totalInventoryValue"> {
  date: string;
}

export interface DateWiseData {
  storeId: string;
  period: { startDate: string; endDate: string };
  dateWise: DateWiseEntry[];
}

export type Period = "daily" | "weekly" | "last-7-days" | "this-month" | "yearly" | "custom";
export type GraphGroup = "day" | "week" | "month";
