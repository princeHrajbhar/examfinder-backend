// modules/user/user.routes.ts
import { Router } from 'express';
import { UserController } from './user.controller.js';
import { protect, authorize } from '../../middlewares/auth.middleware.js';

const router = Router();
const userController = new UserController();

// ==================== ADMIN ROUTES ====================

// Create User
router.post('/', protect, authorize('admin'), userController.createUser.bind(userController));

// Get All Users
router.get('/', protect, authorize('admin'), userController.getUsers.bind(userController));

// Check User Lock Status
router.get(
  '/lock-status/:email',
  protect,
  authorize('admin'),
  userController.checkLockStatus.bind(userController),
);

// Verify / Unverify User
router.patch(
  '/:id/verify',
  protect,
  authorize('admin'),
  userController.toggleVerification.bind(userController),
);

// Get User By ID
router.get('/:id', protect, authorize('admin'), userController.getUserById.bind(userController));

// Update User
router.put('/:id', protect, authorize('admin'), userController.updateUser.bind(userController));

// Delete User
router.delete('/:id', protect, authorize('admin'), userController.deleteUser.bind(userController));

export default router;