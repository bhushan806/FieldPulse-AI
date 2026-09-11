'use client';

import { useState } from 'react';
import { Users, Phone, Mail, Activity, HardHat, Plus, Trash2, X, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { useAuthStore } from '@/store/authStore';
import apiClient from '@/lib/apiClient';

interface TeamMember {
  name: string;
  phone: string;
  email?: string | null;
  role: string;
  status: string;
  captures: number;
  last_active?: string | null;
  user_id?: string | null;
}

function formatRelativeTime(isoString?: string | null): string {
  if (!isoString) return 'Never';
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return 'Just now';
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return 'Recently';
  }
}

export default function PMTeam() {
  const { selectedProjectId } = useAuthStore();
  const queryClient = useQueryClient();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addError, setAddError] = useState('');

  const { data: rosterData, isLoading, isError } = useQuery({
    queryKey: ['projectRoster', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return { engineers: [] };
      const res = await apiClient.get(`/api/projects/${selectedProjectId}/roster`);
      return res.data as { engineers: TeamMember[] };
    },
    enabled: !!selectedProjectId,
    refetchInterval: 15000,
  });

  const addMemberMutation = useMutation({
    mutationFn: async (data: { name: string; phone: string }) => {
      return apiClient.post(`/api/projects/${selectedProjectId}/engineers`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectRoster', selectedProjectId] });
      setIsAddOpen(false);
      setAddName('');
      setAddPhone('');
      setAddError('');
    },
    onError: (err: any) => {
      setAddError(err.response?.data?.detail || err.message || 'Failed to add team member');
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (phone: string) => {
      return apiClient.delete(`/api/projects/${selectedProjectId}/roster/${encodeURIComponent(phone)}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectRoster', selectedProjectId] });
    },
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim() || !addPhone.trim()) {
      setAddError('Name and phone number are required.');
      return;
    }
    setAddError('');
    addMemberMutation.mutate({ name: addName.trim(), phone: addPhone.trim() });
  };

  const handleRemove = (phone: string, name: string) => {
    if (confirm(`Are you sure you want to remove ${name} (${phone}) from this project roster?`)) {
      removeMemberMutation.mutate(phone);
    }
  };

  if (!selectedProjectId) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12 text-center animate-in">
        <AlertTriangle className="w-12 h-12 text-warning mb-4" />
        <h2 className="text-xl font-bold text-text-primary">No Project Selected</h2>
        <p className="text-text-secondary mt-2">Please select a project from the sidebar to view the field team.</p>
      </div>
    );
  }

  const teamMembers = rosterData?.engineers || [];

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <PageHeader 
          title="Field Team" 
          subtitle="Manage site engineers, inspectors, and field staff assigned to this project."
        />
        <button 
          onClick={() => setIsAddOpen(true)}
          className="btn-primary py-2.5 px-5 text-sm shadow-sm flex items-center gap-2 flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Member
        </button>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-text-muted">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-3" />
          <p className="text-sm font-semibold text-text-secondary">Loading project roster...</p>
        </div>
      ) : isError ? (
        <div className="card p-12 text-center text-danger">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3" />
          <p className="font-bold">Failed to load project team.</p>
        </div>
      ) : teamMembers.length === 0 ? (
        <div className="card p-12 text-center flex flex-col items-center justify-center border-dashed border-2">
          <Users className="w-12 h-12 text-text-muted mb-4" />
          <h3 className="text-lg font-bold text-text-primary mb-1">No Team Members Assigned</h3>
          <p className="text-sm text-text-secondary max-w-md mb-6">
            Site engineers added to the roster will be able to submit field evidence, capture photo/video progress, and view assigned activities.
          </p>
          <button 
            onClick={() => setIsAddOpen(true)}
            className="btn-primary py-2 px-4 text-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add First Team Member
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {teamMembers.map((member, idx) => {
            const isActive = member.status?.toLowerCase() === 'active';
            return (
              <div 
                key={member.phone || idx} 
                className="card p-6 flex flex-col items-center text-center relative group hover:border-brand-500 hover:shadow-md transition-all"
              >
                {/* Status indicator */}
                <div 
                  title={member.status}
                  className={`absolute top-4 right-4 w-3 h-3 rounded-full border-2 border-white shadow-sm ${
                    isActive ? 'bg-success animate-pulse' : 'bg-amber-400'
                  }`} 
                />
                
                {/* Avatar with initial */}
                <div className="w-20 h-20 rounded-full bg-brand-50 border-2 border-brand-100 flex items-center justify-center mb-4 text-brand-600 font-bold text-3xl group-hover:bg-brand-100 transition-colors">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                
                <h3 className="text-lg font-bold text-text-primary mb-1">{member.name}</h3>
                
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs font-semibold text-brand-600 flex items-center gap-1 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-100">
                    <HardHat className="w-3.5 h-3.5" />
                    {member.role || 'Site Engineer'}
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                    isActive ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {member.status}
                  </span>
                </div>
                
                {/* Stats */}
                <div className="w-full flex justify-between items-center px-4 py-3 bg-bg-muted rounded-xl border border-border mb-5">
                  <div className="flex flex-col text-left">
                    <span className="text-text-muted text-[10px] uppercase tracking-wider font-bold mb-0.5">Captures</span>
                    <span className="text-text-primary font-bold flex items-center gap-1">
                      <Activity className="w-3.5 h-3.5 text-brand-500" /> {member.captures ?? 0}
                    </span>
                  </div>
                  <div className="w-px h-8 bg-border-strong" />
                  <div className="flex flex-col items-end text-right">
                    <span className="text-text-muted text-[10px] uppercase tracking-wider font-bold mb-0.5">Last Active</span>
                    <span className="text-text-primary font-bold text-xs">{formatRelativeTime(member.last_active)}</span>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex w-full gap-2 mt-auto">
                  <a 
                    href={`tel:${member.phone}`}
                    className="flex-1 py-2.5 rounded-lg bg-white border border-border hover:bg-bg-muted hover:border-border-strong text-text-secondary transition-colors flex items-center justify-center gap-2 text-xs font-semibold shadow-sm"
                  >
                    <Phone className="w-3.5 h-3.5" /> Call
                  </a>
                  {member.email ? (
                    <a 
                      href={`mailto:${member.email}`}
                      className="flex-1 py-2.5 rounded-lg bg-white border border-border hover:bg-bg-muted hover:border-border-strong text-text-secondary transition-colors flex items-center justify-center gap-2 text-xs font-semibold shadow-sm"
                    >
                      <Mail className="w-3.5 h-3.5" /> Email
                    </a>
                  ) : (
                    <button 
                      onClick={() => handleRemove(member.phone, member.name)}
                      title="Remove engineer"
                      className="p-2.5 rounded-lg border border-border hover:bg-danger-bg hover:text-danger hover:border-danger/30 text-text-muted transition-colors flex items-center justify-center shadow-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Member Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-border relative">
            <button 
              onClick={() => setIsAddOpen(false)}
              className="absolute top-4 right-4 text-text-muted hover:text-text-primary"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-text-primary mb-1">Add Field Engineer</h3>
            <p className="text-xs text-text-secondary mb-5">
              Add a site engineer by their mobile number. They will be granted access to capture field evidence for this project.
            </p>

            {addError && (
              <div className="mb-4 p-3 bg-danger-bg border border-danger/20 text-danger text-xs rounded-lg">
                {addError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. Ramesh Verma" 
                  required
                  className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Phone Number (with country code)</label>
                <input 
                  type="text" 
                  value={addPhone}
                  onChange={(e) => setAddPhone(e.target.value)}
                  placeholder="+91 98765 43210" 
                  required
                  className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none shadow-sm font-mono"
                />
                <p className="text-[11px] text-text-muted mt-1">Must include country code (e.g. +91).</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 py-2.5 rounded-lg border border-border hover:bg-bg-muted text-text-secondary text-sm font-semibold"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={addMemberMutation.isPending}
                  className="flex-1 btn-primary py-2.5 text-sm flex items-center justify-center gap-2"
                >
                  {addMemberMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Add Engineer'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
