const { strapiBase } = require("./constants");

const getMediaUrl = (media) => {
  if (!media) return "";
  if (typeof media === "string") return media;

  return (
    media.url ||
    media?.data?.url ||
    media?.data?.attributes?.url ||
    media?.attributes?.url ||
    ""
  );
};

const toAbsoluteUrl = (media, fallback = "") => {
  const fileUrl = getMediaUrl(media);
  if (!fileUrl) return fallback;
  return fileUrl.startsWith("http") ? fileUrl : strapiBase + fileUrl;
};

module.exports = {
  getMediaUrl,
  toAbsoluteUrl,
};