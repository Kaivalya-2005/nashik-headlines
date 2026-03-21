import React, { useContext } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { Home, FileText, Sparkles, Zap, LogOut, Moon, Sun, LayoutGrid } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { useDarkMode } from '../../context/DarkModeContext';

const Layout = () => {
    const { logout, user } = useContext(AuthContext);
    const { isDarkMode, toggleDarkMode } = useDarkMode();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const navItems = [
        { path: '/', label: 'Dashboard', icon: Home },
        { path: '/articles', label: 'Articles', icon: FileText },
        { path: '/ai-editor', label: 'AI Editor', icon: Sparkles },
        { path: '/pipeline', label: 'Raw Pipeline', icon: Zap },
    ];

    return (
        <div className="flex h-screen bg-slate-100 dark:bg-slate-950 transition-colors duration-200">
            {/* Sidebar */}
            <aside className="w-68 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-r border-slate-200 dark:border-slate-800 flex flex-col">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-slate-900 dark:bg-slate-100 rounded-md flex items-center justify-center">
                            <LayoutGrid size={20} className="text-slate-100 dark:text-slate-900" />
                        </div>
                        <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">Newsroom CMS</h1>
                    </div>
                    <button
                        onClick={toggleDarkMode}
                        className="p-2 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                        title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
                    >
                        {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-1.5">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path || 
                                       (item.path === '/articles' && location.pathname.startsWith('/articles'));
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center space-x-3 px-3 py-2.5 rounded-md transition-colors ${
                                    isActive
                                        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                            >
                                <Icon size={18} />
                                <span className="font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom Section */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
                    {/* API Status */}
                    <div className="rounded-md p-3 border border-emerald-200/70 dark:border-emerald-900 bg-emerald-50/80 dark:bg-emerald-950/40">
                        <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mb-1">API Status</p>
                        <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Connected</p>
                    </div>

                    {/* User Info */}
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                            {user?.email}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                            {user?.role || 'Admin'}
                        </span>
                    </div>

                    {/* Logout */}
                    <button
                        onClick={handleLogout}
                        className="flex items-center space-x-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 w-full px-3 py-2 rounded-md transition-colors border border-rose-200 dark:border-rose-900/60"
                    >
                        <LogOut size={18} />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
