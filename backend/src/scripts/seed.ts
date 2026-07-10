import mongoose from 'mongoose';
import { config } from '../config';
import { User } from '../modules/employee/employee.model';
import { Tenant } from '../modules/tenant/tenant.model';
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

    // Cleanup orphaned records from previous partial seeds
    await Tenant.deleteMany({ email: { $in: [config.superAdmin.email, config.demo.tenantEmail] } });
    await User.deleteMany({ email: config.demo.adminEmail });
    // Also cleanup demo employees
    await User.deleteMany({ email: { $regex: `@${config.demo.employeeEmailDomain}$` } });

    const platformTenant = await Tenant.create({
      name: 'EMS Platform',
      email: config.superAdmin.email,
      plan: 'enterprise',
      status: 'active',
      isEmailVerified: true,
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
      isEmailVerified: true,
    });

    console.log('Seed completed!');
    console.log(`Super Admin: ${superAdmin.email}`);
    console.log(`Tenant: ${platformTenant.name}`);

    const demoTenant = await Tenant.create({
      name: config.demo.tenantName,
      email: config.demo.tenantEmail,
      phone: config.demo.tenantPhone,
      plan: 'starter',
      status: 'active',
      isEmailVerified: true,
    });

    const demoAdmin = await User.create({
      name: config.demo.adminName,
      email: config.demo.adminEmail,
      password: config.demo.adminPassword,
      role: 'company_admin',
      tenantId: demoTenant._id,
      agentKey: generateAgentKey(),
      isEmailVerified: true,
    });

    const departments = ['Engineering', 'Design', 'Marketing', 'Sales', 'HR'];
    const employees = [];

    for (let i = 1; i <= 5; i++) {
      employees.push(
        await User.create({
          name: `Employee ${i}`,
          email: `${config.demo.employeeEmailPrefix}${i}@${config.demo.employeeEmailDomain}`,
          password: config.demo.employeePassword,
          role: 'employee',
          tenantId: demoTenant._id,
          department: departments[i - 1],
          designation: `${departments[i - 1]} Associate`,
          employeeId: `EMP-${String(i).padStart(4, '0')}`,
          agentKey: generateAgentKey(),
          isEmailVerified: true,
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
