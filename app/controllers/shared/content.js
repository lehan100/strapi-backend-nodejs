const normalizeSingleComponent = (value) => {
  if (Array.isArray(value)) return value[0] || {};
  return value || {};
};

const getSlug = (entity) => {
  if (!entity) return '';
  return entity.slug || entity?.data?.slug || entity?.data?.attributes?.slug || '';
};

const buildHumanResourceLink = (item) => {
  const itemSlug = getSlug(item);
  return itemSlug ? `/recruitment/${itemSlug}` : '#';
};

module.exports = {
  normalizeSingleComponent,
  getSlug,
  buildHumanResourceLink,
};
