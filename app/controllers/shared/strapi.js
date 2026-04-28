const fetchStrapiEntry = async (context, endpoint, identifier, queryObject = { populate: '*' }) => {
  if (!identifier) return null;

  const query = context.qs.stringify(queryObject, { encodeValuesOnly: true });
  const response = await context.axios.get(`${context.strapiBase}/api/${endpoint}/${identifier}?${query}`);
  return response.data?.data || null;
};

const hydrateRelatedItems = async (context, items, endpoint, mapper, queryObject = { populate: '*' }) => {
  if (!Array.isArray(items) || items.length === 0) return [];

  const entries = await Promise.all(
    items.map(async (item) => {
      const identifier = item?.documentId || item?.id;
      const entry = await fetchStrapiEntry(context, endpoint, identifier, queryObject);
      return mapper(entry || item);
    }),
  );

  return entries.filter(Boolean);
};

module.exports = {
  fetchStrapiEntry,
  hydrateRelatedItems,
};
