"use client";

import React, { useState, useEffect } from "react";
import { subscribeToAuditLogs, AuditLog } from "@/lib/api";
import { 
  Clock, 
  Search, 
  Activity, 
  Trash2, 
  FileText,
  UserCheck,
  ShieldAlert,
  Calendar,
  Layers,
  ArrowUpDown
} from "lucide-react";

export function ActiveEventLogsModule() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<"all" | "checkin" | "other">("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = subscribeToAuditLogs((updatedLogs) => {
      setLogs(updatedLogs);
      setIsLoading(false);
    });

    // Listen to local sandbox updates within same window
    const handleLocalUpdate = () => {
      const unsubscribeTemp = subscribeToAuditLogs((updatedLogs) => {
        setLogs(updatedLogs);
      });
      unsubscribeTemp();
    };
    window.addEventListener("storage_local_update", handleLocalUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener("storage_local_update", handleLocalUpdate);
    };
  }, []);

  // Filter & Search Logic
  const filteredLogs = logs.filter((log) => {
    const actionLower = (log.action || "").toLowerCase();
    const userLower = (log.userEmail || "").toLowerCase();
    const operatorLower = (log.userName || "").toLowerCase();
    const searchLower = searchTerm.toLowerCase();

    const matchesSearch = 
      actionLower.includes(searchLower) || 
      userLower.includes(searchLower) ||
      operatorLower.includes(searchLower);

    const isCheckin = actionLower.includes("present") || actionLower.includes("check-in") || actionLower.includes("scan");

    if (selectedType === "checkin") {
      return matchesSearch && isCheckin;
    } else if (selectedType === "other") {
      return matchesSearch && !isCheckin;
    }
    return matchesSearch;
  });

  // Sort Logic (default newest first / desc)
  const sortedLogs = [...filteredLogs].sort((a, b) => {
    const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
  });

  const checkinsCount = logs.filter(l => (l.action || "").toLowerCase().includes("present") || (l.action || "").toLowerCase().includes("check-in")).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-150 pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-500 animate-pulse" />
            Active Event Logs
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Real-time visual stream of barcode attendance scans, check-ins, and administrative actions
          </p>
        </div>

        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest leading-none self-start sm:self-center">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
          Live Connection Active
        </div>
      </div>

      {/* Analytics widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-250/70 rounded-xl p-4.5 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg shrink-0 border border-indigo-100/50">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Total operations</p>
            <p className="text-xl font-black text-gray-950 mt-0.5">{logs.length}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-250/70 rounded-xl p-4.5 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg shrink-0 border border-emerald-100/50">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Scanned Check-ins</p>
            <p className="text-xl font-black text-gray-950 mt-0.5">{checkinsCount}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-250/70 rounded-xl p-4.5 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg shrink-0 border border-amber-100/50">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">System Events</p>
            <p className="text-xl font-black text-gray-950 mt-0.5">{logs.length - checkinsCount}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-250/70 rounded-xl p-4.5 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg shrink-0 border border-blue-100/50">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Last Activity Time</p>
            <p className="text-xs font-extrabold text-blue-800 bg-blue-50 px-2 py-1 rounded-md mt-0.5 inline-block font-mono leading-none">
              {logs[0]?.timestamp ? new Date(logs[0].timestamp).toLocaleTimeString() : "No events"}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-3xs space-y-4 md:space-y-0 md:flex md:items-center md:justify-between md:gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search log messages, event names, or operators..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 bg-white outline-none font-medium"
          />
        </div>

        {/* Filters and Buttons */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex bg-gray-150/40 border border-gray-200/60 p-1 rounded-lg font-bold">
            <button
              onClick={() => setSelectedType("all")}
              className={`px-3 py-1 rounded-md cursor-pointer transition ${
                selectedType === "all" ? "bg-white text-gray-900 shadow-3xs" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              All Logs
            </button>
            <button
              onClick={() => setSelectedType("checkin")}
              className={`px-3 py-1 rounded-md cursor-pointer transition ${
                selectedType === "checkin" ? "bg-white text-emerald-700 shadow-3xs" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              Check-ins
            </button>
            <button
              onClick={() => setSelectedType("other")}
              className={`px-3 py-1 rounded-md cursor-pointer transition ${
                selectedType === "other" ? "bg-white text-indigo-700 shadow-3xs" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              Logins / Actions
            </button>
          </div>

          <button
            onClick={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")}
            className="p-2 border border-gray-300 hover:bg-gray-50 text-gray-600 hover:text-gray-900 rounded-lg flex items-center gap-1.5 font-bold cursor-pointer transition leading-none"
            title="Toggle sort chronological order"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>{sortOrder === "desc" ? "Newest First" : "Oldest First"}</span>
          </button>
        </div>
      </div>

      {/* Main Logs stream panel */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs flex flex-col">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-150 text-left text-xs">
            <thead className="bg-gray-50/70 border-b border-gray-200 select-none">
              <tr>
                <th scope="col" className="px-5 py-3 font-bold text-gray-500 uppercase tracking-wider text-[10px]">Logged Action & Details</th>
                <th scope="col" className="px-5 py-3 font-bold text-gray-500 uppercase tracking-wider text-[10px]">Type</th>
                <th scope="col" className="px-5 py-3 font-bold text-gray-500 uppercase tracking-wider text-[10px]">Operator</th>
                <th scope="col" className="px-5 py-3 font-bold text-gray-500 uppercase tracking-wider text-[10px]">Date & Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="p-16 text-center text-gray-400">
                    <Activity className="w-6 h-6 animate-spin text-indigo-500 mx-auto mb-2" />
                    <span>Connecting and synchronizing database stream logs...</span>
                  </td>
                </tr>
              ) : sortedLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-16 text-center text-gray-400 italic font-medium">
                    No matching activity records and logs found.
                  </td>
                </tr>
              ) : (
                sortedLogs.map((log) => {
                  const sDate = log.timestamp ? new Date(log.timestamp) : new Date();
                  const isCheckin = 
                    (log.action || "").toLowerCase().includes("present") || 
                    (log.action || "").toLowerCase().includes("check-in") || 
                    (log.action || "").toLowerCase().includes("scan");

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/30 transition-colors">
                      {/* Log Action Message */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-start gap-2.5">
                          {isCheckin ? (
                            <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0 animate-pulse" />
                          ) : (
                            <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                          )}
                          <span className="text-gray-900 font-medium leading-normal">{log.action}</span>
                        </div>
                      </td>

                      {/* Log Type badge */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {isCheckin ? (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
                            Realtime check-in
                          </span>
                        ) : (
                          <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
                            Admin Mutate
                          </span>
                        )}
                      </td>

                      {/* Log Operator info */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div>
                          <p className="font-semibold text-gray-800 leading-none">{log.userName || "System"}</p>
                          <p className="text-[10px] text-gray-400 mt-1 leading-none">{log.userEmail || "—"}</p>
                        </div>
                      </td>

                      {/* Exact timestamp */}
                      <td className="px-5 py-3.5 whitespace-nowrap font-mono text-gray-500">
                        <p className="font-semibold text-gray-800 leading-none">
                          {sDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                        <p className="text-[10px] text-indigo-500 font-extrabold mt-1.5 leading-none">
                          {sDate.toLocaleTimeString("en-US")}
                        </p>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
