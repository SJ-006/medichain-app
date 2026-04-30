import React, { useState } from 'react';
import { useStore } from '../context/Store';
import { User, MedicalRecord } from '../types';
import { Search, Upload, FileText, FlaskConical, CheckCircle, Wand2, FileSpreadsheet } from 'lucide-react';
import { generateRecordTitle } from '../services/gemini';

export const LabDashboard: React.FC = () => {
  const { getUsersByPhone, submitLabRequest } = useStore();
  
  // Search State
  const [phoneSearch, setPhoneSearch] = useState('');
  const [foundUsers, setFoundUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Upload State
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    fileType: 'LAB' as MedicalRecord['fileType'],
    fileName: '',
    billName: ''
  });
  const [successMsg, setSuccessMsg] = useState('');
  const [loadingTitle, setLoadingTitle] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const results = getUsersByPhone(phoneSearch);
    setFoundUsers(results);
    setSelectedUser(null);
    if(results.length === 0) alert("No users found.");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadForm({ ...uploadForm, fileName: e.target.files[0].name });
    }
  };

  const handleBillChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadForm({ ...uploadForm, billName: e.target.files[0].name });
    }
  };

  const handleGenerateTitle = async () => {
    if (!uploadForm.description) return;
    setLoadingTitle(true);
    const smartTitle = await generateRecordTitle(uploadForm.description);
    setUploadForm(prev => ({ ...prev, title: smartTitle }));
    setLoadingTitle(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser) {
      submitLabRequest(
          selectedUser.id, 
          uploadForm.title, 
          uploadForm.description, 
          uploadForm.fileType,
          uploadForm.fileName || 'lab_report.pdf',
          uploadForm.billName || 'invoice.pdf'
      );
      setSuccessMsg(`Report sent to ${selectedUser.name} for approval.`);
      setUploadForm({ title: '', description: '', fileType: 'LAB', fileName: '', billName: '' });
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
      
      {/* Left Column: Search */}
      <div className="md:col-span-1 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Search size={20} className="text-slate-400" /> Patient Search
          </h2>
          <form onSubmit={handleSearch} className="mb-4">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone Number</label>
            <div className="flex gap-2">
              <input 
                type="tel"
                value={phoneSearch}
                onChange={e => setPhoneSearch(e.target.value)}
                placeholder="9980099800"
                className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary outline-none bg-white text-slate-900 placeholder-slate-400"
              />
              <button type="submit" className="bg-slate-900 text-white px-3 rounded-lg hover:bg-slate-800">
                Go
              </button>
            </div>
          </form>

          <div className="space-y-2">
             {foundUsers.map(u => (
               <button 
                 key={u.id}
                 onClick={() => { setSelectedUser(u); setSuccessMsg(''); }}
                 className={`w-full text-left p-3 rounded-lg border transition-all ${selectedUser?.id === u.id ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500' : 'bg-white border-slate-200 hover:border-slate-300'}`}
               >
                 <div className="font-bold text-slate-800">{u.name}</div>
                 <div className="text-xs text-slate-500">ID: {u.id}</div>
               </button>
             ))}
          </div>
        </div>
      </div>

      {/* Right Column: Upload */}
      <div className="md:col-span-2">
         {selectedUser ? (
           <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                <div className="flex items-center gap-3">
                   <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                     {selectedUser.name.charAt(0)}
                   </div>
                   <div>
                     <h2 className="font-bold text-slate-800">Send Report to: {selectedUser.name}</h2>
                     <p className="text-xs text-slate-500">Linked Account • Awaiting Patient Approval</p>
                   </div>
                </div>
                <FlaskConical className="text-slate-300" size={24} />
             </div>

             <div className="p-8">
               {successMsg ? (
                 <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg flex items-center gap-2 mb-6 animate-fade-in">
                   <CheckCircle size={20} /> {successMsg}
                 </div>
               ) : null}

               <form onSubmit={handleSubmit} className="space-y-6">
                  
                  {/* File Uploads Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Report File</label>
                        <div className="border border-slate-300 rounded-lg p-3 hover:bg-slate-50 transition-colors bg-white">
                            <input 
                              type="file" 
                              accept=".pdf,.jpg,.png,.dcm"
                              onChange={handleFileChange}
                              className="w-full text-sm text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200"
                            />
                            {uploadForm.fileName && <p className="text-xs text-green-600 mt-2 font-medium truncate">Selected: {uploadForm.fileName}</p>}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Copy of Bill</label>
                        <div className="border border-slate-300 rounded-lg p-3 hover:bg-slate-50 transition-colors bg-white">
                            <input 
                              type="file" 
                              accept=".pdf,.jpg,.png"
                              onChange={handleBillChange}
                              className="w-full text-sm text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200"
                            />
                            {uploadForm.billName && <p className="text-xs text-green-600 mt-2 font-medium truncate">Selected: {uploadForm.billName}</p>}
                        </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Results / Findings (Description)</label>
                        <textarea 
                            required
                            className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary outline-none h-24 bg-white text-slate-900 placeholder-slate-400"
                            placeholder="Enter key findings..."
                            value={uploadForm.description}
                            onChange={e => setUploadForm({...uploadForm, description: e.target.value})}
                        />
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Report Type</label>
                            <select 
                            className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary outline-none bg-white text-slate-900"
                            value={uploadForm.fileType}
                            onChange={e => setUploadForm({...uploadForm, fileType: e.target.value as any})}
                            >
                                <option value="LAB">Lab Result</option>
                                <option value="DICOM">Scan/Image</option>
                                <option value="PDF">General Report</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Test Title</label>
                            <div className="flex gap-2">
                                <input 
                                required
                                type="text" 
                                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary outline-none bg-white text-slate-900 placeholder-slate-400"
                                placeholder="e.g. CBC"
                                value={uploadForm.title}
                                onChange={e => setUploadForm({...uploadForm, title: e.target.value})}
                                />
                                <button 
                                    type="button" 
                                    onClick={handleGenerateTitle}
                                    disabled={!uploadForm.description || loadingTitle}
                                    className="bg-indigo-100 text-indigo-700 px-3 rounded-lg hover:bg-indigo-200 disabled:opacity-50"
                                    title="Auto-generate title"
                                >
                                    {loadingTitle ? <div className="animate-spin h-4 w-4 border-2 border-indigo-700 border-t-transparent rounded-full"/> : <Wand2 size={18} />}
                                </button>
                            </div>
                        </div>
                    </div>
                  </div>

                  <button type="submit" disabled={!uploadForm.fileName || !uploadForm.billName} className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-3 rounded-xl transition-colors">
                     <Upload size={18} /> Send for Approval
                  </button>
               </form>
             </div>
           </div>
         ) : (
           <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl p-8">
              <FlaskConical size={48} className="mb-4 opacity-50" />
              <p>Select a patient from the search to upload reports.</p>
           </div>
         )}
      </div>
    </div>
  );
};