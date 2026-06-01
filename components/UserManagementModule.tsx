"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import { 
  ShieldCheck, 
  UserPlus, 
  Trash2, 
  User, 
  Check, 
  AlertCircle,
  RefreshCw
} from "lucide-react";

interface UserRoles {
  uid: string;
  email: string;
  role: "admin" | "viewer" | "guest";
  displayName?: string;
}

interface UserManagementModuleProps {
  currentAdminEmail: string;
}

export function UserManagementModule({ currentAdminEmail }: UserManagementModuleProps) {
  const [users, setUsers] = useState<UserRoles[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "viewer" | "guest">("viewer");
  const [isSaving, setIsSaving] = useState(false);

  // Load all user roles
  const loadUsers = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const snap = await getDocs(collection(db, "userRoles"));
      const list: UserRoles[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          uid: d.id,
          email: data.email || "",
          role: data.role || "viewer",
          displayName: data.displayName || ""
        });
      });

      // If the primary admin is not in the list, write or include them
      if (!list.some(u => u.email === currentAdminEmail)) {
        list.unshift({
          uid: "scoc-primary",
          email: currentAdminEmail,
          role: "admin",
          displayName: "SCOC Global Admin"
        });
      }

      setUsers(list);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [currentAdminEmail]);

  useEffect(() => {
    let active = true;
    const fetchUsers = async () => {
      if (active) {
        await loadUsers();
      }
    };
    fetchUsers();
    return () => {
      active = false;
    };
  }, [loadUsers]);

  const handleUpdateRole = async (uid: string, email: string, newRole: "admin" | "viewer" | "guest") => {
    if (email === currentAdminEmail) {
      alert("Primary Admin's role cannot be modified.");
      return;
    }

    try {
      await setDoc(doc(db, "userRoles", uid), {
        email,
        role: newRole,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      alert(`User role for ${email} successfully updated to ${newRole}.`);
      loadUsers();
    } catch (err) {
      console.error(err);
      alert("Failed to update user role.");
    }
  };

  const handleAddUserRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    setIsSaving(true);
    try {
      const emailLower = newEmail.trim().toLowerCase();
      // Use the email as a seed key or generate an id
      const fakeUid = `pre_${Date.now()}`;
      await setDoc(doc(db, "userRoles", fakeUid), {
        email: emailLower,
        role: newRole,
        displayName: "Pre-approved User",
        createdAt: new Date().toISOString()
      });

      setNewEmail("");
      alert(`Access rules added for ${emailLower}.`);
      loadUsers();
    } catch (err) {
      console.error(err);
      alert("Failed to pre-approve user.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUserRule = async (uid: string, email: string) => {
    if (email === currentAdminEmail) {
      alert("Primary Admin rules cannot be deleted.");
      return;
    }

    if (!confirm(`Are you sure you want to revoke access metadata for ${email}?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, "userRoles", uid));
      alert(`Access rights revoked for ${email}.`);
      loadUsers();
    } catch (err) {
      console.error(err);
      alert("Failed to revoke access.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-purple-600" />
            Roles & Portal Access Control
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Authorize new viewer credentials, approve administrators, or revoke workspace access tokens
          </p>
        </div>

        <button
          onClick={loadUsers}
          className="inline-flex items-center justify-center p-2 border border-gray-300 rounded-lg hover:bg-gray-50 bg-white cursor-pointer transition-transform"
          title="Refresh Registry"
        >
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pre-approve new user */}
        <div className="lg:col-span-1 bg-white border border-gray-200 rounded-xl p-5 shadow-xs h-fit space-y-4">
          <div className="border-b border-gray-100 pb-2">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-widest flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-purple-600" /> Pre-authorize Profile
            </h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Pre-register verified church worker emails</p>
          </div>

          <form onSubmit={handleAddUserRule} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-600 block">Google Email *</label>
              <input
                type="email"
                required
                placeholder="worker@gmail.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full text-sm bg-white border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-600 block">Workspace Role Permission *</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as "admin" | "viewer" | "guest")}
                className="w-full text-sm bg-white border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-purple-500 font-semibold"
              >
                <option value="viewer">VIEWER (READ-ONLY)</option>
                <option value="admin">ADMINISTRATOR</option>
                <option value="guest">GUEST</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isSaving || !newEmail.trim()}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition disabled:opacity-50 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              {isSaving ? "Approving..." : "Pre-Authorize"}
            </button>
          </form>
        </div>

        {/* Existing Users Table */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden flex flex-col">
          {isLoading ? (
            <div className="p-16 text-center text-sm text-gray-400">Loading access registries...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-150">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Account Identity</th>
                    <th scope="col" className="px-6 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Assigned Role</th>
                    <th scope="col" className="relative px-6 py-3 w-20">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {users.map((u) => {
                    const isPrimary = u.email === currentAdminEmail;
                    return (
                      <tr key={u.uid} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-6 py-4.5 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-purple-50 text-purple-600 font-extrabold flex items-center justify-center text-xs border border-purple-100 select-none">
                              <User className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900 leading-tight">
                                {u.displayName || "Unknown Worker"}
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4.5 whitespace-nowrap">
                          {isPrimary ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 border border-red-200 text-[10px] font-extrabold rounded-full uppercase tracking-wider">
                              Primary Admin
                            </span>
                          ) : (
                            <select
                              value={u.role}
                              onChange={(e) => handleUpdateRole(u.uid, u.email, e.target.value as "admin" | "viewer" | "guest")}
                              className="text-xs border border-gray-300 rounded-lg py-1 px-2.5 font-bold outline-none bg-white focus:ring-2 focus:ring-purple-500 cursor-pointer text-gray-700 uppercase"
                            >
                              <option value="admin">Administrator</option>
                              <option value="viewer">Viewer (Read-Only)</option>
                              <option value="guest">Guest</option>
                            </select>
                          )}
                        </td>
                        <td className="px-6 py-4.5 whitespace-nowrap text-right">
                          {!isPrimary && (
                            <button
                              onClick={() => handleDeleteUserRule(u.uid, u.email)}
                              className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                              title="Revoke Permission"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
