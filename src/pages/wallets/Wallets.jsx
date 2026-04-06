import { useState, useEffect } from 'react';
import { Wallet as WalletIcon, ArrowDownRight, ArrowUpRight, History, Users, TrendingUp, DollarSign, Clock, Download } from 'lucide-react';
import api from '../../api/client';
import useAuthStore from '../../store/useAuthStore';
import '../Shared.css';
import './Wallets.css';

export default function Wallets() {
    const { user } = useAuthStore();
    const [wallet, setWallet] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [allWallets, setAllWallets] = useState([]);
    const [loading, setLoading] = useState(true);
    const isAdmin = user?.role === 'ADMIN';

    useEffect(() => {
        async function fetchData() {
            try {
                const [wRes, tRes] = await Promise.all([
                    api.get('/wallets/me'),
                    api.get(`/wallets/${user.id}/transactions`),
                ]);
                setWallet(wRes.data.data);
                setTransactions(tRes.data.data || []);
                if (isAdmin) {
                    const aRes = await api.get('/wallets');
                    setAllWallets(aRes.data.data || []);
                }
            } catch (_) { }
            setLoading(false);
        }
        fetchData();
    }, [user.id, isAdmin]);

    const fmt = (v) => new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2
    }).format(v || 0);

    const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    const txColors = {
        EARNING: 'success',
        WITHDRAWAL: 'danger',
        ADJUSTMENT: 'blue',
        PENDING_TO_AVAILABLE: 'warning'
    };

    if (loading) return (
        <div className="loading-spinner">
            <div className="spinner" />
            <span>Fetching Wallet State...</span>
        </div>
    );

    const stats = [
        { label: 'Cumulative Earnings', value: wallet?.totalEarned, icon: TrendingUp, color: 'blue' },
        { label: 'Available Balance', value: wallet?.availableBalance, icon: DollarSign, color: 'emerald' },
        { label: 'Pending Clearance', value: wallet?.pendingBalance, icon: Clock, color: 'amber' },
        { label: 'Total Withdrawn', value: wallet?.totalWithdrawn, icon: ArrowUpRight, color: 'indigo' },
    ];

    return (
        <div className="wallets-page fade-in">
            <header className="page-header">
                <div className="header-left">
                    <h1 className="page-title">Pocket & Wallets</h1>
                    <p className="page-subtitle">Track your earnings and manage your available funds.</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-outline btn-sm" onClick={() => import('../../utils/exportReports').then(m => m.exportWalletsPDF(api, user.id, isAdmin))}>
                        <Download size={14} /> PDF
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={() => import('../../utils/exportXls').then(m => m.exportWalletsXLS(api, user.id, isAdmin))}>
                        <Download size={14} /> Excel
                    </button>
                </div>
            </header>

            <div className="stats-grid">
                {stats.map((s, i) => (
                    <div key={i} className="stat-card">
                        <div className={`card-icon-bg ${s.color}`}>
                            <s.icon size={24} />
                        </div>
                        <div className="card-info">
                            <span className="card-label">{s.label}</span>
                            <span className="card-value">{fmt(s.value)}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="wallets-grid-main">
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Recent Transactions</h3>
                        <div className="card-badge info">Personal History</div>
                    </div>
                    <div className="card-body p-0">
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Type</th>
                                    <th>Amount</th>
                                    <th>Balance</th>
                                    <th>Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map(t => (
                                    <tr key={t.id}>
                                        <td>
                                            <span className="text-sm font-medium">{fmtDate(t.createdAt)}</span>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${txColors[t.type]}`}>
                                                {t.type.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`font-bold ${t.type === 'EARNING' ? 'text-success' : t.type === 'WITHDRAWAL' ? 'text-danger' : ''}`}>
                                                {t.type === 'EARNING' ? '+' : t.type === 'WITHDRAWAL' ? '-' : ''}{fmt(t.amount)}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="text-sm text-tertiary">{fmt(t.balanceAfter)}</span>
                                        </td>
                                        <td>
                                            <span className="text-xs">{t.description}</span>
                                        </td>
                                    </tr>
                                ))}
                                {transactions.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="text-center py-8 text-tertiary">
                                            No transaction history found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {isAdmin && (
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Unified Partner Ledger</h3>
                            <Users size={20} className="text-tertiary" />
                        </div>
                        <div className="card-body p-0">
                            <table className="modern-table">
                                <thead>
                                    <tr>
                                        <th>Partner</th>
                                        <th>Available</th>
                                        <th>Pending</th>
                                        <th>Withdrawn</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allWallets.map(w => (
                                        <tr key={w.id}>
                                            <td>
                                                <div className="partner-cell">
                                                    <div className="avatar micro">{w.user?.name?.charAt(0)}</div>
                                                    <span className="font-semibold">{w.user?.name}</span>
                                                </div>
                                            </td>
                                            <td className="font-bold text-success">{fmt(w.availableBalance)}</td>
                                            <td className="text-tertiary">{fmt(w.pendingBalance)}</td>
                                            <td className="text-danger">{fmt(w.totalWithdrawn)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
