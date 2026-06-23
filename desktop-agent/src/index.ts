import dotenv from 'dotenv';
dotenv.config();

import { AgentService } from './agent';

const AGENT_KEY = process.env.AGENT_KEY || '';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api/agent';
const SCREENSHOT_INTERVAL = parseInt(process.env.SCREENSHOT_INTERVAL || '10', 10);
const HEARTBEAT_INTERVAL = parseInt(process.env.HEARTBEAT_INTERVAL || '1', 10);

if (!AGENT_KEY) {
  console.error('AGENT_KEY is required. Get it from admin portal → Employees → Agent Key');
  process.exit(1);
}

console.log('===========================================');
console.log('  EMS Desktop Agent v1.0.0');
console.log('===========================================');
console.log(`  API: ${API_BASE_URL}`);
console.log(`  Screenshot Interval: ${SCREENSHOT_INTERVAL} min`);
console.log(`  Heartbeat Interval: ${HEARTBEAT_INTERVAL} min`);
console.log('===========================================');

const agent = new AgentService({
  agentKey: AGENT_KEY,
  apiBaseUrl: API_BASE_URL,
  screenshotInterval: SCREENSHOT_INTERVAL,
  heartbeatInterval: HEARTBEAT_INTERVAL,
});

agent.start();

process.on('SIGINT', () => {
  console.log('\nStopping agent...');
  agent.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  agent.stop();
  process.exit(0);
});
