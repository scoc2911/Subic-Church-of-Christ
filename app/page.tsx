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
  deleteEvent,
  checkDuplicateMember,
  subscribeToMyProfile
} from "@/lib/api";
import { MemberForm, calculateAge } from "@/components/MemberForm";
import { Logo } from "@/components/Logo";
import { ConfirmModal } from "@/components/ConfirmModal";
import * as Dialog from "@radix-ui/react-dialog";

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
  CalendarDays,
  User,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Heart,
  Edit3,
  Pencil,
  Trash2,
  Clock,
  Link as LinkIcon
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

export const dynamic = "force-dynamic";

export default function Home() {
  const { user, role, loading, isLoggingIn, loginError, login, logout, isSandbox } = useAuth();
  
  // Admin role simulation state to allow seamless testing of Viewer & Guest profile views
  const [simulatedRole, setSimulatedRole] = useState<"admin" | "viewer" | "guest" | null>(null);
  const activeRole = simulatedRole || role;

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
  const [duplicateMatch, setDuplicateMatch] = useState<Member | null>(null);
  const [isDuplicateWarningOpen, setIsDuplicateWarningOpen] = useState(false);

  // Viewer / Guest self profile state
  const [myProfile, setMyProfile] = useState<Member | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true);
  const [isEditingMyProfile, setIsEditingMyProfile] = useState<boolean>(false);

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

  const [formKey, setFormKey] = useState(0);

  // Subscriptions hooks
  useEffect(() => {
    if (user && activeRole === "admin") {
      const unsubscribe = subscribeToMembers((data) => {
        setMembers(data);

        // Auto-update missing or incorrect age in database
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
      });
      return () => unsubscribe();
    }
  }, [user, activeRole]);

  useEffect(() => {
    if (user && activeRole) {
      const unsubscribe = subscribeToNetworks((data) => {
        setNetworks(data);
      });
      return () => unsubscribe();
    }
  }, [user, activeRole]);

  useEffect(() => {
    if (user && activeRole) {
      const unsubscribe = subscribeToMinistries((data) => {
        setMinistries(data);
      });
      return () => unsubscribe();
    }
  }, [user, activeRole]);

  useEffect(() => {
    if (user && user.email && (activeRole === "viewer" || activeRole === "guest")) {
      setIsLoadingProfile(true);
      const unsubscribe = subscribeToMyProfile(user.email, (data) => {
        setMyProfile(data);
        setIsLoadingProfile(false);
      });
      return () => unsubscribe();
    } else {
      setIsLoadingProfile(false);
    }
  }, [user, activeRole]);

  useEffect(() => {
    if (user && activeRole === "admin") {
      const unsubscribe = subscribeToEvents((data) => {
        setEvents(data);
      });
      return () => unsubscribe();
    }
  }, [user, activeRole]);

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
            (() => {
              const errorLower = loginError.toLowerCase();
              const isDomainError = errorLower.includes("unauthorized-domain") || errorLower.includes("unauthorized domain");
              if (isDomainError) {
                const devDomain = "ais-dev-luphzcnetea7aedkn5z7nj-225614280164.asia-east1.run.app";
                const preDomain = "ais-pre-luphzcnetea7aedkn5z7nj-225614280164.asia-east1.run.app";
                return (
                  <div className="mt-6 p-5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-gray-800 leading-relaxed space-y-4 animate-in fade-in duration-250 w-full shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="p-1 px-2.5 rounded-full bg-amber-100 text-[10px] font-black uppercase tracking-wider text-amber-800">
                        Action Required
                      </span>
                      <span className="text-xs font-bold text-amber-900">Authorize App Domains</span>
                    </div>

                    <p className="text-gray-600 font-medium">
                      Google Sign-In needs permission to run on these temporary app-preview URLs. To fix this:
                    </p>

                    <ol className="list-decimal pl-4 text-[11px] text-gray-700 space-y-2 font-medium">
                      <li>
                        Go to your{" "}
                        <a
                          href="https://console.firebase.google.com/project/scoc-3a755/authentication/settings"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-blue-600 underline hover:text-blue-800 inline-flex items-center gap-0.5 cursor-pointer"
                        >
                          Firebase Console Settings
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </li>
                      <li>
                        Scroll to the <span className="font-semibold text-gray-900">Authorized domains</span> section and click <span className="font-semibold text-gray-900">Add domain</span>.
                      </li>
                      <li>Copy and add both domains from below:</li>
                    </ol>

                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-amber-100 font-mono text-[10px]">
                        <span className="text-gray-800 break-all select-all font-semibold">{devDomain}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(devDomain);
                            alert("Copied dev-environment domain!");
                          }}
                          className="ml-3 px-2 py-1 bg-amber-100/50 hover:bg-amber-100 text-amber-950 font-bold rounded text-[9px] border border-amber-200 cursor-pointer transition-colors"
                        >
                          Copy
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-amber-100 font-mono text-[10px]">
                        <span className="text-gray-800 break-all select-all font-semibold">{preDomain}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(preDomain);
                            alert("Copied pre-preview domain!");
                          }}
                          className="ml-3 px-2 py-1 bg-amber-100/50 hover:bg-amber-100 text-amber-950 font-bold rounded text-[9px] border border-amber-200 cursor-pointer transition-colors"
                        >
                          Copy
                        </button>
                      </div>
                    </div>

                    <div className="pt-2 flex flex-col gap-2 border-t border-amber-150">
                      <p className="text-[10px] text-gray-500 font-medium">
                        4. After clicking <span className="font-semibold text-gray-700">Save</span> in the Console, return here and refresh:
                      </p>
                      <button
                        onClick={() => window.location.reload()}
                        className="w-full text-center py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs transition cursor-pointer"
                      >
                        Reload & Try Again
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div className="mt-6 p-4 rounded-xl bg-orange-50 border border-orange-200 text-orange-850 text-xs leading-relaxed space-y-1.5 animate-in fade-in duration-200 w-full animate-in fade-in duration-200">
                  <p className="font-extrabold uppercase tracking-wider text-[10px] text-orange-700">Popup Action Required</p>
                  <p className="text-gray-700 whitespace-pre-line">{loginError}</p>
                </div>
              );
            })()
          )}
        </div>
      </div>
    );
  }

  const renderSimulationBar = () => {
    if (role !== "admin") return null;
    return (
      <div className="bg-amber-50 border-b border-amber-200 py-2.5 px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0 select-none print:hidden">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="font-extrabold text-amber-950 uppercase tracking-wider text-[10px]">
            Administrator Simulation Mode
          </span>
          <span className="text-gray-400 font-medium">|</span>
          <span className="text-gray-600 font-semibold">
            Actively viewing workspace as: <span className="font-black text-blue-700 uppercase bg-blue-100/60 px-1.5 py-0.5 rounded">{simulatedRole || "admin"}</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-amber-200 shadow-xs">
          <button
            type="button"
            onClick={() => {
              setSimulatedRole(null);
              setIsEditingMyProfile(false);
            }}
            className={`px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider transition-all rounded-md cursor-pointer ${
              !simulatedRole
                ? "bg-amber-600 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            Admin View
          </button>
          <button
            type="button"
            onClick={() => {
              setSimulatedRole("viewer");
              setIsEditingMyProfile(false);
            }}
            className={`px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider transition-all rounded-md cursor-pointer ${
              simulatedRole === "viewer"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            Viewer (Read-Only)
          </button>
          <button
            type="button"
            onClick={() => {
              setSimulatedRole("guest");
              setIsEditingMyProfile(false);
            }}
            className={`px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider transition-all rounded-md cursor-pointer ${
              simulatedRole === "guest"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            Guest View
          </button>
        </div>
      </div>
    );
  };

  if (activeRole === "viewer" || activeRole === "guest") {
    const displayRole = activeRole === "viewer" ? "Viewer (Read-Only)" : "Guest";

    const handleMyProfileUpdate = async (data: Omit<Member, "id" | "createdAt" | "updatedAt">) => {
      if (!myProfile?.id) return;
      setIsSaving(true);
      try {
        const updatedData = {
          ...data,
          email: user?.email || data.email || "",
        };
        await updateMember(myProfile.id, updatedData);
        alert("Personal profile record updated successfully.");
        setIsEditingMyProfile(false);
      } catch (err) {
        console.error("Profile update error:", err);
        alert("Failed to update profile. Please verify credentials / internet connection.");
      } finally {
        setIsSaving(false);
      }
    };

    const handleGuestSubmit = async (data: Omit<Member, "id" | "createdAt" | "updatedAt">) => {
      setIsSaving(true);
      try {
        const finalData = {
          ...data,
          email: user?.email || data.email || "",
        };
        const duplicate = await checkDuplicateMember(
          finalData.firstName,
          finalData.lastName,
          finalData.birthday,
          finalData.contactNumber,
          finalData.email
        );
        if (duplicate) {
          setDuplicateMatch(duplicate);
          setIsDuplicateWarningOpen(true);
          setIsSaving(false);
          return;
        }
        await createMember(finalData);
        alert("Your initial church member profile has been registered and loaded successfully.");
        setFormKey(prev => prev + 1);
      } catch (err) {
        console.error(err);
        alert("Failed to register member profile. Please verify your connection status.");
      } finally {
        setIsSaving(false);
      }
    };

    const ProfileField = ({ label, value, icon }: { label: string; value?: string | number | boolean; icon?: React.ReactNode }) => {
      let displayValue = value;
      if (value === true) displayValue = "Yes";
      if (value === false) displayValue = "No";
      return (
        <div className="p-3 bg-gray-50/50 hover:bg-gray-50 rounded-xl border border-gray-150/60 flex items-start gap-3 transition">
          {icon && <div className="text-blue-600 mt-0.5">{icon}</div>}
          <div className="space-y-0.5">
            <span className="block text-[9px] text-gray-400 font-extrabold uppercase tracking-wider">{label}</span>
            <span className="font-extrabold text-xs text-gray-950">{displayValue || <span className="text-gray-300 font-normal italic">Not Specified</span>}</span>
          </div>
        </div>
      );
    };

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-800 animate-in fade-in duration-200">
        {renderSimulationBar()}
        {/* Workspace Portal Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0 shadow-xs select-none">
          <div className="flex items-center gap-3">
            <Logo size={40} className="text-blue-600" />
            <div>
              <h1 className="text-base font-black text-gray-950 uppercase tracking-tight leading-none">SUBIC CHURCH OF CHRIST</h1>
              <span className="text-[10px] text-blue-600 font-black uppercase tracking-wider block mt-1">
                {myProfile ? "MEMBER PROFILE WORKSPACE & PORTAL" : "NEW MEMBER REGISTRATION PORTAL"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-bold text-gray-950 block leading-none">{user?.email}</span>
              <span className="text-[9px] text-blue-600 font-extrabold uppercase mt-1 inline-block leading-none">
                {displayRole} Account
              </span>
            </div>
            <button
              onClick={logout}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-300 hover:border-red-200 text-gray-500 hover:text-red-600 hover:bg-red-50 font-bold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer bg-white"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        </header>

        {/* Loading Spinner */}
        {isLoadingProfile ? (
          <main className="flex-1 max-w-4xl w-full mx-auto p-8 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider animate-pulse">Syncing profile record details...</p>
            </div>
          </main>
        ) : myProfile ? (
          /* Profile Detail or Edit Workspace */
          <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-start space-y-6">
            
            {/* Header Welcome Card */}
            <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-xs flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
              <div className="flex flex-col md:flex-row items-center gap-4 md:text-left text-center">
                <div className="h-20 w-20 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-black text-3xl shadow-sm uppercase">
                  {myProfile.firstName.slice(0, 1)}
                  {myProfile.lastName.slice(0, 1)}
                </div>
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                    <h2 className="text-xl font-black text-gray-950 tracking-tight leading-none uppercase">
                      {myProfile.firstName} {myProfile.lastName}
                    </h2>
                    <span className="inline-block px-2.5 py-1 rounded-full text-[9px] font-black uppercase text-blue-700 bg-blue-50 border border-blue-100">
                      {myProfile.membershipStatus}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-medium">
                    Membership ID: <span className="font-bold text-gray-700">{myProfile.membershipId || "Not Assigned"}</span> • Added on {myProfile.createdAt ? new Date(myProfile.createdAt).toLocaleDateString() : "Initial Setup"}
                  </p>
                  <p className="text-[11px] text-gray-400 font-medium max-w-md">
                    Welcome to your personal profile page. Logged in as a <span className="font-bold text-blue-600">{displayRole}</span>, you can safely monitor, update, and manage your specific registry facts.
                  </p>
                </div>
              </div>
              
              {!isEditingMyProfile && (
                <button
                  type="button"
                  onClick={() => setIsEditingMyProfile(true)}
                  className="px-4 py-2 border-2 border-blue-600 hover:bg-blue-600 hover:text-white text-blue-600 font-extrabold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shrink-0 shadow-xs"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Modify Profile Details
                </button>
              )}
            </div>

            {isEditingMyProfile ? (
              /* Profile Update Form Wrapper */
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs">
                <div className="border-b border-gray-150 pb-3 mb-5 flex items-center justify-between">
                  <h2 className="text-sm font-black text-gray-900 tracking-tight uppercase flex items-center gap-2">
                    Modify Records Info Form
                  </h2>
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Locked To {user?.email}</span>
                </div>
                <MemberForm
                  initialData={myProfile}
                  onSubmit={handleMyProfileUpdate}
                  onCancel={() => {
                    setIsEditingMyProfile(false);
                  }}
                  isSaving={isSaving}
                  networks={networks}
                  ministries={ministries}
                />
              </div>
            ) : (
              /* Display Profile Details Cards */
              <div className="space-y-6">
                
                {/* Section: Personal Info */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 border-b border-gray-100 pb-2.5">
                    <User className="w-4 h-4 text-gray-400" />
                    <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">Personal Facts</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                    <ProfileField label="First Name" value={myProfile.firstName} />
                    <ProfileField label="Middle Name" value={myProfile.middleName} />
                    <ProfileField label="Last Name" value={myProfile.lastName} />
                    <ProfileField label="Gender" value={myProfile.gender} />
                    <ProfileField label="Birthday" value={myProfile.birthday} icon={<Calendar className="w-3.5 h-3.5" />} />
                    <ProfileField label="Computed Age" value={myProfile.age || (myProfile.birthday ? calculateAge(myProfile.birthday) : undefined)} />
                    <ProfileField label="Marital Status" value={myProfile.maritalStatus} />
                    <ProfileField label="Voter Status" value={myProfile.voter ? "Registered Voter" : "No"} />
                  </div>
                </div>

                {/* Section: Contact & Location */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 border-b border-gray-100 pb-2.5">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">Contact & Address</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    <ProfileField label="Email Address" value={myProfile.email} icon={<Mail className="w-3.5 h-3.5" />} />
                    <ProfileField label="Contact Number" value={myProfile.contactNumber} icon={<Phone className="w-3.5 h-3.5" />} />
                    <div className="md:col-span-3">
                      <ProfileField label="Home Address" value={myProfile.address} icon={<MapPin className="w-3.5 h-3.5" />} />
                    </div>
                  </div>
                </div>

                {/* Section: Spiritual Records */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 border-b border-gray-100 pb-2.5">
                    <Droplet className="w-4 h-4 text-gray-400" />
                    <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">Baptism Record</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                    <ProfileField label="Baptized in SCOC / Affiliated" value={myProfile.isBaptized ? "Yes" : "No"} />
                    <ProfileField label="Baptism Date" value={myProfile.baptismDate} icon={<CalendarDays className="w-3.5 h-3.5" />} />
                    <ProfileField label="Executed By (Minister)" value={myProfile.baptismExecutedBy} />
                    <ProfileField label="Witness 1" value={myProfile.baptismWitness1} />
                    <ProfileField label="Witness 2" value={myProfile.baptismWitness2} />
                  </div>
                </div>

                {/* Section: Group Associations */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 border-b border-gray-100 pb-2.5">
                    <Building className="w-4 h-4 text-gray-400" />
                    <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">Cluster & Ministry Assignments</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <ProfileField label="Cluster Network" value={myProfile.network} icon={<Building className="w-3.5 h-3.5" />} />
                    <ProfileField label="Network Leader" value={myProfile.networkLeader} />
                    <ProfileField label="Ministry Service" value={myProfile.ministry} icon={<Layers className="w-3.5 h-3.5" />} />
                    <ProfileField label="Ministry Head" value={myProfile.ministryHead} />
                  </div>
                </div>

                {/* Section: Education, Relations & Notes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 border-b border-gray-100 pb-2.5">
                      <GraduationCap className="w-4 h-4 text-gray-400" />
                      <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">Education Details</h3>
                    </div>
                    <div className="space-y-3">
                      <ProfileField label="School or Alma Mater" value={myProfile.school} />
                      <ProfileField label="Course / Discipline" value={myProfile.course} />
                      <ProfileField label="Current Year Level" value={myProfile.yearLevel} />
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 border-b border-gray-100 pb-2.5">
                      <Heart className="w-4 h-4 text-gray-400" />
                      <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">Family References</h3>
                    </div>
                    <div className="space-y-3">
                      <ProfileField label="Father's Full Name" value={myProfile.fathersName} />
                      <ProfileField label="Mother's Full Name" value={myProfile.mothersName} />
                      <ProfileField label="Spouse's Name" value={myProfile.spouseName} />
                    </div>
                  </div>
                </div>

                {/* Section: Administrative Notes */}
                {myProfile.notes && (
                  <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-3">
                    <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                      <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">Registry Notes & Remarks</h3>
                    </div>
                    <p className="text-xs text-gray-650 bg-gray-50 p-4 rounded-xl border border-gray-150/60 leading-relaxed font-semibold">
                      {myProfile.notes}
                    </p>
                  </div>
                )}

              </div>
            )}
          </main>
        ) : (
          /* Subic Church Registry Form (For new self profiles) */
          <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-start">
            <div className="bg-blue-50/70 border border-blue-100 p-4 rounded-xl text-blue-800 text-xs mb-6 space-y-1.5">
              <p className="font-extrabold uppercase tracking-wide">Primary User Registration Needed</p>
              <p className="text-gray-600 font-semibold">
                No existing record matches your signed-in email address (<span className="font-extrabold text-gray-800">{user?.email}</span>) in SCOC's Digital Registry database yet.
                Please complete your personal information below to create your official profile card.
              </p>
            </div>

            {/* Form Container */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs">
              <h2 className="text-sm font-black text-gray-900 tracking-tight uppercase border-b border-gray-150 pb-3 mb-5">
                Initial Registry Setup Form
              </h2>
              <MemberForm
                key={formKey}
                initialData={{ email: user?.email || "", membershipStatus: "Active" } as any}
                onSubmit={handleGuestSubmit}
                onCancel={() => {
                  if (confirm("Are you sure you want to clear/reset the form fields?")) {
                    setFormKey((prev) => prev + 1);
                  }
                }}
                isSaving={isSaving}
                networks={networks}
                ministries={ministries}
              />
            </div>
          </main>
        )}
      </div>
    );
  }

  if (activeRole !== "admin") {
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
      const duplicate = await checkDuplicateMember(
        data.firstName,
        data.lastName,
        data.birthday,
        data.contactNumber,
        data.email
      );
      if (duplicate && duplicate.id !== editingMember?.id) {
        setDuplicateMatch(duplicate);
        setIsDuplicateWarningOpen(true);
        setIsSaving(false);
        return;
      }
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {renderSimulationBar()}
      <div className="flex-1 flex flex-col md:flex-row print:bg-white text-gray-800">
      
      {/* SIDEBAR NAVIGATION PANEL (Desktop) */}
      <aside className="w-68 bg-white border-r border-gray-150 flex-col justify-between hidden md:flex shrink-0 print:hidden select-none">
        <div>
          {/* Logo Brand Header */}
          <div className="h-16 px-5 border-b border-gray-100 flex items-center gap-2.5">
            <Logo size={36} className="text-blue-600" />
            <div>
              <span className="text-sm font-black text-gray-950 uppercase tracking-tight block">
                {isSandbox ? "SCOC Sandbox" : "SCOC Admin"}
              </span>
              <span className={`text-[9px] font-extrabold uppercase tracking-widest block leading-none ${isSandbox ? "text-orange-600 animate-pulse font-black" : "text-gray-400"}`}>
                {isSandbox ? "Demo DB Sandbox" : "Database Console"}
              </span>
            </div>
          </div>

          {/* Nav Items Link List */}
          <nav className="p-4 space-y-1">
            {menuItems.map((item) => {
              if (item.adminOnly && activeRole !== "admin") return null;
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all border outline-none cursor-pointer ${
                    isActive
                      ? "bg-blue-50/70 border-blue-100 text-blue-700 shadow-3xs"
                      : "bg-transparent border-transparent text-gray-600 hover:text-gray-950 hover:bg-gray-50/80"
                  }`}
                >
                  <div className={`p-1.5 rounded-lg flex items-center justify-center transition-all ${
                    isActive 
                      ? "bg-blue-600 text-white shadow-xs" 
                      : "bg-gray-100 text-gray-500 border border-gray-150/60"
                  }`}>
                    <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
                  </div>
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
              if (item.adminOnly && activeRole !== "admin") return null;
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer border transition-all ${
                    isActive
                      ? "bg-blue-600 text-white border-blue-650 shadow-xs"
                      : "text-gray-600 hover:bg-gray-50/80 border-transparent"
                  }`}
                >
                  <div className={`p-1.5 rounded-lg flex items-center justify-center transition-all ${
                    isActive 
                      ? "bg-blue-700 text-white" 
                      : "bg-gray-100 text-gray-500 border border-gray-150"
                  }`}>
                    <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
                  </div>
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
            role={activeRole}
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
            role={activeRole}
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
            role={activeRole}
          />
        )}

        {activeTab === "attendance" && (
          <AttendanceModule
            members={members}
            events={events}
            role={activeRole}
          />
        )}

        {activeTab === "reports" && (
          <ReportsModule
            members={members}
          />
        )}

        {activeTab === "ministries" && activeRole === "admin" && (
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

        {activeTab === "networks" && activeRole === "admin" && (
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

        {activeTab === "users" && activeRole === "admin" && (
          <UserManagementModule
            currentAdminEmail="scoc2911@gmail.com"
          />
        )}

        {activeTab === "settings" && activeRole === "admin" && (
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

        {/* DUPLICATE MEMBER WARNING MODAL */}
        <Dialog.Root open={isDuplicateWarningOpen} onOpenChange={setIsDuplicateWarningOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-gray-950/40 backdrop-blur-xs z-[100] transition-opacity" />
            <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-h-[85vh] w-[95vw] max-w-[500px] rounded-2xl bg-white p-7 shadow-2xl z-[100] overflow-y-auto outline-none transition-transform animate-scale-up border border-orange-100">
              <div className="flex flex-col items-center text-center">
                <div className="bg-orange-100 text-orange-600 rounded-full h-14 w-14 flex items-center justify-center mb-4 shadow-inner">
                  <AlertCircle className="w-7 h-7" />
                </div>
                
                <Dialog.Title className="text-base font-black text-gray-950 tracking-tight uppercase mb-2">
                  Duplicate Member Profile Detected
                </Dialog.Title>
                
                <p className="text-xs text-gray-500 font-medium leading-relaxed max-w-sm mb-6">
                  This member already exists in the database. Duplicate records are not allowed.
                </p>

                {duplicateMatch && (
                  <div className="bg-gray-50 border border-gray-150 rounded-xl p-4 w-full text-left space-y-2.5 mb-6">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-1.5">
                      Existing Profile Facts
                    </p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <div>
                        <span className="block text-[10px] text-gray-400 font-bold uppercase">Full Name</span>
                        <span className="font-extrabold text-gray-900">
                          {duplicateMatch.lastName}, {duplicateMatch.firstName} {duplicateMatch.middleName || ""}
                        </span>
                      </div>
                      {duplicateMatch.birthday && (
                        <div>
                          <span className="block text-[10px] text-gray-400 font-bold uppercase">Birth Date</span>
                          <span className="font-semibold text-gray-700">{duplicateMatch.birthday}</span>
                        </div>
                      )}
                      {duplicateMatch.contactNumber && (
                        <div>
                          <span className="block text-[10px] text-gray-400 font-bold uppercase">Contact Number</span>
                          <span className="font-semibold text-gray-700">{duplicateMatch.contactNumber}</span>
                        </div>
                      )}
                      {duplicateMatch.email && (
                        <div>
                          <span className="block text-[10px] text-gray-400 font-bold uppercase">Email Address</span>
                          <span className="font-semibold text-gray-700 font-mono text-[10px] break-all">{duplicateMatch.email}</span>
                        </div>
                      )}
                      <div>
                        <span className="block text-[10px] text-gray-400 font-bold uppercase">Membership Status</span>
                        <span className="inline-block px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase text-blue-700 bg-blue-50 border border-blue-100 mt-0.5">
                          {duplicateMatch.membershipStatus}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2 w-full justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDuplicateWarningOpen(false);
                      setDuplicateMatch(null);
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 bg-gray-150 text-gray-700 text-xs font-black rounded-lg hover:bg-gray-200 transition uppercase tracking-wider cursor-pointer text-center"
                  >
                    Close & Review Form
                  </button>
                  {role === "admin" && duplicateMatch && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsDuplicateWarningOpen(false);
                        setIsFormModalOpen(false);
                        setTimeout(() => {
                          setEditingMember(duplicateMatch);
                          setIsFormModalOpen(true);
                        }, 150);
                      }}
                      className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 text-white text-xs font-black rounded-lg hover:bg-blue-700 transition uppercase tracking-wider cursor-pointer text-center shadow-md flex items-center justify-center gap-1.5"
                    >
                      <Pencil className="w-3.5 h-3.5" strokeWidth={2} /> Edit Existing Member
                    </button>
                  )}
                  {activeRole !== "admin" && duplicateMatch && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm(`Are you sure you want to link your signed-in account (${user?.email}) to this existing member profile of "${duplicateMatch.firstName} ${duplicateMatch.lastName}"?\n\nOnce linked, this profile data will be loaded automatically.`)) {
                          try {
                            setIsSaving(true);
                            setIsDuplicateWarningOpen(false);
                            await updateMember(duplicateMatch.id!, {
                              email: user?.email || ""
                            });
                            alert("Your account has been successfully linked to this member profile.");
                            setDuplicateMatch(null);
                          } catch (err) {
                            console.error("Linking error:", err);
                            alert("Failed to link account. Please contact SCOC administration if issue persists.");
                          } finally {
                            setIsSaving(false);
                          }
                        }
                      }}
                      disabled={isSaving}
                      className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 disabled:opacity-50 text-white text-xs font-black rounded-lg hover:bg-blue-700 transition uppercase tracking-wider cursor-pointer text-center shadow-md flex items-center justify-center gap-1.5"
                    >
                      <LinkIcon className="w-3.5 h-3.5" strokeWidth={2} /> Correct, Link My Account
                    </button>
                  )}
                </div>
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
                          <p className="text-[10px] text-gray-400 font-bold flex items-center gap-1.5 mt-1 uppercase tracking-wide">
                            <Clock className="w-3.5 h-3.5 text-gray-400" strokeWidth={2} />
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
                            <Pencil className="h-4 w-4" strokeWidth={2} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEvent(evt.id!, evt.eventName)}
                            className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg transition border-none bg-transparent cursor-pointer"
                            title="Delete Event"
                          >
                            <Trash2 className="h-4 w-4" strokeWidth={2} />
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
    </div>
  );
}
