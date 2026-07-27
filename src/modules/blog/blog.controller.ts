// skillo-backend/src/modules/blog/blog.controller.ts

import {
  Request,
  Response,
  NextFunction,
} from 'express';

import blogService from './blog.service.js';
import { normalizeBlogMultipartBody } from './blog.multipart.js';

import {
  bulkDeleteBlogsSchema,
  createBlogSchema,
  getBlogsSchema,
  idParamSchema,
  slugParamSchema,
  updateBlogFileControlsSchema,
  updateBlogSchema,
  updateBlogStatusSchema,
} from './blog.validator.js';

type BlogUploadFields = {
  banner?: Express.Multer.File[];
  resources?: Express.Multer.File[];
};

class BlogController {
  async createBlog(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const normalized =
        normalizeBlogMultipartBody(
          req.body as Record<
            string,
            unknown
          >,
        );

      const validatedData =
        createBlogSchema.parse(
          normalized.data,
        );

      const files =
        req.files as
          | BlogUploadFields
          | undefined;

      const bannerFile =
        files?.banner?.[0];

      const resourceFiles =
        files?.resources ?? [];

      const blog =
        await blogService.createBlog(
          validatedData,
          bannerFile,
          resourceFiles,
        );

      res.status(201).json({
        success: true,
        message:
          'Blog created successfully',
        data: blog,
      });
    } catch (error) {
      next(error);
    }
  }

  async getBlogs(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const validatedQuery =
        getBlogsSchema.parse(
          req.query,
        );

      const result =
        await blogService.getBlogs(
          validatedQuery,
        );

      res.status(200).json({
        success: true,
        message:
          'Blogs fetched successfully',
        data: result.blogs,
        pagination:
          result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async getBlogById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } =
        idParamSchema.parse(
          req.params,
        );

      const blog =
        await blogService.getBlogById(
          id,
        );

      if (!blog) {
        res.status(404).json({
          success: false,
          message: 'Blog not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message:
          'Blog fetched successfully',
        data: blog,
      });
    } catch (error) {
      next(error);
    }
  }

  async getBlogBySlug(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      /*
       * Validate the exact route value.
       *
       * Uppercase or malformed slugs return 404.
       */
      const parsedParams =
        slugParamSchema.safeParse(
          req.params,
        );

      if (!parsedParams.success) {
        res.status(404).json({
          success: false,
          message: 'Blog not found',
        });
        return;
      }

      const { slug } =
        parsedParams.data;

      const blog =
        await blogService.getBlogBySlug(
          slug,
        );

      if (!blog) {
        res.status(404).json({
          success: false,
          message: 'Blog not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message:
          'Blog fetched successfully',
        data: blog,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateBlog(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } =
        idParamSchema.parse(
          req.params,
        );

      const normalized =
        normalizeBlogMultipartBody(
          req.body as Record<
            string,
            unknown
          >,
        );

      const validatedData =
        updateBlogSchema.parse(
          normalized.data,
        );

      const fileControls =
        updateBlogFileControlsSchema.parse(
          normalized.controls,
        );

      const files =
        req.files as
          | BlogUploadFields
          | undefined;

      const bannerFile =
        files?.banner?.[0];

      const resourceFiles =
        files?.resources ?? [];

      const blog =
        await blogService.updateBlog(
          id,
          validatedData,
          {
            bannerFile,
            resourceFiles,
            retainedFileStorageKeys:
              fileControls.retainedFileStorageKeys,
            removeBanner:
              fileControls.removeBanner,
          },
        );

      if (!blog) {
        res.status(404).json({
          success: false,
          message: 'Blog not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message:
          'Blog updated successfully',
        data: blog,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteBlog(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } =
        idParamSchema.parse(
          req.params,
        );

      const blog =
        await blogService.deleteBlog(
          id,
        );

      if (!blog) {
        res.status(404).json({
          success: false,
          message: 'Blog not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message:
          'Blog deleted successfully',
        data: blog,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteMultipleBlogs(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { ids } =
        bulkDeleteBlogsSchema.parse(
          req.body,
        );

      const result =
        await blogService.deleteMultipleBlogs(
          ids,
        );

      res.status(200).json({
        success: true,
        message:
          'Blogs deleted successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateBlogStatus(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } =
        idParamSchema.parse(
          req.params,
        );

      const { status } =
        updateBlogStatusSchema.parse(
          req.body,
        );

      const blog =
        await blogService.updateBlogStatus(
          id,
          status,
        );

      if (!blog) {
        res.status(404).json({
          success: false,
          message: 'Blog not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message:
          'Blog status updated successfully',
        data: blog,
      });
    } catch (error) {
      next(error);
    }
  }

  async getBlogStats(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const stats =
        await blogService.getBlogStats();

      res.status(200).json({
        success: true,
        message:
          'Blog statistics fetched successfully',
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new BlogController();