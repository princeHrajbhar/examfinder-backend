import { Router } from 'express';
import { courseCategoryController } from './courseCategory.controller.js';
import { protect, authorize } from '../../middlewares/auth.middleware.js';

const router = Router();

// ───────────── Public Routes ─────────────

// Get all course categories
router.get('/', courseCategoryController.getAll);

// Get category by slug
router.get('/slug/:slug', courseCategoryController.getBySlug);

// Get category by ID
router.get('/:id', courseCategoryController.getById);

// ───────────── Admin Routes ─────────────

// Create category
router.post('/', protect, authorize('admin'), courseCategoryController.create);

// Update category
router.put('/:id', protect, authorize('admin'), courseCategoryController.update);

// Delete category
router.delete('/:id', protect, authorize('admin'), courseCategoryController.delete);

export default router;
