// modules/lead/lead.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as leadService from './lead.service.js';
import type { AuthRequest } from '../../middlewares/auth.middleware.js';
import { queryLeadSchema } from './lead.validation.js';

// ─── Create Lead (public — called from website forms) ─────────────────────────
export const createLeadController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const lead = await leadService.createLead(req.body);

    res.status(201).json({
      success: true,
      message: 'Lead created successfully',
      data: { leadId: lead._id },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Get All Leads (admin only) ───────────────────────────────────────────────
export const getLeadsController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Parse and validate query params
    const query = queryLeadSchema.parse(req.query);
    const result = await leadService.getLeads(query);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Get Single Lead (admin only) ─────────────────────────────────────────────
export const getLeadByIdController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const lead = await leadService.getLeadById(req.params.id as string);

    res.status(200).json({
      success: true,
      data: lead,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Update Lead (admin only) ─────────────────────────────────────────────────
export const updateLeadController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const lead = await leadService.updateLead(
      req.params.id as string,
      req.body,
      req.user!.userId,   // who is making the update
    );

    res.status(200).json({
      success: true,
      message: 'Lead updated successfully',
      data: lead,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Delete Lead (admin only) ─────────────────────────────────────────────────
export const deleteLeadController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await leadService.deleteLead(req.params.id as string);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Get Lead Stats (admin only) ──────────────────────────────────────────────
export const getLeadStatsController = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const stats = await leadService.getLeadStats();

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};