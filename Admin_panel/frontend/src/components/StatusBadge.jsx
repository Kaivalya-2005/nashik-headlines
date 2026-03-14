import React from 'react';
import { Loader2, CheckCircle, AlertCircle, Clock } from 'lucide-react';

const StatusBadge = ({ status, error }) => {
    if (!status) return null;

    if (status === 'PENDING') {
        return (
            <div className="flex items-center bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                <Clock size={16} className="mr-2" />
                Queued
            </div>
        );
    }

    if (status === 'PROCESSING') {
        return (
            <div className="flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                <Loader2 size={16} className="mr-2 animate-spin" />
                Generating AI Content...
            </div>
        );
    }

    if (status === 'COMPLETED') {
        return (
            <div className="flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                <CheckCircle size={16} className="mr-2" />
                Completed
            </div>
        );
    }

    if (status === 'FAILED') {
        return (
            <div className="flex flex-col">
                <div className="flex items-center bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium w-max">
                    <AlertCircle size={16} className="mr-2" />
                    Failed
                </div>
                {error && (
                    <span className="text-xs text-red-600 mt-1 max-w-xs break-words bg-red-50 p-1 rounded border border-red-100">
                        {error}
                    </span>
                )}
            </div>
        );
    }

    return null;
};

export default StatusBadge;
