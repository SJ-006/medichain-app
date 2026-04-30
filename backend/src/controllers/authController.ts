import 'dotenv/config';
import { Request, Response } from 'express';
import { User, UserRole } from '../models/User';
import { DoctorProfile, Specialty } from '../models/DoctorProfile';
import { sendOTP, verifyOTP } from '../services/smsService';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('Missing required environment variable: JWT_SECRET');
}

// Generate JWT
const generateToken = (id: number) => {
    return jwt.sign({ id }, JWT_SECRET, { expiresIn: '1d' });
};

// 1. Register Patient
export const registerPatient = async (req: Request, res: Response) => {
    try {
        const { name, phone } = req.body;
        let user = await User.findOne({ where: { phone } });
        if (user) return res.status(400).json({ error: 'Phone already registered' });

        user = await User.create({ name, phone, role: UserRole.PATIENT });
        await sendOTP(phone);
        res.status(201).json({ message: 'Patient registered, OTP sent', userId: user.id });
    } catch (error) {
        res.status(500).json({ error: 'Error registering patient' });
    }
};

// 2. Register Doctor
export const registerDoctor = async (req: Request, res: Response) => {
    try {
        const { name, phone, specialty, licenseNumber, hospitalId } = req.body;
        let user = await User.findOne({ where: { phone } });
        if (user) return res.status(400).json({ error: 'Phone already registered' });

        user = await User.create({ name, phone, role: UserRole.DOCTOR });
        await DoctorProfile.create({
            userId: user.id,
            specialty: specialty as Specialty,
            licenseNumber,
            hospitalId,
        });

        await sendOTP(phone);
        res.status(201).json({ message: 'Doctor registered, OTP sent', userId: user.id });
    } catch (error) {
        res.status(500).json({ error: 'Error registering doctor' });
    }
};

// 3. Login (Send OTP)
export const login = async (req: Request, res: Response) => {
    try {
        const { phone } = req.body;
        const user = await User.findOne({ where: { phone } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        await sendOTP(phone);
        res.status(200).json({ message: 'OTP sent' });
    } catch (error) {
        res.status(500).json({ error: 'Login error' });
    }
};

// 4. Verify OTP & Get Token
export const verifyLoginOTP = async (req: Request, res: Response) => {
    try {
        const { phone, otp } = req.body;
        const isValid = await verifyOTP(phone, otp);

        if (!isValid) return res.status(400).json({ error: 'Invalid or expired OTP' });

        const user = await User.findOne({ where: { phone } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const token = generateToken(user.id);
        res.status(200).json({ message: 'Login successful', token, role: user.role });
    } catch (error) {
        res.status(500).json({ error: 'Verification error' });
    }
};
