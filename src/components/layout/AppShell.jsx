import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import BottomNav    from './BottomNav.jsx';
import SyncStatusBar from '../SyncStatusBar.jsx';

export default function AppShell() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    });
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    });
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setInstallPrompt(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-surface">
      {installPrompt && !isInstalled && (
        <div style={{ padding: '8px 16px', background: '#f0faf5', borderBottom: '1px solid #c6ead9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#1a6644', fontWeight: 500 }}>Add Property Lens to your home screen for offline access</span>
          <button
            onClick={handleInstall}
            style={{
              background: '#2FA66B',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontFamily: 'inherit',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            Install App
          </button>
        </div>
      )}
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
