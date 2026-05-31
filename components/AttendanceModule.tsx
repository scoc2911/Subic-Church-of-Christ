"use client";

import React, { useState, useEffect } from "react";
import { Member, ChurchEvent } from "@/lib/api";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { 
  Users, 
  Calendar, 
  Check, 
  Save, 
  Clock, 
  Search, 
  Award,
  ListTodo
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

  // Active member list
  const activeMembers = members.filter(m => m.membershipStatus === "Active");

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
        const snapshot = await getDoc(attendanceDocRef);
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
    const allActiveIds = filteredMembers.map(m => m.id!);
    setPresentMembers((prev) => {
      // Toggle all selected
      const containsAll = allActiveIds.every(id => prev.includes(id));
      if (containsAll) {
        return prev.filter(id => !allActiveIds.includes(id));
      } else {
        const unique = new Set([...prev, ...allActiveIds]);
        return Array.from(unique);
      }
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
      });
      alert("Attendance list successfully saved to database.");
    } catch (err) {
      console.error(err);
      alert("Failed to save attendance.");
    } finally {
      setIsSaving(false);
    }
  };

  // Filter members based on search
  const filteredMembers = activeMembers.filter((m) => {
    const term = searchTerm.toLowerCase();
    return (
      m.firstName.toLowerCase().includes(term) ||
      m.lastName.toLowerCase().includes(term) ||
      (m.membershipId && m.membershipId.toLowerCase().includes(term))
    );
  });

  const selectedEvent = events.find(e => e.id === selectedEventId);
  const percentAttendance = activeMembers.length > 0 
    ? Math.round((presentMembers.length / activeMembers.length) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
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
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-4 h-4 text-indigo-500" /> Select Schedule
            </h3>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
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
                    onClick={() => setSelectedEventId(e.id!)}
                    className={`w-full text-left p-3 rounded-lg border transition-all flex flex-col gap-1 cursor-pointer ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/50 shadow-xs"
                        : "border-gray-150 hover:border-indigo-300 hover:bg-gray-50/50"
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
                <div className="bg-gray-50/70 border-b border-gray-200 p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{selectedEvent?.eventName}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Date: {selectedEvent && new Date(selectedEvent.eventDate).toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="bg-white border border-gray-200 px-3 py-1.5 rounded-lg flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <div className="text-left">
                        <p className="text-[10px] uppercase font-bold text-gray-400">Present</p>
                        <p className="text-sm font-bold text-gray-800 leading-tight">
                          {presentMembers.length} / {activeMembers.length}
                        </p>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 px-3 py-1.5 rounded-lg flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <div className="text-left">
                        <p className="text-[10px] uppercase font-bold text-gray-400">Rate</p>
                        <p className="text-sm font-bold text-indigo-600 leading-tight">{percentAttendance}%</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Toolbar */}
                <div className="p-4 border-b border-gray-150 flex flex-col sm:flex-row items-center gap-3">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search active members to log..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>

                  {role === "admin" && (
                    <div className="flex gap-2 w-full sm:w-auto self-stretch">
                      <button
                        onClick={handleSelectAll}
                        className="flex-1 sm:flex-initial px-3.5 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 transition cursor-pointer"
                      >
                        Toggle Page
                      </button>
                      <button
                        onClick={handleSaveAttendance}
                        disabled={isSaving}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-50 cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        {isSaving ? "Saving..." : "Save Log"}
                      </button>
                    </div>
                  )}
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
                          <th scope="col" className="px-6 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {filteredMembers.map((m) => {
                          const isPresent = presentMembers.includes(m.id!);
                          return (
                            <tr
                              key={m.id}
                              onClick={() => handleToggleAttendance(m.id!)}
                              className={`transition-colors cursor-pointer ${
                                isPresent ? "bg-indigo-50/10 hover:bg-indigo-50/25" : "hover:bg-gray-50"
                              }`}
                            >
                              <td className="px-6 py-3 whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                    isPresent ? "bg-indigo-100 text-indigo-700 font-extrabold" : "bg-gray-100 text-gray-600"
                                  }`}>
                                    {m.firstName[0]}{m.lastName[0]}
                                  </div>
                                  <span className="text-sm font-semibold text-gray-900">
                                    {m.lastName}, {m.firstName}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                                {m.membershipId || "—"}
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap text-center">
                                <button
                                  type="button"
                                  className={`h-6 px-3 inline-flex items-center justify-center rounded-full text-xs font-bold shadow-xs transition-all pointer-events-none ${
                                    isPresent
                                      ? "bg-green-100 text-green-700 border border-green-250"
                                      : "bg-gray-100 text-gray-400 border border-gray-200"
                                  }`}
                                >
                                  {isPresent ? "Present" : "Absent"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredMembers.length === 0 && (
                          <tr>
                            <td colSpan={3} className="px-6 py-12 text-center text-gray-400 text-sm">
                              No members active or matching query.
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
