import React, { useEffect, useState } from 'react';
import { Activity, Database, Zap, AlertCircle, RefreshCw } from 'lucide-react';
import * as newsroomService from '../services/newsroomService';
import toast from 'react-hot-toast';

const StatusCards = ({ refreshTrigger }) => {
  const [stats, setStats] = useState({
    scraped: 0,
    pending: 0,
    total: 0,
    draft: 0,
    approved: 0,
    published: 0,
    processed: 0
  });
  const [health, setHealth] = useState({ connected: false });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [statsData, healthData] = await Promise.all([
        newsroomService.getSystemStats(),
        newsroomService.checkBackendHealth()
      ]);
      setStats(statsData);
      setHealth(healthData);
    } catch (error) {
      toast.error('Failed to fetch stats');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  const Card = ({ icon, label, value, color = 'blue' }) => {
    const colorClasses = {
      blue: 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800',
      green: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900',
      yellow: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900',
      purple: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900',
      red: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900'
    };

    return (
      <div className={`border rounded-xl p-4 ${colorClasses[color]}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium opacity-80">{label}</p>
            <p className="text-3xl font-semibold mt-1 tracking-tight">{loading ? '-' : value}</p>
          </div>
          {React.createElement(icon, { size: 32, className: 'opacity-50' })}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Backend Status */}
      <div className={`border rounded-xl p-4 ${
        health.connected 
          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900'
          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium opacity-75">Backend</p>
            <p className="text-lg font-semibold mt-1">
              {health.connected ? 'Online' : 'Offline'}
            </p>
          </div>
          <Activity size={32} className="opacity-50" />
        </div>
      </div>

      {/* Pending Articles */}
      <Card icon={AlertCircle} label="Pending" value={stats.pending} color="yellow" />

      {/* Total Articles */}
      <Card icon={Database} label="Total Articles" value={stats.total} color="blue" />

      {/* Published */}
      <Card icon={Zap} label="Published" value={stats.published} color="green" />

      {/* Scraped Raw */}
      <Card icon={RefreshCw} label="Scraped" value={stats.scraped} color="purple" />

      {/* Draft */}
      <Card icon={Database} label="Drafts" value={stats.draft} color="blue" />

      {/* Approved */}
      <Card icon={Activity} label="Approved" value={stats.approved} color="green" />

      {/* Processed */}
      <Card icon={Zap} label="Processed" value={stats.processed} color="purple" />
    </div>
  );
};

export default StatusCards;
