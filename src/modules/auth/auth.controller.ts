// modules/auth/auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service.js';
import type { AuthRequest } from '../../middlewares/auth.middleware.js';
import { UserService } from '../user/user.service.js';

// ─── Cookie options ───────────────────────────────────────────────────────────
// In production the frontend (Vercel) and backend (Render) live on different
// domains, so cookies must be SameSite=None + Secure to be sent cross-site.
const isProduction = process.env.NODE_ENV === 'production';
const crossSite = {
  httpOnly: true,
  secure: isProduction,
  sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
  path: '/',
};

const accessCookieOptions = {
  ...crossSite,
  maxAge: 15 * 60 * 1000, // 15 min
};

const refreshCookieOptions = {
  ...crossSite,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

const clearCookieOptions = { ...crossSite };

const userService = new UserService();

// ─── Register ─────────────────────────────────────────────────────────────────
export const registerController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    const user = await authService.registerUser({ name, email, password });

    res.status(201).json({
      success: true,
      message: 'Registered successfully',
      data: {
        userId: user._id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Login ────────────────────────────────────────────────────────────────────
export const loginController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
      return;
    }

    const { accessToken, refreshToken } = await authService.loginUser(email, password, {
      userAgent: req.headers['user-agent'],
      ip: req.ip ?? req.socket?.remoteAddress,
    });

    res.cookie('accessToken', accessToken, accessCookieOptions);
    res.cookie('refreshToken', refreshToken, refreshCookieOptions);

    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      data: {
        accessToken, // Return token in body for client storage
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Refresh ──────────────────────────────────────────────────────────────────
export const refreshController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = req.cookies?.refreshToken as string | undefined;

    if (!token) {
      res.status(401).json({
        success: false,
        code: 'TOKEN_INVALID',
        message: 'No refresh token provided',
      });
      return;
    }

    const { newAccessToken, newRefreshToken } = await authService.refreshTokenService(token);

    res.cookie('accessToken', newAccessToken, accessCookieOptions);
    res.cookie('refreshToken', newRefreshToken, refreshCookieOptions);

    res.status(200).json({
      success: true,
      message: 'Tokens refreshed',
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Logout ───────────────────────────────────────────────────────────────────
export const logoutController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = req.cookies?.refreshToken as string | undefined;
    if (token) {
      await authService.logoutService(token);
    }
    res.clearCookie('accessToken', clearCookieOptions);
    res.clearCookie('refreshToken', clearCookieOptions);
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

// ─── Logout all devices ───────────────────────────────────────────────────────
export const logoutAllController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await authService.logoutAllService(req.user!.userId);
    res.clearCookie('accessToken', clearCookieOptions);
    res.clearCookie('refreshToken', clearCookieOptions);
    res.status(200).json({
      success: true,
      message: 'Logged out from all devices',
    });
  } catch (error) {
    next(error);
  }
};

// ─── Change Password (authenticated) ─────────────────────────────────────────
export const changePasswordController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await authService.changePassword({
      userId: req.user!.userId,
      sessionId: req.user!.sessionId!,
      currentPassword: req.body.currentPassword,
      newPassword: req.body.newPassword,
    });
    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Get active sessions ──────────────────────────────────────────────────────
export const getSessionsController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const sessions = await authService.getActiveSessions(req.user!.userId);
    res.status(200).json({
      success: true,
      data: { sessions },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Get current user (me) ────────────────────────────────────────────────────
export const meController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await userService.getUserById(req.user!.userId);
    res.status(200).json({
      success: true,
      data: {
        userId: user._id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};
