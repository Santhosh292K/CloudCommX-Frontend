'use client';
import { useState, useEffect, useCallback } from 'react';
import { Warehouse, AlertTriangle, RefreshCw, Zap, Shield } from 'lucide-react';
import { getStock, getWarehouseStatus, simulateCrash, recoverWarehouse, updateStock } from '@/lib/api';

export default function WarehousePage() {
    const [stock, setStock] = useState<any[]>([]);
    const [status, setStatus] = useState<any>(null);
    const [crashing, setCrashing] = useState(false);
    const [crashResult, setCrashResult] = useState<any>(null);
    const [stockForm, setStockForm] = useState({ product: '', quantity: 0 });
    const [stockMsg, setStockMsg] = useState('');

    const refresh = useCallback(async () => {
        try {
            const [s, st] = await Promise.all([getStock(), getWarehouseStatus()]);
            setStock(s.stock ?? []);
            setStatus(st);
        } catch { }
    }, []);

    useEffect(() => {
        refresh();
        const id = setInterval(refresh, 2000);
        return () => clearInterval(id);
    }, [refresh]);

    const handleCrash = async () => {
        setCrashing(true);
        try {
            const r = await simulateCrash(8);
            setCrashResult(r);
        } catch (e: any) {
            setCrashResult({ error: e.message });
        } finally {
            setCrashing(false);
        }
    };

    const handleRecover = async () => {
        await recoverWarehouse();
        setCrashResult(null);
        refresh();
    };

    const handleUpdateStock = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await updateStock(stockForm);
            setStockMsg('Stock updated! StockUpdated MOC event published.');
            refresh();
        } catch (e: any) { setStockMsg('Error: ' + e.message); }
        setTimeout(() => setStockMsg(''), 4000);
    };

    const isOnline = status?.online !== false;

    return (
        <div className="animate-in">
            {/* Status Header */}
            <div className="stats-grid mb-6">
                <div className="card card-sm">
                    <div className="card-title">Node Status</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <div className={`badge ${isOnline ? 'badge-green' : 'badge-red'}`} style={{ fontSize: 14, padding: '6px 14px' }}>
                            {isOnline ? '● Online' : '● Crashed'}
                        </div>
                    </div>
                    <div className="card-sub">{isOnline ? 'Accepting RPC calls & MOC events' : 'MOC events queuing — RPC calls failing'}</div>
                </div>
                <div className="card card-sm">
                    <div className="card-title">Stock SKUs</div>
                    <div className="card-value">{stock.length}</div>
                    <div className="card-sub">Unique products</div>
                </div>
                <div className="card card-sm">
                    <div className="card-title">Total Units</div>
                    <div className="card-value">{stock.reduce((s: number, i: any) => s + i.quantity, 0)}</div>
                    <div className="card-sub">In warehouse</div>
                </div>
                <div className="card card-sm">
                    <div className="card-title">Reserved</div>
                    <div className="card-value" style={{ color: 'var(--orange)' }}>{stock.reduce((s: number, i: any) => s + i.reserved, 0)}</div>
                    <div className="card-sub">Pending orders</div>
                </div>
            </div>

            <div className="grid-2 gap-6 mb-6">
                {/* Crash Simulation */}
                <div className="card">
                    <div className="section-header">
                        <div>
                            <div className="section-title">Crash Simulation</div>
                            <div className="section-subtitle">Demonstrates RPC failure vs MOC durability</div>
                        </div>
                        <AlertTriangle size={18} style={{ color: 'var(--red)' }} />
                    </div>

                    <div className="alert alert-warning mb-4" style={{ fontSize: 12 }}>
                        <strong>What happens when warehouse crashes:</strong>
                        <br />• <strong>RPC:</strong> Callers get immediate timeout error (blocking fails)
                        <br />• <strong>MOC:</strong> Events queue up in the bus, delivered on recovery (durable)
                    </div>

                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button className="btn btn-danger" onClick={handleCrash} disabled={crashing || !isOnline}>
                            {crashing ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Crashing…</> : <><AlertTriangle size={14} /> Simulate Crash (8s)</>}
                        </button>
                        <button className="btn btn-success" onClick={handleRecover} disabled={isOnline}>
                            <Shield size={14} /> Force Recover
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={refresh}>
                            <RefreshCw size={12} /> Refresh
                        </button>
                    </div>

                    {crashResult && (
                        <div className={`alert mt-4 ${crashResult.error ? 'alert-error' : 'alert-warning'}`} style={{ fontSize: 12 }}>
                            {crashResult.error
                                ? `Error: ${crashResult.error}`
                                : <>Warehouse crashed for <strong>{crashResult.duration_seconds}s</strong>. Recovering at {new Date(crashResult.recover_at).toLocaleTimeString()}.
                                    <br />Now try creating an order — watch the RPC call fail immediately!</>
                            }
                        </div>
                    )}

                    {!isOnline && (
                        <div className="mt-4" style={{ padding: 16, borderRadius: 10, background: 'rgba(255,23,68,0.08)', border: '1px solid rgba(255,23,68,0.25)' }}>
                            <div style={{ fontSize: 12, color: 'var(--red)', fontWeight: 700, marginBottom: 6 }}>⚡ Warehouse is OFFLINE</div>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 11 }}>
                                <span className="badge badge-red">RPC calls: FAILING</span>
                                <span className="badge badge-orange">MOC events: QUEUING</span>
                            </div>
                            {status?.crash_until && (
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                                    Auto-recover at: {new Date(status.crash_until).toLocaleTimeString()}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Distributed Systems Observations */}
                    <div className="mt-4" style={{ fontSize: 12, color: 'var(--text-muted)', padding: '12px', background: 'rgba(99,120,255,0.05)', borderRadius: 8, border: '1px solid var(--border)' }}>
                        <strong style={{ color: 'var(--accent)' }}>Observations:</strong>
                        <ul style={{ marginTop: 6, paddingLeft: 16 }}>
                            <li>MOC: observe <strong>message queuing & retry</strong> in Analytics</li>
                            <li>RPC: observe <strong>immediate failures</strong> in Order Management</li>
                            <li>CAP: RPC trades <em>availability</em> for <em>consistency</em></li>
                        </ul>
                    </div>
                </div>

                {/* Update Stock Form */}
                <div className="card">
                    <div className="section-title mb-2">Update Stock</div>
                    <div className="section-subtitle mb-4">Publishes StockUpdated MOC event on save</div>
                    <form onSubmit={handleUpdateStock}>
                        <div className="form-group">
                            <label className="form-label">Product</label>
                            <select className="form-select" value={stockForm.product}
                                onChange={e => setStockForm({ ...stockForm, product: e.target.value })} required>
                                <option value="">Select product…</option>
                                {stock.map((i: any) => <option key={i.product}>{i.product}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">New Quantity</label>
                            <input type="number" className="form-input" min={0} value={stockForm.quantity}
                                onChange={e => setStockForm({ ...stockForm, quantity: parseInt(e.target.value) || 0 })} required />
                        </div>
                        <button className="btn btn-primary w-full" type="submit" disabled={!isOnline}>
                            <Zap size={14} /> Update & Publish StockUpdated
                        </button>
                    </form>
                    {stockMsg && <div className="alert alert-success mt-4" style={{ fontSize: 12 }}>{stockMsg}</div>}
                    {!isOnline && <div className="alert alert-error mt-4" style={{ fontSize: 12 }}>Cannot update stock — warehouse offline</div>}
                </div>
            </div>

            {/* Stock Table */}
            <div className="card">
                <div className="section-header">
                    <div className="section-title">Inventory</div>
                    <button onClick={refresh} className="btn btn-ghost btn-sm"><RefreshCw size={12} /> Refresh</button>
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
                                const pct = item.quantity > 0 ? (item.reserved / item.quantity) * 100 : 0;
                                return (
                                    <tr key={item.product}>
                                        <td style={{ fontWeight: 600 }}>{item.product}</td>
                                        <td>{item.quantity}</td>
                                        <td style={{ color: 'var(--orange)' }}>{item.reserved}</td>
                                        <td style={{ color: available > 10 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{available}</td>
                                        <td style={{ minWidth: 120 }}>
                                            <div style={{ fontSize: 11, marginBottom: 3, color: 'var(--text-muted)' }}>{pct.toFixed(0)}%</div>
                                            <div className="progress-bar">
                                                <div className={`progress-fill ${pct > 80 ? 'progress-fill-orange' : 'progress-fill-green'}`}
                                                    style={{ width: `${pct}%` }} />
                                            </div>
                                        </td>
                                        <td style={{ fontSize: 11 }}>{new Date(item.updated_at).toLocaleTimeString()}</td>
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
