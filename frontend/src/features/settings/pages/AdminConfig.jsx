import React, { useState, useEffect } from 'react';
import api from '../../../common/services/api';
import { Search, ShieldAlert, Check, User, Save, RefreshCw, Layers, MapPin, Shield } from 'lucide-react';
import { toast } from 'react-hot-toast';

const MODULES = ['Department', 'Doctor', 'Duty Roster', 'Display Screen', 'Reports'];

const AdminConfig = () => {
  const [search, setSearch] = useState('');
  const [admins, setAdmins] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [dbBranches, setDbBranches] = useState([]);
  const [dbLocationsByBranch, setDbLocationsByBranch] = useState({});
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [loadingDepts, setLoadingDepts] = useState(false);

  // Selected Admin details and permissions
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [permissions, setPermissions] = useState({
    branches: [],
    locations: [],
    departments: [],
    modules: {},
  });
  const [saving, setSaving] = useState(false);

  const fetchConfigMasters = async () => {
    try {
      const branchesRes = await api.get('/branches?status=1');
      const branchesData = branchesRes.data.data || branchesRes.data;
      const branchNames = branchesData.map(b => b.name);
      setDbBranches(branchNames);

      const locationsRes = await api.get('/locations?status=1', { params: { limit: 1000 } });
      const locationsArray = locationsRes.data.data || locationsRes.data;
      const mapping = {};
      branchNames.forEach(name => {
        mapping[name] = [];
      });
      locationsArray.forEach(loc => {
        const bName = loc.branch_name;
        if (bName) {
          if (!mapping[bName]) mapping[bName] = [];
          mapping[bName].push(loc.name);
        }
      });
      setDbLocationsByBranch(mapping);
    } catch (err) {
      console.error('Failed to load config masters:', err);
    }
  };

  const fetchAdmins = async () => {
    try {
      setLoadingAdmins(true);
      const res = await api.get(`/admins?search=${encodeURIComponent(search)}`);
      setAdmins(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load administrators.');
    } finally {
      setLoadingAdmins(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      setLoadingDepts(true);
      const res = await api.get('/departments');
      setDepartments(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDepts(false);
    }
  };

  useEffect(() => {
    fetchConfigMasters();
    fetchAdmins();
    fetchDepartments();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAdmins();
  };

  const loadAdminPermissions = async (admin) => {
    const loadToast = toast.loading(`Loading configuration for ${admin.full_name}...`);
    try {
      const res = await api.get(`/admins/${admin.id}/permissions`);
      setSelectedAdmin(res.data.admin);
      
      const rawPerms = res.data.permissions;
      
      // Build initial structure matching database format
      const loadedBranches = rawPerms.branches || [];
      const loadedLocations = rawPerms.locations || [];
      const loadedDepts = (rawPerms.departments || []).map(d => d.id);
      
      // Build module perms mapping
      const loadedModules = {};
      MODULES.forEach(m => {
        const dbPerm = rawPerms.modules?.[m] || { read: false, create: false, update: false, delete: false };
        loadedModules[m] = {
          read: dbPerm.read || false,
          create: dbPerm.create || false,
          update: dbPerm.update || false,
          delete: dbPerm.delete || false,
        };
      });

      setPermissions({
        branches: loadedBranches,
        locations: loadedLocations,
        departments: loadedDepts,
        modules: loadedModules,
      });

      toast.success('Configuration loaded!', { id: loadToast });
    } catch (err) {
      toast.error('Failed to load admin permissions.', { id: loadToast });
    }
  };

  // Branch Selection handler
  const toggleBranch = (branch) => {
    let newBranches = [...permissions.branches];
    let newLocations = [...permissions.locations];
    let newDepartments = [...permissions.departments];

    if (newBranches.includes(branch)) {
      newBranches = newBranches.filter(b => b !== branch);
      // Remove locations under this branch
      newLocations = newLocations.filter(loc => loc.branch !== branch);
      // Remove departments under this branch
      const deptsToRemove = departments.filter(d => d.branch_name === branch).map(d => d.id);
      newDepartments = newDepartments.filter(id => !deptsToRemove.includes(id));
    } else {
      newBranches.push(branch);
    }

    setPermissions({
      ...permissions,
      branches: newBranches,
      locations: newLocations,
      departments: newDepartments,
    });
  };

  // Location Selection handler
  const toggleLocation = (branch, location) => {
    // If the branch isn't selected, don't allow selecting location
    if (!permissions.branches.includes(branch)) {
      toast.error(`Please select branch ${branch} first.`);
      return;
    }

    let newLocations = [...permissions.locations];
    let newDepartments = [...permissions.departments];
    const index = newLocations.findIndex(l => l.branch === branch && l.location === location);

    if (index > -1) {
      newLocations.splice(index, 1);
      // Remove departments under this branch and location
      const deptsToRemove = departments.filter(d => d.branch_name === branch && d.location_name === location).map(d => d.id);
      newDepartments = newDepartments.filter(id => !deptsToRemove.includes(id));
    } else {
      newLocations.push({ branch, location });
    }

    setPermissions({
      ...permissions,
      locations: newLocations,
      departments: newDepartments,
    });
  };

  // Department Selection handler
  const toggleDepartment = (deptId) => {
    let newDepts = [...permissions.departments];
    if (newDepts.includes(deptId)) {
      newDepts = newDepts.filter(id => id !== deptId);
    } else {
      newDepts.push(deptId);
    }
    setPermissions({
      ...permissions,
      departments: newDepts,
    });
  };

  // Module permission matrix handler
  const handleModulePermissionChange = (moduleName, action) => {
    const updatedModules = { ...permissions.modules };
    if (!updatedModules[moduleName]) {
      updatedModules[moduleName] = { read: false, create: false, update: false, delete: false };
    }
    updatedModules[moduleName][action] = !updatedModules[moduleName][action];
    
    // Automatically check 'read' if create/update/delete is true
    if (action !== 'read' && updatedModules[moduleName][action]) {
      updatedModules[moduleName].read = true;
    }

    setPermissions({
      ...permissions,
      modules: updatedModules,
    });
  };

  const handleSavePermissions = async () => {
    if (!selectedAdmin) return;

    setSaving(true);
    const loadToast = toast.loading(`Saving permissions for ${selectedAdmin.full_name}...`);
    try {
      await api.put(`/admins/${selectedAdmin.id}/permissions`, permissions);
      toast.success('Permissions updated successfully!', { id: loadToast });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating permissions.', { id: loadToast });
    } finally {
      setSaving(false);
    }
  };

  // Filter departments based on selected branches and locations
  const filteredDepartments = departments.filter((dept) => {
    const hasBranch = permissions.branches.includes(dept.branch_name);
    const hasLocation = permissions.locations.some(
      (loc) => loc.branch === dept.branch_name && loc.location === dept.location_name
    );
    return hasBranch && hasLocation;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      {/* Left Column: Admin Search & Selector List */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800/40 space-y-6 lg:col-span-1 h-fit">
        <h3 className="text-md font-bold text-white tracking-wide uppercase flex items-center gap-2">
          <User className="w-5 h-5 text-emerald-400" />
          Select Administrator
        </h3>
        
        <form onSubmit={handleSearchSubmit} className="relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search by ID or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm transition-all bg-slate-950 border border-slate-800 focus:border-emerald-500/60 focus:outline-none text-white placeholder-slate-600"
          />
        </form>

        {loadingAdmins ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" />
          </div>
        ) : (
          <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
            {admins.length > 0 ? (
              admins.map((admin) => (
                <button
                  key={admin.id}
                  onClick={() => loadAdminPermissions(admin)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col gap-1
                    ${selectedAdmin?.id === admin.id
                      ? 'bg-emerald-500/10 border-emerald-500/35 text-white'
                      : 'bg-slate-900/30 border-slate-800/60 text-slate-300 hover:bg-slate-900/60 hover:border-slate-700/60'
                    }
                  `}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-semibold text-sm truncate">{admin.full_name}</span>
                    <span className="text-[10px] bg-slate-800/80 px-2 py-0.5 rounded text-slate-400 font-mono font-medium">{admin.employee_id || 'No ID'}</span>
                  </div>
                  <span className="text-xs text-slate-400">@{admin.username}</span>
                </button>
              ))
            ) : (
              <p className="text-sm text-slate-500 text-center py-6">No normal administrators found.</p>
            )}
          </div>
        )}
      </div>

      {/* Right Column: Permission Configuration Dashboard */}
      <div className="lg:col-span-2 space-y-6">
        {selectedAdmin ? (
          <div className="glass-panel p-6 lg:p-8 rounded-2xl border border-slate-800/40 space-y-8">
            {/* Header info */}
            <div className="flex items-center justify-between border-b border-slate-850 pb-6 flex-wrap gap-4">
              <div>
                <h3 className="text-lg font-bold text-white">{selectedAdmin.full_name}</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Employee ID: <span className="text-slate-300 font-semibold">{selectedAdmin.employee_id || 'N/A'}</span> &bull; Username: <span className="text-slate-300 font-semibold">@{selectedAdmin.username}</span>
                </p>
              </div>
              <button
                onClick={handleSavePermissions}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:bg-emerald-500/50 disabled:cursor-not-allowed transition-all cursor-pointer shadow-lg shadow-emerald-400/5"
              >
                <Save className="w-4 h-4" />
                Save Permissions
              </button>
            </div>

            {/* 1. Branch & Location Matrix */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                1. Branch & Location Scope
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {dbBranches.map(branch => {
                  const isBranchChecked = permissions.branches.includes(branch);
                  const branchLocations = dbLocationsByBranch[branch] || [];
                  return (
                    <div key={branch} className="bg-slate-900/30 border border-slate-850 rounded-xl p-4 space-y-3">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isBranchChecked}
                          onChange={() => toggleBranch(branch)}
                          className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500/20 bg-slate-950 border-slate-800"
                        />
                        <span className="font-bold text-sm text-white">{branch}</span>
                      </label>
                      
                      <div className="pl-6 space-y-2 border-l border-slate-850/60">
                        {branchLocations.map(loc => {
                          const isLocChecked = permissions.locations.some(l => l.branch === branch && l.location === loc);
                          return (
                            <label key={loc} className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 hover:text-slate-200 select-none">
                              <input
                                type="checkbox"
                                checked={isLocChecked}
                                disabled={!isBranchChecked}
                                onChange={() => toggleLocation(branch, loc)}
                                className="w-3.5 h-3.5 rounded text-emerald-500 focus:ring-emerald-500/20 bg-slate-950 border-slate-800 disabled:opacity-30"
                              />
                              <span>{loc}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Department Assignments */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                2. Department Access
              </h4>
              <div className="bg-slate-900/20 border border-slate-850 rounded-xl p-4">
                {loadingDepts ? (
                  <p className="text-xs text-slate-500">Loading departments...</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {filteredDepartments.length > 0 ? (
                      filteredDepartments.map((dept) => {
                        const isChecked = permissions.departments.includes(dept.id);
                        return (
                          <label
                            key={dept.id}
                            className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all text-xs cursor-pointer select-none
                              ${isChecked 
                                ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400 font-semibold' 
                                : 'bg-slate-950 border-slate-850 text-slate-400 hover:border-slate-800 hover:text-slate-300'}
                            `}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleDepartment(dept.id)}
                              className="hidden"
                            />
                            {isChecked && <Check className="w-3.5 h-3.5" />}
                            <span className="truncate">{dept.name}</span>
                          </label>
                        );
                      })
                    ) : (
                      <p className="col-span-full text-xs text-slate-500 text-center py-4 font-semibold">
                        Please select a branch and location scope to configure Department Access.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 3. Module CRUD Access Matrix */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                3. Module CRUD Operations
              </h4>
              <div className="overflow-x-auto border border-slate-850 rounded-xl bg-slate-900/10">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900/40 border-b border-slate-850 text-slate-400 uppercase tracking-wider">
                      <th className="px-6 py-4">Module Name</th>
                      <th className="px-4 py-4 text-center">Read</th>
                      <th className="px-4 py-4 text-center">Create</th>
                      <th className="px-4 py-4 text-center">Update</th>
                      <th className="px-4 py-4 text-center">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/40">
                    {MODULES.map((m) => {
                      const modPerms = permissions.modules[m] || { read: false, create: false, update: false, delete: false };
                      return (
                        <tr key={m} className="hover:bg-slate-900/10 transition-colors">
                          <td className="px-6 py-4 font-bold text-white">{m}</td>
                          <td className="px-4 py-4 text-center">
                            <input
                              type="checkbox"
                              checked={!!modPerms.read}
                              onChange={() => handleModulePermissionChange(m, 'read')}
                              className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500/20 bg-slate-950 border-slate-800 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-4 text-center">
                            <input
                              type="checkbox"
                              checked={!!modPerms.create}
                              onChange={() => handleModulePermissionChange(m, 'create')}
                              className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500/20 bg-slate-950 border-slate-800 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-4 text-center">
                            <input
                              type="checkbox"
                              checked={!!modPerms.update}
                              onChange={() => handleModulePermissionChange(m, 'update')}
                              className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500/20 bg-slate-950 border-slate-800 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-4 text-center">
                            <input
                              type="checkbox"
                              checked={!!modPerms.delete}
                              onChange={() => handleModulePermissionChange(m, 'delete')}
                              className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500/20 bg-slate-950 border-slate-800 cursor-pointer"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-panel p-12 rounded-2xl border border-slate-800/40 text-center flex flex-col items-center justify-center space-y-4">
            <ShieldAlert className="w-10 h-10 text-slate-650" />
            <div>
              <h4 className="font-bold text-slate-300">No Profile Selected</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Search or select an administrator from the list to view and configure their security clearance and assignments.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminConfig;
