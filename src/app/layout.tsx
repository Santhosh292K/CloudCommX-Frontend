'use client';
import './globals.css';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, ShoppingCart, Warehouse, Truck, BarChart3,
  Activity, Zap
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, section: 'OVERVIEW' },
  { href: '/orders', label: 'Order Management', icon: ShoppingCart, section: 'NODES' },
  { href: '/warehouse', label: 'Warehouse', icon: Warehouse, section: 'NODES' },
  { href: '/shipments', label: 'Shipments & Tracking', icon: Truck, section: 'NODES' },
  { href: '/analytics', label: 'Analytics & Monitoring', icon: BarChart3, section: 'NODES' },
];

const sections = ['OVERVIEW', 'NODES'];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>CloudCommX — Distributed Warehouse & Supply Chain</title>
        <meta name="description" content="Comparative Study of RPC vs Message-Oriented Communications in Cloud Microservices" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <div className="app-shell">
          <Sidebar />
          <div className="main-content">
            <TopBar />
            <main className="page-content">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}

function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-title">☁ CloudCommX</div>
        <div className="logo-sub">RPC vs MOC — Distributed Supply Chain</div>
      </div>
      <nav className="sidebar-nav">
        {sections.map(section => (
          <div key={section}>
            <div className="nav-section-label">{section}</div>
            {navItems.filter(n => n.section === section).map(item => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} className={`nav-item${active ? ' active' : ''}`}>
                  <Icon className="nav-icon" size={16} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Activity size={12} />
          <span>4 Nodes Active</span>
        </div>
        <div style={{ marginTop: 4, fontSize: 10 }}>Distributed Systems Demo</div>
      </div>
    </aside>
  );
}

function TopBar() {
  const pathname = usePathname();
  const titles: Record<string, { title: string; sub: string }> = {
    '/': { title: 'System Dashboard', sub: 'Live overview of all distributed nodes' },
    '/orders': { title: 'Order Management', sub: 'Member 1 — RPC stock validation + MOC event publishing' },
    '/warehouse': { title: 'Warehouse Node', sub: 'Member 2 — Regional inventory, crash simulation & message durability' },
    '/shipments': { title: 'Shipment & Tracking', sub: 'Member 3 — RPC approval + MOC event dispatch, eventual consistency' },
    '/analytics': { title: 'Analytics & Monitoring', sub: 'Member 4 — RPC metrics query + MOC event aggregation + load testing' },
  };
  const t = titles[pathname] || { title: 'CloudCommX', sub: '' };
  return (
    <div className="topbar">
      <div>
        <div className="topbar-title">{t.title}</div>
        <div className="topbar-subtitle">{t.sub}</div>
      </div>
      <div className="topbar-right">
        <div className="badge badge-green"><Zap size={10} /> System Online</div>
        <div className="badge badge-blue">v1.0.0</div>
      </div>
    </div>
  );
}
