import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatter } from "../js/markdown/frontmatter.js";
import { markdownToHtml } from "../js/markdown/parser.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const postsDir = join(__dirname, "..", "posts");

function toExcerpt(body) {
  const plain = body
    .replace(/```[\s\S]*?```/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#>*`_-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > 160 ? `${plain.slice(0, 160).trim()}...` : plain;
}

function buildPosts() {
  const files = readdirSync(postsDir).filter((file) => file.endsWith(".md"));

  const posts = files.map((file) => {
    const raw = readFileSync(join(postsDir, file), "utf8");
    const { data, content } = parseFrontmatter(raw);

    const missing = ["title", "date"].filter((field) => !data[field]);
    if (missing.length) {
      throw new Error(`Post "${file}" is missing required frontmatter field(s): ${missing.join(", ")}`);
    }

    return {
      slug: basename(file, ".md"),
      title: data.title,
      date: data.date,
      tags: data.tags ?? [],
      excerpt: data.excerpt ?? toExcerpt(content),
      contentHtml: markdownToHtml(content),
    };
  });

  posts.sort((a, b) => new Date(b.date) - new Date(a.date));

  const outputPath = join(postsDir, "posts-data.js");
  writeFileSync(outputPath, `window.BLOG_POSTS = ${JSON.stringify(posts, null, 2)};\n`);
  console.log(`Wrote posts/posts-data.js with ${posts.length} post(s).`);
}

buildPosts();
