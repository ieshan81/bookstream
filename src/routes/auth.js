import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import prisma from '../config/database.js';
import { validateRegister, validateLogin, handleValidationErrors } from '../utils/validators.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Configure Google OAuth
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/callback/google',
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          let user = await prisma.user.findFirst({
            where: {
              OR: [
                { email: profile.emails[0].value },
                { oauthId: profile.id, oauthProvider: 'google' },
              ],
            },
          });

          if (!user) {
            user = await prisma.user.create({
              data: {
                email: profile.emails[0].value,
                name: profile.displayName,
                avatar: profile.photos[0]?.value,
                oauthProvider: 'google',
                oauthId: profile.id,
              },
            });
          } else if (!user.oauthProvider) {
            // Link OAuth to existing account
            user = await prisma.user.update({
              where: { id: user.id },
              data: {
                oauthProvider: 'google',
                oauthId: profile.id,
                avatar: profile.photos[0]?.value || user.avatar,
              },
            });
          }

          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
}

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// Register
router.post('/register', validateRegister, handleValidationErrors, async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: name || email.split('@')[0],
      },
    });

    const token = generateToken(user.id);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Login
router.post('/login', validateLogin, handleValidationErrors, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.passwordHash) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/callback/google',
  passport.authenticate('google', { session: false }),
  (req, res) => {
    const token = generateToken(req.user.id);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  }
);

// Get current user
router.get('/me', authenticate, async (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      avatar: req.user.avatar,
    },
  });
});

// Logout (client-side token removal, but we can add token blacklisting here if needed)
router.post('/logout', authenticate, (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

export default router;

