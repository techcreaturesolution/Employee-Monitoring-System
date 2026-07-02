// backend/src/scripts/fixInflatedActivityLogs.ts
//
// One-off cleanup for the "stale activityStartTime" bug in the desktop agent
// (AgentService.cjs), where the duration anchor wasn't reset between
// punch-out/punch-in or sleep/resume cycles — causing some ActivityLog
// entries to record wildly inflated durationMinutes (e.g. 60+ hours for a
// single app session that only lasted a few real minutes/hours).
//
// This script ONLY reads and writes the ActivityLog collection. It does not
// touch Users, Attendance, Screenshots, Tenants, or anything else.
//
// USAGE (run from backend/ directory):
//   Dry run (default — shows what it would do, changes nothing):
//     npx ts-node src/scripts/fixInflatedActivityLogs.ts
//
//   Apply the fix for real (caps inflated entries down to a sane ceiling):
//     npx ts-node src/scripts/fixInflatedActivityLogs.ts --apply
//
//   Optional flags:
//     --threshold=<minutes>   Minutes above which an entry is considered
//                              "inflated". Default: 600 (10 hours).
//     --cap=<minutes>         What to cap inflated entries down to.
//                              Default: 480 (8 hours — a full shift).

import mongoose from 'mongoose';
import { ActivityLog } from '../models/ActivityLog';
import { config } from '../config';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const THRESHOLD_MINUTES = Number(
  args.find((a) => a.startsWith('--threshold='))?.split('=')[1] || 600
);
const CAP_MINUTES = Number(
  args.find((a) => a.startsWith('--cap='))?.split('=')[1] || 480
);

async function run() {
  console.log(`\nConnecting to database...`);
  await mongoose.connect(config.mongodbUri);
  console.log('Connected.\n');

  console.log(`Mode: ${APPLY ? 'APPLY (will modify data)' : 'DRY RUN (read-only, changes nothing)'}`);
  console.log(`Looking for ActivityLog entries with durationMinutes > ${THRESHOLD_MINUTES}...\n`);

  const inflated = await ActivityLog.find({
    durationMinutes: { $gt: THRESHOLD_MINUTES },
  })
    .populate('userId', 'name email')
    .sort({ durationMinutes: -1 });

  if (inflated.length === 0) {
    console.log('No inflated entries found. Nothing to do.\n');
    await mongoose.disconnect();
    return;
  }

  console.log(`Found ${inflated.length} inflated entr${inflated.length === 1 ? 'y' : 'ies'}:\n`);

  let totalExcessMinutes = 0;
  const byUser: Record<string, { name: string; count: number; excessMinutes: number }> = {};

  for (const entry of inflated) {
    const user = entry.userId as any;
    const userLabel = user?.email || String(entry.userId);
    const excess = entry.durationMinutes - CAP_MINUTES;
    totalExcessMinutes += Math.max(excess, 0);

    if (!byUser[userLabel]) {
      byUser[userLabel] = { name: user?.name || 'Unknown', count: 0, excessMinutes: 0 };
    }
    byUser[userLabel].count += 1;
    byUser[userLabel].excessMinutes += Math.max(excess, 0);

    console.log(
      `  - ${userLabel} | ${entry.appName} | ` +
      `${(entry.durationMinutes / 60).toFixed(1)}h logged | ` +
      `started ${entry.startTime.toISOString()}`
    );
  }

  console.log(`\n── Summary by user ──`);
  for (const [email, info] of Object.entries(byUser)) {
    console.log(
      `  ${info.name} (${email}): ${info.count} bad entr${info.count === 1 ? 'y' : 'ies'}, ` +
      `${(info.excessMinutes / 60).toFixed(1)}h of inflated time`
    );
  }
  console.log(`\nTotal inflated time across all entries: ${(totalExcessMinutes / 60).toFixed(1)} hours\n`);

  if (!APPLY) {
    console.log('This was a dry run — nothing was changed.');
    console.log('Re-run with --apply to cap these entries down to ' + CAP_MINUTES + ' minutes each.\n');
    await mongoose.disconnect();
    return;
  }

  console.log(`Applying fix: capping ${inflated.length} entries to ${CAP_MINUTES} minutes each...`);
  const result = await ActivityLog.updateMany(
    { durationMinutes: { $gt: THRESHOLD_MINUTES } },
    { $set: { durationMinutes: CAP_MINUTES } }
  );
  console.log(`Done. Modified ${result.modifiedCount} document(s).\n`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});