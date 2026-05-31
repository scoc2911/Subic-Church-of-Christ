"use client";

import React, { useState } from "react";
import { Member, updateMember } from "@/lib/api";
import { generateBaptismalCertificate } from "@/lib/certificateGen";
import { 
  Droplet, 
  Search, 
  Printer, 
  FileText, 
  Award, 
  BookOpen, 
  Calendar,
  User,
  Plus,
  RefreshCw,
  Check
} from "lucide-react";

interface BaptismRecordsModuleProps {
  members: Member[];
  role: "admin" | "viewer";
}

export function BaptismRecordsModule({ members, role }: BaptismRecordsModuleProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [baptismDate, setBaptismDate] = useState("");
  const [minister, setMinister] = useState("");
  const [witness1, setWitness1] = useState("");
  const [witness2, setWitness2] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Filter members who are baptized
  const baptizedMembers = members.filter((m) => {
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
  });

  // Filter unbaptized members (for recording new baptisms)
  const unbaptizedMembers = members.filter((m) => {
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
    return !isBaptized && m.membershipStatus === "Active";
  });

  const filteredRecords = baptizedMembers.filter((m) => {
    const term = searchTerm.toLowerCase();
    return (
      m.firstName.toLowerCase().includes(term) ||
      m.lastName.toLowerCase().includes(term) ||
      (m.baptismExecutedBy && m.baptismExecutedBy.toLowerCase().includes(term)) ||
      (m.membershipId && m.membershipId.toLowerCase().includes(term))
    );
  });

  const handleRecordBaptism = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId || !baptismDate || !minister) {
      alert("Please fill in the Member, Date, and Officiating Minister fields.");
      return;
    }

    setIsSaving(true);
    try {
      await updateMember(selectedMemberId, {
        isBaptized: true,
        baptismDate,
        baptismExecutedBy: minister.toUpperCase(),
        baptismWitness1: witness1.trim() ? witness1.toUpperCase() : "N/A",
        baptismWitness2: witness2.trim() ? witness2.toUpperCase() : "N/A"
      });

      // Clear form
      setSelectedMemberId("");
      setBaptismDate("");
      setMinister("");
      setWitness1("");
      setWitness2("");
      setIsRegistering(false);
      alert("Baptism record successfully created and member profile updated.");
    } catch (err) {
      console.error(err);
      alert("Failed to record baptism.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Droplet className="w-5 h-5 text-blue-500 fill-blue-500/10" />
            Baptismal Registry
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Digitized baptism certificates and record-keeping for church members
          </p>
        </div>

        {role === "admin" && (
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-blue-700 transition cursor-pointer"
          >
            {isRegistering ? "View Registry" : (
              <>
                <Plus className="w-4 h-4 mr-1.5" /> Record Holy Baptism
              </>
            )}
          </button>
        )}
      </div>

      {isRegistering && role === "admin" ? (
        <form onSubmit={handleRecordBaptism} className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs max-w-2xl mx-auto space-y-4">
          <div className="border-b border-gray-100 pb-2 mb-4">
            <h3 className="text-md font-bold text-gray-800 uppercase tracking-wider">Record New Baptism</h3>
            <p className="text-xs text-gray-500">Update a member&apos;s spiritual milestone</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 block">Select Unbaptized Member *</label>
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                required
                className="w-full text-sm bg-white border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- SELECT MEMBER --</option>
                {unbaptizedMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.lastName}, {m.firstName} ({m.membershipId || "No ID"})
                  </option>
                ))}
              </select>
              {unbaptizedMembers.length === 0 && (
                <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-md">
                  All active registered members have baptism records recorded. If needed, please register a new member first.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 block">Baptism Date *</label>
                <input
                  type="date"
                  value={baptismDate}
                  onChange={(e) => setBaptismDate(e.target.value)}
                  required
                  className="w-full text-sm bg-white border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 block">Officiating Minister *</label>
                <input
                  type="text"
                  placeholder="E.G. MINISTER JOEL ABANTE"
                  value={minister}
                  onChange={(e) => setMinister(e.target.value)}
                  required
                  className="w-full text-sm bg-white border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 block">First Witness (Optional)</label>
                <input
                  type="text"
                  placeholder="WITNESS NAME"
                  value={witness1}
                  onChange={(e) => setWitness1(e.target.value)}
                  className="w-full text-sm bg-white border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 block">Second Witness (Optional)</label>
                <input
                  type="text"
                  placeholder="WITNESS NAME"
                  value={witness2}
                  onChange={(e) => setWitness2(e.target.value)}
                  className="w-full text-sm bg-white border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsRegistering(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !selectedMemberId}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              {isSaving ? "Saving..." : <><Check className="w-4 h-4" /> Save Record</>}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-gray-50 p-3.5 rounded-xl border border-gray-200">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by member name, minister, or membership ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="text-xs font-semibold text-gray-500 bg-white px-3 py-2 rounded-lg border border-gray-250 shrink-0 self-stretch sm:self-center flex items-center justify-center">
              Total Recorded: <span className="text-blue-600 font-bold ml-1">{baptizedMembers.length}</span>
            </div>
          </div>

          {/* Records Grid */}
          {filteredRecords.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRecords.map((m) => {
                const bDateStr = m.baptismDate
                  ? new Date(m.baptismDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
                  : "N/A";
                return (
                  <div key={m.id} className="bg-white border border-gray-200 hover:border-blue-200 rounded-xl overflow-hidden shadow-xs flex flex-col justify-between transition-all group">
                    <div className="p-5 space-y-4">
                      {/* Member Badge & Info */}
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm select-none">
                          {m.firstName[0]}{m.lastName[0]}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-gray-900 leading-tight">
                            {m.lastName}, {m.firstName}
                          </h4>
                          <span className="inline-flex items-center text-[10px] bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded-full font-bold mt-1 uppercase tracking-wide">
                            <Award className="w-3 h-3 mr-0.5" /> Digitized Record
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-dashed border-gray-150 pt-3.5 space-y-2">
                        <div className="flex items-center gap-2 text-xs">
                          <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="text-gray-500 font-medium">Baptized:</span>
                          <span className="text-gray-900 font-bold">{bDateStr}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <User className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="text-gray-500 font-medium">Officiant:</span>
                          <span className="text-gray-900 font-bold truncate max-w-[150px]" title={m.baptismExecutedBy}>
                            {m.baptismExecutedBy || "N/A"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <BookOpen className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="text-gray-500 font-medium">Witnesses:</span>
                          <span className="text-gray-900 font-semibold truncate max-w-[150px]" title={`${m.baptismWitness1 || "N/A"}, ${m.baptismWitness2 || "N/A"}`}>
                            {m.baptismWitness1 && m.baptismWitness1 !== "N/A" ? m.baptismWitness1 : "None recorded"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50/70 border-t border-gray-100 px-5 py-3 flex gap-2">
                      <button
                        onClick={() => generateBaptismalCertificate(m)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 border border-[#D4AF37]/50 text-amber-800 hover:bg-yellow-50 bg-white font-extrabold text-xs uppercase tracking-wider rounded-lg transition shadow-xs cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#D4AF37]" /> Export DOCX
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl p-16 text-center text-gray-500">
              <div className="max-w-md mx-auto space-y-3">
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-full w-14 h-14 flex items-center justify-center mx-auto text-blue-500">
                  <Search className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-gray-800">No Baptismal Records Found</h4>
                <p className="text-sm text-gray-400">
                  No registered baptism records matched your search filters. Try selecting a different search query.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
