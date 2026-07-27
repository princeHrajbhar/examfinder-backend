// modules/user/user.controller.ts
import { Request, Response, NextFunction } from 'express';
import { UserService } from './user.service.js';
import {
  createUserSchema,
  updateUserSchema,
  userQuerySchema,
  idParamSchema,
  emailParamSchema,
} from './user.validation.js';

const userService = new UserService();

export class UserController {
  // Create a new user
  async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = createUserSchema.parse(req.body);
      const user = await userService.createUser(validatedData);

      res.status(201).json({
        success: true,
        data: user,
        message: 'User created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // Get all users
  async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedQuery = userQuerySchema.parse(req.query);

      const result = await userService.getUsers(validatedQuery);

      res.status(200).json({
        success: true,
        data: result.users,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get a single user
  async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = idParamSchema.parse(req.params);
      const user = await userService.getUserById(id);

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  // Update a user
  async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = idParamSchema.parse(req.params);
      const validatedData = updateUserSchema.parse(req.body);
      const user = await userService.updateUser(id, validatedData);

      res.status(200).json({
        success: true,
        data: user,
        message: 'User updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete a user
  async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = idParamSchema.parse(req.params);
      const result = await userService.deleteUser(id);

      res.status(200).json({
        success: true,
        message: result.message,
        data: { id: result.id },
      });
    } catch (error) {
      next(error);
    }
  }

  // Toggle user verification
  async toggleVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = idParamSchema.parse(req.params);
      const user = await userService.toggleVerification(id);

      res.status(200).json({
        success: true,
        data: user,
        message: `User verification status toggled to ${user.isVerified}`,
      });
    } catch (error) {
      next(error);
    }
  }

  // Check if user is locked
  async checkLockStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = emailParamSchema.parse(req.params);
      const isLocked = await userService.isUserLocked(email);

      res.status(200).json({
        success: true,
        data: { email, isLocked },
      });
    } catch (error) {
      next(error);
    }
  }
}