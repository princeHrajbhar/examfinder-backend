// modules/user/user.service.ts
import { User } from '../auth/auth.model.js';
import { CreateUserInput, UpdateUserInput, UserQueryInput } from './user.validation.js';
import bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;

export class UserService {
  // Create a new user
  async createUser(data: CreateUserInput) {
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash the password if it exists
    let userData = { ...data };
    if (data.password) {
      const hashedPassword = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
      userData = { ...data, password: hashedPassword };
    }

    const user = new User(userData);
    await user.save();

    // Remove password from response
    const userObject = user.toObject();
    delete userObject.password;
    return userObject;
  }

  // Get all users with pagination and filtering
  async getUsers(query: UserQueryInput) {
    const { page = 1, limit = 10, role, isVerified, search } = query;

    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (role) {
      filter.role = role;
    }

    if (isVerified !== undefined) {
      filter.isVerified = isVerified;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),

      User.countDocuments(filter),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Get a single user by ID
  async getUserById(id: string) {
    const user = await User.findById(id).select('-password').lean();
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  // Get user by email
  async getUserByEmail(email: string) {
    const user = await User.findOne({ email }).select('-password').lean();
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  // Update a user
  async updateUser(id: string, data: UpdateUserInput) {
    // Check if email is being updated and if it's already taken
    if (data.email) {
      const existingUser = await User.findOne({
        email: data.email,
        _id: { $ne: id },
      });
      if (existingUser) {
        throw new Error('Email already in use');
      }
    }

    // Hash password if it's being updated
    let updateData = { ...data };
    if (data.password) {
      const hashedPassword = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
      updateData = { ...data, password: hashedPassword };
    }

    // Remove undefined values
    const cleanData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined),
    );

    const user = await User.findByIdAndUpdate(id, cleanData, { new: true, runValidators: true })
      .select('-password')
      .lean();

    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  // Delete a user
  async deleteUser(id: string) {
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      throw new Error('User not found');
    }
    return { message: 'User deleted successfully', id };
  }

  // Update login attempts (for authentication)
  async updateLoginAttempts(email: string, success: boolean) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('User not found');
    }

    if (success) {
      // Reset on successful login
      user.failedLoginAttempts = 0;
      user.lockedUntil = undefined;
    } else {
      // Increment on failed login
      user.failedLoginAttempts += 1;
      // Lock account after 5 failed attempts
      if (user.failedLoginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 minutes
      }
    }

    await user.save();
    return user;
  }

  // Check if user is locked
  async isUserLocked(email: string): Promise<boolean> {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('User not found');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return true;
    }

    // Reset lock if expired
    if (user.lockedUntil && user.lockedUntil <= new Date()) {
      user.lockedUntil = undefined;
      user.failedLoginAttempts = 0;
      await user.save();
    }

    return false;
  }

  // Toggle user verification status
  async toggleVerification(id: string) {
    const user = await User.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    user.isVerified = !user.isVerified;
    await user.save();

    const userObject = user.toObject();
    delete userObject.password;
    return userObject;
  }
}