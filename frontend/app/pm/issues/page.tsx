'use client';

import { useState } from 'react';
import { 
  AlertCircle, 
  Plus, 
  Search, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  Calendar, 
  Tag, 
  Loader2, 
  AlertTriangle,
  X,
  ArrowRight,
  HardHat
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { useAuthStore } from '@/store/authStore';
import apiClient from '@/lib/apiClient';

interface Issue {
  id: string;
  projectId: string;
  activityId?: string | null;
  createdBy: string;
  assignedTo?: string | null;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved';
  evidenceCaptureIds: string[];
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
}

export default function PMIssuesPage() {
  const { selectedProjectId } = useAuthStore();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formSeverity, setFormSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [formActivityId, setFormActivityId] = useState('');
  const [formAssignee, setFormAssignee] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formError, setFormError] = useState('');

  // 1. Fetch Issues
  const { data: issuesData, isLoading, isError } = useQuery({
    queryKey: ['projectIssues', selectedProjectId, statusFilter],
    queryFn: async () => {
      if (!selectedProjectId) return { items: [], total: 0 };
      const qs = new URLSearchParams();
      qs.set('project_id', selectedProjectId);
      if (statusFilter !== 'all') {
        qs.set('status_filter', statusFilter);
      }
      const res = await apiClient.get(`/api/issues/?${qs.toString()}`);
      return res.data as { items: Issue[]; total: number };
    },
    enabled: !!selectedProjectId,
    refetchInterval: 15000,
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.post('/api/issues/', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectIssues', selectedProjectId] });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.detail || err.message || 'Failed to create issue');
    },
  });

  // Update Status Mutation
  const updateMutation = useMutation({
    mutationFn: async ({ issueId, updates }: { issueId: string; updates: any }) => {
      return apiClient.patch(`/api/issues/${issueId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectIssues', selectedProjectId] });
      if (selectedIssue) {
        setSelectedIssue(null);
      }
    },
  });

  const resetForm = () => {
    setFormTitle('');
    setFormDesc('');
    setFormSeverity('medium');
    setFormActivityId('');
    setFormAssignee('');
    setFormDueDate('');
    setFormError('');
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDesc.trim()) {
      setFormError('Title and description are required.');
      return;
    }
    setFormError('');

    const payload: any = {
      projectId: selectedProjectId,
      title: formTitle.trim(),
      description: formDesc.trim(),
      severity: formSeverity,
    };
    if (formActivityId) payload.activityId = formActivityId;
    if (formAssignee) payload.assignedTo = formAssignee;
    if (formDueDate) payload.dueDate = new Date(formDueDate).toISOString();

    createMutation.mutate(payload);
  };

  const issues = issuesData?.items || [];

  // Filter by search & severity
  const filteredIssues = issues.filter((issue) => {
    if (severityFilter !== 'all' && issue.severity !== severityFilter) {
      return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchTitle = issue.title.toLowerCase().includes(q);
      const matchDesc = issue.description.toLowerCase().includes(q);
      const matchAssignee = (issue.assignedTo || '').toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchAssignee) return false;
    }
    return true;
  });

  // Statistics
  const openCount = issues.filter(i => i.status === 'open').length;
  const inProgressCount = issues.filter(i => i.status === 'in_progress').length;
  const resolvedCount = issues.filter(i => i.status === 'resolved').length;
  const criticalCount = issues.filter(i => i.severity === 'critical' && i.status !== 'resolved').length;

  if (!selectedProjectId) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12 text-center animate-in">
        <AlertTriangle className="w-12 h-12 text-warning mb-4" />
        <h2 className="text-xl font-bold text-text-primary">No Project Selected</h2>
        <p className="text-text-secondary mt-2">Please select a project from the header or sidebar to manage issues.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <PageHeader 
          title="Field Issues & Actions" 
          subtitle="Track, assign, and verify resolution of non-conformances and site delays."
        />
        <button 
          onClick={() => setIsCreateOpen(true)}
          className="btn-primary py-2.5 px-5 text-sm shadow-sm flex items-center gap-2 flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          Report Issue
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-danger-bg text-danger flex items-center justify-center flex-shrink-0 font-bold">
            {criticalCount}
          </div>
          <div>
            <div className="text-xs text-text-secondary font-bold uppercase tracking-wider">Critical Open</div>
            <div className="text-lg font-bold text-text-primary">{criticalCount} Issues</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-warning-bg text-warning flex items-center justify-center flex-shrink-0 font-bold">
            {openCount}
          </div>
          <div>
            <div className="text-xs text-text-secondary font-bold uppercase tracking-wider">Open</div>
            <div className="text-lg font-bold text-text-primary">{openCount} Needs Action</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0 font-bold">
            {inProgressCount}
          </div>
          <div>
            <div className="text-xs text-text-secondary font-bold uppercase tracking-wider">In Progress</div>
            <div className="text-lg font-bold text-text-primary">{inProgressCount} Active</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 text-success flex items-center justify-center flex-shrink-0 font-bold">
            {resolvedCount}
          </div>
          <div>
            <div className="text-xs text-text-secondary font-bold uppercase tracking-wider">Resolved</div>
            <div className="text-lg font-bold text-text-primary">{resolvedCount} Verified</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex gap-2 overflow-x-auto">
          {[
            { id: 'all', label: 'All' },
            { id: 'open', label: 'Open' },
            { id: 'in_progress', label: 'In Progress' },
            { id: 'resolved', label: 'Resolved' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-brand-50 text-brand-700 border border-brand-200 shadow-sm'
                  : 'bg-white text-text-secondary hover:bg-bg-muted border border-border'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {/* Severity Dropdown */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-white border border-border rounded-lg px-3 py-2 text-xs font-semibold text-text-secondary outline-none focus:border-brand-500 shadow-sm"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Search Box */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search issues..."
              className="w-full bg-white border border-border rounded-lg pl-9 pr-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Issues List */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-text-muted">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-3" />
          <p className="text-sm font-semibold text-text-secondary">Loading project issues...</p>
        </div>
      ) : isError ? (
        <div className="card p-12 text-center text-danger">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3" />
          <p className="font-bold">Failed to load issues for this project.</p>
        </div>
      ) : filteredIssues.length === 0 ? (
        <div className="card p-12 text-center flex flex-col items-center justify-center border-dashed border-2">
          <CheckCircle2 className="w-12 h-12 text-success mb-3" />
          <h3 className="text-lg font-bold text-text-primary mb-1">No Issues Found</h3>
          <p className="text-sm text-text-secondary max-w-md mb-4">
            {statusFilter !== 'all' || severityFilter !== 'all' || searchTerm
              ? 'No issues match your active filter criteria.'
              : 'Great work! No open issues or non-conformances recorded for this project.'}
          </p>
          <button 
            onClick={() => setIsCreateOpen(true)}
            className="btn-primary py-2 px-4 text-xs flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            Report First Issue
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredIssues.map((issue) => {
            const isCritical = issue.severity === 'critical';
            const isHigh = issue.severity === 'high';
            const isResolved = issue.status === 'resolved';
            const isInProgress = issue.status === 'in_progress';

            return (
              <div 
                key={issue.id} 
                className="card p-5 hover:border-brand-300 hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group"
              >
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="mt-0.5 flex-shrink-0">
                    {isCritical ? (
                      <div className="w-9 h-9 rounded-full bg-danger-bg border border-danger/30 flex items-center justify-center text-danger">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                    ) : isHigh ? (
                      <div className="w-9 h-9 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                        <Tag className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                        isCritical ? 'bg-danger-bg text-danger border-danger/30' :
                        isHigh ? 'bg-orange-50 text-orange-700 border-orange-200' :
                        issue.severity === 'medium' ? 'bg-warning-bg text-warning border-warning/30' :
                        'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {issue.severity}
                      </span>

                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                        isResolved ? 'bg-green-50 text-green-700 border-green-200' :
                        isInProgress ? 'bg-brand-50 text-brand-700 border-brand-200' :
                        'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {issue.status.replace('_', ' ')}
                      </span>

                      {issue.dueDate && (
                        <span className="text-xs text-text-muted flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" /> Due {new Date(issue.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    <h4 className="text-base font-bold text-text-primary mb-1">{issue.title}</h4>
                    <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed mb-3">
                      {issue.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-text-muted">
                      {issue.assignedTo && (
                        <span className="flex items-center gap-1 text-text-secondary font-semibold">
                          <HardHat className="w-3.5 h-3.5 text-brand-500" /> Assigned: {issue.assignedTo}
                        </span>
                      )}
                      {issue.evidenceCaptureIds && issue.evidenceCaptureIds.length > 0 && (
                        <span className="bg-bg-muted px-2 py-0.5 rounded border border-border font-medium">
                          {issue.evidenceCaptureIds.length} Evidence Capture{issue.evidenceCaptureIds.length > 1 ? 's' : ''}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {new Date(issue.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status Transition Action Buttons */}
                <div className="flex items-center gap-2 self-end md:self-center flex-shrink-0">
                  {issue.status === 'open' && (
                    <button
                      onClick={() => updateMutation.mutate({ issueId: issue.id, updates: { status: 'in_progress' } })}
                      disabled={updateMutation.isPending}
                      className="px-3 py-1.5 rounded-lg border border-brand-200 bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
                    >
                      <span>Start Progress</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                  {issue.status === 'in_progress' && (
                    <button
                      onClick={() => updateMutation.mutate({ issueId: issue.id, updates: { status: 'resolved' } })}
                      disabled={updateMutation.isPending}
                      className="px-3 py-1.5 rounded-lg border border-green-300 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Resolved</span>
                    </button>
                  )}
                  {issue.status === 'resolved' && (
                    <button
                      onClick={() => updateMutation.mutate({ issueId: issue.id, updates: { status: 'in_progress' } })}
                      disabled={updateMutation.isPending}
                      className="px-3 py-1.5 rounded-lg border border-border hover:bg-bg-muted text-text-secondary text-xs font-semibold transition-colors"
                    >
                      Reopen
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedIssue(issue)}
                    className="p-2 rounded-lg border border-border hover:bg-bg-muted text-text-muted hover:text-text-primary transition-colors"
                    title="View Details"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Issue Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-border relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button 
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-4 right-4 text-text-muted hover:text-text-primary"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-text-primary mb-1">Report Field Issue</h3>
            <p className="text-xs text-text-secondary mb-5">
              Log a site anomaly, material defect, safety hazard, or schedule roadblock.
            </p>

            {formError && (
              <div className="mb-4 p-3 bg-danger-bg border border-danger/20 text-danger text-xs rounded-lg">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Issue Title</label>
                <input 
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Pipe misalignment in Trench Segment B"
                  required
                  className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Description & Location Details</label>
                <textarea 
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Describe the condition, root cause if known, and immediate action required..."
                  required
                  rows={3}
                  className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none shadow-sm resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Severity</label>
                  <select
                    value={formSeverity}
                    onChange={(e) => setFormSeverity(e.target.value as any)}
                    className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-brand-500 outline-none shadow-sm font-semibold"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Target Due Date</label>
                  <input 
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-brand-500 outline-none shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Assignee</label>
                  <input 
                    type="text"
                    value={formAssignee}
                    onChange={(e) => setFormAssignee(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-brand-500 outline-none shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Linked Activity Code (Optional)</label>
                  <input 
                    type="text"
                    value={formActivityId}
                    onChange={(e) => setFormActivityId(e.target.value)}
                    placeholder="e.g. PIP-04"
                    className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-brand-500 outline-none shadow-sm font-mono text-xs"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button 
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="flex-1 py-2.5 rounded-lg border border-border hover:bg-bg-muted text-text-secondary text-sm font-semibold"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 btn-primary py-2.5 text-sm flex items-center justify-center gap-2"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Submit Issue'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Issue Details Drawer */}
      {selectedIssue && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end animate-in">
          <div className="bg-white w-full max-w-md h-full p-6 shadow-2xl border-l border-border flex flex-col overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
              <h3 className="text-lg font-bold text-text-primary">Issue Details</h3>
              <button 
                onClick={() => setSelectedIssue(null)}
                className="text-text-muted hover:text-text-primary p-1 rounded-lg hover:bg-bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5 flex-1">
              <div>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                  selectedIssue.severity === 'critical' ? 'bg-danger-bg text-danger border-danger/30' :
                  selectedIssue.severity === 'high' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                  'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {selectedIssue.severity} Priority
                </span>
                <h2 className="text-xl font-bold text-text-primary mt-2">{selectedIssue.title}</h2>
              </div>

              <div className="bg-bg-muted p-4 rounded-xl border border-border text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                {selectedIssue.description}
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-text-secondary font-medium">Status</span>
                  <span className="font-bold text-text-primary capitalize">{selectedIssue.status.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-text-secondary font-medium">Assigned To</span>
                  <span className="font-bold text-text-primary">{selectedIssue.assignedTo || 'Unassigned'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-text-secondary font-medium">Created On</span>
                  <span className="font-bold text-text-primary">{new Date(selectedIssue.createdAt).toLocaleString()}</span>
                </div>
                {selectedIssue.dueDate && (
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-text-secondary font-medium">Target Due Date</span>
                    <span className="font-bold text-text-primary">{new Date(selectedIssue.dueDate).toLocaleDateString()}</span>
                  </div>
                )}
                {selectedIssue.resolvedAt && (
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-text-secondary font-medium">Resolved On</span>
                    <span className="font-bold text-success">{new Date(selectedIssue.resolvedAt).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-border mt-auto">
              <button
                onClick={() => setSelectedIssue(null)}
                className="w-full py-2.5 rounded-lg border border-border hover:bg-bg-muted text-text-secondary text-sm font-semibold"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
