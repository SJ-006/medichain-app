import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { connectDB, sequelize } from './config/database';
import router from './routes';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', router);

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Start Server
const start = async () => {
    await connectDB();
    await sequelize.sync(); // Sync models
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
};

start();
