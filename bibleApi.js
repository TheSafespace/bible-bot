const fetch = require('node-fetch');

const { BIBLE_API_KEY } = process.env;
const bibleId = '542b32484b6e38c2-01';

const bibleOptions = {
  headers: {
    'api-key': BIBLE_API_KEY,
  },
};

const fetchBooks = async () => {
  const response = await fetch(
    `https://api.scripture.api.bible/v1/bibles/${bibleId}/books?include-chapters=true`,
    bibleOptions,
  );
  return response.json();
};

const fetchVerses = async (chapterId) => {
  const response = await fetch(
    `https://api.scripture.api.bible/v1/bibles/${bibleId}/chapters/${chapterId}/verses`,
    bibleOptions,
  );
  return response.json();
};

const fetchVerseContent = async (verseId) => {
  const response = await fetch(
    `https://api.scripture.api.bible/v1/bibles/${bibleId}/verses/${verseId}?content-type=text&include-notes=false&include-titles=false&include-chapter-numbers=false&include-verse-numbers=false&include-verse-spans=false&use-org-id=false`,
    bibleOptions,
  );
  return response.json();
};

module.exports = {
  fetchBooks,
  fetchVerses,
  fetchVerseContent,
};
