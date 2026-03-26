import React, { useState, useCallback } from 'react';
import { Zap, Play, RotateCcw, RefreshCw, HelpCircle, X, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import StatusCards from '../components/StatusCards';
import * as newsroomService from '../services/newsroomService';

const Dashboard = () => {
  const [showGuide, setShowGuide] = useState(() => {
    return localStorage.getItem('hideWelcomeGuide') !== 'true';
  });
  const [loading, setLoading] = useState({
    scraper: false,
    process: false,
    fullCycle: false,
    refresh: false
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const dismissGuide = () => {
    setShowGuide(false);
    localStorage.setItem('hideWelcomeGuide', 'true');
  };

  const handleScraper = async () => {
    setLoading(prev => ({ ...prev, scraper: true }));
    try {
      await newsroomService.runScraper();
      toast.success('Scraper started successfully');
      setTimeout(() => handleRefresh(), 2000);
    } catch (error) {
      toast.error('Failed to start scraper: ' + error.message);
    } finally {
      setLoading(prev => ({ ...prev, scraper: false }));
    }
  };

  const handleProcess = async () => {
    setLoading(prev => ({ ...prev, process: true }));
    try {
      await newsroomService.processAllPending();
      toast.success('Processing started');
      setTimeout(() => handleRefresh(), 2000);
    } catch (error) {
      toast.error('Failed to process articles: ' + error.message);
    } finally {
      setLoading(prev => ({ ...prev, process: false }));
    }
  };

  const handleFullCycle = async () => {
    setLoading(prev => ({ ...prev, fullCycle: true }));
    try {
      await newsroomService.runFullCycle();
      toast.success('Full cycle completed');
      setTimeout(() => handleRefresh(), 2000);
    } catch (error) {
      toast.error('Full cycle failed: ' + error.message);
    } finally {
      setLoading(prev => ({ ...prev, fullCycle: false }));
    }
  };

  const handleRefresh = useCallback(async () => {
    setLoading(prev => ({ ...prev, refresh: true }));
    try {
      setRefreshTrigger(prev => prev + 1);
      await new Promise(resolve => setTimeout(resolve, 500));
      toast.success('Stats refreshed');
    } finally {
      setLoading(prev => ({ ...prev, refresh: false }));
    }
  }, []);

  const ActionButton = ({ icon, label, onClick, loading, color = 'blue', variant = 'primary' }) => {
    const primaryColors = {
      blue: 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-slate-100 dark:text-slate-900',
      green: 'bg-emerald-700 hover:bg-emerald-800 text-white',
      purple: 'bg-indigo-700 hover:bg-indigo-800 text-white',
      amber: 'bg-amber-600 hover:bg-amber-700 text-white'
    };

    const secondaryColors = {
      blue: 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200',
      green: 'bg-emerald-100 dark:bg-emerald-950/50 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300',
      purple: 'bg-indigo-100 dark:bg-indigo-950/50 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300',
      amber: 'bg-amber-100 dark:bg-amber-950/50 hover:bg-amber-200 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300'
    };

    const colorClass = variant === 'primary' ? primaryColors[color] : secondaryColors[color];

    return (
      <button
        onClick={onClick}
        disabled={loading}
        className={`
          flex items-center gap-2 px-4 py-2.5 rounded-md font-medium text-sm
          transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
          ${colorClass}
        `}
      >
        {loading ? (
          <div className="animate-spin">
            <RefreshCw size={20} />
          </div>
        ) : (
          React.createElement(icon, { size: 20 })
        )}
        <span>{label}</span>
      </button>
    );
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-950 transition-colors min-h-screen p-6 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mb-2">
              Newsroom Control Center
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Complete control over your news pipeline with AI-powered processing
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading.refresh}
            className="p-2 rounded-md bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-50"
            title="Refresh all stats"
          >
            <RefreshCw size={24} className={loading.refresh ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Welcome Guide */}
      {showGuide && (
        <div className="mb-6 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-xl p-6 border border-indigo-200 dark:border-indigo-800/50 relative">
          <button
            onClick={dismissGuide}
            className="absolute top-4 right-4 p-1 rounded hover:bg-white/50 dark:hover:bg-slate-800/50 text-slate-500"
            title="Dismiss guide"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-2 mb-3">
            <HelpCircle size={20} className="text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-lg font-semibold text-indigo-900 dark:text-indigo-200">Welcome! Here's how to publish news</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { step: '1', title: 'Run Scraper', desc: 'Click "Run Scraper" to fetch fresh news from sources' },
              { step: '2', title: 'Process Pending', desc: 'AI rewrites and optimizes articles for SEO' },
              { step: '3', title: 'Review Articles', desc: 'Go to Articles tab, review and approve content' },
              { step: '4', title: 'Publish', desc: 'Click Publish on approved articles to go live!' },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {item.step}
                </div>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{item.title}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-3 flex items-center gap-1">
            Or use "Full Cycle" below to do steps 1 & 2 automatically <ArrowRight size={12} />
          </p>
        </div>
      )}

      {/* Status Cards */}
      <StatusCards refreshTrigger={refreshTrigger} />

      {/* Quick Actions Section */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm p-6 mb-6 border border-slate-200 dark:border-slate-800">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Quick Actions
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ActionButton
            icon={RotateCcw}
            label={loading.scraper ? 'Scraping...' : 'Run Scraper'}
            onClick={handleScraper}
            loading={loading.scraper}
            color="blue"
          />

          <ActionButton
            icon={Zap}
            label={loading.process ? 'Processing...' : 'Process Pending'}
            onClick={handleProcess}
            loading={loading.process}
            color="purple"
          />

          <ActionButton
            icon={Play}
            label={loading.fullCycle ? 'Running...' : 'Full Cycle'}
            onClick={handleFullCycle}
            loading={loading.fullCycle}
            color="green"
          />

          <ActionButton
            icon={RefreshCw}
            label={loading.refresh ? 'Refreshing...' : 'Refresh Stats'}
            onClick={handleRefresh}
            loading={loading.refresh}
            color="amber"
            variant="secondary"
          />
        </div>
      </div>

      {/* System Information */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-800">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">API Connection</h3>
        <p className="text-slate-600 dark:text-slate-400 mb-3">
          Backend: <span className="font-mono font-bold">http://localhost:5000/api</span>
        </p>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-slate-500 dark:text-slate-400">Status</p>
            <p className="font-semibold text-emerald-600 dark:text-emerald-400">Connected</p>
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400">Database</p>
            <p className="font-semibold text-slate-800 dark:text-slate-200">Active</p>
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400">Auto-refresh</p>
            <p className="font-semibold text-slate-800 dark:text-slate-200">On demand</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

