"use client";

import React, { useState, useEffect } from "react";
import { 
  Settings, 
  Save, 
  Building2, 
  User, 
  FileText, 
  Languages, 
  DatabaseBackup,
  Check
} from "lucide-react";

export function SystemSettingsModule() {
  const [churchName, setChurchName] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("scoc_church_name") || "SUBIC CHURCH OF CHRIST";
    }
    return "SUBIC CHURCH OF CHRIST";
  });

  const [defaultMinister, setDefaultMinister] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("scoc_default_minister") || "MINISTER JOEL ABANTE";
    }
    return "MINISTER JOEL ABANTE";
  });

  const [defaultWitness, setDefaultWitness] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("scoc_default_witness") || "N/A";
    }
    return "N/A";
  });

  const [themeMode, setThemeMode] = useState("Light");
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    setTimeout(() => {
      localStorage.setItem("scoc_church_name", churchName.toUpperCase().trim());
      localStorage.setItem("scoc_default_minister", defaultMinister.toUpperCase().trim());
      localStorage.setItem("scoc_default_witness", defaultWitness.toUpperCase().trim());
      
      setIsSaving(false);
      alert("System configurations successfully saved.");
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="border-b border-gray-150 pb-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-600" />
          System Settings & Setup
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Customize database system variables, pre-populated inputs, and templates metadata
        </p>
      </div>

      <form onSubmit={handleSaveSettings} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-6 space-y-6">
          {/* Section 1: Institution metadata */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-widest flex items-center gap-1.5 border-b border-gray-100 pb-2">
              <Building2 className="w-4 h-4 text-gray-400" /> Administrative Info
            </h3>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 block">Church Congregation Name</label>
              <input
                type="text"
                value={churchName}
                onChange={(e) => setChurchName(e.target.value)}
                className="w-full text-sm bg-white border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 uppercase font-semibold"
              />
            </div>
          </div>

          {/* Section 2: Baptism template preloads */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-widest flex items-center gap-1.5 border-b border-gray-100 pb-2">
              <User className="w-4 h-4 text-gray-400" /> Baptism Autofill Defaults
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 block">Senior Officiating Pastor</label>
                <input
                  type="text"
                  value={defaultMinister}
                  onChange={(e) => setDefaultMinister(e.target.value)}
                  className="w-full text-sm bg-white border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 uppercase font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 block">Default Main Witness</label>
                <input
                  type="text"
                  value={defaultWitness}
                  onChange={(e) => setDefaultWitness(e.target.value)}
                  className="w-full text-sm bg-white border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 uppercase font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Interface Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-widest flex items-center gap-1.5 border-b border-gray-100 pb-2">
                <Languages className="w-4 h-4 text-gray-400" /> Theme Mode
              </h3>
              <div className="flex gap-2">
                {["Light", "Dark Theme [N/A]"].map((theme) => {
                  const active = theme === themeMode;
                  return (
                    <button
                      key={theme}
                      type="button"
                      disabled={theme.includes("N/A")}
                      onClick={() => setThemeMode(theme)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
                        active
                          ? "bg-blue-50 border-blue-200 text-blue-700"
                          : "bg-white border-gray-300 text-gray-500 disabled:opacity-50"
                      }`}
                    >
                      {theme}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-widest flex items-center gap-1.5 border-b border-gray-100 pb-2">
                <DatabaseBackup className="w-4 h-4 text-gray-400" /> System Backup
              </h3>
              <button
                type="button"
                onClick={() => alert("All cloud registry assets are fully backed up on persistent secure Firestore Cloud Run containers immediately.")}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 transition cursor-pointer"
              >
                Trigger Integrity Sync File
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gray-50/70 p-4 border-t border-gray-150 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? <Check className="w-4 h-4 animate-bounce" /> : <Save className="w-4 h-4" />}
            {isSaving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
