import React, { useState, useEffect } from 'react';
import Modal from '../../../common/components/Modal';
import { GripVertical, Save, Loader2, Users, ListOrdered } from 'lucide-react';
import api from '../../../common/services/api';
import toast from 'react-hot-toast';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const branchDefaultDesignations = {
  'SSCC': [
    'SENIOR CONSULTANT',
    'CONSULTANT',
    'ASSOCIATE PROFESSOR',
    'PROFESSOR',
    'VISITING CONSULTANT',
    'EMERITUS PROFESSOR',
    'ASSISTANT PROFESSOR',
    'SENIOR RESIDENT'
  ],
  'PBMH': [
    'Head of the Dept',
    'Head of the Dept / Unit Head',
    'PROFESSOR',
    'ASSOCIATE PROFESSOR',
    'ASSISTANT PROFESSOR',
    'SENIOR RESIDENT'
  ]
};

// ─── Sortable item for designations ───
function SortableDesignationItem({ id, designation }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes} 
      {...listeners}
      className="flex items-center gap-3 p-3 bg-slate-900 border border-slate-700/50 rounded-lg mb-2 shadow-sm cursor-grab active:cursor-grabbing hover:bg-slate-800 transition-colors"
    >
      <div className="text-slate-500 p-1">
        <GripVertical className="w-5 h-5" />
      </div>
      <span className="text-slate-200 font-semibold text-sm tracking-wide select-none">{designation}</span>
    </div>
  );
}

// ─── Sortable item for doctors ───
function SortableDoctorItem({ id, doctor }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex items-center gap-3 px-3 py-2.5 bg-slate-900/80 border border-slate-700/40 rounded-lg mb-1.5 shadow-sm cursor-grab active:cursor-grabbing hover:bg-slate-800/80 transition-colors"
    >
      <div className="text-slate-600 p-0.5">
        <GripVertical className="w-4 h-4" />
      </div>
      <span className="text-slate-300 text-sm select-none">{doctor.name}</span>
    </div>
  );
}

export function DesignationOrderModal({ isOpen, onClose, department }) {
  const [activeTab, setActiveTab] = useState('designations');
  const [designations, setDesignations] = useState([]);
  const [doctorGroups, setDoctorGroups] = useState({}); // { designation: [doctor, ...] }
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (isOpen && department) {
      fetchDesignations();
      fetchDoctorsOrder();
    } else {
      setDesignations([]);
      setDoctorGroups({});
      setActiveTab('designations');
    }
  }, [isOpen, department]);

  const fetchDesignations = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/departments/${department.id}/designations`);
      if (response.data && response.data.length > 0) {
        setDesignations(response.data.map(d => d.designation));
      } else if (department?.branch_id) {
        const masterRes = await api.get(`/branches/${department.branch_id}/designation-master`);
        const masterList = (masterRes.data || []).map(d => d.designation);
        setDesignations(masterList);
      } else {
        const defaultList = branchDefaultDesignations[department?.branch_name] || branchDefaultDesignations['SSCC'];
        setDesignations([...defaultList]);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load designation configuration.');
      const defaultList = branchDefaultDesignations[department?.branch_name] || branchDefaultDesignations['SSCC'];
      setDesignations([...defaultList]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctorsOrder = async () => {
    try {
      const response = await api.get(`/departments/${department.id}/doctors-order`);
      const doctors = response.data || [];
      
      // Group by designation
      const groups = {};
      for (const doc of doctors) {
        const desig = doc.designation || 'UNSPECIFIED';
        if (!groups[desig]) groups[desig] = [];
        groups[desig].push(doc);
      }
      setDoctorGroups(groups);
    } catch (err) {
      console.error(err);
    }
  };

  // ─── Designation drag ───
  const handleDesignationDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setDesignations((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        return arrayMove(items, oldIndex === -1 ? items.findIndex(i => i === active.id) : oldIndex, newIndex === -1 ? items.findIndex(i => i === over.id) : newIndex);
      });
    }
  };

  // ─── Doctor drag within a designation group ───
  const handleDoctorDragEnd = (designation) => (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setDoctorGroups((prev) => {
      const group = [...(prev[designation] || [])];
      const oldIndex = group.findIndex(d => `doc-${d.doctor_id}` === active.id);
      const newIndex = group.findIndex(d => `doc-${d.doctor_id}` === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return { ...prev, [designation]: arrayMove(group, oldIndex, newIndex) };
    });
  };

  // ─── Save ───
  const handleSave = async () => {
    setSaving(true);
    const loadToast = toast.loading('Saving configuration...');
    try {
      if (activeTab === 'designations') {
        await api.put(`/departments/${department.id}/designations`, { designations });
        toast.success('Designation order saved successfully.', { id: loadToast });
      } else {
        // Build flat orders array from all groups
        const orders = [];
        for (const desig of Object.keys(doctorGroups)) {
          const group = doctorGroups[desig];
          group.forEach((doc, idx) => {
            orders.push({ doctor_id: doc.doctor_id, display_order: idx + 1 });
          });
        }
        await api.put(`/departments/${department.id}/doctors-order`, { orders });
        toast.success('Doctor priority saved successfully.', { id: loadToast });
      }
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save.', { id: loadToast });
    } finally {
      setSaving(false);
    }
  };

  const groupKeys = Object.keys(doctorGroups);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={department ? `${department.name} - Configuration` : 'Configuration'}
      closeOnBackdropClick={false}
      closeOnEscape={false}
    >
      <div className="space-y-4">
        {/* Tab Switcher */}
        <div className="flex gap-2 p-1 bg-slate-900/60 rounded-xl border border-slate-800/50">
          <button
            type="button"
            onClick={() => setActiveTab('designations')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'designations'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ListOrdered className="w-4 h-4" />
            Designation Order
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('doctors')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'doctors'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Users className="w-4 h-4" />
            Doctor Priority
          </button>
        </div>

        {/* ─── Designation Order Tab ─── */}
        {activeTab === 'designations' && (
          <>
            <p className="text-xs text-slate-400">
              Drag and drop the designations below to set their display priority for this department on the Digital Signage screens.
            </p>

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
              </div>
            ) : (
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                <DndContext 
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDesignationDragEnd}
                >
                  <SortableContext 
                    items={designations}
                    strategy={verticalListSortingStrategy}
                  >
                    {designations.map((desig) => (
                      <SortableDesignationItem key={desig} id={desig} designation={desig} />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            )}
          </>
        )}

        {/* ─── Doctor Priority Tab ─── */}
        {activeTab === 'doctors' && (
          <>
            <p className="text-xs text-slate-400">
              Drag and drop doctors within each designation group to set who appears first on the Digital Signage screen.
            </p>

            {groupKeys.length === 0 ? (
              <div className="flex justify-center items-center py-12 text-slate-500 text-sm">
                No doctors assigned to this department.
              </div>
            ) : (
              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                {groupKeys.map((desig) => {
                  const group = doctorGroups[desig];
                  const ids = group.map(d => `doc-${d.doctor_id}`);
                  return (
                    <div key={desig} className="bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                      <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-2 px-1">
                        {desig} <span className="text-slate-600 font-normal">({group.length})</span>
                      </div>
                      {group.length <= 1 ? (
                        <div className="px-3 py-2.5 text-slate-500 text-sm">
                          {group.length === 1 ? group[0].name : 'No doctors'}
                        </div>
                      ) : (
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={handleDoctorDragEnd(desig)}
                        >
                          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                            {group.map((doc) => (
                              <SortableDoctorItem
                                key={`doc-${doc.doctor_id}`}
                                id={`doc-${doc.doctor_id}`}
                                doctor={doc}
                              />
                            ))}
                          </SortableContext>
                        </DndContext>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ─── Footer ─── */}
        <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800/60 mt-4">
          <button 
            type="button" 
            onClick={onClose}
            className="px-6 py-2.5 bg-transparent border border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold rounded-xl text-sm transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={saving || loading} 
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-bold rounded-xl text-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
