const fs = require("fs");
const path = require("path");

const defaultController = require("./Default");

const getCategoryPageController = (targetPageRaw) => {
  const key = (targetPageRaw || "").toString().trim();
  const isSafeName = /^[a-zA-Z0-9_-]+$/.test(key);

  if (!key || !isSafeName) {
    return defaultController;
  }

  const files = fs
    .readdirSync(__dirname)
    .filter((file) => file.endsWith(".js") && file !== "index.js");

  const matchedFile = files.find(
    (file) => path.basename(file, ".js").toLowerCase() === key.toLowerCase()
  );

  if (!matchedFile) {
    return defaultController;
  }

  return require(path.join(__dirname, matchedFile));
};

module.exports = {
  getCategoryPageController,
};

