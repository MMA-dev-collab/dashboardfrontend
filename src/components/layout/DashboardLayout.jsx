import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import {
    LayoutDashboard,
    Briefcase,
    Wallet,
    ArrowUpRight,
    Receipt,
    Users,
    History,
    LogOut,
    Menu,
    X,
    User,
    Bell,
    Search,
    ChevronLeft,
    ChevronRight,
    Sun,
    Moon,
    FileText,
    RefreshCw,
    FolderOpen,
    BookOpen,
    Shield,
    MessageSquare,
    CalendarDays,
    Bot
} from 'lucide-react';
import useAuthStore from '../../store/useAuthStore';
import useThemeStore from '../../store/useThemeStore';
import NotificationCenter from './NotificationCenter';
import AiChat from '../ai/AiChat';
import './DashboardLayout.css';

const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/projects', label: 'Projects', icon: Briefcase },
    { path: '/finance', label: 'Finance', icon: Receipt },
    { path: '/wallets', label: 'Wallets', icon: Wallet },
    { path: '/withdrawals', label: 'Withdrawals', icon: ArrowUpRight },
    { path: '/expenses', label: 'Expenses', icon: Receipt },
    { path: '/leads', label: 'CRM Leads', icon: Users },
    { path: '/proposals', label: 'Proposals', icon: FileText },
    { path: '/subscriptions', label: 'Retainers', icon: RefreshCw },
    { path: '/documents', label: 'Documents', icon: FolderOpen },
    { path: '/knowledge', label: 'Knowledge Base', icon: BookOpen },
    { path: '/operations', label: 'Operations', icon: Shield },
    { path: '/chat', label: 'Team Chat', icon: MessageSquare },
    { path: '/ai-chat', label: 'AI Assistant', icon: Bot },
    { path: '/calendar', label: 'Calendar', icon: CalendarDays },
    { path: '/notifications', label: 'Notifications', icon: Bell },
    { path: '/audit', label: 'Audit Log', icon: History, role: 'ADMIN' },
];

export default function DashboardLayout() {
    const { user, logout } = useAuthStore();
    const { theme, toggleTheme } = useThemeStore();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const filteredNavItems = navItems.filter(item =>
        !item.role || (user && user.role === item.role)
    );

    return (
        <div className={`dashboard-container ${isCollapsed ? 'collapsed' : ''}`}>
            {/* Mobile Overlay */}
            {mobileOpen && <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />}

            {/* Sidebar */}
            <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div className="logo-section">
                        <div className="logo-icon">EC</div>
                        {!isCollapsed && <span className="logo-text">EgyCodera</span>}
                    </div>
                    <button className="collapse-btn" onClick={() => setIsCollapsed(!isCollapsed)}>
                        {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    </button>
                </div>

                <nav className="sidebar-nav">
                    <ul>
                        {filteredNavItems.map(item => (
                            <li key={item.path}>
                                <NavLink
                                    to={item.path}
                                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                                    onClick={() => setMobileOpen(false)}
                                >
                                    <item.icon size={20} className="nav-icon" />
                                    {!isCollapsed && <span className="nav-label">{item.label}</span>}
                                    {isCollapsed && <div className="nav-tooltip">{item.label}</div>}
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </nav>

                <div className="sidebar-footer">
                    <button className="logout-btn nav-link" onClick={handleLogout}>
                        <LogOut size={20} className="nav-icon" />
                        {!isCollapsed && <span className="nav-label">Logout</span>}
                        {isCollapsed && <div className="nav-tooltip">Logout</div>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                <header className="topbar">
                    <div className="topbar-left">
                        <button className="mobile-menu-btn" onClick={() => setMobileOpen(true)}>
                            <Menu size={24} />
                        </button>
                        <div className="search-box">
                            <Search size={18} className="search-icon" />
                            <input type="text" placeholder="Search anything..." />
                        </div>
                    </div>

                    <div className="topbar-right">
                        <button className="theme-toggle" onClick={toggleTheme}>
                            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                        </button>

                        <NotificationCenter />

                        <Link to={`/profile/${user?.id}`} className="user-profile" style={{ textDecoration: 'none' }}>
                            <div className="user-info">
                                <span className="user-name">{user?.firstName || user?.name || 'User'}</span>
                                <span className="user-role">{user?.roles?.[0] || user?.role || 'Member'}</span>
                            </div>
                            <div className="avatar" style={{ overflow: 'hidden', padding: 0 }}>
                                {user?.profilePicture ? (
                                    <img src={user.profilePicture} alt="User" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    (user?.firstName || user?.name || 'U').charAt(0)
                                )}
                            </div>
                        </Link>
                    </div>
                </header>

                <section className="content-wrapper">
                    <Outlet />
                </section>
            </main>
            <AiChat />
        </div>
    );
}
