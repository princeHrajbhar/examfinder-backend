import { Router } from 'express';
import { blogCategoryController } from './blogCategory.controller.js';
import { protect, authorize } from '../../middlewares/auth.middleware.js';

const router = Router();

// ───────────── Public Routes ─────────────

// Get all blog categories
router.get('/', blogCategoryController.getAll);

// Get category by slug
router.get('/slug/:slug', blogCategoryController.getBySlug);

// Get category by ID
router.get('/:id', blogCategoryController.getById);

// ───────────── Admin Routes ─────────────

// Create category
router.post('/', protect, authorize('admin'), blogCategoryController.create);

// Update category
router.put('/:id', protect, authorize('admin'), blogCategoryController.update);

// Delete category
router.delete('/:id', protect, authorize('admin'), blogCategoryController.delete);

export default router;
