import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Users, Clock, Mail, Shield, ShieldAlert, Circle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../lib/utils';

interface AdminDashboardProps {
  currentUser: UserProfile;
}

export default function AdminDashboard({ currentUser }: AdminDashboardProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser.role !== 'admin') return;

    const q = query(collection(db, 'users'), orderBy('lastActive', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => doc.data() as UserProfile);
      setUsers(usersData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  if (currentUser.role !== 'admin') {
    return (
      <div className="p-12 text-center cyber-card border-cyberse-link/30 bg-cyberse-link/5">
        <ShieldAlert className="w-16 h-16 text-cyberse-link mx-auto mb-4 drop-shadow-[0_0_10px_rgba(255,77,0,0.5)]" />
        <h2 className="text-2xl font-black text-cyberse-text tracking-widest uppercase">Access Denied</h2>
        <p className="text-cyberse-muted mt-2 uppercase text-xs tracking-widest">Unauthorized terminal access detected.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="cyber-card p-8 group">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-cyberse-glow/10 flex items-center justify-center border border-cyberse-glow/20 group-hover:shadow-[0_0_15px_rgba(0,242,255,0.3)] transition-all">
              <Users className="w-6 h-6 text-cyberse-glow" />
            </div>
            <div>
              <p className="text-[10px] font-black text-cyberse-muted uppercase tracking-widest">Total Nodes</p>
              <p className="text-3xl font-black text-cyberse-text tracking-tight">{users.length}</p>
            </div>
          </div>
        </div>

        <div className="cyber-card p-8 group">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-all">
              <Circle className="w-6 h-6 text-emerald-500 fill-emerald-500" />
            </div>
            <div>
              <p className="text-[10px] font-black text-cyberse-muted uppercase tracking-widest">Active Links</p>
              <p className="text-3xl font-black text-cyberse-text tracking-tight">
                {users.filter(u => u.lastActive && (new Date().getTime() - new Date(u.lastActive).getTime() < 5 * 60 * 1000)).length}
              </p>
            </div>
          </div>
        </div>

        <div className="cyber-card p-8 group">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-cyberse-purple/10 flex items-center justify-center border border-cyberse-purple/20 group-hover:shadow-[0_0_15px_rgba(157,78,221,0.3)] transition-all">
              <Shield className="w-6 h-6 text-cyberse-purple" />
            </div>
            <div>
              <p className="text-[10px] font-black text-cyberse-muted uppercase tracking-widest">SysAdmins</p>
              <p className="text-3xl font-black text-cyberse-text tracking-tight">
                {users.filter(u => u.role === 'admin').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="cyber-card overflow-hidden">
        <div className="px-8 py-6 border-b border-cyberse-glow/10 bg-cyberse-darker/30">
          <h3 className="text-sm font-black text-cyberse-glow uppercase tracking-[0.2em]">Registered Protocols</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-black text-cyberse-muted uppercase tracking-[0.2em] border-b border-cyberse-glow/10">
                <th className="px-8 py-4">Identity</th>
                <th className="px-8 py-4">Comm Link</th>
                <th className="px-8 py-4">Clearance</th>
                <th className="px-8 py-4">Last Pulse</th>
                <th className="px-8 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyberse-glow/5">
              {users.map((user) => {
                const isActive = user.lastActive && (new Date().getTime() - new Date(user.lastActive).getTime() < 5 * 60 * 1000);
                
                return (
                  <tr key={user.uid} className="group hover:bg-cyberse-glow/5 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-cyberse-darker border border-cyberse-glow/20 shadow-sm overflow-hidden flex-shrink-0">
                          {user.photoURL ? (
                            <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-cyberse-muted font-bold">
                              {user.displayName?.[0] || 'U'}
                            </div>
                          )}
                        </div>
                        <span className="font-bold text-cyberse-text tracking-wide uppercase text-xs">{user.displayName}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-cyberse-muted">
                        <Mail className="w-4 h-4" />
                        <span className="text-xs font-mono">{user.email}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={cn(
                        "px-3 py-1 rounded-sm text-[8px] font-black uppercase tracking-widest border",
                        user.role === 'admin' ? "bg-cyberse-glow/10 text-cyberse-glow border-cyberse-glow/20" : "bg-cyberse-darker text-cyberse-muted border-cyberse-muted/20"
                      )}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-cyberse-muted">
                        <Clock className="w-4 h-4" />
                        <span className="text-[10px] uppercase tracking-tighter">
                          {user.lastActive ? formatDistanceToNow(new Date(user.lastActive), { addSuffix: true }) : 'Never'}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          isActive ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-cyberse-muted/30"
                        )} />
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-widest",
                          isActive ? "text-emerald-500" : "text-cyberse-muted"
                        )}>
                          {isActive ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
