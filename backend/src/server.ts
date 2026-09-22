import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// console.log(process.env.PORT);

app.get('/api/health', (req, res) => {
    res.json({status: 'OK', message: 'Health Check'});
});

app.listen(PORT, () => {
    console.log(`Server is working on http://localhost:${PORT}`);
});