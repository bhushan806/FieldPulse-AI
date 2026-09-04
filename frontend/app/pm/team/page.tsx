'use client';

import { Users, Phone, Mail, Activity, HardHat } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';

export default function PMTeam() {
  const teamMembers = [
    { id: 1, name: 'Rahul Sharma', role: 'Site Engineer', status: 'Active', captures: 14, lastActive: '10m ago' },
    { id: 2, name: 'Amit Kumar', role: 'Quality Inspector', status: 'Offline', captures: 8, lastActive: '2h ago' },
    { id: 3, name: 'Priya Patel', role: 'Site Engineer', status: 'Active', captures: 22, lastActive: 'Just now' },
  ];

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <PageHeader 
          title="Field Team" 
          subtitle="Manage engineers and field staff."
        />
        <button className="btn-primary py-2.5 px-5 text-sm shadow-sm flex-shrink-0">
          Add Member
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {teamMembers.map((member) => (
          <div key={member.id} className="card p-6 flex flex-col items-center text-center relative group hover:border-brand-500 hover:shadow-md transition-all cursor-pointer">
            {/* Status indicator */}
            <div className={`absolute top-4 right-4 w-3 h-3 rounded-full border-2 border-white shadow-sm ${member.status === 'Active' ? 'bg-success animate-pulse' : 'bg-text-muted'}`} />
            
            <div className="w-20 h-20 rounded-full bg-brand-50 border-2 border-brand-100 flex items-center justify-center mb-4 text-brand-600 font-bold text-3xl group-hover:bg-brand-100 transition-colors">
              {member.name.charAt(0)}
            </div>
            
            <h3 className="text-lg font-bold text-text-primary mb-1">{member.name}</h3>
            <p className="text-sm font-semibold text-brand-600 flex items-center justify-center gap-1 mb-4 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-100">
              <HardHat className="w-4 h-4" />
              {member.role}
            </p>
            
            <div className="w-full flex justify-between items-center px-4 py-3 bg-bg-muted rounded-xl border border-border mb-5">
              <div className="flex flex-col">
                <span className="text-text-muted text-[10px] uppercase tracking-wider font-bold mb-0.5">Captures</span>
                <span className="text-text-primary font-bold flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-brand-500" /> {member.captures}
                </span>
              </div>
              <div className="w-px h-8 bg-border-strong"></div>
              <div className="flex flex-col items-end">
                <span className="text-text-muted text-[10px] uppercase tracking-wider font-bold mb-0.5">Last Active</span>
                <span className="text-text-primary font-bold">{member.lastActive}</span>
              </div>
            </div>
            
            <div className="flex w-full gap-3 mt-auto">
              <button className="flex-1 py-2.5 rounded-lg bg-white border border-border hover:bg-bg-muted hover:border-border-strong text-text-secondary transition-colors flex items-center justify-center gap-2 text-sm font-semibold shadow-sm">
                <Phone className="w-4 h-4" /> Call
              </button>
              <button className="flex-1 py-2.5 rounded-lg bg-white border border-border hover:bg-bg-muted hover:border-border-strong text-text-secondary transition-colors flex items-center justify-center gap-2 text-sm font-semibold shadow-sm">
                <Mail className="w-4 h-4" /> Email
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
