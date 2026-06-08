"use client";

import React, { useState, useEffect } from "react";
import { Member, ChurchEvent, createAuditLog } from "@/lib/api";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "@/lib/firebase-error";
import { 
  Users, 
  Calendar, 
  Check, 
  Save, 
  Clock, 
  Search, 
  Award,
  ListTodo,
  Download,
  Printer,
  MessageSquare,
  Filter,
  CheckCircle,
  XCircle,
  Copy,
  FileSpreadsheet,
  AlertCircle,
  QrCode
} from "lucide-react";

interface AttendanceModuleProps {
  members: Member[];
  events: ChurchEvent[];
  role: "admin" | "viewer";
}

export function AttendanceModule({ members, events, role }: AttendanceModuleProps) {
  const [selectedEventId, setSelectedEventId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [presentMembers, setPresentMembers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Advanced States
  const [selectedNetwork, setSelectedNetwork] = useState("");
  const [selectedMinistry, setSelectedMinistry] = useState("");
  const [currentTab, setCurrentTab] = useState<"all" | "present" | "absent" | "qr_scanner">("all");
  const [copiedMemberId, setCopiedMemberId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // QR Check-In Terminal States
  const [scans, setScans] = useState<Array<{ memberId: string; name: string; scannedAt: string }>>([]);
  const [useUploadInstead, setUseUploadInstead] = useState(false);
  const [lastScannedResult, setLastScannedResult] = useState<{
    name: string;
    time: string;
    status: "success" | "duplicate" | "error";
    errorMsg?: string;
    member?: Member;
  } | null>(null);

  // Active member list
  const activeMembers = members.filter(m => m.membershipStatus === "Active");

  // Get list of unique networks and ministries from active members
  const availableNetworks = Array.from(new Set(activeMembers.map(m => m.network).filter(Boolean))) as string[];
  const availableMinistries = Array.from(new Set(activeMembers.map(m => m.ministry).filter(Boolean))) as string[];

  // Toast Auto-dismiss
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Load attendance when event is selected
  useEffect(() => {
    let active = true;
    let unsubscribeFirestore: (() => void) | null = null;

    const loadAttendance = async () => {
      if (!selectedEventId) {
        if (active) {
          setPresentMembers([]);
          setScans([]);
        }
        return;
      }
      setIsLoading(true);
      try {
        if (typeof window !== "undefined" && localStorage.getItem("scoc_sandbox") === "true") {
          const loadLocalData = () => {
            const raw = localStorage.getItem(`scoc_sandbox_attendance_${selectedEventId}`);
            if (raw) {
              try {
                const data = JSON.parse(raw);
                if (active) {
                  setPresentMembers(data.presentMembers || []);
                  setScans(data.scans || []);
                }
              } catch (e) {
                if (active) {
                  setPresentMembers([]);
                  setScans([]);
                }
              }
            } else {
              // Default mock: event 'evt_1' has mock_1 and mock_3 present
              if (selectedEventId === "evt_1") {
                if (active) {
                  setPresentMembers(["mock_1", "mock_3"]);
                  setScans([
                    { memberId: "mock_1", name: "Maria Teresa Santos", scannedAt: "2026-06-07T08:35:00Z" },
                    { memberId: "mock_3", name: "Danilo Perez", scannedAt: "2026-06-07T08:42:00Z" }
                  ]);
                }
              } else {
                if (active) {
                  setPresentMembers([]);
                  setScans([]);
                }
              }
            }
          };

          loadLocalData();

          // Listen to storage changes across tabs/panels
          const handleStorageEvent = (e: StorageEvent) => {
            if (e.key === `scoc_sandbox_attendance_${selectedEventId}`) {
              loadLocalData();
            }
          };
          window.addEventListener("storage", handleStorageEvent);

          // Listen to same-window sandbox actions (e.g. toggles, scans)
          const handleLocalUpdate = () => {
            loadLocalData();
          };
          window.addEventListener("storage_local_update", handleLocalUpdate);

          setIsLoading(false);

          return () => {
            window.removeEventListener("storage", handleStorageEvent);
            window.removeEventListener("storage_local_update", handleLocalUpdate);
          };
        } else {
          const attendanceDocRef = doc(db, "attendance", selectedEventId);
          unsubscribeFirestore = onSnapshot(
            attendanceDocRef,
            (snapshot) => {
              if (!active) return;
              if (snapshot && snapshot.exists()) {
                const data = snapshot.data();
                setPresentMembers(data.presentMembers || []);
                setScans(data.scans || []);
              } else {
                setPresentMembers([]);
                setScans([]);
              }
              setIsLoading(false);
            },
            (err) => {
              console.error("Realtime subscription error:", err);
              handleFirestoreError(err, OperationType.GET, `attendance/${selectedEventId}`);
              if (active) setIsLoading(false);
            }
          );
        }
      } catch (err) {
        console.error("Error loading attendance", err);
        if (active) setIsLoading(false);
      }
    };

    const cleanup = loadAttendance();
    return () => {
      active = false;
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
      // Execute sandbox event listeners cleanup if it was returned
      cleanup.then((unsubSandbox) => {
        if (typeof unsubSandbox === "function") {
          unsubSandbox();
        }
      }).catch(() => {});
    };
  }, [selectedEventId]);

  // QR Code Terminal Scan Handlers
  const handleQrCodeScanned = async (decodedText: string) => {
    // 1. Validate the code format
    const prefix = "scoc-member-id:";
    if (!decodedText.startsWith(prefix)) {
      setLastScannedResult({
        name: "Unknown / Invalid Pass",
        time: new Date().toLocaleTimeString(),
        status: "error",
        errorMsg: "Form-factor mismatch: Scanned code is not an authorized SCOC member check-in pass."
      });
      setToast({
        message: "Check-in notice: Invalid security token scan.",
        type: "error"
      });
      return;
    }

    const codePayloadVal = decodedText.slice(prefix.length).trim();
    const member = members.find(m => 
      (m.id && m.id === codePayloadVal) || 
      (m.membershipId && m.membershipId.toLowerCase().trim() === codePayloadVal.toLowerCase())
    );

    if (!member) {
      setLastScannedResult({
        name: "Unregistered Profile",
        time: new Date().toLocaleTimeString(),
        status: "error",
        errorMsg: `Security trace failed: ID "${codePayloadVal}" is not registered in church registry database.`
      });
      setToast({
        message: "Check-in failed: No profile matching scanned ID.",
        type: "error"
      });
      return;
    }

    const memberId = member.id || codePayloadVal;
    const name = `${member.firstName} ${member.lastName}`;
    const nowTime = new Date().toLocaleTimeString();

    // 2. Prevent duplicates
    if (presentMembers.includes(memberId)) {
      const existingScan = scans.find(s => s.memberId === memberId);
      const displayTime = existingScan ? new Date(existingScan.scannedAt).toLocaleTimeString() : nowTime;
      
      setLastScannedResult({
        name,
        time: displayTime,
        status: "duplicate",
        errorMsg: `${name} has already scanned in on this event today.`,
        member: member
      });
      setToast({
        message: `${name} is already logged present today.`,
        type: "info"
      });
      return;
    }

    // 3. Record attendance
    const newScanLog = {
      memberId,
      name,
      scannedAt: new Date().toISOString()
    };

    const updatedPresent = [...presentMembers, memberId];
    const updatedScans = [newScanLog, ...scans];

    setPresentMembers(updatedPresent);
    setScans(updatedScans);

    setLastScannedResult({
      name,
      time: nowTime,
      status: "success",
      member: member
    });

    setToast({
      message: `Checked-in: ${name} logged Present successfully!`,
      type: "success"
    });

    const activeEvent = events.find((e) => e.id === selectedEventId);
    const eventNameStr = activeEvent?.eventName || "Worship Service";
    const logMsg = `Check-in Success: ${name} marked Present for "${eventNameStr}" on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()} (Status: Present)`;

    // 4. Save to DB automatically in real time!
    try {
      if (typeof window !== "undefined" && localStorage.getItem("scoc_sandbox") === "true") {
        const payload = {
          eventId: selectedEventId,
          presentMembers: updatedPresent,
          scans: updatedScans,
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem(`scoc_sandbox_attendance_${selectedEventId}`, JSON.stringify(payload));
        
        // Audit trail
        const rawLogs = localStorage.getItem("scoc_auditLogs") || "[]";
        let logs = [];
        try { logs = JSON.parse(rawLogs); } catch (e) {}
        logs.unshift({
          id: `log_${Date.now()}`,
          userEmail: "scoc2911@gmail.com",
          userName: "SCOC Sandbox Admin",
          action: logMsg,
          timestamp: new Date().toISOString()
        });
        localStorage.setItem("scoc_auditLogs", JSON.stringify(logs));

        // Dispatch local storage update event to instantly sync UI
        window.dispatchEvent(new Event("storage_local_update"));
      } else {
        const attendanceDocRef = doc(db, "attendance", selectedEventId);
        await setDoc(attendanceDocRef, {
          eventId: selectedEventId,
          presentMembers: updatedPresent,
          scans: updatedScans,
          updatedAt: serverTimestamp()
        }, { merge: true });

        // Add real-time audit log
        await createAuditLog({
          userEmail: "scoc2911@gmail.com",
          userName: "SCOC Admin",
          action: logMsg
        });
      }
    } catch (e) {
      console.error("Failed to save real-time scan attendance:", e);
    }
  };

  // Live Camera stream scanner hook
  useEffect(() => {
    if (currentTab === "qr_scanner" && !useUploadInstead) {
      let html5QrCode: any = null;
      
      // Dynamic import to prevent SSR build crashes
      import("html5-qrcode").then(({ Html5Qrcode }) => {
        html5QrCode = new Html5Qrcode("reader");
        const config = { fps: 15, qrbox: { width: 220, height: 220 } };

        html5QrCode.start(
          { facingMode: "environment" },
          config,
          (decodedText: string) => {
            handleQrCodeScanned(decodedText);
          },
          () => {}
        ).catch((err: any) => {
          console.warn("Express Reader start blocked/blocked camera:", err);
        });
      });

      return () => {
        if (html5QrCode) {
          try {
            if (html5QrCode.isScanning) {
              html5QrCode.stop().then(() => {
                html5QrCode.clear();
              }).catch((e: any) => console.error(e));
            }
          } catch(e) {}
        }
      };
    }
  }, [currentTab, useUploadInstead]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      import("html5-qrcode").then(({ Html5Qrcode }) => {
        const html5QrCode = new Html5Qrcode("reader-file-uploader-temp");
        html5QrCode.scanFile(file, true)
          .then((decodedText) => {
            handleQrCodeScanned(decodedText);
          })
          .catch((err) => {
            console.error(err);
            setToast({
              message: "Check-in notice: QR-decoder could not capture barcode in file. Try a direct crisp scanner pass.",
              type: "error"
            });
          });
      });
    }
  };

  const handleSimulateScan = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return;
    const simulatedResponseText = member.qrCode || `scoc-member-id:${member.id}`;
    handleQrCodeScanned(simulatedResponseText);
  };

  const handleToggleAttendance = async (memberId: string) => {
    if (role !== "admin") return;
    if (!selectedEventId) return;

    const member = members.find((m) => m.id === memberId);
    if (!member) return;

    const name = `${member.firstName} ${member.lastName}`;
    const activeEvent = events.find((e) => e.id === selectedEventId);
    const eventNameStr = activeEvent?.eventName || "Worship Service";

    // Prevent changing the status of a user who scanned their QR code successfully
    const hasScanRecord = scans.some((s) => s.memberId === memberId);
    if (hasScanRecord) {
      setToast({
        message: `${name} checked in via QR pass. Handshake-authenticated records cannot be modified or set to Absent.`,
        type: "error"
      });
      return;
    }

    let updatedPresent = [];
    let statusText = "";
    if (presentMembers.includes(memberId)) {
      updatedPresent = presentMembers.filter((id) => id !== memberId);
      statusText = "Absent";
    } else {
      updatedPresent = [...presentMembers, memberId];
      statusText = "Present";
    }

    setPresentMembers(updatedPresent);

    const logMsg = `Check-in Mutated: ${name} marked ${statusText} for "${eventNameStr}" on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()} (Status: ${statusText})`;

    try {
      if (typeof window !== "undefined" && localStorage.getItem("scoc_sandbox") === "true") {
        const payload = {
          eventId: selectedEventId,
          presentMembers: updatedPresent,
          scans,
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem(`scoc_sandbox_attendance_${selectedEventId}`, JSON.stringify(payload));
        
        // Audit trail
        const rawLogs = localStorage.getItem("scoc_auditLogs") || "[]";
        let logs = [];
        try { logs = JSON.parse(rawLogs); } catch (e) {}
        logs.unshift({
          id: `log_${Date.now()}`,
          userEmail: "scoc2911@gmail.com",
          userName: "SCOC Sandbox Admin",
          action: logMsg,
          timestamp: new Date().toISOString()
        });
        localStorage.setItem("scoc_auditLogs", JSON.stringify(logs));

        // Dispatch local storage update event to instantly sync UI
        window.dispatchEvent(new Event("storage_local_update"));
      } else {
        const attendanceDocRef = doc(db, "attendance", selectedEventId);
        await setDoc(attendanceDocRef, {
          eventId: selectedEventId,
          presentMembers: updatedPresent,
          scans,
          updatedAt: serverTimestamp()
        }, { merge: true });

        // Add real-time audit log
        await createAuditLog({
          userEmail: "scoc2911@gmail.com",
          userName: "SCOC Admin",
          action: logMsg
        });
      }
      setToast({
        message: `${name} status set to ${statusText}.`,
        type: "success"
      });
    } catch (e) {
      console.error("Failed to toggle real-time attendance:", e);
      setToast({
        message: "Failed to update attendance status.",
        type: "error"
      });
    }
  };

  const handleSelectAll = async () => {
    if (role !== "admin") return;
    if (!selectedEventId) return;

    const filteredIds = filteredMembers.map(m => m.id!);
    const containsAll = filteredIds.every(id => presentMembers.includes(id));

    let updatedPresent = [];
    let statusText = "";
    if (containsAll) {
      // Uncheck only the filtered ones but STRICTLY preserve scanned present members
      updatedPresent = presentMembers.filter(id => {
        const hasScanRecord = scans.some(s => s.memberId === id);
        return !filteredIds.includes(id) || hasScanRecord;
      });
      statusText = "Absent";
    } else {
      // Add only the filtered ones
      const unique = new Set([...presentMembers, ...filteredIds]);
      updatedPresent = Array.from(unique);
      statusText = "Present";
    }

    setPresentMembers(updatedPresent);

    const activeEvent = events.find((e) => e.id === selectedEventId);
    const eventNameStr = activeEvent?.eventName || "Worship Service";
    const logMsg = `Batch Mutation: Toggled check-in state to ${statusText} for ${filteredIds.length} members on "${eventNameStr}" on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()} (Status: ${statusText})`;

    try {
      if (typeof window !== "undefined" && localStorage.getItem("scoc_sandbox") === "true") {
        const payload = {
          eventId: selectedEventId,
          presentMembers: updatedPresent,
          scans,
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem(`scoc_sandbox_attendance_${selectedEventId}`, JSON.stringify(payload));
        
        // Audit trail
        const rawLogs = localStorage.getItem("scoc_auditLogs") || "[]";
        let logs = [];
        try { logs = JSON.parse(rawLogs); } catch (e) {}
        logs.unshift({
          id: `log_${Date.now()}`,
          userEmail: "scoc2911@gmail.com",
          userName: "SCOC Sandbox Admin",
          action: logMsg,
          timestamp: new Date().toISOString()
        });
        localStorage.setItem("scoc_auditLogs", JSON.stringify(logs));

        // Dispatch local storage update event to instantly sync UI
        window.dispatchEvent(new Event("storage_local_update"));
      } else {
        const attendanceDocRef = doc(db, "attendance", selectedEventId);
        await setDoc(attendanceDocRef, {
          eventId: selectedEventId,
          presentMembers: updatedPresent,
          scans,
          updatedAt: serverTimestamp()
        }, { merge: true });

        // Add real-time audit log
        await createAuditLog({
          userEmail: "scoc2911@gmail.com",
          userName: "SCOC Admin",
          action: logMsg
        });
      }
      setToast({
        message: `Toggled marking all shown members as ${statusText}.`,
        type: "success"
      });
    } catch (e) {
      console.error("Failed to batch toggle real-time attendance:", e);
      setToast({
        message: "Failed to perform bulk toggling.",
        type: "error"
      });
    }
  };

  const handleSaveAttendance = async () => {
    if (!selectedEventId) return;
    setIsSaving(true);
    try {
      if (typeof window !== "undefined" && localStorage.getItem("scoc_sandbox") === "true") {
        const payload = {
          eventId: selectedEventId,
          presentMembers,
          scans,
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem(`scoc_sandbox_attendance_${selectedEventId}`, JSON.stringify(payload));

        // Create virtual audit log
        const rawLogs = localStorage.getItem("scoc_auditLogs") || "[]";
        let logs = [];
        try { logs = JSON.parse(rawLogs); } catch (e) {}
        logs.unshift({
          id: `log_${Date.now()}`,
          userEmail: "scoc2911@gmail.com",
          userName: "SCOC Sandbox Admin",
          action: `Saved attendance registry for Event ID: ${selectedEventId} with ${presentMembers.length} present (Offline Sandbox).`,
          timestamp: new Date().toISOString()
        });
        localStorage.setItem("scoc_auditLogs", JSON.stringify(logs));

        setToast({
          message: "Attendance sheet successfully saved (Offline Sandbox).",
          type: "success"
        });
      } else {
        const attendanceDocRef = doc(db, "attendance", selectedEventId);
        await setDoc(attendanceDocRef, {
          eventId: selectedEventId,
          presentMembers,
          scans,
          updatedAt: serverTimestamp(),
        }).catch((err) => {
          handleFirestoreError(err, OperationType.WRITE, `attendance/${selectedEventId}`);
        });
        setToast({
          message: "Attendance sheet successfully saved and synced to database.",
          type: "success"
        });
      }
    } catch (err: any) {
      console.error(err);
      setToast({
        message: `Failed to save attendance logs: ${err?.message || err}`,
        type: "error"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportCSV = () => {
    if (!selectedEvent) return;
    
    try {
      const headers = ["Member Name", "Membership ID", "Cell Network Group", "Ministry Team", "Attendance Status"];
      const rows = activeMembers.map(m => {
        const isPresent = presentMembers.includes(m.id!);
        return [
          `"${m.lastName}, ${m.firstName}"`,
          m.membershipId ? `"${m.membershipId}"` : '"—"',
          m.network ? `"${m.network}"` : '"None"',
          m.ministry ? `"${m.ministry}"` : '"None"',
          isPresent ? "Present" : "Absent"
        ];
      });

      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
        + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      
      const eventDateStr = new Date(selectedEvent.eventDate).toISOString().split('T')[0];
      const fileName = `Attendance_${selectedEvent.eventName.replace(/[^a-z0-9]/gi, '_')}_${eventDateStr}.csv`;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setToast({
        message: "Attendance CSV log generated and downloaded successfully.",
        type: "success"
      });
    } catch (err) {
      console.error("Export failed", err);
      setToast({
        message: "Failed to generate CSV download.",
        type: "error"
      });
    }
  };

  const handlePrint = () => {
    try {
      window.focus();
      window.print();
    } catch (err) {
      console.error("Print triggered an error:", err);
      alert(
        "Printing is blocked by the embedded browser preview sandbox.\n\n" +
        "Workaround: Please open this application in a new tab (click the 'Open in new tab' button at the top-right of your screen) and try printing there. It will work perfectly!"
      );
    }
  };

  const handleCopyFollowup = (member: Member) => {
    if (!selectedEvent) return;
    const text = `Hi ${member.firstName}! We missed you at our ${selectedEvent.eventName} today at Subic Church of Christ. We hope everything is well with you. Let us know if we can assist or pray for you! God bless!`;
    
    try {
      navigator.clipboard.writeText(text);
      setCopiedMemberId(member.id || null);
      setToast({
        message: `Saved reminder template for ${member.firstName} to clipboard! Ready to send.`,
        type: "success"
      });
      setTimeout(() => setCopiedMemberId(null), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  // Filter members based on search terms, network, ministry, and current active selection tab
  const filteredMembers = activeMembers.filter((m) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = (
      m.firstName.toLowerCase().includes(term) ||
      m.lastName.toLowerCase().includes(term) ||
      (m.membershipId && m.membershipId.toLowerCase().includes(term))
    );

    const matchesNetwork = selectedNetwork ? m.network === selectedNetwork : true;
    const matchesMinistry = selectedMinistry ? m.ministry === selectedMinistry : true;

    // Filter by tab selection
    const isPresent = presentMembers.includes(m.id!);
    const matchesTab = currentTab === "all" 
      ? true 
      : currentTab === "present" 
        ? isPresent 
        : !isPresent;

    return matchesSearch && matchesNetwork && matchesMinistry && matchesTab;
  });

  const selectedEvent = events.find(e => e.id === selectedEventId);
  const percentAttendance = activeMembers.length > 0 
    ? Math.round((presentMembers.length / activeMembers.length) * 100) 
    : 0;  return (
    <div className="space-y-6 relative">
      {/* Floating Toast Notification */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border animate-in slide-in-from-bottom-5 duration-300 ${
          toast.type === "success" 
            ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
            : toast.type === "error" 
              ? "bg-rose-50 border-rose-200 text-rose-800" 
              : "bg-blue-50 border-blue-200 text-blue-800"
        }`}>
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-150 pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-indigo-500" />
            Attendance Tracker
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Track and log attendance of church members for schedules and services
          </p>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-500">
          <div className="max-w-md mx-auto space-y-3">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto" />
            <h4 className="text-base font-bold text-gray-800">No Scheduled Events</h4>
            <p className="text-sm text-gray-400">
              Please register or schedule an event under &quot;Church Events&quot; on the Home dashboard before tracking attendance.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Event Selector */}
          <div className="lg:col-span-1 bg-white border border-gray-200 rounded-xl p-4 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-widest flex items-center gap-1.5 grayscale opacity-80">
              <Calendar className="w-4 h-4 text-indigo-500" /> Select Schedule
            </h3>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {events.map((e) => {
                const isSelected = e.id === selectedEventId;
                const formattedDate = new Date(e.eventDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric"
                });
                return (
                  <button
                    key={e.id}
                    onClick={() => {
                      setSelectedEventId(e.id!);
                      setCurrentTab("all"); // Reset list filter tab on event change
                    }}
                    className={`w-full text-left p-3 rounded-lg border transition-all flex flex-col gap-1 cursor-pointer ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/50 shadow-sm font-semibold"
                        : "border-gray-150 hover:border-indigo-300 hover:bg-gray-50/50 text-gray-700"
                    }`}
                  >
                    <span className="text-xs font-bold text-gray-900 leading-tight">{e.eventName}</span>
                    <span className="text-[10px] text-gray-500 font-medium">{formattedDate}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main - Attendance Sheets */}
          <div className="lg:col-span-3 bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden flex flex-col">
            {selectedEventId ? (
              <>
                {/* Event Summary stats */}
                <div className="bg-gray-100/50 border-b border-gray-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-5">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-widest bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                      Active Event Logs
                    </span>
                    <h3 className="text-[15px] font-bold text-gray-950">{selectedEvent?.eventName}</h3>
                    <p className="text-xs text-gray-500 tracking-tight">
                      Schedules: {selectedEvent && new Date(selectedEvent.eventDate).toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Stats */}
                    <div className="bg-white border border-gray-200 px-3.5 py-2 rounded-xl flex items-center gap-2.5 shadow-xs">
                      <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      <div className="text-left">
                        <p className="text-[9px] uppercase font-bold text-gray-400">Present</p>
                        <p className="text-xs font-extrabold text-gray-900 leading-none mt-0.5">
                          {presentMembers.length}
                        </p>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 px-3.5 py-2 rounded-xl flex items-center gap-2.5 shadow-xs">
                      <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                      <div className="text-left">
                        <p className="text-[9px] uppercase font-bold text-gray-400">Absent</p>
                        <p className="text-xs font-extrabold text-gray-900 leading-none mt-0.5">
                          {activeMembers.length - presentMembers.length}
                        </p>
                      </div>
                    </div>

                    <div className="bg-indigo-50/50 border border-indigo-100 px-3.5 py-2 rounded-xl flex items-center gap-2.5 shadow-xs">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      <div className="text-left">
                        <p className="text-[9px] uppercase font-bold text-indigo-400 leading-none">Rate</p>
                        <p className="text-xs font-extrabold text-indigo-700 leading-none mt-0.5">{percentAttendance}%</p>
                      </div>
                    </div>

                    {/* Export / Print */}
                    <div className="flex gap-1.5 ml-1.5 border-l border-gray-200 pl-2.5">
                      <button
                        onClick={handleExportCSV}
                        title="Export current attendance list to CSV file"
                        className="p-2 border border-gray-200 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer bg-white transition"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handlePrint}
                        title="Print this sheet or download as PDF"
                        className="p-2 border border-gray-200 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer bg-white transition"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Filters Row */}
                <div className="px-5 py-4 bg-gray-50/40 border-b border-gray-150 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 tracking-wide uppercase mr-1 flex-shrink-0">
                    <Filter className="w-3.5 h-3.5 text-gray-400" />
                    Filters
                  </div>

                  <select
                    value={selectedNetwork}
                    onChange={(e) => setSelectedNetwork(e.target.value)}
                    className="text-xs font-semibold bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500 text-gray-700 max-w-[150px] cursor-pointer"
                  >
                    <option value="">All Networks</option>
                    {availableNetworks.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>

                  <select
                    value={selectedMinistry}
                    onChange={(e) => setSelectedMinistry(e.target.value)}
                    className="text-xs font-semibold bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500 text-gray-700 max-w-[150px] cursor-pointer"
                  >
                    <option value="">All Ministries</option>
                    {availableMinistries.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>

                  {(selectedNetwork || selectedMinistry) && (
                    <button
                      onClick={() => {
                        setSelectedNetwork("");
                        setSelectedMinistry("");
                      }}
                      className="text-[10px] text-rose-600 hover:underline font-bold uppercase tracking-wider cursor-pointer"
                    >
                      Clear Group Filters
                    </button>
                  )}
                </div>

                {/* Search & Actions Toolbar */}
                <div className="p-4 border-b border-gray-150 flex flex-col md:flex-row md:items-center gap-3">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search shown names or membership IDs..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 w-full md:w-auto">
                    {/* View Tabs */}
                    <div className="flex bg-gray-100 p-1 rounded-lg text-xs font-bold shrink-0 shadow-inner border border-gray-200">
                      <button
                        onClick={() => setCurrentTab("all")}
                        className={`px-3 py-1.5 rounded-md cursor-pointer transition ${
                          currentTab === "all" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        All ({activeMembers.filter(m => {
                          const filterNetwork = selectedNetwork ? m.network === selectedNetwork : true;
                          const filterMinistry = selectedMinistry ? m.ministry === selectedMinistry : true;
                          return filterNetwork && filterMinistry;
                        }).length})
                      </button>
                      <button
                        onClick={() => setCurrentTab("present")}
                        className={`px-3 py-1.5 rounded-md cursor-pointer transition flex items-center gap-1.5 ${
                          currentTab === "present" ? "bg-white text-indigo-700 shadow-xs" : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        Present ({presentMembers.filter(id => {
                          const m = activeMembers.find(mem => mem.id === id);
                          if (!m) return false;
                          const filterNetwork = selectedNetwork ? m.network === selectedNetwork : true;
                          const filterMinistry = selectedMinistry ? m.ministry === selectedMinistry : true;
                          return filterNetwork && filterMinistry;
                        }).length})
                      </button>
                      <button
                        onClick={() => setCurrentTab("absent")}
                        className={`px-3 py-1.5 rounded-md cursor-pointer transition flex items-center gap-1.5 ${
                          currentTab === "absent" ? "bg-white text-orange-700 shadow-xs" : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        Absent ({activeMembers.filter(m => !presentMembers.includes(m.id!)).filter(m => {
                          const filterNetwork = selectedNetwork ? m.network === selectedNetwork : true;
                          const filterMinistry = selectedMinistry ? m.ministry === selectedMinistry : true;
                          return filterNetwork && filterMinistry;
                        }).length})
                      </button>
                      <button
                        onClick={() => setCurrentTab("qr_scanner")}
                        className={`px-3 py-1.5 rounded-md cursor-pointer transition flex items-center gap-1.5 border border-indigo-200/50 ${
                          currentTab === "qr_scanner" ? "bg-indigo-600 text-white shadow-xs" : "text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50/40"
                        }`}
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>📷 Express Scan ({scans.length})</span>
                      </button>
                    </div>

                    {role === "admin" && (
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={handleSelectAll}
                          title="Select/Unselect everyone currently visible under this tab and filter"
                          className="px-3.5 py-2 border border-gray-350 rounded-lg text-xs font-bold text-gray-750 bg-white hover:bg-gray-50 transition cursor-pointer"
                        >
                          Toggle Selected
                        </button>
                        <button
                          onClick={handleSaveAttendance}
                          disabled={isSaving}
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-750 text-white text-xs font-bold rounded-lg transition disabled:opacity-50 cursor-pointer shadow-md shadow-indigo-600/10"
                        >
                          <Save className="w-3.5 h-3.5" />
                          {isSaving ? "Saving..." : "Save Log"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {isLoading ? (
                  <div className="p-16 text-center text-sm text-gray-400">Loading attendance sheet...</div>
                ) : currentTab === "qr_scanner" ? (
                  /* Live QR Barcode Scanning Station Views */
                  <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left Column: Interactive QR Scanner Stream */}
                      <div className="bg-indigo-950/5 border border-indigo-200/40 rounded-2xl p-5 shadow-inner flex flex-col items-center justify-center space-y-4 text-center">
                        <div className="space-y-1">
                          <h4 className="text-base font-extrabold text-gray-900">Entrance QR Reader Terminal</h4>
                          <p className="text-xs text-gray-400">Position the church member pass QR code inside the camera focus</p>
                        </div>

                        {/* Tab Selector inside Scanner Box: Cámara Live vs Image file upload */}
                        <div className="flex bg-gray-100 p-0.5 rounded-lg text-[10px] uppercase tracking-wide font-extrabold shadow-sm border border-gray-200/60">
                          <button
                            onClick={() => setUseUploadInstead(false)}
                            className={`px-3 py-1 rounded-md cursor-pointer transition ${
                              !useUploadInstead ? "bg-indigo-600 text-white" : "text-gray-500 hover:text-gray-700"
                            }`}
                          >
                            Live Camera
                          </button>
                          <button
                            onClick={() => setUseUploadInstead(true)}
                            className={`px-3 py-1 rounded-md cursor-pointer transition ${
                              useUploadInstead ? "bg-indigo-600 text-white" : "text-gray-500 hover:text-gray-700"
                            }`}
                          >
                            Upload image pass
                          </button>
                        </div>

                        {/* Scanner view ports */}
                        {!useUploadInstead ? (
                          <div className="relative w-full max-w-[280px] aspect-square rounded-2xl border-4 border-indigo-600/30 overflow-hidden bg-black flex flex-col items-center justify-center p-4">
                            {/* Corner lasers sights indicators */}
                            <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-indigo-400 z-20" />
                            <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-indigo-400 z-20" />
                            <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-indigo-400 z-20" />
                            <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-indigo-400 z-20" />
                            
                            {/* Animated laser line */}
                            <div className="absolute top-0 inset-x-0 h-0.5 bg-indigo-500 animate-[bounce_2s_infinite] shadow-[0_0_8px_rgba(99,102,241,0.8)] z-10" />

                            <div id="reader" className="w-full h-full object-cover rounded-xl" />
                            
                            {/* Camera Instigating status description */}
                            <div className="absolute inset-0 z-0 flex flex-col items-center justify-center text-gray-500 p-4 text-center space-y-2 pointer-events-none">
                              <QrCode className="w-8 h-8 text-indigo-400/80 animate-pulse" />
                              <p className="text-[10px] text-gray-400 font-bold">Activating Secure Stream Feed...</p>
                              <p className="text-[9px] text-gray-500 max-w-[180px]">If browser stream does not trigger, please toggle to &quot;Upload image pass&quot; or simulate scans on the right panel!</p>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full max-w-[280px] aspect-square rounded-2xl border-2 border-dashed border-indigo-300 hover:border-indigo-400 transition bg-indigo-50/20 flex flex-col items-center justify-center p-6 relative cursor-pointer font-sans">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleFileChange}
                              className="absolute inset-0 opacity-0 cursor-pointer z-20"
                            />
                            <Download className="w-8 h-8 text-indigo-500 mb-2.5 animate-bounce" />
                            <span className="text-xs font-bold text-gray-700">Drag & Drop Image Pass</span>
                            <span className="text-[10px] text-gray-400 mt-1">or click to browse local files</span>
                            <div id="reader-file-uploader-temp" className="hidden" />
                          </div>
                        )}

                        {/* Last scanned visual HUD */}
                        {lastScannedResult && (
                          <div className="w-full max-w-[280px] space-y-3.5">
                            {/* Check-in result status alert */}
                            <div className={`w-full p-3 rounded-xl border flex items-start gap-2.5 text-left animate-in fade-in slide-in-from-top-1 ${
                              lastScannedResult.status === "success"
                                ? "bg-emerald-50 border-emerald-150 text-emerald-800"
                                : lastScannedResult.status === "duplicate"
                                  ? "bg-amber-50 border-amber-150 text-amber-800"
                                  : "bg-rose-50 border-rose-150 text-rose-800"
                            }`}>
                              {lastScannedResult.status === "success" ? (
                                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                              ) : lastScannedResult.status === "duplicate" ? (
                                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                              ) : (
                                <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                              )}
                              <div className="text-[11px] leading-tight flex-1">
                                <p className="font-bold text-gray-900">{lastScannedResult.name}</p>
                                <p className="text-gray-550 text-[10px] mt-0.5 font-mono">Logged at {lastScannedResult.time}</p>
                                {lastScannedResult.status === "duplicate" ? (
                                  <p className="text-amber-700 mt-1 font-semibold">{lastScannedResult.errorMsg}</p>
                                ) : lastScannedResult.status === "success" ? (
                                  <p className="text-emerald-700 mt-1 font-semibold text-[10px]">Entrance scan recorded successfully!</p>
                                ) : (
                                  <p className="text-rose-700 mt-1 font-semibold">{lastScannedResult.errorMsg}</p>
                                )}
                              </div>
                            </div>

                            {/* Detailed Scanned Member Info Card */}
                            {lastScannedResult.member && (
                              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs text-left font-sans text-xs flex flex-col animate-fade-in">
                                <div className="bg-gradient-to-r from-indigo-900 to-indigo-950 p-2 text-white flex items-center justify-between">
                                  <span className="text-[9px] font-black tracking-widest uppercase">SCOC RECORDS SYSTEM</span>
                                  <span className="text-[9px] font-mono opacity-80">{lastScannedResult.member.membershipId}</span>
                                </div>
                                
                                <div className="p-3 space-y-2.5">
                                  {/* Avatar and Name */}
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-sky-400 text-white flex items-center justify-center text-sm font-black shrink-0 shadow-xs uppercase border-2 border-indigo-50 overflow-hidden">
                                      {lastScannedResult.member.pictures && lastScannedResult.member.pictures.length > 0 ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                          src={lastScannedResult.member.pictures[0]}
                                          alt="Scanned Profile"
                                          className="w-full h-full object-cover"
                                          referrerPolicy="no-referrer"
                                        />
                                      ) : (
                                        `${lastScannedResult.member.firstName?.[0] || ""}${lastScannedResult.member.lastName?.[0] || ""}`
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <h5 className="font-bold text-gray-900 truncate text-xs leading-snug">
                                        {lastScannedResult.member.firstName} {lastScannedResult.member.lastName}
                                      </h5>
                                      <p className="text-[9px] text-indigo-700 font-extrabold uppercase tracking-wide">
                                        {lastScannedResult.member.membershipStatus || "Active Member"}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Quick Info Specs */}
                                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 text-[10px]">
                                    <div className="space-y-0.5">
                                      <p className="text-[8px] text-gray-400 font-bold uppercase">MINISTRY & DEPT</p>
                                      <p className="font-bold text-gray-750 truncate">{lastScannedResult.member.ministry || "None Assigned"}</p>
                                    </div>
                                    <div className="space-y-0.5">
                                      <p className="text-[8px] text-gray-400 font-bold uppercase">NETWORK/LEADER</p>
                                      <p className="font-bold text-gray-750 truncate">{lastScannedResult.member.network || "None Assigned"}</p>
                                    </div>
                                    <div className="space-y-0.5">
                                      <p className="text-[8px] text-gray-400 font-bold uppercase">CONTACT NUMBER</p>
                                      <p className="font-mono text-gray-700 truncate">{lastScannedResult.member.contactNumber || "N/A"}</p>
                                    </div>
                                    <div className="space-y-0.5">
                                      <p className="text-[8px] text-gray-400 font-bold uppercase">AGE & GENDER</p>
                                      <p className="font-bold text-gray-750 truncate">
                                        {lastScannedResult.member.age || "—"} yrs • {lastScannedResult.member.gender || "—"}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="bg-indigo-50/50 border border-indigo-100/50 p-1.5 rounded-lg flex items-center justify-between text-[9px]">
                                    <span className="font-bold text-indigo-800 uppercase text-[8px]">Database Record ID</span>
                                    <span className="font-mono font-bold text-indigo-900">
                                      #{lastScannedResult.member.id?.slice(-8) || "MEMBER"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right Column: Simulator & Admin Trigger */}
                      <div className="bg-white border border-gray-150 rounded-2xl p-5 flex flex-col space-y-4">
                        <div className="space-y-1">
                          <h4 className="text-sm font-extrabold text-indigo-900">Scan Simulator / Quick Search</h4>
                          <p className="text-xs text-gray-450 leading-relaxed font-normal">Ensure successful testing! Use this tool to select any active member and simulate scanning their check-in pass instantly.</p>
                        </div>

                        {/* Member Selection for Simulation */}
                        <div className="space-y-3">
                          <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
                            <input
                              type="text"
                              placeholder="Type name to simulate QR pass scan..."
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="w-full pl-8.5 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                            />
                          </div>

                          <div className="border border-gray-150 rounded-xl max-h-[190px] overflow-y-auto divide-y divide-gray-100 bg-gray-50/20">
                            {activeMembers
                              .filter(m => {
                                const q = searchTerm.toLowerCase();
                                return m.firstName.toLowerCase().includes(q) || m.lastName.toLowerCase().includes(q) || (m.membershipId && m.membershipId.toLowerCase().includes(q));
                              })
                              .map(m => {
                                const isPresent = presentMembers.includes(m.id!);
                                return (
                                  <div key={m.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-gray-50">
                                    <div>
                                      <span className="font-bold text-gray-900 block leading-tight">{m.lastName}, {m.firstName}</span>
                                      <span className="block text-[9px] text-gray-400 font-mono mt-0.5">ID: {m.membershipId || "No ID"}</span>
                                    </div>
                                    <button
                                      onClick={() => handleSimulateScan(m.id!)}
                                      className={`px-3 py-1 text-[10px] font-bold rounded-lg border transition ${
                                        isPresent
                                          ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
                                          : "bg-indigo-50 hover:bg-indigo-100 text-indigo-750 border-indigo-200 cursor-pointer"
                                      }`}
                                    >
                                      {isPresent ? "Checked" : "Simulate scan"}
                                    </button>
                                  </div>
                                );
                              })}
                            {activeMembers.length === 0 && (
                              <p className="p-4 text-center text-xs text-gray-400">No active members found in database.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Reports Section: Scan history of present members */}
                    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                      <div className="bg-slate-100/60 px-5 py-3 border-b border-gray-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-indigo-500 animate-pulse" />
                          <span className="text-xs font-bold text-gray-800">Arrival live logs ({scans.length})</span>
                        </div>
                        <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full uppercase tracking-wider border border-emerald-150">
                          Secure realtime stream
                        </span>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-150 text-left text-xs">
                          <thead className="bg-gray-50/50">
                            <tr>
                              <th scope="col" className="px-5 py-2.5 font-bold text-gray-500 uppercase tracking-wider text-[10px]">Member Name</th>
                              <th scope="col" className="px-5 py-2.5 font-bold text-gray-500 uppercase tracking-wider text-[10px]">Arrival Passcode</th>
                              <th scope="col" className="px-5 py-2.5 font-bold text-gray-500 uppercase tracking-wider text-[10px]">Entrance Date</th>
                              <th scope="col" className="px-5 py-2.5 font-bold text-gray-500 uppercase tracking-wider text-[10px]">Exact Scan Time</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 bg-white">
                            {scans.map((s, idx) => {
                              const sDate = s.scannedAt ? new Date(s.scannedAt) : new Date();
                              return (
                                <tr key={idx} className="hover:bg-indigo-50/10">
                                  <td className="px-5 py-2 whitespace-nowrap font-bold text-gray-900">{s.name}</td>
                                  <td className="px-5 py-2 whitespace-nowrap font-mono text-[9px] text-indigo-500 font-bold uppercase tracking-wide">scoc-chk-{s.memberId}</td>
                                  <td className="px-5 py-2 whitespace-nowrap text-gray-500">{sDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                                  <td className="px-5 py-2 whitespace-nowrap font-mono text-[10px] text-emerald-600 font-extrabold">{sDate.toLocaleTimeString("en-US")}</td>
                                </tr>
                              );
                            })}
                            {scans.length === 0 && (
                              <tr>
                                <td colSpan={4} className="p-8 text-center text-xs text-gray-400 italic">
                                  Waiting for arrival records. Use direct camera scanning, drag local QR images, or simulate scan actions above.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-150">
                      <thead className="bg-gray-50/50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Member Name</th>
                          <th scope="col" className="px-6 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Membership ID</th>
                          <th scope="col" className="px-6 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Cell Group / Network</th>
                          <th scope="col" className="px-6 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Ministry service</th>
                          <th scope="col" className="px-6 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                          <th scope="col" className="px-6 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {filteredMembers.map((m) => {
                          const isPresent = presentMembers.includes(m.id!);
                          return (
                            <tr
                              key={m.id}
                              onClick={() => handleToggleAttendance(m.id!)}
                              className={`transition-colors cursor-pointer select-none ${
                                isPresent ? "bg-indigo-50/10 hover:bg-indigo-50/25" : "hover:bg-gray-50"
                              }`}
                            >
                              <td className="px-6 py-3 whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold tracking-wider ${
                                    isPresent ? "bg-indigo-100 text-indigo-700 font-extrabold" : "bg-gray-100 text-gray-650"
                                  }`}>
                                    {m.firstName[0]}{m.lastName[0]}
                                  </div>
                                  <div>
                                    <span className="text-sm font-semibold text-gray-900 block leading-tight">
                                      {m.lastName}, {m.firstName}
                                    </span>
                                    {m.email && (
                                      <span className="text-[10px] text-gray-400 mt-0.5 block">{m.email}</span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap text-xs font-mono text-gray-500">
                                {m.membershipId || "—"}
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap">
                                {m.network ? (
                                  <span className="text-xs bg-slate-50 text-slate-700 border border-slate-100 px-2 py-0.5 rounded-lg font-medium">
                                    {m.network}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-350 italic">None</span>
                                )}
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap">
                                {m.ministry ? (
                                  <span className="text-xs bg-indigo-50/50 text-indigo-700 border border-indigo-100/40 px-2 py-0.5 rounded-lg font-medium">
                                    {m.ministry}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-350 italic">None</span>
                                )}
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap text-center">
                                <span
                                  className={`h-6 px-3 inline-flex items-center justify-center rounded-full text-xs font-bold border transition-all ${
                                    isPresent
                                      ? "bg-green-50 text-green-700 border-green-200"
                                      : "bg-gray-50 text-gray-400 border-gray-200"
                                  }`}
                                >
                                  {isPresent ? "Present" : "Absent"}
                                </span>
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap text-right">
                                <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                  {!isPresent ? (
                                    <button
                                      type="button"
                                      onClick={() => handleCopyFollowup(m)}
                                      title="Copy SMS/Messenger follow-up template"
                                      className={`p-1.5 border rounded-lg transition-colors cursor-pointer text-xs font-semibold flex items-center justify-center gap-1 ${
                                        copiedMemberId === m.id
                                          ? "bg-emerald-50 text-emerald-600 border-emerald-250 animate-bounce"
                                          : "bg-white border-gray-200 hover:border-indigo-300 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50"
                                      }`}
                                    >
                                      <MessageSquare className="w-3.5 h-3.5" />
                                      <span className="text-[10px] hidden sm:inline">
                                        {copiedMemberId === m.id ? "Copied" : "Log template"}
                                      </span>
                                    </button>
                                  ) : (
                                    <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mr-2">
                                      <Check className="w-3 h-3" /> Safe
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredMembers.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-6 py-16 text-center text-gray-400 text-sm">
                              <div className="max-w-xs mx-auto space-y-2">
                                <Users className="w-8 h-8 text-gray-300 mx-auto" />
                                <p className="font-bold text-gray-800">No Members Match Search / Tab Filter</p>
                                <p className="text-xs text-gray-400">
                                  Try resetting selected groups, changing the text search query, or checking a different status tab.
                                </p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <div className="p-16 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
                <Users className="w-12 h-12 text-gray-300" />
                <h4 className="text-base font-bold text-gray-800">No Schedule Selected</h4>
                <p className="text-sm text-gray-400 max-w-sm">
                  Please select an event from the panel on the left to load, manage, or record the attendance sheet.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
