import mongoose from 'mongoose';
import dotenv from 'dotenv';

import { createBlog, type CreateBlogPayload } from '../modules/blog/blog.service.js';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI!);

  const payload: CreateBlogPayload = {
    title: 'Getting Started with Next.js 15',

    slug: 'getting-started-with-nextjs-15',

    description: 'Complete guide for building scalable Next.js applications.',

    category: new mongoose.Types.ObjectId(),

    keyword: ['nextjs', 'react', 'typescript'],

    postingDate: new Date(),

    postedBy: new mongoose.Types.ObjectId(),

    socialMediaLinks: [
      {
        platform: 'Facebook',
        url: 'https://facebook.com/skillo',
      },
    ],

    resourceLinks: [
      {
        title: 'Next.js Docs',
        url: 'https://nextjs.org/docs',
      },
    ],

    files: [
      {
        url: 'https://res.cloudinary.com/demo/image/upload/banner.jpg',
        publicId: 'blogs/banner',
      },
    ],

    faq: [
      {
        question: 'What is Next.js?',
        answer: 'A React framework.',
      },
    ],

    seoTitle: 'Next.js Guide',

    seoDescription: 'Learn Next.js',

    content: '<h1>Hello World</h1>',

    status: 'published',
  };

  const blog = await createBlog(payload);

  console.log(blog);

  await mongoose.disconnect();
}

run().catch(console.error);
