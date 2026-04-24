// Admin Control Center layout: sidebar + content area with state-driven
// tab switching. Role-aware: admin sees all 15 modules, moderator sees the
// subset relevant to moderation. Bans redirect to /.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../components/AuthContext';
import {
  LayoutDashboard, Users, Package, FolderTree, ShieldAlert, Flag, Megaphone,
  ShoppingCart, Store, Brain, Bell, FileText, Settings as SettingsIcon,
  History, Activity, LogOut,
} from 'lucide-react';

import AdminOverviewTab from './tabs/AdminOverviewTab';
import AdminUsersTab from './tabs/AdminUsersTab';
import AdminListingsTab from './tabs/AdminListingsTab';
import AdminCategoriesTab from './tabs/AdminCategoriesTab';
import AdminModerationTab from './tabs/AdminModerationTab';
import AdminReportsTab from './tabs/AdminReportsTab';
import AdminAdsTab from './tabs/AdminAdsTab';
import AdminOrdersTab from './tabs/AdminOrdersTab';
import AdminStoresTab from './tabs/AdminStoresTab';
import AdminAITab from './tabs/AdminAITab';
import AdminNotificationsTab from './tabs/AdminNotificationsTab';
import AdminContentTab from './tabs/AdminContentTab';
import AdminSettingsTab from './tabs/AdminSettingsTab';
import AdminAuditLogTab from './tabs/AdminAuditLogTab';
import AdminHealthTab from './tabs/AdminHealthTab';

type TabKey =
  | 'overview' | 'users' | 'listings' | 'categories' | 'moderation'
  | 'reports' | 'ads' | 'orders' | 'stores' | 'ai' | 'notifications'
  | 'content' | 'settings' | 'audit' | 'health';

interface TabDef {
  key: TabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean; // hidden from moderator when true
}

const TABS: TabDef[] = [
  { key: 'overview',      label: 'Pārskats',       icon: LayoutDashboard },
  { key: 'users',         label: 'Lietotāji',      icon: Users },
  { key: 'listings',      label: 'Sludinājumi',    icon: Package },
  { key: 'categories',    label: 'Kategorijas',    icon: FolderTree, adminOnly: true },
  { key: 'moderation',    label: 'Moderācija',     icon: ShieldAlert },
  { key: 'reports',       label: 'Sūdzības/strīdi', icon: Flag },
  { key: 'ads',           label: 'Reklāmas',       icon: Megaphone, adminOnly: true },
  { key: 'orders',        label: 'Pasūtījumi',     icon: ShoppingCart, adminOnly: true },
  { key: 'stores',        label: 'Uzņēmumi',       icon: Store, adminOnly: true },
  { key: 'ai',            label: 'AI iestatījumi', icon: Brain, adminOnly: true },
  { key: 'notifications', label: 'Paziņojumi',     icon: Bell, adminOnly: true },
  { key: 'content',       label: 'Saturs',         icon: FileText, adminOnly: true },
  { key: 'settings',      label: 'Iestatījumi',    icon: SettingsIcon, adminOnly: true },
  { key: 'audit',         label: 'Audita žurnāls', icon: History, adminOnly: true },
  { key: 'health',        label: 'Sistēmas veselība', icon: Activity, adminOnly: true },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  useEffect(() => {
    if (loading) return;
    if (!user) navigate('/login');
    else if (user.role !== 'admin' && user.role !== 'moderator') navigate('/');
  }, [user, loading, navigate]);

  if (loading || !user) return null;

  const isModerator = user.role === 'moderator';
  const visibleTabs = TABS.filter(t => !(t.adminOnly && isModerator));

  function renderTab() {
    switch (activeTab) {
      case 'overview': return <AdminOverviewTab />;
      case 'users': return <AdminUsersTab />;
      case 'listings': return <AdminListingsTab />;
      case 'categories': return <AdminCategoriesTab />;
      case 'moderation': return <AdminModerationTab />;
      case 'reports': return <AdminReportsTab />;
      case 'ads': return <AdminAdsTab />;
      case 'orders': return <AdminOrdersTab />;
      case 'stores': return <AdminStoresTab />;
      case 'ai': return <AdminAITab />;
      case 'notifications': return <AdminNotificationsTab />;
      case 'content': return <AdminContentTab />;
      case 'settings': return <AdminSettingsTab />;
      case 'audit': return <AdminAuditLogTab />;
      case 'health': return <AdminHealthTab />;
    }
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] bg-slate-50">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 overflow-y-auto">
        <div className="px-4 py-5 border-b border-slate-100">
          <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Admin Center</p>
          <p className="text-sm font-semibold text-slate-900 mt-1 truncate">{user.name}</p>
          <p className="text-[10px] uppercase text-[#E64415] font-bold tracking-wider">{user.role}</p>
        </div>
        <nav className="flex-1 py-2">
          {visibleTabs.map(t => {
            const Icon = t.icon;
            const active = t.key === activeTab;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  active
                    ? 'bg-primary-50 text-[#E64415] font-semibold border-l-2 border-[#E64415]'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{t.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="px-4 py-3 border-t border-slate-100">
          <button
            type="button"
            onClick={signOut}
            className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-800"
          >
            <LogOut className="w-3 h-3" /> Iziet
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8">
          {renderTab()}
        </div>
      </main>
    </div>
  );
}
