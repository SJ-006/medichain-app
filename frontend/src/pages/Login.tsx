import React, { useState } from 'react';
import { useStore } from '../context/Store';
import { UserRole, User } from '../types';
import { UserCircle2, Stethoscope, Smartphone, ShieldCheck, ArrowRight, Users, UserPlus, HeartPulse } from 'lucide-react';

export const Login: React.FC = () => {
  const { users, login, getUsersByPhone, registerPatient } = useStore();
  const [mode, setMode] = useState<'PATIENT' | 'STAFF'>('PATIENT');
  
  // Patient Login State
  const [phoneNumber, setPhoneNumber] = useState('');
  const [step, setStep] = useState<'PHONE' | 'OTP' | 'PROFILE' | 'REGISTER'>('PHONE');
  const [foundProfiles, setFoundProfiles] = useState<User[]>([]);
  const [otp, setOtp] = useState('');

  // Registration State
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmergency, setRegEmergency] = useState('');

  // Staff Login State
  const [staffId, setStaffId] = useState('');

  // --- Patient Logic ---
  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const profiles = getUsersByPhone(phoneNumber);
    if (profiles.length > 0) {
      setFoundProfiles(profiles);
      setStep('OTP');
    } else {
      if (confirm("No accounts found with this number. Would you like to create a new profile?")) {
          setRegPhone(phoneNumber);
          setStep('REGISTER');
      }
    }
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp === '1234') { // Mock OTP
      setStep('PROFILE');
    } else {
      alert("Invalid OTP (Use 1234)");
    }
  };

  const handleRegister = (e: React.FormEvent) => {
      e.preventDefault();
      if (regName && regPhone) {
          registerPatient(regName, regPhone, regEmergency);
          setStep('PHONE'); // Reset to login
          alert("Registration Successful! Please login with your phone number.");
      }
  };

  const selectProfile = (userId: string) => {
    login(userId);
  };

  // --- Staff Logic ---
  const handleStaffLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.id === staffId && (u.role === UserRole.DOCTOR || u.role === UserRole.LAB_TECHNICIAN));
    if (user) {
      login(user.id);
    } else {
      alert("Invalid Staff ID. Try 'd1', 'd2' or 'l1'.");
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-900 p-6 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">MediChain Access</h1>
          <p className="text-slate-400 text-sm">Secure Health Record Gateway</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button 
            onClick={() => { setMode('PATIENT'); setStep('PHONE'); }}
            className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${mode === 'PATIENT' ? 'text-primary border-b-2 border-primary bg-sky-50' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <UserCircle2 size={18} /> Patient / Family
          </button>
          <button 
            onClick={() => setMode('STAFF')}
            className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${mode === 'STAFF' ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Stethoscope size={18} /> Doctor / Lab
          </button>
        </div>

        {/* Body */}
        <div className="p-8">
          
          {/* --- PATIENT FLOW --- */}
          {mode === 'PATIENT' && (
            <div>
              {step === 'PHONE' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="text-center mb-6">
                    <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Smartphone className="text-primary" />
                    </div>
                    <h3 className="font-bold text-slate-800">Login with Mobile</h3>
                    <p className="text-xs text-slate-500">Access your records and managed family profiles.</p>
                  </div>
                  <form onSubmit={handleSendOtp}>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone Number</label>
                    <input 
                      type="tel" 
                      value={phoneNumber}
                      onChange={e => setPhoneNumber(e.target.value)}
                      placeholder="e.g. 9980099800"
                      className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none mb-4 bg-white text-slate-900"
                    />
                    <button type="submit" className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-sky-600 transition-colors">
                        Send OTP
                    </button>
                  </form>
                  
                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink-0 mx-4 text-slate-400 text-xs">OR</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                  </div>

                  <button 
                    onClick={() => { setStep('REGISTER'); setRegPhone(phoneNumber); }}
                    className="w-full bg-white border border-slate-300 text-slate-700 py-3 rounded-lg font-semibold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <UserPlus size={18} /> Create New Patient Profile
                  </button>
                </div>
              )}

              {step === 'REGISTER' && (
                  <form onSubmit={handleRegister} className="space-y-4 animate-fade-in">
                      <div className="text-center mb-6">
                        <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <UserPlus className="text-green-600" />
                        </div>
                        <h3 className="font-bold text-slate-800">New Patient Registration</h3>
                        <p className="text-xs text-slate-500">Create a secure medical identity.</p>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                        <input 
                            required
                            type="text" 
                            value={regName}
                            onChange={e => setRegName(e.target.value)}
                            placeholder="e.g. Aditi Rao"
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white text-slate-900 placeholder-slate-400"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mobile Number</label>
                        <input 
                            required
                            type="tel" 
                            value={regPhone}
                            onChange={e => setRegPhone(e.target.value)}
                            placeholder="e.g. 9980099800"
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white text-slate-900 placeholder-slate-400"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vital Emergency Info (Optional)</label>
                        <textarea 
                            value={regEmergency}
                            onChange={e => setRegEmergency(e.target.value)}
                            placeholder="e.g. Blood Type O+, Diabetes, Penicillin Allergy"
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none h-20 text-sm bg-white text-slate-900 placeholder-slate-400"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">This info will be visible to doctors during emergency overrides.</p>
                      </div>

                      <button type="submit" className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors">
                        Register & Create ID
                      </button>
                      
                      <button type="button" onClick={() => setStep('PHONE')} className="w-full text-slate-500 text-sm mt-2">
                        Cancel
                      </button>
                  </form>
              )}

              {step === 'OTP' && (
                <form onSubmit={handleVerifyOtp} className="space-y-4 animate-fade-in">
                  <div className="text-center mb-6">
                    <h3 className="font-bold text-slate-800">Enter Verification Code</h3>
                    <p className="text-xs text-slate-500">Sent to {phoneNumber}</p>
                  </div>
                  <div>
                    <input 
                      type="text" 
                      value={otp}
                      onChange={e => setOtp(e.target.value)}
                      placeholder="1234"
                      className="w-full p-3 border border-slate-300 rounded-lg text-center tracking-widest text-xl focus:ring-2 focus:ring-primary outline-none bg-white text-slate-900"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 text-center">Mock OTP: 1234</p>
                  </div>
                  <button type="submit" className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-sky-600 transition-colors">
                    Verify
                  </button>
                  <button type="button" onClick={() => setStep('PHONE')} className="w-full text-slate-500 text-sm">
                    Back
                  </button>
                </form>
              )}

              {step === 'PROFILE' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="text-center mb-6">
                    <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Users className="text-purple-600" />
                    </div>
                    <h3 className="font-bold text-slate-800">Who is accessing?</h3>
                    <p className="text-xs text-slate-500">Select a profile linked to this number.</p>
                  </div>
                  <div className="space-y-3">
                    {foundProfiles.map(profile => (
                      <button
                        key={profile.id}
                        onClick={() => selectProfile(profile.id)}
                        className="w-full flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-primary hover:bg-blue-50 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-600 font-bold">
                            {profile.name.charAt(0)}
                          </div>
                          <div className="text-left">
                            <p className="font-bold text-slate-800 group-hover:text-primary">{profile.name}</p>
                            <p className="text-xs text-slate-500">{profile.id}</p>
                          </div>
                        </div>
                        <ArrowRight size={16} className="text-slate-300 group-hover:text-primary" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* --- STAFF FLOW --- */}
          {mode === 'STAFF' && (
             <form onSubmit={handleStaffLogin} className="space-y-4 animate-fade-in">
              <div className="text-center mb-6">
                 <div className="h-12 w-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <ShieldCheck className="text-emerald-600" />
                  </div>
                <h3 className="font-bold text-slate-800">Staff Login</h3>
                <p className="text-xs text-slate-500">Doctors, Nurses, and Lab Technicians</p>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Staff ID / Username</label>
                <input 
                  type="text" 
                  value={staffId}
                  onChange={e => setStaffId(e.target.value)}
                  placeholder="e.g. d1, d2, l1"
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none bg-white text-slate-900 placeholder-slate-400"
                />
                 <div className="flex gap-2 mt-2">
                    <span className="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-500">Doctor: d1</span>
                    <span className="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-500">Lab: l1</span>
                 </div>
              </div>

              <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors">
                Login to Portal
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};