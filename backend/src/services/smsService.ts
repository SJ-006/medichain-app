import axios from 'axios';
import crypto from 'crypto';
import { OTP } from '../models/OTP';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
dotenv.config();

export const sendOTP = async (phone: string): Promise<boolean> => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hash = crypto.createHash('sha256').update(otp).digest('hex');

    // Save to DB
    await OTP.create({
        phone,
        codeHash: hash,
        expiresAt: new Date(Date.now() + 5 * 60000), // 5 mins
    });

    try {
        // DEV: Log to file for testing
        const logPath = path.join(__dirname, '../../logs');
        if (!fs.existsSync(logPath)) fs.mkdirSync(logPath);
        console.log(`Logging OTP to: ${path.join(logPath, 'otp.log')}`);
        fs.appendFileSync(path.join(logPath, 'otp.log'), `${phone}:${otp}\n`);

        const apiKey = process.env.FAST2SMS_API_KEY;
        if (!apiKey) {
            console.log('Fast2SMS API Key missing or default. Skipping real SMS.');
            return true;
        }

        // Fast2SMS API Call
        // Docs: https://docs.fast2sms.com/
        // "variables_values" is for the "Fast2SMS Quick Send" route usually. 
        // Ensuring basic implementation.
        const response = await axios.get('https://www.fast2sms.com/dev/bulkV2', {
            headers: {
                authorization: apiKey
            },
            params: {
                route: 'otp',
                variables_values: otp,
                flash: 0,
                numbers: phone.replace('+91', '').replace(/[^0-9]/g, '') // Clean phone number
            }
        });

        console.log(`Fast2SMS Response: ${JSON.stringify(response.data)}`);
        return response.data.return;

    } catch (error) {
        console.error('Error sending OTP via Fast2SMS:', error);
        return true; // Return true to allow flow to continue even if SMS fails (dev mode)
    }
};

export const verifyOTP = async (phone: string, code: string): Promise<boolean> => {
    const hash = crypto.createHash('sha256').update(code).digest('hex');
    const otpRecord = await OTP.findOne({
        where: { phone, codeHash: hash, used: false },
        order: [['createdAt', 'DESC']],
    });

    if (!otpRecord) return false;

    if (otpRecord.expiresAt < new Date()) {
        return false;
    }

    // Mark as used
    otpRecord.used = true;
    await otpRecord.save();

    return true;
};
