import React, { useState, useEffect } from "react";
import { subscribeToUsers, AppUser, updateUserRole } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export function UserManagement() {
  const { role, user } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (role === 'admin') {
      const unsubscribe = subscribeToUsers((data) => {
        setUsers(data);
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, [role]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!window.confirm(`Are you sure you want to change this user's role to ${newRole === 'admin' ? 'Administrator' : 'Viewer'}?`)) {
      return;
    }
    
    try {
      await updateUserRole(userId, newRole);
    } catch (error) {
      alert("Failed to update user role. You must be a Super Admin to modify roles.");
    }
  };

  if (role !== "admin") {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-500">You must be an administrator to view this page.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-500 text-sm">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between border-b border-gray-200 pb-5">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 tracking-tight">User Management</h2>
          <p className="text-sm text-gray-500 mt-1">Manage platform users and assign their access roles.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 uppercase tracking-wider text-[11px] font-semibold">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Current Role</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      {u.photoURL ? (
                        <img src={u.photoURL} alt="" className="w-8 h-8 rounded-full bg-gray-200" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs uppercase">
                          {u.email.charAt(0)}
                        </div>
                      )}
                      <span className="font-medium text-gray-900">{u.displayName || "Unknown User"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {u.email}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                      u.role === 'admin' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-green-50 text-green-700 border border-green-200'
                    }`}>
                      {u.role === 'admin' ? 'Administrator' : 'Viewer'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <select
                      value={u.role || "viewer"}
                      onChange={(e) => handleRoleChange(u.id!, e.target.value)}
                      disabled={u.email === 'scoc2911@gmail.com'}
                      className="text-sm border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 py-1.5 px-3 disabled:opacity-50 disabled:cursor-not-allowed uppercase"
                    >
                      <option value="viewer">VIEWER</option>
                      <option value="admin">ADMIN</option>
                    </select>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No users found. Wait for users to log in or refresh.
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
