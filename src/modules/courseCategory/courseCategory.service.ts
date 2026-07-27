import CourseCategoryModel from './courseCategory.model.js';

export class CourseCategoryService {
  async create(data: any) {
    const exists = await CourseCategoryModel.findOne({
      $or: [{ name: data.name }, { slug: data.slug }],
    });

    if (exists) {
      throw new Error('Category name or slug already exists');
    }

    return CourseCategoryModel.create(data);
  }

  async getAll() {
    return CourseCategoryModel.find().sort({
      createdAt: -1,
    });
  }

  async getById(id: string) {
    return CourseCategoryModel.findById(id);
  }

  async getBySlug(slug: string) {
    return CourseCategoryModel.findOne({ slug });
  }

  async update(id: string, data: any) {
    const category = await CourseCategoryModel.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });

    if (!category) {
      throw new Error('Category not found');
    }

    return category;
  }

  async delete(id: string) {
    const category = await CourseCategoryModel.findById(id);

    if (!category) {
      throw new Error('Category not found');
    }

    await category.deleteOne();

    return true;
  }
}

export const courseCategoryService = new CourseCategoryService();
