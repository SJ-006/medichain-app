import React, { useState, useMemo } from 'react';
import { useStore } from '../context/Store';
import { MedicalRecord, Appointment, AppointmentStatus, User } from '../types';
import { ShieldCheck, Lock, FileText, User as UserIcon, AlertTriangle, Calendar, Clock, ChevronLeft, CheckCircle2, Activity, Stethoscope, Unlock, Send, PenTool, Save, Siren, X, Phone, EyeOff, BarChart3, Users, PieChart, CalendarDays } from 'lucide-react';
import { summarizeRecord } from '../services/gemini';
import { FileViewer } from '../components/FileViewer';

export const DoctorDashboard: React.FC = () => {
    const { currentUser, verifyAccessKey, records, users, isGeoFenced, appointments, revokeKey, requestAccess, completeAppointment, performEmergencyAccess } = useStore();

    // View State: null = List View, Appointment = Consultation View
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [currentTab, setCurrentTab] = useState<'SCHEDULE' | 'INSIGHTS'>('SCHEDULE');

    // Session State
    const [accessKeyInput, setAccessKeyInput] = useState('');
    const [currentActiveKey, setCurrentActiveKey] = useState<string | null>(null);
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Clinical Notes & Followup State
    const [clinicalNotes, setClinicalNotes] = useState('');
    const [followUpDate, setFollowUpDate] = useState('');

    // AI Summary State
    const [summaries, setSummaries] = useState<Record<string, string>>({});
    const [loadingSummary, setLoadingSummary] = useState<string | null>(null);

    // Emergency Mode State
    const [showEmergencyModal, setShowEmergencyModal] = useState(false);
    const [emergencyPhone, setEmergencyPhone] = useState('');
    const [emergencyPatients, setEmergencyPatients] = useState<User[]>([]);

    // File Viewer State
    const [viewingFile, setViewingFile] = useState<MedicalRecord | null>(null);

    // 1. Get My Pending Appointments (Hide Completed)
    const myAppointments = appointments
        .filter(a => a.doctorId === currentUser?.id && a.status === AppointmentStatus.SCHEDULED)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 2. Handlers
    const startConsultation = (apt: Appointment) => {
        setSelectedAppointment(apt);
        setAccessKeyInput('');
        setCurrentActiveKey(null);
        setIsSessionActive(false);
        setErrorMsg(null);
        setClinicalNotes('');
        setFollowUpDate('');
    };

    const exitConsultation = () => {
        // REVOKE KEY ON EXIT
        if (currentActiveKey) {
            revokeKey(currentActiveKey);
        }
        setSelectedAppointment(null);
        setIsSessionActive(false);
        setCurrentActiveKey(null);
        setAccessKeyInput('');
        setSummaries({});
    };

    const handleCompleteVisit = () => {
        if (selectedAppointment && clinicalNotes.trim()) {
            completeAppointment(selectedAppointment.id, clinicalNotes, followUpDate);
            // Return to dashboard
            setSelectedAppointment(null);
            setIsSessionActive(false);
            setCurrentActiveKey(null);
            setClinicalNotes('');
            setFollowUpDate('');
        } else {
            alert("Please enter clinical notes before completing.");
        }
    };

    const handleVerify = (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        if (!currentUser) return;

        // Verify the key against the store
        const result = verifyAccessKey(accessKeyInput, currentUser.id);

        if (result.valid && result.patientId === selectedAppointment?.patientId) {
            setIsSessionActive(true);
            setCurrentActiveKey(accessKeyInput); // Store key to revoke later
        } else if (result.valid && result.patientId !== selectedAppointment?.patientId) {
            setErrorMsg("Key belongs to a different patient!");
        } else {
            setErrorMsg(result.message);
        }
    };

    const handleRequestAccess = () => {
        if (selectedAppointment) {
            requestAccess(selectedAppointment.id);
        }
    };

    const handleSummarize = async (recordId: string, content: string) => {
        setLoadingSummary(recordId);
        const summary = await summarizeRecord(content);
        setSummaries(prev => ({ ...prev, [recordId]: summary }));
        setLoadingSummary(null);
    };

    const handleEmergencySearch = (e: React.FormEvent) => {
        e.preventDefault();
        const found = performEmergencyAccess(emergencyPhone);
        setEmergencyPatients(found);
        if (found.length === 0) {
            alert("No patients found with this number.");
        }
    };

    const closeEmergency = () => {
        setShowEmergencyModal(false);
        setEmergencyPatients([]);
        setEmergencyPhone('');
    };

    // 3. Helper to get data & Filtering Logic
    const getPatientRecords = (): MedicalRecord[] => {
        if (!selectedAppointment || !isSessionActive) return [];

        const allRecords = records.filter(r => r.patientId === selectedAppointment.patientId);

        // Specialty Filtering Logic
        if (!currentUser?.specialty || currentUser.specialty === 'General Practice') {
            return allRecords; // GPs see everything
        }

        // Filter based on simple keywords related to specialty
        const specialtyKeywords: Record<string, string[]> = {
            'Cardiology': ['heart', 'cardio', 'ecg', 'bp', 'blood pressure', 'pulse', 'chest'],
            'Orthopedics': ['bone', 'fracture', 'spine', 'back', 'knee', 'joint', 'pain'],
            'Neurology': ['brain', 'head', 'nerve', 'migraine', 'seizure', 'neuro'],
            'Dermatology': ['skin', 'rash', 'acne', 'derma']
        };

        const keywords = specialtyKeywords[currentUser.specialty] || [];

        if (keywords.length === 0) return allRecords; // No keywords defined, show all

        return allRecords.filter(r => {
            const text = (r.title + ' ' + r.description + ' ' + (r.fileType === 'LAB' ? 'lab' : '')).toLowerCase();
            return keywords.some(k => text.includes(k));
        });
    };

    const patientDetails = selectedAppointment
        ? users.find(u => u.id === selectedAppointment.patientId)
        : null;


    // --- INSIGHTS COMPUTATION ---
    const insights = useMemo(() => {
        // 1. Get all patients this doctor has seen (completed appointments)
        const myCompletedApts = appointments.filter(a => a.doctorId === currentUser?.id && a.status === AppointmentStatus.COMPLETED);
        const seenPatientIds = Array.from(new Set(myCompletedApts.map(a => a.patientId)));
        const myPatients = users.filter(u => seenPatientIds.includes(u.id));

        // Demographics
        const totalPatients = myPatients.length;
        const avgAge = totalPatients > 0
            ? Math.round(myPatients.reduce((sum, p) => sum + (p.age || 0), 0) / totalPatients)
            : 0;

        const males = myPatients.filter(p => p.gender === 'Male').length;
        const females = myPatients.filter(p => p.gender === 'Female').length;

        // Visit Counts
        const totalVisits = myCompletedApts.length;
        const avgVisits = totalPatients > 0 ? (totalVisits / totalPatients).toFixed(1) : 0;

        // Keywords (Simple Frequency Count)
        const allText = myCompletedApts.map(a => {
            // Try to find the record created for this appointment to get the clinical notes
            // Note: In a real app we'd link them better. Here we check records by date approx.
            const rec = records.find(r => r.patientId === a.patientId && r.dataHash.includes(a.id));
            return rec ? rec.description : '';
        }).join(' ').toLowerCase();

        const stopWords = ['the', 'and', 'a', 'to', 'of', 'in', 'is', 'for', 'with', 'patient', 'was', 'on', 'at', 'it'];
        const words = allText.split(/\W+/).filter(w => w.length > 3 && !stopWords.includes(w));
        const wordCounts: Record<string, number> = {};
        words.forEach(w => { wordCounts[w] = (wordCounts[w] || 0) + 1; });

        const topKeywords = Object.entries(wordCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8); // Top 8

        return { totalPatients, avgAge, males, females, totalVisits, avgVisits, topKeywords };
    }, [appointments, records, users, currentUser]);


    // --- RENDER ---

    // VIEW 1: DASHBOARD (Schedule + Insights)
    if (!selectedAppointment) {
        return (
            <div className="max-w-5xl mx-auto space-y-6">
                {/* File Viewer Modal */}
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

                {/* Emergency Modal */}
                {showEmergencyModal && (
                    <div className="fixed inset-0 bg-red-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in border-4 border-red-500">
                            <div className="bg-red-600 px-6 py-4 flex justify-between items-center text-white">
                                <div className="flex items-center gap-2">
                                    <Siren className="animate-pulse" />
                                    <h2 className="text-xl font-bold">EMERGENCY OVERRIDE</h2>
                                </div>
                                <button onClick={closeEmergency} className="hover:bg-red-700 p-1 rounded"><X size={24} /></button>
                            </div>

                            <div className="p-6">
                                {emergencyPatients.length === 0 ? (
                                    <form onSubmit={handleEmergencySearch} className="space-y-6">
                                        <div className="bg-red-50 border border-red-200 p-4 rounded-lg text-red-800 text-sm">
                                            <p className="font-bold flex items-center gap-2"><AlertTriangle size={16} /> WARNING:</p>
                                            <p>This action will bypass standard security protocols. Your ID, timestamp, and the patient's ID will be immutably logged on the public ledger as an EMERGENCY EVENT.</p>
                                        </div>
                                        <div>
                                            <label className="block font-bold text-slate-700 mb-2">Patient Phone Number</label>
                                            <input
                                                type="tel"
                                                autoFocus
                                                value={emergencyPhone}
                                                onChange={e => setEmergencyPhone(e.target.value)}
                                                className="w-full text-2xl p-3 border-2 border-slate-300 rounded-lg focus:border-red-500 outline-none"
                                                placeholder="Enter number..."
                                            />
                                        </div>
                                        <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl text-lg flex items-center justify-center gap-2 shadow-lg">
                                            <Unlock size={24} /> ACCESS CRITICAL DATA
                                        </button>
                                    </form>
                                ) : (
                                    <div className="space-y-6 max-h-[60vh] overflow-y-auto">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-bold text-slate-800 text-lg">Patients Found ({emergencyPatients.length})</h3>
                                            <button onClick={() => setEmergencyPatients([])} className="text-sm text-slate-500 underline">Search Again</button>
                                        </div>
                                        {emergencyPatients.map(patient => {
                                            // Filter records: Only show Emergency Accessible ones
                                            const pRecords = records.filter(r => r.patientId === patient.id && r.isEmergencyAccessible);

                                            return (
                                                <div key={patient.id} className="border-2 border-red-100 rounded-xl p-4 bg-red-50/30">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-12 w-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center font-bold text-xl">
                                                                {patient.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-lg text-slate-900">{patient.name}</h4>
                                                                <div className="flex gap-4 text-sm text-slate-600">
                                                                    <span className="flex items-center gap-1"><UserIcon size={14} /> ID: {patient.id}</span>
                                                                    <span className="flex items-center gap-1"><Phone size={14} /> {patient.phoneNumber}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="bg-red-100 text-red-700 px-3 py-1 rounded text-xs font-bold animate-pulse">
                                                            CRITICAL ACCESS
                                                        </div>
                                                    </div>

                                                    {/* Vital Info Section */}
                                                    {patient.emergencyInfo && (
                                                        <div className="mb-4 bg-white border border-red-200 p-3 rounded-lg shadow-sm">
                                                            <h5 className="font-bold text-red-700 text-xs uppercase mb-1 flex items-center gap-1"><Siren size={12} /> Vital Information</h5>
                                                            <p className="text-sm text-slate-800 font-medium">{patient.emergencyInfo}</p>
                                                        </div>
                                                    )}

                                                    <div className="space-y-2">
                                                        <h5 className="font-semibold text-slate-700 text-sm flex items-center justify-between">
                                                            <span>Available Records ({pRecords.length})</span>
                                                            <span className="text-xs font-normal text-slate-400 flex items-center gap-1"><EyeOff size={10} /> Hidden: {records.filter(r => r.patientId === patient.id).length - pRecords.length}</span>
                                                        </h5>
                                                        {pRecords.length === 0 ? (
                                                            <p className="text-sm text-slate-400 italic">No emergency-accessible records found.</p>
                                                        ) : (
                                                            pRecords.map(rec => (
                                                                <div key={rec.id} className="bg-white border border-slate-200 p-3 rounded-lg shadow-sm">
                                                                    <div className="flex justify-between">
                                                                        <span className="font-bold text-slate-800 text-sm">{rec.title}</span>
                                                                        <span className="text-xs text-slate-400">{new Date(rec.dateCreated).toLocaleDateString()}</span>
                                                                    </div>
                                                                    <p className="text-sm text-slate-600 mt-1">{rec.description}</p>
                                                                    <button
                                                                        onClick={() => setViewingFile(rec)}
                                                                        className="mt-2 text-xs text-indigo-600 hover:underline font-medium"
                                                                    >
                                                                        View File →
                                                                    </button>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Welcome, {currentUser?.name}</h1>
                        <p className="text-slate-500">
                            {currentUser?.specialty ? `${currentUser.specialty} Specialist` : 'Medical Practitioner'} • {currentUser?.hospitalName}
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg">
                            <Calendar size={18} />
                            <span className="font-medium">{new Date().toLocaleDateString()}</span>
                        </div>
                        <button
                            onClick={() => setShowEmergencyModal(true)}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold shadow-md shadow-red-200 flex items-center gap-2 animate-pulse"
                        >
                            <Siren size={18} /> EMERGENCY ACCESS
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 border-b border-slate-200">
                    <button
                        onClick={() => setCurrentTab('SCHEDULE')}
                        className={`pb-3 px-2 text-sm font-semibold flex items-center gap-2 transition-colors ${currentTab === 'SCHEDULE' ? 'text-primary border-b-2 border-primary' : 'text-slate-500'}`}
                    >
                        <Clock size={16} /> Schedule & Visits
                    </button>
                    <button
                        onClick={() => setCurrentTab('INSIGHTS')}
                        className={`pb-3 px-2 text-sm font-semibold flex items-center gap-2 transition-colors ${currentTab === 'INSIGHTS' ? 'text-primary border-b-2 border-primary' : 'text-slate-500'}`}
                    >
                        <BarChart3 size={16} /> Patient Insights
                    </button>
                </div>

                {/* TAB CONTENT: SCHEDULE */}
                {currentTab === 'SCHEDULE' && (
                    <>
                        {/* Geo-Fence Warning */}
                        {!isGeoFenced && (
                            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
                                <AlertTriangle size={20} />
                                <div>
                                    <span className="font-bold">Location Warning:</span> You are outside the hospital geo-fence. You can view your schedule, but patient record access will be blocked.
                                </div>
                            </div>
                        )}

                        {/* Appointment List */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                                <Clock className="text-slate-400" size={18} />
                                <h3 className="font-semibold text-slate-700">Pending Appointments</h3>
                            </div>

                            {myAppointments.length === 0 ? (
                                <div className="p-12 text-center text-slate-400">
                                    <div className="bg-slate-50 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle2 size={32} />
                                    </div>
                                    <p className="text-lg font-medium text-slate-600">All caught up!</p>
                                    <p className="text-sm">No pending appointments scheduled for today.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {myAppointments.map(apt => (
                                        <div key={apt.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                            <div className="flex items-center gap-6">
                                                <div className="text-center w-16">
                                                    <div className="text-lg font-bold text-slate-800">
                                                        {new Date(apt.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                    <div className="text-xs text-slate-500 uppercase font-bold">Today</div>
                                                </div>
                                                <div>
                                                    <h4 className="text-lg font-bold text-slate-800">{users.find(u => u.id === apt.patientId)?.name || 'Unknown Patient'}</h4>
                                                    <p className="text-sm text-slate-500">Patient ID: {apt.patientId}</p>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => startConsultation(apt)}
                                                className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-lg hover:bg-primary transition-colors font-medium shadow-sm hover:shadow-md"
                                            >
                                                <Stethoscope size={18} /> Attend Patient
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* TAB CONTENT: INSIGHTS */}
                {currentTab === 'INSIGHTS' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">

                        {/* Demographics Card */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Users size={20} /></div>
                                <h3 className="font-bold text-slate-800">Demographics</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-4 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-slate-800">{insights.avgAge}</div>
                                    <div className="text-xs text-slate-500 uppercase font-bold mt-1">Avg Age</div>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-slate-800">{insights.avgVisits}</div>
                                    <div className="text-xs text-slate-500 uppercase font-bold mt-1">Avg Visits/Pt</div>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-around">
                                <div className="text-center">
                                    <div className="text-lg font-bold text-blue-600">{insights.males}</div>
                                    <div className="text-xs text-slate-400">Male</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-lg font-bold text-pink-500">{insights.females}</div>
                                    <div className="text-xs text-slate-400">Female</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-lg font-bold text-slate-600">{insights.totalPatients}</div>
                                    <div className="text-xs text-slate-400">Total</div>
                                </div>
                            </div>
                        </div>

                        {/* Keyword Cloud */}
                        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><PieChart size={20} /></div>
                                <h3 className="font-bold text-slate-800">Report Analytics & Keywords</h3>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {insights.topKeywords.length > 0 ? (
                                    insights.topKeywords.map(([word, count], i) => (
                                        <span
                                            key={word}
                                            className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-medium"
                                            style={{
                                                fontSize: `${Math.max(0.8, 1 + (count / 10))}rem`,
                                                opacity: Math.max(0.6, count / 5)
                                            }}
                                        >
                                            {word} <span className="text-xs text-slate-400 ml-1">({count})</span>
                                        </span>
                                    ))
                                ) : (
                                    <p className="text-slate-400 italic">Not enough data to generate keywords.</p>
                                )}
                            </div>
                            <p className="text-xs text-slate-400 mt-6">
                                * Keywords extracted from clinical notes and report descriptions of patients you have treated.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // VIEW 2: CONSULTATION MODE
    // Re-find appointment to get fresh status
    const currentApt = appointments.find(a => a.id === selectedAppointment.id) || selectedAppointment;
    const filteredRecords = getPatientRecords();

    return (
        <div className="max-w-6xl mx-auto space-y-6">
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

            {/* Navigation Header */}
            <div className="flex items-center gap-4">
                <button onClick={exitConsultation} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                    <ChevronLeft size={24} />
                </button>
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Consultation: {patientDetails?.name || 'Patient'}</h2>
                    <p className="text-sm text-slate-500 flex items-center gap-2">
                        <Clock size={12} /> Started at {new Date().toLocaleTimeString()}
                    </p>
                </div>
            </div>

            {/* Locked State */}
            {!isSessionActive ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-slate-900 px-6 py-4 flex justify-between items-center">
                        <h2 className="text-white font-semibold flex items-center gap-2">
                            <Lock className="text-white/80" size={20} /> Record Access Locked
                        </h2>
                        {!isGeoFenced && (
                            <div className="flex items-center gap-2 text-red-300 text-xs bg-red-900/30 px-2 py-1 rounded">
                                <AlertTriangle size={12} /> Geo-Fence Check Failed
                            </div>
                        )}
                    </div>

                    <div className="p-10 text-center max-w-lg mx-auto">
                        <div className="h-16 w-16 bg-sky-50 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
                            <ShieldCheck size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Patient Authorization Required</h3>
                        <p className="text-slate-500 mb-6 text-sm">
                            Ask the patient for their 6-digit access key or request access notification.
                        </p>

                        {/* Manual Entry */}
                        <form onSubmit={handleVerify} className="space-y-4 mb-6">
                            <input
                                autoFocus
                                type="text"
                                value={accessKeyInput}
                                onChange={(e) => setAccessKeyInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="000 000"
                                className="w-full text-center text-4xl font-mono tracking-[0.5em] py-4 border-2 border-slate-200 rounded-xl focus:border-primary focus:ring-0 outline-none transition-colors"
                            />
                            <button
                                type="submit"
                                disabled={accessKeyInput.length !== 6}
                                className="w-full bg-primary hover:bg-sky-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg shadow-primary/30"
                            >
                                Unlock Records
                            </button>
                        </form>

                        <div className="relative flex py-2 items-center">
                            <div className="flex-grow border-t border-slate-200"></div>
                            <span className="flex-shrink-0 mx-4 text-slate-400 text-xs">OR</span>
                            <div className="flex-grow border-t border-slate-200"></div>
                        </div>

                        {/* Request Access Button */}
                        <div className="mt-4">
                            {currentApt.accessRequestStatus === 'PENDING' ? (
                                <div className="p-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-sm flex items-center justify-center gap-2 animate-pulse">
                                    <Clock size={16} /> Request sent. Waiting for patient...
                                </div>
                            ) : currentApt.accessRequestStatus === 'APPROVED' ? (
                                <div className="p-3 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm flex items-center justify-center gap-2">
                                    <CheckCircle2 size={16} /> Access Approved! Ask patient for key.
                                </div>
                            ) : currentApt.accessRequestStatus === 'REJECTED' ? (
                                <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm flex items-center justify-center gap-2">
                                    <AlertTriangle size={16} /> Request Rejected.
                                </div>
                            ) : (
                                <button
                                    onClick={handleRequestAccess}
                                    className="w-full border-2 border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
                                >
                                    <Send size={18} /> Request Access from Patient
                                </button>
                            )}
                        </div>

                        {errorMsg && (
                            <div className="mt-6 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center justify-center gap-2 animate-fade-in">
                                <AlertTriangle size={16} /> {errorMsg}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* Unlocked State */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">

                    {/* LEFT COL: RECORDS */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Security Banner */}
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex justify-between items-center">
                            <div className="flex items-center gap-2 text-green-700 font-medium">
                                <Unlock size={20} />
                                <span>Secure Connection Established. Records Decrypted.</span>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <Activity className="text-primary" /> Medical History
                                </h3>
                                <div className="flex items-center gap-2">
                                    {currentUser?.specialty !== 'General Practice' && (
                                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded border border-yellow-200 font-medium flex items-center gap-1">
                                            <Lock size={10} /> Filtered by {currentUser?.specialty}
                                        </span>
                                    )}
                                    <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500">
                                        {filteredRecords.length} Records
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {filteredRecords.length === 0 ? (
                                    <div className="text-center py-10 text-slate-400">
                                        <FileText size={48} className="mx-auto mb-2 opacity-50" />
                                        <p>No accessible records found.</p>
                                        {currentUser?.specialty !== 'General Practice' && <p className="text-xs mt-2">Only {currentUser?.specialty}-related records are shown.</p>}
                                    </div>
                                ) : (
                                    filteredRecords.map(rec => (
                                        <div key={rec.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors group">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-blue-50 text-primary rounded-lg">
                                                        <FileText size={20} />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-800">{rec.title}</h4>
                                                        <div className="text-xs text-slate-500 flex gap-2">
                                                            <span>{rec.fileType}</span>
                                                            <span>•</span>
                                                            <span>{new Date(rec.dateCreated).toLocaleDateString()}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {rec.fileName && (
                                                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded">
                                                        {rec.fileName}
                                                    </span>
                                                )}
                                            </div>

                                            <p className="text-sm text-slate-600 mb-4 pl-[3.25rem]">{rec.description}</p>

                                            {/* AI Summary Section */}
                                            <div className="ml-[3.25rem] bg-indigo-50/50 p-3 rounded-md border border-indigo-100">
                                                <div className="flex items-center justify-between mb-2">
                                                    {summaries[rec.id] ? (
                                                        <div className="text-xs text-indigo-900 animate-fade-in flex-1">
                                                            <span className="font-bold text-indigo-700">AI Summary:</span> {summaries[rec.id]}
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleSummarize(rec.id, rec.description)}
                                                            disabled={loadingSummary === rec.id}
                                                            className="text-xs text-indigo-600 font-medium hover:underline flex items-center gap-1"
                                                        >
                                                            {loadingSummary === rec.id ? 'Analyzing...' : 'Generate AI Summary'}
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => setViewingFile(rec)}
                                                        className="text-xs text-primary font-semibold hover:underline ml-3"
                                                    >
                                                        View File →
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COL: CURRENT VISIT */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl border-2 border-indigo-100 shadow-lg p-6 flex flex-col h-full">
                            <div className="flex items-center gap-2 mb-4 text-indigo-800">
                                <PenTool size={20} />
                                <h3 className="font-bold text-lg">Current Consultation</h3>
                            </div>

                            <div className="flex-1 space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Clinical Notes & Evaluation</label>
                                    <textarea
                                        value={clinicalNotes}
                                        onChange={(e) => setClinicalNotes(e.target.value)}
                                        className="w-full h-48 p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-sm leading-relaxed"
                                        placeholder="Record symptoms, diagnosis, and prescription details here..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                        <CalendarDays size={16} /> Follow-up Required?
                                    </label>
                                    <input
                                        type="date"
                                        value={followUpDate}
                                        onChange={(e) => setFollowUpDate(e.target.value)}
                                        min={new Date().toISOString().split('T')[0]}
                                        className="w-full p-3 border border-slate-300 rounded-lg text-sm"
                                    />
                                    {followUpDate && <p className="text-xs text-indigo-600 mt-1">Patient will be reminded for follow-up.</p>}
                                </div>
                            </div>

                            <div className="mt-6 space-y-3">
                                <button
                                    onClick={handleCompleteVisit}
                                    disabled={!clinicalNotes.trim()}
                                    className="w-full bg-indigo-600 disabled:bg-slate-300 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all"
                                >
                                    <Save size={18} /> Complete Visit & Save
                                </button>
                                <button
                                    onClick={exitConsultation}
                                    className="w-full bg-white border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200 font-medium py-3 rounded-xl transition-colors"
                                >
                                    Exit without Completing
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
};