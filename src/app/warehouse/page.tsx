"use client";
import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Zap } from "lucide-react";
import {
  getStock,
  getWarehouseStatus,
  updateStock,
  getMetrics,
} from "@/lib/api";
// import { simulateCrash, recoverWarehouse } from '@/lib/api'; // crash simulation disabled from UI

export default function WarehousePage() {
  const [stock, setStock] = useState<any[]>([]);
  const [status, setStatus] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  // const [crashing, setCrashing] = useState(false);      // crash simulation disabled
  // const [crashResult, setCrashResult] = useState<any>(null); // crash simulation disabled
  const [stockForm, setStockForm] = useState({ product: "", quantity: 0 });
  const [stockMsg, setStockMsg] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [s, st, m] = await Promise.all([
        getStock(),
        getWarehouseStatus(),
        getMetrics(),
      ]);
      setStock(s.stock ?? []);
      setStatus(st);
      setMetrics(m);
    } catch {}
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 2000);
    return () => clearInterval(id);
  }, [refresh]);

  // Crash simulation disabled — POST /api/warehouse/crash and /recover are available
  // in the backend but removed from this UI demo.
  // const handleCrash = async () => { ... };
  // const handleRecover = async () => { ... };

  const handleUpdateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const r = await updateStock(stockForm);
      // NOTE: StockUpdated MOC event is published to System 1's in-memory event bus.
      // The count shown in Analytics comes from System 2 and will NOT reflect this event
      // until the backend persists MOC events to the shared event_log table.
      setStockMsg(
        `Stock updated. StockUpdated event published on System 1${r?.event_published != null ? (r.event_published ? " ✓" : " — event not published") : "."}`,
      );
      refresh();
    } catch (e: any) {
      setStockMsg("Error: " + e.message);
    }
    setTimeout(() => setStockMsg(""), 5000);
  };

  const isOnline = status?.online !== false;

  return (
    <div className="animate-in">
      {/* Status Header */}
      <div className="stats-grid mb-6">
        <div className="card card-sm">
          <div className="card-title">Node Status</div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 6,
            }}
          >
            <div
              className={`badge ${isOnline ? "badge-green" : "badge-red"}`}
              style={{ fontSize: 14, padding: "6px 14px" }}
            >
              {isOnline ? "● Online" : "● Crashed"}
            </div>
          </div>
          <div className="card-sub">
            {isOnline
              ? "System 1 ready — accepting requests"
              : "System 1 offline — check backend"}
          </div>
        </div>
        <div className="card card-sm">
          <div className="card-title">Stock SKUs</div>
          <div className="card-value">{stock.length}</div>
          <div className="card-sub">Unique products</div>
        </div>
        <div className="card card-sm">
          <div className="card-title">Total Units</div>
          <div className="card-value">
            {stock.reduce((s: number, i: any) => s + i.quantity, 0)}
          </div>
          <div className="card-sub">In warehouse</div>
        </div>
        <div className="card card-sm">
          <div className="card-title">Reserved</div>
          <div className="card-value" style={{ color: "var(--orange)" }}>
            {stock.reduce((s: number, i: any) => s + i.reserved, 0)}
          </div>
          <div className="card-sub">Pending orders</div>
        </div>
        <div className="card card-sm">
          <div className="card-title">RPC Calls</div>
          <div className="card-value" style={{ color: "var(--accent)" }}>
            {metrics?.rpc_call_count ?? "—"}
          </div>
          <div className="card-sub">
            Avg {(metrics?.rpc_avg_latency_ms ?? 0).toFixed(1)}ms
          </div>
        </div>
        <div className="card card-sm">
          <div className="card-title">MOC Events</div>
          <div className="card-value" style={{ color: "var(--accent-3)" }}>
            {metrics?.moc_event_count ?? "—"}
          </div>
          <div className="card-sub">DLQ: {metrics?.moc_dlq_count ?? 0}</div>
        </div>
      </div>

      {/* Crash Simulation — disabled from UI. Backend endpoints POST /api/warehouse/crash
                and POST /api/warehouse/recover are still available for direct API testing. */}

      {/* Update Stock Form */}
      <div className="card mb-6">
        <div className="section-title mb-2">Update Stock</div>
        <div className="section-subtitle mb-4">
          Publishes StockUpdated MOC event on save
        </div>
        <form onSubmit={handleUpdateStock}>
          <div className="form-group">
            <label className="form-label">Product</label>
            <select
              className="form-select"
              value={stockForm.product}
              onChange={(e) =>
                setStockForm({ ...stockForm, product: e.target.value })
              }
              required
            >
              <option value="">Select product…</option>
              {stock.map((i: any) => (
                <option key={i.product}>{i.product}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">New Quantity</label>
            <input
              type="number"
              className="form-input"
              min={0}
              value={stockForm.quantity}
              onChange={(e) =>
                setStockForm({
                  ...stockForm,
                  quantity: parseInt(e.target.value) || 0,
                })
              }
              required
            />
          </div>
          <button
            className="btn btn-primary w-full"
            type="submit"
            disabled={!isOnline}
          >
            <Zap size={14} /> Update & Publish StockUpdated
          </button>
        </form>
        {stockMsg && (
          <div className="alert alert-success mt-4" style={{ fontSize: 12 }}>
            {stockMsg}
          </div>
        )}
        {!isOnline && (
          <div className="alert alert-error mt-4" style={{ fontSize: 12 }}>
            Cannot update stock — System 1 offline
          </div>
        )}
      </div>

      {/* Stock Table */}
      <div className="card">
        <div className="section-header">
          <div className="section-title">Inventory</div>
          <button onClick={refresh} className="btn btn-ghost btn-sm">
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Total Qty</th>
                <th>Reserved</th>
                <th>Available</th>
                <th>Utilization</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {stock.map((item: any) => {
                const available = item.quantity - item.reserved;
                const pct =
                  item.quantity > 0 ? (item.reserved / item.quantity) * 100 : 0;
                return (
                  <tr key={item.product}>
                    <td style={{ fontWeight: 600 }}>{item.product}</td>
                    <td>{item.quantity}</td>
                    <td style={{ color: "var(--orange)" }}>{item.reserved}</td>
                    <td
                      style={{
                        color: available > 10 ? "var(--green)" : "var(--red)",
                        fontWeight: 600,
                      }}
                    >
                      {available}
                    </td>
                    <td style={{ minWidth: 120 }}>
                      <div
                        style={{
                          fontSize: 11,
                          marginBottom: 3,
                          color: "var(--text-muted)",
                        }}
                      >
                        {pct.toFixed(0)}%
                      </div>
                      <div className="progress-bar">
                        <div
                          className={`progress-fill ${pct > 80 ? "progress-fill-orange" : "progress-fill-green"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </td>
                    <td style={{ fontSize: 11 }}>
                      {new Date(item.updated_at).toLocaleTimeString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
