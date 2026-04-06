import React, { useState } from 'react';
import { Witness } from '../types';
import { Users, Plus, Trash2, Phone, FileText, User } from 'lucide-react';

interface WitnessManagerProps {
  witnesses: Witness[];
  onAddWitness: (witness: Witness) => void;
  onDeleteWitness: (id: string) => void;
}

export const WitnessManager: React.FC<WitnessManagerProps> = ({ witnesses, onAddWitness, onDeleteWitness }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newWitness, setNewWitness] = useState<Partial<Witness>>({
    name: '',
    role: '',
    contactInfo: '',
    credibilityNotes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newWitness.name && newWitness.role) {
      onAddWitness({
        id: Date.now().toString(),
        name: newWitness.name,
        role: newWitness.role,
        contactInfo: newWitness.contactInfo,
        credibilityNotes: newWitness.credibilityNotes
      } as Witness);
      setNewWitness({ name: '', role: '', contactInfo: '', credibilityNotes: '' });
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      <div className="bg-white p-6 rounded-lg shadow-sm border-b-2 border-blue-200">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <Users className="w-6 h-6 mr-3 text-blue-600" />
              Witness Directory
            </h2>
            <p className="text-gray-500 mt-1">People who can corroborate your observations</p>
          </div>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{isAdding ? 'Cancel' : 'Add Witness'}</span>
          </button>
        </div>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-blue-50 p-6 rounded-lg border border-blue-100 animate-slideDown">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">New Witness Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input
                required
                type="text"
                value={newWitness.name}
                onChange={e => setNewWitness({ ...newWitness, name: e.target.value })}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2"
                placeholder="e.g. Jane Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role / Relationship *</label>
              <input
                required
                type="text"
                value={newWitness.role}
                onChange={e => setNewWitness({ ...newWitness, role: e.target.value })}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2"
                placeholder="e.g. Nanny, Neighbor, Therapist"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Info (Optional)</label>
              <input
                type="text"
                value={newWitness.contactInfo}
                onChange={e => setNewWitness({ ...newWitness, contactInfo: e.target.value })}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2"
                placeholder="Phone or Email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
              <input
                type="text"
                value={newWitness.credibilityNotes}
                onChange={e => setNewWitness({ ...newWitness, credibilityNotes: e.target.value })}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2"
                placeholder="Relevant details about their knowledge"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 font-medium"
            >
              Save Witness
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {witnesses.length === 0 ? (
          <div className="col-span-full text-center py-16 bg-white rounded-lg border border-dashed border-gray-300">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No witnesses added yet</h3>
            <p className="text-gray-500 mt-1">Add people who observed the misconduct to strengthen your case.</p>
          </div>
        ) : (
          witnesses.map(witness => (
            <div key={witness.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:border-blue-300 transition-colors overflow-hidden group">
              <div className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-100 p-2 rounded-full">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{witness.name}</h3>
                      <p className="text-sm text-blue-600 font-medium">{witness.role}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                        if(confirm('Delete this witness? This will remove them from all linked violations.')) {
                            onDeleteWitness(witness.id);
                        }
                    }}
                    className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600 mt-4">
                  {witness.contactInfo && (
                    <div className="flex items-center">
                      <Phone className="w-3 h-3 mr-2" />
                      <span className="truncate">{witness.contactInfo}</span>
                    </div>
                  )}
                  {witness.credibilityNotes && (
                    <div className="flex items-start">
                      <FileText className="w-3 h-3 mr-2 mt-0.5" />
                      <p className="line-clamp-2">{witness.credibilityNotes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
