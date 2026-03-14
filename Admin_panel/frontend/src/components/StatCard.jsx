import React from 'react';

const StatCard = ({ title, value, icon: Icon, color, subtext }) => {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between transition-transform hover:-translate-y-1 duration-200">
            <div>
                <p className="text-gray-500 text-sm font-medium mb-1">{title}</p>
                <h3 className="text-3xl font-bold text-gray-800">{value}</h3>
                {subtext && <p className="text-xs text-gray-400 mt-2">{subtext}</p>}
            </div>
            <div className={`p-3 rounded-lg ${color} text-white`}>
                <Icon size={24} />
            </div>
        </div>
    );
};

export default StatCard;
