const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function parseValue(rawValue) {
  const trimmed = rawValue.trim();
  const unquoted = trimmed.replace(/^["'](.*)["']$/, "$1");
  return unquoted;
}

/**
 * Splits a raw markdown file into frontmatter data and body content.
 * Frontmatter format: a leading `--- \n key: value \n --- ` block.
 * Recognized fields: title, date (strings), tags (comma-separated -> array), excerpt (string).
 * Any other key is kept as a plain string. Returns { data: {}, content } if no block is found.
 */
export function parseFrontmatter(raw) {
  const match = raw.match(FRONTMATTER_RE);
  if (!match) {
    return { data: {}, content: raw };
  }

  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim()) continue;
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) continue;
    const key = line.slice(0, separatorIndex).trim();
    const value = parseValue(line.slice(separatorIndex + 1));
    if (key === "tags") {
      data.tags = value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
    } else {
      data[key] = value;
    }
  }

  return { data, content: raw.slice(match[0].length) };
}
