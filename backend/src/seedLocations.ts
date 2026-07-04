import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { User } from './models/User';
import { LocationLog } from './models/LocationLog';

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://TechCreatureSolution:Tech1234@techcreaturesolution.rwufh.mongodb.net/employee-monitoring';

async function seed() {
  console.log('Connecting to database...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected!');

  const employees = await User.find({ role: 'employee' });
  if (employees.length === 0) {
    console.log('No employees found to seed.');
    await mongoose.disconnect();
    return;
  }

  console.log(`Found ${employees.length} employees. Seeding mock locations...`);

  // Delhi coordinates as base
  const baseLat = 28.6139;
  const baseLng = 77.2090;

  for (const emp of employees) {
    // Generate a random offset for this employee
    const offsetLat = (Math.random() - 0.5) * 0.04;
    const offsetLng = (Math.random() - 0.5) * 0.04;
    const empLat = baseLat + offsetLat;
    const empLng = baseLng + offsetLng;

    // Update User online & location status
    await User.findByIdAndUpdate(emp._id, {
      isOnline: true,
      lastActive: new Date(),
      lastKnownLocation: {
        latitude: empLat,
        longitude: empLng,
        address: `Sector 62, Noida, Uttar Pradesh, India (Near Office ${emp.name})`,
        updatedAt: new Date(),
      },
    });

    console.log(`Updated user ${emp.name} location: ${empLat.toFixed(4)}, ${empLng.toFixed(4)}`);

    // Clean old location logs for today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    await LocationLog.deleteMany({
      userId: emp._id,
      timestamp: { $gte: startOfDay, $lte: endOfDay }
    });

    // Create 5 trail logs throughout the day
    const trailLogs = [];
    for (let i = 0; i < 5; i++) {
      const logTime = new Date();
      logTime.setHours(9 + i, 15 + Math.floor(Math.random() * 15), 0, 0);

      // Path crawling slightly
      const stepLat = empLat - (4 - i) * 0.002;
      const stepLng = empLng - (4 - i) * 0.002;

      trailLogs.push({
        userId: emp._id,
        tenantId: emp.tenantId,
        latitude: stepLat,
        longitude: stepLng,
        accuracy: 15,
        address: `Path node ${i + 1} for ${emp.name}`,
        source: 'mobile',
        workMode: emp.workMode || 'office',
        isInsideGeofence: i === 0 || i === 4,
        batteryLevel: 85 - i * 5,
        networkType: 'WiFi',
        timestamp: logTime,
      });
    }

    await LocationLog.insertMany(trailLogs);
    console.log(`Generated location trail for ${emp.name}`);
  }

  console.log('Seeding completed successfully!');
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  mongoose.disconnect();
});
