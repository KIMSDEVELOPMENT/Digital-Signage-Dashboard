import userRepository from '../repositories/UserRepository.js';

/**
 * Checks if a normal_admin has permission to perform a specific action on a module.
 * Super admins bypass all permission checks.
 *
 * @param {string} moduleName - The module to check (e.g., 'Doctor', 'Department', 'Duty Roster')
 * @param {string} action - 'read' | 'create' | 'update' | 'delete'
 */
export function checkModulePermission(moduleName, action) {
  return async (req, res, next) => {
    if (req.user && req.user.role === 'super_admin') {
      return next();
    }

    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized. Please log in.' });
    }

    const validActions = ['read', 'create', 'update', 'delete'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ message: 'Invalid permission action.' });
    }

    try {
      const hasPermission = await userRepository.getModulePermission(req.user.id, moduleName, action);

      if (!hasPermission) {
        return res.status(403).json({
          message: `Access denied. You do not have ${action} permission for the ${moduleName} module.`,
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ message: 'Internal server error during permission check.' });
    }
  };
}

/**
 * Fetches the complete permission profile for a user.
 * Used to attach permissions to the JWT response and the /auth/me endpoint.
 */
export async function getUserPermissions(userId, role) {
  if (role === 'super_admin') {
    return { branches: null, locations: null, departments: null, modules: null };
  }

  const [branches, locations, departments, modules] = await Promise.all([
    userRepository.getUserBranches(userId),
    userRepository.getUserLocations(userId),
    userRepository.getUserDepartments(userId),
    userRepository.getUserModules(userId),
  ]);

  const moduleMap = {};
  modules.forEach((m) => {
    moduleMap[m.module_name] = {
      read: !!m.can_read,
      create: !!m.can_create,
      update: !!m.can_update,
      delete: !!m.can_delete,
    };
  });

  return {
    branches,
    locations,
    departments: departments.map((d) => ({ id: d.department_id, name: d.department_name })),
    modules: moduleMap,
  };
}
