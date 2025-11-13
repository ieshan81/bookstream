import pdfParse from 'pdf-parse';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { isPDF, isEPUB } from './fileStorage.js';

// Mock genres for random assignment
const GENRES = [
  'Fiction', 'Non-Fiction', 'Mystery', 'Romance', 'Science Fiction',
  'Fantasy', 'Thriller', 'Biography', 'History', 'Self-Help',
  'Business', 'Technology', 'Philosophy', 'Poetry', 'Drama'
];

// Mock summaries
const MOCK_SUMMARIES = {
  short: [
    'A captivating tale that explores the depths of human experience.',
    'An engaging narrative that takes readers on an unforgettable journey.',
    'A thought-provoking work that challenges conventional wisdom.',
    'A beautifully written story that captures the essence of its time.',
    'An inspiring account of courage and determination.',
  ],
  long: [
    'This remarkable work delves deep into the complexities of its subject matter, offering readers a comprehensive exploration of themes that resonate across generations. Through masterful storytelling and insightful analysis, the author presents a narrative that is both entertaining and enlightening.',
    'In this compelling volume, readers are invited to explore a world rich with detail and meaning. The author skillfully weaves together multiple narrative threads, creating a tapestry of human experience that is both personal and universal.',
    'This book represents a significant contribution to its field, combining rigorous research with accessible prose. The author presents complex ideas in a manner that is both engaging and educational, making this work valuable for both experts and general readers.',
  ],
};

/**
 * Extract metadata from uploaded book file (mock implementation)
 * In production, this would use real OCR, AI APIs, or metadata extraction libraries
 */
export const parseBookMetadata = async (filePath, originalName) => {
  try {
    // Extract basic info from filename
    const filename = path.basename(originalName, path.extname(originalName));
    const parts = filename.split(/[-_]/);
    
    // Try to extract title and author from filename
    let title = parts[0]?.trim() || 'Untitled Book';
    let author = parts[1]?.trim() || 'Unknown Author';
    
    // If it's a PDF, try to extract text from first page
    if (isPDF(filePath)) {
      try {
        const dataBuffer = await fs.readFile(filePath);
        const pdfData = await pdfParse(dataBuffer);
        const firstPageText = pdfData.text.substring(0, 500);
        
        // Try to extract title from first page (simple heuristic)
        const lines = firstPageText.split('\n').filter(line => line.trim().length > 0);
        if (lines.length > 0 && lines[0].length > 5 && lines[0].length < 100) {
          title = lines[0].trim();
        }
        if (lines.length > 1 && lines[1].length > 3 && lines[1].length < 50) {
          author = lines[1].trim();
        }
      } catch (error) {
        console.log('Could not parse PDF text, using filename:', error.message);
      }
    }
    
    // Generate cover image (first page thumbnail for PDF)
    let coverImageUrl = null;
    try {
      if (isPDF(filePath)) {
        // For PDF, we'd need pdf2pic or similar library
        // For now, we'll create a placeholder
        coverImageUrl = await generatePlaceholderCover(title, author);
      } else {
        // For EPUB, extract cover from metadata
        coverImageUrl = await generatePlaceholderCover(title, author);
      }
    } catch (error) {
      console.log('Could not generate cover image:', error.message);
    }
    
    // Random genre assignment (mock)
    const genre = GENRES[Math.floor(Math.random() * GENRES.length)];
    
    // Random summaries (mock)
    const summaryShort = MOCK_SUMMARIES.short[Math.floor(Math.random() * MOCK_SUMMARIES.short.length)];
    const summaryLong = MOCK_SUMMARIES.long[Math.floor(Math.random() * MOCK_SUMMARIES.long.length)];
    
    return {
      title: title || 'Untitled Book',
      author: author || 'Unknown Author',
      genre,
      summaryShort,
      summaryLong,
      coverImageUrl,
      metadata: {
        extractedFrom: 'filename',
        fileSize: (await fs.stat(filePath)).size,
        pages: isPDF(filePath) ? await getPDFPageCount(filePath) : null,
      },
    };
  } catch (error) {
    console.error('Error parsing book metadata:', error);
    // Return default values on error
    return {
      title: path.basename(originalName, path.extname(originalName)),
      author: 'Unknown Author',
      genre: 'Fiction',
      summaryShort: 'A book waiting to be discovered.',
      summaryLong: 'This book has been uploaded but metadata extraction is pending.',
      coverImageUrl: null,
      metadata: { error: error.message },
    };
  }
};

/**
 * Get page count from PDF (mock - would use real PDF library in production)
 */
const getPDFPageCount = async (filePath) => {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const pdfData = await pdfParse(dataBuffer);
    return pdfData.numpages || 1;
  } catch (error) {
    return 1;
  }
};

/**
 * Generate a placeholder cover image
 * In production, this would extract the actual cover from the book
 */
const generatePlaceholderCover = async (title, author) => {
  // For MVP, we'll return null and use a default cover in the frontend
  // In production, you'd use sharp or pdf2pic to extract actual cover
  return null;
};

