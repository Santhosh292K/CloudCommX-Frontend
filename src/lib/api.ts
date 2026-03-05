export const ORDER_WAREHOUSE_BASE = process.env.NEXT_PUBLIC_ORDER_WAREHOUSE_URL || 'http://10.248.110.1:8081';
export const SHIPMENT_ANALYTICS_BASE = process.env.NEXT_PUBLIC_SHIPMENT_ANALYTICS_URL || 'http://10.248.110.5:8089';

async function apiFetch<T>(base: string, path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

// Orders (port 8081)
export const createOrder = (body: { customer_name: string; product: string; quantity: number }) =>
  apiFetch<any>(ORDER_WAREHOUSE_BASE, '/api/orders', { method: 'POST', body: JSON.stringify(body) });

export const listOrders = () => apiFetch<any>(ORDER_WAREHOUSE_BASE, '/api/orders');
export const getOrder = (id: string) => apiFetch<any>(ORDER_WAREHOUSE_BASE, `/api/orders/${id}`);

// Warehouse (port 8081)
export const getStock = () => apiFetch<any>(ORDER_WAREHOUSE_BASE, '/api/warehouse/stock');
export const updateStock = (body: { product: string; quantity: number }) =>
  apiFetch<any>(ORDER_WAREHOUSE_BASE, '/api/warehouse/stock', { method: 'POST', body: JSON.stringify(body) });
export const simulateCrash = (duration_seconds?: number) =>
  apiFetch<any>(ORDER_WAREHOUSE_BASE, '/api/warehouse/crash', { method: 'POST', body: JSON.stringify({ duration_seconds: duration_seconds ?? 8 }) });
export const recoverWarehouse = () =>
  apiFetch<any>(ORDER_WAREHOUSE_BASE, '/api/warehouse/recover', { method: 'POST', body: JSON.stringify({}) });
export const getWarehouseStatus = () => apiFetch<any>(ORDER_WAREHOUSE_BASE, '/api/warehouse/status');

// Shipments (port 8089)
export const listShipments = () => apiFetch<any>(SHIPMENT_ANALYTICS_BASE, '/api/shipments');
export const dispatchShipment = (body: {
  order_id: string; customer_name: string; product: string; quantity: number; eventual_consistency?: boolean;
}) => apiFetch<any>(SHIPMENT_ANALYTICS_BASE, '/api/shipments', { method: 'POST', body: JSON.stringify(body) });
export const trackShipment = (id: string) => apiFetch<any>(SHIPMENT_ANALYTICS_BASE, `/api/shipments/${id}`);
export const deliverShipment = (id: string) =>
  apiFetch<any>(SHIPMENT_ANALYTICS_BASE, `/api/shipments/${id}/deliver`, { method: 'POST', body: JSON.stringify({}) });

// Analytics (port 8089)
export const getMetrics = () => apiFetch<any>(SHIPMENT_ANALYTICS_BASE, '/api/analytics/metrics');
export const getComparison = () => apiFetch<any>(SHIPMENT_ANALYTICS_BASE, '/api/analytics/comparison');
export const runLoadTest = (load_level: number) =>
  apiFetch<any>(SHIPMENT_ANALYTICS_BASE, '/api/analytics/loadtest', { method: 'POST', body: JSON.stringify({ load_level }) });
