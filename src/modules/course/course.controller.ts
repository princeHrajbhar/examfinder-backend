// skillo-backend/src/modules/course/course.controller.ts

import {
  Request,
  Response,
  NextFunction,
} from 'express';

import {
  createCourseInputSchema,
  updateCourseSchema,
  courseParamsSchema,
  courseSlugSchema,
} from './course.validation.js';

import {
  createCourseService,
  getAllCoursesService,
  getCourseBySlugService,
  getCourseByIdService,
  updateCourseService,
  deleteCourseService,
} from './course.service.js';

interface CourseUploadFiles {
  bannerImage?: Express.Multer.File[];
  resources?: Express.Multer.File[];
}

const stringArrayFields = [
  'keywords',
  'urls',
  'whatYouWillLearn',
  'requirements',
  'whoIsThisFor',
  'notFor',
  'careerRoles',
] as const;

const jsonFields = [
  'resources',
  'faqs',
  'highlights',
  'tools',
  'curriculum',
  'projects',
  'certificate',
  'testimonials',
] as const;

const asArray = (
  value: unknown,
): unknown[] => {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return [];
  }

  return Array.isArray(value)
    ? value
    : [value];
};

const parseJson = (
  value: unknown,
): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
};

const normalizeCourseBody = (
  input: Request['body'],
  fullForm: boolean,
): Record<string, unknown> => {
  const source = (input ?? {}) as Record<
    string,
    unknown
  >;

  const normalized: Record<
    string,
    unknown
  > = {
    ...source,
  };

  for (const field of stringArrayFields) {
    const plainValue = source[field];
    const bracketValue =
      source[`${field}[]`];

    const value =
      plainValue ?? bracketValue;

    if (value !== undefined) {
      normalized[field] = asArray(value)
        .flatMap((item) =>
          typeof item === 'string'
            ? item.split(',')
            : [],
        )
        .map((item) => item.trim())
        .filter(Boolean);
    } else if (fullForm) {
      normalized[field] = [];
    }

    delete normalized[`${field}[]`];
  }

  for (const field of jsonFields) {
    if (source[field] !== undefined) {
      normalized[field] = parseJson(
        source[field],
      );
    } else if (
      fullForm &&
      field !== 'certificate'
    ) {
      normalized[field] = [];
    }
  }

  return normalized;
};

const getFiles = (
  req: Request,
): CourseUploadFiles =>
  (req.files ?? {}) as CourseUploadFiles;

export const createCourse = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const body =
      createCourseInputSchema.parse(
        normalizeCourseBody(
          req.body,
          true,
        ),
      );

    const course =
      await createCourseService(
        body,
        getFiles(req),
      );

    res.status(201).json({
      success: true,
      message:
        'Course created successfully',
      data: course,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllCourses = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const courses =
      await getAllCoursesService();

    res.status(200).json({
      success: true,
      data: courses,
    });
  } catch (error) {
    next(error);
  }
};

export const getCourseBySlug = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    /*
     * This validates the exact route parameter.
     *
     * It does not trim, lowercase or normalize it.
     * Therefore "Data-Analytics-Course" fails validation.
     */
    const parsedParams =
      courseSlugSchema.safeParse(
        req.params,
      );

    if (!parsedParams.success) {
      res.status(404).json({
        success: false,
        message: 'Course not found',
      });

      return;
    }

    const { slug } = parsedParams.data;

    const course =
      await getCourseBySlugService(
        slug,
      );

    if (!course) {
      res.status(404).json({
        success: false,
        message: 'Course not found',
      });

      return;
    }

    res.status(200).json({
      success: true,
      data: course,
    });
  } catch (error) {
    next(error);
  }
};

export const getCourseById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } =
      courseParamsSchema.parse(
        req.params,
      );

    const course =
      await getCourseByIdService(id);

    res.status(200).json({
      success: true,
      data: course,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCourse = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } =
      courseParamsSchema.parse(
        req.params,
      );

    const normalizedBody =
      normalizeCourseBody(
        req.body,
        false,
      );

    const body =
      updateCourseSchema.parse(
        normalizedBody,
      );

    const course =
      await updateCourseService(
        id,
        body,
        getFiles(req),
      );

    res.status(200).json({
      success: true,
      message:
        'Course updated successfully',
      data: course,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCourse = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } =
      courseParamsSchema.parse(
        req.params,
      );

    await deleteCourseService(id);

    res.status(200).json({
      success: true,
      message:
        'Course deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};