"use client";

import React, { useState, useEffect } from "react";
import { Member, ChurchEvent } from "@/lib/api";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "@/lib/firebase-error";
import { 
  Users, 
  Calendar, 
  Check, 
  Save, 
  Clock, 
  Search, 
  Award,
  ListTodo,
  Download,
  Printer,
  MessageSquare,
  Filter,
  CheckCircle,
  XCircle,
  Copy,
  FileSpreadsheet,
  AlertCircle
} from "lucide-react";

interface AttendanceModuleProps {
  members: Member[];
  events: ChurchEvent[];
  role: "admin" | "viewer";
}

export function AttendanceModule({ members, events, role }: AttendanceModuleProps) {
  const [selectedEventId, setSelectedEventId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [presentMembers, setPresentMembers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Advanced States
  const [selectedNetwork, setSelectedNetwork] = useState("");
  const [selectedMinistry, setSelectedMinistry] = useState("");
  const [currentTab, setCurrentTab] = useState<"all" | "present" | "absent">("all");
  const [copiedMemberId, setCopiedMemberId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Active member list
  const activeMembers = members.filter(m => m.membershipStatus === "Active");

  // Get list of unique networks and ministries from active members
  const availableNetworks = Array.from(new Set(activeMembers.map(m => m.network).filter(Boolean))) as string[];
  const availableMinistries = Array.from(new Set(activeMembers.map(m => m.ministry).filter(Boolean))) as string[];

  // Toast Auto-dismiss
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Load attendance when event is selected
  useEffect(() => {
    let active = true;
    const loadAttendance = async () => {
      if (!selectedEventId) {
        setTimeout(() => {
          if (active) setPresentMembers([]);
        }, 0);
        return;
      }
      setIsLoading(true);
      try {
        const attendanceDocRef = doc(db, "attendance", selectedEventId);
        const snapshot = await getDoc(attendanceDocRef).catch((err) => {
          handleFirestoreError(err, OperationType.GET, `attendance/${selectedEventId}`);
        });
        if (!active) return;
        if (snapshot.exists()) {
          setPresentMembers(snapshot.data().presentMembers || []);
        } else {
          setPresentMembers([]);
        }
      } catch (err) {
        console.error("Error loading attendance", err);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadAttendance();
    return () => {
      active = false;
    };
  }, [selectedEventId]);

  const handleToggleAttendance = (memberId: string) => {
    if (role !== "admin") return;
    setPresentMembers((prev) => {
      if (prev.includes(memberId)) {
        return prev.filter((id) => id !== memberId);
      } else {
        return [...prev, memberId];
      }
    });
  };

  const handleSelectAll = () => {
    if (role !== "admin") return;
    const filteredIds = filteredMembers.map(m => m.id!);
    
    setPresentMembers((prev) => {
      // Toggle only the ones currently visible in the filtered list!
      const containsAll = filteredIds.every(id => prev.includes(id));
      if (containsAll) {
        // Uncheck only the filtered ones
        return prev.filter(id => !filteredIds.includes(id));
      } else {
        // Add only the filtered ones
        const unique = new Set([...prev, ...filteredIds]);
        return Array.from(unique);
      }
    });

    setToast({
      message: `Toggled marking all shown members on this view.`,
      type: "info"
    });
  };

  const handleSaveAttendance = async () => {
    if (!selectedEventId) return;
    setIsSaving(true);
    try {
      const attendanceDocRef = doc(db, "attendance", selectedEventId);
      await setDoc(attendanceDocRef, {
        eventId: selectedEventId,
        presentMembers,
        updatedAt: serverTimestamp(),
      }).catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, `attendance/${selectedEventId}`);
      });
      setToast({
        message: "Attendance sheet successfully saved and synced to database.",
        type: "success"
      });
    } catch (err: any) {
      console.error(err);
      setToast({
        message: `Failed to save attendance logs: ${err?.message || err}`,
        type: "error"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportCSV = () => {
    if (!selectedEvent) return;
    
    try {
      const headers = ["Member Name", "Membership ID", "Cell Network Group", "Ministry Team", "Attendance Status"];
      const rows = activeMembers.map(m => {
        const isPresent = presentMembers.includes(m.id!);
        return [
          `"${m.lastName}, ${m.firstName}"`,
          m.membershipId ? `"${m.membershipId}"` : '"—"',
          m.network ? `"${m.network}"` : '"None"',
          m.ministry ? `"${m.ministry}"` : '"None"',
          isPresent ? "Present" : "Absent"
        ];
      });

      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
        + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      
      const eventDateStr = new Date(selectedEvent.eventDate).toISOString().split('T')[0];
      const fileName = `Attendance_${selectedEvent.eventName.replace(/[^a-z0-9]/gi, '_')}_${eventDateStr}.csv`;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setToast({
        message: "Attendance CSV log generated and downloaded successfully.",
        type: "success"
      });
    } catch (err) {
      console.error("Export failed", err);
      setToast({
        message: "Failed to generate CSV download.",
        type: "error"
      });
    }
  };

  const handleCopyFollowup = (member: Member) => {
    if (!selectedEvent) return;
    const text = `Hi ${member.firstName}! We missed you at our ${selectedEvent.eventName} today at Subic Church of Christ. We hope everything is well with you. Let us know if we can assist or pray for you! God bless!`;
    
    try {
      navigator.clipboard.writeText(text);
      setCopiedMemberId(member.id || null);
      setToast({
        message: `Saved reminder template for ${member.firstName} to clipboard! Ready to send.`,
        type: "success"
      });
      setTimeout(() => setCopiedMemberId(null), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  // Filter members based on search terms, network, ministry, and current active selection tab
  const filteredMembers = activeMembers.filter((m) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = (
      m.firstName.toLowerCase().includes(term) ||
      m.lastName.toLowerCase().includes(term) ||
      (m.membershipId && m.membershipId.toLowerCase().includes(term))
    );

    const matchesNetwork = selectedNetwork ? m.network === selectedNetwork : true;
    const matchesMinistry = selectedMinistry ? m.ministry === selectedMinistry : true;

    // Filter by tab selection
    const isPresent = presentMembers.includes(m.id!);
    const matchesTab = currentTab === "all" 
      ? true 
      : currentTab === "present" 
        ? isPresent 
        : !isPresent;

    return matchesSearch && matchesNetwork && matchesMinistry && matchesTab;
  });

  const selectedEvent = events.find(e => e.id === selectedEventId);
  const percentAttendance = activeMembers.length > 0 
    ? Math.round((presentMembers.length / activeMembers.length) * 100) 
    : 0;  return (
    <div className="space-y-6 relative">
      {/* Floating Toast Notification */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border animate-in slide-in-from-bottom-5 duration-300 ${
          toast.type === "success" 
            ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
            : toast.type === "error" 
              ? "bg-rose-50 border-rose-200 text-rose-800" 
              : "bg-blue-50 border-blue-200 text-blue-800"
        }`}>
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-150 pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-indigo-500" />
            Attendance Tracker
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Track and log attendance of church members for schedules and services
          </p>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-500">
          <div className="max-w-md mx-auto space-y-3">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto" />
            <h4 className="text-base font-bold text-gray-800">No Scheduled Events</h4>
            <p className="text-sm text-gray-400">
              Please register or schedule an event under &quot;Church Events&quot; on the Home dashboard before tracking attendance.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Event Selector */}
          <div className="lg:col-span-1 bg-white border border-gray-200 rounded-xl p-4 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-widest flex items-center gap-1.5 grayscale opacity-80">
              <Calendar className="w-4 h-4 text-indigo-500" /> Select Schedule
            </h3>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {events.map((e) => {
                const isSelected = e.id === selectedEventId;
                const formattedDate = new Date(e.eventDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric"
                });
                return (
                  <button
                    key={e.id}
                    onClick={() => {
                      setSelectedEventId(e.id!);
                      setCurrentTab("all"); // Reset list filter tab on event change
                    }}
                    className={`w-full text-left p-3 rounded-lg border transition-all flex flex-col gap-1 cursor-pointer ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/50 shadow-sm font-semibold"
                        : "border-gray-150 hover:border-indigo-300 hover:bg-gray-50/50 text-gray-700"
                    }`}
                  >
                    <span className="text-xs font-bold text-gray-900 leading-tight">{e.eventName}</span>
                    <span className="text-[10px] text-gray-500 font-medium">{formattedDate}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main - Attendance Sheets */}
          <div className="lg:col-span-3 bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden flex flex-col">
            {selectedEventId ? (
              <>
                {/* Event Summary stats */}
                <div className="bg-gray-100/50 border-b border-gray-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-5">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-widest bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                      Active Event Logs
                    </span>
                    <h3 className="text-[15px] font-bold text-gray-950">{selectedEvent?.eventName}</h3>
                    <p className="text-xs text-gray-500 tracking-tight">
                      Schedules: {selectedEvent && new Date(selectedEvent.eventDate).toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Stats */}
                    <div className="bg-white border border-gray-200 px-3.5 py-2 rounded-xl flex items-center gap-2.5 shadow-xs">
                      <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      <div className="text-left">
                        <p className="text-[9px] uppercase font-bold text-gray-400">Present</p>
                        <p className="text-xs font-extrabold text-gray-900 leading-none mt-0.5">
                          {presentMembers.length}
                        </p>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 px-3.5 py-2 rounded-xl flex items-center gap-2.5 shadow-xs">
                      <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                      <div className="text-left">
                        <p className="text-[9px] uppercase font-bold text-gray-400">Absent</p>
                        <p className="text-xs font-extrabold text-gray-900 leading-none mt-0.5">
                          {activeMembers.length - presentMembers.length}
                        </p>
                      </div>
                    </div>

                    <div className="bg-indigo-50/50 border border-indigo-100 px-3.5 py-2 rounded-xl flex items-center gap-2.5 shadow-xs">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      <div className="text-left">
                        <p className="text-[9px] uppercase font-bold text-indigo-400 leading-none">Rate</p>
                        <p className="text-xs font-extrabold text-indigo-700 leading-none mt-0.5">{percentAttendance}%</p>
                      </div>
                    </div>

                    {/* Export / Print */}
                    <div className="flex gap-1.5 ml-1.5 border-l border-gray-200 pl-2.5">
                      <button
                        onClick={handleExportCSV}
                        title="Export current attendance list to CSV file"
                        className="p-2 border border-gray-200 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer bg-white transition"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => window.print()}
                        title="Print this sheet or download as PDF"
                        className="p-2 border border-gray-200 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer bg-white transition"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Filters Row */}
                <div className="px-5 py-4 bg-gray-50/40 border-b border-gray-150 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 tracking-wide uppercase mr-1 flex-shrink-0">
                    <Filter className="w-3.5 h-3.5 text-gray-400" />
                    Filters
                  </div>

                  <select
                    value={selectedNetwork}
                    onChange={(e) => setSelectedNetwork(e.target.value)}
                    className="text-xs font-semibold bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500 text-gray-700 max-w-[150px] cursor-pointer"
                  >
                    <option value="">All Networks</option>
                    {availableNetworks.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>

                  <select
                    value={selectedMinistry}
                    onChange={(e) => setSelectedMinistry(e.target.value)}
                    className="text-xs font-semibold bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500 text-gray-700 max-w-[150px] cursor-pointer"
                  >
                    <option value="">All Ministries</option>
                    {availableMinistries.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>

                  {(selectedNetwork || selectedMinistry) && (
                    <button
                      onClick={() => {
                        setSelectedNetwork("");
                        setSelectedMinistry("");
                      }}
                      className="text-[10px] text-rose-600 hover:underline font-bold uppercase tracking-wider cursor-pointer"
                    >
                      Clear Group Filters
                    </button>
                  )}
                </div>

                {/* Search & Actions Toolbar */}
                <div className="p-4 border-b border-gray-150 flex flex-col md:flex-row md:items-center gap-3">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search shown names or membership IDs..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 w-full md:w-auto">
                    {/* View Tabs */}
                    <div className="flex bg-gray-100 p-1 rounded-lg text-xs font-bold shrink-0 shadow-inner border border-gray-200">
                      <button
                        onClick={() => setCurrentTab("all")}
                        className={`px-3 py-1.5 rounded-md cursor-pointer transition ${
                          currentTab === "all" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        All ({activeMembers.filter(m => {
                          const filterNetwork = selectedNetwork ? m.network === selectedNetwork : true;
                          const filterMinistry = selectedMinistry ? m.ministry === selectedMinistry : true;
                          return filterNetwork && filterMinistry;
                        }).length})
                      </button>
                      <button
                        onClick={() => setCurrentTab("present")}
                        className={`px-3 py-1.5 rounded-md cursor-pointer transition flex items-center gap-1.5 ${
                          currentTab === "present" ? "bg-white text-indigo-700 shadow-xs" : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        Present ({presentMembers.filter(id => {
                          const m = activeMembers.find(mem => mem.id === id);
                          if (!m) return false;
                          const filterNetwork = selectedNetwork ? m.network === selectedNetwork : true;
                          const filterMinistry = selectedMinistry ? m.ministry === selectedMinistry : true;
                          return filterNetwork && filterMinistry;
                        }).length})
                      </button>
                      <button
                        onClick={() => setCurrentTab("absent")}
                        className={`px-3 py-1.5 rounded-md cursor-pointer transition flex items-center gap-1.5 ${
                          currentTab === "absent" ? "bg-white text-orange-700 shadow-xs" : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        Absent ({activeMembers.filter(m => !presentMembers.includes(m.id!)).filter(m => {
                          const filterNetwork = selectedNetwork ? m.network === selectedNetwork : true;
                          const filterMinistry = selectedMinistry ? m.ministry === selectedMinistry : true;
                          return filterNetwork && filterMinistry;
                        }).length})
                      </button>
                    </div>

                    {role === "admin" && (
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={handleSelectAll}
                          title="Select/Unselect everyone currently visible under this tab and filter"
                          className="px-3.5 py-2 border border-gray-350 rounded-lg text-xs font-bold text-gray-750 bg-white hover:bg-gray-50 transition cursor-pointer"
                        >
                          Toggle Selected
                        </button>
                        <button
                          onClick={handleSaveAttendance}
                          disabled={isSaving}
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-750 text-white text-xs font-bold rounded-lg transition disabled:opacity-50 cursor-pointer shadow-md shadow-indigo-600/10"
                        >
                          <Save className="w-3.5 h-3.5" />
                          {isSaving ? "Saving..." : "Save Log"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {isLoading ? (
                  <div className="p-16 text-center text-sm text-gray-400">Loading attendance sheet...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-150">
                      <thead className="bg-gray-50/50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Member Name</th>
                          <th scope="col" className="px-6 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Membership ID</th>
                          <th scope="col" className="px-6 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Cell Group / Network</th>
                          <th scope="col" className="px-6 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Ministry service</th>
                          <th scope="col" className="px-6 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                          <th scope="col" className="px-6 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {filteredMembers.map((m) => {
                          const isPresent = presentMembers.includes(m.id!);
                          return (
                            <tr
                              key={m.id}
                              onClick={() => handleToggleAttendance(m.id!)}
                              className={`transition-colors cursor-pointer select-none ${
                                isPresent ? "bg-indigo-50/10 hover:bg-indigo-50/25" : "hover:bg-gray-50"
                              }`}
                            >
                              <td className="px-6 py-3 whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold tracking-wider ${
                                    isPresent ? "bg-indigo-100 text-indigo-700 font-extrabold" : "bg-gray-100 text-gray-650"
                                  }`}>
                                    {m.firstName[0]}{m.lastName[0]}
                                  </div>
                                  <div>
                                    <span className="text-sm font-semibold text-gray-900 block leading-tight">
                                      {m.lastName}, {m.firstName}
                                    </span>
                                    {m.email && (
                                      <span className="text-[10px] text-gray-400 mt-0.5 block">{m.email}</span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap text-xs font-mono text-gray-500">
                                {m.membershipId || "—"}
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap">
                                {m.network ? (
                                  <span className="text-xs bg-slate-50 text-slate-700 border border-slate-100 px-2 py-0.5 rounded-lg font-medium">
                                    {m.network}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-350 italic">None</span>
                                )}
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap">
                                {m.ministry ? (
                                  <span className="text-xs bg-indigo-50/50 text-indigo-700 border border-indigo-100/40 px-2 py-0.5 rounded-lg font-medium">
                                    {m.ministry}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-350 italic">None</span>
                                )}
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap text-center">
                                <span
                                  className={`h-6 px-3 inline-flex items-center justify-center rounded-full text-xs font-bold border transition-all ${
                                    isPresent
                                      ? "bg-green-50 text-green-700 border-green-200"
                                      : "bg-gray-50 text-gray-400 border-gray-200"
                                  }`}
                                >
                                  {isPresent ? "Present" : "Absent"}
                                </span>
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap text-right">
                                <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                  {!isPresent ? (
                                    <button
                                      type="button"
                                      onClick={() => handleCopyFollowup(m)}
                                      title="Copy SMS/Messenger follow-up template"
                                      className={`p-1.5 border rounded-lg transition-colors cursor-pointer text-xs font-semibold flex items-center justify-center gap-1 ${
                                        copiedMemberId === m.id
                                          ? "bg-emerald-50 text-emerald-600 border-emerald-250 animate-bounce"
                                          : "bg-white border-gray-200 hover:border-indigo-300 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50"
                                      }`}
                                    >
                                      <MessageSquare className="w-3.5 h-3.5" />
                                      <span className="text-[10px] hidden sm:inline">
                                        {copiedMemberId === m.id ? "Copied" : "Log template"}
                                      </span>
                                    </button>
                                  ) : (
                                    <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mr-2">
                                      <Check className="w-3 h-3" /> Safe
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredMembers.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-6 py-16 text-center text-gray-400 text-sm">
                              <div className="max-w-xs mx-auto space-y-2">
                                <Users className="w-8 h-8 text-gray-300 mx-auto" />
                                <p className="font-bold text-gray-800">No Members Match Search / Tab Filter</p>
                                <p className="text-xs text-gray-400">
                                  Try resetting selected groups, changing the text search query, or checking a different status tab.
                                </p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <div className="p-16 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
                <Users className="w-12 h-12 text-gray-300" />
                <h4 className="text-base font-bold text-gray-800">No Schedule Selected</h4>
                <p className="text-sm text-gray-400 max-w-sm">
                  Please select an event from the panel on the left to load, manage, or record the attendance sheet.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
