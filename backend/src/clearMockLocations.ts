import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { User } from './models/User';
import { LocationLog } from './models/LocationLog';

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://TechCreatureSolution:Tech1234@techcreaturesolution.rwufh.mongodb.net/employee-monitoring';

async function clear() {
  console.log('Connecting to database...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected!');

  // Clear online status and location for all users
  const res = await User.updateMany(
    { role: 'employee' },
    {
      $set: {
        isOnline: false,
        lastKnownLocation: {
          latitude: 0,
          longitude: 0,
          address: '',
          updatedAt: null
        }
      }
    }
  );
  console.log(`Updated ${res.modifiedCount} employees: set offline and cleared location.`);

  // Delete all location logs
  const logRes = await LocationLog.deleteMany({});
  console.log(`Deleted ${logRes.deletedCount} location logs.`);

  console.log('Clearing completed successfully!');
  await mongoose.disconnect();
}

clear().catch(err => {
  console.error('Clearing failed:', err);
  mongoose.disconnect();
});
