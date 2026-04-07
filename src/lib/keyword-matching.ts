const tokenPattern = /[\p{L}\p{N}]+/gu;

function normalizeKeywordText(value: string) {
  return value.toLowerCase().normalize("NFKC");
}

function tokenize(value: string) {
  return normalizeKeywordText(value).match(tokenPattern) ?? [];
}

function isAsciiToken(value: string) {
  return /^[a-z0-9]+$/u.test(value);
}

function hasContiguousTokenSequence(textTokens: string[], keywordTokens: string[]) {
  if (keywordTokens.length === 0 || textTokens.length < keywordTokens.length) {
    return false;
  }

  for (let startIndex = 0; startIndex <= textTokens.length - keywordTokens.length; startIndex += 1) {
    let matched = true;

    for (let keywordIndex = 0; keywordIndex < keywordTokens.length; keywordIndex += 1) {
      if (textTokens[startIndex + keywordIndex] !== keywordTokens[keywordIndex]) {
        matched = false;
        break;
      }
    }

    if (matched) {
      return true;
    }
  }

  return false;
}

function hasCompactAsciiMatch(textTokens: string[], keywordTokens: string[]) {
  if (!keywordTokens.every(isAsciiToken)) {
    return false;
  }

  const compactKeyword = keywordTokens.join("");

  return textTokens.some((token) => isAsciiToken(token) && token === compactKeyword);
}

export function matchesKeyword(text: string, keyword: string) {
  const normalizedText = normalizeKeywordText(text);
  const normalizedKeyword = normalizeKeywordText(keyword).trim();

  if (normalizedKeyword.length === 0) {
    return false;
  }

  const textTokens = tokenize(normalizedText);
  const keywordTokens = tokenize(normalizedKeyword);

  if (keywordTokens.length === 0) {
    return normalizedText.includes(normalizedKeyword);
  }

  if (hasContiguousTokenSequence(textTokens, keywordTokens)) {
    return true;
  }

  if (hasCompactAsciiMatch(textTokens, keywordTokens)) {
    return true;
  }

  if (keywordTokens.every(isAsciiToken)) {
    return false;
  }

  return normalizedText.includes(normalizedKeyword);
}

export function matchesAnyKeyword(text: string, keywords: string[]) {
  return keywords.some((keyword) => matchesKeyword(text, keyword));
}
