// skillo-backend/src/modules/blog/blog.service.ts

import { Types } from 'mongoose';

import { Blog } from './blog.model.js';

import type {
  BlogStatus,
  IBlog,
} from './blog.model.js';

import type {
  CreateBlogInput,
  GetBlogsInput,
  UpdateBlogInput,
} from './blog.validator.js';

import {
  deleteFile,
  uploadFile,
  uploadMultipleFiles,
} from '../../utils/fileUpload.js';

import type { IUploadedFile } from '../../types/uploaded-file.type.js';

interface UpdateBlogFiles {
  bannerFile?: Express.Multer.File;
  resourceFiles?: Express.Multer.File[];
  retainedFileStorageKeys?: string[];
  removeBanner?: boolean;
}

const BLOG_SLUG_PATTERN =
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const copyUploadedFile = (
  file: IUploadedFile,
): IUploadedFile => ({
  url: file.url,
  storageKey: file.storageKey,
  mimeType: file.mimeType,
  originalName: file.originalName,
  size: file.size,
  extension: file.extension,
  uploadedAt: file.uploadedAt,

  ...(file.etag
    ? {
        etag: file.etag,
      }
    : {}),

  ...(file.width !== undefined
    ? {
        width: file.width,
      }
    : {}),

  ...(file.height !== undefined
    ? {
        height: file.height,
      }
    : {}),

  ...(file.duration !== undefined
    ? {
        duration: file.duration,
      }
    : {}),

  ...(file.pages !== undefined
    ? {
        pages: file.pages,
      }
    : {}),
});

const cleanupStorageKeys = async (
  storageKeys: string[],
  context: string,
): Promise<void> => {
  const uniqueKeys = [
    ...new Set(
      storageKeys.filter(Boolean),
    ),
  ];

  if (!uniqueKeys.length) {
    return;
  }

  const results =
    await Promise.allSettled(
      uniqueKeys.map(
        (storageKey) =>
          deleteFile(storageKey),
      ),
    );

  results.forEach(
    (result, index) => {
      if (
        result.status ===
        'rejected'
      ) {
        console.error(
          `Failed to delete stored file during ${context}:`,
          uniqueKeys[index],
          result.reason,
        );
      }
    },
  );
};

const assertUniqueSlug = async (
  slug: string,
  excludedId?: string,
): Promise<void> => {
  /*
   * Build the filter without importing FilterQuery.
   * This works across different Mongoose versions.
   */
  const filter = excludedId
    ? {
        slug,
        _id: {
          $ne: new Types.ObjectId(
            excludedId,
          ),
        },
      }
    : {
        slug,
      };

  const duplicate = await Blog.findOne(
    filter,
  )
    .select('_id')
    .collation({
      locale: 'simple',
    })
    .lean()
    .exec();

  if (duplicate) {
    throw new Error(
      'Slug already exists. Please use a unique slug.',
    );
  }
};

class BlogService {
  async createBlog(
    data: CreateBlogInput,
    bannerFile?: Express.Multer.File,
    resourceFiles: Express.Multer.File[] = [],
  ): Promise<IBlog> {
    /*
     * Zod has already confirmed that data.slug is lowercase
     * and canonical.
     */
    await assertUniqueSlug(data.slug);

    if (resourceFiles.length > 10) {
      throw new Error(
        'A blog can contain at most 10 uploaded resources.',
      );
    }

    const newlyUploaded:
      IUploadedFile[] = [];

    try {
      const banner = bannerFile
        ? await uploadFile(
            bannerFile,
            'blogs/banners',
          )
        : undefined;

      if (banner) {
        newlyUploaded.push(banner);
      }

      const uploadedFiles =
        await uploadMultipleFiles(
          resourceFiles,
          'blogs/resources',
        );

      newlyUploaded.push(
        ...uploadedFiles,
      );

      const blog =
        await Blog.create({
          ...data,

          ...(banner
            ? {
                banner,
              }
            : {}),

          files: uploadedFiles,
        });

      return blog;
    } catch (error) {
      await cleanupStorageKeys(
        newlyUploaded.map(
          (file) =>
            file.storageKey,
        ),
        'blog creation rollback',
      );

      throw error;
    }
  }

  async getBlogs(
    query: GetBlogsInput,
  ): Promise<{
    blogs: IBlog[];

    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    const {
      page,
      limit,
      status,
      category,
      search,
      sortBy,
      sortOrder,
    } = query;

    const skip =
      (page - 1) * limit;

    /*
     * Avoid FilterQuery import for compatibility with the
     * installed Mongoose type definitions.
     */
    const filter: Record<
      string,
      unknown
    > = {};

    if (status) {
      filter.status = status;
    }

    if (category) {
      filter.category = category;
    }

    if (search) {
      filter.$text = {
        $search: search,
      };
    }

    const sort: Record<
      string,
      1 | -1
    > = {
      [sortBy]:
        sortOrder === 'asc'
          ? 1
          : -1,
    };

    const [blogs, total] =
      await Promise.all([
        Blog.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .exec(),

        Blog.countDocuments(
          filter,
        ).exec(),
      ]);

    return {
      blogs,

      pagination: {
        page,
        limit,
        total,

        totalPages:
          Math.ceil(
            total / limit,
          ),

        hasNextPage:
          page * limit < total,

        hasPrevPage:
          page > 1,
      },
    };
  }

  async getBlogById(
    id: string,
  ): Promise<IBlog | null> {
    return Blog.findById(id)
      .exec();
  }

  async getBlogBySlug(
    slug: string,
  ): Promise<IBlog | null> {
    /*
     * Uppercase, spaces, repeated hyphens, and other
     * non-canonical values return null.
     */
    if (
      !BLOG_SLUG_PATTERN.test(
        slug,
      )
    ) {
      return null;
    }

    /*
     * Exact binary comparison:
     *
     * gen-ai      matches gen-ai
     * Gen-ai      does not match gen-ai
     * GEN-AI      does not match gen-ai
     */
    return Blog.findOne({
      slug,
    })
      .collation({
        locale: 'simple',
      })
      .exec();
  }

  async updateBlog(
    id: string,
    data: UpdateBlogInput,
    fileOptions: UpdateBlogFiles = {},
  ): Promise<IBlog | null> {
    const existingBlog =
      await Blog.findById(id)
        .exec();

    if (!existingBlog) {
      return null;
    }

    if (
      data.slug &&
      data.slug !==
        existingBlog.slug
    ) {
      await assertUniqueSlug(
        data.slug,
        id,
      );
    }

    const existingFiles =
      existingBlog.files.map(
        copyUploadedFile,
      );

    const existingFileMap =
      new Map(
        existingFiles.map(
          (file) => [
            file.storageKey,
            file,
          ],
        ),
      );

    let retainedFiles =
      existingFiles;

    if (
      fileOptions.retainedFileStorageKeys !==
      undefined
    ) {
      const requestedKeys = [
        ...new Set(
          fileOptions.retainedFileStorageKeys,
        ),
      ];

      const unknownKeys =
        requestedKeys.filter(
          (storageKey) =>
            !existingFileMap.has(
              storageKey,
            ),
        );

      if (unknownKeys.length) {
        throw new Error(
          'One or more retained resource files do not belong to this blog.',
        );
      }

      retainedFiles =
        requestedKeys.map(
          (storageKey) =>
            existingFileMap.get(
              storageKey,
            )!,
        );
    }

    const resourceFiles =
      fileOptions.resourceFiles ??
      [];

    if (
      retainedFiles.length +
        resourceFiles.length >
      10
    ) {
      throw new Error(
        'A blog can contain at most 10 uploaded resources.',
      );
    }

    const newlyUploaded:
      IUploadedFile[] = [];

    try {
      const newBanner =
        fileOptions.bannerFile
          ? await uploadFile(
              fileOptions.bannerFile,
              'blogs/banners',
            )
          : undefined;

      if (newBanner) {
        newlyUploaded.push(
          newBanner,
        );
      }

      const uploadedResources =
        await uploadMultipleFiles(
          resourceFiles,
          'blogs/resources',
        );

      newlyUploaded.push(
        ...uploadedResources,
      );

      const finalFiles = [
        ...retainedFiles,
        ...uploadedResources,
      ];

      const setData:
        Record<string, unknown> = {
          ...data,
          files: finalFiles,
        };

      const unsetData:
        Record<string, 1> = {};

      if (newBanner) {
        setData.banner =
          newBanner;
      } else if (
        fileOptions.removeBanner
      ) {
        unsetData.banner = 1;
      }

      const updateOperation: {
        $set: Record<
          string,
          unknown
        >;
        $unset?: Record<
          string,
          1
        >;
      } = {
        $set: setData,
      };

      if (
        Object.keys(
          unsetData,
        ).length
      ) {
        updateOperation.$unset =
          unsetData;
      }

      const updatedBlog =
        await Blog.findByIdAndUpdate(
          id,
          updateOperation,
          {
            new: true,
            runValidators: true,
          },
        ).exec();

      if (!updatedBlog) {
        throw new Error(
          'Blog was removed while it was being updated.',
        );
      }

      const retainedKeySet =
        new Set(
          finalFiles.map(
            (file) =>
              file.storageKey,
          ),
        );

      const removedResourceKeys =
        existingFiles
          .filter(
            (file) =>
              !retainedKeySet.has(
                file.storageKey,
              ),
          )
          .map(
            (file) =>
              file.storageKey,
          );

      const oldBannerKey =
        existingBlog.banner
          ?.storageKey;

      const shouldDeleteOldBanner =
        Boolean(oldBannerKey) &&
        Boolean(
          newBanner ||
            fileOptions.removeBanner,
        );

      await cleanupStorageKeys(
        [
          ...removedResourceKeys,

          ...(shouldDeleteOldBanner &&
          oldBannerKey
            ? [oldBannerKey]
            : []),
        ],
        'blog update cleanup',
      );

      return updatedBlog;
    } catch (error) {
      await cleanupStorageKeys(
        newlyUploaded.map(
          (file) =>
            file.storageKey,
        ),
        'blog update rollback',
      );

      throw error;
    }
  }

  async deleteBlog(
    id: string,
  ): Promise<IBlog | null> {
    const blog =
      await Blog.findByIdAndDelete(
        id,
      ).exec();

    if (!blog) {
      return null;
    }

    await cleanupStorageKeys(
      [
        ...(blog.banner
          ?.storageKey
          ? [
              blog.banner
                .storageKey,
            ]
          : []),

        ...blog.files.map(
          (file) =>
            file.storageKey,
        ),
      ],
      'blog deletion',
    );

    return blog;
  }

  async deleteMultipleBlogs(
    ids: string[],
  ): Promise<{
    deletedCount: number;
    failedIds: string[];
  }> {
    const uniqueIds = [
      ...new Set(ids),
    ];

    const blogs =
      await Blog.find({
        _id: {
          $in: uniqueIds,
        },
      }).exec();

    const foundIds =
      new Set(
        blogs.map(
          (blog) =>
            String(blog._id),
        ),
      );

    const failedIds =
      uniqueIds.filter(
        (id) =>
          !foundIds.has(id),
      );

    const result =
      await Blog.deleteMany({
        _id: {
          $in: [
            ...foundIds,
          ],
        },
      }).exec();

    await cleanupStorageKeys(
      blogs.flatMap(
        (blog) => [
          ...(blog.banner
            ?.storageKey
            ? [
                blog.banner
                  .storageKey,
              ]
            : []),

          ...blog.files.map(
            (file) =>
              file.storageKey,
          ),
        ],
      ),
      'bulk blog deletion',
    );

    return {
      deletedCount:
        result.deletedCount,
      failedIds,
    };
  }

  async updateBlogStatus(
    id: string,
    status: BlogStatus,
  ): Promise<IBlog | null> {
    return Blog.findByIdAndUpdate(
      id,
      {
        $set: {
          status,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    ).exec();
  }

  async getBlogStats(): Promise<{
    total: number;
    draft: number;
    published: number;
  }> {
    const [
      total,
      draft,
      published,
    ] = await Promise.all([
      Blog.countDocuments()
        .exec(),

      Blog.countDocuments({
        status: 'draft',
      }).exec(),

      Blog.countDocuments({
        status:
          'published',
      }).exec(),
    ]);

    return {
      total,
      draft,
      published,
    };
  }
}

export default new BlogService();