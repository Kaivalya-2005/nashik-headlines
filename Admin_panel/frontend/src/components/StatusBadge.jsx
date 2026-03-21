import React from 'react';
import { Loader2, CheckCircle, AlertCircle, Clock } from 'lucide-react';

const StatusBadge = ({ status, error }) => {
    if (!status) return null;

    if (status === 'PENDING') {
        return (
            <div className="flex items-center bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 px-3 py-1 rounded-full text-sm font-medium border border-amber-200 dark:border-amber-900">
                <Clock size={16} className="mr-2" />
                Queued
            </div>
        );
    }

    if (status === 'PROCESSING') {
        return (
            <div className="flex items-center bg-indigo-100 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 px-3 py-1 rounded-full text-sm font-medium border border-indigo-200 dark:border-indigo-900">
                <Loader2 size={16} className="mr-2 animate-spin" />
                Processing
            </div>
        );
    }

    if (status === 'COMPLETED') {
        return (
            <div className="flex items-center bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 px-3 py-1 rounded-full text-sm font-medium border border-emerald-200 dark:border-emerald-900">
                <CheckCircle size={16} className="mr-2" />
                Completed
            </div>
        );
    }

    if (status === 'FAILED') {
        return (
            <div className="flex flex-col">
                <div className="flex items-center bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 px-3 py-1 rounded-full text-sm font-medium w-max border border-rose-200 dark:border-rose-900">
                    <AlertCircle size={16} className="mr-2" />
                    Failed
                </div>
                {error && (
                    <span className="text-xs text-rose-700 dark:text-rose-300 mt-1 max-w-xs break-words bg-rose-50 dark:bg-rose-950/40 p-1 rounded border border-rose-200 dark:border-rose-900">
                        {error}
                    </span>
                )}
            </div>
        );
    }

    return null;
};

export default StatusBadge;
