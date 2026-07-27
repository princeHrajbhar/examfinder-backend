// skillo-backend/src/modules/course/course.service.ts

import Course from './course.model.js';

import {
  uploadFile,
  uploadMultipleFiles,
  deleteFile,
} from '../../utils/fileUpload.js';

import {
  CourseResourceInput,
  CreateCourseInput,
  UpdateCourseInput,
} from './course.validation.js';

import {
  IResource,
  IUploadedFile,
} from './course.type.js';

interface CourseUploadFiles {
  bannerImage?: Express.Multer.File[];
  resources?: Express.Multer.File[];
}

const COURSE_SLUG_PATTERN =
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/*
 * Used only while writing course data.
 *
 * It is intentionally not attached to the Mongoose schema,
 * so it cannot modify findOne() query values.
 */
const normalizeSlug = (
  value: string,
): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const inferResourceType = (
  file: Express.Multer.File,
): 'pdf' | 'image' =>
  file.mimetype.startsWith('image/')
    ? 'image'
    : 'pdf';

const buildResource = (
  uploaded: IUploadedFile,
  source: Express.Multer.File,
  metadata?: CourseResourceInput,
): IResource => ({
  name:
    metadata?.name?.trim() ||
    source.originalname,

  type:
    metadata?.type ??
    inferResourceType(source),

  file: uploaded,
});

const deleteFilesBestEffort = async (
  storageKeys: Array<
    string | undefined
  >,
): Promise<void> => {
  const uniqueKeys = [
    ...new Set(
      storageKeys.filter(
        Boolean,
      ) as string[],
    ),
  ];

  const results =
    await Promise.allSettled(
      uniqueKeys.map(
        (storageKey) =>
          deleteFile(storageKey),
      ),
    );

  for (const result of results) {
    if (result.status === 'rejected') {
      console.error(
        'S3 file deletion failed:',
        result.reason,
      );
    }
  }
};

const findExistingResource = (
  existing: IResource[],
  metadata: CourseResourceInput,
  usedKeys: Set<string>,
): IResource | undefined => {
  const requestedKey =
    metadata.file?.storageKey?.trim();

  const requestedUrl =
    metadata.file?.url?.trim();

  if (requestedKey || requestedUrl) {
    return existing.find(
      (resource) =>
        !usedKeys.has(
          resource.file.storageKey ||
            resource.file.url,
        ) &&
        ((requestedKey &&
          resource.file.storageKey ===
            requestedKey) ||
          (requestedUrl &&
            resource.file.url ===
              requestedUrl)),
    );
  }

  return existing.find(
    (resource) =>
      !usedKeys.has(
        resource.file.storageKey ||
          resource.file.url,
      ) &&
      resource.name === metadata.name &&
      resource.type === metadata.type,
  );
};

const ensureUniqueSlug = async (
  slug: string,
  excludedId?: string,
): Promise<void> => {
  const query: Record<
    string,
    unknown
  > = {
    slug,
  };

  if (excludedId) {
    query._id = {
      $ne: excludedId,
    };
  }

  const duplicate = await Course.findOne(
    query,
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

export const createCourseService = async (
  data: CreateCourseInput,
  files: CourseUploadFiles,
) => {
  /*
   * Normalize only for persistence.
   */
  const normalizedSlug =
    normalizeSlug(data.slug);

  await ensureUniqueSlug(
    normalizedSlug,
  );

  const bannerFile =
    files.bannerImage?.[0];

  const resourceFiles =
    files.resources ?? [];

  const metadata =
    data.resources ?? [];

  if (
    metadata.length > 0 &&
    metadata.length !==
      resourceFiles.length
  ) {
    throw new Error(
      'Each course resource must have one uploaded file.',
    );
  }

  const uploadedKeys: string[] = [];

  try {
    const bannerImage =
      bannerFile
        ? await uploadFile(
            bannerFile,
            'courses/banners',
          )
        : undefined;

    if (bannerImage) {
      uploadedKeys.push(
        bannerImage.storageKey,
      );
    }

    const uploadedResources =
      await uploadMultipleFiles(
        resourceFiles,
        'courses/resources',
      );

    uploadedKeys.push(
      ...uploadedResources.map(
        (file) => file.storageKey,
      ),
    );

    const resources =
      uploadedResources.map(
        (file, index) =>
          buildResource(
            file,
            resourceFiles[index],
            metadata[index],
          ),
      );

    const {
      resources: _resourceMetadata,
      removeBanner: _removeBanner,
      ...courseFields
    } = data;

    return await Course.create({
      ...courseFields,

      /*
       * This must come after courseFields.
       */
      slug: normalizedSlug,

      ...(bannerImage
        ? { bannerImage }
        : {}),

      resources,
    });
  } catch (error) {
    await deleteFilesBestEffort(
      uploadedKeys,
    );

    throw error;
  }
};

export const getAllCoursesService =
  async () =>
    Course.find()
      .sort({
        createdAt: -1,
      })
      .exec();

export const getCourseBySlugService =
  async (slug: string) => {
    /*
     * Defense in depth. Even when this service is called outside
     * the controller, non-canonical slugs are rejected.
     */
    if (
      !COURSE_SLUG_PATTERN.test(slug)
    ) {
      return null;
    }

    /*
     * locale: "simple" performs an exact binary comparison.
     *
     * gen-ai matches gen-ai.
     * Gen-ai does not match gen-ai.
     */
    return Course.findOne({
      slug,
    })
      .collation({
        locale: 'simple',
      })
      .exec();
  };

export const getCourseByIdService =
  async (id: string) => {
    const course =
      await Course.findById(id);

    if (!course) {
      throw new Error(
        'Course not found',
      );
    }

    return course;
  };

export const updateCourseService =
  async (
    id: string,
    data: UpdateCourseInput,
    files: CourseUploadFiles,
  ) => {
    const course =
      await Course.findById(id);

    if (!course) {
      throw new Error(
        'Course not found',
      );
    }

    const normalizedSlug =
      data.slug !== undefined
        ? normalizeSlug(data.slug)
        : undefined;

    if (
      normalizedSlug !== undefined &&
      normalizedSlug !== course.slug
    ) {
      await ensureUniqueSlug(
        normalizedSlug,
        id,
      );
    }

    const existingBanner =
      course.bannerImage as
        | IUploadedFile
        | undefined;

    const existingResources =
      Array.from(
        course.resources ?? [],
      ) as IResource[];

    const bannerFile =
      files.bannerImage?.[0];

    const resourceFiles =
      files.resources ?? [];

    const newlyUploadedKeys:
      string[] = [];

    try {
      let nextBanner =
        existingBanner;

      if (bannerFile) {
        nextBanner =
          await uploadFile(
            bannerFile,
            'courses/banners',
          );

        newlyUploadedKeys.push(
          nextBanner.storageKey,
        );
      } else if (
        data.removeBanner === true
      ) {
        nextBanner = undefined;
      }

      let nextResources =
        existingResources;

      if (
        data.resources !==
        undefined
      ) {
        const retainedMetadata =
          data.resources.filter(
            (item) =>
              Boolean(
                item.file?.storageKey?.trim() ||
                  item.file?.url?.trim(),
              ),
          );

        const pendingMetadata =
          data.resources.filter(
            (item) =>
              !item.file?.storageKey?.trim() &&
              !item.file?.url?.trim(),
          );

        if (
          pendingMetadata.length !==
          resourceFiles.length
        ) {
          throw new Error(
            'New resource metadata and uploaded resource file count do not match.',
          );
        }

        const usedKeys =
          new Set<string>();

        const retainedResources =
          retainedMetadata.map(
            (item) => {
              const existing =
                findExistingResource(
                  existingResources,
                  item,
                  usedKeys,
                );

              if (!existing) {
                throw new Error(
                  'A retained course resource could not be matched.',
                );
              }

              usedKeys.add(
                existing.file
                  .storageKey ||
                  existing.file.url,
              );

              return {
                ...existing,

                name:
                  item.name?.trim() ||
                  existing.name,

                type:
                  item.type ??
                  existing.type,
              };
            },
          );

        const uploadedResources =
          await uploadMultipleFiles(
            resourceFiles,
            'courses/resources',
          );

        newlyUploadedKeys.push(
          ...uploadedResources.map(
            (file) =>
              file.storageKey,
          ),
        );

        const addedResources =
          uploadedResources.map(
            (file, index) =>
              buildResource(
                file,
                resourceFiles[index],
                pendingMetadata[index],
              ),
          );

        nextResources = [
          ...retainedResources,
          ...addedResources,
        ];
      } else if (
        resourceFiles.length > 0
      ) {
        const uploadedResources =
          await uploadMultipleFiles(
            resourceFiles,
            'courses/resources',
          );

        newlyUploadedKeys.push(
          ...uploadedResources.map(
            (file) =>
              file.storageKey,
          ),
        );

        nextResources = [
          ...existingResources,

          ...uploadedResources.map(
            (file, index) =>
              buildResource(
                file,
                resourceFiles[index],
              ),
          ),
        ];
      }

      const {
        resources:
          _resourceMetadata,
        removeBanner:
          _removeBanner,
        ...courseFields
      } = data;

      course.set({
        ...courseFields,

        /*
         * Override the original submitted slug with the normalized
         * persistence value.
         */
        ...(normalizedSlug !==
        undefined
          ? {
              slug:
                normalizedSlug,
            }
          : {}),
      });

      course.set(
        'resources',
        nextResources,
      );

      course.set(
        'bannerImage',
        nextBanner,
      );

      const updatedCourse =
        await course.save();

      const retainedResourceKeys =
        new Set(
          nextResources.map(
            (resource) =>
              resource.file
                .storageKey,
          ),
        );

      const removedResourceKeys =
        existingResources
          .map(
            (resource) =>
              resource.file
                .storageKey,
          )
          .filter(
            (key) =>
              key &&
              !retainedResourceKeys.has(
                key,
              ),
          );

      await deleteFilesBestEffort([
        ...(existingBanner?.storageKey &&
        existingBanner.storageKey !==
          nextBanner?.storageKey
          ? [
              existingBanner.storageKey,
            ]
          : []),

        ...removedResourceKeys,
      ]);

      return updatedCourse;
    } catch (error) {
      await deleteFilesBestEffort(
        newlyUploadedKeys,
      );

      throw error;
    }
  };

export const deleteCourseService =
  async (id: string) => {
    const course =
      await Course.findByIdAndDelete(
        id,
      );

    if (!course) {
      throw new Error(
        'Course not found',
      );
    }

    const bannerKey = (
      course.bannerImage as
        | IUploadedFile
        | undefined
    )?.storageKey;

    const resourceKeys =
      Array.from(
        course.resources ?? [],
      ).map(
        (resource) =>
          (resource as IResource)
            .file.storageKey,
      );

    await deleteFilesBestEffort([
      bannerKey,
      ...resourceKeys,
    ]);
  };