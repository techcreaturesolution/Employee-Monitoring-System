import React, { useEffect, useState } from 'react';
import { permissionsAPI } from '../services/api';
import { Shield, Save, Check } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const ROLES = [
  { id: 'company_admin', label: 'Company Admin' },
  { id: 'manager', label: 'Manager' },
  { id: 'hr', label: 'HR' },
  { id: 'employee', label: 'Employee' }
];

const MODULES = [
  'attendance',
  'screenshots',
  'leaves',
  'tasks',
  'projects',
  'reports',
  'employees',
  'departments',
  'wfh',
  'settings'
];

const AVAILABLE_ACTIONS = ['create', 'read', 'update', 'delete', 'approve'];

export default function Permissions() {
  const [selectedRole, setSelectedRole] = useState('manager');
  const [permissionsMap, setPermissionsMap] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const res = await permissionsAPI.get();
      // Map it: module_role -> string[]
      const map: Record<string, string[]> = {};
      const list = res.data.data || [];
      list.forEach((p: any) => {
        map[`${p.module}_${p.role}`] = p.actions;
      });
      setPermissionsMap(map);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  const handleToggleAction = (moduleName: string, actionName: string) => {
    if (selectedRole === 'super_admin') return;
    
    setPermissionsMap(prev => {
      const key = `${moduleName}_${selectedRole}`;
      const currentActions = prev[key] || [];
      
      const newActions = currentActions.includes(actionName)
        ? currentActions.filter(a => a !== actionName)
        : [...currentActions, actionName];
      
      return { ...prev, [key]: newActions };
    });
  };

  const handleSave = async (moduleName: string) => {
    try {
      const actions = permissionsMap[`${moduleName}_${selectedRole}`] || [];
      await permissionsAPI.update({
        role: selectedRole,
        module: moduleName,
        actions
      });
      toast.success(`Updated ${moduleName} permissions for ${selectedRole}`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to update permissions');
    }
  };

  const handleSaveAll = async () => {
    try {
      // Create promises for all modules for this role
      const promises = MODULES.map(moduleName => {
        const actions = permissionsMap[`${moduleName}_${selectedRole}`] || [];
        return permissionsAPI.update({
          role: selectedRole,
          module: moduleName,
          actions
        });
      });
      
      await Promise.all(promises);
      toast.success(`All permissions saved for ${selectedRole}`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to save some permissions');
    }
  };

  return (
    <div className="bg-[#0d1117] min-h-full text-white pb-12">
      <Toaster position="top-right" />
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-500" /> Custom Permissions
          </h1>
          <p className="text-slate-400 text-sm mt-1">Manage granular access controls for different roles within your company.</p>
        </div>
        <button
          onClick={handleSaveAll}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-900/20"
        >
          <Save className="w-4 h-4" /> Save Changes for Role
        </button>
      </div>

      <div className="flex border-b border-[#30363d] mb-6 overflow-x-auto custom-scrollbar">
        {ROLES.map(role => (
          <button
            key={role.id}
            onClick={() => setSelectedRole(role.id)}
            className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
              selectedRole === role.id
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-[#30363d]'
            }`}
          >
            {role.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : (
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#21262d] text-slate-300 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4 w-48">Module</th>
                  <th className="px-6 py-4">Actions Allowed</th>
                  <th className="px-6 py-4 w-32 text-right">Quick Save</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363d]">
                {MODULES.map(mod => {
                  const currentActions = permissionsMap[`${mod}_${selectedRole}`] || [];
                  
                  return (
                    <tr key={mod} className="hover:bg-[#21262d]/50 transition-colors group">
                      <td className="px-6 py-4 font-medium text-slate-200 capitalize">
                        {mod}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-4">
                          {AVAILABLE_ACTIONS.map(action => {
                            const isChecked = currentActions.includes(action);
                            return (
                              <label key={action} className="flex items-center gap-2 cursor-pointer group/cb">
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                                  isChecked 
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-900/50' 
                                    : 'bg-[#0d1117] border-[#30363d] group-hover/cb:border-slate-500'
                                }`}>
                                  {isChecked && <Check className="w-3.5 h-3.5" />}
                                </div>
                                <input
                                  type="checkbox"
                                  className="hidden"
                                  checked={isChecked}
                                  onChange={() => handleToggleAction(mod, action)}
                                  disabled={selectedRole === 'company_admin'} // typically company admin has full access by default, but keeping it editable is also fine. Let's allow edit.
                                />
                                <span className={`capitalize text-sm select-none ${isChecked ? 'text-slate-200 font-medium' : 'text-slate-500'}`}>
                                  {action}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleSave(mod)}
                          className="opacity-0 group-hover:opacity-100 px-3 py-1.5 bg-[#21262d] hover:bg-indigo-600 border border-[#30363d] hover:border-indigo-600 text-slate-400 hover:text-white rounded text-xs transition-all"
                        >
                          Save row
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {selectedRole === 'company_admin' && (
        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-xs text-blue-400">
            <strong>Note:</strong> Company Admins implicitly have full access to most resources regardless of custom mappings here, but you can explicitly define default configurations above.
          </p>
        </div>
      )}
    </div>
  );
}
