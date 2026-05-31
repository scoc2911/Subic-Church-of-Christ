"use client";

import React from "react";
import { Member, ChurchEvent, Ministry, Network } from "@/lib/api";
import { Logo } from "@/components/Logo";
import { 
  Users, 
  Droplet, 
  Layers, 
  BookOpen, 
  Calendar,
  AlertCircle,
  PlusCircle,
  Clock,
  ArrowRight
} from "lucide-react";

interface DashboardModuleProps {
  members: Member[];
  events: ChurchEvent[];
  ministries: Ministry[];
  networks: Network[];
  role: "admin" | "viewer";
  onNavigate: (view: "members" | "baptisms" | "attendance" | "reports" | "ministries" | "networks") => void;
  onOpenQuickAdd: () => void;
  onOpenEventModal: () => void;
}

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

export function DashboardModule({
  members,
  events,
  ministries,
  networks,
  role,
  onNavigate,
  onOpenQuickAdd,
  onOpenEventModal,
}: DashboardModuleProps) {
  // Stats
  const totalCount = members.length;
  const activeCount = members.filter(m => m.membershipStatus === "Active").length;
  const baptizedCount = members.filter((m) => {
    return m.isBaptized === true || (
      m.baptismDate !== undefined &&
      m.baptismDate !== "" &&
      m.baptismDate !== "N/A" &&
      m.baptismDate !== "--/--/----"
    ) || (
      m.baptismExecutedBy !== undefined &&
      m.baptismExecutedBy !== "" &&
      m.baptismExecutedBy !== "N/A"
    );
  }).length;
  
  const baptizedPercent = totalCount > 0 ? Math.round((baptizedCount / totalCount) * 100) : 0;
  const activePercent = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0;

  // Filter soonest upcoming events
  const futureEvents = events
    .filter(e => new Date(e.eventDate).getTime() > new Date().getTime())
    .slice(0, 3);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs">
        <div className="flex items-center gap-4 text-center md:text-left flex-col md:flex-row">
          <Logo size={60} className="text-blue-600 shrink-0" />
          <div>
            <h2 className="text-xl md:text-2xl font-black text-gray-950 tracking-tight">SCOC Church Management</h2>
            <p className="text-sm text-gray-500 mt-1 max-w-md">
              Secure database logs, attendance lists, networks directory, and digital certification generation in one integrated place.
            </p>
          </div>
        </div>

        {role === "admin" && (
          <div className="flex gap-2">
            <button
              onClick={onOpenQuickAdd}
              className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs uppercase tracking-wider rounded-lg shadow-sm transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 mr-1.5" /> Add Member
            </button>
            <button
              onClick={onOpenEventModal}
              className="inline-flex items-center justify-center px-4 py-2 border border-blue-200 text-blue-700 hover:bg-blue-50 font-semibold text-xs uppercase tracking-wider rounded-lg shadow-xs transition bg-white cursor-pointer"
            >
              <Calendar className="w-4 h-4 mr-1.5" /> Schedule Event
            </button>
          </div>
        )}
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Members */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Total Registry</span>
            <span className="text-3xl font-black text-gray-950 leading-none block">{totalCount}</span>
            <span className="text-xs text-gray-500 font-medium block">Registered Profiles</span>
          </div>
          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-600">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Active Members */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Active Status</span>
            <span className="text-3xl font-black text-green-700 leading-none block">{activeCount}</span>
            <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded font-bold inline-block">
              {activePercent}% Active Rate
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-green-50 border border-green-100 text-green-600">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Baptized Members */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Holy Baptism</span>
            <span className="text-3xl font-black text-blue-700 leading-none block">{baptizedCount}</span>
            <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-bold inline-block">
              {baptizedPercent}% Spiritual Birth
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-600">
            <Droplet className="w-6 h-6" />
          </div>
        </div>

        {/* Ministries & Networks */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Ministry Groups</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-gray-950">{ministries.length}</span>
              <span className="text-xs text-gray-400 font-bold">Teams</span>
              <span className="text-2xl font-black text-gray-950">{networks.length}</span>
              <span className="text-xs text-gray-400 font-bold">Nets</span>
            </div>
            <span className="text-xs text-gray-500 font-medium block">Administrative Groups</span>
          </div>
          <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-100 text-purple-600">
            <Layers className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Grid: Upcoming and Navigation Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Events Schedule Countdowns */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden flex flex-col justify-between">
          <div className="p-5">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-blue-500" />
              Approaching Events & Services
            </h3>

            {futureEvents.length > 0 ? (
              <div className="space-y-3.5">
                {futureEvents.map((e) => {
                  const countdown = calculateCountdown(e.eventDate);
                  return (
                    <div key={e.id} className="flex items-center justify-between p-3.5 bg-gray-50 border border-gray-150 rounded-lg hover:border-blue-300 transition-colors">
                      <div>
                        <p className="text-xs font-bold text-gray-900">{e.eventName}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          {new Date(e.eventDate).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-extrabold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-100 uppercase tracking-wide">
                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                        {countdown.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 px-4 border border-dashed border-gray-200 rounded-lg text-gray-400 flex flex-col justify-center items-center gap-2">
                <AlertCircle className="w-6 h-6 text-gray-300" />
                <p className="text-xs font-bold">No Approaching Services Scheduled</p>
                {role === "admin" && (
                  <button onClick={onOpenEventModal} className="text-blue-600 hover:underline font-semibold text-xs mt-1">
                    Click to add first event schedule
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="bg-gray-50 border-t border-gray-150 p-4 flex justify-between items-center text-xs">
            <span className="text-gray-500 font-medium">Events Registry Size:</span>
            <span className="text-gray-900 font-bold">{events.length} logs recorded</span>
          </div>
        </div>

        {/* Modules Quick Links */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-500" /> Quick Access
          </h3>

          <div className="grid grid-cols-1 gap-2.5">
            <button
              onClick={() => onNavigate("members")}
              className="w-full text-left p-3 border border-gray-150 hover:border-blue-300 rounded-lg hover:bg-blue-50/10 transition flex items-center justify-between group cursor-pointer"
            >
              <div>
                <p className="text-xs font-bold text-gray-900">Member Directory</p>
                <p className="text-[10px] text-gray-500 mt-0.5">Filter, search, & manage database profiles</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 translate-x-0 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => onNavigate("baptisms")}
              className="w-full text-left p-3 border border-gray-150 hover:border-blue-300 rounded-lg hover:bg-blue-50/10 transition flex items-center justify-between group cursor-pointer"
            >
              <div>
                <p className="text-xs font-bold text-gray-900">Baptismal Records</p>
                <p className="text-[10px] text-gray-500 mt-0.5">Digitize forms & print/export certificates</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 translate-x-0 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => onNavigate("attendance")}
              className="w-full text-left p-3 border border-gray-150 hover:border-blue-300 rounded-lg hover:bg-blue-50/10 transition flex items-center justify-between group cursor-pointer"
            >
              <div>
                <p className="text-xs font-bold text-gray-900">Attendance Tracker</p>
                <p className="text-[10px] text-gray-500 mt-0.5">Take service check lists & monitor rates</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 translate-x-0 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => onNavigate("reports")}
              className="w-full text-left p-3 border border-gray-150 hover:border-blue-300 rounded-lg hover:bg-blue-50/10 transition flex items-center justify-between group cursor-pointer"
            >
              <div>
                <p className="text-xs font-bold text-gray-900">Reports & Analysis</p>
                <p className="text-[10px] text-gray-500 mt-0.5">Demographics charts & membership tallies</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 translate-x-0 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
