import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import TopBar from '../../components/layout/TopBar.jsx';
import SignatureCanvas from '../../components/SignatureCanvas.jsx';
import db from '../../db/index.js';
import { buildInspectionPDF, reportFilename } from '../../lib/pdfBuilder.js';
import { CONDITION_COLORS } from '../../lib/roomPresets.js';

export default function ReportView() {
  const { inspectionId } = useParams();
  const navigate         = useNavigate();
  const [pdfStatus, setPdfStatus] = useState('idle');

  // Current inspection data
  const inspection = useLiveQuery(() => db.inspections.get(inspectionId), [inspectionId]);
  const rooms      = useLiveQuery(
    () => db.rooms.where('inspectionId').equals(inspectionId).sortBy('sortOrder'),
    [inspectionId]
  );
  const items  = useLiveQuery(
    () => db.items.where('inspectionId').equals(inspectionId).toArray(),
    [inspectionId]
  );
  const photos = useLiveQuery(
    () => db.photos.where('inspectionId').equals(inspectionId).toArray(),
    [inspectionId]
  );

  // Linked check-in (for check-out comparison, PRD §6.3)
  const linkedInspection = useLiveQuery(
    async () => {
      if (!inspection?.propertyId || inspection.type !== 'check-out') return null;
      const all = await db.inspections
        .where('propertyId').equals(inspection.propertyId)
        .toArray();
      return all.find(i => i.type === 'check-in' && i.id !== inspectionId) || null;
    },
    [inspection?.propertyId, inspection?.type, inspectionId]
  );
  const linkedRooms = useLiveQuery(
    () => linkedInspection
      ? db.rooms.where('inspectionId').equals(linkedInspection.id).sortBy('sortOrder')
      : Promise.resolve([]),
    [linkedInspection?.id]
  );
  const linkedItems = useLiveQuery(
    () => linkedInspection
      ? db.items.where('inspectionId').equals(linkedInspection.id).toArray()
      : Promise.resolve([]),
    [linkedInspection?.id]
  );

  // Signatures — persisted to inspection.signaturesJson
  const parsedSigs = (() => {
    try { return inspection?.signaturesJson ? JSON.parse(inspection.signaturesJson) : {}; }
    catch { return {}; }
  })();

  const saveSig = useCallback((key, dataUrl) => {
    const current = (() => {
      try { return inspection?.signaturesJson ? JSON.parse(inspection.signaturesJson) : {}; }
      catch { return {}; }
    })();
    const updated = { ...current, [key]: dataUrl };
    db.inspections.update(inspectionId, {
      signaturesJson: JSON.stringify(updated),
      updatedAt: new Date().toISOString(),
    });
  }, [inspection?.signaturesJson, inspectionId]);

  if (!inspection || !rooms || !items || !photos) {
    return (
      <div className="min-h-screen bg-white dark:bg-surface p-4 space-y-3">
        {[1,2,3].map(i => <div key={i} className="h-24 rounded-card bg-gray-100 dark:bg-surface-card animate-pulse" />)}
      </div>
    );
  }

  const completedRooms  = rooms.filter(r => r.isComplete);
  const hasComparison   = inspection.type === 'check-out' && linkedRooms?.length > 0;

  const buildAndExport = async (action = 'download') => {
    setPdfStatus('loading');
    try {
      const sigs = (() => {
        try { return inspection.signaturesJson ? JSON.parse(inspection.signaturesJson) : null; }
        catch { return null; }
      })();

      const doc = await buildInspectionPDF({
        inspection,
        rooms,
        items,
        photos,
        signatures:       sigs,
        linkedInspection: linkedInspection || null,
        linkedRooms:      linkedRooms  || [],
        linkedItems:      linkedItems  || [],
      });

      const fname = reportFilename(inspection);

      if (action === 'share') {
        const blob = doc.output('blob');
        const file = new File([blob], fname, { type: 'application/pdf' });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            title: `Property Inspection Report`,
            text:  `${inspection.type === 'check-in' ? 'Check-In' : 'Check-Out'} report for ${inspection.address}`,
            files: [file],
          });
        } else {
          doc.save(fname); // fallback
        }
      } else {
        doc.save(fname);
      }

      setPdfStatus('done');
      setTimeout(() => setPdfStatus('idle'), 3500);
    } catch (err) {
      console.error(err);
      setPdfStatus('error');
      setTimeout(() => setPdfStatus('idle'), 4000);
    }
  };

  const btnLabel = {
    idle:    '📄 Export PDF Report',
    loading: '⏳ Building PDF…',
    done:    '✓ PDF Downloaded!',
    error:   '⚠ Failed — Tap to Retry',
  }[pdfStatus];

  const btnCls = `w-full py-4 rounded-card font-bold text-base transition-colors disabled:opacity-60 ${
    pdfStatus === 'done'  ? 'bg-green-500 text-white' :
    pdfStatus === 'error' ? 'bg-red-500 text-white'   :
                            'bg-gold text-surface active:opacity-90'
  }`;

  const canAct = pdfStatus === 'idle' || pdfStatus === 'error';

  return (
    <div className="min-h-screen bg-white dark:bg-surface">
      <TopBar
        title="Inspection Report"
        subtitle={inspection.address}
        back={() => navigate(`/inspect/${inspectionId}`)}
      />

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-8">

        {/* Summary */}
        <div className="p-4 rounded-card bg-gray-50 dark:bg-surface-card border border-gray-200 dark:border-surface-border">
          <div className="flex justify-between items-start gap-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Tenant</p>
              <p className="font-bold text-gray-900 dark:text-white text-sm">{inspection.tenantName || '—'}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Date</p>
              <p className="font-bold text-gray-900 dark:text-white text-sm">{inspection.inspectionDate}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {completedRooms.length} of {rooms.length} rooms complete
            {inspection.inspectorName ? ` · ${inspection.inspectorName}` : ''}
            {hasComparison && ' · Comparison available'}
          </p>
        </div>

        {/* Comparison notice */}
        {hasComparison && (
          <div className="p-3 rounded-card bg-gold/5 border border-gold/20">
            <p className="text-xs font-bold text-gold mb-0.5">Check-In/Out Comparison Included</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              A condition comparison table vs the linked check-in will be included in the PDF.
            </p>
          </div>
        )}

        {/* Room summaries */}
        <div className="space-y-2">
          {completedRooms.map(room => {
            const roomItems = items.filter(it => it.roomId === room.id && it.name?.trim());
            return (
              <div key={room.id} className="p-3 rounded-card bg-gray-50 dark:bg-surface-card border border-gray-200 dark:border-surface-border">
                <div className="flex items-center gap-2 mb-1.5">
                  <p className="font-bold text-sm text-gray-900 dark:text-white flex-1">{room.displayName}</p>
                  {room.overallCondition && (
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: (CONDITION_COLORS[room.overallCondition] || '#888') + '22',
                        color: CONDITION_COLORS[room.overallCondition] || '#888',
                      }}
                    >
                      {room.overallCondition}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {roomItems.slice(0, 4).map(i => i.name).join(' · ')}
                  {roomItems.length > 4 && ` +${roomItems.length - 4} more`}
                </p>
              </div>
            );
          })}
        </div>

        {/* Signatures */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            Signatures
          </h3>
          <SignatureCanvas
            label="Inspector / Agent"
            value={parsedSigs.agent || null}
            onChange={dataUrl => saveSig('agent', dataUrl)}
          />
          <SignatureCanvas
            label="Tenant"
            value={parsedSigs.tenant || null}
            onChange={dataUrl => saveSig('tenant', dataUrl)}
          />
        </div>

        {/* Export button */}
        <button
          onClick={canAct ? () => buildAndExport('download') : undefined}
          disabled={pdfStatus === 'loading'}
          className={btnCls}
        >
          {btnLabel}
        </button>

        {/* Share button */}
        <button
          onClick={canAct ? () => buildAndExport('share') : undefined}
          disabled={pdfStatus === 'loading'}
          className="w-full py-3 rounded-card border border-gray-200 dark:border-surface-border text-sm font-semibold text-gray-700 dark:text-gray-200 active:opacity-80 disabled:opacity-40"
        >
          🔗 Share Report
        </button>

      </div>
    </div>
  );
}
