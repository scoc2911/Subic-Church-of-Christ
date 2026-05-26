import React, { useMemo } from "react";
import { Member, Network, Ministry } from "@/lib/api";
import { calculateAge } from "./MemberForm";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

interface DataAnalysisProps {
  members: Member[];
  onBack: () => void;
}

const COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#64748b"];

export function DataAnalysis({ members, onBack }: DataAnalysisProps) {
  const stats = useMemo(() => {
    let active = 0;
    let inactive = 0;
    
    let male = 0;
    let female = 0;
    
    const ageGroups = {
      "0-12": 0,
      "13-19": 0,
      "20-35": 0,
      "36-50": 0,
      "51+": 0,
      "Unknown": 0
    };
    
    const networkCounts: Record<string, number> = {};
    const ministryCounts: Record<string, number> = {};

    members.forEach((m) => {
      // Status
      if (m.membershipStatus === "Active") active++;
      else if (m.membershipStatus === "Inactive") inactive++;
      
      // Gender
      if (m.gender === "Male") male++;
      else if (m.gender === "Female") female++;
      
      // Age
      let age = m.age;
      if (m.birthday) {
        const calculatedAge = calculateAge(m.birthday);
        if (calculatedAge !== undefined) age = calculatedAge;
      }
      
      if (age === undefined || age === null) {
        ageGroups["Unknown"]++;
      } else if (age <= 12) {
        ageGroups["0-12"]++;
      } else if (age <= 19) {
        ageGroups["13-19"]++;
      } else if (age <= 35) {
        ageGroups["20-35"]++;
      } else if (age <= 50) {
        ageGroups["36-50"]++;
      } else {
        ageGroups["51+"]++;
      }
      
      // Networks
      const net = (m.network || "").trim() || "No Network";
      networkCounts[net] = (networkCounts[net] || 0) + 1;
      
      // Ministries
      const min = (m.ministry || "").trim() || "No Ministry";
      ministryCounts[min] = (ministryCounts[min] || 0) + 1;
    });

    const statusData = [
      { name: "Active", value: active },
      { name: "Inactive", value: inactive }
    ];

    const genderData = [
      { name: "Male", value: male },
      { name: "Female", value: female }
    ];

    const ageData = Object.entries(ageGroups).map(([name, value]) => ({ name, value }));

    const networkData = Object.entries(networkCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
      
    const ministryData = Object.entries(ministryCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return {
      total: members.length,
      statusData,
      genderData,
      ageData,
      networkData,
      ministryData
    };
  }, [members]);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={onBack}
          className="p-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 text-gray-600 transition"
          title="Back to Home"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Data Analysis</h2>
          <p className="text-sm text-gray-500">Overview of church demographics and statistics.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col items-center justify-center">
          <div className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-2">Total Members</div>
          <div className="text-5xl font-extrabold text-blue-600">{stats.total}</div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center gap-6">
           <div className="flex-1">
             <div className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-4">Status</div>
             <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                   <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500"></span>Active</span>
                   <span className="font-bold">{stats.statusData.find(d => d.name === "Active")?.value || 0}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                   <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-500"></span>Inactive</span>
                   <span className="font-bold">{stats.statusData.find(d => d.name === "Inactive")?.value || 0}</span>
                </div>
             </div>
           </div>
           <div className="w-24 h-24">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.statusData} dataKey="value" cx="50%" cy="50%" innerRadius={25} outerRadius={40}>
                    <Cell fill="#3b82f6" />
                    <Cell fill="#f59e0b" />
                  </Pie>
                </PieChart>
             </ResponsiveContainer>
           </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center gap-6">
           <div className="flex-1">
             <div className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-4">Gender</div>
             <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                   <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-teal-500"></span>Male</span>
                   <span className="font-bold">{stats.genderData.find(d => d.name === "Male")?.value || 0}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                   <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-pink-500"></span>Female</span>
                   <span className="font-bold">{stats.genderData.find(d => d.name === "Female")?.value || 0}</span>
                </div>
             </div>
           </div>
           <div className="w-24 h-24">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.genderData} dataKey="value" cx="50%" cy="50%" innerRadius={25} outerRadius={40}>
                    <Cell fill="#14b8a6" />
                    <Cell fill="#ec4899" />
                  </Pie>
                </PieChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        {/* Age Distribution Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Age Distribution</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.ageData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6B7280" }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6B7280" }} />
                <Tooltip cursor={{ fill: "#F3F4F6" }} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Network Distribution Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Network Groups</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.networkData} layout="vertical" margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6B7280" }} />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#374151", fontWeight: 500 }} width={100} />
                <Tooltip cursor={{ fill: "#F3F4F6" }} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24}>
                  {stats.networkData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Ministry Distribution Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:col-span-2">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Ministry Service</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.ministryData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#4B5563" }} angle={-45} textAnchor="end" dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6B7280" }} />
                <Tooltip cursor={{ fill: "#F3F4F6" }} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} barSize={32}>
                  {stats.ministryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
