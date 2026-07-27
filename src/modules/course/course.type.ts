// skillo-backend\src\modules\course\course.type.ts
export interface IUploadedFile {
  url: string;
  storageKey: string;
  mimeType: string;
  originalName: string;
  size: number;
  extension: string;
  uploadedAt: Date;
  etag?: string;
  width?: number;
  height?: number;
  duration?: number;
  pages?: number;
}

export interface IResource {
  name: string;
  type: 'pdf' | 'image';
  file: IUploadedFile;
}

export interface IFAQ {
  question: string;
  answer: string;
}

export interface IHighlight {
  label: string;
  value: string;
}

export interface ITool {
  name: string;
  iconSlug: string;
}

export type ICurriculumSection = Record<string, unknown>;

export interface IProject {
  title: string;
  description: string;
}

export interface ICertificate {
  description: string;
  requirements: string[];
}

export interface ITestimonial {
  name: string;
  role: string;
  company: string;
  content: string;
  rating: number;
}

export type CourseStatus = 'upcoming' | 'active' | 'ended';
export type CourseLevel =
  | 'all-levels'
  | 'beginner'
  | 'intermediate'
  | 'advanced';

export interface ICourse {
  // Only these three course fields are required by validation/model.
  title: string;
  slug: string;
  category: string;

  subCategory: string;
  shortDescription: string;
  price: number;
  discountedPrice: number;
  currency: string;
  purchaseUrl: string;

  bannerImage?: IUploadedFile;

  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  status: CourseStatus;
  urls: string[];

  resources: IResource[];
  cms: string;
  faqs: IFAQ[];

  heroHeadline: string;
  highlights: IHighlight[];
  whatYouWillLearn: string[];
  requirements: string[];
  whoIsThisFor: string[];
  notFor: string[];
  tools: ITool[];
  curriculum: ICurriculumSection[];
  projects: IProject[];
  certificate: ICertificate;
  careerRoles: string[];
  testimonials: ITestimonial[];

  level: CourseLevel;
  language: string;
  durationWeeks: number;
  format: string;

  createdAt: Date;
  updatedAt: Date;
}
