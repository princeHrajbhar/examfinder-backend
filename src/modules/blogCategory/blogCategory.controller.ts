import { Request, Response } from 'express';
import { blogCategoryService } from './blogCategory.service.js';

export class BlogCategoryController {
  create = async (req: Request, res: Response) => {
    try {
      const category = await blogCategoryService.create(req.body);

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
    const categories = await blogCategoryService.getAll();

    return res.json({
      success: true,
      data: categories,
    });
  };

  getById = async (req: Request, res: Response) => {
    const category = await blogCategoryService.getById(String(req.params.id));

    return res.json({
      success: true,
      data: category,
    });
  };

  getBySlug = async (req: Request, res: Response) => {
    const category = await blogCategoryService.getBySlug(String(req.params.slug));

    return res.json({
      success: true,
      data: category,
    });
  };

  update = async (req: Request, res: Response) => {
    try {
      const category = await blogCategoryService.update(String(req.params.id), req.body);

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
      await blogCategoryService.delete(String(req.params.id));

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

export const blogCategoryController = new BlogCategoryController();
