import { Router } from 'express';
import { loginSchema } from '@fixtrail/shared';
import { env } from '../../config/env.js';
import { AppError } from '../../middleware/error.js';
import { requireAuth, setSessionCookie, signSession, SESSION_COOKIE } from '../../middleware/auth.js';
import { asyncHandler } from '../../lib/async.js';
import { User } from '../../models/user.js';

export const authRouter = Router();

// Test build: log in with name, email and role. No password yet.
// The DEMO_LOGIN flag turns this off; production refuses to start with it on.
authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    if (!env.DEMO_LOGIN) {
      throw new AppError(403, 'LOGIN_DISABLED', 'Email login is turned off');
    }

    const input = loginSchema.parse(req.body);

    let user = await User.findOne({ email: input.email });

    if (user && user.role !== input.role) {
      const registeredAs = user.role === 'staff' ? 'service worker' : user.role;
      throw new AppError(
        409,
        'ROLE_MISMATCH',
        `This email is registered as a ${registeredAs}. Choose that role to log in.`,
      );
    }

    if (!user) {
      user = await User.create({ name: input.name, email: input.email, role: input.role });
    } else if (user.name !== input.name) {
      user.name = input.name;
      await user.save();
    }

    setSessionCookie(res, signSession(user._id));
    res.json({ user: toPublicUser(user) });
  }),
);

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(SESSION_COOKIE);
  res.status(204).end();
});

authRouter.get(
  '/me',
  requireAuth,
  (req, res) => {
    res.json({
      user: {
        id: req.user!.id.toString(),
        name: req.user!.name,
        email: req.user!.email,
        role: req.user!.role,
      },
    });
  },
);

function toPublicUser(user: { _id: { toString(): string }; name: string; email: string; role: string }) {
  return { id: user._id.toString(), name: user.name, email: user.email, role: user.role };
}
