"use client";
import { useEffect, useState, useCallback } from "react";
import {
  ShoppingCart,
  Warehouse,
  Truck,
  BarChart3,
  Activity,
  Zap,
  ArrowRight,
  Clock,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import { getMetrics, getComparison } from "@/lib/api";

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [comparison, setComparison] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [m, c] = await Promise.all([getMetrics(), getComparison()]);
      setMetrics(m);
      setComparison(c);
    } catch {
      /* backend might not be running */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
  }, [refresh]);

  const eventLog = metrics?.event_log?.slice(-8).reverse() ?? [];

  return (
    <div className="animate-in">
      {/* Stats Row */}
      <div className="stats-grid mb-6">
        <StatCard
          title="Total Orders"
          value={metrics?.total_orders ?? "—"}
          sub="All time"
          icon={<ShoppingCart size={18} />}
          color="blue"
        />
        <StatCard
          title="Active Shipments"
          value={metrics?.total_shipments ?? "—"}
          sub="In system"
          icon={<Truck size={18} />}
          color="orange"
        />
        <StatCard
          title="Stock SKUs"
          value={metrics?.total_stock_items ?? "—"}
          sub="Products"
          icon={<Warehouse size={18} />}
          color="green"
        />
        <StatCard
          title="RPC Calls"
          value={metrics?.rpc_call_count ?? "—"}
          sub={`Avg ${metrics?.rpc_avg_latency_ms?.toFixed(1) ?? "—"}ms`}
          icon={<Zap size={18} />}
          color="purple"
        />
        <StatCard
          title="MOC Events"
          value={metrics?.moc_event_count ?? "—"}
          sub={`System 2 · Avg ${metrics?.moc_avg_latency_ms?.toFixed(1) ?? "—"}ms`}
          icon={<MessageSquare size={18} />}
          color="cyan"
        />
      </div>

      <div className="grid-2 mb-6" style={{ gridTemplateColumns: "2fr 1fr" }}>
        {/* Node Topology */}
        <div className="card">
          <div className="section-header">
            <div>
              <div className="section-title">System Topology</div>
              <div className="section-subtitle">
                2 distributed systems with RPC & MOC communication
              </div>
            </div>
            <button onClick={refresh} className="btn btn-ghost btn-sm">
              <RefreshCw size={13} /> Refresh
            </button>
          </div>
          <div className="grid-2 gap-4">
            <NodeCard
              member={1}
              name="System 1 — Orders & Warehouse"
              role="Order creation, stock management & validation (port 8081)"
              rpc="CheckStock on every order • ApproveShipment on dispatch"
              moc="Publishes OrderCreated • StockUpdated"
              color="member-1"
              iconBg="node-icon-1"
              iconColor="#6378ff"
            />
            <NodeCard
              member={2}
              name="System 2 — Shipment & Analytics"
              role="Dispatch, delivery tracking & system metrics (port 8082)"
              rpc="GetMetricsRPC for live dashboard data"
              moc="Publishes ShipmentDispatched • DeliveryCompleted • Consumes all events"
              color="member-2"
              iconBg="node-icon-2"
              iconColor="#00e676"
            />
          </div>
        </div>

        {/* Quick Comparison */}
        <div className="card">
          <div className="section-title mb-4">RPC vs MOC</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <ProtocolStat
              name="RPC (gRPC-style)"
              color="var(--accent)"
              latency={metrics?.rpc_avg_latency_ms}
              count={metrics?.rpc_call_count}
              errors={metrics?.rpc_error_count}
              type="Synchronous · Blocking"
            />
            <hr
              style={{ border: "none", borderTop: "1px solid var(--border)" }}
            />
            <ProtocolStat
              name="MOC (Event Bus)"
              color="var(--accent-3)"
              latency={metrics?.moc_avg_latency_ms}
              count={metrics?.moc_event_count}
              errors={metrics?.moc_dlq_count}
              type="Asynchronous · Non-blocking"
              extra={{
                queue: metrics?.moc_queue_depth ?? 0,
                retries: metrics?.moc_retry_count ?? 0,
              }}
            />
          </div>
          <div className="mt-6">
            <div className="card-title">MOC Bus Status</div>
            <div
              className="flex items-center gap-3 mt-2"
              style={{ flexWrap: "wrap" }}
            >
              <span className="badge badge-blue">
                Queue: {metrics?.moc_queue_depth ?? 0}
              </span>
              <span className="badge badge-orange">
                Retries: {metrics?.moc_retry_count ?? 0}
              </span>
              <span
                className={`badge ${(metrics?.moc_dlq_count ?? 0) > 0 ? "badge-red" : "badge-green"}`}
              >
                DLQ: {metrics?.moc_dlq_count ?? 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Event Log */}
      <div className="card">
        <div className="section-header">
          <div>
            <div className="section-title">Live Event Log</div>
            <div className="section-subtitle">
              Last 8 RPC calls and MOC events across all nodes
            </div>
          </div>
          <div className="badge badge-blue">
            <Activity size={11} /> Live
          </div>
        </div>
        {loading ? (
          <div
            style={{
              textAlign: "center",
              padding: "32px",
              color: "var(--text-muted)",
            }}
          >
            <div className="spinner" style={{ margin: "0 auto 12px" }} />
            Connecting to backend…
          </div>
        ) : eventLog.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "32px",
              color: "var(--text-muted)",
            }}
          >
            No events yet. Create an order to start seeing events.
          </div>
        ) : (
          <div className="event-log">
            {eventLog.map((e: any, i: number) => (
              <div key={i} className="event-item">
                <span
                  className={`event-item-type ${e.type === "RPC" ? "badge badge-blue" : "badge badge-cyan"}`}
                >
                  {e.type}
                </span>
                <span className="event-item-event">{e.event}</span>
                <span className="event-item-from">
                  {e.node_from} <ArrowRight size={10} /> {e.node_to}
                </span>
                <span
                  className="event-item-latency"
                  style={{
                    color: e.latency_ms < 50 ? "var(--green)" : "var(--orange)",
                  }}
                >
                  {e.latency_ms}ms
                </span>
                <span
                  className={`event-item-status badge ${e.success ? "badge-green" : "badge-red"}`}
                >
                  {e.success ? "✓" : "✗"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, sub, icon, color }: any) {
  const colorMap: any = {
    blue: "var(--accent)",
    green: "var(--green)",
    orange: "var(--orange)",
    purple: "var(--accent-2)",
    cyan: "var(--accent-3)",
  };
  return (
    <div
      className="card card-sm"
      style={{ position: "relative", overflow: "hidden" }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <div className="card-title">{title}</div>
          <div className="card-value" style={{ fontSize: 28 }}>
            {value}
          </div>
          <div className="card-sub">{sub}</div>
        </div>
        <div style={{ color: colorMap[color], opacity: 0.8 }}>{icon}</div>
      </div>
    </div>
  );
}

function NodeCard({
  member,
  name,
  role,
  rpc,
  moc,
  status,
  metrics,
  color,
  iconBg,
  iconColor,
}: any) {
  return (
    <div className={`node-card ${color}`}>
      <div className="node-header">
        <div>
          <div className="node-name">
            Member {member}: {name}
          </div>
          <div className="node-role">{role}</div>
        </div>
        <div
          className={`node-icon ${iconBg}`}
          style={{ color: iconColor, fontSize: 18, fontWeight: 800 }}
        >
          M{member}
        </div>
      </div>
      <div className="node-metrics">
        <div
          style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}
        >
          RPC:
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--accent)",
            padding: "3px 8px",
            background: "rgba(99,120,255,0.08)",
            borderRadius: 6,
          }}
        >
          {rpc}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            margin: "6px 0 4px",
          }}
        >
          MOC:
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--accent-3)",
            padding: "3px 8px",
            background: "rgba(0,229,255,0.06)",
            borderRadius: 6,
          }}
        >
          {moc}
        </div>
        {status && (
          <div
            className={`badge ${status === "online" ? "badge-green" : "badge-red"} mt-4`}
            style={{ marginTop: 10 }}
          >
            {status === "online" ? "● Online" : "● Crashed"}
          </div>
        )}
      </div>
    </div>
  );
}

function ProtocolStat({
  name,
  color,
  latency,
  count,
  errors,
  type,
  extra,
}: any) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color }}>{name}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{type}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color }}>
            {latency?.toFixed(1) ?? "—"}ms
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            avg latency
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <span className="badge badge-blue">
          <Clock size={9} /> {count ?? 0} calls
        </span>
        <span
          className={`badge ${(errors ?? 0) > 0 ? "badge-red" : "badge-green"}`}
        >
          {errors ?? 0} errors
        </span>
        {extra && (
          <>
            <span className="badge badge-yellow">Q:{extra.queue}</span>
            <span className="badge badge-orange">Retry:{extra.retries}</span>
          </>
        )}
      </div>
    </div>
  );
}
