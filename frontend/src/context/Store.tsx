import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  User, UserRole, MedicalRecord, Appointment, AccessKey,
  LedgerBlock, AppState, LedgerAction, AppointmentStatus, LabRequest
} from '../types';

// Simple hashing simulation
const simpleHash = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
};

// Haversine formula to calculate distance in meters
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d * 1000; // Distance in meters
};

// Initial Data Seeding
const MOCK_USERS: User[] = [
  // Family Account: Parent and Child share phone number
  { id: 'p1', name: 'Rahul Sharma', role: UserRole.PATIENT, phoneNumber: '9980099800', emergencyInfo: 'Blood Type: O+, Allergic to Penicillin', age: 45, gender: 'Male' },
  { id: 'p2', name: 'Aarav Sharma (Child)', role: UserRole.PATIENT, phoneNumber: '9980099800', emergencyInfo: 'No known allergies', age: 10, gender: 'Male' },

  // Medical Staff with Specialties in Bengaluru
  { id: 'd1', name: 'Dr. Priya Reddy', role: UserRole.DOCTOR, hospitalName: 'Manipal Hospital', specialty: 'General Practice', location: { lat: 12.9592, lng: 77.6476 } }, // Old Airport Rd
  { id: 'd2', name: 'Dr. Arjun Rao', role: UserRole.DOCTOR, hospitalName: 'Apollo Hospital', specialty: 'Cardiology', location: { lat: 12.8955, lng: 77.5986 } }, // Bannerghatta
  { id: 'd3', name: 'Dr. Lakshmi Nair', role: UserRole.DOCTOR, hospitalName: 'Narayana Health', specialty: 'Neurology', location: { lat: 12.8368, lng: 77.6749 } }, // Electronic City
  { id: 'd4', name: 'Dr. Rohan Mehta', role: UserRole.DOCTOR, hospitalName: 'Fortis Hospital', specialty: 'Orthopedics', location: { lat: 12.9912, lng: 77.5960 } }, // Cunningham Rd

  // Labs
  { id: 'l1', name: 'Anand Diagnostics', role: UserRole.LAB_TECHNICIAN, hospitalName: 'Anand Diagnostics', specialty: 'Pathology Lab' },
  { id: 'l2', name: 'Aarthi Scans', role: UserRole.LAB_TECHNICIAN, hospitalName: 'Aarthi Scans & Labs', specialty: 'Radiology Center' },
];

const MOCK_RECORDS: MedicalRecord[] = [
  {
    id: 'r1', patientId: 'p1', title: 'Blood Work - Complete Blood Count',
    description: 'Hemoglobin: 13.5 g/dL, WBC: 6.5, Platelets: 250k. Normal range.',
    fileName: 'cbc_results_jan.pdf',
    fileType: 'LAB', dateCreated: new Date(Date.now() - 86400000 * 10).toISOString(),
    dataHash: simpleHash('r1-data-initial'),
    isEmergencyAccessible: true
  },
  {
    id: 'r2', patientId: 'p1', title: 'MRI Scan - Lumbar Spine',
    description: 'Mild disc herniation at L4-L5. No spinal stenosis observed.',
    fileName: 'mri_scan_L4L5.dcm',
    fileType: 'DICOM', dateCreated: new Date(Date.now() - 86400000 * 2).toISOString(),
    dataHash: simpleHash('r2-data-initial'),
    isEmergencyAccessible: false // Private by default
  },
];

const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: 'apt1', patientId: 'p1', doctorId: 'd1', doctorName: 'Dr. Priya Reddy',
    hospitalName: 'Manipal Hospital', date: new Date().toISOString(), // Today (Simulated "Now")
    durationMinutes: 60, status: AppointmentStatus.SCHEDULED
  },
  {
    id: 'apt2', patientId: 'p2', doctorId: 'd2', doctorName: 'Dr. Arjun Rao',
    hospitalName: 'Apollo Hospital', date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    durationMinutes: 30, status: AppointmentStatus.SCHEDULED
  }
];

interface StoreContextType extends AppState {
  login: (userId: string) => void;
  registerPatient: (name: string, phoneNumber: string, emergencyInfo: string) => void;
  getUsersByPhone: (phone: string) => User[];
  logout: () => void;
  uploadRecord: (patientId: string, title: string, description: string, fileType: MedicalRecord['fileType'], fileName: string, billFileName?: string, fileUrl?: string) => void;
  bookAppointment: (doctorId: string, date: string) => void;
  generateAccessKey: (appointmentId: string, isAuto?: boolean) => string;
  verifyAccessKey: (key: string, doctorId: string) => { valid: boolean; message: string; patientId?: string };
  revokeKey: (code: string) => void;
  isGeoFenced: boolean;
  currentCoords: { lat: number; lng: number } | null;
  locationError: string | null;
  toggleGeoFence: () => void;
  checkAutoKeys: () => void;
  requestAccess: (appointmentId: string) => void;
  respondToAccessRequest: (appointmentId: string, approved: boolean) => void;
  completeAppointment: (appointmentId: string, summary: string, followUpDate?: string) => void;
  performEmergencyAccess: (phoneNumber: string) => User[];
  updateEmergencyInfo: (userId: string, info: string) => void;
  toggleRecordEmergency: (recordId: string) => void;
  submitLabRequest: (patientId: string, title: string, description: string, fileType: MedicalRecord['fileType'], reportFileName: string, billFileName: string) => void;
  respondToLabRequest: (requestId: string, approved: boolean) => void;
}

const StoreContext = createContext<StoreContextType | null>(null);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load from localStorage or use defaults
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('medichain-state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          // Ensure dates are properly parsed
          appointments: parsed.appointments?.map((a: any) => ({
            ...a,
            date: typeof a.date === 'string' ? a.date : new Date(a.date).toISOString()
          })) || MOCK_APPOINTMENTS,
          // Keep other data from localStorage
          users: parsed.users || MOCK_USERS,
          records: parsed.records || MOCK_RECORDS,
          accessKeys: parsed.accessKeys || [],
          ledger: parsed.ledger || [{
            index: 0,
            timestamp: new Date().toISOString(),
            action: LedgerAction.UPLOAD_RECORD,
            details: 'Genesis Block',
            dataHash: '0000',
            previousHash: '0',
            blockHash: '0001'
          }],
          labRequests: parsed.labRequests || [],
        };
      } catch (e) {
        console.error('Failed to parse saved state:', e);
      }
    }
    // Default state if no saved data
    return {
      currentUser: null,
      users: MOCK_USERS,
      records: MOCK_RECORDS,
      appointments: MOCK_APPOINTMENTS,
      accessKeys: [],
      labRequests: [],
      ledger: [
        {
          index: 0,
          timestamp: new Date().toISOString(),
          action: LedgerAction.UPLOAD_RECORD,
          details: 'Genesis Block',
          dataHash: '0000',
          previousHash: '0',
          blockHash: '0001'
        }
      ]
    };
  });

  const [isGeoFenced, setIsGeoFenced] = useState(true);
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Auto-save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('medichain-state', JSON.stringify(state));
  }, [state]);

  // Geolocation Tracking for Doctors
  useEffect(() => {
    if (!state.currentUser || state.currentUser.role !== UserRole.DOCTOR) {
      setIsGeoFenced(true); // Don't block non-doctors
      return;
    }

    if (isSimulationMode) {
      setIsGeoFenced(true);
      return;
    }

    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCurrentCoords({ lat: latitude, lng: longitude });

        if (state.currentUser?.location) {
          const dist = getDistance(
            latitude, longitude,
            state.currentUser.location.lat,
            state.currentUser.location.lng
          );
          // Within 500 meters of hospital
          setIsGeoFenced(dist <= 500);
        }
      },
      (err) => {
        console.error("Location error:", err);
        setLocationError(err.message);
        setIsGeoFenced(false); // Block access if location unavailable
      },
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [state.currentUser, isSimulationMode]);

  // Helper to add to immutable ledger
  const addToLedger = (action: LedgerAction, details: string, dataHash: string) => {
    setState(prev => {
      const lastBlock = prev.ledger[prev.ledger.length - 1];
      const newBlock: LedgerBlock = {
        index: prev.ledger.length,
        timestamp: new Date().toISOString(),
        action,
        details,
        dataHash,
        previousHash: lastBlock.blockHash,
        blockHash: simpleHash(lastBlock.blockHash + action + details + dataHash)
      };
      return { ...prev, ledger: [...prev.ledger, newBlock] };
    });
  };

  const login = (userId: string) => {
    const user = state.users.find(u => u.id === userId);
    if (user) setState(prev => ({ ...prev, currentUser: user }));
  };

  const registerPatient = (name: string, phoneNumber: string, emergencyInfo: string) => {
    const newUser: User = {
      id: `p${Date.now()}`,
      name,
      role: UserRole.PATIENT,
      phoneNumber,
      emergencyInfo,
      age: 30, // Default for demo
      gender: 'Other' // Default for demo
    };

    setState(prev => ({ ...prev, users: [...prev.users, newUser], currentUser: newUser }));
    addToLedger(LedgerAction.REGISTER_PATIENT, `New patient registered: ${name}`, simpleHash(name + phoneNumber));
  };

  const getUsersByPhone = (phone: string) => {
    return state.users.filter(u => u.phoneNumber === phone && u.role === UserRole.PATIENT);
  };

  const logout = () => {
    setState(prev => ({ ...prev, currentUser: null }));
  };

  const uploadRecord = (patientId: string, title: string, description: string, fileType: MedicalRecord['fileType'], fileName: string, billFileName?: string, fileUrl?: string) => {
    const uploaderId = state.currentUser?.id || 'SYSTEM';

    const newRecord: MedicalRecord = {
      id: `r${Date.now()}`,
      patientId: patientId,
      title,
      description,
      fileType,
      fileName,
      billFileName,
      dateCreated: new Date().toISOString(),
      dataHash: simpleHash(description + title + fileName),
      fileUrl,
      isEmergencyAccessible: true
    };

    setState(prev => ({ ...prev, records: [newRecord, ...prev.records] }));
    addToLedger(LedgerAction.UPLOAD_RECORD, `New ${fileType} uploaded for ${patientId} by ${uploaderId}`, newRecord.dataHash);
  };

  // Lab Technician submits a request
  const submitLabRequest = (patientId: string, title: string, description: string, fileType: MedicalRecord['fileType'], reportFileName: string, billFileName: string) => {
    const labTech = state.currentUser;
    if (!labTech || labTech.role !== UserRole.LAB_TECHNICIAN) return;

    const newRequest: LabRequest = {
      id: `req${Date.now()}`,
      patientId,
      labTechId: labTech.id,
      labName: labTech.hospitalName || 'Unknown Lab',
      title,
      description,
      fileType,
      reportFileName,
      billFileName,
      status: 'PENDING',
      dateSubmitted: new Date().toISOString()
    };

    setState(prev => ({ ...prev, labRequests: [newRequest, ...prev.labRequests] }));
    addToLedger(LedgerAction.LAB_REQUEST_SUBMITTED, `Lab Request sent to ${patientId} by ${labTech.name}`, simpleHash(title + reportFileName));
  };

  // Patient responds to request
  const respondToLabRequest = (requestId: string, approved: boolean) => {
    const request = state.labRequests.find(r => r.id === requestId);
    if (!request) return;

    if (approved) {
      // Create actual record
      uploadRecord(request.patientId, request.title, request.description, request.fileType, request.reportFileName, request.billFileName);

      addToLedger(LedgerAction.LAB_REQUEST_APPROVED, `Patient approved lab report ${requestId}`, simpleHash(requestId));
    } else {
      addToLedger(LedgerAction.LAB_REQUEST_REJECTED, `Patient rejected lab report ${requestId}`, simpleHash(requestId));
    }

    // Remove request from pending list (or mark as handled)
    setState(prev => ({
      ...prev,
      labRequests: prev.labRequests.filter(r => r.id !== requestId)
    }));
  };

  const bookAppointment = (doctorId: string, date: string) => {
    if (!state.currentUser) return;
    const doctor = state.users.find(u => u.id === doctorId);
    if (!doctor) return;

    const newApt: Appointment = {
      id: `apt${Date.now()}`,
      patientId: state.currentUser.id,
      doctorId,
      doctorName: doctor.name,
      hospitalName: doctor.hospitalName || 'Unknown',
      date,
      durationMinutes: 30,
      status: AppointmentStatus.SCHEDULED
    };
    setState(prev => ({ ...prev, appointments: [...prev.appointments, newApt] }));
  };

  const generateAccessKey = (appointmentId: string, isAuto: boolean = false): string => {
    const existingKey = state.accessKeys.find(k => k.appointmentId === appointmentId && k.isActive);
    if (existingKey) return existingKey.code;

    const apt = state.appointments.find(a => a.id === appointmentId);
    if (!apt) return '';

    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
    const duration = isAuto ? (apt.durationMinutes + 60) : 30;
    const expiresAt = new Date(Date.now() + 1000 * 60 * duration).toISOString();

    const newKey: AccessKey = {
      code,
      appointmentId,
      patientId: apt.patientId,
      generatedAt: new Date().toISOString(),
      expiresAt,
      isActive: true,
      isAutoGenerated: isAuto
    };

    setState(prev => ({ ...prev, accessKeys: [...prev.accessKeys, newKey] }));
    addToLedger(
      isAuto ? LedgerAction.AUTO_GENERATE_KEY : LedgerAction.GENERATE_KEY,
      `Key generated for Apt ${appointmentId}`,
      simpleHash(code)
    );
    return code;
  };

  const checkAutoKeys = useCallback(() => {
    if (!state.currentUser || state.currentUser.role !== UserRole.PATIENT) return;

    const now = new Date();
    const activeAppointments = state.appointments.filter(a => {
      if (a.patientId !== state.currentUser?.id) return false;
      const aptTime = new Date(a.date);
      const diffInMinutes = (now.getTime() - aptTime.getTime()) / (1000 * 60);
      return diffInMinutes > -60 && diffInMinutes < 60;
    });

    activeAppointments.forEach(apt => {
      const hasKey = state.accessKeys.some(k => k.appointmentId === apt.id && k.isActive);
      if (!hasKey) {
        generateAccessKey(apt.id, true);
      }
    });
  }, [state.appointments, state.accessKeys, state.currentUser]);

  const revokeKey = (code: string) => {
    setState(prev => ({
      ...prev,
      accessKeys: prev.accessKeys.map(k => k.code === code ? { ...k, isActive: false } : k)
    }));
    addToLedger(LedgerAction.REVOKE_ACCESS, `Key ${code} revoked`, simpleHash(code));
  };

  const verifyAccessKey = (key: string, doctorId: string): { valid: boolean; message: string; patientId?: string } => {
    const accessKey = state.accessKeys.find(k => k.code === key);

    if (!accessKey) return { valid: false, message: 'Invalid Key' };
    if (!accessKey.isActive) return { valid: false, message: 'Key Revoked' };
    if (new Date() > new Date(accessKey.expiresAt)) return { valid: false, message: 'Key Expired' };

    const appointment = state.appointments.find(a => a.id === accessKey.appointmentId);
    if (!appointment) return { valid: false, message: 'Appointment Not Found' };
    if (appointment.doctorId !== doctorId) return { valid: false, message: 'Key not valid for this doctor' };

    if (!isGeoFenced) return { valid: false, message: 'Doctor not at hospital location (Geo-fence failed)' };

    addToLedger(LedgerAction.ACCESS_DATA, `Doctor ${doctorId} accessed Patient ${accessKey.patientId}`, simpleHash(key));

    return { valid: true, message: 'Success', patientId: accessKey.patientId };
  };

  const requestAccess = (appointmentId: string) => {
    setState(prev => ({
      ...prev,
      appointments: prev.appointments.map(a =>
        a.id === appointmentId ? { ...a, accessRequestStatus: 'PENDING' } : a
      )
    }));
    addToLedger(LedgerAction.REQUEST_ACCESS, `Doctor requested access for Apt ${appointmentId}`, simpleHash(appointmentId));
  };

  const respondToAccessRequest = (appointmentId: string, approved: boolean) => {
    setState(prev => ({
      ...prev,
      appointments: prev.appointments.map(a =>
        a.id === appointmentId ? { ...a, accessRequestStatus: approved ? 'APPROVED' : 'REJECTED' } : a
      )
    }));

    if (approved) {
      generateAccessKey(appointmentId, false);
      addToLedger(LedgerAction.APPROVE_ACCESS, `Access Approved for Apt ${appointmentId}`, simpleHash(appointmentId));
    } else {
      addToLedger(LedgerAction.REJECT_ACCESS, `Access Rejected for Apt ${appointmentId}`, simpleHash(appointmentId));
    }
  };

  const completeAppointment = (appointmentId: string, summary: string, followUpDate?: string) => {
    const apt = state.appointments.find(a => a.id === appointmentId);
    if (!apt || !state.currentUser) return;

    setState(prev => {
      // 1. Mark Appointment Completed
      const updatedAppointments = prev.appointments.map(a =>
        a.id === appointmentId ? { ...a, status: AppointmentStatus.COMPLETED } : a
      );

      // 2. Create Record
      const newRecord: MedicalRecord = {
        id: `r${Date.now()}`,
        patientId: apt.patientId,
        title: `Consultation: ${state.currentUser?.name}`,
        description: summary,
        fileType: 'PDF',
        fileName: `visit_${new Date().toISOString().split('T')[0]}.pdf`,
        dateCreated: new Date().toISOString(),
        dataHash: simpleHash(summary + apt.id),
        isEmergencyAccessible: true,
        followUpDate: followUpDate // Add Follow-up info
      };
      const updatedRecords = [newRecord, ...prev.records];

      // 3. Revoke active key
      const updatedKeys = prev.accessKeys.map(k =>
        k.appointmentId === appointmentId && k.isActive
          ? { ...k, isActive: false }
          : k
      );

      // 4. Update Ledger manually (atomic)
      const lastBlock = prev.ledger[prev.ledger.length - 1];
      const newBlock: LedgerBlock = {
        index: prev.ledger.length,
        timestamp: new Date().toISOString(),
        action: LedgerAction.UPLOAD_RECORD,
        details: `Visit completed & Record generated for Apt ${appointmentId}`,
        dataHash: newRecord.dataHash,
        previousHash: lastBlock.blockHash,
        blockHash: simpleHash(lastBlock.blockHash + LedgerAction.UPLOAD_RECORD + `Visit completed & Record generated for Apt ${appointmentId}` + newRecord.dataHash)
      };
      const updatedLedger = [...prev.ledger, newBlock];

      return {
        ...prev,
        appointments: updatedAppointments,
        records: updatedRecords,
        accessKeys: updatedKeys,
        ledger: updatedLedger
      };
    });
  };

  const performEmergencyAccess = (phoneNumber: string): User[] => {
    const targets = state.users.filter(u => u.phoneNumber === phoneNumber && u.role === UserRole.PATIENT);

    if (targets.length > 0 && state.currentUser) {
      targets.forEach(t => {
        addToLedger(
          LedgerAction.EMERGENCY_ACCESS,
          `EMERGENCY OVERRIDE: Dr. ${state.currentUser?.id} accessed ${t.name} (ID: ${t.id})`,
          simpleHash(phoneNumber + Date.now())
        );
      });
    }
    return targets;
  };

  const updateEmergencyInfo = (userId: string, info: string) => {
    setState(prev => ({
      ...prev,
      users: prev.users.map(u => u.id === userId ? { ...u, emergencyInfo: info } : u),
      currentUser: prev.currentUser?.id === userId ? { ...prev.currentUser, emergencyInfo: info } : prev.currentUser
    }));
    addToLedger(LedgerAction.UPDATE_EMERGENCY_SETTINGS, `User ${userId} updated vital emergency info`, simpleHash(info));
  };

  const toggleRecordEmergency = (recordId: string) => {
    setState(prev => ({
      ...prev,
      records: prev.records.map(r => r.id === recordId ? { ...r, isEmergencyAccessible: !r.isEmergencyAccessible } : r)
    }));
  };

  const toggleGeoFence = () => {
    setIsSimulationMode(!isSimulationMode);
    if (!isSimulationMode) {
      setIsGeoFenced(true);
    }
  };

  return (
    <StoreContext.Provider value={{
      ...state, login, registerPatient, logout, uploadRecord, bookAppointment,
      generateAccessKey, verifyAccessKey, revokeKey, isGeoFenced, toggleGeoFence,
      currentCoords, locationError,
      getUsersByPhone, checkAutoKeys, requestAccess, respondToAccessRequest,
      completeAppointment, performEmergencyAccess, updateEmergencyInfo, toggleRecordEmergency,
      submitLabRequest, respondToLabRequest
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within StoreProvider");
  return context;
};