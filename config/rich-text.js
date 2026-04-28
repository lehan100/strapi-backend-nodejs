const { marked } = require("marked");

const blocksToMarkdown = (blocks) => {
  if (!Array.isArray(blocks)) return "";

  return blocks
    .map((block) => {
      if (!block || typeof block !== "object") return "";
      const text = Array.isArray(block.children)
        ? block.children.map((child) => (child && child.text) || "").join("").trim()
        : "";
      if (!text) return "";

      if (block.type === "heading") {
        const rawLevel = Number(block.level);
        const level = Number.isFinite(rawLevel) && rawLevel >= 1 && rawLevel <= 6 ? rawLevel : 1;
        return `${"#".repeat(level)} ${text}`;
      }

      return text;
    })
    .filter(Boolean)
    .join("\n\n");
};

const markdownToHtml = (input) => {
  const markdown = Array.isArray(input) ? blocksToMarkdown(input) : String(input || "");
  const source = markdown.trim();
  if (!source) return "";
  return marked.parse(source, { async: false });
};

module.exports = {
  markdownToHtml,
};
