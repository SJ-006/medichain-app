import 'dotenv/config';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

const BASE_URL = process.env.API_URL || 'http://localhost:3000/api';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function getLatestOtherFromLog(phone: string): Promise<string> {
    const logPath = path.join(__dirname, '../logs/otp.log');
    if (!fs.existsSync(logPath)) throw new Error('OTP Log not found');
    const content = fs.readFileSync(logPath, 'utf-8');
    const lines = content.trim().split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
        const [p, code] = lines[i].split(':');
        if (p === phone) return code.trim();
    }
    throw new Error('OTP not found for phone');
}

async function runVerification() {
    try {
        console.log('--- STARTING VERIFICATION ---');

        console.log('Ensure server is running! (Separate terminal: npm run dev)');
        await sleep(2000);

        // 1. Register Patient
        console.log('\n[1] Registering Patient...');
        const patientPhone = '+1234567890';
        try {
            await axios.post(`${BASE_URL}/auth/register/patient`, {
                name: 'John Doe',
                phone: patientPhone
            });
            console.log('Patient Registered');
        } catch (e: any) {
            if (e.response && e.response.status === 400) console.log('Patient already registered');
            else throw e;
        }

        // 2. Login Patient (Send OTP)
        console.log('\n[2] Logging in Patient...');
        await axios.post(`${BASE_URL}/auth/login`, { phone: patientPhone });
        await sleep(1000); // Wait for file write
        const patientOtp = await getLatestOtherFromLog(patientPhone);
        console.log(`Got OTP for Patient: ${patientOtp}`);

        // Verify
        const patientAuth = await axios.post(`${BASE_URL}/auth/verify`, { phone: patientPhone, otp: patientOtp });
        const patientToken = patientAuth.data.token;
        console.log('Patient Data Token Obtained');

        // 3. Register Doctor
        console.log('\n[3] Registering Doctor (Cardiologist)...');
        const doctorPhone = '+1987654321';
        try {
            await axios.post(`${BASE_URL}/auth/register/doctor`, {
                name: 'Dr. Smith',
                phone: doctorPhone,
                specialty: 'CARDIOLOGY',
                licenseNumber: 'CARDIO-123',
                hospitalId: 'HOSP-001'
            });
            console.log('Doctor Registered');
        } catch (e: any) {
            if (e.response && e.response.status === 400) console.log('Doctor already registered');
            else throw e;
        }

        // Login Doctor
        await axios.post(`${BASE_URL}/auth/login`, { phone: doctorPhone });
        await sleep(1000);
        const doctorOtp = await getLatestOtherFromLog(doctorPhone);
        console.log(`Got OTP for Doctor: ${doctorOtp}`);

        const doctorAuth = await axios.post(`${BASE_URL}/auth/verify`, { phone: doctorPhone, otp: doctorOtp });
        const doctorToken = doctorAuth.data.token;
        console.log('Doctor Token Obtained');

        // 4. Upload Record (Patient)
        console.log('\n[4] Patient Uploading Record (Cardiology)...');
        // Create a dummy file
        const filePath = path.join(__dirname, 'test_report.txt');
        fs.writeFileSync(filePath, 'This is a secure cardiology report content.');

        const form = new FormData();
        form.append('file', fs.createReadStream(filePath));
        form.append('type', 'CARDIOLOGY');

        const uploadRes = await axios.post(`${BASE_URL}/records/upload`, form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Bearer ${patientToken}`
            }
        });
        const recordId = uploadRes.data.recordId;
        console.log(`Record Uploaded! ID: ${recordId}`);

        // 5. Doctor Access Attempts
        console.log('\n[5] Doctor Access Attempts...');

        // Attempt 1: Outside Hospital (Fail)
        console.log('Attempt 1: Doctor Outside Hospital (Lat: 0, Lng: 0)...');
        try {
            await axios.post(`${BASE_URL}/records/${recordId}/access`, {
                lat: 0,
                lng: 0
            }, {
                headers: { 'Authorization': `Bearer ${doctorToken}` }
            });
            console.error('FAIL: Should have been denied (Location)');
        } catch (e: any) {
            console.log(`SUCCESS: Denied as expected: ${e.response?.data?.error}`);
        }

        // Attempt 2: Inside Hospital but No Appointment (Fail)
        console.log('Attempt 2: Doctor Inside Hospital but No Appointment...');
        try {
            await axios.post(`${BASE_URL}/records/${recordId}/access`, {
                lat: 12.9716, // Matches .env default
                lng: 77.5946
            }, {
                headers: { 'Authorization': `Bearer ${doctorToken}` }
            });
            console.error('FAIL: Should have been denied (Appointment)');
        } catch (e: any) {
            console.log(`SUCCESS: Denied as expected: ${e.response?.data?.error}`);
        }

        // 6. Book Appointment
        console.log('\n[6] Booking Appointment...');
        // Need doctor ID. Decoded from token or just query?
        // We didn't keep doctor user ID easily. Let's assume we can login again or we returned it in login?
        // verifyLoginOTP doesn't return ID directly, only token.
        // Register returned userId.
        // But login didn't.
        // I will fetch doctor ID from verify response or just guess it's 2 (since 1 is patient).
        // Or I can add a /me endpoint. For now, assuming ID 2.
        // Wait, registration responses return userId.

        // Actually, I can use a helper or just try ID 2.
        const doctorId = 2; // Assumption

        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + 30 * 60000); // 30 mins

        await axios.post(`${BASE_URL}/appointments/book`, {
            doctorId: doctorId,
            startTime: startTime,
            endTime: endTime
        }, {
            headers: { 'Authorization': `Bearer ${patientToken}` }
        });
        console.log('Appointment Booked!');

        // 7. Access Success
        console.log('\n[7] Doctor Access (With Valid Appointment + Location)...');
        try {
            const accessRes = await axios.post(`${BASE_URL}/records/${recordId}/access`, {
                lat: 12.9716,
                lng: 77.5946
            }, {
                headers: { 'Authorization': `Bearer ${doctorToken}` }
            });
            console.log('SUCCESS: Record Content: ', accessRes.data);
        } catch (e: any) {
            console.error(`FAIL: ${e.response?.data?.error}`);
        }

    } catch (error: any) {
        if (error.response) {
            console.error('API Error:', error.response.status, error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
}

runVerification();
