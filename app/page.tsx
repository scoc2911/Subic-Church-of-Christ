"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeToMembers, createMember, updateMember, deleteMember, Member, subscribeToNetworks, createNetwork, deleteNetwork, Network, updateNetwork, Ministry, subscribeToMinistries, createMinistry, updateMinistry, deleteMinistry, ChurchEvent, subscribeToEvents, createEvent, updateEvent, deleteEvent } from "@/lib/api";
import { MemberForm, calculateAge } from "@/components/MemberForm";
import { Logo } from "@/components/Logo";
import { ConfirmModal } from "@/components/ConfirmModal";
import * as Dialog from "@radix-ui/react-dialog";
import { PlusIcon, Pencil1Icon, TrashIcon, MagnifyingGlassIcon, CalendarIcon, ClockIcon } from "@radix-ui/react-icons";
import { DataAnalysis } from "@/components/DataAnalysis";

const calculateCountdown = (dateString: string): { text: string; passed: boolean } => {
  const eventDate = new Date(dateString).getTime();
  if (isNaN(eventDate)) return { text: "Invalid date", passed: false };
  const now = new Date().getTime();
  const distance = eventDate - now;

  if (distance < 0) {
    return { text: "Passed", passed: true };
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
  const { user, role, loading, login, logout } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [networks, setNetworks] = useState<Network[]>([]);
  const [search, setSearch] = useState("");
  const [baptismFilter, setBaptismFilter] = useState<"all" | "baptized" | "unbaptized">("all");
  const [networkFilter, setNetworkFilter] = useState<string>("all");
  const [ministryFilter, setMinistryFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNetworkModalOpen, setIsNetworkModalOpen] = useState(false);
  const [isMinistryModalOpen, setIsMinistryModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState<"home" | "members" | "analysis">("home");
  const [editingMember, setEditingMember] = useState<Member | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  const [newNetworkName, setNewNetworkName] = useState("");
  const [newNetworkLeader, setNewNetworkLeader] = useState("");
  const [editingNetworkId, setEditingNetworkId] = useState<string | null>(null);
  const [isSavingNetwork, setIsSavingNetwork] = useState(false);
  
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [newMinistryName, setNewMinistryName] = useState("");
  const [newMinistryHead, setNewMinistryHead] = useState("");
  const [editingMinistryId, setEditingMinistryId] = useState<string | null>(null);
  const [isSavingMinistry, setIsSavingMinistry] = useState(false);
  
  const [events, setEvents] = useState<ChurchEvent[]>([]);
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

  useEffect(() => {
    if (user && role) {
      const unsubscribe = subscribeToMembers((data) => {
        setMembers(data);

        // Auto-update missing or incorrect age in the database
        if (role === "admin") {
          data.forEach(async (member) => {
            if (member.birthday) {
              const currentAge = member.age;
              const correctAge = calculateAge(member.birthday);
              if (correctAge !== undefined && correctAge !== currentAge) {
                try {
                  await updateMember(member.id!, { age: correctAge });
                } catch (err) {
                  console.error("Failed to auto-update age for member:", member.id, err);
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

  const handleAddNetwork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNetworkName.trim() || !newNetworkLeader.trim()) {
      alert("Both Network Name and Network Leader are required.");
      return;
    }
    setIsSavingNetwork(true);
    try {
      if (editingNetworkId) {
        const oldNetwork = networks.find(n => n.id === editingNetworkId);
        await updateNetwork(editingNetworkId, {
          networkName: newNetworkName.trim(),
          networkLeader: newNetworkLeader.trim(),
        });
        
        if (oldNetwork) {
          const membersToUpdate = members.filter(m => m.network === oldNetwork.networkName);
          await Promise.all(membersToUpdate.map(m => updateMember(m.id!, {
            network: newNetworkName.trim(),
            networkLeader: newNetworkLeader.trim()
          })));
        }
        
        setEditingNetworkId(null);
      } else {
        await createNetwork({
          networkName: newNetworkName.trim(),
          networkLeader: newNetworkLeader.trim(),
        });
      }
      setNewNetworkName("");
      setNewNetworkLeader("");
    } catch (err) {
      console.error(err);
      alert("Failed to save network.");
    } finally {
      setIsSavingNetwork(false);
    }
  };

  const handleDeleteNetwork = async (id: string, name: string) => {
    setConfirmConfig({
      isOpen: true,
      title: "Delete Network",
      description: `Are you sure you want to delete the network "${name}"?`,
      onConfirm: async () => {
        try {
          await deleteNetwork(id);
          const membersToUpdate = members.filter(m => m.network === name);
          await Promise.all(membersToUpdate.map(m => updateMember(m.id!, {
            network: "",
            networkLeader: ""
          })));
        } catch (err) {
          console.error(err);
          alert("Failed to delete network.");
        }
      },
    });
  };

  const handleEditNetwork = (net: Network) => {
    setEditingNetworkId(net.id!);
    setNewNetworkName(net.networkName);
    setNewNetworkLeader(net.networkLeader);
  };

  const handleCancelEditNetwork = () => {
    setEditingNetworkId(null);
    setNewNetworkName("");
    setNewNetworkLeader("");
  };

  const handleAddMinistry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMinistryName.trim() || !newMinistryHead.trim()) {
      alert("Both Ministry Name and Ministry Head are required.");
      return;
    }
    setIsSavingMinistry(true);
    try {
      if (editingMinistryId) {
        const oldMinistry = ministries.find(m => m.id === editingMinistryId);
        await updateMinistry(editingMinistryId, {
          ministryName: newMinistryName.trim(),
          ministryHead: newMinistryHead.trim(),
        });
        
        if (oldMinistry) {
          const membersToUpdate = members.filter(m => m.ministry === oldMinistry.ministryName);
          await Promise.all(membersToUpdate.map(m => updateMember(m.id!, {
            ministry: newMinistryName.trim(),
            ministryHead: newMinistryHead.trim()
          })));
        }
        
        setEditingMinistryId(null);
      } else {
        await createMinistry({
          ministryName: newMinistryName.trim(),
          ministryHead: newMinistryHead.trim(),
        });
      }
      setNewMinistryName("");
      setNewMinistryHead("");
    } catch (err) {
      console.error(err);
      alert("Failed to save ministry.");
    } finally {
      setIsSavingMinistry(false);
    }
  };

  const handleDeleteMinistry = async (id: string, name: string) => {
    setConfirmConfig({
      isOpen: true,
      title: "Delete Ministry",
      description: `Are you sure you want to delete the ministry "${name}"?`,
      onConfirm: async () => {
        try {
          await deleteMinistry(id);
          const membersToUpdate = members.filter(m => m.ministry === name);
          await Promise.all(membersToUpdate.map(m => updateMember(m.id!, {
            ministry: "",
            ministryHead: ""
          })));
        } catch (err) {
          console.error(err);
          alert("Failed to delete ministry.");
        }
      },
    });
  };

  const handleEditMinistry = (min: Ministry) => {
    setEditingMinistryId(min.id!);
    setNewMinistryName(min.ministryName);
    setNewMinistryHead(min.ministryHead);
  };

  const handleCancelEditMinistry = () => {
    setEditingMinistryId(null);
    setNewMinistryName("");
    setNewMinistryHead("");
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventName.trim() || !newEventDate.trim()) {
      alert("Both Event Name and Event Date/Time are required.");
      return;
    }
    setIsSavingEvent(true);
    try {
      if (editingEventId) {
        await updateEvent(editingEventId, {
          eventName: newEventName.trim(),
          eventDate: newEventDate.trim(),
        });
        setEditingEventId(null);
      } else {
        await createEvent({
          eventName: newEventName.trim(),
          eventDate: newEventDate.trim(),
        });
      }
      setNewEventName("");
      setNewEventDate("");
    } catch (err) {
      console.error(err);
      alert("Failed to save event.");
    } finally {
      setIsSavingEvent(false);
    }
  };

  const handleDeleteEvent = async (id: string, name: string) => {
    setConfirmConfig({
      isOpen: true,
      title: "Delete Event",
      description: `Are you sure you want to delete the event "${name}"?`,
      onConfirm: async () => {
        try {
          await deleteEvent(id);
        } catch (err) {
          console.error(err);
          alert("Failed to delete event.");
        }
      },
    });
  };

  const handleEditEvent = (evt: ChurchEvent) => {
    setEditingEventId(evt.id!);
    setNewEventName(evt.eventName);
    setNewEventDate(evt.eventDate); // Expects "YYYY-MM-DDTHH:mm" for <input type="datetime-local" />
  };

  const handleCancelEditEvent = () => {
    setEditingEventId(null);
    setNewEventName("");
    setNewEventDate("");
  };

  const handleAddClick = () => {
    setEditingMember(undefined);
    setIsModalOpen(true);
  };

  const getNextMembershipId = () => {
    // Generate an auto-incrementing basic ID based on count.
    // e.g. 0001, 0002...
    return String(members.length + 1).padStart(4, '0');
  };

  const handleEditClick = (member: Member) => {
    setEditingMember(member);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    setConfirmConfig({
      isOpen: true,
      title: "Delete Member",
      description: `Are you sure you want to delete ${name}?`,
      onConfirm: async () => {
        await deleteMember(id);
      }
    });
  };

  const handleSubmit = async (data: Omit<Member, "id" | "createdAt" | "updatedAt">) => {
    setIsSaving(true);
    try {
      if (editingMember) {
        await updateMember(editingMember.id!, data);
      } else {
        await createMember(data);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert("Failed to save member.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center p-4">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-gray-100 flex flex-col items-center">
          <Logo size={100} className="mb-4 text-blue-600 animate-fade-in" />
          <h1 className="text-2xl font-bold text-gray-900 mb-1 text-center">Subic Church of Christ</h1>
          <p className="text-gray-500 mb-8 text-center text-sm">Data Entry & Management System</p>
          <button
            onClick={login}
            className="w-full h-12 bg-gray-900 text-white rounded-md font-semibold hover:bg-gray-800 transition flex items-center justify-center gap-2"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  if (role !== "admin" && role !== "viewer") {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 p-4 flex-col gap-4">
        <div className="bg-orange-100 text-orange-600 rounded-full h-16 w-16 flex items-center justify-center mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
          </svg>
        </div>
        <p className="text-xl font-medium text-gray-700">Account Pending Approval</p>
        <p className="text-gray-500 text-center max-w-sm">
          Your account ({user.email}) does not have access yet. Please contact your administrator.
        </p>
        <button onClick={logout} className="text-blue-600 font-medium hover:underline mt-4">
          Sign out
        </button>
      </div>
    );
  }

  const filteredMembers = members.filter((m) => {
    const term = search.toLowerCase();
    const matchesSearch = (
      m.firstName.toLowerCase().includes(term) ||
      m.lastName.toLowerCase().includes(term) ||
      m.membershipId?.toLowerCase().includes(term)
    );

    if (!matchesSearch) return false;

    const isBaptized = m.isBaptized === true || (
      m.baptismDate !== undefined &&
      m.baptismDate !== "" &&
      m.baptismDate !== "N/A" &&
      m.baptismDate !== "--/--/----"
    ) || (
      m.baptismExecutedBy !== undefined &&
      m.baptismExecutedBy !== "" &&
      m.baptismExecutedBy !== "N/A"
    );

    if (baptismFilter === "baptized" && !isBaptized) return false;
    if (baptismFilter === "unbaptized" && isBaptized) return false;

    if (networkFilter !== "all" && m.network !== networkFilter) return false;
    if (ministryFilter !== "all" && m.ministry !== ministryFilter) return false;

    return true;
  }).sort((a, b) => {
    const idA = a.membershipId || "";
    const idB = b.membershipId || "";
    return idA.localeCompare(idB, undefined, { numeric: true });
  });

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button onClick={() => setCurrentView("home")} className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition outline-none border-none bg-transparent">
             <Logo size={36} className="h-9 w-9 text-blue-600" />
             <h1 className="text-lg pb-[2px] font-semibold tracking-tight text-gray-950 hidden sm:block">SCOC Data Entry</h1>
          </button>
          <div className="flex items-center space-x-6">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-medium text-gray-900 leading-tight">{user.displayName || user.email?.split('@')[0]}</span>
              <span className="text-xs text-blue-600 font-medium uppercase tracking-wider">{role}</span>
            </div>
            <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors">
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {currentView === "home" && (
          <div className="flex flex-col items-center justify-center pt-8 md:pt-16 text-center animate-fade-in">
             <Logo size={64} className="text-blue-600 mb-6" />
             <h2 className="text-3xl font-bold text-gray-900 mb-3">Welcome to SCOC Data Management</h2>
             <p className="text-gray-500 max-w-lg mb-12 text-sm md:text-base">Manage church members, keep track of networks, and maintain accurate records efficiently.</p>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
                <button onClick={() => setCurrentView("members")} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:border-blue-300 hover:shadow-md transition text-left cursor-pointer group flex flex-col items-start w-full focus:outline-none focus:ring-2 focus:ring-blue-500">
                   <div className="bg-blue-50 text-blue-600 h-14 w-14 rounded-xl flex items-center justify-center mb-5 group-hover:bg-blue-600 group-hover:text-white transition shadow-sm">
                      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                   </div>
                   <h3 className="text-xl font-semibold text-gray-900 mb-2">Member Directory</h3>
                   <p className="text-sm text-gray-500 leading-relaxed max-w-xs">View, add, edit, and search the complete list of church members.</p>
                </button>
                
                {role === "admin" && (
                   <>
                   <button onClick={() => setIsNetworkModalOpen(true)} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:border-purple-300 hover:shadow-md transition text-left cursor-pointer group flex flex-col items-start w-full focus:outline-none focus:ring-2 focus:ring-purple-500">
                      <div className="bg-purple-50 text-purple-600 h-14 w-14 rounded-xl flex items-center justify-center mb-5 group-hover:bg-purple-600 group-hover:text-white transition shadow-sm">
                         <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                         </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">Manage Networks</h3>
                      <p className="text-sm text-gray-500 leading-relaxed max-w-xs">Create and manage church ministry networks and leaders.</p>
                   </button>
                   <button onClick={() => setIsMinistryModalOpen(true)} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:border-indigo-300 hover:shadow-md transition text-left cursor-pointer group flex flex-col items-start w-full focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <div className="bg-indigo-50 text-indigo-600 h-14 w-14 rounded-xl flex items-center justify-center mb-5 group-hover:bg-indigo-600 group-hover:text-white transition shadow-sm">
                         <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                         </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">Manage Ministries</h3>
                      <p className="text-sm text-gray-500 leading-relaxed max-w-xs">Create and manage church ministries and ministry heads.</p>
                   </button>
                   <button onClick={() => setIsEventModalOpen(true)} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:border-orange-300 hover:shadow-md transition text-left cursor-pointer group flex flex-col items-start w-full focus:outline-none focus:ring-2 focus:ring-orange-500">
                      <div className="bg-orange-50 text-orange-600 h-14 w-14 rounded-xl flex items-center justify-center mb-5 group-hover:bg-orange-600 group-hover:text-white transition shadow-sm">
                         <CalendarIcon className="w-7 h-7" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">Church Events</h3>
                      <p className="text-sm text-gray-500 leading-relaxed max-w-xs">Schedule events and view upcoming event countdowns.</p>
                   </button>
                   <button onClick={() => setCurrentView("analysis")} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:border-teal-300 hover:shadow-md transition text-left cursor-pointer group flex flex-col items-start w-full focus:outline-none focus:ring-2 focus:ring-teal-500">
                      <div className="bg-teal-50 text-teal-600 h-14 w-14 rounded-xl flex items-center justify-center mb-5 group-hover:bg-teal-600 group-hover:text-white transition shadow-sm">
                         <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                         </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">Data Analysis</h3>
                      <p className="text-sm text-gray-500 leading-relaxed max-w-xs">View charts and insights on member demographics.</p>
                   </button>
                   </>
                )}
             </div>
          </div>
        )}
        
        {currentView === "members" && (
          <div className="animate-fade-in space-y-6">
            <div className="flex flex-col 2xl:flex-row items-start 2xl:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 w-full 2xl:w-auto">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => setCurrentView("home")}
                    className="p-2.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 text-gray-600 transition h-[42px] flex items-center justify-center cursor-pointer shrink-0"
                    title="Back to Home"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                  </button>
                  <div className="relative flex-1 sm:flex-none w-full sm:w-[240px]">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search by name or ID..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-6 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm shadow-sm"
                    />
                  </div>
                </div>

                {/* Segmented Control for Baptism Filtering */}
                <div className="flex items-center gap-1 border border-gray-300 rounded-lg p-1 bg-gray-50 shadow-inner w-full sm:w-auto overflow-x-auto min-w-max">
                  <button
                    type="button"
                    onClick={() => setBaptismFilter("all")}
                    className={`flex-1 sm:flex-none px-3.5 py-1.5 text-xs font-bold rounded-md transition cursor-pointer select-none text-center whitespace-nowrap ${
                      baptismFilter === "all"
                        ? "bg-white text-blue-600 shadow-sm border border-gray-200"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    All Members
                  </button>
                  <button
                    type="button"
                    onClick={() => setBaptismFilter("baptized")}
                    className={`flex-1 sm:flex-none px-3.5 py-1.5 text-xs font-bold rounded-md transition cursor-pointer select-none text-center whitespace-nowrap ${
                      baptismFilter === "baptized"
                        ? "bg-white text-green-700 shadow-sm border border-gray-200"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    Baptized
                  </button>
                  <button
                    type="button"
                    onClick={() => setBaptismFilter("unbaptized")}
                    className={`flex-1 sm:flex-none px-3.5 py-1.5 text-xs font-bold rounded-md transition cursor-pointer select-none text-center whitespace-nowrap ${
                      baptismFilter === "unbaptized"
                        ? "bg-white text-amber-700 shadow-sm border border-gray-200"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    Not Baptized
                  </button>
                </div>

                {/* Filter by Network */}
                <select
                  value={networkFilter}
                  onChange={(e) => setNetworkFilter(e.target.value)}
                  className="block w-full sm:w-auto pl-3 pr-8 py-2 border border-gray-300 rounded-lg leading-6 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm shadow-sm"
                >
                  <option value="all">All Networks</option>
                  {networks.map((net) => (
                    <option key={net.id} value={net.networkName}>
                      {net.networkName}
                    </option>
                  ))}
                </select>

                {/* Filter by Ministry */}
                <select
                  value={ministryFilter}
                  onChange={(e) => setMinistryFilter(e.target.value)}
                  className="block w-full sm:w-auto pl-3 pr-8 py-2 border border-gray-300 rounded-lg leading-6 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm shadow-sm"
                >
                  <option value="all">All Ministries</option>
                  {ministries.map((min) => (
                    <option key={min.id} value={min.ministryName}>
                      {min.ministryName}
                    </option>
                  ))}
                </select>
              </div>

              {role === "admin" && (
                <div className="flex flex-wrap w-full 2xl:w-auto items-center gap-2">
                  <button
                    onClick={() => setIsEventModalOpen(true)}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition whitespace-nowrap"
                  >
                    <CalendarIcon className="-ml-1 mr-2 flex-shrink-0 h-4 w-4 text-gray-500" aria-hidden="true" />
                    Events
                  </button>
                  <button
                    onClick={() => setIsMinistryModalOpen(true)}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition whitespace-nowrap"
                  >
                    <PlusIcon className="-ml-1 mr-2 flex-shrink-0 h-4 w-4 text-gray-500" aria-hidden="true" />
                    Ministries
                  </button>
                  <button
                    onClick={() => setIsNetworkModalOpen(true)}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition whitespace-nowrap"
                  >
                    <PlusIcon className="-ml-1 mr-2 flex-shrink-0 h-4 w-4 text-gray-500" aria-hidden="true" />
                    Networks
                  </button>
                  <button
                    onClick={handleAddClick}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition whitespace-nowrap"
                  >
                    <PlusIcon className="-ml-1 mr-2 flex-shrink-0 h-4 w-4" aria-hidden="true" />
                    Add Member
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50/80 border-b border-gray-200">
                    <tr>
                      <th scope="col" className="px-6 py-3.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Member Name</th>
                      <th scope="col" className="px-6 py-3.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">ID / Age</th>
                      <th scope="col" className="px-6 py-3.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Contact & Network</th>
                      <th scope="col" className="px-6 py-3.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                      {role === "admin" && (
                        <th scope="col" className="relative px-6 py-3.5 w-24">
                          <span className="sr-only">Actions</span>
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {filteredMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {member.pictures && member.pictures[0] ? (
                              <div className="h-10 w-10 flex-shrink-0 rounded-full overflow-hidden border border-gray-200">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={member.pictures[0]} alt="" className="h-full w-full object-cover" />
                              </div>
                            ) : (
                              <div className="h-10 w-10 flex-shrink-0 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm tracking-wide shadow-sm">
                                {member.firstName?.[0] || ""}{member.lastName?.[0] || ""}
                              </div>
                            )}
                            <div className="ml-4">
                              <div className="text-sm font-semibold text-gray-900 border-none outline-none">
                                {member.lastName}, {member.firstName} {member.middleName && member.middleName[0] + "."}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">{member.gender || "Unspecified"}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                          <div className="text-sm font-medium text-gray-900">{member.membershipId || "—"}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {(() => {
                              const computedAge = member.birthday ? calculateAge(member.birthday) : undefined;
                              const ageToShow = computedAge !== undefined ? computedAge : member.age;
                              return ageToShow !== undefined ? `${ageToShow} yrs old` : "No age";
                            })()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                          <div className="text-sm text-gray-900 truncate max-w-[200px]">{member.address || "—"}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{member.network ? `Net: ${member.network}` : "No network"}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 inline-flex text-[11px] leading-4 font-bold rounded-full border shadow-sm
                            ${member.membershipStatus === "Active" ? "bg-green-50 text-green-700 border-green-200" : 
                              member.membershipStatus === "Inactive" ? "bg-yellow-50 text-yellow-700 border-yellow-200" : 
                              "bg-gray-50 text-gray-700 border-gray-200"}`}>
                            {member.membershipStatus}
                          </span>
                        </td>
                        {role === "admin" && (
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button onClick={() => handleEditClick(member)} className="text-blue-500 hover:text-blue-700 mx-1 p-1.5 rounded-md hover:bg-blue-50 border-none bg-transparent curson-pointer outline-none transition" title="Edit text">
                              <Pencil1Icon className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleDelete(member.id!, `${member.firstName} ${member.lastName}`)} className="text-red-500 hover:text-red-700 mx-1 p-1.5 rounded-md hover:bg-red-50 border-none bg-transparent curson-pointer outline-none transition" title="Delete">
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                    {filteredMembers.length === 0 && (
                      <tr>
                        <td colSpan={role === "admin" ? 5 : 4} className="px-6 py-16 text-center text-gray-500 bg-gray-50/30">
                          <div className="flex flex-col items-center justify-center">
                            <div className="bg-white p-3 rounded-full shadow-sm border border-gray-100 mb-3">
                              <MagnifyingGlassIcon className="h-6 w-6 text-gray-400" />
                            </div>
                            <p className="text-sm font-medium text-gray-600">No members found matching &quot;{search}&quot;</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        
        {currentView === "analysis" && (
          <DataAnalysis members={members} onBack={() => setCurrentView("home")} />
        )}

        <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40 transition-opacity" />
            <Dialog.Content className="fixed top-[50%] left-[50%] max-h-[85vh] w-[95vw] max-w-[1100px] translate-x-[-50%] translate-y-[-50%] rounded-xl bg-white p-6 shadow-xl z-50 overflow-y-auto outline-none">
              <Dialog.Title className="text-xl font-semibold text-gray-900 mb-4 border-b border-gray-100 pb-3">
                {editingMember ? "Edit Member Record" : "Add New Member"}
              </Dialog.Title>
              <MemberForm
                key={editingMember ? editingMember.id : "new"}
                initialData={editingMember}
                onSubmit={handleSubmit}
                onCancel={() => setIsModalOpen(false)}
                isSaving={isSaving}
                nextMembershipId={getNextMembershipId()}
                networks={networks}
                ministries={ministries}
              />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        <Dialog.Root open={isNetworkModalOpen} onOpenChange={setIsNetworkModalOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40 transition-opacity" />
            <Dialog.Content className="fixed top-[50%] left-[50%] max-h-[85vh] w-[95vw] max-w-[600px] translate-x-[-50%] translate-y-[-50%] rounded-xl bg-white p-6 shadow-xl z-50 overflow-y-auto outline-none">
              <Dialog.Title className="text-xl font-semibold text-gray-900 mb-2 border-b border-gray-100 pb-3">
                Manage Church Networks
              </Dialog.Title>
              
              {/* Network Data Entry Form */}
              <form onSubmit={handleAddNetwork} className="bg-gray-50 border border-gray-100 rounded-lg p-4 mb-6 space-y-3">
                <h3 className="text-xs font-semibold text-gray-800">
                  {editingNetworkId ? "Edit Church Network Group" : "Add New Church Network Group"}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-gray-600 block">Network Name *</label>
                    <input
                      type="text"
                      placeholder="E.G. YOUTH, COUPLES, MEN"
                      value={newNetworkName}
                      onChange={(e) => setNewNetworkName(e.target.value.toUpperCase())}
                      required
                      className="w-full text-sm bg-white border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-gray-600 block">Network Leader *</label>
                    <input
                      type="text"
                      placeholder="E.G. BRO. JOEL, SIS. CLARA"
                      value={newNetworkLeader}
                      onChange={(e) => setNewNetworkLeader(e.target.value.toUpperCase())}
                      required
                      className="w-full text-sm bg-white border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-2 gap-2">
                  {editingNetworkId && (
                    <button
                      type="button"
                      onClick={handleCancelEditNetwork}
                      className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-semibold rounded-md hover:bg-gray-50 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isSavingNetwork}
                    className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-md hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer"
                  >
                    {isSavingNetwork ? "Saving..." : (editingNetworkId ? "Update Network" : "Add Network")}
                  </button>
                </div>
              </form>

              {/* Existing Network Groups List */}
              <h3 className="text-sm font-semibold text-gray-800 mb-2 font-semibold">Registered Networks ({networks.length})</h3>
              {networks.length > 0 ? (
                <div className="max-h-[30vh] overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-150">
                  {networks.map((net) => (
                    <div key={net.id} className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{net.networkName}</p>
                        <p className="text-xs text-gray-500">Leader: {net.networkLeader}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEditNetwork(net)}
                          className="text-blue-500 hover:text-blue-700 p-1 bg-transparent border-none outline-none transition cursor-pointer"
                          title="Edit Network"
                        >
                          <Pencil1Icon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteNetwork(net.id!, net.networkName)}
                          className="text-red-500 hover:text-red-700 p-1 bg-transparent border-none outline-none transition cursor-pointer"
                          title="Delete Network"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg">
                  No church networks have been registered yet. Add one above to simplify member association.
                </div>
              )}

              <div className="flex justify-end pt-5 mt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsNetworkModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none cursor-pointer"
                >
                  Done
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        <Dialog.Root open={isMinistryModalOpen} onOpenChange={setIsMinistryModalOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40 transition-opacity" />
            <Dialog.Content className="fixed top-[50%] left-[50%] max-h-[85vh] w-[95vw] max-w-[600px] translate-x-[-50%] translate-y-[-50%] rounded-xl bg-white p-6 shadow-xl z-50 overflow-y-auto outline-none">
              <Dialog.Title className="text-xl font-semibold text-gray-900 mb-2 border-b border-gray-100 pb-3">
                Manage Church Ministries
              </Dialog.Title>
              
              {/* Ministry Data Entry Form */}
              <form onSubmit={handleAddMinistry} className="bg-gray-50 border border-gray-100 rounded-lg p-4 mb-6 space-y-3">
                <h3 className="text-xs font-semibold text-gray-800">
                  {editingMinistryId ? "Edit Church Ministry" : "Add New Church Ministry"}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                     <label className="text-[11px] font-semibold text-gray-600 block">Ministry Name *</label>
                     <input
                       type="text"
                       placeholder="E.G. WORSHIP, USHERS, KIDS"
                       value={newMinistryName}
                       onChange={(e) => setNewMinistryName(e.target.value.toUpperCase())}
                       required
                       className="w-full text-sm bg-white border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                     />
                  </div>
                  <div className="space-y-1">
                     <label className="text-[11px] font-semibold text-gray-600 block">Ministry Head *</label>
                     <input
                       type="text"
                       placeholder="E.G. BRO. JOHN, SIS. MARY"
                       value={newMinistryHead}
                       onChange={(e) => setNewMinistryHead(e.target.value.toUpperCase())}
                       required
                       className="w-full text-sm bg-white border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                     />
                  </div>
                </div>
                <div className="flex justify-end pt-2 gap-2">
                  {editingMinistryId && (
                    <button
                      type="button"
                      onClick={handleCancelEditMinistry}
                      className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-semibold rounded-md hover:bg-gray-50 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                     type="submit"
                     disabled={isSavingMinistry}
                     className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-md hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer"
                  >
                     {isSavingMinistry ? "Saving..." : (editingMinistryId ? "Update Ministry" : "Add Ministry")}
                  </button>
                </div>
              </form>

              {/* Existing Ministries List */}
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Registered Ministries ({ministries.length})</h3>
              {ministries.length > 0 ? (
                <div className="max-h-[30vh] overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-150">
                  {ministries.map((min) => (
                    <div key={min.id} className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors">
                      <div>
                         <p className="text-sm font-bold text-gray-900">{min.ministryName}</p>
                         <p className="text-xs text-gray-500">Head: {min.ministryHead}</p>
                      </div>
                      <div className="flex items-center gap-1">
                         <button
                           type="button"
                           onClick={() => handleEditMinistry(min)}
                           className="text-blue-500 hover:text-blue-700 p-1 bg-transparent border-none outline-none transition cursor-pointer"
                           title="Edit Ministry"
                         >
                           <Pencil1Icon className="h-4 w-4" />
                         </button>
                         <button
                           type="button"
                           onClick={() => handleDeleteMinistry(min.id!, min.ministryName)}
                           className="text-red-500 hover:text-red-700 p-1 bg-transparent border-none outline-none transition cursor-pointer"
                           title="Delete Ministry"
                         >
                           <TrashIcon className="h-4 w-4" />
                         </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg">
                  No church ministries have been registered yet. Add one above to simplify member association.
                </div>
              )}

              <div className="flex justify-end pt-5 mt-4 border-t border-gray-100">
                 <button
                   type="button"
                   onClick={() => setIsMinistryModalOpen(false)}
                   className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none cursor-pointer"
                 >
                   Done
                 </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        <Dialog.Root open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40 transition-opacity" />
            <Dialog.Content className="fixed top-[50%] left-[50%] max-h-[85vh] w-[95vw] max-w-[600px] translate-x-[-50%] translate-y-[-50%] rounded-xl bg-white p-6 shadow-xl z-50 overflow-y-auto outline-none">
              <Dialog.Title className="text-xl font-semibold text-gray-900 mb-2 border-b border-gray-100 pb-3">
                Manage Church Events
              </Dialog.Title>
              
              {/* Event Data Entry Form */}
              <form onSubmit={handleAddEvent} className="bg-gray-50 border border-gray-100 rounded-lg p-4 mb-6 space-y-3">
                <h3 className="text-xs font-semibold text-gray-800">
                  {editingEventId ? "Edit Event" : "Schedule New Event"}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                     <label className="text-[11px] font-semibold text-gray-600 block">Event Name *</label>
                     <input
                       type="text"
                       placeholder="E.G. SUNDAY SERVICE"
                       value={newEventName}
                       onChange={(e) => setNewEventName(e.target.value.toUpperCase())}
                       required
                       className="w-full text-sm bg-white border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                     />
                  </div>
                  <div className="space-y-1">
                     <label className="text-[11px] font-semibold text-gray-600 block">Date & Time *</label>
                     <input
                       type="datetime-local"
                       value={newEventDate}
                       onChange={(e) => setNewEventDate(e.target.value)}
                       required
                       className="w-full text-sm bg-white border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                     />
                  </div>
                </div>
                <div className="flex justify-end pt-2 gap-2">
                  {editingEventId && (
                    <button
                      type="button"
                      onClick={handleCancelEditEvent}
                      className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-semibold rounded-md hover:bg-gray-50 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                     type="submit"
                     disabled={isSavingEvent}
                     className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-md hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer"
                  >
                     {isSavingEvent ? "Saving..." : (editingEventId ? "Update Event" : "Schedule Event")}
                  </button>
                </div>
              </form>

              {/* Existing Events List */}
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Upcoming Events ({events.length})</h3>
              {events.length > 0 ? (
                <div className="max-h-[30vh] overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-150">
                  {events.map((evt) => {
                    const countdown = calculateCountdown(evt.eventDate);
                    return (
                    <div key={evt.id} className={`flex items-center justify-between p-3 hover:bg-gray-50 transition-colors ${countdown.passed ? 'opacity-50' : ''}`}>
                      <div className="flex-1">
                         <p className="text-sm font-bold text-gray-900">{evt.eventName}</p>
                         <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                           <CalendarIcon className="w-3 h-3" />
                           {new Date(evt.eventDate).toLocaleString()}
                         </p>
                      </div>
                      <div className="text-right px-4">
                         <div className={`text-xs font-bold px-2 py-1 rounded-full inline-block ${countdown.passed ? 'bg-gray-100 text-gray-500' : 'bg-orange-100 text-orange-700'}`}>
                           {countdown.text}
                         </div>
                      </div>
                      <div className="flex items-center gap-1">
                         <button
                           type="button"
                           onClick={() => handleEditEvent(evt)}
                           className="text-blue-500 hover:text-blue-700 p-1 bg-transparent border-none outline-none transition cursor-pointer"
                           title="Edit Event"
                         >
                           <Pencil1Icon className="h-4 w-4" />
                         </button>
                         <button
                           type="button"
                           onClick={() => handleDeleteEvent(evt.id!, evt.eventName)}
                           className="text-red-500 hover:text-red-700 p-1 bg-transparent border-none outline-none transition cursor-pointer"
                           title="Delete Event"
                         >
                           <TrashIcon className="h-4 w-4" />
                         </button>
                      </div>
                    </div>
                  )})}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg">
                  No church events have been scheduled yet. Schedule one above.
                </div>
              )}

              <div className="flex justify-end pt-5 mt-4 border-t border-gray-100">
                 <button
                   type="button"
                   onClick={() => setIsEventModalOpen(false)}
                   className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none cursor-pointer"
                 >
                   Done
                 </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

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
