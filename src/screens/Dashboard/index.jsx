import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/layout/TopBar.jsx';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../../db/index.js';

export default function Dashboard() {
  const navigate   = useNavigate();
  const inspections = useLiveQuery(
    () => db.inspections.orderBy('createdAt').reverse().limit(20).toArray(),
    []
  );

  return (
    <div className="min-h-screen bg-white dark:bg-surface">
      <TopBar title="Property Lens" subtitle="Inspections" />

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* CTA */}
        <button
          onClick={() => navigate('/inspect/new')}
          className="w-full py-4 rounded-card bg-gold text-surface font-bold text-base shadow-card-gold active:opacity-90 transition-opacity"
        >
          + New Inspection
        </button>

        {/* Recent inspections */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
            Recent Inspections
          </h2>

          {!inspections ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="h-20 rounded-card bg-gray-100 dark:bg-surface-card animate-pulse" />
              ))}
            </div>
          ) : inspections.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-3">
              {inspections.map(insp => (
                <InspectionCard key={insp.id} inspection={insp} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InspectionCard({ inspection }) {
  const navigate = useNavigate();
  const isCheckOut = inspection.type === 'check-out';

  return (
    <div
      onClick={() => navigate(`/inspect/${inspection.id}`)}
      className="rounded-card bg-gray-50 dark:bg-surface-card border border-gray-200 dark:border-surface-border p-4 cursor-pointer active:opacity-80 transition-opacity"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
            {inspection.address || 'Unnamed Property'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {inspection.tenantName && `${inspection.tenantName} · `}
            {inspection.inspectionDate || '—'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            isCheckOut
              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
              : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
          }`}>
            {isCheckOut ? 'Check-Out' : 'Check-In'}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            inspection.status === 'complete' || inspection.status === 'signed'
              ? 'bg-gray-100 dark:bg-surface-border text-gray-500 dark:text-gray-400'
              : 'bg-gold/10 text-gold'
          }`}>
            {inspection.status === 'draft' ? 'In Progress' :
             inspection.status === 'complete' ? 'Complete' :
             inspection.status === 'signed' ? 'Signed' :
             inspection.status === 'exported' ? 'Exported' : inspection.status}
          </span>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16 text-gray-400 dark:text-gray-500">
      <div className="text-5xl mb-4">🏠</div>
      <p className="font-semibold text-sm">No inspections yet</p>
      <p className="text-xs mt-1">Tap "New Inspection" to get started</p>
    </div>
  );
}
