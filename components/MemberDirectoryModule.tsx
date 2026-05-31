"use client";

import React, { useState } from "react";
import { Member, Network, Ministry } from "@/lib/api";
import { calculateAge } from "@/components/MemberForm";
import { 
  Users, 
  Search, 
  Plus, 
  Minus, 
  Edit2, 
  Trash2, 
  Filter, 
  Calendar, 
  NotebookPen,
  ChevronDown
} from "lucide-react";

interface MemberDirectoryModuleProps {
  members: Member[];
  networks: Network[];
  ministries: Ministry[];
  role: "admin" | "viewer";
  onAddMemberClick: () => void;
  onEditMemberClick: (member: Member) => void;
  onDeleteMemberClick: (id: string, name: string) => void;
  onOpenNetworkPanel: () => void;
  onOpenMinistryPanel: () => void;
  onOpenEventPanel: () => void;
}

export function MemberDirectoryModule({
  members,
  networks,
  ministries,
  role,
  onAddMemberClick,
  onEditMemberClick,
  onDeleteMemberClick,
  onOpenNetworkPanel,
  onOpenMinistryPanel,
  onOpenEventPanel,
}: MemberDirectoryModuleProps) {
  const [search, setSearch] = useState("");
  const [baptismFilter, setBaptismFilter] = useState<"all" | "baptized" | "unbaptized">("all");
  const [networkFilter, setNetworkFilter] = useState<string>("all");
  const [ministryFilter, setMinistryFilter] = useState<string>("all");

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
    <div className="space-y-6 animate-fade-in">
      {/* Top Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 leading-none">Church Directory Log</h2>
          <p className="text-xs text-gray-500 mt-1 font-medium">Manage and view registered church members</p>
        </div>

        {role === "admin" && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onOpenEventPanel}
              className="inline-flex items-center justify-center px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 transition cursor-pointer"
            >
              <Calendar className="w-4 h-4 mr-1.5 text-gray-500" /> Events
            </button>
            <button
              onClick={onOpenMinistryPanel}
              className="inline-flex items-center justify-center px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 transition cursor-pointer"
            >
              <NotebookPen className="w-4 h-4 mr-1.5 text-gray-500" /> Ministries
            </button>
            <button
              onClick={onOpenNetworkPanel}
              className="inline-flex items-center justify-center px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 transition cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1.5 text-gray-500" /> Networks
            </button>
            <button
              onClick={onAddMemberClick}
              className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add Member Profile
            </button>
          </div>
        )}
      </div>

      {/* Advanced Filters */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 bg-gray-50/70 p-4 rounded-xl border border-gray-200 shadow-xs">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by first name, last name, or membership ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        {/* Filters Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Baptism Toggle Segment */}
          <div className="flex items-center border border-gray-300 rounded-lg p-1 bg-white shadow-inner shrink-0 overflow-x-auto">
            <button
              type="button"
              onClick={() => setBaptismFilter("all")}
              className={`px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                baptismFilter === "all"
                  ? "bg-blue-50 text-blue-600 border border-blue-100"
                  : "text-gray-500 hover:text-gray-900 border border-transparent"
              }`}
            >
              All Users
            </button>
            <button
              type="button"
              onClick={() => setBaptismFilter("baptized")}
              className={`px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                baptismFilter === "baptized"
                  ? "bg-green-50 text-green-700 border border-green-100"
                  : "text-gray-500 hover:text-gray-900 border border-transparent"
              }`}
            >
              Baptized
            </button>
            <button
              type="button"
              onClick={() => setBaptismFilter("unbaptized")}
              className={`px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                baptismFilter === "unbaptized"
                  ? "bg-amber-50 text-amber-700 border border-amber-100"
                  : "text-gray-500 hover:text-gray-900 border border-transparent"
              }`}
            >
              Unbaptized
            </button>
          </div>

          {/* Network Filter */}
          <select
            value={networkFilter}
            onChange={(e) => setNetworkFilter(e.target.value)}
            className="block pl-3 pr-8 py-2 border border-gray-300 rounded-lg bg-white sm:text-xs shadow-xs focus:ring-2 focus:ring-blue-500 cursor-pointer text-gray-700 outline-none font-bold"
          >
            <option value="all">All Networks</option>
            {networks.map((net) => (
              <option key={net.id} value={net.networkName}>
                {net.networkName}
              </option>
            ))}
          </select>

          {/* Ministry Filter */}
          <select
            value={ministryFilter}
            onChange={(e) => setMinistryFilter(e.target.value)}
            className="block pl-3 pr-8 py-2 border border-gray-300 rounded-lg bg-white sm:text-xs shadow-xs focus:ring-2 focus:ring-blue-500 cursor-pointer text-gray-700 outline-none font-bold"
          >
            <option value="all">All Ministries</option>
            {ministries.map((min) => (
              <option key={min.id} value={min.ministryName}>
                {min.ministryName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Directory Table Grid */}
      <div className="bg-white shadow-xs rounded-xl overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/80 border-b border-gray-200">
              <tr>
                <th scope="col" className="px-6 py-3.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Member Name</th>
                <th scope="col" className="px-6 py-3.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">ID / Age</th>
                <th scope="col" className="px-6 py-3.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Address & Groups</th>
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
                <tr key={member.id} className="hover:bg-blue-50/15 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {member.pictures && member.pictures[0] ? (
                        <div className="h-10 w-10 flex-shrink-0 rounded-full overflow-hidden border border-gray-150">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={member.pictures[0]} alt="" className="h-full w-full object-cover" />
                        </div>
                      ) : (
                        <div className="h-10 w-10 flex-shrink-0 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs tracking-wide shadow-xs select-none">
                          {member.firstName?.[0] || ""}{member.lastName?.[0] || ""}
                        </div>
                      )}
                      <div className="ml-4">
                        <div className="text-sm font-semibold text-gray-900 leading-tight">
                          {member.lastName}, {member.firstName} {member.middleName && member.middleName[0] + "."}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">{member.gender || "Unspecified"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                    <div className="text-sm font-bold text-gray-700">{member.membershipId || "—"}</div>
                    <div className="text-xs text-gray-500 mt-0.5 font-medium">
                      {(() => {
                        const computedAge = member.birthday ? calculateAge(member.birthday) : undefined;
                        const ageToShow = computedAge !== undefined ? computedAge : member.age;
                        return ageToShow !== undefined ? `${ageToShow} yrs old` : "No age log";
                      })()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                    <div className="text-xs text-gray-900 truncate max-w-[180px] font-medium">{member.address || "—"}</div>
                    <div className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-wider">
                      {member.network ? `Net: ${member.network}` : "No Network Assigned"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 inline-flex text-[11px] leading-4 font-bold rounded-full border shadow-xs uppercase tracking-wide
                      ${member.membershipStatus === "Active" ? "bg-green-50 text-green-700 border-green-200" : 
                        member.membershipStatus === "Inactive" ? "bg-yellow-50 text-yellow-700 border-yellow-250" : 
                        "bg-gray-50 text-gray-700 border-gray-200"}`}>
                      {member.membershipStatus}
                    </span>
                  </td>
                  {role === "admin" && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-1">
                        <button 
                          onClick={() => onEditMemberClick(member)} 
                          className="text-blue-500 hover:text-blue-700 p-1.5 rounded-lg hover:bg-blue-50 border-none bg-transparent cursor-pointer transition" 
                          title="Edit Profile"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => onDeleteMemberClick(member.id!, `${member.firstName} ${member.lastName}`)} 
                          className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 border-none bg-transparent cursor-pointer transition" 
                          title="Delete Profile"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filteredMembers.length === 0 && (
                <tr>
                  <td colSpan={role === "admin" ? 5 : 4} className="px-6 py-16 text-center text-gray-500 bg-gray-50/20">
                    <div className="flex flex-col items-center justify-center">
                      <div className="bg-white p-3 rounded-full shadow-xs border border-gray-200 mb-3 text-gray-400">
                        <Users className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-bold text-gray-700">No members match filters</p>
                      <p className="text-xs text-gray-400 mt-1">Try resetting search filters or search values.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
