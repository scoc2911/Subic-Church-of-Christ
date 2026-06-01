"use client";

import React, { useMemo } from "react";
import { Member } from "@/lib/api";
import { DataAnalysis } from "./DataAnalysis";
import { 
  TrendingUp, 
  UserSquare, 
  Printer, 
  Award, 
  School, 
  FilePieChart 
} from "lucide-react";

interface ReportsModuleProps {
  members: Member[];
}

export function ReportsModule({ members }: ReportsModuleProps) {
  const calculations = useMemo(() => {
    let votersCount = 0;
    let studentsCount = 0;
    let collegeCount = 0;
    let totalAge = 0;
    let ageCount = 0;

    members.forEach((m) => {
      if (m.voter === true) votersCount++;
      if (m.yearLevel && ["Elementary", "High School", "College", "Graduate School"].includes(m.yearLevel)) {
        studentsCount++;
      }
      if (m.course && m.course !== "N/A" && m.course !== "") {
        collegeCount++;
      }
      if (m.age) {
        totalAge += m.age;
        ageCount++;
      }
    });

    const averageAge = ageCount > 0 ? Math.round(totalAge / ageCount) : 0;

    return {
      votersCount,
      studentsCount,
      collegeCount,
      averageAge
    };
  }, [members]);

  const handlePrintReport = () => {
    try {
      window.focus();
      window.print();
    } catch (err) {
      console.error("Print triggered an error:", err);
      alert(
        "Printing is blocked by the embedded browser preview environment.\n\n" +
        "Workaround: Please open this application in a new tab (click the 'Open in new tab' button at the top-right of your screen) and try printing there. It will work perfectly!"
      );
    }
  };

  return (
    <div className="space-y-8 animate-fade-in print:bg-white print:p-8">
      {/* Module Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-150 pb-4 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FilePieChart className="w-5 h-5 text-teal-600" />
            Demographics & Statistical Reports
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Real-time demographic breakdowns, educational levels, and registry indicators
          </p>
        </div>

        <button
          onClick={handlePrintReport}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 transition cursor-pointer self-stretch sm:self-center shadow-xs"
        >
          <Printer className="w-4 h-4 text-gray-400" />
          Print Full Report
        </button>
      </div>

      {/* Stats Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 print:grid-cols-4">
        {/* Voters Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-teal-50 border border-teal-100 text-teal-600 rounded-lg shrink-0">
            <UserSquare className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Registered Voters</p>
            <p className="text-xl font-black text-gray-950 mt-0.5">{calculations.votersCount}</p>
          </div>
        </div>

        {/* Student Rate */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-blue-50 border border-blue-100 text-blue-600 rounded-lg shrink-0">
            <School className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active Students</p>
            <p className="text-xl font-black text-gray-950 mt-0.5">{calculations.studentsCount}</p>
          </div>
        </div>

        {/* College Profiles */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-lg shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Graduates / Majors</p>
            <p className="text-xl font-black text-gray-950 mt-0.5">{calculations.collegeCount}</p>
          </div>
        </div>

        {/* Average Age */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-purple-50 border border-purple-100 text-purple-600 rounded-lg shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mean Age</p>
            <p className="text-xl font-black text-gray-950 mt-0.5">{calculations.averageAge} Years</p>
          </div>
        </div>
      </div>

      {/* Renders Recharts Visualizations */}
      <div className="print:block">
        <DataAnalysis members={members} onBack={() => {}} />
      </div>
    </div>
  );
}
