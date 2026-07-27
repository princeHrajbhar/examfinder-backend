// modules/lead/lead.service.ts
import { Lead } from './lead.model.js';
import type { CreateLeadInput, UpdateLeadInput, QueryLeadInput } from './lead.validation.js';
import { AppError, ErrorCode } from '../../errors/AppError.js';
import mongoose from 'mongoose';

// ─── Create a new lead ────────────────────────────────────────────────────────
// Called when someone submits a form on the website
export const createLead = async (
  data: CreateLeadInput,
  createdBy?: string,   // optional — admin userId if created manually
) => {
  const lead = await Lead.create({
    ...data,
    status: 'new',
    createdBy: createdBy ? new mongoose.Types.ObjectId(createdBy) : undefined,
  });
  return lead;
};

// ─── Get all leads with filters + pagination ──────────────────────────────────
// Called by admin dashboard to list leads
export const getLeads = async (query: QueryLeadInput) => {
  const { status, source, course, search, page, limit, sortBy, sortDir } = query;

  // Build the filter object dynamically
  const filter: Record<string, any> = {};

  if (status)  filter.status  = status;
  if (source)  filter.source  = source;
  if (course)  filter.course  = course;

  // Search across name, email, phone
  if (search) {
    filter.$or = [
      { name:  { $regex: search, $options: 'i' } },  // 'i' = case insensitive
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }

  const sortOrder = sortDir === 'asc' ? 1 : -1;
  const skip = (page - 1) * limit;

  // Run both queries in parallel for performance
  const [leads, total] = await Promise.all([
    Lead.find(filter)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email')   // show who created the lead
      .populate('updatedBy', 'name email')
      .lean(),                                // .lean() returns plain JS object (faster)
    Lead.countDocuments(filter),
  ]);

  return {
    leads,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// ─── Get a single lead by ID ──────────────────────────────────────────────────
export const getLeadById = async (id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid lead ID', 400, ErrorCode.BAD_REQUEST);
  }

  const lead = await Lead.findById(id)
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email');

  if (!lead) {
    throw new AppError('Lead not found', 404, ErrorCode.USER_NOT_FOUND);
  }

  return lead;
};

// ─── Update a lead ────────────────────────────────────────────────────────────
// Admin updates status, adds notes, edits fields
export const updateLead = async (
  id: string,
  data: UpdateLeadInput,
  updatedBy: string,
) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid lead ID', 400, ErrorCode.BAD_REQUEST);
  }

  const lead = await Lead.findByIdAndUpdate(
    id,
    {
      ...data,
      updatedBy: new mongoose.Types.ObjectId(updatedBy),
    },
    {
      new: true,           // return the updated document
      runValidators: true, // run schema validators on update
    },
  );

  if (!lead) {
    throw new AppError('Lead not found', 404, ErrorCode.USER_NOT_FOUND);
  }

  return lead;
};

// ─── Delete a lead ────────────────────────────────────────────────────────────
export const deleteLead = async (id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid lead ID', 400, ErrorCode.BAD_REQUEST);
  }

  const lead = await Lead.findByIdAndDelete(id);

  if (!lead) {
    throw new AppError('Lead not found', 404, ErrorCode.USER_NOT_FOUND);
  }

  return { message: 'Lead deleted successfully' };
};

// ─── Get lead stats (for dashboard) ──────────────────────────────────────────
export const getLeadStats = async () => {
  const stats = await Lead.aggregate([
    {
      $group: {
        _id: '$status',       // group by status field
        count: { $sum: 1 },   // count each group
      },
    },
  ]);

  // Convert array to object: [{ _id: 'new', count: 5 }] → { new: 5 }
  const result: Record<string, number> = {
    new: 0, contacted: 0, enrolled: 0, lost: 0,
  };

  stats.forEach((s) => {
    result[s._id] = s.count;
  });

  result.total = Object.values(result).reduce((a, b) => a + b, 0);

  return result;
};
