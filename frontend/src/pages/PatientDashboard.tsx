import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../context/Store';
import { MedicalRecord, UserRole, AppointmentStatus, LedgerAction } from '../types';
import { Key, FileText, Plus, AlertCircle, Calendar, Upload, X, Wand2, MapPin, ChevronRight, Stethoscope, Microscope, ShieldAlert, Check, Ban, Siren, Eye, EyeOff, Save, Receipt, FlaskConical, BarChart3, Clock, MessageSquare, ExternalLink } from 'lucide-react';
import { explainToPatient, generateRecordTitle } from '../services/gemini';
import { FileViewer } from '../components/FileViewer';

export const PatientDashboard: React.FC = () => {
   const {
      currentUser, records, appointments, accessKeys, users, ledger, labRequests,
      generateAccessKey, revokeKey, uploadRecord, checkAutoKeys, bookAppointment, respondToAccessRequest,
      updateEmergencyInfo, toggleRecordEmergency, respondToLabRequest
   } = useStore();

   const [activeTab, setActiveTab] = useState<'appointments' | 'records' | 'emergency' | 'insights'>('appointments');
   const [explanation, setExplanation] = useState<string | null>(null);
   const [loadingAI, setLoadingAI] = useState(false);
   const [loadingTitle, setLoadingTitle] = useState(false);
   const [viewingFile, setViewingFile] = useState<MedicalRecord | null>(null);

   // Emergency Info Edit State
   const [emergencyText, setEmergencyText] = useState(currentUser?.emergencyInfo || '');
   const [isEmergencyEditing, setIsEmergencyEditing] = useState(false);

   // Upload Form State
   const [showUploadModal, setShowUploadModal] = useState(false);
   const [uploadForm, setUploadForm] = useState({
      title: '',
      description: '',
      fileType: 'PDF' as MedicalRecord['fileType'],
      fileName: '',
      fileUrl: ''
   });

   // Booking Wizard State
   const [showBookingModal, setShowBookingModal] = useState(false);
   const [bookingStep, setBookingStep] = useState<1 | 2 | 3>(1);
   const [selectedDept, setSelectedDept] = useState<string | null>(null);
   const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
   const [selectedTime, setSelectedTime] = useState<string>('10:00');

   // Available time slots for appointment booking
   const availableTimeSlots = [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '12:00', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
   ];

   const formatTimeSlot = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
   };

   // Run auto-check for keys
   useEffect(() => {
      checkAutoKeys();
      const interval = setInterval(checkAutoKeys, 30000);
      return () => clearInterval(interval);
   }, [checkAutoKeys]);

   // Filter data for current patient
   const myRecords = records.filter(r => r.patientId === currentUser?.id);
   const myAppointments = appointments.filter(a => a.patientId === currentUser?.id && a.status === AppointmentStatus.SCHEDULED);
   const myKeys = accessKeys.filter(k => k.patientId === currentUser?.id && k.isActive);
   const myLabRequests = labRequests.filter(r => r.patientId === currentUser?.id && r.status === 'PENDING');

   // Check for recent emergency access
   const emergencyAccessEvents = ledger.filter(b =>
      b.action === LedgerAction.EMERGENCY_ACCESS &&
      currentUser &&
      b.details.includes(currentUser.id)
   );
   const hasRecentEmergencyAccess = emergencyAccessEvents.length > 0;

   // Follow Ups (Records with dates in future)
   const upcomingFollowUps = myRecords.filter(r => r.followUpDate && new Date(r.followUpDate) > new Date());

   // Insights Data
   const insights = useMemo(() => {
      const allText = myRecords.map(r => r.description + ' ' + r.title).join(' ').toLowerCase();
      const stopWords = ['the', 'and', 'a', 'to', 'of', 'in', 'is', 'for', 'with', 'patient', 'was', 'on', 'at', 'it', 'report', 'results', 'test'];
      const words = allText.split(/\W+/).filter(w => w.length > 3 && !stopWords.includes(w));
      const wordCounts: Record<string, number> = {};
      words.forEach(w => { wordCounts[w] = (wordCounts[w] || 0) + 1; });

      return Object.entries(wordCounts)
         .sort((a, b) => b[1] - a[1])
         .slice(0, 8); // Top 8
   }, [myRecords]);

   // AI Helpers
   const handleExplain = async (text: string) => {
      setLoadingAI(true);
      const result = await explainToPatient(text);
      setExplanation(result);
      setLoadingAI(false);
   };

   const handleGenerateTitle = async () => {
      if (!uploadForm.description) return;
      setLoadingTitle(true);
      const smartTitle = await generateRecordTitle(uploadForm.description);
      setUploadForm(prev => ({ ...prev, title: smartTitle }));
      setLoadingTitle(false);
   };

   // File Handling
   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
         const file = e.target.files[0];
         const reader = new FileReader();
         reader.onloadend = () => {
            setUploadForm({
               ...uploadForm,
               fileName: file.name,
               fileUrl: reader.result as string
            });
         };
         reader.readAsDataURL(file);
      }
   };

   const handleUploadSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (currentUser) {
         uploadRecord(
            currentUser.id,
            uploadForm.title,
            uploadForm.description,
            uploadForm.fileType,
            uploadForm.fileName || 'document.pdf',
            undefined,
            uploadForm.fileUrl
         );
         setShowUploadModal(false);
         setUploadForm({ title: '', description: '', fileType: 'PDF', fileName: '', fileUrl: '' }); // Reset
         setActiveTab('records');
      }
   };

   const handleSaveEmergencyInfo = () => {
      if (currentUser) {
         updateEmergencyInfo(currentUser.id, emergencyText);
         setIsEmergencyEditing(false);
      }
   };

   // Booking Logic
   const getDepartments = (): string[] => {
      const depts = new Set<string>(users.filter(u => u.specialty).map(u => u.specialty as string));
      return Array.from(depts);
   };

   const getDoctorsByDept = (dept: string) => {
      return users.filter(u => u.specialty === dept && (u.role === UserRole.DOCTOR || u.role === UserRole.LAB_TECHNICIAN));
   };

   const handleBookConfirm = () => {
      if (selectedDoc) {
         // Book for tomorrow at selected time
         const tomorrow = new Date();
         tomorrow.setDate(tomorrow.getDate() + 1);
         const [hours, minutes] = selectedTime.split(':').map(Number);
         tomorrow.setHours(hours, minutes, 0, 0);
         bookAppointment(selectedDoc, tomorrow.toISOString());
         setShowBookingModal(false);
         setBookingStep(1);
         setSelectedDept(null);
         setSelectedDoc(null);
         setSelectedTime('10:00'); // Reset to default
      }
   };

   return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative">

         {/* --- FILE VIEWER MODAL --- */}
         {viewingFile && (
            <FileViewer
               fileName={viewingFile.fileName || 'document.pdf'}
               fileType={viewingFile.fileType}
               title={viewingFile.title}
               description={viewingFile.description}
               billFileName={viewingFile.billFileName}
               fileUrl={viewingFile.fileUrl}
               onClose={() => setViewingFile(null)}
            />
         )}

         {/* --- UPLOAD MODAL --- */}
         {showUploadModal && (
            <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
               <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
                  <div className="bg-slate-100 px-6 py-4 flex justify-between items-center border-b border-slate-200">
                     <h3 className="font-bold text-slate-800">Secure File Upload</h3>
                     <button onClick={() => setShowUploadModal(false)} className="text-slate-500 hover:text-red-500">
                        <X size={20} />
                     </button>
                  </div>
                  <form onSubmit={handleUploadSubmit} className="p-6 space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Select File</label>
                        <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:bg-slate-50 transition-colors">
                           <input
                              type="file"
                              accept=".pdf,.jpg,.png,.dcm"
                              onChange={handleFileChange}
                              className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-sky-600"
                           />
                           {uploadForm.fileName && <p className="text-xs text-green-600 mt-2 font-medium">Selected: {uploadForm.fileName}</p>}
                        </div>
                     </div>

                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Description / Clinical Notes</label>
                        <textarea
                           required
                           className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary outline-none h-24"
                           placeholder="Describe the report contents..."
                           value={uploadForm.description}
                           onChange={e => setUploadForm({ ...uploadForm, description: e.target.value })}
                        />
                     </div>

                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Record Title</label>
                        <div className="flex gap-2">
                           <input
                              required
                              type="text"
                              className="flex-1 border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                              placeholder="e.g. Lab Report"
                              value={uploadForm.title}
                              onChange={e => setUploadForm({ ...uploadForm, title: e.target.value })}
                           />
                           <button
                              type="button"
                              onClick={handleGenerateTitle}
                              disabled={!uploadForm.description || loadingTitle}
                              className="bg-indigo-100 text-indigo-700 px-3 py-2 rounded-lg hover:bg-indigo-200 disabled:opacity-50"
                              title="Auto-generate title using AI"
                           >
                              {loadingTitle ? <div className="animate-spin h-4 w-4 border-2 border-indigo-700 border-t-transparent rounded-full" /> : <Wand2 size={18} />}
                           </button>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">Tip: Click the wand to let AI name this file based on description.</p>
                     </div>

                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                        <select
                           className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                           value={uploadForm.fileType}
                           onChange={e => setUploadForm({ ...uploadForm, fileType: e.target.value as any })}
                        >
                           <option value="PDF">Document / Prescription</option>
                           <option value="LAB">Lab Report</option>
                           <option value="DICOM">Scan / X-Ray</option>
                        </select>
                     </div>

                     <button type="submit" disabled={!uploadForm.fileName} className="w-full bg-primary disabled:bg-slate-300 text-white py-2 rounded-lg font-medium hover:bg-sky-600">
                        Encrypt & Upload
                     </button>
                  </form>
               </div>
            </div>
         )}

         {/* --- BOOKING WIZARD MODAL --- */}
         {showBookingModal && (
            <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
               <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
                     <h3 className="font-bold">Book Appointment</h3>
                     <button onClick={() => setShowBookingModal(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                  </div>

                  <div className="p-6 overflow-y-auto flex-1">
                     {bookingStep === 1 && (
                        <div className="space-y-4">
                           <h4 className="text-lg font-semibold text-slate-800">Select Department</h4>
                           <div className="grid grid-cols-2 gap-3">
                              {getDepartments().map(dept => (
                                 <button
                                    key={dept}
                                    onClick={() => { setSelectedDept(dept); setBookingStep(2); }}
                                    className="p-4 border border-slate-200 rounded-xl hover:border-primary hover:bg-sky-50 transition-all text-left group"
                                 >
                                    <div className="mb-2">
                                       {dept.includes('Lab') || dept.includes('Radiology') ? <Microscope className="text-purple-500" /> : <Stethoscope className="text-primary" />}
                                    </div>
                                    <span className="font-semibold text-slate-700 group-hover:text-primary block">{dept}</span>
                                 </button>
                              ))}
                           </div>
                        </div>
                     )}

                     {bookingStep === 2 && selectedDept && (
                        <div className="space-y-4">
                           <div className="flex items-center gap-2 mb-4">
                              <button onClick={() => setBookingStep(1)} className="text-sm text-slate-500 hover:text-slate-800">Departments</button>
                              <ChevronRight size={14} className="text-slate-400" />
                              <span className="text-sm font-semibold text-slate-800">{selectedDept}</span>
                           </div>
                           <h4 className="text-lg font-semibold text-slate-800">Available Specialists</h4>
                           <div className="space-y-3">
                              {getDoctorsByDept(selectedDept).map(doc => (
                                 <button
                                    key={doc.id}
                                    onClick={() => { setSelectedDoc(doc.id); setBookingStep(3); }}
                                    className="w-full flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-primary hover:bg-sky-50 transition-all group"
                                 >
                                    <div className="text-left">
                                       <div className="font-bold text-slate-800">{doc.name}</div>
                                       <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                          <MapPin size={12} /> {doc.hospitalName}
                                       </div>
                                    </div>
                                    <ChevronRight className="text-slate-300 group-hover:text-primary" />
                                 </button>
                              ))}
                           </div>
                        </div>
                     )}

                     {bookingStep === 3 && selectedDoc && (
                        <div className="space-y-6 py-4">
                           <div className="text-center">
                              <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                                 <Calendar size={32} />
                              </div>
                              <h4 className="text-xl font-bold text-slate-800 mt-4">Select Appointment Time</h4>
                              <p className="text-slate-500 mt-2">
                                 Booking with <span className="font-semibold text-slate-900">{users.find(u => u.id === selectedDoc)?.name}</span>
                              </p>
                           </div>

                           {/* Time Slot Selection */}
                           <div>
                              <label className="block text-sm font-medium text-slate-700 mb-3">Choose a time slot for tomorrow:</label>
                              <div className="grid grid-cols-4 gap-2">
                                 {availableTimeSlots.map(time => (
                                    <button
                                       key={time}
                                       onClick={() => setSelectedTime(time)}
                                       className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${selectedTime === time
                                          ? 'bg-primary text-white shadow-md ring-2 ring-primary ring-offset-2'
                                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                          }`}
                                    >
                                       {formatTimeSlot(time)}
                                    </button>
                                 ))}
                              </div>
                           </div>

                           {/* Confirmation Summary */}
                           <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                              <p className="text-sm text-slate-600">
                                 <span className="font-semibold text-slate-800">Appointment Summary:</span><br />
                                 <span className="flex items-center gap-2 mt-2">
                                    <Calendar size={14} className="text-primary" />
                                    Tomorrow at <span className="font-bold text-primary">{formatTimeSlot(selectedTime)}</span>
                                 </span>
                              </p>
                           </div>

                           <div className="flex gap-3">
                              <button onClick={() => setBookingStep(2)} className="flex-1 py-3 border border-slate-300 rounded-lg text-slate-600 font-medium hover:bg-slate-50">Back</button>
                              <button onClick={handleBookConfirm} className="flex-1 py-3 bg-primary text-white rounded-lg font-bold hover:bg-sky-600 transition-colors">Confirm Booking</button>
                           </div>
                        </div>
                     )}
                  </div>
               </div>
            </div>
         )}

         {/* Left Col: Main Content */}
         <div className="lg:col-span-2 space-y-6">

            {/* Emergency Alert Banner */}
            {hasRecentEmergencyAccess && (
               <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-4 animate-pulse">
                  <div className="bg-red-100 p-2 rounded-lg text-red-600">
                     <Siren size={24} />
                  </div>
                  <div>
                     <h3 className="font-bold text-red-800">Security Alert: Emergency Access Detected</h3>
                     <p className="text-sm text-red-600">Your profile was accessed via Emergency Override. Please review the security logs for details.</p>
                  </div>
               </div>
            )}

            {/* PENDING LAB REQUESTS ALERT */}
            {myLabRequests.length > 0 && (
               <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-3 animate-fade-in">
                  <div className="flex items-center gap-3 text-amber-800">
                     <ShieldAlert size={24} />
                     <h3 className="font-bold">Action Required: Pending Lab Reports</h3>
                  </div>
                  <p className="text-sm text-amber-700">The following reports have been uploaded by lab technicians. Please review the bill and approve the report to add it to your medical records.</p>

                  <div className="space-y-2 mt-2">
                     {myLabRequests.map(req => (
                        <div key={req.id} className="bg-white border border-amber-200 rounded-lg p-3 shadow-sm">
                           <div className="flex justify-between items-start">
                              <div className="flex items-center gap-3">
                                 <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
                                    <FlaskConical size={20} />
                                 </div>
                                 <div>
                                    <h4 className="font-bold text-slate-800">{req.title}</h4>
                                    <p className="text-xs text-slate-500">From: {req.labName}</p>
                                 </div>
                              </div>
                              <div className="text-right">
                                 <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded">
                                    <Receipt size={12} /> Bill: {req.billFileName}
                                 </div>
                              </div>
                           </div>
                           <div className="mt-3 flex gap-3">
                              <button
                                 onClick={() => respondToLabRequest(req.id, true)}
                                 className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-2"
                              >
                                 <Check size={14} /> Approve & Add
                              </button>
                              <button
                                 onClick={() => respondToLabRequest(req.id, false)}
                                 className="flex-1 bg-white border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-2"
                              >
                                 <X size={14} /> Reject
                              </button>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            )}

            {/* Follow Up Reminders Banner */}
            {upcomingFollowUps.length > 0 && (
               <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl space-y-2 animate-fade-in">
                  <div className="flex items-center gap-3 text-blue-800">
                     <Clock size={24} />
                     <h3 className="font-bold">Upcoming Follow-ups</h3>
                  </div>
                  {upcomingFollowUps.map(rec => (
                     <div key={rec.id} className="flex justify-between items-center bg-white p-2 rounded-lg border border-blue-100">
                        <div>
                           <p className="font-semibold text-slate-800 text-sm">Follow-up for: {rec.title}</p>
                           <p className="text-xs text-slate-500">{rec.description.substring(0, 50)}...</p>
                        </div>
                        <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-md text-sm font-bold">
                           {new Date(rec.followUpDate!).toLocaleDateString()}
                        </div>
                     </div>
                  ))}
               </div>
            )}

            {/* Tabs */}
            <div className="flex gap-4 border-b border-slate-200 pb-1 overflow-x-auto">
               <button
                  onClick={() => setActiveTab('appointments')}
                  className={`pb-3 px-1 text-sm font-medium whitespace-nowrap ${activeTab === 'appointments' ? 'border-b-2 border-primary text-primary' : 'text-slate-500'}`}
               >
                  My Appointments
               </button>
               <button
                  onClick={() => setActiveTab('records')}
                  className={`pb-3 px-1 text-sm font-medium whitespace-nowrap ${activeTab === 'records' ? 'border-b-2 border-primary text-primary' : 'text-slate-500'}`}
               >
                  Medical Records
               </button>
               <button
                  onClick={() => setActiveTab('insights')}
                  className={`pb-3 px-1 text-sm font-medium whitespace-nowrap ${activeTab === 'insights' ? 'border-b-2 border-purple-500 text-purple-600' : 'text-slate-500'}`}
               >
                  My Insights
               </button>
               <button
                  onClick={() => setActiveTab('emergency')}
                  className={`pb-3 px-1 text-sm font-medium whitespace-nowrap flex items-center gap-2 ${activeTab === 'emergency' ? 'border-b-2 border-red-500 text-red-600' : 'text-slate-500 hover:text-red-400'}`}
               >
                  <Siren size={14} /> Emergency Profile
               </button>
            </div>

            {activeTab === 'appointments' && (
               <div className="space-y-4">
                  <div className="flex justify-between items-center">
                     <h3 className="text-lg font-bold text-slate-800">Scheduled Appointments</h3>
                     <button
                        onClick={() => setShowBookingModal(true)}
                        className="text-sm bg-primary text-white px-3 py-1.5 rounded-md hover:bg-sky-600 flex items-center gap-2"
                     >
                        <Plus size={16} /> Book New
                     </button>
                  </div>

                  {myAppointments.length === 0 && <p className="text-slate-500 italic">No appointments scheduled.</p>}

                  {myAppointments.map(apt => {
                     const activeKey = myKeys.find(k => k.appointmentId === apt.id);

                     return (
                        <div key={apt.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-primary/30 transition-colors">
                           <div className="flex justify-between items-start">
                              <div>
                                 <div className="flex items-center gap-2 mb-1">
                                    <Calendar size={16} className="text-primary" />
                                    <span className="font-semibold text-slate-800">{new Date(apt.date).toLocaleDateString()} at {new Date(apt.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                 </div>
                                 <p className="text-slate-600 font-medium">{apt.doctorName}</p>
                                 <p className="text-sm text-slate-500 flex items-center gap-1"><MapPin size={12} /> {apt.hospitalName}</p>

                                 {/* Access Request Notification */}
                                 {apt.accessRequestStatus === 'PENDING' && (
                                    <div className="mt-3 bg-indigo-50 border border-indigo-200 p-3 rounded-lg flex items-center gap-3 animate-fade-in">
                                       <ShieldAlert className="text-indigo-600" size={20} />
                                       <div className="flex-1">
                                          <p className="text-xs font-bold text-indigo-800">Access Requested</p>
                                          <p className="text-xs text-indigo-600">Dr. {apt.doctorName} wants to view records.</p>
                                       </div>
                                       <div className="flex gap-2">
                                          <button
                                             onClick={() => respondToAccessRequest(apt.id, false)}
                                             className="p-1 bg-white text-red-500 rounded border border-red-200 hover:bg-red-50" title="Deny"
                                          >
                                             <Ban size={16} />
                                          </button>
                                          <button
                                             onClick={() => respondToAccessRequest(apt.id, true)}
                                             className="p-1 bg-indigo-600 text-white rounded border border-indigo-600 hover:bg-indigo-700" title="Approve"
                                          >
                                             <Check size={16} />
                                          </button>
                                       </div>
                                    </div>
                                 )}
                              </div>

                              <div className="text-right">
                                 {activeKey ? (
                                    <div className={`border p-3 rounded-lg animate-fade-in ${activeKey.isAutoGenerated ? 'bg-sky-50 border-sky-200' : 'bg-orange-50 border-orange-200'}`}>
                                       <p className={`text-xs font-bold mb-1 ${activeKey.isAutoGenerated ? 'text-sky-700' : 'text-orange-700'}`}>
                                          {activeKey.isAutoGenerated ? 'AUTO-GENERATED KEY' : 'EMERGENCY KEY'}
                                       </p>
                                       <div className="text-2xl font-mono font-bold tracking-widest text-slate-800">{activeKey.code}</div>
                                       <p className="text-xs text-slate-500 mt-1">Expires: {new Date(activeKey.expiresAt).toLocaleTimeString()}</p>
                                       <button
                                          onClick={() => revokeKey(activeKey.code)}
                                          className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                                       >
                                          Revoke Access
                                       </button>
                                    </div>
                                 ) : (
                                    <div className="flex flex-col items-end">
                                       <span className="text-xs text-slate-400 mb-2">Check-in inactive</span>
                                       <button
                                          onClick={() => generateAccessKey(apt.id, false)}
                                          className="text-xs border border-orange-200 text-orange-600 bg-orange-50 px-2 py-1 rounded hover:bg-orange-100"
                                       >
                                          Force Emergency Key
                                       </button>
                                    </div>
                                 )}
                              </div>
                           </div>
                        </div>
                     );
                  })}
               </div>
            )}

            {activeTab === 'records' && (
               <div className="space-y-4">
                  <div className="flex justify-between items-center">
                     <h3 className="text-lg font-bold text-slate-800">My Health Records</h3>
                     <button
                        onClick={() => setShowUploadModal(true)}
                        className="text-sm border border-slate-300 px-3 py-1.5 rounded-md hover:bg-slate-50 flex items-center gap-2 shadow-sm"
                     >
                        <Upload size={16} /> Upload Record
                     </button>
                  </div>

                  {myRecords.map(rec => (
                     <div key={rec.id} className="bg-white p-4 rounded-xl border border-slate-200 flex gap-4 relative">
                        <div className="bg-blue-50 h-12 w-12 rounded-lg flex items-center justify-center flex-shrink-0">
                           <FileText className="text-primary" />
                        </div>
                        <div className="flex-1">
                           <div className="flex justify-between items-start">
                              <h4 className="font-semibold text-slate-800">{rec.title}</h4>
                              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded font-mono">
                                 #{rec.dataHash.substring(0, 6)}
                              </span>
                           </div>
                           <p className="text-sm text-slate-600 mt-1">{rec.description}</p>

                           <div className="flex gap-2 mt-2">
                              {rec.fileName && (
                                 <div className="text-xs bg-slate-50 inline-block px-2 py-1 rounded border border-slate-100 text-slate-500">
                                    File: {rec.fileName}
                                 </div>
                              )}
                              {rec.billFileName && (
                                 <div className="text-xs bg-emerald-50 inline-block px-2 py-1 rounded border border-emerald-100 text-emerald-600 flex items-center gap-1">
                                    <Receipt size={10} /> Bill: {rec.billFileName}
                                 </div>
                              )}
                           </div>
                           <div className="flex gap-2 mt-2">
                              <button
                                 onClick={() => handleExplain(rec.title)}
                                 className="text-xs text-primary hover:underline"
                              >
                                 Explain term
                              </button>
                              <span className="text-xs text-slate-400">•</span>
                              <button
                                 onClick={() => setViewingFile(rec)}
                                 className="text-xs text-indigo-600 hover:underline font-medium"
                              >
                                 View File
                              </button>
                              <span className="text-xs text-slate-400">•</span>
                              <span className="text-xs text-slate-400">{new Date(rec.dateCreated).toLocaleDateString()}</span>
                           </div>
                        </div>
                        {/* Emergency Toggle in Records Tab as well? Maybe just indication */}
                        <div className="absolute bottom-4 right-4">
                           {rec.isEmergencyAccessible ? (
                              <span title="Visible in Emergency" className="text-green-600"><Eye size={16} /></span>
                           ) : (
                              <span title="Private" className="text-slate-300"><EyeOff size={16} /></span>
                           )}
                        </div>
                     </div>
                  ))}
               </div>
            )}

            {activeTab === 'insights' && (
               <div className="space-y-6 animate-fade-in">
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                     <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><BarChart3 size={20} /></div>
                        <h3 className="font-bold text-slate-800">My Medical Profile Keywords</h3>
                     </div>

                     <div className="flex flex-wrap gap-2">
                        {insights.length > 0 ? (
                           insights.map(([word, count]) => (
                              <span
                                 key={word}
                                 className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 font-medium"
                                 style={{
                                    fontSize: `${Math.max(0.8, 1 + (count / 10))}rem`,
                                    opacity: Math.max(0.6, count / 5)
                                 }}
                              >
                                 {word}
                              </span>
                           ))
                        ) : (
                           <p className="text-slate-400 italic">Not enough data to generate keywords.</p>
                        )}
                     </div>
                     <p className="text-xs text-slate-400 mt-4">
                        Based on commonly appearing terms in your uploaded reports and consultation notes.
                     </p>
                  </div>
               </div>
            )}

            {activeTab === 'emergency' && (
               <div className="space-y-6">
                  <div className="bg-red-50 border border-red-100 rounded-xl p-6">
                     <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-bold text-red-900 flex items-center gap-2">
                           <Siren className="text-red-600" /> Vital Emergency Info
                        </h3>
                        <button
                           onClick={() => isEmergencyEditing ? handleSaveEmergencyInfo() : setIsEmergencyEditing(true)}
                           className="text-sm bg-white border border-red-200 text-red-700 px-3 py-1 rounded hover:bg-red-50 font-medium"
                        >
                           {isEmergencyEditing ? 'Save Info' : 'Edit Info'}
                        </button>
                     </div>
                     {isEmergencyEditing ? (
                        <textarea
                           value={emergencyText}
                           onChange={e => setEmergencyText(e.target.value)}
                           className="w-full h-24 p-3 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-slate-800"
                           placeholder="List allergies, blood type, chronic conditions..."
                        />
                     ) : (
                        <p className="text-slate-700 bg-white/50 p-4 rounded-lg border border-red-100 min-h-[4rem]">
                           {currentUser?.emergencyInfo || "No vital info added."}
                        </p>
                     )}
                     <p className="text-xs text-red-500 mt-2">This information is immediately visible to doctors during an emergency override.</p>
                  </div>

                  <div>
                     <h3 className="text-lg font-bold text-slate-800 mb-4">Emergency File Visibility</h3>
                     <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        {myRecords.map(rec => (
                           <div key={rec.id} className="p-4 border-b border-slate-100 flex items-center justify-between hover:bg-slate-50">
                              <div>
                                 <h4 className="font-semibold text-slate-800">{rec.title}</h4>
                                 <p className="text-xs text-slate-500">{rec.fileType} • {new Date(rec.dateCreated).toLocaleDateString()}</p>
                              </div>
                              <button
                                 onClick={() => toggleRecordEmergency(rec.id)}
                                 className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${rec.isEmergencyAccessible ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                              >
                                 {rec.isEmergencyAccessible ? (
                                    <><Eye size={14} /> Visible</>
                                 ) : (
                                    <><EyeOff size={14} /> Private</>
                                 )}
                              </button>
                           </div>
                        ))}
                        {myRecords.length === 0 && <div className="p-6 text-center text-slate-400">No records to manage.</div>}
                     </div>
                  </div>
               </div>
            )}
         </div>

         {/* Right Col: Helper & AI */}
         <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center gap-4">
               <div className="h-14 w-14 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-xl">
                  {currentUser?.name.charAt(0)}
               </div>
               <div>
                  <h2 className="font-bold text-slate-800">{currentUser?.name}</h2>
                  <p className="text-xs text-slate-500">ID: {currentUser?.id}</p>
                  {currentUser?.phoneNumber && (
                     <p className="text-xs text-slate-500">Phone: {currentUser?.phoneNumber}</p>
                  )}
               </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-lg">
               <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-white/20 rounded-lg">
                     <AlertCircle size={24} />
                  </div>
                  <h3 className="font-bold text-lg">AI Assistant</h3>
               </div>
               <p className="text-sm text-indigo-100 mb-4">
                  Confused by medical terms? Select a record to get a simple explanation.
               </p>

               {loadingAI ? (
                  <div className="text-sm animate-pulse">Analyzing...</div>
               ) : explanation ? (
                  <div className="bg-white/10 p-3 rounded-lg border border-white/20 text-sm">
                     {explanation}
                     <button onClick={() => setExplanation(null)} className="block mt-2 text-xs underline text-indigo-200">Clear</button>
                  </div>
               ) : null}
            </div>

            {/* Feedback Form Card */}
            <a
               href="https://docs.google.com/forms/d/e/1FAIpQLSdTbLqWvy3tzhClp4hWzKKwDgaYHPryRu_k-DDb_Q7_h6YPGQ/viewform"
               target="_blank"
               rel="noopener noreferrer"
               className="block bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] group"
            >
               <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                     <MessageSquare size={24} />
                  </div>
                  <h3 className="font-bold text-lg">Share Your Feedback</h3>
                  <ExternalLink size={16} className="ml-auto opacity-60 group-hover:opacity-100 transition-opacity" />
               </div>
               <p className="text-sm text-emerald-100">
                  Help us improve! Your feedback helps us make MediChain better for everyone.
               </p>
               <div className="mt-4 bg-white/20 rounded-lg px-4 py-2 text-sm font-medium inline-flex items-center gap-2 group-hover:bg-white/30 transition-colors">
                  <span>Take Survey</span>
                  <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
               </div>
            </a>
         </div>
      </div>
   );
};