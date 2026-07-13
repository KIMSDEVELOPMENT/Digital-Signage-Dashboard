import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../app/context/AuthContext';
import { toast } from 'react-hot-toast';
import { User, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import logoImg from '../../../common/assets/kims-logo.png';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      username: '',
      password: '',
    }
  });

  const onSubmit = async (data) => {
    setSubmitting(true);
    const loadingToast = toast.loading('Authenticating credentials...');
    try {
      await login(data.username, data.password);
      toast.success('Access granted. Redirecting...', { id: loadingToast });
      navigate('/');
    } catch (err) {
      toast.error(err, { id: loadingToast });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 relative overflow-hidden font-sans">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md animate-slide-up z-10">
        <div className="glass-card p-8 md:p-10 rounded-3xl border border-slate-800/40 relative">
          
          {/* Logo and Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-24 h-24 rounded-2xl bg-slate-900/60 border border-slate-850 p-2 flex items-center justify-center shadow-inner mb-4">
              <img 
                src={logoImg} 
                alt="KIMS Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <h2 className="text-2xl md:text-3xl font-heading font-extrabold tracking-tight text-white">
              Kalinga Institute <br/>
              <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                of Medical Sciences
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-medium tracking-wide mt-2">
              DIGITAL SIGNAGE MANAGEMENT SYSTEM
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 tracking-wider">USERNAME</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Enter username"
                  {...register('username', { required: 'Username is required' })}
                  className={`
                    w-full pl-10 pr-4 py-3 rounded-xl text-sm transition-all bg-slate-900/80 border text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2
                    ${errors.username 
                      ? 'border-rose-500/50 focus:ring-rose-500/20' 
                      : 'border-slate-800 focus:border-emerald-500/60 focus:ring-emerald-500/20'}
                  `}
                />
              </div>
              {errors.username && (
                <p className="text-xs font-medium text-rose-400 pt-1">{errors.username.message}</p>
              )}
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 tracking-wider">PASSWORD</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  {...register('password', { required: 'Password is required' })}
                  className={`
                    w-full pl-10 pr-10 py-3 rounded-xl text-sm transition-all bg-slate-900/80 border text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2
                    ${errors.password 
                      ? 'border-rose-500/50 focus:ring-rose-500/20' 
                      : 'border-slate-800 focus:border-emerald-500/60 focus:ring-emerald-500/20'}
                  `}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs font-medium text-rose-400 pt-1">{errors.password.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:bg-emerald-500/50 disabled:text-slate-900/40 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer shadow-lg shadow-emerald-400/10 hover:shadow-emerald-400/20"
            >
              Sign In
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
