'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { Activity, ArrowUpRight, CalendarDays, Compass, LayoutDashboard, Loader2, Search, ShieldCheck, Users, Wallet } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
type Tab = 'overview' | 'users' | 'tours' | 'bookings';
type Row = Record<string, any>;
const money = (n = 0) => `${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })} ₼`;
const date = (v?: string) => v ? new Date(v.replace(' ', 'T') + (v.includes('Z') ? '' : 'Z')).toLocaleDateString() : '—';

export default function AdminPage() {
  const { token, user, logout, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<Row | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'denied' | 'error'>('loading');

  useEffect(() => {
    if (authLoading) return;
    if (!token) { setStatus('denied'); return; }
    fetch(`${API}/api/admin/overview`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => { if (r.status === 403) throw new Error('denied'); if (!r.ok) throw new Error('error'); return r.json(); })
      .then(data => { setStats(data); setStatus('ready'); })
      .catch(e => setStatus(e.message === 'denied' ? 'denied' : 'error'));
  }, [token, authLoading]);

  useEffect(() => {
    if (!token || tab === 'overview' || status !== 'ready') return;
    const timer = setTimeout(() => {
      fetch(`${API}/api/admin/${tab}?q=${encodeURIComponent(query)}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(setRows).catch(() => setRows([]));
    }, 180);
    return () => clearTimeout(timer);
  }, [token, tab, query, status]);

  const nav: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard }, { id: 'users', label: 'Users', icon: Users },
    { id: 'tours', label: 'Tours', icon: Compass }, { id: 'bookings', label: 'Bookings', icon: CalendarDays },
  ];
  const columns = useMemo(() => tab === 'users'
    ? [['name', 'Name'], ['email', 'Email'], ['account_type', 'Account'], ['created_at', 'Joined']]
    : tab === 'tours' ? [['title', 'Tour'], ['operator_name', 'Operator'], ['location', 'Location'], ['price', 'Price'], ['booking_count', 'Bookings'], ['click_count', 'Views']]
      : [['id', 'ID'], ['tour_title', 'Tour'], ['traveler_name', 'Traveler'], ['operator_name', 'Operator'], ['status', 'Status'], ['seats', 'Seats'], ['total_price', 'Total']], [tab]);

  if (authLoading || status === 'loading') return <div className="min-h-[60vh] grid place-items-center text-slate-500"><Loader2 className="animate-spin" />Loading admin workspace…</div>;
  if (status === 'denied') return <div className="min-h-[65vh] grid place-items-center px-4"><div className="max-w-md text-center rounded-3xl border border-slate-200 bg-white p-9 shadow-sm"><ShieldCheck className="mx-auto mb-4 text-teal-700" size={36}/><h1 className="text-2xl font-bold text-slate-900">Admin access required</h1><p className="my-3 text-sm leading-6 text-slate-500">{user ? `The account ${user.email} is not on the admin allowlist.` : 'Sign in with an account whose email is configured in the backend’s ADMIN_EMAILS setting.'}</p><div className="flex justify-center gap-3">{user && <button onClick={logout} className="rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-700">Sign out</button>}<Link className="inline-flex rounded-xl bg-teal-700 px-5 py-3 font-semibold text-white" href={`/login?next=${encodeURIComponent('/admin')}`}>Sign in</Link></div></div></div>;
  if (status === 'error') return <div className="mx-auto my-16 max-w-xl rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800">Could not load admin data. Check that the API is running, then refresh.</div>;

  const cards = [
    { label: 'Total users', value: stats?.users, icon: Users, color: 'bg-sky-50 text-sky-700' },
    { label: 'Tours listed', value: stats?.tours, icon: Compass, color: 'bg-teal-50 text-teal-700' },
    { label: 'Bookings', value: stats?.bookings, icon: CalendarDays, color: 'bg-violet-50 text-violet-700' },
    { label: 'Confirmed value', value: money(stats?.revenue), icon: Wallet, color: 'bg-amber-50 text-amber-700' },
  ];
  const displayCell = (key: string, value: any) => key === 'created_at' || key === 'date' ? date(value) : key === 'price' || key === 'total_price' ? money(value) : key === 'status' ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize">{value}</span> : value ?? '—';

  return <main className="min-h-screen bg-[#f5f8fa]">
    <div className="mx-auto max-w-[1440px] px-4 py-7 sm:px-7 lg:px-10">
      <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.16em] text-teal-700"><ShieldCheck size={15}/> TurPoint Control</div><h1 className="text-3xl font-bold tracking-tight text-slate-900">Admin workspace</h1><p className="mt-1 text-sm text-slate-500">Monitor marketplace activity and manage platform operations.</p></div>
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600"><span className="h-2 w-2 rounded-full bg-emerald-500"/> Platform data live</div>
      </header>
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          {nav.map(item => { const Icon = item.icon; return <button key={item.id} onClick={() => { setTab(item.id); setQuery(''); }} className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-semibold transition ${tab === item.id ? 'bg-[#0f2a3d] text-white' : 'text-slate-600 hover:bg-slate-50'}`}><Icon size={17}/>{item.label}{tab === item.id && <ArrowUpRight className="ml-auto" size={15}/>}</button>; })}
          <div className="mt-5 border-t border-slate-100 px-3 pt-4"><p className="text-xs leading-5 text-slate-400">Admin tools are restricted to configured administrator accounts.</p><Link href="/" className="mt-3 inline-block text-xs font-semibold text-teal-700 hover:underline">← Back to marketplace</Link></div>
        </aside>
        <section className="min-w-0">
          {tab === 'overview' ? <>
            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(c => { const Icon = c.icon; return <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><p className="text-sm font-medium text-slate-500">{c.label}</p><span className={`rounded-xl p-2.5 ${c.color}`}><Icon size={18}/></span></div><p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">{c.value ?? 0}</p><p className="mt-1 text-xs text-slate-400">All time</p></div>; })}</div>
            <div className="mb-6 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl bg-[#0f2a3d] p-5 text-white sm:col-span-2"><div className="flex items-center gap-2 text-sm text-slate-300"><Activity size={16}/> Marketplace pulse</div><p className="mt-5 text-2xl font-bold">{stats?.operators ?? 0} operators <span className="font-normal text-slate-300">serving travelers</span></p><p className="mt-1 text-sm text-slate-300">Across {stats?.tours ?? 0} active tour listings</p></div><div className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><p className="text-sm font-medium text-amber-800">Needs attention</p><p className="mt-3 text-3xl font-bold text-amber-950">{stats?.pendingBookings ?? 0}</p><p className="text-sm text-amber-800">pending bookings</p><button onClick={() => setTab('bookings')} className="mt-3 text-sm font-semibold text-amber-900 underline">Review bookings</button></div></div>
            <div className="grid gap-5 xl:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 font-bold text-slate-900">Recent bookings</h2><div className="space-y-3">{stats?.recentBookings?.length ? stats.recentBookings.map((b: Row) => <div key={b.id} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{b.tour_title}</p><p className="text-xs text-slate-500">{b.traveler_name} · {date(b.created_at)}</p></div><div className="text-right"><p className="text-sm font-semibold">{money(b.total_price)}</p><p className="text-xs capitalize text-slate-500">{b.status}</p></div></div>) : <p className="py-6 text-sm text-slate-400">No bookings yet.</p>}</div></div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 font-bold text-slate-900">New accounts</h2><div className="space-y-3">{stats?.recentUsers?.length ? stats.recentUsers.map((u: Row) => <div key={u.id} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0"><div><p className="text-sm font-semibold text-slate-800">{u.name}</p><p className="text-xs text-slate-500">{u.email}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs capitalize text-slate-600">{u.account_type}</span></div>) : <p className="py-6 text-sm text-slate-400">No accounts yet.</p>}</div></div></div>
          </> : <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5"><div><h2 className="text-lg font-bold capitalize text-slate-900">{tab}</h2><p className="text-sm text-slate-500">Latest records · up to 100 results</p></div><label className="flex w-full max-w-sm items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5"><Search size={16} className="text-slate-400"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder={`Search ${tab}…`} className="w-full bg-transparent text-sm outline-none"/></label></div><div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{columns.map(([k, label]) => <th key={k} className="px-5 py-3 font-semibold">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row, i) => <tr key={row.id ?? i} className="hover:bg-slate-50/70">{columns.map(([k]) => <td key={k} className="px-5 py-3.5 text-slate-700">{displayCell(k, row[k])}</td>)}</tr>)}</tbody></table>{rows.length === 0 && <div className="py-12 text-center text-sm text-slate-400">No matching {tab} found.</div>}</div></div>}
        </section>
      </div>
      <footer className="mt-8 flex items-center justify-between text-xs text-slate-400"><span>TurPoint admin · secure session</span><span>Data refreshes when you open a section</span></footer>
    </div>
  </main>;
}
