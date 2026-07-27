// scripts/seedAdmin.ts
// Creates (or updates) the dashboard admin user from environment variables.
//
//   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=StrongPass123! npm run seed
//
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { connectDB } from '../config/db.js';
import { User } from '../modules/auth/auth.model.js';

const BCRYPT_ROUNDS = 12;

const seedAdmin = async (): Promise<void> => {
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('❌ ADMIN_EMAIL and ADMIN_PASSWORD must be set in the environment.');
    process.exit(1);
  }

  await connectDB();

  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await User.findOneAndUpdate(
    { email },
    {
      $set: {
        email,
        password: hashedPassword,
        role: 'admin',
        isVerified: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  console.log(`✅ Admin user ready: ${user.email} (role: ${user.role})`);
  await mongoose.disconnect();
  process.exit(0);
};

seedAdmin().catch(async (err) => {
  console.error('❌ Failed to seed admin:', err);
  await mongoose.disconnect();
  process.exit(1);
});
