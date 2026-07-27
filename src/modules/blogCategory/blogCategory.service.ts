import BlogCategoryModel from './blogCategory.model.js';

export class BlogCategoryService {
  async create(data: any) {
    const exists = await BlogCategoryModel.findOne({
      $or: [{ name: data.name }, { slug: data.slug }],
    });

    if (exists) {
      throw new Error('Category name or slug already exists');
    }

    return BlogCategoryModel.create(data);
  }

  async getAll() {
    return BlogCategoryModel.find().sort({
      createdAt: -1,
    });
  }

  async getById(id: string) {
    return BlogCategoryModel.findById(id);
  }

  async getBySlug(slug: string) {
    return BlogCategoryModel.findOne({ slug });
  }

  async update(id: string, data: any) {
    const category = await BlogCategoryModel.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });

    if (!category) {
      throw new Error('Category not found');
    }

    return category;
  }

  async delete(id: string) {
    const category = await BlogCategoryModel.findById(id);

    if (!category) {
      throw new Error('Category not found');
    }

    await category.deleteOne();

    return true;
  }
}

export const blogCategoryService = new BlogCategoryService();
