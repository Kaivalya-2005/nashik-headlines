import React, { useEffect, useState } from 'react';
import articleService from '../api/articleService';

const BackendStatus = () => {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const health = await articleService.checkBackendHealth();
        setStatus(health.connected ? 'online' : 'offline');
      } catch {
        setStatus('offline');
      }
    };

    checkStatus();
    // Re-check every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getColor = () => {
    if (status === 'online') return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
    if (status === 'offline') return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
    return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
  };

  const getIcon = () => {
    if (status === 'online') return '✓';
    if (status === 'offline') return '✕';
    return '⧖';
  };

  const getLabel = () => {
    if (status === 'online') return 'Backend Online';
    if (status === 'offline') return 'Backend Offline';
    return 'Checking...';
  };

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${getColor()}`}>
      <span>{getIcon()}</span>
      <span>{getLabel()}</span>
    </div>
  );
};

export default BackendStatus;
