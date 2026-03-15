import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import TopBar from '../../components/layout/TopBar.jsx';
import db from '../../db/index.js';

export default function Properties() {
  const navigate = useNavigate();
  const { propertyId } = useParams();
  const [search, setSearch] = useState('');

  const properties  = useLiveQuery(() => db.properties.toArray(), []);
  const inspections = useLiveQuery(() => db.inspections.toArray(), []);

  if (!properties || !inspections) {
    return (
      <div className="min-h-screen bg-white dark:bg-surface p-4 space-y-3">
        {[1,2,3].map(i => <div key={i} className="h-20 rounded-card bg-gray-100 dark:bg-surface-card animate-pulse" />)}
      </div>
    );
  }

  // If a propertyId is selected, show that property's inspections
  if (propertyId) {
    const property = properties.find(p => p.id === propertyId);
    const propInspections = inspections
      .filter(i => i.propertyId === propertyId)
      .sort((a, b) => b.inspectionDate?.localeCompare(a.inspectionDate || '') || 0);

    return (
      <div className="min-h-screen bg-white dark:bg-surface">
        <TopBar
          title={property?.address || 'Property'}
          subtitle={`${propInspections.length} inspection${propInspections.length !== 1 ? 's' : ''}`}
          back={() => navigate('/properties')}
        />
        <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
          {propInspections.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-10">No inspections for this property yet.</p>
          ) : (
            propInspections.map(insp => (
              <div
                key={insp.id}
                onClick={() => navigate(`/inspect/${insp.id}`)}
                className="p-4 rounded-card bg-gray-50 dark:bg-surface-card border border-gray-200 dark:border-surface-border cursor-pointer active:opacity-80"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {insp.type === 'check-in' ? '🔑 Check-In' : '🔓 Check-Out'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{insp.inspectionDate} · {insp.tenantName || 'No tenant'}</p>
                  </div>
                  <span className="text-xs text-gold capitalize">{insp.status}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // Group inspections by property + apply search filter
  const query   = search.trim().toLowerCase();
  const grouped = properties
    .filter(p => !query || p.address?.toLowerCase().includes(query))
    .map(p => ({
      ...p,
      inspections: inspections.filter(i => i.propertyId === p.id),
    }))
    .sort((a, b) => b.updatedAt?.localeCompare(a.updatedAt || '') || 0);

  return (
    <div className="min-h-screen bg-white dark:bg-surface">
      <TopBar title="Properties" subtitle={`${properties.length} properties`} />
      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {/* Address search (PRD §6.5) */}
        <input
          className="w-full px-4 py-2.5 rounded-card text-sm bg-gray-50 dark:bg-surface-card border border-gray-200 dark:border-surface-border outline-none focus:border-gold text-gray-900 dark:text-white placeholder-gray-400"
          placeholder="Search by address…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {properties.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <div className="text-5xl mb-4">🏠</div>
            <p className="font-semibold text-sm">No properties yet</p>
            <p className="text-xs mt-1">Properties are created when you start a new inspection</p>
          </div>
        ) : (
          grouped.map(p => (
            <div
              key={p.id}
              onClick={() => navigate(`/properties/${p.id}`)}
              className="p-4 rounded-card bg-gray-50 dark:bg-surface-card border border-gray-200 dark:border-surface-border cursor-pointer active:opacity-80"
            >
              <p className="font-bold text-sm text-gray-900 dark:text-white">{p.address}</p>
              {p.addressLine2 && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Unit {p.addressLine2}</p>}
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {p.inspections.length} inspection{p.inspections.length !== 1 ? 's' : ''}
                {p.inspections.some(i => i.type === 'check-in') && ' · Has check-in'}
                {p.inspections.some(i => i.type === 'check-out') && ' · Has check-out'}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
