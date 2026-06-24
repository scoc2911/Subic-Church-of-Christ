"use client";

import React, { useState, useEffect } from "react";
import { Member } from "@/lib/api";
import QRCode from "qrcode";
import { Logo } from "@/components/Logo";
import { QrCode, X, Download, Printer } from "lucide-react";

export function DigitalPassModal({ member, onClose }: { member: Member; onClose: () => void }) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [isCardBackView, setIsCardBackView] = useState(false);
  const [isCapturingPass, setIsCapturingPass] = useState(false);

  const getDynamicFontSizeClass = (text: string, baseSize: string = "text-[9px]") => {
    if (!text) return baseSize;
    const len = text.length;
    if (len > 25) return "text-[6.5px] leading-[1.1]";
    if (len > 18) return "text-[7.5px] leading-[1.1]";
    if (len > 12) return "text-[8.5px] leading-[1.1]";
    return baseSize;
  };

  const getDynamicFontSizeClassBack = (text: string, baseSize: string = "text-[7.5px]") => {
    if (!text) return baseSize;
    const len = text.length;
    if (len > 25) return "text-[5.5px] leading-tight";
    if (len > 18) return "text-[6.5px] leading-tight";
    return baseSize;
  };

  const getDynamicFontSizeStyle = (text: string, baseSizePt: number = 7.5) => {
    if (!text) return `font-size: ${baseSizePt}pt; line-height: 1.1;`;
    const len = text.length;
    let size = baseSizePt;
    if (len > 25) size = baseSizePt - 2.0;
    else if (len > 18) size = baseSizePt - 1.0;
    else if (len > 12) size = baseSizePt - 0.5;
    return `font-size: ${size}pt; line-height: 1.1;`;
  };

  useEffect(() => {
    if (member) {
      setIsCardBackView(false);
      QRCode.toDataURL(member.qrCode || `scoc-member-id:${member.id}`, {
        width: 300,
        margin: 2,
        color: {
          dark: "#1e1b4b",
          light: "#ffffff",
        },
      })
        .then((url) => setQrCodeUrl(url))
        .catch((err: any) => console.error("QR Pass Generation Error", err?.message || String(err)));
    } else {
      setQrCodeUrl("");
    }
  }, [member]);

  const handleDownloadPassPng = async () => {
    if (!member) return;
    setIsCapturingPass(true);
    try {
      const { toPng } = await import("html-to-image");
      const elementId = isCardBackView ? "scoc-id-card-back" : "scoc-id-card-front";
      const element = document.getElementById(elementId);
      if (!element) {
        alert("ID Card element is missing. Please try again.");
        return;
      }

      const imgUrl = await toPng(element, {
        pixelRatio: 3,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      });

      const a = document.createElement("a");
      a.href = imgUrl;
      const sideName = isCardBackView ? "Back_Side" : "Front_Side";
      a.download = `SCOC_Digital_Pass_${member.firstName}_${member.lastName}_${sideName}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      console.error("Failed to generate digital pass PNG image:", err?.message || String(err));
      alert("Could not generate digital pass image. Please try again.");
    } finally {
      setIsCapturingPass(false);
    }
  };

  const handleDownloadPassPdf = async () => {
    if (!member) return;
    setIsCapturingPass(true);
    try {
      const { jsPDF } = await import("jspdf");
      const { toPng } = await import("html-to-image");
      const elementId = isCardBackView ? "scoc-id-card-back" : "scoc-id-card-front";
      const element = document.getElementById(elementId);
      if (!element) {
        alert("ID Card element is missing. Please try again.");
        return;
      }

      const imgUrl = await toPng(element, {
        pixelRatio: 4,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [54, 86]
      });

      pdf.addImage(imgUrl, 'PNG', 0, 0, 54, 86);
      const sideName = isCardBackView ? "Back_Side" : "Front_Side";
      pdf.save(`SCOC_Digital_Pass_${member.firstName}_${member.lastName}_${sideName}.pdf`);
    } catch (err: any) {
      console.error("Failed to generate digital pass PDF:", err?.message || String(err));
      alert("Could not generate digital pass PDF. Please try again.");
    } finally {
      setIsCapturingPass(false);
    }
  };

  return (
    <div id="qr-modal" className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 rounded-3xl max-w-sm w-full border border-slate-800 shadow-2xl overflow-hidden flex flex-col transform transition-all duration-300 scale-100 font-sans text-xs">
        {/* Header */}
        <div className="bg-indigo-950 px-5 py-4 border-b border-slate-850 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-indigo-400" />
            <h3 className="font-extrabold text-sm tracking-tight">SCOC Digital Pass Terminal</h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition border-none bg-transparent cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ID Card Visual Representation Body */}
        <div className="p-6 flex flex-col items-center justify-center bg-slate-950 gap-4">
          
          {/* Side Toggle Tabs */}
          <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 w-52 shrink-0">
            <button
              onClick={() => setIsCardBackView(false)}
              className={`flex-1 py-1.5 text-center text-[10px] font-extrabold rounded-lg uppercase tracking-wider transition cursor-pointer select-none ${
                !isCardBackView
                  ? "bg-[#1E3A8A] text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Front Side
            </button>
            <button
              onClick={() => setIsCardBackView(true)}
              className={`flex-1 py-1.5 text-center text-[10px] font-extrabold rounded-lg uppercase tracking-wider transition cursor-pointer select-none ${
                isCardBackView
                  ? "bg-[#1E3A8A] text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Back Side
            </button>
          </div>

          {!isCardBackView ? (
            /* FRONT SIDE DESIGN */
            <div id="scoc-id-card-front" className="w-[272px] h-[432px] bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden relative text-center text-slate-850 animate-scale-up">
              {/* Badge Header Banner */}
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-2.5 text-white flex items-center justify-center gap-1.5 border-b-2 border-sky-400 h-[64px] shrink-0">
                <Logo size={24} className="shrink-0" />
                <div className="text-left leading-tight">
                  <p className="font-black text-[9.5px] tracking-wider uppercase">SUBIC CHURCH OF CHRIST</p>
                  <p className="text-[7.5px] text-sky-400 font-bold uppercase tracking-wider">OFFICIAL REGISTERED CARD</p>
                </div>
              </div>

              {/* Badge ID Container / Body */}
              <div className="p-4 flex-grow flex flex-col items-center justify-between relative bg-white h-[324px]">
                {/* Photo Frame Container */}
                <div className="w-20 h-20 rounded-full border-4 border-slate-50 bg-gradient-to-tr from-indigo-100 to-sky-100 text-indigo-700 flex items-center justify-center text-2xl font-black shrink-0 shadow-sm relative overflow-hidden">
                  {member.pictures && member.pictures.length > 0 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={member.pictures[0]}
                      alt="Member Photo"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span>{member.firstName?.[0] || ""}{member.lastName?.[0] || ""}</span>
                  )}
                </div>

                {/* Name and Designation */}
                <div className="space-y-0.5 my-1.5 w-full">
                  <h4 className="text-sm font-black text-slate-950 uppercase leading-snug tracking-tight truncate w-full px-1">
                    {member.firstName} {member.lastName}
                  </h4>
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-sky-50 border border-sky-100 text-sky-800 text-[8px] font-extrabold uppercase tracking-wider">
                    {member.membershipStatus || "Active Member"}
                  </span>
                </div>

                {/* Ministry/Network Specs Grid */}
                <div className="w-full grid grid-cols-2 gap-1.5 border-t border-slate-100 pt-2 text-left">
                  <div className="overflow-visible min-w-0">
                    <p className="text-[7px] text-slate-400 font-extrabold uppercase tracking-wide leading-none">MINISTRY</p>
                    <p className={`font-extrabold text-slate-700 break-words mt-0.5 ${getDynamicFontSizeClass(member.ministry || "General Assembly")}`}>
                      {member.ministry || "General Assembly"}
                    </p>
                  </div>
                  <div className="overflow-visible min-w-0">
                    <p className="text-[7px] text-slate-400 font-extrabold uppercase tracking-wide leading-none">NETWORK CLUSTER</p>
                    <p className={`font-extrabold text-slate-700 break-words mt-0.5 ${getDynamicFontSizeClass(member.network || "SCOC Network")}`}>
                      {member.network || "SCOC Network"}
                    </p>
                  </div>
                </div>

                {/* QR Core Container */}
                <div className="bg-slate-50/80 p-1.5 rounded-lg border border-slate-150 flex items-center justify-center w-20 h-20 my-1">
                  {qrCodeUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrCodeUrl}
                      alt="SCOC QR ID code"
                      className="w-full h-full rounded"
                    />
                  ) : (
                    <div className="w-3 h-3 border-2 border-indigo-650 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>

                {/* Mono ID Tag */}
                <div className="text-[8px] text-slate-450 font-mono font-bold tracking-tight uppercase">
                  MEMBER ID: {member.membershipId || "—"}
                </div>
              </div>

              {/* Footer Banding */}
              <div className="bg-slate-900 text-white/50 text-[7.5px] font-bold py-1.5 uppercase tracking-wider border-t border-slate-800 h-[44px] shrink-0 flex items-center justify-center">
                Subic Church of Christ Digital Registry
              </div>
            </div>
          ) : (
            /* BACK SIDE DESIGN */
            <div id="scoc-id-card-back" className="w-[272px] h-[432px] bg-slate-50 rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden relative text-slate-850 animate-scale-up">
              {/* Badge Header Banner */}
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-2.5 text-white flex items-center justify-center gap-1.5 border-b-2 border-sky-400 h-[64px] shrink-0">
                <Logo size={20} className="shrink-0" />
                <div className="text-left leading-tight">
                  <p className="font-black text-[8.5px] tracking-wider uppercase">SUBIC CHURCH OF CHRIST</p>
                  <p className="text-[7px] text-sky-400 font-bold uppercase tracking-wider">OFFICIAL REGISTERED CARD (BACK)</p>
                </div>
              </div>

              {/* Badge ID Container / Body */}
              <div className="p-3 flex-grow flex flex-col justify-between items-stretch h-[324px]">
                {/* Additional Member Info Grid */}
                <div className="space-y-1.5">
                  {/* Basic specs rows */}
                  <div className="bg-white p-2 rounded-xl border border-slate-150 space-y-1 text-left">
                    <div className="flex justify-between border-b border-dashed border-slate-100 pb-0.5">
                      <span className="text-[6.5px] text-slate-400 font-extrabold uppercase">MEMBER ID</span>
                      <span className="text-[7.5px] text-slate-800 font-bold font-mono tracking-tight">{member.membershipId || "—"}</span>
                    </div>
                    <div className="flex justify-between items-start border-b border-dashed border-slate-100 pb-0.5 gap-2">
                      <span className="text-[6.5px] text-slate-400 font-extrabold uppercase shrink-0">DEPT / MINISTRY</span>
                      <span className={`text-slate-800 font-extrabold text-right break-words overflow-visible ${getDynamicFontSizeClassBack(member.ministry || "GENERAL ASSEMBLY")}`}>
                        {member.ministry || "GENERAL ASSEMBLY"}
                      </span>
                    </div>
                    <div className="flex justify-between items-start border-b border-dashed border-slate-100 pb-0.5 gap-2">
                      <span className="text-[6.5px] text-slate-400 font-extrabold uppercase shrink-0">NETWORK CLUSTER</span>
                      <span className={`text-slate-800 font-extrabold text-right break-words overflow-visible ${getDynamicFontSizeClassBack(member.network || "SCOC NETWORK")}`}>
                        {member.network || "SCOC NETWORK"}
                      </span>
                    </div>
                    {member.contactNumber && (
                      <div className="flex justify-between border-b border-dashed border-slate-100 pb-0.5">
                        <span className="text-[6.5px] text-slate-400 font-extrabold uppercase">CONTACT NO</span>
                        <span className="text-[7.5px] text-slate-800 font-bold font-mono">{member.contactNumber}</span>
                      </div>
                    )}
                    {member.address && (
                      <div className="flex flex-col text-left">
                        <span className="text-[6px] text-slate-400 font-extrabold uppercase mb-0.5">RESIDENTIAL ADDRESS</span>
                        <span className="text-[7px] text-slate-700 font-bold leading-tight line-clamp-2 uppercase">{member.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Emergency Contacts card container */}
                  <div className="bg-red-50/45 border border-red-100 rounded-xl p-2 text-left space-y-0.5">
                    <h5 className="text-[6.5px] text-red-800 font-black tracking-wider uppercase">IN CASE OF EMERGENCY CONTACT</h5>
                    <div className="grid grid-cols-2 gap-1 pt-0.5">
                      <div className="overflow-hidden">
                        <p className="text-[5.5px] text-slate-400 font-bold uppercase">PERSON NAME</p>
                        <p className="text-[7.5px] text-slate-800 font-extrabold truncate uppercase">
                          {member.emergencyContactPerson || "CHURCH OFFICE"}
                        </p>
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-[5.5px] text-slate-400 font-bold uppercase">CONTACT NO</p>
                        <p className="text-[7.5px] text-slate-800 font-bold font-mono truncate">
                          {member.emergencyContactNumber || "0917-123-4567"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Validity Parameters & QR Code Side-by-Side */}
                  <div className="grid grid-cols-3 gap-1 text-left bg-white p-1.5 rounded-xl border border-slate-150 items-center">
                    <div className="col-span-2 space-y-0.5">
                      <div className="leading-none">
                        <span className="text-[5.5px] text-slate-400 font-extrabold uppercase">DATE ISSUED</span>
                        <span className="text-[7.5px] text-slate-800 font-bold font-mono block">{member.dateIssued || (member.createdAt ? member.createdAt.split('T')[0] : "2026-06-08")}</span>
                      </div>
                      <div className="leading-none">
                        <span className="text-[5.5px] text-slate-400 font-extrabold uppercase">EXPIRATION</span>
                        <span className="text-[7.5px] text-slate-800 font-extrabold uppercase tracking-tight block">{member.expirationDate || "LIFETIME"}</span>
                      </div>
                    </div>
                    <div className="col-span-1 bg-slate-50 p-0.5 rounded-lg border border-slate-100 flex items-center justify-center h-8 w-8 ml-auto">
                      {qrCodeUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={qrCodeUrl}
                          alt="QR ID"
                          className="w-full h-full rounded-sm"
                        />
                      ) : (
                        <div className="w-1.5 h-1.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Policies / Reminders */}
                <div className="text-[5.5px] text-justify leading-tight text-slate-400 px-0.5 border-t border-slate-100 pt-1 font-medium space-y-0.5 mt-1.5">
                  <p>• This digital pass belongs to Subic Church of Christ.</p>
                  <p>• If found, please return to church offices or contact through info below.</p>
                  <p>• Official Website: <span className="font-bold text-slate-500 font-mono">www.subicchurchofchrist.org</span></p>
                </div>
              </div>

              {/* Footer Banding */}
              <div className="bg-slate-900 text-white/50 text-[6.5px] font-bold py-1.5 uppercase tracking-wider border-t border-slate-800 h-[44px] shrink-0 flex flex-col items-center justify-center leading-normal">
                <span>Zambales, Philippines</span>
                <span className="text-[5.5px] text-slate-500 lowercase">subicchurchofchrist@gmail.com</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="bg-slate-1000 border-t border-slate-850 px-5 py-4 flex flex-col items-center justify-end gap-2 text-xs">
          <button
            onClick={() => {
              try {
                const printWindow = window.open("", "_blank");
                if (printWindow) {
                  printWindow.document.write(`
                    <html>
                      <head>
                        <title>Print ID Badge - ${member.firstName} ${member.lastName}</title>
                        <style>
                          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');
                          
                          * {
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                            color-adjust: exact !important;
                            box-sizing: border-box;
                          }

                          @page { size: landscape; margin: 0.5in; }
                          body { font-family: 'Inter', system-ui, sans-serif; display: flex; align-items: center; justify-content: center; background-color: #ffffff; margin: 0; padding: 0; width: 100%; height: 100vh; }
                          .badge-container { display: flex; flex-direction: row; gap: 0.25in; justify-content: center; align-items: center; margin: auto !important; }
                          .id-card { width: 2.125in; height: 3.375in; background: #ffffff; border-radius: 0.125in; overflow: hidden; border: 1px solid #cbd5e1; display: flex; flex-direction: column; position: relative; text-align: center; page-break-inside: avoid; box-sizing: border-box; }
                          @media print { body { background-color: #ffffff !important; } .id-card { box-shadow: none !important; border: 1px solid #cbd5e1 !important; } }
                          .card-header { background: linear-gradient(135deg, #090d16, #0e1626) !important; color: #ffffff; padding: 0.08in 0.1in; display: flex; align-items: center; justify-content: center; gap: 0.06in; border-bottom: 2px solid #00bae1; height: 0.5in; }
                          .header-logo { width: 0.28in; height: 0.28in; }
                          .header-text { text-align: left; }
                          .org-name { font-size: 7.5pt; font-weight: 900; letter-spacing: 0.04em; margin: 0; color: #ffffff; text-transform: uppercase; line-height: 1.1; }
                          .card-title { font-size: 5.5pt; font-weight: 700; letter-spacing: 0.08em; margin: 1px 0 0; color: #2cb0e1; text-transform: uppercase; line-height: 1; }
                          .card-body { padding: 0.12in 0.1in 0.08in 0.1in; flex-grow: 1; display: flex; flex-direction: column; align-items: center; justify-content: space-between; background-color: #ffffff; height: 2.525in; }
                          .photo-frame { width: 0.72in; height: 0.72in; border-radius: 50%; border: 2.5px solid #f1f5f9; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05); background: linear-gradient(135deg, #e0e7ff, #c7d2fe); display: flex; align-items: center; justify-content: center; font-size: 14pt; font-weight: 800; color: #4f46e5; overflow: hidden; margin-bottom: 0.04in; }
                          .photo-frame img { width: 100%; height: 100%; object-fit: cover; }
                          .member-name { font-size: 10.5pt; font-weight: 900; color: #0f172a; margin: 0 0 2px; text-transform: uppercase; letter-spacing: -0.02em; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; }
                          .role-badge { background-color: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 9999px; font-size: 6pt; letter-spacing: 0.03em; margin-bottom: 0.05in; font-weight: 700; display: inline-block; text-transform: uppercase; line-height: 1; }
                          .info-grid { width: 100%; display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.08in; margin-bottom: 0.05in; text-align: left; border-top: 1px solid #f1f5f9; padding-top: 0.05in; }
                          .info-item { display: flex; flex-direction: column; overflow: hidden; }
                          .info-label { font-size: 5pt; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 1px; line-height: 1; }
                          .info-value { font-size: 7.5pt; font-weight: 700; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.1; }
                          .qr-container { padding: 3px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; margin-top: auto; margin-bottom: 0.04in; }
                          .qr-container img { width: 0.65in; height: 0.65in; display: block; }
                          .member-id { font-size: 6pt; font-family: monospace; color: #64748b; font-weight: 700; letter-spacing: 0.02em; line-height: 1; }
                          .card-body-back { padding: 0.1in 0.1in 0.08in 0.1in; flex-grow: 1; display: flex; flex-direction: column; justify-content: space-between; background-color: #fafafc; height: 2.525in; }
                          .specs-box { width: 100%; background: white; border-radius: 8px; border: 1px solid #e2e8f0; padding: 0.06in; display: flex; flex-direction: column; gap: 0.04in; text-align: left; }
                          .row-spec { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #f1f5f9; padding-bottom: 0.02in; }
                          .row-spec:last-child { border-bottom: none; padding-bottom: 0; }
                          .row-spec.flex-col { flex-direction: column; align-items: flex-start; gap: 1px; }
                          .label-spec { font-size: 5pt; font-weight: 800; color: #94a3b8; text-transform: uppercase; line-height: 1; }
                          .val-spec { font-size: 6.5pt; font-weight: 700; color: #1e293b; text-transform: uppercase; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 1.1in; }
                          .text-small { font-size: 5.5pt !important; font-weight: 600 !important; line-height: 1.25; color: #475569 !important; white-space: normal !important; max-width: 1.1in !important; }
                          .emergency-box { width: 100%; background: #fef2f2; border-radius: 8px; border: 1px solid #fee2e2; padding: 0.05in 0.06in; text-align: left; margin: 0.02in 0; }
                          .emergency-title { font-size: 5pt; font-weight: 900; color: #991b1b; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.0125em; line-height: 1; }
                          .emergency-grid { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 0.04in; }
                          .emergency-col { display: flex; flex-direction: column; overflow: hidden; }
                          .emergency-label { font-size: 4.5pt; font-weight: 700; color: #b91c1c; line-height: 1; }
                          .emergency-val { font-size: 6pt; font-weight: 800; color: #111827; text-transform: uppercase; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                          .validity-qr-row { width: 100%; background: white; border-radius: 8px; border: 1px solid #e2e8f0; padding: 0.04in 0.06in; display: flex; flex-direction: row; align-items: center; justify-content: space-between; text-align: left; }
                          .validity-block { display: flex; flex-direction: column; gap: 2px; }
                          .text-micro { font-size: 5pt !important; }
                          .text-mono-small { font-size: 6pt !important; line-height: 1; display: block; }
                          .mini-qr { width: 0.32in; height: 0.32in; padding: 1px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; display: flex; align-items: center; justify-content: center; margin-left: auto; }
                          .mini-qr img { width: 100%; height: 100%; display: block; }
                          .reminders-box { font-size: 4.8pt; color: #94a3b8; text-align: left; line-height: 1.25; border-top: 1px solid #f1f5f9; padding-top: 4px; font-weight: 600; }
                          .card-footer { background-color: #0f172a !important; color: rgba(255, 255, 255, 0.4); height: 0.35in; display: flex; align-items: center; justify-content: center; font-size: 5.5pt; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; border-top: 1px solid #1e293b; padding: 0 0.1in; white-space: nowrap; }
                        </style>
                      </head>
                      <body>
                        <div class="badge-container">
                          <!-- FRONT OF THE ID CARD -->
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
                                  member.pictures && member.pictures.length > 0
                                    ? `<img src="${member.pictures[0]}" alt="Photo" />`
                                    : `<span>${member.firstName?.[0] || ""}${member.lastName?.[0] || ""}</span>`
                                }
                              </div>
                              <h1 class="member-name">${member.firstName} ${member.lastName}</h1>
                              <div class="role-badge">${member.membershipStatus || "Active Member"}</div>
                              
                              <div class="info-grid">
                                <div class="info-item" style="overflow: visible;">
                                  <span class="info-label">DEPARTMENT / MINISTRY</span>
                                  <span class="info-value" style="white-space: normal; word-break: break-word; text-overflow: clip; overflow: visible; ${getDynamicFontSizeStyle(member.ministry || "General Assembly", 7.5)}">${member.ministry || "General Assembly"}</span>
                                </div>
                                <div class="info-item" style="overflow: visible;">
                                  <span class="info-label">NETWORK CLUSTER</span>
                                  <span class="info-value" style="white-space: normal; word-break: break-word; text-overflow: clip; overflow: visible; ${getDynamicFontSizeStyle(member.network || "SCOC Network", 7.5)}">${member.network || "SCOC Network"}</span>
                                </div>
                              </div>

                              <div class="qr-container">
                                <img src="${qrCodeUrl}" alt="QR code" />
                              </div>
                              <div class="member-id font-mono">MEMBER ID: ${member.membershipId || "—"}</div>
                            </div>
                            <div class="card-footer">
                              Subic Church of Christ Digital Registry
                            </div>
                          </div>

                          <!-- BACK OF THE ID CARD -->
                          <div class="id-card">
                            <div class="card-header">
                              <svg class="header-logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><path d="M148,25 C125,58 90,125 70,195 C52,258 46,315 58,345 C68,370 88,360 102,330 C135,260 168,165 185,98 C192,72 178,45 148,25 Z" fill="#2CB0E1"/><path d="M85,385 C145,355 220,310 285,245 C328,202 365,150 380,95 C382,90 376,85 370,90 C345,110 318,118 288,110 C255,102 232,82 205,95 C182,106 160,135 130,170 C100,205 82,248 76,288 C72,310 84,315 95,295 C118,255 145,218 175,190 C190,176 205,162 220,150 C228,144 235,150 231,158 C212,194 184,236 152,280 C120,324 98,362 85,385 Z" fill="#014A75"/></svg>
                              <div class="header-text">
                                <div class="org-name">Subic Church of Christ</div>
                                <div class="card-title">Official Member Badge (Back)</div>
                              </div>
                            </div>
                            <div class="card-body-back">
                              <div class="specs-box">
                                <div class="row-spec">
                                  <span class="label-spec">MEMBER ID</span>
                                  <span class="val-spec font-mono">${member.membershipId || "—"}</span>
                                </div>
                                <div class="row-spec" style="align-items: flex-start; gap: 0.05in;">
                                  <span class="label-spec" style="flex-shrink: 0; line-height: 1.2;">DEPT / MINISTRY</span>
                                  <span class="val-spec" style="white-space: normal; word-break: break-word; max-width: none; text-align: right; text-overflow: clip; overflow: visible; ${getDynamicFontSizeStyle(member.ministry || "GENERAL ASSEMBLY", 6.5)}">${member.ministry || "GENERAL ASSEMBLY"}</span>
                                </div>
                                <div class="row-spec" style="align-items: flex-start; gap: 0.05in;">
                                  <span class="label-spec" style="flex-shrink: 0; line-height: 1.2;">NETWORK CLUSTER</span>
                                  <span class="val-spec" style="white-space: normal; word-break: break-word; max-width: none; text-align: right; text-overflow: clip; overflow: visible; ${getDynamicFontSizeStyle(member.network || "SCOC NETWORK", 6.5)}">${member.network || "SCOC NETWORK"}</span>
                                </div>
                                ${member.contactNumber ? `
                                <div class="row-spec">
                                  <span class="label-spec">CONTACT NO</span>
                                  <span class="val-spec font-mono">${member.contactNumber}</span>
                                </div>
                                ` : ""}
                                ${member.address ? `
                                <div class="row-spec flex-col">
                                  <span class="label-spec">RESIDENTIAL ADDRESS</span>
                                  <span class="val-spec text-small line-clamp">${member.address}</span>
                                </div>
                                ` : ""}
                              </div>

                              <div class="emergency-box">
                                <div class="emergency-title">In Case of Emergency Contact</div>
                                <div class="emergency-grid">
                                  <div class="emergency-col">
                                    <span class="emergency-label">PERSON NAME</span>
                                    <span class="emergency-val">${member.emergencyContactPerson || "CHURCH OFFICE"}</span>
                                  </div>
                                  <div class="emergency-col text-right">
                                    <span class="emergency-label">CONTACT NO</span>
                                    <span class="emergency-val font-mono">${member.emergencyContactNumber || "0917-123-4567"}</span>
                                  </div>
                                </div>
                              </div>

                              <div class="validity-qr-row">
                                <div class="validity-block">
                                  <div>
                                    <span class="label-spec text-micro">DATE ISSUED</span>
                                    <span class="val-spec text-mono-small font-mono">${member.dateIssued || (member.createdAt ? member.createdAt.split('T')[0] : "2026-06-08")}</span>
                                  </div>
                                  <div style="margin-top: 4px;">
                                    <span class="label-spec text-micro">EXPIRATION</span>
                                    <span class="val-spec text-micro tracking-tight">${member.expirationDate || "LIFETIME"}</span>
                                  </div>
                                </div>
                                <div class="mini-qr">
                                  <img src="${qrCodeUrl}" alt="QR" />
                                </div>
                              </div>

                              <div class="reminders-box">
                                <p>• This digital pass belongs to Subic Church of Christ.</p>
                                <p>• If found, please return to church offices.</p>
                                <p>• Official Website: <strong>www.subicchurchofchrist.org</strong></p>
                              </div>
                            </div>
                            <div class="card-footer">
                              Zambales, Philippines • subicchurchofchrist@gmail.com
                            </div>
                          </div>
                        </div>
                        <script>
                          window.onload = () => {
                            setTimeout(() => {
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
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-3 bg-slate-800 hover:bg-slate-700 text-white border border-slate-750 font-bold rounded-xl transition disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <Printer className="w-4 h-4 text-gray-450" />
            Print Card Pass
          </button>
          
          <div className="w-full flex gap-2">
            <button
              onClick={handleDownloadPassPng}
              disabled={isCapturingPass || !qrCodeUrl}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-3 bg-sky-500 hover:bg-sky-600 text-slate-950 font-black rounded-xl transition shadow-md shadow-sky-500/10 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {isCapturingPass ? "..." : "Download PNG"}
            </button>
            <button
              onClick={handleDownloadPassPdf}
              disabled={isCapturingPass || !qrCodeUrl}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-3 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-xl transition shadow-md shadow-rose-500/10 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {isCapturingPass ? "..." : "Download PDF"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
