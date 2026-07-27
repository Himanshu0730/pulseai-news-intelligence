import bcrypt from 'bcryptjs';
import { db } from '../server/db/index.js';

async function seedTestUser() {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ ERROR: Seeding test user is strictly forbidden in production environments!');
    process.exit(1);
  }

  const email = 'admin@pulseai.local';
  const rawPassword = 'PulseAI-Test-2026!';
  const name = 'PulseAI Test Admin';
  const interests = ['AI & ML', 'Technology', 'Business', 'Science'];

  console.log(`🌱 Seeding development test user (${email})...`);

  try {
    const existing = await db.getUserByEmail(email);
    let userId: string;

    if (existing) {
      console.log(`ℹ️ User ${email} already exists (ID: ${existing.id}). Updating credentials & interests...`);
      userId = existing.id;
      const hashedPassword = await bcrypt.hash(rawPassword, 10);
      existing.password_hash = hashedPassword;
      existing.name = name;
      await db.createUser({
        id: existing.id,
        email: existing.email,
        name: existing.name,
        password_hash: hashedPassword,
        avatar_url: existing.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=PulseAITestAdmin`,
      });
    } else {
      userId = `usr_test_${Date.now()}`;
      const hashedPassword = await bcrypt.hash(rawPassword, 10);
      await db.createUser({
        id: userId,
        email,
        name,
        password_hash: hashedPassword,
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=PulseAITestAdmin`,
      });
      console.log(`✅ Created test user ${email} (ID: ${userId})`);
    }

    await db.setUserInterests(userId, interests);
    console.log(`✅ Set interests for test user: ${interests.join(', ')}`);
    console.log(`🎉 Test user seed completed successfully!`);
    console.log(`-------------------------------------------`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${rawPassword}`);
    console.log(`-------------------------------------------`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding test user:', err);
    process.exit(1);
  }
}

seedTestUser();
