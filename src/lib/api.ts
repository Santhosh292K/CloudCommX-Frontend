export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

// Orders
export const createOrder = (body: { customer_name: string; product: string; quantity: number }) =>
  apiFetch<any>('/api/orders', { method: 'POST', body: JSON.stringify(body) });

export const listOrders = () => apiFetch<any>('/api/orders');
export const getOrder = (id: string) => apiFetch<any>(`/api/orders/${id}`);

// Warehouse
export const getStock = () => apiFetch<any>('/api/warehouse/stock');
export const updateStock = (body: { product: string; quantity: number }) =>
  apiFetch<any>('/api/warehouse/stock', { method: 'POST', body: JSON.stringify(body) });
export const simulateCrash = (duration_seconds?: number) =>
  apiFetch<any>('/api/warehouse/crash', { method: 'POST', body: JSON.stringify({ duration_seconds: duration_seconds ?? 8 }) });
export const recoverWarehouse = () =>
  apiFetch<any>('/api/warehouse/recover', { method: 'POST', body: JSON.stringify({}) });
export const getWarehouseStatus = () => apiFetch<any>('/api/warehouse/status');

// Shipments
export const listShipments = () => apiFetch<any>('/api/shipments');
export const dispatchShipment = (body: {
  order_id: string; customer_name: string; product: string; quantity: number; eventual_consistency?: boolean;
}) => apiFetch<any>('/api/shipments', { method: 'POST', body: JSON.stringify(body) });
export const trackShipment = (id: string) => apiFetch<any>(`/api/shipments/${id}`);
export const deliverShipment = (id: string) =>
  apiFetch<any>(`/api/shipments/${id}/deliver`, { method: 'POST', body: JSON.stringify({}) });

// Analytics
export const getMetrics = () => apiFetch<any>('/api/analytics/metrics');
export const getComparison = () => apiFetch<any>('/api/analytics/comparison');
export const runLoadTest = (load_level: number) =>
  apiFetch<any>('/api/analytics/loadtest', { method: 'POST', body: JSON.stringify({ load_level }) });
