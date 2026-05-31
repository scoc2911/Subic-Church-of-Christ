"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { 
  subscribeToMembers, 
  createMember, 
  updateMember, 
  deleteMember, 
  Member, 
  subscribeToNetworks, 
  Network, 
  Ministry, 
  subscribeToMinistries, 
  ChurchEvent, 
  subscribeToEvents, 
  createEvent, 
  updateEvent, 
  deleteEvent 
} from "@/lib/api";
import { MemberForm, calculateAge } from "@/components/MemberForm";
import { Logo } from "@/components/Logo";
import { ConfirmModal } from "@/components/ConfirmModal";
import * as Dialog from "@radix-ui/react-dialog";
import { 
  PlusIcon, 
  Pencil1Icon, 
  TrashIcon, 
  CalendarIcon, 
  ClockIcon 
} from "@radix-ui/react-icons";

// Premium Module Imports
import { DashboardModule } from "@/components/DashboardModule";
import { MemberDirectoryModule } from "@/components/MemberDirectoryModule";
import { BaptismRecordsModule } from "@/components/BaptismRecordsModule";
import { AttendanceModule } from "@/components/AttendanceModule";
import { ReportsModule } from "@/components/ReportsModule";
import { MinistriesModule } from "@/components/MinistriesModule";
import { NetworksModule } from "@/components/NetworksModule";
import { UserManagementModule } from "@/components/UserManagementModule";
import { SystemSettingsModule } from "@/components/SystemSettingsModule";

// Lucide Icons
import { 
  LayoutDashboard, 
  Users, 
  Droplet, 
  ListTodo, 
  FilePieChart, 
  Building, 
  Layers, 
  ShieldCheck, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  AlertCircle,
  Calendar,
  CalendarDays
} from "lucide-react";

type ActiveTab = 
  | "dashboard"
  | "members"
  | "baptisms"
  | "attendance"
  | "reports"
  | "ministries"
  | "networks"
  | "users"
  | "settings";

const calculateCountdown = (dateString: string): { text: string; passed: boolean } => {
  const eventDate = new Date(dateString).getTime();
  if (isNaN(eventDate)) return { text: "Invalid date", passed: false };
  const now = new Date().getTime();
  const distance = eventDate - now;

  if (distance < 0) {
    return { text: "Completed", passed: true };
  }

  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return { text: `${days}d ${hours}h left`, passed: false };
  }
  if (hours > 0) {
    return { text: `${hours}h ${minutes}m left`, passed: false };
  }
  return { text: `${minutes}m left`, passed: false };
};

export default function Home() {
  const { user, role, loading, isLoggingIn, loginError, login, logout } = useAuth();
  
  // Real-time Firestore Subscribed States
  const [members, setMembers] = useState<Member[]>([]);
  const [networks, setNetworks] = useState<Network[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [events, setEvents] = useState<ChurchEvent[]>([]);

  // Layout & Navigation State
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Modals States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  // Event Scheduler modal state (Compatible with original flow)
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [newEventName, setNewEventName] = useState("");
  const [newEventDate, setNewEventDate] = useState("");
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [isSavingEvent, setIsSavingEvent] = useState(false);

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: "", description: "", onConfirm: () => {} });

  // Subscriptions hooks
  useEffect(() => {
    if (user && role) {
      const unsubscribe = subscribeToMembers((data) => {
        setMembers(data);

        // Auto-update missing or incorrect age in database
        if (role === "admin") {
          data.forEach(async (member) => {
            if (member.birthday) {
              const currentAge = member.age;
              const correctAge = calculateAge(member.birthday);
              if (correctAge !== undefined && correctAge !== currentAge) {
                try {
                  await updateMember(member.id!, { age: correctAge });
                } catch (err) {
                  console.error("Failed to auto-update age", err);
                }
              }
            }
          });
        }
      });
      return () => unsubscribe();
    }
  }, [user, role]);

  useEffect(() => {
    if (user && role) {
      const unsubscribe = subscribeToNetworks((data) => {
        setNetworks(data);
      });
      return () => unsubscribe();
    }
  }, [user, role]);

  useEffect(() => {
    if (user && role) {
      const unsubscribe = subscribeToMinistries((data) => {
        setMinistries(data);
      });
      return () => unsubscribe();
    }
  }, [user, role]);

  useEffect(() => {
    if (user && role) {
      const unsubscribe = subscribeToEvents((data) => {
        setEvents(data);
      });
      return () => unsubscribe();
    }
  }, [user, role]);

  // Auth gate checks
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50 flex-col gap-4">
        <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-gray-500 font-semibold uppercase tracking-wider animate-pulse">Loading Workspace Module...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-gray-150 flex flex-col items-center">
          <Logo size={80} className={`mb-4 text-blue-600 ${isLoggingIn ? "animate-pulse" : ""}`} />
          <h1 className="text-2xl font-black text-gray-950 mb-1 text-center tracking-tight">SUBIC CHURCH OF CHRIST</h1>
          <p className="text-gray-400 mb-8 text-center text-sm font-semibold uppercase tracking-widest">Digital Board & Registry</p>
          
          <button
            onClick={login}
            disabled={isLoggingIn}
            className={`w-full h-12 bg-blue-600 text-white rounded-lg font-bold transition flex items-center justify-center gap-2.5 shadow-md shadow-blue-600/10 ${
              isLoggingIn ? "opacity-60 cursor-not-allowed" : "hover:bg-blue-700 cursor-pointer"
            }`}
          >
            {isLoggingIn ? (
              <span className="flex items-center gap-2 font-semibold">
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Connecting Google Account...
              </span>
            ) : "Sign in with Google Account"}
          </button>

          {loginError && (
            <div className="mt-6 p-4 rounded-xl bg-orange-50 border border-orange-200 text-orange-850 text-xs leading-relaxed space-y-1.5 animate-in fade-in duration-200">
              <p className="font-extrabold uppercase tracking-wider text-[10px] text-orange-700">Popup Action Required</p>
              <p className="text-gray-700">{loginError}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (role !== "admin" && role !== "viewer") {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 p-4 flex-col gap-4">
        <div className="bg-orange-100 text-orange-600 rounded-full h-16 w-16 flex items-center justify-center mb-2 shadow-inner">
          <AlertCircle className="w-8 h-8" />
        </div>
        <p className="text-xl font-bold text-gray-800 tracking-tight">Access Approval Expected</p>
        <p className="text-gray-400 text-center max-w-sm text-sm">
          Your account (<span className="font-bold text-gray-700">{user.email}</span>) must be approved by SCOC administrators to view or record data details.
        </p>
        <button onClick={logout} className="text-blue-600 font-bold hover:underline mt-4 text-sm cursor-pointer">
          Sign out of Google
        </button>
      </div>
    );
  }

  // Member Save Submit Handler
  const handleMemberSubmit = async (data: Omit<Member, "id" | "createdAt" | "updatedAt">) => {
    setIsSaving(true);
    try {
      if (editingMember) {
        await updateMember(editingMember.id!, data);
        alert("Member profile successfully updated.");
      } else {
        await createMember(data);
        alert("New member profile created successfully.");
      }
      setIsFormModalOpen(false);
    } catch (err) {
      console.error(err);
      alert("Failed to save member.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditMember = (member: Member) => {
    setEditingMember(member);
    setIsFormModalOpen(true);
  };

  const handleDeleteMember = (id: string, name: string) => {
    setConfirmConfig({
      isOpen: true,
      title: "Delete Member Record",
      description: `Are you absolutely sure you want to permanently delete the profile of ${name}? This query is irreversible.`,
      onConfirm: async () => {
        try {
          await deleteMember(id);
        } catch (err) {
          console.error(err);
          alert("Failed to delete member.");
        }
      }
    });
  };

  // Event Scheduler Submit Handlers
  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventName.trim() || !newEventDate) {
      alert("Both Event Name and Date are required.");
      return;
    }

    setIsSavingEvent(true);
    try {
      const formattedName = newEventName.trim().toUpperCase();
      if (editingEventId) {
        await updateEvent(editingEventId, {
          eventName: formattedName,
          eventDate: newEventDate
        });
        setEditingEventId(null);
      } else {
        await createEvent({
          eventName: formattedName,
          eventDate: newEventDate
        });
      }
      setNewEventName("");
      setNewEventDate("");
    } catch (err) {
      console.error(err);
      alert("Failed to schedule event.");
    } finally {
      setIsSavingEvent(false);
    }
  };

  const handleEditEvent = (evt: ChurchEvent) => {
    setEditingEventId(evt.id!);
    setNewEventName(evt.eventName);
    setNewEventDate(evt.eventDate);
  };

  const handleCancelEditEvent = () => {
    setEditingEventId(null);
    setNewEventName("");
    setNewEventDate("");
  };

  const handleDeleteEvent = (id: string, name: string) => {
    setConfirmConfig({
      isOpen: true,
      title: "Delete Event Schedule",
      description: `Are you sure you want to delete the scheduled event "${name}"? Details containing historical logs will remain unaffected.`,
      onConfirm: async () => {
        try {
          await deleteEvent(id);
          if (editingEventId === id) {
            handleCancelEditEvent();
          }
        } catch (err) {
          console.error(err);
          alert("Failed to delete scheduled event.");
        }
      }
    });
  };

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, adminOnly: false },
    { id: "members", label: "Registry Directory", icon: Users, adminOnly: false },
    { id: "baptisms", label: "Baptismal Registry", icon: Droplet, adminOnly: false },
    { id: "attendance", label: "Attendance Tracker", icon: ListTodo, adminOnly: false },
    { id: "reports", label: "Demographics & Reports", icon: FilePieChart, adminOnly: false },
    { id: "ministries", label: "Ministries", icon: Building, adminOnly: true },
    { id: "networks", label: "Networks", icon: Layers, adminOnly: true },
    { id: "users", label: "Access Rights", icon: ShieldCheck, adminOnly: true },
    { id: "settings", label: "System Setup", icon: Settings, adminOnly: true },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row print:bg-white text-gray-800">
      
      {/* SIDEBAR NAVIGATION PANEL (Desktop) */}
      <aside className="w-68 bg-white border-r border-gray-150 flex-col justify-between hidden md:flex shrink-0 print:hidden select-none">
        <div>
          {/* Logo Brand Header */}
          <div className="h-16 px-5 border-b border-gray-100 flex items-center gap-2.5">
            <Logo size={36} className="text-blue-600" />
            <div>
              <span className="text-sm font-black text-gray-950 uppercase tracking-tight block">SCOC Admin</span>
              <span className="text-[9px] text-gray-400 font-extrabold uppercase tracking-widest block leading-none">Database Console</span>
            </div>
          </div>

          {/* Nav Items Link List */}
          <nav className="p-4 space-y-1">
            {menuItems.map((item) => {
              if (item.adminOnly && role !== "admin") return null;
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-lg text-xs font-bold transition-all border outline-none cursor-pointer ${
                    isActive
                      ? "bg-blue-50/70 border-blue-100 text-blue-700 shadow-2xs"
                      : "bg-transparent border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-blue-600" : "text-gray-400"}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Identity Panel */}
        <div className="p-4 border-t border-gray-100 space-y-3 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs rounded-full border border-blue-200">
              {user.displayName?.[0] || user.email?.[0] || "U"}
            </div>
            <div className="truncate flex-1">
              <span className="text-xs font-black text-gray-950 leading-tight block truncate">
                {user.displayName || user.email?.split("@")[0]}
              </span>
              <span className="text-[10px] text-blue-600 font-extrabold uppercase mt-0.5 inline-block leading-none">
                {role} account
              </span>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2 border border-gray-200 hover:border-red-200 text-gray-500 hover:text-red-600 hover:bg-red-50 font-bold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer bg-white"
          >
            <LogOut className="w-3.5 h-3.5" /> Log Out Portal
          </button>
        </div>
      </aside>

      {/* MOBILE HEADER NAVIGATION */}
      <header className="h-16 bg-white border-b border-gray-200 px-4 flex items-center justify-between md:hidden print:hidden shrink-0">
        <div className="flex items-center gap-2">
          <Logo size={32} className="text-blue-600" />
          <h1 className="text-sm font-black text-gray-950 tracking-tight uppercase">SCOC Console</h1>
        </div>

        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 hover:bg-gray-50 rounded-lg text-gray-600 border border-gray-200 cursor-pointer"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* MOBILE NAVIGATION DROPDOWN DRAWER */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 top-16 bg-gray-950/20 backdrop-blur-xs z-50 md:hidden flex flex-col justify-start print:hidden">
          <div className="bg-white border-b border-gray-200 py-3.5 px-4 space-y-1 animate-slide-down">
            {menuItems.map((item) => {
              if (item.adminOnly && role !== "admin") return null;
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-bold cursor-pointer ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </button>
              );
            })}
            <div className="pt-3.5 mt-3 border-t border-gray-100 flex items-center justify-between gap-4">
              <span className="text-[10px] text-gray-400 font-bold uppercase truncate">{user.email}</span>
              <button
                onClick={logout}
                className="text-orange-600 hover:underline text-xs font-bold select-none cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WORKSPACE VIEW CONTAINER */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-start print:p-0">
        
        {/* Dynamic Route View Switching */}
        {activeTab === "dashboard" && (
          <DashboardModule
            members={members}
            events={events}
            ministries={ministries}
            networks={networks}
            role={role}
            onNavigate={(view) => setActiveTab(view)}
            onOpenQuickAdd={() => {
              setEditingMember(undefined);
              setIsFormModalOpen(true);
            }}
            onOpenEventModal={() => setIsEventModalOpen(true)}
          />
        )}

        {activeTab === "members" && (
          <MemberDirectoryModule
            members={members}
            networks={networks}
            ministries={ministries}
            role={role}
            onAddMemberClick={() => {
              setEditingMember(undefined);
              setIsFormModalOpen(true);
            }}
            onEditMemberClick={handleEditMember}
            onDeleteMemberClick={handleDeleteMember}
            onOpenMinistryPanel={() => setActiveTab("ministries")}
            onOpenNetworkPanel={() => setActiveTab("networks")}
            onOpenEventPanel={() => setIsEventModalOpen(true)}
          />
        )}

        {activeTab === "baptisms" && (
          <BaptismRecordsModule
            members={members}
            role={role}
          />
        )}

        {activeTab === "attendance" && (
          <AttendanceModule
            members={members}
            events={events}
            role={role}
          />
        )}

        {activeTab === "reports" && (
          <ReportsModule
            members={members}
          />
        )}

        {activeTab === "ministries" && role === "admin" && (
          <div className="space-y-6">
            <div className="border-b border-gray-150 pb-3">
              <h2 className="text-xl font-bold text-gray-900">Manage Ministries</h2>
              <p className="text-xs text-gray-500 mt-1">Configure and assign heads for active church ministry departments</p>
            </div>
            <MinistriesModule
              ministries={ministries}
              members={members}
              onConfirmAction={(cfg) => setConfirmConfig({ isOpen: true, ...cfg })}
            />
          </div>
        )}

        {activeTab === "networks" && role === "admin" && (
          <div className="space-y-6">
            <div className="border-b border-gray-150 pb-3">
              <h2 className="text-xl font-bold text-gray-900">Manage Cell Networks</h2>
              <p className="text-xs text-gray-500 mt-1">Configure and segment network leaders and clusters</p>
            </div>
            <NetworksModule
              networks={networks}
              members={members}
              onConfirmAction={(cfg) => setConfirmConfig({ isOpen: true, ...cfg })}
            />
          </div>
        )}

        {activeTab === "users" && role === "admin" && (
          <UserManagementModule
            currentAdminEmail="scoc2911@gmail.com"
          />
        )}

        {activeTab === "settings" && role === "admin" && (
          <SystemSettingsModule />
        )}

        {/* DIALOG FORM MODAL: ADD / EDIT MEMBER */}
        <Dialog.Root open={isFormModalOpen} onOpenChange={setIsFormModalOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-gray-950/40 backdrop-blur-xs z-50 transition-opacity" />
            <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-h-[90vh] w-[95vw] max-w-[850px] rounded-2xl bg-white p-6 shadow-2xl z-50 overflow-y-auto outline-none transition-transform animate-scale-up">
              <Dialog.Title className="text-lg font-black text-gray-950 mb-1 border-b border-gray-100 pb-3 uppercase tracking-tight">
                {editingMember ? "Edit Member Profile" : "Register New Member Profile"}
              </Dialog.Title>
              
              <div className="mt-4">
                <MemberForm
                  initialData={editingMember}
                  onSubmit={handleMemberSubmit}
                  onCancel={() => setIsFormModalOpen(false)}
                  isSaving={isSaving}
                  networks={networks}
                  ministries={ministries}
                />
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* EVENT MODAL: SCHEDULE CHURCH LOGS */}
        <Dialog.Root open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-gray-950/40 backdrop-blur-xs z-50 transition-opacity animate-fade-in" />
            <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-h-[85vh] w-[95vw] max-w-[600px] rounded-2xl bg-white p-6 shadow-2xl z-50 overflow-y-auto outline-none transition-transform animate-scale-up">
              <Dialog.Title className="text-lg font-black text-gray-950 mb-1 border-b border-gray-100 pb-3 uppercase tracking-tight flex items-center gap-1.5">
                <CalendarDays className="w-5 h-5 text-blue-600" />
                Schedules & Events Logs
              </Dialog.Title>
              
              {/* Event Form */}
              <form onSubmit={handleAddEvent} className="bg-gray-50 border border-gray-200 rounded-xl p-4.5 mt-4 mb-6 space-y-3.5 shadow-sm">
                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-widest">
                  {editingEventId ? "Edit Scheduled Event" : "Create Calendar Log"}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                     <label className="text-xs font-bold text-gray-600 block">Event Name *</label>
                     <input
                       type="text"
                       placeholder="E.G. WORSHIP SERVICE"
                       value={newEventName}
                       onChange={(e) => setNewEventName(e.target.value)}
                       required
                       className="w-full text-sm bg-white border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 uppercase font-semibold"
                     />
                  </div>
                  <div className="space-y-1">
                     <label className="text-xs font-bold text-gray-600 block">Scheduled Date & Time *</label>
                     <input
                       type="datetime-local"
                       value={newEventDate}
                       onChange={(e) => setNewEventDate(e.target.value)}
                       required
                       className="w-full text-sm bg-white border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                     />
                  </div>
                </div>
                <div className="flex justify-end pt-2 gap-2">
                  {editingEventId && (
                    <button
                      type="button"
                      onClick={handleCancelEditEvent}
                      className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-50 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                     type="submit"
                     disabled={isSavingEvent}
                     className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
                  >
                     {isSavingEvent ? "Saving..." : (editingEventId ? "Update Schedule" : "Add Schedule")}
                  </button>
                </div>
              </form>

              {/* Event List */}
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-widest mb-3">Recorded Event Lists ({events.length})</h3>
              {events.length > 0 ? (
                <div className="max-h-[30vh] overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100 bg-white">
                  {events.map((evt) => {
                    const countdown = calculateCountdown(evt.eventDate);
                    return (
                      <div key={evt.id} className={`flex items-center justify-between p-3.5 hover:bg-gray-50/50 transition-colors ${countdown.passed ? 'opacity-60' : ''}`}>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-bold text-gray-900 leading-tight">{evt.eventName}</p>
                          <p className="text-[10px] text-gray-400 font-bold flex items-center gap-1 mt-1 uppercase tracking-wide">
                            <ClockIcon className="w-3.5 h-3.5 text-gray-400" />
                            {new Date(evt.eventDate).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        <div className="text-right px-4.5 shrink-0">
                          <div className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                            countdown.passed 
                              ? 'bg-gray-50 text-gray-400 border-gray-200' 
                              : 'bg-orange-50 text-orange-700 border-orange-100'
                          }`}>
                            {countdown.text}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEditEvent(evt)}
                            className="text-blue-500 hover:text-blue-700 p-1.5 hover:bg-blue-50 rounded-lg transition border-none bg-transparent cursor-pointer"
                            title="Edit Event"
                          >
                            <Pencil1Icon className="h-4.5 w-4.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEvent(evt.id!, evt.eventName)}
                            className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg transition border-none bg-transparent cursor-pointer"
                            title="Delete Event"
                          >
                            <TrashIcon className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-10 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl bg-gray-50/20">
                  No scheduled calendar events are currently recorded.
                </div>
              )}

              <div className="flex justify-end pt-4 mt-5 border-t border-gray-100">
                 <button
                   type="button"
                   onClick={() => setIsEventModalOpen(false)}
                   className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
                 >
                   Done
                 </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* CONFIRM ACTION MODAL */}
        <ConfirmModal
          isOpen={confirmConfig.isOpen}
          onOpenChange={(open) => setConfirmConfig({ ...confirmConfig, isOpen: open })}
          title={confirmConfig.title}
          description={confirmConfig.description}
          onConfirm={confirmConfig.onConfirm}
        />
      </main>
    </div>
  );
}
