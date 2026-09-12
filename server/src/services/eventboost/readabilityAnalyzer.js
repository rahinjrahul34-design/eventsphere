/**
 * Readability analyzer evaluating sentence length, paragraph density, and Flesch Reading Ease.
 *
 * @param {string} text
 * @returns {object} { score, avgSentenceLength, longSentencesCount, paragraphCount, wordCount, fleschReadingEase, gradeLevel, issues, strengths }
 */
function analyzeReadability(text = '') {
  const content = (text || '').trim();
  const issues = [];
  const strengths = [];

  if (!content) {
    return {
      score: 0,
      avgSentenceLength: 0,
      longSentencesCount: 0,
      paragraphCount: 0,
      wordCount: 0,
      fleschReadingEase: 0,
      gradeLevel: 'N/A',
      issues: [
        {
          id: 'readability_no_content',
          title: 'No content to analyze for readability',
          priority: 'high',
          impact: 'high',
          confidence: 'high',
          effort: 'low',
          reason: 'Add text to evaluate audience comprehension and reading flow.',
          suggestedAction: 'Write your event description.',
          field: 'description',
          suggestedValue: null,
          safeToApply: false,
        },
      ],
      strengths: [],
    };
  }

  // Paragraphs
  const paragraphs = content.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const paragraphCount = Math.max(1, paragraphs.length);

  // Sentences
  const rawSentences = content
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);
  const sentenceCount = Math.max(1, rawSentences.length);

  // Words
  const words = content.replace(/[^a-zA-Z0-9\s'-]/g, ' ').split(/\s+/).filter((w) => w.length > 0);
  const wordCount = Math.max(1, words.length);

  // Long sentences (> 25 words)
  const longSentences = rawSentences.filter((s) => s.split(/\s+/).length > 25);
  const longSentencesCount = longSentences.length;

  const avgSentenceLength = Number((wordCount / sentenceCount).toFixed(1));

  // Syllable counting heuristic
  let totalSyllables = 0;
  words.forEach((w) => {
    totalSyllables += countSyllables(w);
  });
  const avgSyllablesPerWord = totalSyllables / wordCount;

  // Flesch Reading Ease Formula
  // 206.835 - (1.015 * ASL) - (84.6 * ASW)
  const rawFlesch = 206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord;
  const fleschReadingEase = Math.max(0, Math.min(100, Math.round(rawFlesch)));

  let gradeLevel = 'Standard';
  if (fleschReadingEase >= 80) gradeLevel = 'Easy / Accessible';
  else if (fleschReadingEase >= 60) gradeLevel = 'Standard / Professional';
  else if (fleschReadingEase >= 40) gradeLevel = 'Complex / Technical';
  else gradeLevel = 'Very Difficult';

  let score = 50;

  // Evaluate Average Sentence Length
  if (avgSentenceLength >= 12 && avgSentenceLength <= 20) {
    score += 25;
    strengths.push(`Optimal average sentence length (${avgSentenceLength} words/sentence)`);
  } else if (avgSentenceLength > 20 && avgSentenceLength <= 25) {
    score += 15;
  } else if (avgSentenceLength > 25) {
    score -= 15;
    issues.push({
      id: 'readability_sentences_long',
      title: 'Sentences are excessively long',
      priority: 'medium',
      impact: 'medium',
      confidence: 'high',
      effort: 'low',
      reason: `Average sentence length is ${avgSentenceLength} words. Aim for 14-18 words to maximize comprehension on mobile screens.`,
      suggestedAction: 'Break compound sentences into shorter, punchier statements.',
      field: 'description',
      suggestedValue: null,
      safeToApply: false,
    });
  } else {
    // Very short
    score += 15;
  }

  // Evaluate Long Sentences Ratio
  const longRatio = longSentencesCount / sentenceCount;
  if (longSentencesCount === 0) {
    score += 15;
    strengths.push('No overly convoluted or run-on sentences');
  } else if (longRatio > 0.3) {
    score -= 10;
    issues.push({
      id: 'readability_too_many_long_sentences',
      title: `${longSentencesCount} sentences exceed 25 words`,
      priority: 'low',
      impact: 'low',
      confidence: 'high',
      effort: 'low',
      reason: 'Long sentences increase cognitive load and drop-off rates on mobile web.',
      suggestedAction: 'Split complex sentences containing multiple clauses.',
      field: 'description',
      suggestedValue: null,
      safeToApply: false,
    });
  }

  // Evaluate Paragraph Distribution
  if (paragraphCount >= 2 && paragraphCount <= 8) {
    score += 10;
    strengths.push(`Good paragraph spacing across ${paragraphCount} sections`);
  } else if (paragraphCount === 1 && wordCount > 100) {
    issues.push({
      id: 'readability_single_paragraph',
      title: 'Text is condensed into a single paragraph',
      priority: 'low',
      impact: 'medium',
      confidence: 'high',
      effort: 'low',
      reason: 'Dense paragraphs deter casual scrollers from reading the details.',
      suggestedAction: 'Divide your text into 2-3 logical paragraphs.',
      field: 'description',
      suggestedValue: null,
      safeToApply: false,
    });
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));

  return {
    score: finalScore,
    avgSentenceLength,
    longSentencesCount,
    paragraphCount,
    wordCount,
    fleschReadingEase,
    gradeLevel,
    issues,
    strengths,
  };
}

function countSyllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length <= 3) return 1;
  const replaced = w
    .replace(/(?:[^laeiouy]|ed|es|e)$/, '')
    .replace(/^y/, '')
    .match(/[aeiouy]{1,2}/g);
  return replaced ? replaced.length : 1;
}

module.exports = { analyzeReadability };
