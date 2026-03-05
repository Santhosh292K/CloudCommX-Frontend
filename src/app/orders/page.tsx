'use client';
import { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, Plus, RefreshCw, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { createOrder, listOrders } from '@/lib/api';

const PRODUCTS = [
    'Laptop Pro X1', 'Smart Phone Z9', 'Wireless Headset',
    'USB-C Hub', 'Mechanical Keyboard', '4K Monitor', 'Ergonomic Chair', 'Standing Desk',
];

const statusColors: Record<string, string> = {
    pending: 'badge-yellow', approved: 'badge-blue', rejected: 'badge-red',
    shipped: 'badge-orange', delivered: 'badge-green',
};

export default function OrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [form, setForm] = useState({ customer_name: '', product: PRODUCTS[0], quantity: 1 });
    const [loading, setLoading] = useState(false);
    const [lastResult, setLastResult] = useState<any>(null);
    const [error, setError] = useState('');
    const [rpcBlocking, setRpcBlocking] = useState(false);

    const fetchOrders = useCallback(async () => {
        try {
            const data = await listOrders();
            setOrders((data.orders ?? []).sort((a: any, b: any) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            ));
        } catch { }
    }, []);

    useEffect(() => {
        fetchOrders();
        const id = setInterval(fetchOrders, 3000);
        return () => clearInterval(id);
    }, [fetchOrders]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setRpcBlocking(true);
        setError('');
        setLastResult(null);
        const t0 = Date.now();
        try {
            const result = await createOrder(form);
            setLastResult({ ...result, clientLatency: Date.now() - t0 });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
            setRpcBlocking(false);
            fetchOrders();
        }
    };

    return (
        <div className="animate-in">
            <div className="grid-2 gap-6 mb-6" style={{ gridTemplateColumns: '1fr 1.5fr' }}>
                {/* Create Order Form */}
                <div className="card">
                    <div className="section-header">
                        <div>
                            <div className="section-title">Create Order</div>
                            <div className="section-subtitle">Triggers synchronous RPC stock check (blocking)</div>
                        </div>
                        <ShoppingCart size={18} style={{ color: 'var(--accent)' }} />
                    </div>

                    {/* RPC flow explanation */}
                    <div className="alert alert-info mb-4" style={{ fontSize: 12 }}>
                        <strong>RPC Flow:</strong> Order → <em>blocks</em> until Warehouse confirms stock → MOC publishes OrderCreated event (async)
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Customer Name</label>
                            <input className="form-input" placeholder="e.g. Alice Johnson" value={form.customer_name}
                                onChange={e => setForm({ ...form, customer_name: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Product</label>
                            <select className="form-select" value={form.product} onChange={e => setForm({ ...form, product: e.target.value })}>
                                {PRODUCTS.map(p => <option key={p}>{p}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Quantity</label>
                            <input type="number" className="form-input" min={1} max={500} value={form.quantity}
                                onChange={e => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })} required />
                        </div>
                        <button className="btn btn-primary w-full" type="submit" disabled={loading}>
                            {loading ? (
                                <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> RPC Calling Warehouse…</>
                            ) : (
                                <><Plus size={14} /> Place Order</>
                            )}
                        </button>
                    </form>

                    {/* RPC blocking indicator */}
                    {rpcBlocking && (
                        <div className="alert alert-warning mt-4" style={{ fontSize: 12 }}>
                            <Clock size={12} /> <strong>RPC in progress</strong> — caller is blocked waiting for warehouse response…
                        </div>
                    )}

                    {/* Result */}
                    {lastResult && !error && (
                        <div className="alert alert-success mt-4" style={{ fontSize: 12 }}>
                            <CheckCircle size={12} /> Order <strong>{lastResult.order?.id?.substring(0, 8)}…</strong> {lastResult.order?.status}
                            <br />RPC latency: <strong>{lastResult.rpc_latency_ms}ms</strong> (blocking) |
                            Client roundtrip: <strong>{lastResult.clientLatency}ms</strong>
                            <br />Stock check: {lastResult.stock_check?.message}
                        </div>
                    )}
                    {error && (
                        <div className="alert alert-error mt-4" style={{ fontSize: 12 }}>
                            <AlertTriangle size={12} /> {error}
                        </div>
                    )}
                </div>

                {/* Protocol Explanation */}
                <div className="card">
                    <div className="section-title mb-4">Communication Patterns</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <PatternBox
                            title="RPC — Synchronous Stock Check"
                            color="var(--accent)"
                            bg="rgba(99,120,255,0.08)"
                            border="rgba(99,120,255,0.25)"
                            props={[
                                ['Pattern', 'Blocking synchronous call'],
                                ['Direction', 'Order Mgmt → Warehouse'],
                                ['Behavior', 'Order waits until stock confirmed'],
                                ['Failure', 'Immediate error if warehouse down'],
                                ['Latency', '30–80ms (incl. network jitter)'],
                                ['Consistency', 'Strong — always latest stock data'],
                            ]}
                        />
                        <PatternBox
                            title="MOC — OrderCreated Event"
                            color="var(--accent-3)"
                            bg="rgba(0,229,255,0.06)"
                            border="rgba(0,229,255,0.25)"
                            props={[
                                ['Pattern', 'Non-blocking async publish'],
                                ['Direction', 'Order Mgmt → Event Bus → Warehouse'],
                                ['Behavior', 'Order returns immediately after publish'],
                                ['Failure', 'Retry (3x) + dead-letter queue'],
                                ['Latency', '2–15ms publish (consumer async)'],
                                ['Consistency', 'Eventual — Warehouse updates later'],
                            ]}
                        />
                    </div>
                </div>
            </div>

            {/* Orders Table */}
            <div className="card">
                <div className="section-header">
                    <div>
                        <div className="section-title">All Orders</div>
                        <div className="section-subtitle">{orders.length} total</div>
                    </div>
                    <button onClick={fetchOrders} className="btn btn-ghost btn-sm">
                        <RefreshCw size={12} /> Refresh
                    </button>
                </div>
                {orders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                        No orders yet. Place your first order above.
                    </div>
                ) : (
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Order ID</th>
                                    <th>Customer</th>
                                    <th>Product</th>
                                    <th>Qty</th>
                                    <th>Status</th>
                                    <th>RPC Latency</th>
                                    <th>MOC Event</th>
                                    <th>Notes</th>
                                    <th>Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map((o: any) => (
                                    <tr key={o.id}>
                                        <td><span className="font-mono" style={{ fontSize: 11 }}>{o.id.substring(0, 8)}…</span></td>
                                        <td>{o.customer_name}</td>
                                        <td>{o.product}</td>
                                        <td>{o.quantity}</td>
                                        <td><span className={`badge ${statusColors[o.status] ?? 'badge-blue'}`}>{o.status}</span></td>
                                        <td>
                                            <span style={{ color: o.rpc_latency_ms < 60 ? 'var(--green)' : 'var(--orange)', fontWeight: 600 }}>
                                                {o.rpc_latency_ms}ms
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${o.event_published ? 'badge-green' : 'badge-red'}`}>
                                                {o.event_published ? '✓ Published' : '✗ Not sent'}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: 11, maxWidth: 180 }}>{o.notes}</td>
                                        <td style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{new Date(o.created_at).toLocaleTimeString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

function PatternBox({ title, color, bg, border, props }: any) {
    return (
        <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 10 }}>{title}</div>
            {props.map(([k, v]: string[]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{k}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{v}</span>
                </div>
            ))}
        </div>
    );
}
