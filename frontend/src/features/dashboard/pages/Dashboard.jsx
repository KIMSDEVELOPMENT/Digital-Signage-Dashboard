import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../app/context/AuthContext';
import api from '../../../common/services/api';
import { 
  Users, 
  Building2, 
  ShieldAlert, 
  CalendarDays, 
  ArrowRight,
  TrendingUp,
  MapPin,
  Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { StatsSkeleton } from '../../../common/components/Skeleton';
import { toast } from 'react-hot-toast';

const Dashboard = () => {
  const { user, hasPermission } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    doctorsCount: 0,
    departmentsCount: 0,
    adminsCount: 0,
    rosterCount: 0,
  });
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Parallel API calls with permission checks
        const doctorsPromise = hasPermission('Doctor', 'read') ? api.get('/doctors') : Promise.resolve({ data: [] });
        const deptsPromise = hasPermission('Department', 'read') ? api.get('/departments') : Promise.resolve({ data: [] });
        
        let adminsPromise = Promise.resolve({ data: [] });
        if (user.role === 'super_admin') {
          adminsPromise = api.get('/admins');
        }

        // Roster call
        let rosterPromise = Promise.resolve({ data: [] });
        if (hasPermission('Duty Roster', 'read')) {
          if (user.role === 'super_admin') {
            rosterPromise = api.get('/roster/today?branch=PBMH&location=A Block').catch(() => ({ data: [] }));
          } else {
            // Normal admin: if they have assigned locations, query the first one
            const assignedLocs = user.permissions?.locations || [];
            if (assignedLocs.length > 0) {
              const firstLoc = assignedLocs[0];
              rosterPromise = api.get(`/roster/today?branch=${encodeURIComponent(firstLoc.branch)}&location=${encodeURIComponent(firstLoc.location)}`).catch(() => ({ data: [] }));
            }
          }
        }

        const [doctorsRes, deptsRes, adminsRes, rosterRes] = await Promise.all([
          doctorsPromise,
          deptsPromise,
          adminsPromise,
          rosterPromise
        ]);

        const doctors = doctorsRes.data;
        const depts = deptsRes.data;
        const admins = adminsRes.data;
        const roster = rosterRes.data;

        setStats({
          doctorsCount: doctors.length,
          departmentsCount: depts.length,
          adminsCount: admins.length,
          rosterCount: roster.length,
        });

        // Compute chart data (Doctors per Department)
        const deptCounts = {};
        doctors.forEach((doc) => {
          const name = doc.department_name || 'Unassigned';
          deptCounts[name] = (deptCounts[name] || 0) + 1;
        });

        const formattedChartData = Object.entries(deptCounts).map(([name, count]) => ({
          name,
          doctors: count,
        })).slice(0, 6); // Limit to top 6

        setChartData(formattedChartData);
      } catch (err) {
        console.error('Error fetching dashboard statistics:', err);
        toast.error('Failed to load dashboard metrics.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  if (loading) {
    return <StatsSkeleton />;
  }

  const statCards = [
    ...(hasPermission('Doctor', 'read') ? [{
      title: 'Total Doctors',
      value: stats.doctorsCount,
      description: user.role === 'super_admin' ? 'Registered hospital-wide' : 'Assigned scope',
      icon: Users,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      path: '/doctors'
    }] : []),
    ...(hasPermission('Department', 'read') ? [{
      title: 'Departments',
      value: stats.departmentsCount,
      description: 'Clinical specializations',
      icon: Building2,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      path: '/departments'
    }] : []),
    ...(user.role === 'super_admin' ? [{
      title: 'Admin Users',
      value: stats.adminsCount,
      description: 'Regional normal admins',
      icon: ShieldAlert,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      path: '/admins'
    }] : []),
    ...(hasPermission('Duty Roster', 'read') ? [{
      title: 'Duty Roster',
      value: stats.rosterCount,
      description: user.role === 'super_admin' ? 'Scheduled today (PBMH-A)' : 'Scheduled in default area',
      icon: CalendarDays,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      path: '/roster'
    }] : [])
  ];

  const getAdminAssignmentDesc = () => {
    if (user.role === 'super_admin') {
      return 'Manage and coordinate clinicians, operational branches, regional administrators, and schedule display signage boards.';
    }
    const branches = user.permissions?.branches || [];
    if (branches.length > 0) {
      return `Operational access for branches: ${branches.join(', ')}`;
    }
    return 'Normal admin operational dashboard.';
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="relative glass-card p-6 md:p-8 rounded-3xl overflow-hidden border border-slate-800/40">
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold tracking-wider">
              <Sparkles className="w-4 h-4" />
              SYSTEM ACTIVE
            </div>
            <h1 className="text-2xl md:text-3xl font-heading font-extrabold text-white">
              Hello, {user.full_name || user.username}
            </h1>
            <p className="text-sm text-slate-400 max-w-xl">
              {getAdminAssignmentDesc()}
            </p>
          </div>
          {user.role === 'normal_admin' && user.permissions?.locations?.length > 0 && (
            <div className="flex flex-col gap-1 items-end self-start md:self-auto">
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-sm">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span>Primary: {user.permissions.locations[0].branch} / {user.permissions.locations[0].location}</span>
              </div>
              {user.permissions.locations.length > 1 && (
                <span className="text-[10px] text-emerald-500 font-semibold font-mono">
                  + {user.permissions.locations.length - 1} more assigned areas
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Grid of stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          const CardContent = (
            <div className={`p-6 rounded-2xl glass-panel-light border transition-all duration-300 hover:scale-[1.02] flex flex-col h-full justify-between ${card.color.split(' ')[2]}`}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">{card.title}</span>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${card.color.split(' ')[0]} ${card.color.split(' ')[1]} ${card.color.split(' ')[2]}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div>
                <span className="text-3xl font-heading font-bold text-white tracking-tight">{card.value}</span>
                <p className="text-xs text-slate-500 mt-1 font-medium">{card.description}</p>
              </div>
            </div>
          );

          return card.path ? (
            <Link key={idx} to={card.path} className="block h-full">
              {CardContent}
            </Link>
          ) : (
            <div key={idx} className="block h-full">
              {CardContent}
            </div>
          );
        })}
      </div>

      {/* Roster & Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart Column */}
        {hasPermission('Doctor', 'read') && (
          <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-800/40 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/30 pb-3">
              <div>
                <h3 className="font-heading font-semibold text-white">Doctors Distribution</h3>
                <p className="text-xs text-slate-500">Breakdown of active clinicians by clinical division</p>
              </div>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>

            <div className="h-64 w-full text-xs">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorDocs" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                    <XAxis dataKey="name" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0f172a', 
                        borderColor: 'rgba(255,255,255,0.08)',
                        borderRadius: '12px',
                        color: '#f3f4f6'
                      }} 
                    />
                    <Area type="monotone" dataKey="doctors" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorDocs)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 font-medium">
                  No doctor data available to map.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quick Links Column */}
        <div className={`${hasPermission('Doctor', 'read') ? 'lg:col-span-1' : 'lg:col-span-3'} glass-panel p-6 rounded-2xl border border-slate-800/40 flex flex-col justify-between`}>
          <div className="space-y-4">
            <h3 className="font-heading font-semibold text-white border-b border-slate-800/30 pb-3">Quick Navigation</h3>
            <div className="space-y-3">
              {user.role === 'super_admin' && (
                <>
                  <Link 
                    to="/departments" 
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800/40 hover:bg-slate-900 hover:border-slate-800 text-sm font-medium transition-colors"
                  >
                    Manage Departments
                    <ArrowRight className="w-4 h-4 text-emerald-400" />
                  </Link>
                  <Link 
                    to="/admins" 
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800/40 hover:bg-slate-900 hover:border-slate-800 text-sm font-medium transition-colors"
                  >
                    Manage Normal Admins
                    <ArrowRight className="w-4 h-4 text-emerald-400" />
                  </Link>
                  <Link 
                    to="/admin-config" 
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800/40 hover:bg-slate-900 hover:border-slate-800 text-sm font-medium transition-colors"
                  >
                    Admin Permissions Matrix
                    <ArrowRight className="w-4 h-4 text-emerald-400" />
                  </Link>
                </>
              )}
              {hasPermission('Doctor', 'read') && (
                <Link 
                  to="/doctors" 
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800/40 hover:bg-slate-900 hover:border-slate-800 text-sm font-medium transition-colors"
                >
                  Browse Doctors Directory
                  <ArrowRight className="w-4 h-4 text-emerald-400" />
                </Link>
              )}
              {hasPermission('Duty Roster', 'read') && (
                <Link 
                  to="/roster" 
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800/40 hover:bg-slate-900 hover:border-slate-800 text-sm font-medium transition-colors"
                >
                  Schedule Duty Roster
                  <ArrowRight className="w-4 h-4 text-emerald-400" />
                </Link>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/30">
            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-xs text-emerald-400/90 font-medium">
              Digital Signage screens synchronize updates instantly every time uploader uploads or adjusts doctor directories.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
