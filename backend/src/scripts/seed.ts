import mongoose from 'mongoose';
import { config } from '../config';
import { User } from '../models/User';
import { Tenant } from '../models/Tenant';
import { generateAgentKey } from '../utils/helpers';

const seed = async () => {
  try {
    await mongoose.connect(config.mongodbUri);
    console.log('Connected to MongoDB for seeding...');

    const existingAdmin = await User.findOne({ role: 'super_admin' });
    if (existingAdmin) {
      console.log('Super admin already exists. Skipping seed.');
      process.exit(0);
    }

    const platformTenant = await Tenant.create({
      name: 'EMS Platform',
      email: config.superAdmin.email,
      plan: 'enterprise',
      status: 'active',
      settings: {
        screenshotInterval: 5,
        trackApps: true,
        trackUrls: true,
        blurScreenshots: false,
        maxEmployees: 9999,
        workStartTime: '09:00',
        workEndTime: '18:00',
        timezone: 'Asia/Kolkata',
        allowManualPunch: true,
        autoStopTracking: false,
        idleTimeThreshold: 5,
      },
    });

    const superAdmin = await User.create({
      name: 'Super Admin',
      email: config.superAdmin.email,
      password: config.superAdmin.password,
      role: 'super_admin',
      tenantId: platformTenant._id,
      agentKey: generateAgentKey(),
      status: 'active',
    });

    console.log('Seed completed!');
    console.log(`Super Admin: ${superAdmin.email}`);
    console.log(`Tenant: ${platformTenant.name}`);

    const demoTenant = await Tenant.create({
      name: 'Demo Company Pvt Ltd',
      email: 'demo@democompany.com',
      phone: '+91 9876543210',
      plan: 'starter',
      status: 'active',
    });

    const demoAdmin = await User.create({
      name: 'Demo Admin',
      email: 'admin@democompany.com',
      password: 'Demo@123456',
      role: 'company_admin',
      tenantId: demoTenant._id,
      agentKey: generateAgentKey(),
    });

    const departments = ['Engineering', 'Design', 'Marketing', 'Sales', 'HR'];
    const employees = [];

    for (let i = 1; i <= 5; i++) {
      employees.push(
        await User.create({
          name: `Employee ${i}`,
          email: `emp${i}@democompany.com`,
          password: 'Emp@123456',
          role: 'employee',
          tenantId: demoTenant._id,
          department: departments[i - 1],
          designation: `${departments[i - 1]} Associate`,
          employeeId: `EMP-${String(i).padStart(4, '0')}`,
          agentKey: generateAgentKey(),
        })
      );
    }

    console.log(`Demo Company: ${demoTenant.name}`);
    console.log(`Demo Admin: ${demoAdmin.email}`);
    console.log(`Demo Employees: ${employees.length} created`);

    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
};

seed();
