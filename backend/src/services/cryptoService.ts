import 'dotenv/config';
import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY_HEX = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY_HEX) {
    throw new Error('Missing required environment variable: ENCRYPTION_KEY');
}

const ENCRYPTION_KEY = Buffer.from(ENCRYPTION_KEY_HEX, 'hex');
const IV_LENGTH = 16;

if (ENCRYPTION_KEY.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be 32 bytes encoded as 64 hex characters');
}

export const encryptFile = (buffer: Buffer): { encryptedData: Buffer; iv: Buffer } => {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(buffer);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return { encryptedData: encrypted, iv };
};

export const decryptFile = (encryptedBuffer: Buffer, iv: Buffer): Buffer => {
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedBuffer);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted;
};

export const generateFileHash = (buffer: Buffer): string => {
    return crypto.createHash('sha256').update(buffer).digest('hex');
};
