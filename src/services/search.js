import prisma from '../config/database.js';

/**
 * Search books by title, author, or genre
 */
export const searchBooks = async (query, filters = {}) => {
  const { genre, limit = 50, offset = 0 } = filters;
  
  const where = {
    AND: [
      query ? {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { author: { contains: query, mode: 'insensitive' } },
        ],
      } : {},
      genre ? { genre: { equals: genre, mode: 'insensitive' } } : {},
    ].filter(condition => Object.keys(condition).length > 0),
  };

  const [books, total] = await Promise.all([
    prisma.book.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        uploader: {
          select: { id: true, name: true, avatar: true },
        },
      },
    }),
    prisma.book.count({ where }),
  ]);

  return { books, total };
};

/**
 * Get books by category
 */
export const getBooksByCategory = async (category, limit = 20) => {
  let orderBy = {};
  
  switch (category.toLowerCase()) {
    case 'popular':
      // Most uploaded books (can be enhanced with read count later)
      orderBy = { createdAt: 'desc' };
      break;
    case 'trending':
      // Recently read books (can be enhanced with reading progress)
      orderBy = { updatedAt: 'desc' };
      break;
    case 'new':
    default:
      orderBy = { createdAt: 'desc' };
      break;
  }

  const books = await prisma.book.findMany({
    take: limit,
    orderBy,
    include: {
      uploader: {
        select: { id: true, name: true, avatar: true },
      },
    },
  });

  return books;
};

/**
 * Get related books based on genre
 */
export const getRelatedBooks = async (bookId, limit = 5) => {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: { genre: true },
  });

  if (!book) {
    return [];
  }

  const relatedBooks = await prisma.book.findMany({
    where: {
      genre: book.genre,
      id: { not: bookId },
    },
    take: limit,
    orderBy: { createdAt: 'desc' },
  });

  return relatedBooks;
};

