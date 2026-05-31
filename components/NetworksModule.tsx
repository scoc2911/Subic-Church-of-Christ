"use client";

import React, { useState } from "react";
import { Network, createNetwork, updateNetwork, deleteNetwork, Member, updateMember } from "@/lib/api";
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  ShieldCheck, 
  Save 
} from "lucide-react";

interface NetworksModuleProps {
  networks: Network[];
  members: Member[];
  onConfirmAction: (config: { title: string; description: string; onConfirm: () => void }) => void;
}

export function NetworksModule({ networks, members, onConfirmAction }: NetworksModuleProps) {
  const [newNetworkName, setNewNetworkName] = useState("");
  const [newNetworkLeader, setNewNetworkLeader] = useState("");
  const [editingNetworkId, setEditingNetworkId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNetworkName.trim() || !newNetworkLeader.trim()) {
      alert("Both Network Name and Leader Name are required.");
      return;
    }

    setIsSaving(true);
    try {
      const uName = newNetworkName.trim().toUpperCase();
      const uLeader = newNetworkLeader.trim().toUpperCase();

      if (editingNetworkId) {
        const oldNetwork = networks.find(n => n.id === editingNetworkId);
        await updateNetwork(editingNetworkId, {
          networkName: uName,
          networkLeader: uLeader,
        });
        
        // Update members who belong to this network
        if (oldNetwork) {
          const membersToUpdate = members.filter(m => m.network === oldNetwork.networkName);
          await Promise.all(membersToUpdate.map(m => updateMember(m.id!, {
            network: uName,
            networkLeader: uLeader
          })));
        }
        
        setEditingNetworkId(null);
      } else {
        await createNetwork({
          networkName: uName,
          networkLeader: uLeader,
        });
      }
      setNewNetworkName("");
      setNewNetworkLeader("");
    } catch (err) {
      console.error(err);
      alert("Failed to save network.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    onConfirmAction({
      title: "Delete Network",
      description: `Are you sure you want to delete the network "${name}"? Members under this network will be cleared of their network tag.`,
      onConfirm: async () => {
        try {
          await deleteNetwork(id);
          const membersToUpdate = members.filter(m => m.network === name);
          await Promise.all(membersToUpdate.map(m => updateMember(m.id!, {
            network: "",
            networkLeader: ""
          })));
        } catch (err) {
          console.error(err);
          alert("Failed to delete network.");
        }
      }
    });
  };

  const startEdit = (net: Network) => {
    setEditingNetworkId(net.id!);
    setNewNetworkName(net.networkName);
    setNewNetworkLeader(net.networkLeader);
  };

  const cancelEdit = () => {
    setEditingNetworkId(null);
    setNewNetworkName("");
    setNewNetworkLeader("");
  };

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4 shadow-sm animate-fade-in">
        <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1">
          <Users className="w-4 h-4 text-purple-600" />
          {editingNetworkId ? "Edit Church Cell Network" : "Register New Cell Network"}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-600 block">Network Group Name *</label>
            <input
              type="text"
              placeholder="E.G. YOUTH, MEN, COUPLES"
              value={newNetworkName}
              onChange={(e) => setNewNetworkName(e.target.value)}
              required
              className="w-full text-sm bg-white border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 outline-none uppercase font-semibold"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-600 block">Assign Network Leader *</label>
            <input
              type="text"
              placeholder="E.G. BRO. JOEL ABANTE"
              value={newNetworkLeader}
              onChange={(e) => setNewNetworkLeader(e.target.value)}
              required
              className="w-full text-sm bg-white border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 outline-none uppercase font-semibold"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-2 border-t border-gray-150">
          {editingNetworkId && (
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
            className="inline-flex items-center gap-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? "Saving..." : (editingNetworkId ? "Update Network" : "Add Cell Group")}
          </button>
        </div>
      </form>

      {/* Network List */}
      <div>
        <h4 className="text-xs font-bold text-gray-800 uppercase tracking-widest mb-3.5">
          Active Registry ({networks.length})
        </h4>

        {networks.length > 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
            {networks.map((net) => {
              const membersCount = members.filter(m => m.network === net.networkName).length;
              return (
                <div key={net.id} className="flex items-center justify-between p-4 hover:bg-purple-50/5 transition-colors">
                  <div>
                    <h5 className="text-sm font-bold text-gray-900">{net.networkName}</h5>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">Leader: {net.networkLeader}</p>
                    <span className="inline-flex items-center text-[10px] bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded-full font-bold mt-1.5 uppercase">
                      {membersCount} Members Assigned
                    </span>
                  </div>

                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => startEdit(net)}
                      className="text-blue-500 hover:text-blue-700 p-1.5 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(net.id!, net.networkName)}
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
            No active cello network groups registered on database.
          </div>
        )}
      </div>
    </div>
  );
}
