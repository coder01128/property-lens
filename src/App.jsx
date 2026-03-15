import { Component } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext.jsx';
import AppShell from './components/layout/AppShell.jsx';

// Screens
import Dashboard        from './screens/Dashboard/index.jsx';
import NewInspection    from './screens/NewInspection/index.jsx';
import InspectionEditor from './screens/InspectionEditor/index.jsx';
import ReportView       from './screens/ReportView/index.jsx';
import Properties       from './screens/Properties/index.jsx';
import Settings         from './screens/Settings/index.jsx';

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: 'monospace', color: '#ef4444', background: '#1a0000', minHeight: '100vh' }}>
          <h2 style={{ color: '#fca5a5', marginBottom: 12 }}>App crashed</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{String(this.state.error)}{'\n\n'}{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index                                          element={<Dashboard />} />
            <Route path="inspect/new"                            element={<NewInspection />} />
            <Route path="inspect/:inspectionId"                  element={<InspectionEditor />} />
            <Route path="inspect/:inspectionId/room/:roomId"     element={<InspectionEditor />} />
            <Route path="inspect/:inspectionId/report"           element={<ReportView />} />
            <Route path="properties"                             element={<Properties />} />
            <Route path="properties/:propertyId"                 element={<Properties />} />
            <Route path="settings"                               element={<Settings />} />
            <Route path="*"                                      element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
    </ErrorBoundary>
  );
}
