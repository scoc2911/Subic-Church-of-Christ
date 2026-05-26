import React, { useState, useRef } from "react";
import { Member, Network, Ministry } from "@/lib/api";
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

export function MemberForm({ initialData, onSubmit, onCancel, isSaving, nextMembershipId, networks = [], ministries = [] }: MemberFormProps) {
  const [formData, setFormData] = useState<Partial<Member>>(() => {
    const data: Partial<Member> = initialData 
      ? { ...initialData } 
      : { membershipStatus: "Active", voter: false, membershipId: nextMembershipId, isBaptized: false };
    
    // Automatically calculate age upon form load if birthday is present
    if (data.birthday) {
      const computedAge = calculateAge(data.birthday);
      if (computedAge !== undefined) {
        data.age = computedAge;
      }
    }

    // Determine starting isBaptized status if not set
    if (data.isBaptized === undefined) {
      const hasBaptismDate = data.baptismDate && data.baptismDate !== "" && data.baptismDate !== "N/A" && data.baptismDate !== "--/--/----";
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

  const handleNetworkSelect = (selectedNetwork: string) => {
    const matching = networks.find(
      (n) => n.networkName.toLowerCase() === selectedNetwork.toLowerCase()
    );
    setFormData((prev) => ({
      ...prev,
      network: selectedNetwork,
      networkLeader: matching ? matching.networkLeader : prev.networkLeader,
    }));
  };

  const handleLeaderSelect = (selectedLeader: string) => {
    const matching = networks.find(
      (n) => n.networkLeader.toLowerCase() === selectedLeader.toLowerCase()
    );
    setFormData((prev) => ({
      ...prev,
      networkLeader: selectedLeader,
      network: matching ? matching.networkName : prev.network,
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
      const finalValue = type === "text" ? value.toUpperCase() : value;
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
            (n) => n.networkName.toLowerCase() === value.toLowerCase()
          );
          if (matching) {
            newData.networkLeader = matching.networkLeader;
          }
        }
        if (name === "networkLeader" && value) {
          const matching = networks.find(
            (n) => n.networkLeader.toLowerCase() === value.toLowerCase()
          );
          if (matching) {
            newData.network = matching.networkName;
          }
        }
        if (name === "ministry" && value) {
          const matching = ministries.find(
            (m) => m.ministryName.toLowerCase() === value.toLowerCase()
          );
          if (matching) {
            newData.ministryHead = matching.ministryHead;
          }
        }
        if (name === "ministryHead" && value) {
          const matching = ministries.find(
            (m) => m.ministryHead.toLowerCase() === value.toLowerCase()
          );
          if (matching) {
            newData.ministry = matching.ministryName;
          }
        }
        return newData;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.lastName || !formData.firstName || !formData.membershipStatus) {
      alert("Last Name, First Name, and Membership Status are required.");
      return;
    }

    // Absolutely ensure age is fully populated and updated on submit
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

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="flex flex-col md:flex-row gap-6 lg:gap-8 items-start mb-6">
        {/* Left Column: Picture Upload */}
        <div className="w-full md:w-56 lg:w-64 flex flex-col items-center flex-shrink-0">
          <label className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Member Photo</label>
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="h-48 w-48 md:h-56 md:w-56 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center overflow-hidden cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors relative group shadow-sm bg-gray-50"
          >
            {formData.pictures && formData.pictures[0] ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={formData.pictures[0]} alt="Member" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-xs font-semibold bg-black/50 px-3 py-1.5 rounded-full">Change Photo</span>
                </div>
              </>
            ) : (
              <div className="text-center text-gray-400 p-4">
                <svg className="mx-auto h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium">Click to<br/>Upload Photo</span>
              </div>
            )}
          </div>
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
          />
        </div>

        {/* Right Column: Form Sections */}
        <div className="flex-1 w-full space-y-6">
          {/* Section: Basic Info & Demographics */}
          <div>
            <div className="pb-2 border-b border-gray-200 mb-4 flex justify-between items-end">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest">Personal Details</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* Basic Info */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Membership ID</label>
          <input type="text" name="membershipId" value={formData.membershipId || ""} onChange={handleChange} className="w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Last Name *</label>
          <input type="text" name="lastName" value={formData.lastName || ""} onChange={handleChange} required className="w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">First Name *</label>
          <input type="text" name="firstName" value={formData.firstName || ""} onChange={handleChange} required className="w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Middle Name</label>
          <input type="text" name="middleName" value={formData.middleName || ""} onChange={handleChange} className="w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500" />
        </div>
        
        {/* Demographics */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Gender</label>
          <select name="gender" value={formData.gender || ""} onChange={handleChange} className="w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500 uppercase">
            <option value="">SELECT...</option>
            <option value="Male">MALE</option>
            <option value="Female">FEMALE</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Birthday</label>
          <input type="date" name="birthday" value={formData.birthday || ""} onChange={handleChange} className="w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700 flex justify-between">
            <span>Age</span>
            {formData.birthday && <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-1.5 rounded">Auto-calculated</span>}
          </label>
          <input type="number" name="age" value={formData.age || ""} onChange={handleChange} placeholder="Calculated from birthday" className="w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500 bg-gray-50 font-medium" />
        </div>
        <div className="space-y-1 lg:col-span-2">
          <label className="text-sm font-medium text-gray-700">Address</label>
          <input type="text" name="address" value={formData.address || ""} onChange={handleChange} className="w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500" />
        </div>

        {/* Education & Status */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Year Level</label>
          <select 
            name="yearLevel" 
            value={formData.yearLevel || ""} 
            onChange={handleChange} 
            className="w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500 uppercase"
          >
            <option value="">SELECT...</option>
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
          <label className="text-sm font-medium text-gray-700">Course / Educ. Background</label>
          {(() => {
            const isCollege = yearLevels.find(g => g.group === "College")?.options.includes(formData.yearLevel || "");
            const isGraduate = yearLevels.find(g => g.group === "Graduate School")?.options.includes(formData.yearLevel || "");
            
            if (isCollege || isGraduate) {
              const courses = isCollege ? collegeCourses : graduateCourses;
              return (
                <select
                  name="course" 
                  value={formData.course || ""} 
                  onChange={handleChange} 
                  className="w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500 uppercase"
                >
                  <option value="">SELECT COURSE...</option>
                  {courses.map((course) => (
                    <option key={course} value={course}>{course.toUpperCase()}</option>
                  ))}
                  <option value="OTHER">OTHER (PLEASE SPECIFY IN NOTES)</option>
                </select>
              );
            } else {
              return (
                <input 
                  type="text" 
                  name="course" 
                  value={formData.course || ""} 
                  onChange={handleChange} 
                  placeholder={
                    formData.yearLevel && !["PROFESSIONAL", "WORKING"].includes(formData.yearLevel) 
                      ? "N/A" 
                      : "ENTER COURSE OR N/A"
                  }
                  disabled={
                    formData.yearLevel !== undefined && 
                    formData.yearLevel !== "" && 
                    !["PROFESSIONAL", "WORKING"].includes(formData.yearLevel)
                  }
                  className="w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500 uppercase disabled:bg-gray-100 disabled:text-gray-500" 
                />
              );
            }
          })()}
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">School</label>
          <input type="text" name="school" value={formData.school || ""} onChange={handleChange} className="w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500" />
        </div>
        
        {/* Church & Status Info */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Membership Status *</label>
          <select name="membershipStatus" value={formData.membershipStatus || "Active"} onChange={handleChange} required className="w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500 uppercase">
            <option value="Active">ACTIVE</option>
            <option value="Inactive">INACTIVE</option>
            <option value="Transferred">TRANSFERRED</option>
            <option value="Deceased">DECEASED</option>
          </select>
        </div>
        <div className="space-y-1 flex items-center mt-6">
          <input type="checkbox" name="voter" checked={formData.voter || false} onChange={handleChange} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded rounded-md" />
          <label className="ml-2 text-sm font-medium text-gray-700">Registered Voter</label>
        </div>

        {/* Parents */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Father&apos;s Name</label>
          <input type="text" name="fathersName" value={formData.fathersName || ""} onChange={handleChange} className="w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Mother&apos;s Name</label>
          <input type="text" name="mothersName" value={formData.mothersName || ""} onChange={handleChange} className="w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500" />
        </div>

        {/* Baptism Information Section Header */}
        <div className="md:col-span-2 lg:col-span-3 xl:col-span-4 pt-4 pb-2 border-b border-gray-200 mt-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Baptism Information</h3>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isBaptized"
              name="isBaptized"
              checked={formData.isBaptized || false}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition cursor-pointer"
            />
            <label htmlFor="isBaptized" className="text-sm font-bold text-gray-700 select-none cursor-pointer">
              Is Already Baptized
            </label>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Baptism Date</label>
          <input
            type={formData.isBaptized ? "date" : "text"}
            name="baptismDate"
            value={formData.isBaptized ? (formData.baptismDate || "") : "--/--/----"}
            onChange={handleChange}
            disabled={!formData.isBaptized}
            className={`w-full rounded-md shadow-sm p-2 border transition ${
              formData.isBaptized
                ? "border-gray-300 bg-white focus:ring-blue-500 focus:border-blue-500"
                : "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
            }`}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Executed By (Officiating Minister)</label>
          <input
            type="text"
            name="baptismExecutedBy"
            value={formData.isBaptized ? (formData.baptismExecutedBy || "") : "N/A"}
            onChange={handleChange}
            disabled={!formData.isBaptized}
            placeholder="Minister's Name"
            className={`w-full rounded-md shadow-sm p-2 border transition ${
              formData.isBaptized
                ? "border-gray-300 bg-white focus:ring-blue-500 focus:border-blue-500"
                : "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
            }`}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Witnessed By (1)</label>
          <input
            type="text"
            name="baptismWitness1"
            value={formData.isBaptized ? (formData.baptismWitness1 || "") : "N/A"}
            onChange={handleChange}
            disabled={!formData.isBaptized}
            placeholder="First Witness Name"
            className={`w-full rounded-md shadow-sm p-2 border transition ${
              formData.isBaptized
                ? "border-gray-300 bg-white focus:ring-blue-500 focus:border-blue-500"
                : "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
            }`}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Witnessed By (2)</label>
          <input
            type="text"
            name="baptismWitness2"
            value={formData.isBaptized ? (formData.baptismWitness2 || "") : "N/A"}
            onChange={handleChange}
            disabled={!formData.isBaptized}
            placeholder="Second Witness Name"
            className={`w-full rounded-md shadow-sm p-2 border transition ${
              formData.isBaptized
                ? "border-gray-300 bg-white focus:ring-blue-500 focus:border-blue-500"
                : "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
            }`}
          />
        </div>

        {/* Network section spacer */}
        <div className="md:col-span-2 lg:col-span-3 xl:col-span-4 pt-4 pb-2 border-b border-gray-200 mt-2">
          <h3 className="text-lg font-semibold text-gray-900">Church Groups</h3>
        </div>

        {/* Network & Network Leader Selection */}
        <div className="space-y-1 md:col-span-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-semibold text-gray-800">Network & Network Leader</label>
            <button
              type="button"
              onClick={() => setIsNetworkSelectionOpen(true)}
              className="inline-flex items-center text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50/80 hover:bg-blue-100/90 px-3 py-1.5 rounded-lg border border-blue-200/50 transition cursor-pointer shadow-xs"
            >
              <svg className="w-4 h-4 mr-1 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h11" />
              </svg>
              Select Network & Leader
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1.5">
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-gray-500 block">Network Name</span>
              <input 
                type="text" 
                name="network" 
                value={formData.network || ""} 
                onChange={handleChange} 
                placeholder="e.g. Youth" 
                className="w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500 text-sm" 
              />
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-gray-500 block">Network Leader</span>
              <input 
                type="text" 
                name="networkLeader" 
                value={formData.networkLeader || ""} 
                onChange={handleChange} 
                placeholder="e.g. Bro. Joel" 
                className="w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500 text-sm" 
              />
            </div>
          </div>
        </div>

        {/* Ministry & Ministry Head Selection */}
        <div className="space-y-1 md:col-span-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-semibold text-gray-800">Ministry & Ministry Head</label>
            <button
              type="button"
              onClick={() => setIsMinistrySelectionOpen(true)}
              className="inline-flex items-center text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50/80 hover:bg-indigo-100/90 px-3 py-1.5 rounded-lg border border-indigo-200/50 transition cursor-pointer shadow-xs"
            >
              <svg className="w-4 h-4 mr-1 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Select Ministry & Head
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1.5">
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-gray-500 block">Ministry Name</span>
              <input 
                type="text" 
                name="ministry" 
                value={formData.ministry || ""} 
                onChange={handleChange} 
                placeholder="E.G. WORSHIP" 
                className="w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500 text-sm" 
              />
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-gray-500 block">Ministry Head</span>
              <input 
                type="text" 
                name="ministryHead" 
                value={formData.ministryHead || ""} 
                onChange={handleChange} 
                placeholder="E.G. BRO. JOHN" 
                className="w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500 text-sm" 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

      {/* Network Selector Sub-Form Modal */}
      {isNetworkSelectionOpen && (
        <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-xs flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-150 flex flex-col max-h-[85vh] scale-100 transform transition-transform">
            <div className="p-4 border-b border-gray-100 flex justify-between items-start bg-gray-50">
              <div>
                <h3 className="text-base font-bold text-gray-900">Select Network Group</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">Choose an active church network to auto-populate fields</p>
              </div>
              <button
                type="button"
                onClick={() => setIsNetworkSelectionOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-sm leading-none p-1.5 hover:bg-gray-100 rounded-md transition cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto space-y-2 max-h-[50vh] bg-white">
              {networks.length > 0 ? (
                <div className="grid grid-cols-1 gap-2">
                  {networks.map((net) => {
                    const isSelected = formData.network === net.networkName && formData.networkLeader === net.networkLeader;
                    return (
                      <button
                        key={net.id}
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            network: net.networkName,
                            networkLeader: net.networkLeader
                          }));
                          setIsNetworkSelectionOpen(false);
                        }}
                        className={`w-full text-left p-3.5 rounded-lg border transition flex items-center justify-between group ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/50"
                            : "border-gray-200 hover:border-blue-400 hover:bg-gray-50/50"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900 group-hover:text-blue-600">{net.networkName}</span>
                            {isSelected && (
                              <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">
                                Selected
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500 block mt-0.5 font-medium">Leader: {net.networkLeader}</span>
                        </div>
                        <div className="px-3 py-1 bg-white group-hover:bg-blue-600 border border-gray-200 group-hover:border-blue-600 text-xs font-semibold text-gray-700 group-hover:text-white rounded-md transition shadow-xs cursor-pointer">
                          Choose
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 px-4 text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl space-y-2">
                  <svg className="mx-auto h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <p className="font-semibold text-gray-500">No Networks Available</p>
                  <p className="text-[11px] text-gray-400">Please register networks under the &quot;Manage Networks&quot; dashboard first.</p>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setFormData(prev => ({ ...prev, network: "", networkLeader: "" }));
                  setIsNetworkSelectionOpen(false);
                }}
                className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 font-semibold rounded-md transition cursor-pointer"
              >
                Clear Selection
              </button>
              <button
                type="button"
                onClick={() => setIsNetworkSelectionOpen(false)}
                className="px-4 py-1.5 text-xs border border-gray-300 rounded-md font-semibold text-gray-700 bg-white hover:bg-gray-50 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ministry Selector Sub-Form Modal */}
      {isMinistrySelectionOpen && (
        <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-xs flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-150 flex flex-col max-h-[85vh] scale-100 transform transition-transform">
            <div className="p-4 border-b border-gray-100 flex justify-between items-start bg-gray-50">
              <div>
                <h3 className="text-base font-bold text-gray-900">Select Church Ministry</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">Choose an active church ministry to auto-populate fields</p>
              </div>
              <button
                type="button"
                onClick={() => setIsMinistrySelectionOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-sm leading-none p-1.5 hover:bg-gray-100 rounded-md transition cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto space-y-2 max-h-[50vh] bg-white">
              {ministries.length > 0 ? (
                <div className="grid grid-cols-1 gap-2">
                  {ministries.map((min) => {
                    const isSelected = formData.ministry === min.ministryName && formData.ministryHead === min.ministryHead;
                    return (
                      <button
                        key={min.id}
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            ministry: min.ministryName,
                            ministryHead: min.ministryHead
                          }));
                          setIsMinistrySelectionOpen(false);
                        }}
                        className={`w-full text-left p-3.5 rounded-lg border transition flex items-center justify-between group ${
                          isSelected
                            ? "border-indigo-600 bg-indigo-50/50"
                            : "border-gray-200 hover:border-indigo-400 hover:bg-gray-50/50"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900 group-hover:text-indigo-600">{min.ministryName}</span>
                            {isSelected && (
                              <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-semibold">
                                Selected
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500 block mt-0.5 font-medium">Head: {min.ministryHead}</span>
                        </div>
                        <div className="px-3 py-1 bg-white group-hover:bg-indigo-600 border border-gray-200 group-hover:border-indigo-600 text-xs font-semibold text-gray-700 group-hover:text-white rounded-md transition shadow-xs cursor-pointer">
                          Choose
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 px-4 text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl space-y-2">
                  <svg className="mx-auto h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <p className="font-semibold text-gray-500">No Ministries Available</p>
                  <p className="text-[11px] text-gray-400">Please register ministries under the &quot;Manage Ministries&quot; dashboard first.</p>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setFormData(prev => ({ ...prev, ministry: "", ministryHead: "" }));
                  setIsMinistrySelectionOpen(false);
                }}
                className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 font-semibold rounded-md transition cursor-pointer"
              >
                Clear Selection
              </button>
              <button
                type="button"
                onClick={() => setIsMinistrySelectionOpen(false)}
                className="px-4 py-1.5 text-xs border border-gray-300 rounded-md font-semibold text-gray-700 bg-white hover:bg-gray-50 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center pt-4 border-t">
        <div>
          {initialData && (
            <button
              type="button"
              onClick={() => generateBaptismalCertificate(initialData)}
              className="px-4 py-2 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Baptismal Certificate
            </button>
          )}
        </div>
        <div className="flex space-x-3">
          <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none">
            Cancel
          </button>
          <button type="submit" disabled={isSaving} className="px-4 py-2 bg-blue-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none disabled:opacity-50">
            {isSaving ? "Saving..." : "Save Member"}
          </button>
        </div>
      </div>
    </form>
  );
}
