import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { db } from '../db/index.js';

export interface TokenPayload {
  userId: string;
  email: string;
}

export const authService = {
  async register(email: string, password: string, name: string) {
    const existing = await db.getUserByEmail(email);
    if (existing) {
      throw new Error('An account with this email address already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newUser = await db.createUser({
      id: userId,
      email: email.toLowerCase().trim(),
      name: name.trim(),
      password_hash: passwordHash,
    });

    const token = this.generateToken({ userId: newUser.id, email: newUser.email });
    const interests = await db.getUserInterests(newUser.id);

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        avatarUrl: newUser.avatar_url,
        interests,
      },
      token,
    };
  },

  async login(email: string, password: string) {
    const cleanEmail = email.toLowerCase().trim();

    // Local Development Demo Account Support
    if (cleanEmail === 'demo@pulseai.local') {
      let demoUser = await db.getUserByEmail(cleanEmail);
      if (!demoUser) {
        // Auto-seed demo user for development
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash('DemoPulseAI123!', salt);
        demoUser = await db.createUser({
          id: 'usr_demo_pulseai_local',
          email: cleanEmail,
          name: 'Demo Reader (India)',
          password_hash: passwordHash,
        });
        await db.setUserInterests(demoUser.id, ['India', 'Technology', 'AI & ML', 'Business', 'Science']);
      }

      if (password !== 'DemoPulseAI123!') {
        const isMatch = await bcrypt.compare(password, demoUser.password_hash);
        if (!isMatch) {
          throw new Error('Invalid email or password');
        }
      }

      const token = this.generateToken({ userId: demoUser.id, email: demoUser.email });
      const interests = await db.getUserInterests(demoUser.id);

      return {
        user: {
          id: demoUser.id,
          email: demoUser.email,
          name: demoUser.name,
          avatarUrl: demoUser.avatar_url,
          interests: interests.length > 0 ? interests : ['India', 'Technology', 'AI & ML', 'Business', 'Science'],
        },
        token,
      };
    }

    const user = await db.getUserByEmail(cleanEmail);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new Error('Invalid email or password');
    }

    const token = this.generateToken({ userId: user.id, email: user.email });
    const interests = await db.getUserInterests(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatar_url,
        interests,
      },
      token,
    };
  },

  generateToken(payload: TokenPayload): string {
    return jwt.sign(payload, config.jwtSecret as jwt.Secret, { expiresIn: '7d' });
  },

  verifyToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, config.jwtSecret) as TokenPayload;
    } catch (err) {
      throw new Error('Invalid or expired authentication token');
    }
  },

  async getCurrentUser(userId: string) {
    const user = await db.getUserById(userId);
    if (!user) {
      throw new Error('User account not found');
    }

    const interests = await db.getUserInterests(userId);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatar_url,
      interests,
    };
  },
};
