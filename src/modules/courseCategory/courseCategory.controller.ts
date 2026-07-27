import { Request, Response } from 'express';
import { courseCategoryService } from './courseCategory.service.js';

export class CourseCategoryController {
  create = async (req: Request, res: Response) => {
    try {
      const category = await courseCategoryService.create(req.body);

      return res.status(201).json({
        success: true,
        data: category,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  };

  getAll = async (_req: Request, res: Response) => {
    const categories = await courseCategoryService.getAll();

    return res.json({
      success: true,
      data: categories,
    });
  };

  getById = async (req: Request, res: Response) => {
    const category = await courseCategoryService.getById(String(req.params.id));

    return res.json({
      success: true,
      data: category,
    });
  };

  getBySlug = async (req: Request, res: Response) => {
    const category = await courseCategoryService.getBySlug(String(req.params.slug));

    return res.json({
      success: true,
      data: category,
    });
  };

  update = async (req: Request, res: Response) => {
    try {
      const category = await courseCategoryService.update(String(req.params.id), req.body);

      return res.json({
        success: true,
        data: category,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      await courseCategoryService.delete(String(req.params.id));

      return res.json({
        success: true,
        message: 'Category deleted successfully',
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  };
}

export const courseCategoryController = new CourseCategoryController();
