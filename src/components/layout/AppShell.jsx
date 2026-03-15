import { Outlet } from 'react-router-dom';
import BottomNav    from './BottomNav.jsx';
import SyncStatusBar from '../SyncStatusBar.jsx';

export default function AppShell() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-surface">
      {/* Connectivity + sync indicator (PRD §7.3) */}
      <SyncStatusBar />
      {/* Main content — leaves room for bottom nav */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
