const CHUNK_SIZE = 1500;
const CHUNK_OVERLAP = 200;

export function chunkText(
  text: string,
  chunkSize = CHUNK_SIZE,
  overlap = CHUNK_OVERLAP
): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + chunkSize;

    // Try to break at a paragraph or sentence boundary
    if (end < text.length) {
      const nextParagraph = text.indexOf("\n\n", end - 200);
      if (nextParagraph !== -1 && nextParagraph < end + 200) {
        end = nextParagraph;
      } else {
        const nextSentence = text.indexOf(". ", end - 100);
        if (nextSentence !== -1 && nextSentence < end + 100) {
          end = nextSentence + 1;
        }
      }
    }

    const chunk = text.slice(start, end).trim();
    if (chunk.length > 50) {
      chunks.push(chunk);
    }

    start = end - overlap;
    if (start < 0) start = 0;
    if (start >= text.length) break;
  }

  return chunks;
}
