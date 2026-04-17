import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Shield, Settings, FolderOpen, ClipboardList, Users } from 'lucide-react';
import UserManagement from './UserManagement';
import StatusManager from './StatusManager';
import DocumentCategories from './DocumentCategories';
import JobTemplates from './JobTemplates';

const TABS = [
  { key: 'users', label: 'Users', icon: Users },
  { key: 'job-statuses', label: 'Job Statuses', icon: Settings },
  { key: 'doc-categories', label: 'Doc Categories', icon: FolderOpen },
  { key: 'job-templates', label: 'Job Templates', icon: ClipboardList },
];

export default function AdminPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = TABS.find(t => t.key === searchParams.get('tab'))?.key || 'users';
  const [activeTab, setActiveTab] = useState(initialTab);

  const handleTabChange = (key) => {
    setActiveTab(key);
    setSearchParams({ tab: key });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'users': return <UserManagement />;
      case 'job-statuses': return <StatusManager />;
      case 'doc-categories': return <DocumentCategories />;
      case 'job-templates': return <JobTemplates />;
      default: return <UserManagement />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="w-7 h-7 text-blue-600" />
          Administration
        </h1>
        <p className="text-gray-600 mt-1">Manage users, statuses, categories and templates</p>
      </div>

      {/* Tab Bar */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-1 -mb-px" aria-label="Admin tabs">
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
        {renderContent()}
      </div>
    </div>
  );
}
