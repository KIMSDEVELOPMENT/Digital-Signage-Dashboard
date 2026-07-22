import React, { useState } from 'react';
import Modal from '../../../common/components/Modal';
import api from '../../../common/services/api';
import { toast } from 'react-hot-toast';

const ChangePasswordModal = ({ isOpen, onClose }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('All fields are required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }

    setLoading(true);
    const loadToast = toast.loading('Changing password...');
    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
      toast.success('Password changed successfully!', { id: loadToast });
      handleClose();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to change password.', { id: loadToast });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Change Password"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm bg-[#070b14] border border-slate-800/80 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none text-white placeholder-slate-600 transition-colors shadow-inner"
            placeholder="Enter current password"
          />
        </div>
        
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm bg-[#070b14] border border-slate-800/80 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none text-white placeholder-slate-600 transition-colors shadow-inner"
            placeholder="Enter new password"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm bg-[#070b14] border border-slate-800/80 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none text-white placeholder-slate-600 transition-colors shadow-inner"
            placeholder="Confirm new password"
          />
        </div>

        <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800/60 mt-4">
          <button
            type="button"
            onClick={handleClose}
            className="px-6 py-2.5 bg-transparent border border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold rounded-xl text-sm transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-bold rounded-xl text-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Changing...' : 'Change Password'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ChangePasswordModal;
