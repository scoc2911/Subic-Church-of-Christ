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
  ChevronDown,
  QrCode,
  Download,
  Printer,
  X
} from "lucide-react";
import QRCode from "qrcode";
import { Logo } from "@/components/Logo";

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

  const [selectedMemberForQr, setSelectedMemberForQr] = useState<Member | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");

  React.useEffect(() => {
    if (selectedMemberForQr) {
      QRCode.toDataURL(selectedMemberForQr.qrCode || `scoc-member-id:${selectedMemberForQr.id}`, {
        width: 300,
        margin: 2,
        color: {
          dark: "#1e1b4b", // deep cosmic indigo shade
          light: "#ffffff",
        },
      })
        .then((url) => setQrCodeUrl(url))
        .catch((err) => console.error("QR Pass Generation Error", err));
    } else {
      setQrCodeUrl("");
    }
  }, [selectedMemberForQr]);

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
                <th scope="col" className="px-6 py-3.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Address & Groups</th>
                <th scope="col" className="px-6 py-3.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Check-In Pass</th>
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => setSelectedMemberForQr(member)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold bg-indigo-50/50 hover:bg-indigo-50 text-indigo-750 border border-indigo-150 rounded-lg transition cursor-pointer leading-none"
                      title="View member verification pass"
                    >
                      <QrCode className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Scan pass</span>
                    </button>
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

      {selectedMemberForQr && (
        <div id="qr-modal" className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 rounded-3xl max-w-sm w-full border border-slate-800 shadow-2xl overflow-hidden flex flex-col transform transition-all duration-300 scale-100 font-sans text-xs">
            {/* Header */}
            <div className="bg-indigo-950 px-5 py-4 border-b border-slate-850 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-indigo-400" />
                <h3 className="font-extrabold text-sm tracking-tight">SCOC Digital Pass Terminal</h3>
              </div>
              <button
                onClick={() => setSelectedMemberForQr(null)}
                className="text-white/60 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition border-none bg-transparent cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ID Card Visual Representation Body */}
            <div className="p-6 flex flex-col items-center justify-center bg-slate-950">
              {/* ID Badge Frame */}
              <div className="w-[280px] h-[450px] bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden relative text-center text-slate-850 animate-scale-up">
                {/* Badge Header Banner */}
                <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-3.5 text-white flex items-center justify-center gap-2 border-b-2 border-sky-400">
                  <Logo size={28} className="shrink-0" />
                  <div className="text-left leading-tight">
                    <p className="font-black text-[10px] tracking-widest uppercase">SUBIC CHURCH OF CHRIST</p>
                    <p className="text-[8px] text-sky-400 font-bold uppercase tracking-wider">OFFICIAL REGISTERED CARD</p>
                  </div>
                </div>

                {/* Badge ID Container / Body */}
                <div className="p-5 flex-grow flex flex-col items-center justify-between relative">
                  {/* Photo Frame Container */}
                  <div className="w-24 h-24 rounded-full border-4 border-slate-50 bg-gradient-to-tr from-indigo-100 to-sky-100 text-indigo-700 flex items-center justify-center text-3xl font-black shrink-0 shadow-sm relative overflow-hidden">
                    {selectedMemberForQr.pictures && selectedMemberForQr.pictures.length > 0 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={selectedMemberForQr.pictures[0]}
                        alt="Member Photo"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span>{selectedMemberForQr.firstName?.[0] || ""}{selectedMemberForQr.lastName?.[0] || ""}</span>
                    )}
                  </div>

                  {/* Name and Designation */}
                  <div className="space-y-1 my-2.5">
                    <h4 className="text-base font-black text-slate-905 uppercase leading-snug tracking-tight">
                      {selectedMemberForQr.firstName} {selectedMemberForQr.lastName}
                    </h4>
                    <span className="inline-block px-3 py-0.5 rounded-full bg-sky-50 border border-sky-205 text-sky-800 text-[8.5px] font-extrabold uppercase tracking-widest">
                      {selectedMemberForQr.membershipStatus || "Active Member"}
                    </span>
                  </div>

                  {/* Ministry/Network Specs Grid */}
                  <div className="w-full grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-left pb-1">
                    <div>
                      <p className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wide">MINISTRY</p>
                      <p className="font-extrabold text-slate-750 text-[10px] truncate leading-tight mt-0.5">
                        {selectedMemberForQr.ministry || "General Assembly"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wide">NETWORK CLUSTER</p>
                      <p className="font-extrabold text-slate-750 text-[10px] truncate leading-tight mt-0.5">
                        {selectedMemberForQr.network || "SCOC Network"}
                      </p>
                    </div>
                  </div>

                  {/* QR Core Container */}
                  <div className="bg-slate-50/80 p-1.5 rounded-xl border border-slate-150 flex items-center justify-center w-28 h-28 my-2">
                    {qrCodeUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={qrCodeUrl}
                        alt="SCOC QR ID code"
                        className="w-full h-full rounded-lg"
                      />
                    ) : (
                      <div className="w-4 h-4 border-2 border-indigo-650 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>

                  {/* Mono ID Tag */}
                  <div className="text-[9px] text-slate-450 font-mono font-bold tracking-tight uppercase">
                    MEMBER ID: {selectedMemberForQr.membershipId || "—"}
                  </div>
                </div>

                {/* Footer Banding */}
                <div className="bg-slate-900 text-white/50 text-[8px] font-bold py-2 uppercase tracking-widest border-t border-slate-800">
                  Subic Church of Christ Digital Registry
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div className="bg-slate-1000 border-t border-slate-850 px-5 py-4 flex items-center justify-end gap-2 text-xs">
              <button
                onClick={() => {
                  try {
                    const printWindow = window.open("", "_blank");
                    if (printWindow) {
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>Print ID Badge - ${selectedMemberForQr.firstName} ${selectedMemberForQr.lastName}</title>
                            <style>
                              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');
                              
                              /* Universal color print adjust to prevent background dropping */
                              * {
                                -webkit-print-color-adjust: exact !important;
                                print-color-adjust: exact !important;
                                color-adjust: exact !important;
                                box-sizing: border-box;
                              }

                              @page {
                                size: portrait;
                                margin: 0;
                              }

                              body {
                                font-family: 'Inter', system-ui, -apple-system, sans-serif;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                background-color: #f1f5f9;
                                margin: 0;
                                padding: 0;
                                width: 100vw;
                                height: 100vh;
                              }
                              .id-card {
                                width: 320px;
                                height: 500px;
                                background: #ffffff;
                                border-radius: 20px;
                                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
                                overflow: hidden;
                                border: 1px solid #e2e8f0;
                                display: flex;
                                flex-direction: column;
                                position: relative;
                                text-align: center;
                                margin: auto !important;
                                page-break-inside: avoid;
                              }
                              
                              @media print {
                                body {
                                  background-color: #f1f5f9 !important;
                                }
                                .id-card {
                                  box-shadow: none !important;
                                  border: 1px solid #cbd5e1 !important;
                                }
                              }

                              .card-header {
                                background: linear-gradient(135deg, #090d16, #0e1626) !important;
                                color: #ffffff;
                                padding: 16px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                gap: 10px;
                                border-bottom: 3px solid #00bae1;
                              }
                              .header-logo {
                                width: 36px;
                                height: 36px;
                              }
                              .header-text {
                                text-align: left;
                              }
                              .org-name {
                                font-size: 11px;
                                font-weight: 900;
                                letter-spacing: 0.1em;
                                margin: 0;
                                color: #ffffff;
                                text-transform: uppercase;
                              }
                              .card-title {
                                font-size: 9px;
                                font-weight: 700;
                                letter-spacing: 0.15em;
                                margin: 2px 0 0;
                                color: #2cb0e1;
                                text-transform: uppercase;
                              }
                              .card-body {
                                padding: 24px 20px;
                                flex-grow: 1;
                                display: flex;
                                flex-direction: column;
                                align-items: center;
                              }
                              .photo-frame {
                                width: 100px;
                                height: 100px;
                                border-radius: 50%;
                                border: 4px solid #f1f5f9;
                                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                                background: linear-gradient(135deg, #e0e7ff, #c7d2fe);
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                font-size: 32px;
                                font-weight: 800;
                                color: #4f46e5;
                                overflow: hidden;
                                margin-bottom: 12px;
                              }
                              .photo-frame img {
                                width: 100%;
                                height: 100%;
                                object-fit: cover;
                              }
                              .member-name {
                                font-size: 18px;
                                font-weight: 900;
                                color: #0f172a;
                                margin: 0 0 4px;
                                text-transform: uppercase;
                                letter-spacing: -0.02em;
                              }
                              .role-badge {
                                background-color: #e0f2fe;
                                color: #0369a1;
                                padding: 4px 12px;
                                border-radius: 9999px;
                                font-size: 9px;
                                letter-spacing: 0.05em;
                                margin-bottom: 16px;
                                font-weight: 700;
                                display: inline-block;
                                text-transform: uppercase;
                              }
                              .info-grid {
                                width: 100%;
                                display: grid;
                                grid-template-columns: repeat(2, 1fr);
                                gap: 12px;
                                margin-bottom: 20px;
                                text-align: left;
                                border-top: 1px solid #f1f5f9;
                                padding-top: 12px;
                              }
                              .info-item {
                                display: flex;
                                flex-direction: column;
                              }
                              .info-label {
                                font-size: 8px;
                                font-weight: 700;
                                color: #94a3b8;
                                text-transform: uppercase;
                                letter-spacing: 0.05em;
                                margin-bottom: 2px;
                              }
                              .info-value {
                                font-size: 10px;
                                font-weight: 700;
                                color: #334155;
                                white-space: nowrap;
                                overflow: hidden;
                                text-overflow: ellipsis;
                              }
                              .qr-container {
                                padding: 8px;
                                background: #f8fafc;
                                border-radius: 12px;
                                border: 1px solid #e2e8f0;
                                display: inline-block;
                                margin-top: auto;
                              }
                              .qr-container img {
                                width: 110px;
                                height: 110px;
                                display: block;
                              }
                              .member-id {
                                font-size: 9px;
                                font-family: monospace;
                                color: #64748b;
                                margin-top: 6px;
                                font-weight: 700;
                                letter-spacing: 0.05em;
                              }
                              .card-footer {
                                background-color: #0f172a !important;
                                color: rgba(255, 255, 255, 0.4);
                                padding: 10px;
                                font-size: 8px;
                                font-weight: 700;
                                letter-spacing: 0.1em;
                                text-transform: uppercase;
                                border-top: 1px solid #1e293b;
                              }
                            </style>
                          </head>
                          <body>
                            <div class="id-card">
                              <div class="card-header">
                                <svg class="header-logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><path d="M148,25 C125,58 90,125 70,195 C52,258 46,315 58,345 C68,370 88,360 102,330 C135,260 168,165 185,98 C192,72 178,45 148,25 Z" fill="#2CB0E1"/><path d="M85,385 C145,355 220,310 285,245 C328,202 365,150 380,95 C382,90 376,85 370,90 C345,110 318,118 288,110 C255,102 232,82 205,95 C182,106 160,135 130,170 C100,205 82,248 76,288 C72,310 84,315 95,295 C118,255 145,218 175,190 C190,176 205,162 220,150 C228,144 235,150 231,158 C212,194 184,236 152,280 C120,324 98,362 85,385 Z" fill="#014A75"/></svg>
                                <div class="header-text">
                                  <div class="org-name">Subic Church of Christ</div>
                                  <div class="card-title">Official Member Badge</div>
                                </div>
                              </div>
                              <div class="card-body">
                                <div class="photo-frame">
                                  ${
                                    selectedMemberForQr.pictures && selectedMemberForQr.pictures.length > 0
                                      ? `<img src="${selectedMemberForQr.pictures[0]}" alt="Photo" />`
                                      : `<span>${selectedMemberForQr.firstName?.[0] || ""}${selectedMemberForQr.lastName?.[0] || ""}</span>`
                                  }
                                </div>
                                <h1 class="member-name">${selectedMemberForQr.firstName} ${selectedMemberForQr.lastName}</h1>
                                <div class="role-badge">${selectedMemberForQr.membershipStatus || "Active Member"}</div>
                                
                                <div class="info-grid">
                                  <div class="info-item">
                                    <span class="info-label">DEPARTMENT / MINISTRY</span>
                                    <span class="info-value">${selectedMemberForQr.ministry || "General Assembly"}</span>
                                  </div>
                                  <div class="info-item">
                                    <span class="info-label">NETWORK CLUSTER</span>
                                    <span class="info-value">${selectedMemberForQr.network || "SCOC Network"}</span>
                                  </div>
                                </div>

                                <div class="qr-container">
                                  <img src="${qrCodeUrl}" alt="QR code" />
                                </div>
                                <div class="member-id">ID: ${selectedMemberForQr.membershipId || "—"}</div>
                              </div>
                              <div class="card-footer">
                                AUTHORIZED DIGITAL MEMBERS REGISTER
                              </div>
                            </div>
                            <script>
                              window.onload = function() {
                                setTimeout(function() {
                                  window.print();
                                  window.close();
                                }, 300);
                              }
                            </script>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                    }
                  } catch (e) {
                    console.error("Print popup blocked", e);
                    alert("Print window pop-up was blocked by your browser. Please allow pop-ups or open in a new tab to print!");
                  }
                }}
                disabled={!qrCodeUrl}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-750 hover:border-slate-700 font-bold rounded-xl transition disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5 text-gray-400" />
                Print Card Pass
              </button>
              
              <a
                href={qrCodeUrl}
                download={`SCOC_Pass_${selectedMemberForQr.firstName}_${selectedMemberForQr.lastName}.png`}
                className={`inline-flex items-center gap-1.5 px-4.5 py-2 bg-sky-500 hover:bg-sky-600 text-slate-950 font-black rounded-xl transition shadow-md shadow-sky-500/10 cursor-pointer ${
                  !qrCodeUrl ? "pointer-events-none opacity-50" : ""
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                Download Pass PNG
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
