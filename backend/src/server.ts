import 'dotenv/config';
import { app } from './app.js';
import { env } from './config/env.js';

const PORT = env.PORT ?? 4000;

app.listen(PORT, () => {
    console.log(`Server is working on http://localhost:${PORT}`);
});