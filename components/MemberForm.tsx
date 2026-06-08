import React, { useState, useRef } from "react";
import { Member, Network, Ministry } from "@/lib/api";
import { 
  User, 
  Phone, 
  GraduationCap, 
  Church, 
  Droplet, 
  Users, 
  Handshake, 
  Search, 
  X,
  Award
} from "lucide-react";
import { generateBaptismalCertificate } from "@/lib/certificateGen";
import { yearLevels, collegeCourses, graduateCourses } from "@/lib/educationData";

export const calculateAge = (birthdayString: string): number | undefined => {
  if (!birthdayString) return undefined;
  const today = new Date();
  const birthDate = new Date(birthdayString);
  if (isNaN(birthDate.getTime())) return undefined;
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? age : undefined;
};

interface MemberFormProps {
  initialData?: Member;
  onSubmit: (data: Omit<Member, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
  nextMembershipId?: string;
  networks?: Network[];
  ministries?: Ministry[];
}

type TabType = "personal" | "contact" | "education" | "church" | "baptism" | "family" | "ministry";

export function MemberForm({
  initialData,
  onSubmit,
  onCancel,
  isSaving,
  nextMembershipId,
  networks = [],
  ministries = []
}: MemberFormProps) {
  const [activeTab, setActiveTab] = useState<TabType>("personal");

  const [formData, setFormData] = useState<Partial<Member>>(() => {
    const data: Partial<Member> = initialData
      ? { ...initialData }
      : {
          membershipStatus: "Active",
          voter: false,
          membershipId: nextMembershipId,
          isBaptized: false,
          gender: "Male"
        };

    if (data.birthday) {
      const computedAge = calculateAge(data.birthday);
      if (computedAge !== undefined) {
        data.age = computedAge;
      }
    }

    if (data.isBaptized === undefined) {
      const hasBaptismDate = data.baptismDate && data.baptismDate !== "" && data.baptismDate !== "N/A";
      const hasExecutedBy = data.baptismExecutedBy && data.baptismExecutedBy !== "" && data.baptismExecutedBy !== "N/A";
      data.isBaptized = !!(hasBaptismDate || hasExecutedBy);
    }

    return data;
  });

  const [isNetworkSelectionOpen, setIsNetworkSelectionOpen] = useState(false);
  const [isMinistrySelectionOpen, setIsMinistrySelectionOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 400;
          const MAX_HEIGHT = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx2d = canvas.getContext("2d");
          if (ctx2d) {
            ctx2d.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
            resolve(dataUrl);
          } else {
            resolve(event.target?.result as string);
          }
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const base64Image = await compressImage(e.target.files[0]);
        setFormData((prev) => ({ ...prev, pictures: [base64Image] }));
      } catch (error) {
        console.error("Error compressing image", error);
        alert("Failed to process image.");
      }
    }
  };

  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      if (name === "isBaptized") {
        setFormData((prev) => {
          const updated = {
            ...prev,
            isBaptized: checked
          };
          if (!checked) {
            updated.baptismExecutedBy = "N/A";
            updated.baptismWitness1 = "N/A";
            updated.baptismWitness2 = "N/A";
            updated.baptismDate = "";
          } else {
            if (updated.baptismExecutedBy === "N/A") updated.baptismExecutedBy = "";
            if (updated.baptismWitness1 === "N/A") updated.baptismWitness1 = "";
            if (updated.baptismWitness2 === "N/A") updated.baptismWitness2 = "";
            if (updated.baptismDate === "N/A") updated.baptismDate = "";
          }
          return updated;
        });
      } else {
        setFormData((prev) => ({ ...prev, [name]: checked }));
      }
    } else if (type === "number") {
      setFormData((prev) => ({ ...prev, [name]: parseInt(value, 10) || undefined }));
    } else {
      const finalValue = type === "text" || type === "textarea" ? value.toUpperCase() : value;
      setFormData((prev) => {
        const newData = { ...prev, [name]: finalValue };

        if (name === "yearLevel") {
          newData.course = "";
          const isCollege = yearLevels.find(g => g.group === "College")?.options.includes(finalValue);
          const isGraduate = yearLevels.find(g => g.group === "Graduate School")?.options.includes(finalValue);
          const isProfessional = yearLevels.find(g => g.group === "Professional / Career")?.options.includes(finalValue);

          if (!isCollege && !isGraduate && !isProfessional && finalValue) {
            newData.course = "N/A";
          }
        }

        if (name === "birthday") {
          if (value) {
            const computedAge = calculateAge(value);
            if (computedAge !== undefined) {
              newData.age = computedAge;
            }
          } else {
            newData.age = undefined;
          }
        }

        if (name === "network" && value) {
          const matching = networks.find(
            (n) => n.networkName.toUpperCase() === value.toUpperCase()
          );
          if (matching) {
            newData.networkLeader = matching.networkLeader.toUpperCase();
          }
        }

        if (name === "networkLeader" && value) {
          const matching = networks.find(
            (n) => n.networkLeader.toUpperCase() === value.toUpperCase()
          );
          if (matching) {
            newData.network = matching.networkName.toUpperCase();
          }
        }

        if (name === "ministry" && value) {
          const matching = ministries.find(
            (m) => m.ministryName.toUpperCase() === value.toUpperCase()
          );
          if (matching) {
            newData.ministryHead = matching.ministryHead.toUpperCase();
          }
        }

        if (name === "ministryHead" && value) {
          const matching = ministries.find(
            (m) => m.ministryHead.toUpperCase() === value.toUpperCase()
          );
          if (matching) {
            newData.ministry = matching.ministryName.toUpperCase();
          }
        }

        return newData;
      });
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.lastName || !formData.firstName || !formData.membershipStatus) {
      alert("Please fill in basic details first (Last Name, First Name, and Membership Status).");
      setActiveTab("personal");
      return;
    }

    const finalData = { ...formData };
    if (finalData.birthday) {
      const computedAge = calculateAge(finalData.birthday);
      if (computedAge !== undefined) {
        finalData.age = computedAge;
      }
    }

    if (!finalData.isBaptized) {
      finalData.isBaptized = false;
      finalData.baptismExecutedBy = "N/A";
      finalData.baptismWitness1 = "N/A";
      finalData.baptismWitness2 = "N/A";
      finalData.baptismDate = "";
    } else {
      finalData.isBaptized = true;
    }

    onSubmit(finalData as Omit<Member, "id" | "createdAt" | "updatedAt">);
  };

  const tabItems: { id: TabType; label: string; icon: React.ComponentType<any> }[] = [
    { id: "personal", label: "Personal Info", icon: User },
    { id: "contact", label: "Contact Info", icon: Phone },
    { id: "education", label: "Education Background", icon: GraduationCap },
    { id: "church", label: "Church Info", icon: Church },
    { id: "baptism", label: "Baptism Information", icon: Droplet },
    { id: "family", label: "Family Information", icon: Users },
    { id: "ministry", label: "Ministry Involvement", icon: Handshake }
  ];

  return (
    <form onSubmit={handleFormSubmit} className="flex flex-col lg:flex-row h-full gap-8">
      {/* Sidebar: Photo and Navigation Tabs */}
      <div className="w-full lg:w-72 flex flex-col gap-6 shrink-0 border-b lg:border-b-0 lg:border-r border-gray-100 pb-6 lg:pb-0 lg:pr-6">
        
        {/* Upload Container */}
        <div className="flex flex-col items-center">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">MEMBER PHOTOGRAPH</span>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-40 h-40 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center overflow-hidden cursor-pointer hover:border-[#1E3A8A] hover:bg-blue-50/20 transition relative group shadow-sm shrink-0"
          >
            {formData.pictures && formData.pictures[0] ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={formData.pictures[0]} alt="Member Frame" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-black/45 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-[11px] font-bold bg-[#1E3A8A] px-2.5 py-1 rounded-md">CHANGE PHOTO</span>
                </div>
              </>
            ) : (
              <div className="text-center text-gray-400 p-4">
                <svg className="mx-auto h-8 w-8 mb-1.5 text-gray-400 group-hover:text-[#1E3A8A] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs font-semibold text-gray-500">CLICK TO UPLOAD</span>
              </div>
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>

        {/* Tab Selection */}
        <div className="space-y-1">
          <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block px-2.5 pb-1">RECORD SECTIONS</span>
          {tabItems.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-3 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-between border cursor-pointer ${
                  isActive
                    ? "bg-blue-50 text-[#1E3A8A] border-blue-200/60 shadow-xs"
                    : "text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-50 border-transparent"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-[#1E3A8A]" : "text-gray-400"}`} strokeWidth={2.2} />
                  <span>{tab.label}</span>
                </div>
                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-[#1E3A8A]" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Tab Content Panel */}
      <div className="flex-1 min-h-[400px] flex flex-col justify-between">
        
        <div className="space-y-6">
          <div className="border-b border-gray-100 pb-3">
            <h4 className="text-sm font-extrabold text-[#1E3A8A] uppercase tracking-widest flex items-center gap-2">
              {(() => {
                const item = tabItems.find((t) => t.id === activeTab);
                if (item) {
                  const HeaderIcon = item.icon;
                  return (
                    <>
                      <HeaderIcon className="w-4.5 h-4.5 text-[#1E3A8A]" strokeWidth={2.5} />
                      {item.label}
                    </>
                  );
                }
                return "";
              })()}
            </h4>
            <p className="text-xs text-gray-400 mt-0.5 font-medium">Please supply accurate system metadata below.</p>
          </div>

          {/* TAB 1: PERSONAL DETAILS */}
          {activeTab === "personal" && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block">Membership ID</label>
                <input
                  type="text"
                  name="membershipId"
                  value={formData.membershipId || ""}
                  onChange={handleFieldChange}
                  placeholder="AUTO-GENERATED"
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase shadow-xs bg-gray-50/50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block">Last Name *</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName || ""}
                  onChange={handleFieldChange}
                  required
                  placeholder="SMITH"
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase shadow-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block">First Name *</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName || ""}
                  onChange={handleFieldChange}
                  required
                  placeholder="JOHN"
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase shadow-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block">Middle Name</label>
                <input
                  type="text"
                  name="middleName"
                  value={formData.middleName || ""}
                  onChange={handleFieldChange}
                  placeholder="LEE"
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase shadow-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block">Gender</label>
                <select
                  name="gender"
                  value={formData.gender || "Male"}
                  onChange={handleFieldChange}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase shadow-xs bg-white"
                >
                  <option value="Male">MALE</option>
                  <option value="Female">FEMALE</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block">Birthday</label>
                <input
                  type="date"
                  name="birthday"
                  value={formData.birthday || ""}
                  onChange={handleFieldChange}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block flex justify-between">
                  <span>Age</span>
                  {formData.birthday && <span className="text-[9px] text-[#1E3A8A] font-extrabold bg-blue-50 px-1.5 rounded-full select-none">Calculated</span>}
                </label>
                <input
                  type="number"
                  name="age"
                  value={formData.age || ""}
                  onChange={handleFieldChange}
                  placeholder="Calculated"
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs bg-gray-100"
                />
              </div>
            </div>
          )}

          {/* TAB 2: CONTACT DETAILS */}
          {activeTab === "contact" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block">Contact Number</label>
                  <input
                    type="text"
                    name="contactNumber"
                    value={formData.contactNumber || ""}
                    onChange={handleFieldChange}
                    placeholder="+91-XXXXX-XXXXX / 09XXXXXXXXX"
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase shadow-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email || ""}
                    onChange={handleFieldChange}
                    placeholder="MEMBER@EMAIL.COM"
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase shadow-xs"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block">Complete Address</label>
                <textarea
                  name="address"
                  value={formData.address || ""}
                  onChange={handleFieldChange}
                  placeholder="ENTER RESIDENTIAL ADDRESS DETAILS..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase shadow-xs"
                />
              </div>
            </div>
          )}

          {/* TAB 3: EDUCATIONAL BACKGROUND */}
          {activeTab === "education" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block">Year Level</label>
                <select
                  name="yearLevel"
                  value={formData.yearLevel || ""}
                  onChange={handleFieldChange}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase shadow-xs bg-white"
                >
                  <option value="">SELECT YEAR LEVEL...</option>
                  {yearLevels.map((group) => (
                    <optgroup key={group.group} label={group.group.toUpperCase()}>
                      {group.options.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block">Course / Educational Field</label>
                {(() => {
                  const isCollege = yearLevels.find(g => g.group === "College")?.options.includes(formData.yearLevel || "");
                  const isGraduate = yearLevels.find(g => g.group === "Graduate School")?.options.includes(formData.yearLevel || "");

                  if (isCollege || isGraduate) {
                    const courses = isCollege ? collegeCourses : graduateCourses;
                    return (
                      <select
                        name="course"
                        value={formData.course || ""}
                        onChange={handleFieldChange}
                        className="w-full border border-gray-300 rounded-lg p-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase shadow-xs bg-white"
                      >
                        <option value="">SELECT COURSE...</option>
                        {courses.map((course) => (
                          <option key={course} value={course}>{course.toUpperCase()}</option>
                        ))}
                        <option value="OTHER">OTHER (SPECIFY IN NOTES)</option>
                      </select>
                    );
                  } else {
                    return (
                      <input
                        type="text"
                        name="course"
                        value={formData.course || ""}
                        onChange={handleFieldChange}
                        placeholder={formData.yearLevel ? "N/A" : "ENTER BACKGROUND DETAILS..."}
                        disabled={formData.yearLevel !== undefined && formData.yearLevel !== "" && !["PROFESSIONAL", "WORKING"].includes(formData.yearLevel)}
                        className="w-full border border-gray-300 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase shadow-xs disabled:bg-gray-50"
                      />
                    );
                  }
                })()}
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block">School / Institution</label>
                <input
                  type="text"
                  name="school"
                  value={formData.school || ""}
                  onChange={handleFieldChange}
                  placeholder="SUBIC ACADEMY / UNIVERSITY OF CHRIST"
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase shadow-xs"
                />
              </div>
            </div>
          )}

          {/* TAB 4: CHURCH INFORMATION */}
          {activeTab === "church" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block">Membership Status *</label>
                <select
                  name="membershipStatus"
                  value={formData.membershipStatus || "Active"}
                  onChange={handleFieldChange}
                  required
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase shadow-xs bg-white"
                >
                  <option value="Active">ACTIVE</option>
                  <option value="Inactive">INACTIVE</option>
                  <option value="Transferred">TRANSFERRED</option>
                  <option value="Deceased">DECEASED</option>
                </select>
              </div>
              <div className="flex items-center pt-5 pl-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    name="voter"
                    checked={formData.voter || false}
                    onChange={handleFieldChange}
                    className="h-4.5 w-4.5 text-[#1E3A8A] focus:ring-blue-500 border-gray-300 rounded transition"
                  />
                  <span className="text-xs font-bold text-gray-600 uppercase select-none">Registered Voter</span>
                </label>
              </div>

              {/* ID Badge Validity Metadata */}
              <div className="md:col-span-2 border-t border-gray-150 pt-4 mt-2">
                <h5 className="text-[11px] font-extrabold text-[#1E3A8A] uppercase tracking-wider mb-2">ID Badge Validity Parameters</h5>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block">Date Issued</label>
                <input
                  type="date"
                  name="dateIssued"
                  value={formData.dateIssued || ""}
                  onChange={handleFieldChange}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block">Expiration Date</label>
                <input
                  type="text"
                  name="expirationDate"
                  value={formData.expirationDate || ""}
                  onChange={handleFieldChange}
                  placeholder="LIFETIME OR E.G. 2031-12-31"
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase shadow-xs bg-white"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block">Special Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes || ""}
                  onChange={handleFieldChange}
                  placeholder="ADD SYSTEM NOTES REGARDING FAMILIES, NETWORK TRANSITIONS, ETC."
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase shadow-xs"
                />
              </div>
            </div>
          )}

          {/* TAB 5: BAPTISM INFORMATION */}
          {activeTab === "baptism" && (
            <div className="space-y-4">
              <div className="bg-blue-50/50 border border-blue-200/50 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <h5 className="text-xs font-extrabold text-[#1E3A8A] uppercase">BAPTISM STATUS DECISION</h5>
                  <p className="text-[11px] text-gray-500 mt-0.5 font-medium">Verify if the member has already gone through water baptism.</p>
                </div>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isBaptized"
                    checked={formData.isBaptized || false}
                    onChange={handleFieldChange}
                    className="h-5 w-5 text-[#1E3A8A] focus:ring-[#1E3A8A] border-gray-300 rounded transition"
                  />
                  <span className="text-xs font-extrabold text-gray-700 uppercase select-none">BAPTIZED</span>
                </label>
              </div>

              {formData.isBaptized && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block">Baptism Date</label>
                    <input
                      type="date"
                      name="baptismDate"
                      value={formData.baptismDate || ""}
                      onChange={handleFieldChange}
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block">Officiating Minister (Executed By)</label>
                    <input
                      type="text"
                      name="baptismExecutedBy"
                      value={formData.baptismExecutedBy && formData.baptismExecutedBy !== "N/A" ? formData.baptismExecutedBy : ""}
                      onChange={handleFieldChange}
                      placeholder="EVANGELIST / MINISTER"
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase shadow-xs bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block">Witness 1</label>
                    <input
                      type="text"
                      name="baptismWitness1"
                      value={formData.baptismWitness1 && formData.baptismWitness1 !== "N/A" ? formData.baptismWitness1 : ""}
                      onChange={handleFieldChange}
                      placeholder="WITNESS NAME 1"
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase shadow-xs bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block">Witness 2</label>
                    <input
                      type="text"
                      name="baptismWitness2"
                      value={formData.baptismWitness2 && formData.baptismWitness2 !== "N/A" ? formData.baptismWitness2 : ""}
                      onChange={handleFieldChange}
                      placeholder="WITNESS NAME 2"
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase shadow-xs bg-white"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: FAMILY DETAILS */}
          {activeTab === "family" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block">Marital Status</label>
                <select
                  name="maritalStatus"
                  value={formData.maritalStatus || "Single"}
                  onChange={handleFieldChange}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase shadow-xs bg-white"
                >
                  <option value="Single">SINGLE</option>
                  <option value="Married">MARRIED</option>
                  <option value="Widowed">WIDOWED</option>
                  <option value="Divorced">DIVORCED</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block">Spouse Name (If married)</label>
                <input
                  type="text"
                  name="spouseName"
                  value={formData.spouseName || ""}
                  onChange={handleFieldChange}
                  placeholder="SPOUSE SPOUSE NAME"
                  disabled={formData.maritalStatus !== "Married"}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase shadow-xs disabled:bg-gray-50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block">Father&apos;s Name</label>
                <input
                  type="text"
                  name="fathersName"
                  value={formData.fathersName || ""}
                  onChange={handleFieldChange}
                  placeholder="FATHER'S FULL NAME"
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase shadow-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block">Mother&apos;s Maiden Name</label>
                <input
                  type="text"
                  name="mothersName"
                  value={formData.mothersName || ""}
                  onChange={handleFieldChange}
                  placeholder="MOTHER'S FULL MAIDEN NAME"
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase shadow-xs"
                />
              </div>

              {/* Emergency Contact */}
              <div className="md:col-span-2 border-t border-gray-150 pt-4 mt-2">
                <h5 className="text-[11px] font-extrabold text-[#1E3A8A] uppercase tracking-wider mb-2">Emergency Contact Details (For Back of ID Badge)</h5>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block">Emergency Contact Person</label>
                <input
                  type="text"
                  name="emergencyContactPerson"
                  value={formData.emergencyContactPerson || ""}
                  onChange={handleFieldChange}
                  placeholder="E.G. MARY SMITH"
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase shadow-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block">Emergency Contact Number</label>
                <input
                  type="text"
                  name="emergencyContactNumber"
                  value={formData.emergencyContactNumber || ""}
                  onChange={handleFieldChange}
                  placeholder="E.G. 09XXXXXXXXX"
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase shadow-xs"
                />
              </div>
            </div>
          )}

          {/* TAB 7: MINISTRY & NETWORKS INVOLVEMENT */}
          {activeTab === "ministry" && (
            <div className="space-y-4">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-4">
                <div className="flex justify-between items-center pb-2.5 border-b border-gray-200">
                  <span className="text-xs font-extrabold text-gray-700 uppercase">CHURCH NETWORK GROUP</span>
                  <button
                    type="button"
                    onClick={() => setIsNetworkSelectionOpen(true)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-bold bg-white hover:bg-blue-50 shadow-3xs border border-gray-200 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Search className="w-3.5 h-3.5" strokeWidth={2.2} /> Select from List
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block">Network Connection</label>
                    <input
                      type="text"
                      name="network"
                      value={formData.network || ""}
                      onChange={handleFieldChange}
                      placeholder="E.G. YOUTH / KIDS"
                      className="w-full border border-gray-300 bg-white rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase shadow-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block">Network Leader</label>
                    <input
                      type="text"
                      name="networkLeader"
                      value={formData.networkLeader || ""}
                      onChange={handleFieldChange}
                      placeholder="BROTHER JOEL / SISTER CLARA"
                      className="w-full border border-gray-300 bg-white rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase shadow-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-4">
                <div className="flex justify-between items-center pb-2.5 border-b border-gray-200">
                  <span className="text-xs font-extrabold text-gray-700 uppercase">MINISTRY DEPARTMENTS</span>
                  <button
                    type="button"
                    onClick={() => setIsMinistrySelectionOpen(true)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-bold bg-white hover:bg-slate-50 shadow-3xs border border-gray-200 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Search className="w-3.5 h-3.5" strokeWidth={2.2} /> Select from List
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block">Active Ministry</label>
                    <input
                      type="text"
                      name="ministry"
                      value={formData.ministry || ""}
                      onChange={handleFieldChange}
                      placeholder="E.G. WORSHIP / KIDS MINISTRY"
                      className="w-full border border-gray-300 bg-white rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase shadow-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block">Ministry Supervisor / Head</label>
                    <input
                      type="text"
                      name="ministryHead"
                      value={formData.ministryHead || ""}
                      onChange={handleFieldChange}
                      placeholder="BROTHER JOHN"
                      className="w-full border border-gray-300 bg-white rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase shadow-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Network Selection Sub Modal */}
        {isNetworkSelectionOpen && (
          <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-xs flex items-center justify-center z-[110] p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 flex flex-col max-h-[80vh]">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[#1E3A8A] text-white">
                <div>
                  <h5 className="text-sm font-bold">Select Active Network</h5>
                  <p className="text-[10px] text-blue-100 mt-0.5 font-semibold">Choose network link details for the database</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNetworkSelectionOpen(false)}
                  className="text-white hover:text-blue-200 transition p-1.5 bg-transparent border-none cursor-pointer flex items-center justify-center rounded-lg hover:bg-white/10"
                >
                  <X className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </div>
              <div className="p-3 overflow-y-auto space-y-2 max-h-[450px]">
                {networks.length > 0 ? (
                  networks.map((net) => {
                    const isSelected = formData.network === net.networkName;
                    return (
                      <button
                        key={net.id}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            network: net.networkName.toUpperCase(),
                            networkLeader: net.networkLeader.toUpperCase()
                          }));
                          setIsNetworkSelectionOpen(false);
                        }}
                        className={`w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between group ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/50 text-[#1E3A8A]"
                            : "border-gray-200 hover:border-blue-400 hover:bg-gray-50"
                        }`}
                      >
                        <div>
                          <span className="text-xs font-bold block">{net.networkName.toUpperCase()}</span>
                          <span className="text-[11px] text-gray-500 block">LEADER: {net.networkLeader.toUpperCase()}</span>
                        </div>
                        <span className="text-[10px] font-extrabold text-[#1E3A8A] border border-blue-200 bg-blue-50/50 px-2.5 py-1 rounded-md">
                          USE NETWORK
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="p-10 text-center text-xs text-gray-400">
                    No active networks catalogued. Create them via dashboard managers.
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, network: "", networkLeader: "" }));
                    setIsNetworkSelectionOpen(false);
                  }}
                  className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 font-bold rounded-lg transition"
                >
                  CLEAR
                </button>
                <button
                  type="button"
                  onClick={() => setIsNetworkSelectionOpen(false)}
                  className="px-4 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 font-bold transition"
                >
                  CLOSE
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Ministry Selection Sub Modal */}
        {isMinistrySelectionOpen && (
          <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-xs flex items-center justify-center z-[110] p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 flex flex-col max-h-[80vh]">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[#1E3A8A] text-white">
                <div>
                  <h5 className="text-sm font-bold">Select Active Ministry</h5>
                  <p className="text-[10px] text-blue-100 mt-0.5 font-semibold">Choose ministry link details for the database</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMinistrySelectionOpen(false)}
                  className="text-white hover:text-blue-200 transition p-1.5 bg-transparent border-none cursor-pointer flex items-center justify-center rounded-lg hover:bg-white/10"
                >
                  <X className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </div>
              <div className="p-3 overflow-y-auto space-y-2 max-h-[450px]">
                {ministries.length > 0 ? (
                  ministries.map((min) => {
                    const isSelected = formData.ministry === min.ministryName;
                    return (
                      <button
                        key={min.id}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            ministry: min.ministryName.toUpperCase(),
                            ministryHead: min.ministryHead.toUpperCase()
                          }));
                          setIsMinistrySelectionOpen(false);
                        }}
                        className={`w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between group ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/50 text-[#1E3A8A]"
                            : "border-gray-200 hover:border-blue-400 hover:bg-gray-50"
                        }`}
                      >
                        <div>
                          <span className="text-xs font-bold block">{min.ministryName.toUpperCase()}</span>
                          <span className="text-[11px] text-gray-500 block">HEAD: {min.ministryHead.toUpperCase()}</span>
                        </div>
                        <span className="text-[10px] font-extrabold text-[#1E3A8A] border border-blue-200 bg-blue-50/50 px-2.5 py-1 rounded-md">
                          USE MINISTRY
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="p-10 text-center text-xs text-gray-400">
                    No active ministries catalogued. Create them via dashboard managers.
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, ministry: "", ministryHead: "" }));
                    setIsMinistrySelectionOpen(false);
                  }}
                  className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 font-bold rounded-lg transition"
                >
                  CLEAR
                </button>
                <button
                  type="button"
                  onClick={() => setIsMinistrySelectionOpen(false)}
                  className="px-4 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 font-bold transition"
                >
                  CLOSE
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions Panel */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center pt-5 mt-8 border-t border-gray-100 gap-4">
          <div>
            {initialData && (
              <button
                type="button"
                onClick={() => generateBaptismalCertificate(initialData)}
                className="px-4 py-2 border border-amber-300 rounded-lg text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100/70 transition flex items-center justify-center gap-2 cursor-pointer shadow-3xs"
              >
                <Award className="w-4 h-4 text-amber-600 animate-pulse" strokeWidth={2} /> Export Word Certificate
              </button>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-600 bg-white hover:bg-gray-50 transition cursor-pointer"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-[#1E3A8A] text-white text-xs font-bold rounded-lg hover:bg-[#0f2d71] transition disabled:opacity-50 cursor-pointer shadow-sm uppercase tracking-wide"
            >
              {isSaving ? "Saving..." : "Save Member Information"}
            </button>
          </div>
        </div>

      </div>

    </form>
  );
}
