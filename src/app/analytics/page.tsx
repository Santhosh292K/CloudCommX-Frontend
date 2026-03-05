'use client';
import { useState, useEffect, useCallback } from 'react';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts';
import { BarChart3, RefreshCw, Zap, Activity } from 'lucide-react';
import { getMetrics, getComparison, runLoadTest } from '@/lib/api';

const LOAD_LEVELS = [100, 500, 1000];

export default function AnalyticsPage() {
    const [metrics, setMetrics] = useState<any>(null);
    const [comparison, setComparison] = useState<any>(null);
    const [loadResults, setLoadResults] = useState<any[]>([]);
    const [loadRunning, setLoadRunning] = useState<number | null>(null);
    const [error, setError] = useState('');

    const refresh = useCallback(async () => {
        try {
            const [m, c] = await Promise.all([getMetrics(), getComparison()]);
            setMetrics(m);
            setComparison(c);
            // Collect load test results from metrics
            if (m.load_test_results?.length) {
                setLoadResults(m.load_test_results);
            }
        } catch (e: any) { setError(e.message); }
    }, []);

    useEffect(() => {
        refresh();
        const id = setInterval(refresh, 4000);
        return () => clearInterval(id);
    }, [refresh]);

    const handleLoadTest = async (level: number) => {
        setLoadRunning(level);
        try {
            const r = await runLoadTest(level);
            setLoadResults(prev => [...prev, r.rpc_result, r.moc_result]);
            refresh();
        } catch (e: any) { setError(e.message); }
        finally { setLoadRunning(null); }
    };

    // Build chart data from live metrics + load test results
    const latencyCompareData = [
        {
            name: 'Avg Latency (ms)',
            RPC: parseFloat((metrics?.rpc_avg_latency_ms ?? 45).toFixed(1)),
            MOC: parseFloat((metrics?.moc_avg_latency_ms ?? 8).toFixed(1)),
        },
    ];

    const countsData = [
        {
            name: 'Calls / Events',
            RPC: metrics?.rpc_call_count ?? 0,
            MOC: metrics?.moc_event_count ?? 0,
        },
    ];

    const reliabilityData = [
        { metric: 'Success Rate', RPC: Math.max(0, 100 - ((metrics?.rpc_error_count ?? 0) / Math.max(1, metrics?.rpc_call_count ?? 1)) * 100), MOC: Math.max(0, 100 - ((metrics?.moc_dlq_count ?? 0) / Math.max(1, metrics?.moc_event_count ?? 1)) * 100) },
        { metric: 'Throughput', RPC: 60, MOC: 95 },
        { metric: 'Availability', RPC: 70, MOC: 95 },
        { metric: 'Consistency', RPC: 98, MOC: 75 },
        { metric: 'Fault Tolerance', RPC: 50, MOC: 90 },
    ];

    // Group load results by level for chart
    const loadChartData = LOAD_LEVELS.map(level => {
        const rpcRes = loadResults.filter(r => r.load_level === level && r.protocol === 'RPC').slice(-1)[0];
        const mocRes = loadResults.filter(r => r.load_level === level && r.protocol === 'MOC').slice(-1)[0];
        return {
            load: `${level} reqs`,
            'RPC Latency': rpcRes?.avg_latency_ms ?? null,
            'MOC Latency': mocRes?.avg_latency_ms ?? null,
            'RPC Throughput': rpcRes?.throughput_rps ?? null,
            'MOC Throughput': mocRes?.throughput_rps ?? null,
        };
    }).filter(d => d['RPC Latency'] !== null || d['MOC Latency'] !== null);

    return (
        <div className="animate-in">
            {error && <div className="alert alert-error mb-4">{error}</div>}

            {/* Quick Stats */}
            <div className="stats-grid mb-6">
                <StatCard label="RPC Calls" value={metrics?.rpc_call_count ?? '—'} sub={`${metrics?.rpc_error_count ?? 0} errors`} color="var(--accent)" />
                <StatCard label="RPC Avg Latency" value={`${(metrics?.rpc_avg_latency_ms ?? 0).toFixed(1)}ms`} sub="Blocking synchronous" color="var(--accent)" />
                <StatCard label="MOC Events" value={metrics?.moc_event_count ?? '—'} sub={`${metrics?.moc_dlq_count ?? 0} in DLQ`} color="var(--accent-3)" />
                <StatCard label="MOC Avg Latency" value={`${(metrics?.moc_avg_latency_ms ?? 0).toFixed(1)}ms`} sub="Publish latency only" color="var(--accent-3)" />
                <StatCard label="Queue Depth" value={metrics?.moc_queue_depth ?? 0} sub="Current MOC backlog" color="var(--orange)" />
            </div>

            <div className="grid-2 gap-6 mb-6">
                {/* Latency Comparison Chart */}
                <div className="card">
                    <div className="section-title mb-2">Latency Comparison</div>
                    <div className="section-subtitle mb-4">RPC (blocking) vs MOC (publish-only)</div>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={latencyCompareData} barCategoryGap="40%">
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,120,255,0.1)" />
                            <XAxis dataKey="name" tick={{ fill: '#7986cb', fontSize: 11 }} />
                            <YAxis tick={{ fill: '#7986cb', fontSize: 11 }} unit="ms" />
                            <Tooltip contentStyle={{ background: '#0f1428', border: '1px solid rgba(99,120,255,0.3)', borderRadius: 8, fontSize: 12 }} />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Bar dataKey="RPC" fill="#6378ff" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="MOC" fill="#00e5ff" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Radar: Protocol Properties */}
                <div className="card">
                    <div className="section-title mb-2">Protocol Properties</div>
                    <div className="section-subtitle mb-4">Comparative radar chart (higher = better)</div>
                    <ResponsiveContainer width="100%" height={220}>
                        <RadarChart data={reliabilityData}>
                            <PolarGrid stroke="rgba(99,120,255,0.2)" />
                            <PolarAngleAxis dataKey="metric" tick={{ fill: '#7986cb', fontSize: 10 }} />
                            <Radar name="RPC" dataKey="RPC" stroke="#6378ff" fill="#6378ff" fillOpacity={0.15} />
                            <Radar name="MOC" dataKey="MOC" stroke="#00e5ff" fill="#00e5ff" fillOpacity={0.15} />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Tooltip contentStyle={{ background: '#0f1428', border: '1px solid rgba(99,120,255,0.3)', borderRadius: 8, fontSize: 12 }} />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Load Test */}
            <div className="card mb-6">
                <div className="section-header">
                    <div>
                        <div className="section-title">Load Test Runner</div>
                        <div className="section-subtitle">Run concurrent requests and compare RPC vs MOC performance</div>
                    </div>
                    <button onClick={refresh} className="btn btn-ghost btn-sm"><RefreshCw size={12} /> Refresh</button>
                </div>

                <div className="load-test-grid">
                    {LOAD_LEVELS.map(level => (
                        <button
                            key={level}
                            className={`load-btn ${loadRunning === level ? 'loading' : ''}`}
                            onClick={() => handleLoadTest(level)}
                            disabled={loadRunning !== null}
                        >
                            {loadRunning === level ? (
                                <><span className="spinner" style={{ display: 'inline-block', width: 14, height: 14, borderWidth: 2, marginRight: 8 }} />Running…</>
                            ) : (
                                <>⚡ {level} Requests</>
                            )}
                        </button>
                    ))}
                </div>

                {loadChartData.length > 0 ? (
                    <div className="grid-2 gap-6 mt-4">
                        <div>
                            <div className="card-title mb-2">Avg Latency by Load</div>
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={loadChartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,120,255,0.1)" />
                                    <XAxis dataKey="load" tick={{ fill: '#7986cb', fontSize: 11 }} />
                                    <YAxis tick={{ fill: '#7986cb', fontSize: 11 }} unit="ms" />
                                    <Tooltip contentStyle={{ background: '#0f1428', border: '1px solid rgba(99,120,255,0.3)', borderRadius: 8, fontSize: 12 }} />
                                    <Legend wrapperStyle={{ fontSize: 12 }} />
                                    <Bar dataKey="RPC Latency" fill="#6378ff" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="MOC Latency" fill="#00e5ff" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div>
                            <div className="card-title mb-2">Throughput (RPS) by Load</div>
                            <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={loadChartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,120,255,0.1)" />
                                    <XAxis dataKey="load" tick={{ fill: '#7986cb', fontSize: 11 }} />
                                    <YAxis tick={{ fill: '#7986cb', fontSize: 11 }} unit=" rps" />
                                    <Tooltip contentStyle={{ background: '#0f1428', border: '1px solid rgba(99,120,255,0.3)', borderRadius: 8, fontSize: 12 }} />
                                    <Legend wrapperStyle={{ fontSize: 12 }} />
                                    <Line dataKey="RPC Throughput" stroke="#6378ff" strokeWidth={2} dot={{ r: 4, fill: '#6378ff' }} />
                                    <Line dataKey="MOC Throughput" stroke="#00e5ff" strokeWidth={2} dot={{ r: 4, fill: '#00e5ff' }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)', fontSize: 13 }}>
                        Run a load test above to see latency and throughput comparison charts.
                    </div>
                )}

                {/* Load Test Results Table */}
                {loadResults.length > 0 && (
                    <div className="table-wrap mt-4">
                        <table>
                            <thead>
                                <tr>
                                    <th>Protocol</th>
                                    <th>Load</th>
                                    <th>Avg Latency</th>
                                    <th>Min</th>
                                    <th>Max</th>
                                    <th>Success Rate</th>
                                    <th>Throughput</th>
                                    <th>Timestamp</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loadResults.slice(-10).reverse().map((r: any, i: number) => (
                                    <tr key={i}>
                                        <td><span className={`badge ${r.protocol === 'RPC' ? 'badge-blue' : 'badge-cyan'}`}>{r.protocol}</span></td>
                                        <td>{r.load_level}</td>
                                        <td style={{ color: r.avg_latency_ms < 50 ? 'var(--green)' : 'var(--orange)', fontWeight: 600 }}>{r.avg_latency_ms}ms</td>
                                        <td>{r.min_latency_ms}ms</td>
                                        <td>{r.max_latency_ms}ms</td>
                                        <td style={{ color: r.success_rate > 95 ? 'var(--green)' : 'var(--orange)' }}>{r.success_rate}%</td>
                                        <td>{r.throughput_rps} rps</td>
                                        <td style={{ fontSize: 11 }}>{new Date(r.timestamp).toLocaleTimeString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* CAP Theorem */}
            <div className="card">
                <div className="section-title mb-4">CAP Theorem Analysis</div>
                <div className="protocol-compare-grid">
                    <div className="protocol-box protocol-box-rpc">
                        <div className="protocol-title protocol-rpc-title">🔵 RPC — CP System</div>
                        <div className="protocol-prop"><span className="protocol-prop-label">Consistency</span><span className="protocol-prop-value badge badge-green">✓ Strong</span></div>
                        <div className="protocol-prop"><span className="protocol-prop-label">Partition Tolerance</span><span className="protocol-prop-value badge badge-green">✓ Yes</span></div>
                        <div className="protocol-prop"><span className="protocol-prop-label">Availability</span><span className="protocol-prop-value badge badge-red">✗ Sacrificed</span></div>
                        <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                            On warehouse crash, RPC callers receive immediate errors. The system prefers <em>consistency</em> — never serves stale data, but loses availability when a node fails.
                        </div>
                        <div className="pill-row">
                            <span className="pill">Synchronous</span>
                            <span className="pill">Blocking</span>
                            <span className="pill">Timeout on failure</span>
                        </div>
                    </div>
                    <div className="protocol-box protocol-box-moc">
                        <div className="protocol-title protocol-moc-title">🔷 MOC — AP System</div>
                        <div className="protocol-prop"><span className="protocol-prop-label">Availability</span><span className="protocol-prop-value badge badge-green">✓ High</span></div>
                        <div className="protocol-prop"><span className="protocol-prop-label">Partition Tolerance</span><span className="protocol-prop-value badge badge-green">✓ Yes</span></div>
                        <div className="protocol-prop"><span className="protocol-prop-label">Consistency</span><span className="protocol-prop-value badge badge-orange">~ Eventual</span></div>
                        <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                            On warehouse crash, MOC events queue up and are delivered on recovery. The system prefers <em>availability</em> — always accepts new events, but consumers may process them late.
                        </div>
                        <div className="pill-row">
                            <span className="pill">Asynchronous</span>
                            <span className="pill">Non-blocking</span>
                            <span className="pill">Retry + DLQ</span>
                        </div>
                    </div>
                </div>
                <div style={{ marginTop: 20, padding: 16, borderRadius: 10, background: 'rgba(99,120,255,0.06)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Key Insight:</strong> In a distributed system, you cannot simultaneously guarantee all three CAP properties.
                    RPC (synchronous) enforces strong consistency at the cost of availability — when the warehouse is down, orders fail immediately.
                    MOC (asynchronous) keeps the system available and partition-tolerant at the cost of eventual consistency — orders are placed optimistically and the warehouse syncs later.
                    <strong style={{ color: 'var(--accent)' }}> The right choice depends on business requirements.</strong>
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, sub, color }: any) {
    return (
        <div className="card card-sm">
            <div className="card-title">{label}</div>
            <div className="card-value" style={{ fontSize: 26, color }}>{value}</div>
            <div className="card-sub">{sub}</div>
        </div>
    );
}
