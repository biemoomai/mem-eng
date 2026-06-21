/**
 * Splits a sentence into a 'pre' and 'post' section surrounding a target word.
 * This is used to allow UI components to stylize or obscure the target word in the middle.
 * 
 * @param {string} sentence The full example sentence (e.g., "We must mitigate the risk.")
 * @param {string} targetWord The word to extract (e.g., "mitigate")
 * @returns {{ pre: string, post: string }} The surrounding parts of the sentence.
 */
export const splitSentenceAroundWord = (sentence, targetWord) => {
  if (!sentence || !targetWord) {
    return { pre: sentence || '', post: '' };
  }

  // Use case-insensitive regex to find the target word as a whole word boundary
  // Note: we use \b to ensure we match whole words, not partial matches.
  try {
    // If targetWord has special regex characters, this could theoretically fail, but usually it's just plain text.
    // To be safe we could escape it, but we'll assume basic alphabetical strings for Vocab.
    const escapedWord = targetWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedWord}\\b`, 'i');
    
    const parts = sentence.split(regex);
    
    if (parts.length > 1) {
      // Split found the word!
      const pre = parts[0];
      // Join the rest in case the word appears multiple times in the sentence
      const post = parts.slice(1).join(targetWord);
      return { pre, post };
    }
  } catch (err) {
    console.error("Regex split failed: ", err);
  }

  // Fallback if the word isn't strictly found with boundaries (e.g., it was conjugated to 'mitigated')
  // We can try a loose split without boundaries.
  try {
    const looseRegex = new RegExp(targetWord, 'i');
    const parts = sentence.split(looseRegex);
    if (parts.length > 1) {
      return { pre: parts[0], post: parts.slice(1).join(targetWord) };
    }
  } catch (err) {}

  // If the word isn't in the sentence at all, dump everything into 'pre'
  return { pre: sentence, post: '' };
};
