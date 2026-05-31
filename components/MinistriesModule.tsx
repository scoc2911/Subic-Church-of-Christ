"use client";

import React, { useState } from "react";
import { Ministry, createMinistry, updateMinistry, deleteMinistry, Member, updateMember } from "@/lib/api";
import { 
  Building, 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  Save 
} from "lucide-react";

interface MinistriesModuleProps {
  ministries: Ministry[];
  members: Member[];
  onConfirmAction: (config: { title: string; description: string; onConfirm: () => void }) => void;
}

export function MinistriesModule({ ministries, members, onConfirmAction }: MinistriesModuleProps) {
  const [newMinistryName, setNewMinistryName] = useState("");
  const [newMinistryHead, setNewMinistryHead] = useState("");
  const [editingMinistryId, setEditingMinistryId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMinistryName.trim() || !newMinistryHead.trim()) {
      alert("Both Ministry Name and Ministry Head are required.");
      return;
    }

    setIsSaving(true);
    try {
      const uName = newMinistryName.trim().toUpperCase();
      const uHead = newMinistryHead.trim().toUpperCase();

      if (editingMinistryId) {
        const oldMinistry = ministries.find(m => m.id === editingMinistryId);
        await updateMinistry(editingMinistryId, {
          ministryName: uName,
          ministryHead: uHead,
        });
        
        // Update members of this ministry
        if (oldMinistry) {
          const membersToUpdate = members.filter(m => m.ministry === oldMinistry.ministryName);
          await Promise.all(membersToUpdate.map(m => updateMember(m.id!, {
            ministry: uName,
            ministryHead: uHead
          })));
        }
        
        setEditingMinistryId(null);
      } else {
        await createMinistry({
          ministryName: uName,
          ministryHead: uHead,
        });
      }
      setNewMinistryName("");
      setNewMinistryHead("");
    } catch (err) {
      console.error(err);
      alert("Failed to save ministry.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    onConfirmAction({
      title: "Delete Ministry Team",
      description: `Are you sure you want to delete the ministry "${name}"? Members assigned to this ministry will have their ministry tag cleared.`,
      onConfirm: async () => {
        try {
          await deleteMinistry(id);
          const membersToUpdate = members.filter(m => m.ministry === name);
          await Promise.all(membersToUpdate.map(m => updateMember(m.id!, {
            ministry: "",
            ministryHead: ""
          })));
        } catch (err) {
          console.error(err);
          alert("Failed to delete ministry.");
        }
      }
    });
  };

  const startEdit = (min: Ministry) => {
    setEditingMinistryId(min.id!);
    setNewMinistryName(min.ministryName);
    setNewMinistryHead(min.ministryHead);
  };

  const cancelEdit = () => {
    setEditingMinistryId(null);
    setNewMinistryName("");
    setNewMinistryHead("");
  };

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4 shadow-sm animate-fade-in">
        <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1">
          <Building className="w-4 h-4 text-indigo-600" />
          {editingMinistryId ? "Edit Ministry Details" : "Register New Church Ministry Team"}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-600 block">Ministry Team Name *</label>
            <input
              type="text"
              placeholder="E.G. MUSIC, TECH, USHERING"
              value={newMinistryName}
              onChange={(e) => setNewMinistryName(e.target.value)}
              required
              className="w-full text-sm bg-white border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none uppercase font-semibold"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-600 block">Ministry Overseer / Team Head *</label>
            <input
              type="text"
              placeholder="E.G. BRO. JOHN PETER"
              value={newMinistryHead}
              onChange={(e) => setNewMinistryHead(e.target.value)}
              required
              className="w-full text-sm bg-white border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none uppercase font-semibold"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-2 border-t border-gray-150">
          {editingMinistryId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-150/60 transition cursor-pointer"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            {isSaving ? "Saving..." : (editingMinistryId ? "Update Ministry" : "Add Team Group")}
          </button>
        </div>
      </form>

      {/* Ministries List */}
      <div>
        <h4 className="text-xs font-bold text-gray-800 uppercase tracking-widest mb-3.5">
          Active Departments ({ministries.length})
        </h4>

        {ministries.length > 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
            {ministries.map((min) => {
              const membersCount = members.filter(m => m.ministry === min.ministryName).length;
              return (
                <div key={min.id} className="flex items-center justify-between p-4 hover:bg-indigo-50/5 transition-colors">
                  <div>
                    <h5 className="text-sm font-bold text-gray-900">{min.ministryName}</h5>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">Overseer: {min.ministryHead}</p>
                    <span className="inline-flex items-center text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full font-bold mt-1.5 uppercase">
                      {membersCount} Members Assigned
                    </span>
                  </div>

                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => startEdit(min)}
                      className="text-blue-500 hover:text-blue-700 p-1.5 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(min.id!, min.ministryName)}
                      className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 border border-dashed border-gray-200 rounded-xl text-xs text-gray-400">
            No active ministry departments registered on database.
          </div>
        )}
      </div>
    </div>
  );
}
