import React from 'react';

const StatCard = ({ title, value, icon, color, subtext }) => {
    return (
        <div className="p-6 rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/95 dark:bg-slate-900/60 shadow-md shadow-slate-900/5 backdrop-blur flex items-start justify-between transition-transform hover:-translate-y-1 duration-200">
            <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">{title}</p>
                <h3 className="text-3xl font-bold text-gray-800 dark:text-white">{value}</h3>
                {subtext && <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{subtext}</p>}
            </div>
            <div className={`p-3 rounded-lg ${color} text-white`}>
                {React.createElement(icon, { size: 24 })}
            </div>
        </div>
    );
};

export default StatCard;
