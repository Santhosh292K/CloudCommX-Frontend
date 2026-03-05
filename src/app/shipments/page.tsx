'use client';
import { useState, useEffect, useCallback } from 'react';
import { Truck, Plus, RefreshCw, CheckCircle, Clock, MapPin } from 'lucide-react';
import { listOrders, listShipments, dispatchShipment, deliverShipment } from '@/lib/api';

const statusColors: Record<string, string> = {
    dispatched: 'badge-blue', in_transit: 'badge-orange',
    delivered: 'badge-green', delayed: 'badge-yellow',
};

export default function ShipmentsPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [shipments, setShipments] = useState<any[]>([]);
    const [form, setForm] = useState({ order_id: '', customer_name: '', product: '', quantity: 1, eventual_consistency: false });
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState('');
    const [selectedShipment, setSelectedShipment] = useState<any>(null);

    const refresh = useCallback(async () => {
        try {
            const [o, s] = await Promise.all([listOrders(), listShipments()]);
            const approvedOrders = (o.orders ?? []).filter((x: any) => x.status === 'approved' || x.status === 'pending');
            setOrders(approvedOrders);
            setShipments((s.shipments ?? []).sort((a: any, b: any) =>
                new Date(b.dispatched_at).getTime() - new Date(a.dispatched_at).getTime()
            ));
        } catch { }
    }, []);

    useEffect(() => {
        refresh();
        const id = setInterval(refresh, 3000);
        return () => clearInterval(id);
    }, [refresh]);

    // Auto-fill form fields when order is selected
    const handleOrderChange = (orderId: string) => {
        const order = orders.find((o: any) => o.id === orderId);
        if (order) {
            setForm(f => ({ ...f, order_id: orderId, customer_name: order.customer_name, product: order.product, quantity: order.quantity }));
        } else {
            setForm(f => ({ ...f, order_id: orderId }));
        }
    };

    const handleDispatch = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setResult(null);
        try {
            const r = await dispatchShipment(form);
            setResult(r);
            refresh();
        } catch (e: any) {
            setError(e.message);
        } finally { setLoading(false); }
    };

    const handleDeliver = async (id: string) => {
        try {
            await deliverShipment(id);
            refresh();
        } catch (e: any) { alert(e.message); }
    };

    return (
        <div className="animate-in">
            <div className="grid-2 gap-6 mb-6" style={{ gridTemplateColumns: '1fr 1.4fr' }}>
                {/* Dispatch Form */}
                <div className="card">
                    <div className="section-header">
                        <div>
                            <div className="section-title">Dispatch Shipment</div>
                            <div className="section-subtitle">RPC approval → MOC ShipmentDispatched event</div>
                        </div>
                        <Truck size={18} style={{ color: 'var(--orange)' }} />
                    </div>

                    <div className="alert alert-info mb-4" style={{ fontSize: 12 }}>
                        <strong>RPC Flow:</strong> Calls Warehouse to deduct stock (blocking) → then async publishes ShipmentDispatched via MOC
                    </div>

                    <form onSubmit={handleDispatch}>
                        <div className="form-group">
                            <label className="form-label">Select Approved Order</label>
                            <select className="form-select" value={form.order_id} onChange={e => handleOrderChange(e.target.value)} required>
                                <option value="">Choose an order…</option>
                                {orders.map((o: any) => (
                                    <option key={o.id} value={o.id}>{o.customer_name} — {o.product} × {o.quantity}</option>
                                ))}
                            </select>
                        </div>
                        {form.order_id && (
                            <>
                                <div className="form-group">
                                    <label className="form-label">Customer</label>
                                    <input className="form-input" value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Product</label>
                                    <input className="form-input" value={form.product} readOnly style={{ opacity: 0.7 }} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Quantity</label>
                                    <input type="number" className="form-input" min={1} value={form.quantity}
                                        onChange={e => setForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))} required />
                                </div>
                            </>
                        )}

                        {/* Eventual Consistency Toggle */}
                        <div className="form-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'rgba(99,120,255,0.06)', borderRadius: 10, border: '1px solid var(--border)' }}>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Eventual Consistency Mode</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Adds 1.5s delay to MOC event publish</div>
                            </div>
                            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input type="checkbox" checked={form.eventual_consistency}
                                    onChange={e => setForm(f => ({ ...f, eventual_consistency: e.target.checked }))}
                                    style={{ appearance: 'none', width: 36, height: 20, background: form.eventual_consistency ? 'var(--accent)' : 'var(--border)', borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s', position: 'relative' }} />
                                <span style={{ fontSize: 12, color: form.eventual_consistency ? 'var(--accent)' : 'var(--text-muted)' }}>
                                    {form.eventual_consistency ? 'ON' : 'OFF'}
                                </span>
                            </label>
                        </div>

                        <button className="btn btn-primary w-full mt-4" type="submit" disabled={loading || !form.order_id}>
                            {loading ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> RPC Approving…</> : <><Truck size={14} /> Dispatch Shipment</>}
                        </button>
                    </form>

                    {result && !error && (
                        <div className="alert alert-success mt-4" style={{ fontSize: 12 }}>
                            <CheckCircle size={12} /> Shipment dispatched! RPC approved stock deduction.
                            {result.eventual_consistency && <><br /><Clock size={10} /> Eventual consistency ON — event delayed {result.event_delay_ms}ms</>}
                        </div>
                    )}
                    {error && <div className="alert alert-error mt-4" style={{ fontSize: 12 }}>{error}</div>}
                </div>

                {/* Tracking Panel */}
                <div className="card">
                    <div className="section-title mb-4">Shipment Tracking</div>
                    {selectedShipment ? (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 700 }}>{selectedShipment.product} × {selectedShipment.quantity}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>For {selectedShipment.customer_name}</div>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <span className={`badge ${statusColors[selectedShipment.status] ?? 'badge-blue'}`}>{selectedShipment.status}</span>
                                    {selectedShipment.eventual_consistency_delay_ms > 0 && (
                                        <span className="badge badge-purple">Eventual Consistency</span>
                                    )}
                                </div>
                            </div>
                            <div className="timeline">
                                {(selectedShipment.tracking_events ?? []).map((e: any, i: number) => (
                                    <div className="timeline-item" key={i}>
                                        <div className={`timeline-dot ${e.event.includes('Delivered') ? 'delivered' : ''}`} />
                                        <div className="timeline-item-event">{e.event}</div>
                                        <div className="timeline-item-meta">
                                            <MapPin size={10} style={{ display: 'inline', marginRight: 4 }} />
                                            {e.location} · {new Date(e.timestamp).toLocaleTimeString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {selectedShipment.status !== 'delivered' && (
                                <button className="btn btn-success mt-4" onClick={() => { handleDeliver(selectedShipment.id); setSelectedShipment(null); }}>
                                    <CheckCircle size={14} /> Mark as Delivered
                                </button>
                            )}
                            <button className="btn btn-ghost btn-sm mt-2" onClick={() => setSelectedShipment(null)}>← Back to list</button>
                        </>
                    ) : (
                        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0', fontSize: 13 }}>
                            <Truck size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
                            Click a shipment below to view tracking timeline
                        </div>
                    )}
                </div>
            </div>

            {/* Shipments Table */}
            <div className="card">
                <div className="section-header">
                    <div>
                        <div className="section-title">All Shipments</div>
                        <div className="section-subtitle">{shipments.length} total</div>
                    </div>
                    <button onClick={refresh} className="btn btn-ghost btn-sm"><RefreshCw size={12} /> Refresh</button>
                </div>
                {shipments.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No shipments yet. Dispatch one above.</div>
                ) : (
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Shipment ID</th>
                                    <th>Customer</th>
                                    <th>Product</th>
                                    <th>Qty</th>
                                    <th>Status</th>
                                    <th>Consistency</th>
                                    <th>Dispatched</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {shipments.map((s: any) => (
                                    <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedShipment(s)}>
                                        <td><span className="font-mono" style={{ fontSize: 11 }}>{s.id.substring(0, 8)}…</span></td>
                                        <td>{s.customer_name}</td>
                                        <td>{s.product}</td>
                                        <td>{s.quantity}</td>
                                        <td><span className={`badge ${statusColors[s.status] ?? 'badge-blue'}`}>{s.status}</span></td>
                                        <td>
                                            {s.eventual_consistency_delay_ms > 0
                                                ? <span className="badge badge-purple">Eventual ({s.eventual_consistency_delay_ms}ms delay)</span>
                                                : <span className="badge badge-green">Strong</span>}
                                        </td>
                                        <td style={{ fontSize: 11 }}>{new Date(s.dispatched_at).toLocaleTimeString()}</td>
                                        <td onClick={e => e.stopPropagation()}>
                                            {s.status !== 'delivered' && (
                                                <button className="btn btn-success btn-sm" onClick={() => handleDeliver(s.id)}>
                                                    Deliver
                                                </button>
                                            )}
                                        </td>
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
