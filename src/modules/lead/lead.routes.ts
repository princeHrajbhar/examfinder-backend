// modules/lead/lead.routes.ts
import { Router } from 'express';
import * as leadController from './lead.controller.js';
import { protect, authorize} from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { createLeadSchema, updateLeadSchema } from './lead.validation.js';

const router = Router();

// ─── Public routes ────────────────────────────────────────────────────────────
// Anyone can submit a lead (website forms)
router.post(
  '/',
  validate(createLeadSchema),
  leadController.createLeadController,
);

// ─── Admin only routes ────────────────────────────────────────────────────────
// protect    = must be logged in
// requireRole('admin') = must be an admin

router.get(
  '/',
  protect,
  authorize('admin'),
  leadController.getLeadsController,
);

router.get(
  '/stats',
  protect,
  authorize('admin'),
  leadController.getLeadStatsController,
);

router.get(
  '/:id',
  protect,
  authorize('admin'),
  leadController.getLeadByIdController,
);

router.patch(
  '/:id',
  protect,
  authorize('admin'),
  validate(updateLeadSchema),
  leadController.updateLeadController,
);

router.delete(
  '/:id',
  protect,
  authorize('admin'),
  leadController.deleteLeadController,
);

export default router;
