import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../../common/services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/auth/me')
        .then((res) => {
          setUser(res.data.user);
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    try {
      const response = await api.post('/auth/login', { username, password });
      const { token, user: loggedUser } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(loggedUser));
      setUser(loggedUser);
      return loggedUser;
    } catch (error) {
      throw error.response?.data?.message || 'Login failed. Please try again.';
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/login';
  };

  /**
   * Check if the current user has permission for a module action.
   * Super admins always return true. Normal admins check their permissions object.
   * @param {string} moduleName - e.g., 'Department', 'Doctor', 'Duty Roster', 'Display Screen'
   * @param {string} action - 'read' | 'create' | 'update' | 'delete'
   */
  const hasPermission = (moduleName, action) => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    if (!user.permissions || !user.permissions.modules) return false;
    const mod = user.permissions.modules[moduleName];
    if (!mod) return false;
    return !!mod[action];
  };

  /**
   * Get the user's assigned branches array (null means all for super_admin).
   */
  const getAssignedBranches = () => {
    if (!user) return [];
    if (user.role === 'super_admin') return null; // null = all
    return user.permissions?.branches || [];
  };

  /**
   * Get the user's assigned locations array (null means all for super_admin).
   */
  const getAssignedLocations = () => {
    if (!user) return [];
    if (user.role === 'super_admin') return null;
    return user.permissions?.locations || [];
  };

  /**
   * Get the user's assigned departments array (null means all for super_admin).
   */
  const getAssignedDepartments = () => {
    if (!user) return [];
    if (user.role === 'super_admin') return null;
    return user.permissions?.departments || [];
  };

  return (
    <AuthContext.Provider value={{ 
      user, loading, login, logout, 
      hasPermission, getAssignedBranches, getAssignedLocations, getAssignedDepartments 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
