import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/layout/TopBar.jsx';
import AddressInput from '../../components/AddressInput.jsx';
import db from '../../db/index.js';
import { SPECIAL_ROOMS } from '../../lib/roomPresets.js';

const uid = () => crypto.randomUUID();

export default function NewInspection() {
  const navigate = useNavigate();
  const [step, setStep]         = useState(1); // 1=property, 2=type+parties
  const [address, setAddress]   = useState('');
  const [placeData, setPlaceData] = useState(null);
  const [unitNo, setUnitNo]     = useState('');
  const [type, setType]         = useState('check-in');
  const [tenant, setTenant]     = useState('');
  const [landlord, setLandlord] = useState('');
  const [inspector, setInspector] = useState('');
  const [errors, setErrors]     = useState({});
  const [saving, setSaving]     = useState(false);

  const validateStep1 = () => {
    const e = {};
    if (!address.trim()) e.address = 'Property address is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e = {};
    if (!tenant.trim()) e.tenant = 'Tenant name is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = async () => {
    if (!validateStep2()) return;
    setSaving(true);
    try {
      const propertyId    = uid();
      const inspectionId  = uid();
      const now           = new Date().toISOString();
      const today         = now.split('T')[0];

      // Upsert property
      await db.properties.put({
        id: propertyId, address: address.trim(), addressLine2: unitNo.trim(),
        landlordName: landlord.trim(), createdAt: now, updatedAt: now,
        city: '', province: '', postalCode: '',
        placeId: placeData?.place_id || null,
        latitude:  placeData?.geometry?.location?.lat() ?? null,
        longitude: placeData?.geometry?.location?.lng() ?? null,
        landlordEmail: '', landlordPhone: '', notes: '', syncedAt: null, userId: null,
      });

      // Create inspection
      await db.inspections.add({
        id: inspectionId, propertyId, type,
        status: 'draft', createdAt: now, updatedAt: now,
        inspectionDate: today,
        inspectorName: inspector.trim(),
        inspectorEmail: '', tenantName: tenant.trim(),
        tenantEmail: '', tenantPhone: '',
        address: address.trim(),
        linkedInspectionId: null, signaturesJson: null,
        overallNotes: '', syncedAt: null, userId: null,
      });

      // Seed special rooms (keys, electricity, water) — always present
      for (let i = 0; i < SPECIAL_ROOMS.length; i++) {
        const sr = SPECIAL_ROOMS[i];
        const roomId = uid();
        await db.rooms.add({
          id: roomId, inspectionId, typeKey: sr.typeKey,
          displayName: sr.displayName, sortOrder: i,
          isSpecial: true, specialType: sr.specialType,
          isComplete: false, overallNotes: '',
          createdAt: now, updatedAt: now,
          aiAnalysed: false, aiError: false, aiErrorMsg: null,
          meterReading: '', keyCount: null,
        });
        // Seed default items for each special room
        for (let j = 0; j < sr.defaultItems.length; j++) {
          await db.items.add({
            id: uid(), roomId, inspectionId,
            name: sr.defaultItems[j].name, isDefault: true, sortOrder: j,
            condition: null, cleanliness: null, defects: '', repairNotes: '',
            isRated: false, aiSuggested: false, aiAccepted: false,
            createdAt: now, updatedAt: now,
          });
        }
      }

      navigate(`/inspect/${inspectionId}`);
    } catch (err) {
      console.error('Failed to create inspection:', err);
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-surface">
      <TopBar
        title="New Inspection"
        subtitle={`Step ${step} of 2`}
        back={step === 1 ? true : () => setStep(1)}
      />

      <div className="max-w-lg mx-auto px-4 py-6">
        {step === 1 && (
          <Step1
            address={address}
            setAddress={v => { setAddress(v); setPlaceData(null); }}
            onPlaceSelect={setPlaceData}
            unitNo={unitNo} setUnitNo={setUnitNo}
            errors={errors}
            onNext={() => { if (validateStep1()) { setErrors({}); setStep(2); } }}
          />
        )}
        {step === 2 && (
          <Step2
            type={type} setType={setType}
            tenant={tenant} setTenant={setTenant}
            landlord={landlord} setLandlord={setLandlord}
            inspector={inspector} setInspector={setInspector}
            errors={errors}
            saving={saving}
            onBack={() => setStep(1)}
            onCreate={handleCreate}
          />
        )}
      </div>
    </div>
  );
}

// ─── Step 1: Property address ─────────────────────────────────────────────
function Step1({ address, setAddress, onPlaceSelect, unitNo, setUnitNo, errors, onNext }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Property Address</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Where is the inspection taking place?</p>
      </div>

      <FieldGroup label="Street Address *" error={errors.address}>
        <AddressInput
          value={address}
          onChange={setAddress}
          onSelect={onPlaceSelect}
          hasError={!!errors.address}
          placeholder="e.g. 14 Bree Street, Cape Town"
          autoFocus
        />
      </FieldGroup>

      <FieldGroup label="Unit / Apartment Number" error={null}>
        <input
          className={inputCls(false)}
          placeholder="e.g. Unit 4B (optional)"
          value={unitNo}
          onChange={e => setUnitNo(e.target.value)}
        />
      </FieldGroup>

      <button
        onClick={onNext}
        className="w-full py-4 rounded-card bg-gold text-surface font-bold text-base active:opacity-90"
      >
        Continue →
      </button>
    </div>
  );
}

// ─── Step 2: Inspection type + parties ────────────────────────────────────
function Step2({ type, setType, tenant, setTenant, landlord, setLandlord, inspector, setInspector, errors, saving, onBack, onCreate }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Inspection Details</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Set the type and parties involved.</p>
      </div>

      {/* Inspection type */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
          Inspection Type
        </label>
        <div className="grid grid-cols-2 gap-3">
          {['check-in', 'check-out'].map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`py-3 rounded-card text-sm font-bold border transition-colors ${
                type === t
                  ? 'bg-gold/10 border-gold text-gold'
                  : 'bg-gray-50 dark:bg-surface-card border-gray-200 dark:border-surface-border text-gray-600 dark:text-gray-300'
              }`}
            >
              {t === 'check-in' ? '🔑 Check-In' : '🔓 Check-Out'}
            </button>
          ))}
        </div>
      </div>

      <FieldGroup label="Tenant Name *" error={errors.tenant}>
        <input
          className={inputCls(!!errors.tenant)}
          placeholder="e.g. Sipho Ndlovu"
          value={tenant}
          onChange={e => setTenant(e.target.value)}
        />
      </FieldGroup>

      <FieldGroup label="Landlord / Agent Name" error={null}>
        <input
          className={inputCls(false)}
          placeholder="e.g. Jane Smith (optional)"
          value={landlord}
          onChange={e => setLandlord(e.target.value)}
        />
      </FieldGroup>

      <FieldGroup label="Inspector Name" error={null}>
        <input
          className={inputCls(false)}
          placeholder="Your name (optional)"
          value={inspector}
          onChange={e => setInspector(e.target.value)}
        />
      </FieldGroup>

      <button
        onClick={onCreate}
        disabled={saving}
        className="w-full py-4 rounded-card bg-gold text-surface font-bold text-base active:opacity-90 disabled:opacity-60"
      >
        {saving ? 'Creating…' : 'Start Inspection →'}
      </button>
    </div>
  );
}

// ─── Shared helpers ────────────────────────────────────────────────────────
function FieldGroup({ label, error, children }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

const inputCls = (hasError) =>
  `w-full px-4 py-3 rounded-card text-sm bg-gray-50 dark:bg-surface-card border transition-colors outline-none
   text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500
   ${hasError
     ? 'border-red-400 focus:border-red-500'
     : 'border-gray-200 dark:border-surface-border focus:border-gold dark:focus:border-gold'
   }`;
