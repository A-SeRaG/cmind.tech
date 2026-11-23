import { createApp } from './app.js';
import { loadConfig } from './config.js';

const cfg = loadConfig();
const server = createApp(cfg).listen(cfg.PORT, () => console.log(`API listening on :${cfg.PORT}`));
const stop = () => server.close(() => process.exit(0));
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
