import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users, UserCheck } from 'lucide-react';
import CustomerManagement from './CustomerManagement';
import PersonRegister from './PersonRegister';

const TABS = [
  { key: 'clients', label: 'Clients', icon: Users },
  { key: 'persons', label: 'Person Register', icon: UserCheck },
];

export default function CustomersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = TABS.find(t => t.key === searchParams.get('tab'))?.key || 'clients';
  const [activeTab, setActiveTab] = useState(initialTab);

  const handleTabChange = (key) => {
    setActiveTab(key);
    setSearchParams({ tab: key });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="w-7 h-7 text-blue-600" />
          Customers
        </h1>
        <p className="text-gray-600 mt-1">Manage clients and their associated persons</p>
      </div>

      {/* Tab Bar */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-1 -mb-px" aria-label="Customer tabs">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'clients' ? (
          <CustomerManagement embedded />
        ) : (
          <PersonRegister embedded />
        )}
      </div>
    </div>
  );
}
