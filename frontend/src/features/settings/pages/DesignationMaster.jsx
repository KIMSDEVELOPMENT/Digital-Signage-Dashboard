import React, { useState, useEffect } from 'react';
import api from '../../../common/services/api';
import { GripVertical, Plus, Trash2, Save, Loader2, Award, Building2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
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

function SortableDesignationItem({ id, designation, onDelete }) {
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
      className="flex items-center justify-between p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl mb-2.5 shadow-sm group hover:border-slate-700 transition-colors"
    >
      <div className="flex items-center gap-3 flex-1" {...attributes} {...listeners}>
        <div className="text-slate-600 group-hover:text-slate-400 p-1 cursor-grab active:cursor-grabbing transition-colors">
          <GripVertical className="w-5 h-5" />
        </div>
        <span className="text-slate-200 font-semibold text-sm tracking-wide select-none">
          {designation}
        </span>
      </div>
      <button
        type="button"
        onClick={() => onDelete(designation)}
        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
        title="Remove designation"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

const DesignationMaster = () => {
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [designations, setDesignations] = useState([]);
  const [newDesignation, setNewDesignation] = useState('');
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [loadingDesignations, setLoadingDesignations] = useState(false);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      setLoadingBranches(true);
      const res = await api.get('/branches?status=1');
      const data = res.data.data || res.data;
      setBranches(data);
      if (data.length > 0) {
        setSelectedBranchId(data[0].id.toString());
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load branches.');
    } finally {
      setLoadingBranches(false);
    }
  };

  useEffect(() => {
    if (selectedBranchId) {
      fetchDesignations(selectedBranchId);
    }
  }, [selectedBranchId]);

  const fetchDesignations = async (branchId) => {
    try {
      setLoadingDesignations(true);
      const res = await api.get(`/branches/${branchId}/designation-master`);
      const list = (res.data || []).map((d) => d.designation);
      setDesignations(list);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load branch designations.');
      setDesignations([]);
    } finally {
      setLoadingDesignations(false);
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setDesignations((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleAdd = (e) => {
    e.preventDefault();
    const trimmed = newDesignation.trim().toUpperCase();
    if (!trimmed) {
      toast.error('Designation name cannot be empty.');
      return;
    }
    if (designations.some(d => d.toUpperCase() === trimmed)) {
      toast.error('Designation already exists in this branch.');
      return;
    }
    setDesignations(prev => [...prev, trimmed]);
    setNewDesignation('');
  };

  const handleDelete = (target) => {
    setDesignations(prev => prev.filter(d => d !== target));
  };

  const handleSave = async () => {
    if (!selectedBranchId) return;
    setSaving(true);
    const loadToast = toast.loading('Saving designation master...');
    try {
      await api.put(`/branches/${selectedBranchId}/designation-master`, {
        designations
      });
      toast.success('Branch designation master saved successfully!', { id: loadToast });
    } catch (err) {
      console.error(err);
      toast.error('Failed to save designation master.', { id: loadToast });
    } finally {
      setSaving(false);
    }
  };

  const selectedBranch = branches.find(b => b.id.toString() === selectedBranchId);

  return (
    <div className="flex-1 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-200 flex items-center gap-3">
            <Award className="w-8 h-8 text-emerald-400" />
            Designation Master
          </h1>
          <p className="text-slate-400 mt-1 text-base">
            Manage and prioritize standard doctor titles/designations per branch for Digital Signage displays.
          </p>
        </div>
      </div>

      <div className="glass-panel p-6 rounded-2xl border border-slate-800/60 shadow-sm max-w-3xl space-y-6">
        {/* Branch Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-400" />
            Select Branch
          </label>
          {loadingBranches ? (
            <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> Loading branches...
            </div>
          ) : (
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full sm:w-72 px-4 py-2.5 rounded-xl text-sm bg-[#070b14] border border-slate-800 focus:border-emerald-500 focus:outline-none text-white cursor-pointer shadow-inner"
            >
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Add Designation Form */}
        <form onSubmit={handleAdd} className="flex gap-3">
          <input
            type="text"
            placeholder="Enter designation (e.g. VISITING PROFESSOR)"
            value={newDesignation}
            onChange={(e) => setNewDesignation(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm bg-[#070b14] border border-slate-800 focus:border-emerald-500 focus:outline-none text-white placeholder-slate-600 shadow-inner uppercase"
          />
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 font-semibold rounded-xl text-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </form>

        {/* Designation Reorder List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {selectedBranch ? `${selectedBranch.name} Designations` : 'Designations'} ({designations.length})
            </span>
            <span className="text-[11px] text-slate-500">Drag items to change display order</span>
          </div>

          {loadingDesignations ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
          ) : designations.length === 0 ? (
            <div className="bg-slate-950/40 p-8 rounded-xl border border-slate-800/60 text-center text-slate-500 text-sm">
              No designations added for this branch yet. Use the input above to add one.
            </div>
          ) : (
            <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={designations}
                  strategy={verticalListSortingStrategy}
                >
                  {designations.map((desig) => (
                    <SortableDesignationItem
                      key={desig}
                      id={desig}
                      designation={desig}
                      onDelete={handleDelete}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 flex items-center justify-end border-t border-slate-800/60">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loadingDesignations}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-bold rounded-xl text-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Designation Master'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DesignationMaster;
