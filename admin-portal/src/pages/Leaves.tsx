import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { leaveAPI, employeeAPI } from '../services/api';
import { LeaveRequest } from '../types';
import { 
  Calendar, AlertCircle, FileText, CheckCircle2, XCircle, Clock, 
  Trash2, Send, Download, Eye, Check, X, Search, Filter, 
  User, Layers, FileDown, Paperclip, Users, CalendarRange, TrendingUp, AlertTriangle,
  ChevronLeft, ChevronRight, CheckSquare, PlusSquare
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// Extended type for mock data enrichment
interface ExtendedLeaveRequest extends LeaveRequest {
  department?: string;
  attachment?: string;
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  employeeName?: string;
  employeeEmail?: string;
  employeeAvatar?: string;
  approvedBy?: string;
  approvedDate?: string;
  rejectedBy?: string;
  rejectedDate?: string;
  remarks?: string;
}

interface CompanyHoliday {
  _id: string;
  name: string;
  date: string; // YYYY-MM-DD
  type: 'public' | 'national' | 'restricted';
  branch: string;
  description: string;
}

const PIE_COLORS = ['#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#a855f7', '#64748b'];

const Leaves: React.FC = () => {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [allLeaves, setAllLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [localStatusOverrides, setLocalStatusOverrides] = useState<Record<string, 'approved' | 'rejected'>>({});
  const [localRemarksOverrides, setLocalRemarksOverrides] = useState<Record<string, string>>({});
  const [localApproverOverrides, setLocalApproverOverrides] = useState<Record<string, { by: string; date: string }>>({});

  // Active tab selection
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pending' | 'approved' | 'rejected' | 'calendar' | 'holidays' | 'all_requests' | 'apply' | 'history'>('dashboard');

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());

  // Form states
  const [leaveType, setLeaveType] = useState<string>('casual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high' | 'critical'>('low');
  const [attachmentName, setAttachmentName] = useState<string>('');

  // Table Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Modals
  const [selectedLeave, setSelectedLeave] = useState<ExtendedLeaveRequest | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);

  const isAdmin = user?.role === 'company_admin' || user?.role === 'super_admin' || user?.role === 'manager';

  const countDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    const diffTime = Math.abs(new Date(end).getTime() - new Date(start).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  // Entitlement balances
  const leaveBalances = {
    casual: 8,
    sick: 6,
    annual: 12,
    wfh: 15,
    comp_off: 4,
    unpaid: 0
  };

  // Seeded Company Holidays
  const seededHolidays: CompanyHoliday[] = useMemo(() => [
    { _id: 'h-1', name: 'New Year\'s Day', date: '2026-01-01', type: 'public', branch: 'All Branches', description: 'Start of the calendar year celebration.' },
    { _id: 'h-2', name: 'Republic Day', date: '2026-01-26', type: 'national', branch: 'All Branches', description: 'Commemorating the Constitution of India.' },
    { _id: 'h-3', name: 'Maha Shivratri', date: '2026-03-07', type: 'public', branch: 'All Branches', description: 'Hindu festival celebrating Lord Shiva.' },
    { _id: 'h-4', name: 'Holi Festival', date: '2026-03-20', type: 'public', branch: 'All Branches', description: 'Festival of colors and spring celebration.' },
    { _id: 'h-5', name: 'Good Friday', date: '2026-04-03', type: 'public', branch: 'All Branches', description: 'Christian holiday commemorating the passion of Jesus.' },
    { _id: 'h-6', name: 'Independence Day', date: '2026-08-15', type: 'national', branch: 'All Branches', description: 'Celebrating national freedom.' },
    { _id: 'h-7', name: 'Gandhi Jayanti', date: '2026-10-02', type: 'national', branch: 'All Branches', description: 'Mahatma Gandhi\'s birthday anniversary.' },
    { _id: 'h-8', name: 'Diwali (Deepavali)', date: '2026-11-08', type: 'public', branch: 'All Branches', description: 'Festival of lights signifying victory of light over darkness.' },
    { _id: 'h-9', name: 'Christmas Day', date: '2026-12-25', type: 'public', branch: 'All Branches', description: 'Celebrating the birth of Jesus Christ.' }
  ], []);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        const [myRes, allRes] = await Promise.all([
          leaveAPI.myLeaves(),
          leaveAPI.list({ limit: 100 })
        ]);
        const myData = myRes.data?.data?.leaves || myRes.data?.data || [];
        const allData = allRes.data?.data?.leaves || allRes.data?.data || [];
        setLeaves(myData);
        setAllLeaves(allData);
      } else {
        const res = await leaveAPI.myLeaves();
        const myData = res.data?.data?.leaves || res.data?.data || [];
        setLeaves(myData);
      }
    } catch (err) {
      console.error('Leaves API fail:', err);
      toast.error('Failed to load leaves data.');
      setLeaves([]);
      setAllLeaves([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchLeaves();
      if (!isAdmin) {
        setActiveTab('apply');
      }
    }
  }, [user]);

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error('Start date cannot be after end date');
      return;
    }

    setSubmitting(true);
    const leaveData = { 
      leaveType, 
      startDate, 
      endDate, 
      reason,
      urgency,
      attachment: attachmentName || undefined
    };

    try {
      await leaveAPI.apply(leaveData);
      toast.success('Leave applied successfully!');
      setStartDate('');
      setEndDate('');
      setReason('');
      setAttachmentName('');
      fetchLeaves();
      setActiveTab('history');
    } catch (err) {
      console.error('Apply leave error:', err);
      toast.error('Failed to submit leave application.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelLeave = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this leave request?')) return;

    try {
      await leaveAPI.cancel(id);
      toast.success('Leave request cancelled');
      fetchLeaves();
    } catch (err) {
      console.error('Cancel leave error:', err);
      toast.error('Failed to cancel leave request.');
    }
  };

  const handleReviewLeave = async (id: string, newStatus: 'approved' | 'rejected') => {
    let remarksInput = '';
    if (newStatus === 'rejected') {
      const enteredRemarks = window.prompt("Enter Rejection Remarks:", "Team has critical deliverables. Please reschedule.");
      if (enteredRemarks === null) return; // cancel click
      remarksInput = enteredRemarks.trim() || 'Declined by Administrator';
    }

    const currentUserName = user?.name || 'Company Admin';
    const todayStr = new Date().toISOString();

    // If it's a mock request
    if (id.startsWith('mock-')) {
      setLocalStatusOverrides(prev => ({ ...prev, [id]: newStatus }));
      if (newStatus === 'rejected') {
        setLocalRemarksOverrides(prev => ({ ...prev, [id]: remarksInput }));
      }
      setLocalApproverOverrides(prev => ({ 
        ...prev, 
        [id]: { by: currentUserName, date: todayStr } 
      }));
      
      toast.success(`Leave request ${newStatus} successfully!`);
      if (selectedLeave && selectedLeave._id === id) {
        setSelectedLeave(prev => prev ? { 
          ...prev, 
          status: newStatus,
          approvedBy: newStatus === 'approved' ? currentUserName : undefined,
          approvedDate: newStatus === 'approved' ? todayStr : undefined,
          rejectedBy: newStatus === 'rejected' ? currentUserName : undefined,
          rejectedDate: newStatus === 'rejected' ? todayStr : undefined,
          remarks: newStatus === 'rejected' ? remarksInput : undefined
        } : null);
      }
      return;
    }

    try {
      await leaveAPI.updateStatus(id, newStatus);
      
      // Update local storage representation for review details
      setLocalApproverOverrides(prev => ({ 
        ...prev, 
        [id]: { by: currentUserName, date: todayStr } 
      }));
      if (newStatus === 'rejected') {
        setLocalRemarksOverrides(prev => ({ ...prev, [id]: remarksInput }));
      }

      toast.success(`Leave request ${newStatus}`);
      fetchLeaves();
      if (selectedLeave && selectedLeave._id === id) {
        setSelectedLeave(prev => prev ? { 
          ...prev, 
          status: newStatus,
          approvedBy: newStatus === 'approved' ? currentUserName : undefined,
          approvedDate: newStatus === 'approved' ? todayStr : undefined,
          rejectedBy: newStatus === 'rejected' ? currentUserName : undefined,
          rejectedDate: newStatus === 'rejected' ? todayStr : undefined,
          remarks: newStatus === 'rejected' ? remarksInput : undefined
        } : null);
      }
    } catch (err) {
      console.error(`Failed to update leave status to ${newStatus}`, err);
      toast.error('Failed to update leave status.');
    }
  };

  const handleDownloadAttachment = (filename: string) => {
    if (!filename) return;
    toast.success(`Downloading ${filename}...`);
    const element = document.createElement("a");
    const file = new Blob([`Simulated attachment data for file: ${filename}`], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachmentName(file.name);
      toast.success(`File "${file.name}" attached successfully`);
    }
  };

  // Merge backend leaves
  const mergedAllLeaves = useMemo(() => {
    const mappedRealLeaves = allLeaves.map(leave => {
      const isUserObj = typeof leave.userId === 'object' && leave.userId !== null;
      const employeeName = isUserObj ? (leave.userId as any).name : 'Employee';
      const employeeEmail = isUserObj ? (leave.userId as any).email : '';
      const department = isUserObj ? ((leave.userId as any).department || 'Engineering') : 'Engineering';
      
      const overriddenStatus = localStatusOverrides[leave._id] || leave.status;
      const localApprover = localApproverOverrides[leave._id];
      const localRemarks = localRemarksOverrides[leave._id];

      return {
        ...leave,
        employeeName,
        employeeEmail,
        department,
        status: overriddenStatus,
        urgency: (leave as any).urgency || 'low',
        attachment: (leave as any).attachment || '',
        approvedBy: overriddenStatus === 'approved' ? (localApprover?.by || 'Demo Admin') : undefined,
        approvedDate: overriddenStatus === 'approved' ? (localApprover?.date || leave.updatedAt || new Date().toISOString()) : undefined,
        rejectedBy: overriddenStatus === 'rejected' ? (localApprover?.by || 'Demo Admin') : undefined,
        rejectedDate: overriddenStatus === 'rejected' ? (localApprover?.date || leave.updatedAt || new Date().toISOString()) : undefined,
        remarks: overriddenStatus === 'rejected' ? (localRemarks || 'Processed by admin') : undefined
      };
    });

    return mappedRealLeaves.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [allLeaves, localStatusOverrides, localRemarksOverrides, localApproverOverrides]);

  // Derived Statistics Cards
  const stats = useMemo(() => {
    const total = mergedAllLeaves.length;
    const pending = mergedAllLeaves.filter(l => l.status === 'pending').length;
    const approved = mergedAllLeaves.filter(l => l.status === 'approved').length;
    const rejected = mergedAllLeaves.filter(l => l.status === 'rejected').length;

    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr);

    const onLeaveToday = mergedAllLeaves.filter(l => {
      if (l.status !== 'approved') return false;
      const start = new Date(l.startDate.split('T')[0]);
      const end = new Date(l.endDate.split('T')[0]);
      return today >= start && today <= end;
    }).length;

    const upcoming = mergedAllLeaves.filter(l => {
      if (l.status !== 'approved') return false;
      const start = new Date(l.startDate.split('T')[0]);
      return start > today;
    }).length;

    const approvedLeaves = mergedAllLeaves.filter(l => l.status === 'approved');
    const totalDays = approvedLeaves.reduce((sum, l) => sum + countDays(l.startDate, l.endDate), 0);
    const avgDuration = approvedLeaves.length > 0 ? Math.round((totalDays / approvedLeaves.length) * 10) / 10 : 0;

    // Quota utilization percentage (simulated based on typical 5 active users)
    const leaveUtilization = Math.min(100, Math.round((totalDays / (5 * 24)) * 100)) || 0;

    return {
      total,
      pending,
      approved,
      rejected,
      onLeaveToday,
      upcoming,
      avgDuration,
      leaveUtilization
    };
  }, [mergedAllLeaves]);

  // Derived Cards specifically for Pending approvals view
  const pendingStats = useMemo(() => {
    const pendingList = mergedAllLeaves.filter(l => l.status === 'pending');
    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr);

    const todayPending = pendingList.filter(l => {
      const start = new Date(l.startDate.split('T')[0]);
      const end = new Date(l.endDate.split('T')[0]);
      return today >= start && today <= end;
    }).length;

    const urgentRequests = pendingList.filter(l => {
      const isUrgentText = l.reason.toLowerCase().includes('urgent') || l.reason.toLowerCase().includes('emergency');
      const start = new Date(l.startDate.split('T')[0]);
      const diffDays = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return isUrgentText || l.urgency === 'high' || l.urgency === 'critical' || diffDays <= 2;
    }).length;

    const medicalLeaves = pendingList.filter(l => l.leaveType === 'sick').length;
    const longLeaves = pendingList.filter(l => countDays(l.startDate, l.endDate) >= 3).length;

    return {
      todayPending,
      urgentRequests,
      medicalLeaves,
      longLeaves,
      pendingList
    };
  }, [mergedAllLeaves]);



  // Filtered Leave Lists
  const approvedLeavesList = useMemo(() => mergedAllLeaves.filter(l => l.status === 'approved'), [mergedAllLeaves]);
  const rejectedLeavesList = useMemo(() => mergedAllLeaves.filter(l => l.status === 'rejected'), [mergedAllLeaves]);

  // Filtered Leave Requests for Main Table
  const filteredLeaves = useMemo(() => {
    return mergedAllLeaves.filter(l => {
      const searchMatch = 
        l.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.employeeEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.reason?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l._id.toLowerCase().includes(searchQuery.toLowerCase());

      const statusMatch = statusFilter === 'all' || l.status === statusFilter;
      const typeMatch = typeFilter === 'all' || l.leaveType === typeFilter;

      return searchMatch && statusMatch && typeMatch;
    });
  }, [mergedAllLeaves, searchQuery, statusFilter, typeFilter]);

  const handleOpenEmployeeProfile = (leave: ExtendedLeaveRequest) => {
    const mockEmployee = {
      name: leave.employeeName,
      email: leave.employeeEmail,
      department: leave.department || 'Engineering',
      designation: leave.leaveType === 'sick' ? 'Software Engineer' : 'HR Specialist',
      phone: '+91 9988776655',
      employeeId: leave.userId.startsWith('emp-') ? leave.userId.toUpperCase() : 'EMP-0092',
      status: 'active',
      workMode: 'office',
      balances: {
        casual: { taken: 3, max: 8 },
        sick: { taken: 2, max: 6 },
        annual: { taken: 5, max: 12 },
        wfh: { taken: 4, max: 15 },
        comp_off: { taken: 1, max: 4 },
        unpaid: { taken: 2, max: 0 }
      }
    };
    setSelectedEmployee(mockEmployee);
  };

  const getStatusBadge = (status: LeaveRequest['status']) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" /> Pending
          </span>
        );
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getUrgencyBadge = (urg: string) => {
    switch (urg) {
      case 'critical':
        return <span className="text-[9px] font-bold px-1.5 py-0.5 bg-red-600/20 text-red-400 border border-red-500/30 rounded">CRITICAL</span>;
      case 'high':
        return <span className="text-[9px] font-bold px-1.5 py-0.5 bg-orange-600/20 text-orange-400 border border-orange-500/30 rounded">HIGH</span>;
      case 'medium':
        return <span className="text-[9px] font-bold px-1.5 py-0.5 bg-yellow-600/20 text-yellow-400 border border-yellow-500/30 rounded">MEDIUM</span>;
      default:
        return <span className="text-[9px] font-bold px-1.5 py-0.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded">LOW</span>;
    }
  };

  const getLeaveTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      casual: 'Casual Leave',
      sick: 'Sick Leave',
      annual: 'Annual Leave',
      wfh: 'Work From Home',
      comp_off: 'Comp Off',
      unpaid: 'Unpaid Leave'
    };
    return map[type] || type;
  };

  // Calendar rendering helper logic
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevMonthTotalDays = new Date(currentYear, currentMonth, 0).getDate();
    
    const days = [];
    
    // Fill previous month greyed dates
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        day: prevMonthTotalDays - i,
        month: currentMonth === 0 ? 11 : currentMonth - 1,
        year: currentMonth === 0 ? currentYear - 1 : currentYear,
        isCurrentMonth: false
      });
    }

    // Fill current month active dates
    for (let i = 1; i <= totalDays; i++) {
      days.push({
        day: i,
        month: currentMonth,
        year: currentYear,
        isCurrentMonth: true
      });
    }

    // Fill next month greyed dates to complete 42 cells grid
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push({
        day: i,
        month: currentMonth === 11 ? 0 : currentMonth + 1,
        year: currentMonth === 11 ? currentYear + 1 : currentYear,
        isCurrentMonth: false
      });
    }

    return days;
  }, [currentMonth, currentYear]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  // Fetch calendar events on a specific day
  const getCalendarDayData = (year: number, month: number, day: number) => {
    const cellDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const cellDate = new Date(cellDateStr);
    
    const dayOfWeek = cellDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday

    // Check holiday
    const holiday = seededHolidays.find(h => h.date === cellDateStr);

    // Filter matching leaves
    const dayLeaves = mergedAllLeaves.filter(l => {
      const start = new Date(l.startDate.split('T')[0]);
      const end = new Date(l.endDate.split('T')[0]);
      return cellDate >= start && cellDate <= end;
    });

    return {
      isWeekend,
      holiday,
      leaves: dayLeaves
    };
  };

  return (
    <div className="min-h-full bg-[#0d1117] text-white pb-6">
      <Toaster position="top-right" />

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-500" /> Leave Management
          </h1>
          <p className="text-xs text-slate-400">
            Submit leave requests, check entitlements, and manage team holiday calendars
          </p>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex border-b border-[#30363d] gap-2 mb-6 overflow-x-auto whitespace-nowrap">
        {isAdmin && (
          <>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'dashboard' ? 'border-blue-500 text-blue-400 font-bold' : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Overview Dashboard
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'pending' ? 'border-blue-500 text-blue-400 font-bold' : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Pending Approvals 
              {pendingStats.pendingList.length > 0 && (
                <span className="bg-yellow-500 text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                  {pendingStats.pendingList.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'approved' ? 'border-blue-500 text-blue-400 font-bold' : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Approved Leaves ({approvedLeavesList.length})
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'rejected' ? 'border-blue-500 text-blue-400 font-bold' : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Rejected Leaves ({rejectedLeavesList.length})
            </button>
          </>
        )}
        <button
          onClick={() => setActiveTab('calendar')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'calendar' ? 'border-blue-500 text-blue-400 font-bold' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Leave Calendar
        </button>
        <button
          onClick={() => setActiveTab('holidays')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'holidays' ? 'border-blue-500 text-blue-400 font-bold' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Holidays ({seededHolidays.length})
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('all_requests')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'all_requests' ? 'border-blue-500 text-blue-400 font-bold' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            All Requests ({mergedAllLeaves.length})
          </button>
        )}
        {!isAdmin && (
          <>
            <button
              onClick={() => setActiveTab('apply')}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'apply' ? 'border-blue-500 text-blue-400 font-bold' : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Apply for Leave
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'history' ? 'border-blue-500 text-blue-400 font-bold' : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              My Leaves History ({leaves.length})
            </button>
          </>
        )}
      </div>

      {/* DASHBOARD TAB CONTENT */}
      {activeTab === 'dashboard' && isAdmin && (
        <div className="space-y-6">
          {/* STATS CARDS (6 CARDS) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Total Requests', value: stats.total, sub: 'All statuses', color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20' },
              { label: 'Pending Approval', value: stats.pending, sub: 'Needs action', color: 'text-yellow-500', bg: 'bg-yellow-500/10 border-yellow-500/20' },
              { label: 'Approved Leaves', value: stats.approved, sub: 'Confirmed', color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20' },
              { label: 'Rejected Leaves', value: stats.rejected, sub: 'Declined', color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/20' },
              { label: 'On Leave Today', value: stats.onLeaveToday, sub: 'Active leaves', color: 'text-purple-500', bg: 'bg-purple-500/10 border-purple-500/20' },
              { label: 'Upcoming Leaves', value: stats.upcoming, sub: 'Approved future', color: 'text-cyan-500', bg: 'bg-cyan-500/10 border-cyan-500/20' }
            ].map((card, idx) => (
              <div key={idx} className={`bg-[#161b22] border rounded-xl p-3 flex flex-col justify-between hover:border-slate-700 transition-all ${card.bg}`}>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">{card.label}</span>
                <p className="text-xl font-bold text-white mt-2 mb-0.5">{card.value}</p>
                <p className="text-[9px] text-slate-500 mt-1">{card.sub}</p>
              </div>
            ))}
          </div>

          {/* EMPLOYEE LEAVE LIST */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#21262d]">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4.5 h-4.5 text-blue-500" /> Employee Leave List
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">List of all employee leave applications and status tracking</p>
              </div>
              <button 
                onClick={() => setActiveTab('all_requests')}
                className="text-xs font-bold text-blue-500 hover:text-blue-400 flex items-center gap-0.5 cursor-pointer bg-transparent border-none outline-none"
              >
                View All <ChevronRight className="w-4.5 h-4.5" />
              </button>
            </div>

            {mergedAllLeaves.length === 0 ? (
              <div className="text-center py-12 text-slate-500 font-semibold">
                No employee leave records found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-slate-300">
                  <thead>
                    <tr className="bg-[#0d1117] border-b border-[#21262d] text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Leave Type</th>
                      <th className="py-3 px-4">Duration</th>
                      <th className="py-3 px-4">Days</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#21262d] text-xs">
                    {mergedAllLeaves.map((leave) => {
                      const days = countDays(leave.startDate, leave.endDate);
                      return (
                        <tr key={leave._id} className="hover:bg-[#1f242c] transition-colors">
                          <td className="py-3 px-4 font-bold text-white">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center font-bold text-blue-400 text-xs">
                                {leave.employeeName?.slice(0, 2) || 'EM'}
                              </div>
                              <div>
                                <span 
                                  className="hover:underline hover:text-blue-400 cursor-pointer block"
                                  onClick={() => handleOpenEmployeeProfile(leave)}
                                >
                                  {leave.employeeName}
                                </span>
                                <span className="text-[9px] text-slate-500 font-normal">{leave.employeeEmail}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-300 capitalize">{getLeaveTypeLabel(leave.leaveType)}</td>
                          <td className="py-3 px-4 text-slate-400">
                            {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                          </td>
                          <td className="py-3 px-4 font-bold text-white">{days} {days === 1 ? 'day' : 'days'}</td>
                          <td className="py-3 px-4">{getStatusBadge(leave.status)}</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setSelectedLeave(leave as ExtendedLeaveRequest)}
                              className="p-1.5 bg-[#0d1117] hover:bg-slate-800 border border-[#30363d] text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                              title="View Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PENDING APPROVALS TAB CONTENT */}
      {activeTab === 'pending' && isAdmin && (
        <div className="space-y-6">
          {/* PENDING QUICK METRIC CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Today\'s Pending', value: pendingStats.todayPending, sub: 'Needs quick check', icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/25' },
              { label: 'Urgent Requests', value: pendingStats.urgentRequests, sub: 'Critical / High priority', icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/25' },
              { label: 'Medical Leave', value: pendingStats.medicalLeaves, sub: 'Sick leave requests', icon: FileText, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/25' },
              { label: 'Long Leave (>= 3 Days)', value: pendingStats.longLeaves, sub: 'Extended absence', icon: CalendarRange, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/25' }
            ].map((pCard, idx) => {
              const Icon = pCard.icon;
              return (
                <div key={idx} className={`bg-[#161b22] border rounded-2xl p-4.5 flex items-start justify-between hover:border-slate-700 transition-all ${pCard.bg}`}>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{pCard.label}</span>
                    <p className="text-2xl font-bold text-white mt-2.5 mb-1">{pCard.value}</p>
                    <span className="text-[10px] text-slate-500">{pCard.sub}</span>
                  </div>
                  <div className={`p-2 rounded-xl bg-[#0d1117] border border-[#21262d] ${pCard.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* PENDING LIST TABLE */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden shadow-lg">
            <div className="p-4 border-b border-[#30363d]">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Awaiting Verification</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Leaves that require company administrator decision</p>
            </div>

            {pendingStats.pendingList.length === 0 ? (
              <div className="text-center py-16">
                <CheckCircle2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-white">All Caught Up!</h3>
                <p className="text-xs text-slate-400 mt-1">There are no pending leave requests to review.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-slate-300">
                  <thead>
                    <tr className="bg-[#0d1117] border-b border-[#21262d] text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Leave Details</th>
                      <th className="py-3 px-4">Duration</th>
                      <th className="py-3 px-4">Days</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4 text-right">Review Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#21262d] text-xs">
                    {pendingStats.pendingList.map(leave => {
                      const days = countDays(leave.startDate, leave.endDate);
                      return (
                        <tr key={leave._id} className="hover:bg-[#1f242c] transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-white">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center uppercase font-bold text-blue-400 text-xs">
                                {leave.employeeName?.slice(0, 2) || 'EM'}
                              </div>
                              <div>
                                <span className="font-bold block text-white hover:text-blue-400 cursor-pointer" onClick={() => handleOpenEmployeeProfile(leave)}>
                                  {leave.employeeName}
                                </span>
                                <span className="text-[10px] text-slate-500 font-normal">{leave.employeeEmail}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-white capitalize">{getLeaveTypeLabel(leave.leaveType)}</span>
                            {leave.attachment && (
                              <div className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 mt-1 cursor-pointer" onClick={() => handleDownloadAttachment(leave.attachment || '')}>
                                <Paperclip className="w-3 h-3" /> {leave.attachment}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-300">
                            {formatDate(leave.startDate)}
                            <span className="text-slate-500 block text-[10px] mt-0.5">to {formatDate(leave.endDate)}</span>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-white">{days} {days === 1 ? 'day' : 'days'}</td>
                          <td className="py-3.5 px-4 text-slate-400 max-w-[200px] truncate" title={leave.reason}>{leave.reason}</td>
                          <td className="py-3.5 px-4">{getUrgencyBadge(leave.urgency || 'low')}</td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => handleReviewLeave(leave._id, 'approved')}
                                className="p-1.5 bg-emerald-600/15 hover:bg-emerald-600 border border-emerald-500/20 text-emerald-400 hover:text-white rounded-lg transition-all cursor-pointer font-semibold flex items-center gap-1 text-[10px]"
                              >
                                <Check className="w-3.5 h-3.5" /> Approve
                              </button>
                              <button
                                onClick={() => handleReviewLeave(leave._id, 'rejected')}
                                className="p-1.5 bg-red-600/15 hover:bg-red-600 border border-red-500/20 text-red-400 hover:text-white rounded-lg transition-all cursor-pointer font-semibold flex items-center gap-1 text-[10px]"
                              >
                                <X className="w-3.5 h-3.5" /> Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* APPROVED LEAVES TAB CONTENT */}
      {activeTab === 'approved' && isAdmin && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden shadow-lg">
          <div className="p-4 border-b border-[#30363d]">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Approved Leave Records</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Logs of all approved employee leaves</p>
          </div>
          {approvedLeavesList.length === 0 ? (
            <div className="text-center py-16 text-slate-500">No approved leaves record found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-slate-300">
                <thead>
                  <tr className="bg-[#0d1117] border-b border-[#21262d] text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4.5">Employee</th>
                    <th className="py-3.5 px-4.5">Leave Type</th>
                    <th className="py-3.5 px-4.5">Approved By</th>
                    <th className="py-3.5 px-4.5">Approved Date</th>
                    <th className="py-3.5 px-4.5">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#21262d] text-xs">
                  {approvedLeavesList.map(leave => {
                    const days = countDays(leave.startDate, leave.endDate);
                    return (
                      <tr key={leave._id} className="hover:bg-[#1f242c] transition-colors">
                        <td className="py-3.5 px-4.5 font-bold text-white">
                          <span className="hover:underline cursor-pointer" onClick={() => handleOpenEmployeeProfile(leave)}>
                            {leave.employeeName}
                          </span>
                          <span className="text-[9px] text-slate-500 font-normal block">{leave.employeeEmail}</span>
                        </td>
                        <td className="py-3.5 px-4.5">
                          <span className="font-semibold text-white capitalize">{getLeaveTypeLabel(leave.leaveType)}</span>
                        </td>
                        <td className="py-3.5 px-4.5 font-medium text-emerald-400">{leave.approvedBy || 'Demo Admin'}</td>
                        <td className="py-3.5 px-4.5 text-slate-500">
                          {leave.approvedDate ? formatDate(leave.approvedDate) : '-'}
                        </td>
                        <td className="py-3.5 px-4.5 text-slate-300 font-semibold">
                          {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                          <span className="text-slate-500 font-normal block text-[10px] mt-0.5">({days} {days === 1 ? 'day' : 'days'})</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* REJECTED LEAVES TAB CONTENT */}
      {activeTab === 'rejected' && isAdmin && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden shadow-lg">
          <div className="p-4 border-b border-[#30363d]">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Rejected Leave Records</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Logs of all rejected employee leave requests</p>
          </div>
          {rejectedLeavesList.length === 0 ? (
            <div className="text-center py-16 text-slate-500">No rejected leaves record found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-slate-300">
                <thead>
                  <tr className="bg-[#0d1117] border-b border-[#21262d] text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4.5">Employee</th>
                    <th className="py-3.5 px-4.5">Reason</th>
                    <th className="py-3.5 px-4.5">Rejected By</th>
                    <th className="py-3.5 px-4.5">Remarks</th>
                    <th className="py-3.5 px-4.5">Rejected Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#21262d] text-xs">
                  {rejectedLeavesList.map(leave => {
                    return (
                      <tr key={leave._id} className="hover:bg-[#1f242c] transition-colors">
                        <td className="py-3.5 px-4.5 font-bold text-white">
                          <span className="hover:underline cursor-pointer" onClick={() => handleOpenEmployeeProfile(leave)}>
                            {leave.employeeName}
                          </span>
                          <span className="text-[9px] text-slate-500 font-normal block">{leave.employeeEmail}</span>
                        </td>
                        <td className="py-3.5 px-4.5 text-slate-400 max-w-[200px] truncate" title={leave.reason}>{leave.reason}</td>
                        <td className="py-3.5 px-4.5 font-medium text-red-400">{leave.rejectedBy || 'Demo Admin'}</td>
                        <td className="py-3.5 px-4.5 text-slate-300 italic">"{leave.remarks || 'Insufficient leave balances'}"</td>
                        <td className="py-3.5 px-4.5 text-slate-500">
                          {leave.rejectedDate ? formatDate(leave.rejectedDate) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* LEAVE CALENDAR TAB CONTENT */}
      {activeTab === 'calendar' && (
        <div className="space-y-6">
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-lg">
            {/* Calendar Month Selector Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <CalendarRange className="w-5.5 h-5.5 text-blue-500" />
                <h3 className="text-base font-bold text-white uppercase tracking-wider">Leave Planner</h3>
              </div>

              <div className="flex items-center gap-4 bg-[#0d1117] border border-[#21262d] px-4 py-2 rounded-xl">
                <button 
                  onClick={handlePrevMonth}
                  className="p-1 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-white cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-white uppercase tracking-widest w-28 text-center select-none">
                  {new Date(currentYear, currentMonth).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                </span>
                <button 
                  onClick={handleNextMonth}
                  className="p-1 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-white cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Calendar Grid Layout */}
            <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] text-slate-400 uppercase tracking-widest bg-[#0d1117] p-2 rounded-t-xl border-t border-x border-[#30363d]">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="py-2">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 bg-[#21262d] p-1 rounded-b-xl border-b border-x border-[#30363d] min-h-[380px]">
              {calendarDays.map((cell, idx) => {
                const dayData = getCalendarDayData(cell.year, cell.month, cell.day);
                const isToday = new Date().getDate() === cell.day && new Date().getMonth() === cell.month && new Date().getFullYear() === cell.year;

                return (
                  <div 
                    key={idx} 
                    className={`min-h-[72px] bg-[#161b22] p-1.5 rounded-lg flex flex-col justify-between border transition-all ${
                      cell.isCurrentMonth ? 'border-[#30363d]/45 hover:border-slate-500' : 'border-transparent opacity-30 pointer-events-none'
                    } ${
                      dayData.isWeekend ? 'bg-purple-950/10 border-purple-500/10' : ''
                    } ${
                      isToday ? 'ring-1 ring-blue-500 bg-blue-950/10 border-blue-500/30' : ''
                    }`}
                  >
                    {/* Day Number */}
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold ${
                        isToday ? 'bg-blue-600 text-white w-4.5 h-4.5 flex items-center justify-center rounded-full' : 
                        dayData.isWeekend ? 'text-purple-400' : 'text-slate-400'
                      }`}>
                        {cell.day}
                      </span>
                      {dayData.isWeekend && <span className="text-[7px] font-bold text-purple-500 bg-purple-500/5 px-1 rounded">Wknd</span>}
                    </div>

                    {/* Day Events */}
                    <div className="space-y-1 mt-1 text-[8px] flex-1 flex flex-col justify-end">
                      {/* Holiday Event */}
                      {dayData.holiday && (
                        <div className="bg-blue-600/15 border border-blue-500/20 text-blue-400 font-bold p-0.5 px-1.5 rounded truncate select-none" title={dayData.holiday.name}>
                          🔵 {dayData.holiday.name}
                        </div>
                      )}
                      
                      {/* Leaves Events */}
                      {dayData.leaves.map(l => {
                        const leaveColorClass = 
                          l.status === 'approved' ? 'bg-emerald-600/15 border-emerald-500/20 text-emerald-400' : 
                          l.status === 'rejected' ? 'bg-red-600/15 border-red-500/20 text-red-400' : 
                          'bg-yellow-500/10 border-yellow-500/20 text-yellow-400';
                        const dot = l.status === 'approved' ? '🟢' : l.status === 'rejected' ? '🔴' : '🟡';
                        return (
                          <div 
                            key={l._id} 
                            onClick={() => setSelectedLeave(l as ExtendedLeaveRequest)}
                            className={`${leaveColorClass} border font-bold p-0.5 px-1.5 rounded truncate cursor-pointer hover:brightness-125 select-none`}
                            title={`${l.employeeName} - ${getLeaveTypeLabel(l.leaveType)}`}
                          >
                            {dot} {l.employeeName}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* COLOR EXAMPLES (LEGEND) */}
            <div className="mt-5 border-t border-[#30363d] pt-4 flex flex-wrap gap-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest justify-center">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span>🟢 Approved</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 shrink-0" />
                <span>🟡 Pending</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                <span>🔴 Rejected</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                <span>🔵 Holiday</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
                <span>🟣 Weekend</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HOLIDAYS TAB CONTENT */}
      {activeTab === 'holidays' && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden shadow-lg">
          <div className="p-4 border-b border-[#30363d] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Company Holidays (2026)</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Annual holiday schedule for employee branches</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-slate-300">
              <thead>
                <tr className="bg-[#0d1117] border-b border-[#21262d] text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4.5">Holiday Name</th>
                  <th className="py-3.5 px-4.5">Date</th>
                  <th className="py-3.5 px-4.5">Type</th>
                  <th className="py-3.5 px-4.5">Applicable Branch</th>
                  <th className="py-3.5 px-4.5">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#21262d] text-xs">
                {seededHolidays.map(hol => {
                  return (
                    <tr key={hol._id} className="hover:bg-[#1f242c] transition-colors">
                      <td className="py-3.5 px-4.5 font-bold text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                        {hol.name}
                      </td>
                      <td className="py-3.5 px-4.5 text-slate-300 font-mono">{formatDate(hol.date)}</td>
                      <td className="py-3.5 px-4.5">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded capitalize ${
                          hol.type === 'national' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 
                          hol.type === 'restricted' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : 
                          'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}>
                          {hol.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4.5 text-slate-400 font-semibold">{hol.branch}</td>
                      <td className="py-3.5 px-4.5 text-slate-400 max-w-xs">{hol.description}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ALL LEAVE REQUESTS TAB CONTENT */}
      {activeTab === 'all_requests' && isAdmin && (
        <div className="space-y-6">
          {/* SEARCH AND FILTERS PANEL */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4.5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search by Employee, Leave ID, or Reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#0d1117] border border-[#30363d] text-white text-xs font-semibold rounded-lg focus:ring-2 focus:ring-blue-500 outline-none placeholder-slate-600"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Filters:</span>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-[#0d1117] border border-[#30363d] text-white text-xs font-semibold rounded-lg outline-none cursor-pointer focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending Approval</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 bg-[#0d1117] border border-[#30363d] text-white text-xs font-semibold rounded-lg outline-none cursor-pointer focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Leave Types</option>
                <option value="casual">Casual Leave</option>
                <option value="sick">Sick Leave</option>
                <option value="annual">Annual Leave</option>
                <option value="wfh">Work From Home</option>
                <option value="comp_off">Comp Off</option>
                <option value="unpaid">Unpaid Leave</option>
              </select>
            </div>
          </div>

          {/* MAIN TABLE */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden shadow-lg">
            {filteredLeaves.length === 0 ? (
              <div className="text-center py-16">
                <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-white">No Matching Requests</h3>
                <p className="text-xs text-slate-400 mt-1">Adjust your filters or search query and try again.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-slate-300">
                  <thead>
                    <tr className="bg-[#0d1117] border-b border-[#21262d] text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3.5 px-4.5">Leave ID</th>
                      <th className="py-3.5 px-4.5">Employee</th>
                      <th className="py-3.5 px-4.5">Department</th>
                      <th className="py-3.5 px-4.5">Leave Type</th>
                      <th className="py-3.5 px-4.5">From</th>
                      <th className="py-3.5 px-4.5">To</th>
                      <th className="py-3.5 px-4.5">Days</th>
                      <th className="py-3.5 px-4.5">Reason</th>
                      <th className="py-3.5 px-4.5">Attachment</th>
                      <th className="py-3.5 px-4.5">Status</th>
                      <th className="py-3.5 px-4.5">Applied Date</th>
                      <th className="py-3.5 px-4.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#21262d] text-xs">
                    {filteredLeaves.map(leave => {
                      const days = countDays(leave.startDate, leave.endDate);
                      const leaveIdLabel = leave._id.startsWith('mock-') 
                        ? `L-10${leave._id.split('-')[1]}` 
                        : `L-${leave._id.substring(leave._id.length - 4).toUpperCase()}`;

                      return (
                        <tr key={leave._id} className="hover:bg-[#1f242c] transition-colors">
                          <td className="py-3.5 px-4.5 font-mono font-bold text-blue-400">{leaveIdLabel}</td>
                          <td className="py-3.5 px-4.5 font-bold text-white">
                            <span className="hover:underline cursor-pointer" onClick={() => handleOpenEmployeeProfile(leave)}>
                              {leave.employeeName}
                            </span>
                          </td>
                          <td className="py-3.5 px-4.5 text-slate-300">{leave.department || 'Engineering'}</td>
                          <td className="py-3.5 px-4.5 font-semibold text-white capitalize">{getLeaveTypeLabel(leave.leaveType)}</td>
                          <td className="py-3.5 px-4.5 text-slate-300">{formatDate(leave.startDate)}</td>
                          <td className="py-3.5 px-4.5 text-slate-300">{formatDate(leave.endDate)}</td>
                          <td className="py-3.5 px-4.5 font-bold text-white">{days} {days === 1 ? 'day' : 'days'}</td>
                          <td className="py-3.5 px-4.5 text-slate-400 max-w-[150px] truncate" title={leave.reason}>{leave.reason}</td>
                          <td className="py-3.5 px-4.5">
                            {leave.attachment ? (
                              <button 
                                onClick={() => handleDownloadAttachment(leave.attachment || '')}
                                className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-white rounded border border-[#30363d] transition-colors text-[9px] font-bold"
                              >
                                <Paperclip className="w-3.5 h-3.5 shrink-0" /> Download
                              </button>
                            ) : (
                              <span className="text-slate-600 font-semibold">-</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4.5">{getStatusBadge(leave.status)}</td>
                          <td className="py-3.5 px-4.5 text-slate-500">
                            {leave.createdAt ? formatDate(leave.createdAt) : '-'}
                          </td>
                          <td className="py-3.5 px-4.5 text-right">
                            <div className="flex gap-1.5 justify-end">
                              <button
                                onClick={() => setSelectedLeave(leave as ExtendedLeaveRequest)}
                                className="p-1.5 bg-[#161b22] hover:bg-slate-700 text-slate-300 hover:text-white border border-[#30363d] rounded-lg transition-colors cursor-pointer"
                                title="View Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              {leave.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleReviewLeave(leave._id, 'approved')}
                                    className="p-1.5 bg-emerald-900/40 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/20 rounded-lg transition-colors cursor-pointer"
                                    title="Approve Request"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleReviewLeave(leave._id, 'rejected')}
                                    className="p-1.5 bg-red-900/40 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/20 rounded-lg transition-colors cursor-pointer"
                                    title="Reject Request"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* APPLY FOR LEAVE TAB CONTENT */}
      {activeTab === 'apply' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* PERSONAL LEAVE BALANCES */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-lg">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-400" /> My Quota Entitlements
              </h3>
              
              <div className="space-y-4.5">
                {[
                  { title: 'Casual Leave', code: 'casual', color: 'text-yellow-400', progressColor: 'bg-yellow-500' },
                  { title: 'Sick Leave', code: 'sick', color: 'text-red-400', progressColor: 'bg-red-500' },
                  { title: 'Annual Leave', code: 'annual', color: 'text-emerald-400', progressColor: 'bg-emerald-500' },
                  { title: 'Work From Home', code: 'wfh', color: 'text-blue-400', progressColor: 'bg-blue-500' },
                  { title: 'Comp Off', code: 'comp_off', color: 'text-purple-400', progressColor: 'bg-purple-500' },
                  { title: 'Unpaid Leave Taken', code: 'unpaid', color: 'text-slate-400', progressColor: 'bg-slate-500' }
                ].map(bal => {
                  const used = leaves
                    .filter(l => l.status === 'approved' && l.leaveType === bal.code)
                    .reduce((sum, l) => sum + countDays(l.startDate, l.endDate), 0);

                  const maxVal = leaveBalances[bal.code as keyof typeof leaveBalances];
                  const remaining = bal.code === 'unpaid' ? used : maxVal - used;

                  return (
                    <div key={bal.title} className="text-xs">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-slate-300">{bal.title}</span>
                        <span className="font-bold text-white">
                          {remaining} {bal.code !== 'unpaid' && <span className="text-[10px] font-normal text-slate-500">/ {maxVal} days</span>}
                        </span>
                      </div>
                      <div className="w-full bg-[#0d1117] h-1.5 rounded-full overflow-hidden border border-[#21262d]">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${bal.progressColor}`}
                          style={{ width: `${bal.code === 'unpaid' ? Math.min(100, (remaining / 5) * 100) : Math.min(100, (remaining / maxVal) * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* APPLICATION FORM */}
          <div className="lg:col-span-2">
            <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-lg">
              <h2 className="text-sm font-bold text-white mb-4.5 flex items-center gap-1.5">
                <Send className="w-4 h-4 text-blue-400" /> New Leave Application
              </h2>
              <form onSubmit={handleApplyLeave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Leave Type</label>
                    <select
                      value={leaveType}
                      onChange={(e) => setLeaveType(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] text-white text-xs font-semibold rounded-lg focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                    >
                      <option value="casual">Casual Leave</option>
                      <option value="sick">Sick Leave</option>
                      <option value="annual">Annual Leave</option>
                      <option value="wfh">Work From Home</option>
                      <option value="comp_off">Comp Off</option>
                      <option value="unpaid">Unpaid Leave</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Leave Urgency</label>
                    <select
                      value={urgency}
                      onChange={(e) => setUrgency(e.target.value as any)}
                      className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] text-white text-xs font-semibold rounded-lg focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                    >
                      <option value="low">Low (Standard)</option>
                      <option value="medium">Medium</option>
                      <option value="high">High (Attention Needed)</option>
                      <option value="critical">Critical (Immediate Emergency)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] text-white text-xs font-semibold rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] text-white text-xs font-semibold rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Reason for Leave</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={4}
                    placeholder="Please state the reason for requesting leave..."
                    className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] text-white text-xs font-medium rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none placeholder-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Supporting Documents / Attachment</label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 px-4 py-2 bg-[#0d1117] border border-[#30363d] hover:border-slate-500 text-slate-300 hover:text-white rounded-lg text-xs font-semibold cursor-pointer transition-all">
                      <Paperclip className="w-3.5 h-3.5" /> 
                      {attachmentName ? 'Change File' : 'Attach File'}
                      <input 
                        type="file" 
                        onChange={handleFileChange}
                        className="hidden" 
                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                      />
                    </label>
                    {attachmentName && (
                      <span className="text-xs text-blue-400 font-mono flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" /> {attachmentName}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1.5">PDF, PNG, JPG, or DOC files accepted. Max limit 5MB.</p>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Submit Application
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MY LEAVES HISTORY TAB CONTENT */}
      {activeTab === 'history' && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden shadow-lg">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-2" />
              <p className="text-xs text-slate-400">Loading your history...</p>
            </div>
          ) : leaves.length === 0 ? (
            <div className="text-center py-16">
              <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-white">No Leave History</h3>
              <p className="text-xs text-slate-400 mt-1">You haven't submitted any leave requests yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-[#0d1117] border-b border-[#21262d] text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4.5">Leave Type</th>
                    <th className="py-3.5 px-4.5">Duration</th>
                    <th className="py-3.5 px-4.5">Total Days</th>
                    <th className="py-3.5 px-4.5">Reason</th>
                    <th className="py-3.5 px-4.5">Applied On</th>
                    <th className="py-3.5 px-4.5">Status</th>
                    <th className="py-3.5 px-4.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#21262d] text-xs">
                  {leaves.map((leave) => {
                    const days = countDays(leave.startDate, leave.endDate);
                    return (
                      <tr key={leave._id} className="hover:bg-[#1f242c] transition-colors">
                        <td className="py-3.5 px-4.5 font-bold text-white capitalize">
                          {getLeaveTypeLabel(leave.leaveType)}
                        </td>
                        <td className="py-3.5 px-4.5 text-slate-300">
                          {formatDate(leave.startDate)}
                          {' - '}
                          {formatDate(leave.endDate)}
                        </td>
                        <td className="py-3.5 px-4.5 font-semibold text-white">
                          {days} {days === 1 ? 'day' : 'days'}
                        </td>
                        <td className="py-3.5 px-4.5 text-slate-400 max-w-[200px] truncate" title={leave.reason}>
                          {leave.reason}
                        </td>
                        <td className="py-3.5 px-4.5 text-slate-500">
                          {leave.createdAt ? formatDate(leave.createdAt) : '-'}
                        </td>
                        <td className="py-3.5 px-4.5">
                          {getStatusBadge(leave.status)}
                        </td>
                        <td className="py-3.5 px-4.5 text-right">
                          {leave.status === 'pending' && (
                            <button
                              onClick={() => handleCancelLeave(leave._id)}
                              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                              title="Cancel Request"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* DETAIL MODAL: VIEW LEAVE REQUEST */}
      {selectedLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="bg-[#161b22] border border-[#30363d] w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#30363d] bg-[#0d1117]">
              <div>
                <h3 className="font-bold text-white">Leave Request Details</h3>
                <span className="text-[10px] font-mono text-slate-500 font-semibold">ID: {selectedLeave._id}</span>
              </div>
              <button 
                onClick={() => setSelectedLeave(null)}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Employee Summary */}
              <div className="flex items-center gap-3 bg-[#0d1117] border border-[#21262d] p-3 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center font-bold text-blue-400">
                  {selectedLeave.employeeName?.slice(0, 2) || 'EM'}
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">{selectedLeave.employeeName}</h4>
                  <p className="text-xs text-slate-500">{selectedLeave.employeeEmail}</p>
                </div>
                <span className="ml-auto text-xs bg-slate-800 px-2 py-0.5 rounded font-semibold text-slate-400 border border-[#30363d]">
                  {selectedLeave.department || 'Engineering'}
                </span>
              </div>

              {/* Leave Info Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-[#0d1117] border border-[#21262d] p-3 rounded-xl">
                  <span className="text-slate-500 font-semibold block text-[10px]">LEAVE TYPE</span>
                  <span className="font-bold text-white block mt-1 capitalize">{getLeaveTypeLabel(selectedLeave.leaveType)}</span>
                </div>
                <div className="bg-[#0d1117] border border-[#21262d] p-3 rounded-xl">
                  <span className="text-slate-500 font-semibold block text-[10px]">TOTAL DURATION</span>
                  <span className="font-bold text-white block mt-1">
                    {countDays(selectedLeave.startDate, selectedLeave.endDate)} days
                  </span>
                </div>
                <div className="bg-[#0d1117] border border-[#21262d] p-3 rounded-xl col-span-2 sm:col-span-1">
                  <span className="text-slate-500 font-semibold block text-[10px]">DATE RANGE</span>
                  <span className="font-bold text-white block mt-1">
                    {formatDate(selectedLeave.startDate)} - {formatDate(selectedLeave.endDate)}
                  </span>
                </div>
                <div className="bg-[#0d1117] border border-[#21262d] p-3 rounded-xl">
                  <span className="text-slate-500 font-semibold block text-[10px]">PRIORITY / URGENCY</span>
                  <span className="block mt-1">{getUrgencyBadge(selectedLeave.urgency || 'low')}</span>
                </div>
              </div>

              {/* Leave Reason */}
              <div className="bg-[#0d1117] border border-[#21262d] p-3 rounded-xl text-xs">
                <span className="text-slate-500 font-semibold block text-[10px] mb-1">REASON FOR APPLICATION</span>
                <p className="text-slate-300 font-medium leading-relaxed whitespace-pre-wrap">{selectedLeave.reason}</p>
              </div>

              {/* Rejection Remarks (If Rejected) */}
              {selectedLeave.status === 'rejected' && (
                <div className="bg-red-950/10 border border-red-500/20 p-3 rounded-xl text-xs">
                  <span className="text-red-400 font-bold block text-[10px] mb-1 uppercase tracking-wider">Rejection Remarks</span>
                  <p className="text-slate-300 font-medium italic">"{selectedLeave.remarks || 'No remarks provided'}"</p>
                  <span className="text-[9px] text-slate-500 font-semibold block mt-1.5">Rejected By: {selectedLeave.rejectedBy || 'Demo Admin'}</span>
                </div>
              )}

              {/* Attachment detail */}
              {selectedLeave.attachment && (
                <div className="flex items-center justify-between bg-[#0d1117] border border-[#21262d] p-3 rounded-xl text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Paperclip className="w-4 h-4 text-blue-400 shrink-0" />
                    <div>
                      <span className="font-bold block truncate max-w-[180px]">{selectedLeave.attachment}</span>
                      <span className="text-[9px] text-slate-500 font-mono">Size: 1.2 MB</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDownloadAttachment(selectedLeave.attachment || '')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-white rounded border border-[#30363d] transition-all text-[10px] font-bold"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-between p-4 bg-[#0d1117] border-t border-[#30363d]">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-semibold">STATUS:</span>
                {getStatusBadge(selectedLeave.status)}
              </div>
              
              <div className="flex gap-2">
                {selectedLeave.status === 'pending' ? (
                  <>
                    <button
                      onClick={() => handleReviewLeave(selectedLeave._id, 'approved')}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => handleReviewLeave(selectedLeave._id, 'rejected')}
                      className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" /> Reject
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setSelectedLeave(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-[#30363d] text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL: VIEW EMPLOYEE PROFILE */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="bg-[#161b22] border border-[#30363d] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#30363d] bg-[#0d1117]">
              <h3 className="font-bold text-white flex items-center gap-1.5"><User className="w-4 h-4 text-blue-400" /> Employee Profile</h3>
              <button 
                onClick={() => setSelectedEmployee(null)}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Content */}
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center font-bold text-blue-400 text-lg uppercase">
                  {selectedEmployee.name?.slice(0, 2) || 'EM'}
                </div>
                <div>
                  <h4 className="font-bold text-white text-base leading-tight">{selectedEmployee.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedEmployee.email}</p>
                  <span className="inline-block text-[9px] bg-blue-500/10 text-blue-400 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider mt-1.5 border border-blue-500/20">
                    {selectedEmployee.department}
                  </span>
                </div>
              </div>

              {/* Extra Details Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-[#0d1117] border border-[#21262d] p-3 rounded-xl">
                <div>
                  <span className="text-slate-500 block text-[9px] font-bold uppercase tracking-wider">Designation</span>
                  <span className="font-semibold text-white mt-0.5 block">{selectedEmployee.designation}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] font-bold uppercase tracking-wider">Employee ID</span>
                  <span className="font-mono text-white mt-0.5 block">{selectedEmployee.employeeId}</span>
                </div>
                <div className="mt-2">
                  <span className="text-slate-500 block text-[9px] font-bold uppercase tracking-wider">Contact Number</span>
                  <span className="font-semibold text-slate-300 mt-0.5 block">{selectedEmployee.phone}</span>
                </div>
                <div className="mt-2">
                  <span className="text-slate-500 block text-[9px] font-bold uppercase tracking-wider">Work Environment</span>
                  <span className="font-semibold text-emerald-400 mt-0.5 block uppercase">{selectedEmployee.workMode}</span>
                </div>
              </div>

              {/* Entitlement Summary */}
              <div className="space-y-3 pt-1">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Remaining Leave Quotas</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.keys(selectedEmployee.balances).map((key) => {
                    const balance = selectedEmployee.balances[key];
                    const taken = balance.taken;
                    const max = balance.max;
                    const remaining = max - taken;

                    return (
                      <div key={key} className="bg-[#0d1117] border border-[#21262d] p-2.5 rounded-xl flex items-center justify-between">
                        <div>
                          <span className="text-[9px] font-semibold text-slate-500 uppercase block">{key.replace('_', ' ')}</span>
                          <span className="font-bold text-white text-xs mt-1 block">
                            {key === 'unpaid' ? `${taken} taken` : `${remaining} left`}
                          </span>
                        </div>
                        {key !== 'unpaid' && (
                          <span className="text-[9px] font-bold bg-[#161b22] px-1.5 py-0.5 rounded border border-[#30363d]">of {max}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end p-4 bg-[#0d1117] border-t border-[#30363d]">
              <button
                onClick={() => setSelectedEmployee(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-[#30363d] text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaves;
