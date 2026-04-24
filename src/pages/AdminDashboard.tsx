// The Admin dashboard now defers to the modular Admin Control Center
// layout. The old monolithic 1653-line file was split into tab components
// under src/pages/admin/tabs/. This re-export preserves the /admin route
// import in App.tsx.

import AdminLayout from './admin/AdminLayout';

export default function AdminDashboard() {
  return <AdminLayout />;
}
