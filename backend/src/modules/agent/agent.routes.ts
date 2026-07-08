import { Router } from 'express';
import {
  agentHeartbeat,
  agentScreenshot,
  agentLogActivity,
  agentPunchIn,
  agentPunchOut,
  getAgentConfig,
  agentSync,
  getAgentStatus,
} from './agent.controller';
import { authenticateAgent } from '../../middleware/auth';
import { uploadScreenshot } from '../../middleware/upload';

const router = Router();

router.use(authenticateAgent);

router.post('/heartbeat', agentHeartbeat);
router.post('/screenshot', uploadScreenshot.single('screenshot'), agentScreenshot);
router.post('/activity', agentLogActivity);
router.post('/punch-in', agentPunchIn);
router.post('/punch-out', agentPunchOut);
router.post('/sync', agentSync);
router.get('/config', getAgentConfig);
router.get('/status', getAgentStatus);

export default router;
