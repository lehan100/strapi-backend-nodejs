const { normalizeSingleComponent } = require('../../shared/content');

const POST_QUERY = {
  populate: {
    banner: { populate: '*' },
    featured: {
      populate: {
        items: {
          populate: {
            photo: { populate: '*' },
            category: { populate: '*' },
          },
        },
      },
    },
    seo: { populate: '*' },
  },
};
const POST_PAGE_SIZE = 6;

const pickSource = (item) => (item?.attributes ? { ...item.attributes, ...item } : (item || {}));

const normalizePostItems = (items = [], toAbsoluteUrl) =>
  (Array.isArray(items) ? items : []).map((rawItem) => {
    const item = pickSource(rawItem);
    const category = pickSource(item.category);
    const createdAt = item.publishedAt || item.createdAt || null;

    return {
      id: item.id || item.documentId || '',
      documentId: item.documentId || '',
      name: item.name || '',
      slug: item.slug || '',
      description: item.description || '',
      categoryName: category.name || '',
      photoUrl: toAbsoluteUrl ? toAbsoluteUrl(item.photo, '/img/1.jpg') : '/img/1.jpg',
      createdAt,
    };
  }).filter((item) => item.name);

const renderPage = async ({ req, res, category, slug, axios, qs, strapiBase, toAbsoluteUrl }) => {
  try {
    const pageFromQuery = Number.parseInt(String(req?.query?.page || '1'), 10);
    const currentPage = Number.isNaN(pageFromQuery) || pageFromQuery < 1 ? 1 : pageFromQuery;

    const query = qs.stringify(POST_QUERY, { encodeValuesOnly: true });
    const response = await axios.get(`${strapiBase}/api/page-post?${query}`);
    const data = response.data?.data || {};
    const seo = normalizeSingleComponent(data.seo);
    res.locals.pageTitle = seo?.metaTitle || category?.name || '';
    res.locals.pageDescription = seo?.metaDescription || '';
    res.locals.pageKeywords = seo?.keywords || '';
    res.locals.ogTitle = seo?.ogTitle || '';
    res.locals.ogDescription = seo?.ogDescription || '';
    const banner = normalizeSingleComponent(data.banner);
    data.banner = {
      ...banner,
      urlPhoto: toAbsoluteUrl ? toAbsoluteUrl(banner?.photo, '/img/1.jpg') : '/img/1.jpg',
    };

    const featured = normalizeSingleComponent(data.featured);
    data.featured = featured;
    data.featuredItems = normalizePostItems(featured?.items, toAbsoluteUrl);

    const postQuery = qs.stringify(
      {
        filters: {
          active: { $eq: true },
        },
        populate: {
          photo: { populate: '*' },
          category: { populate: '*' },
        },
        sort: ['publishedAt:desc', 'createdAt:desc'],
        pagination: {
          page: currentPage,
          pageSize: POST_PAGE_SIZE,
        },
      },
      { encodeValuesOnly: true },
    );

    const postsResponse = await axios.get(`${strapiBase}/api/posts?${postQuery}`);
    const postItemsRaw = postsResponse.data?.data || [];
    const postPaginationRaw = postsResponse.data?.meta?.pagination || {};

    data.postItems = normalizePostItems(postItemsRaw, toAbsoluteUrl);
    data.postPagination = {
      page: Number(postPaginationRaw.page || currentPage),
      pageSize: Number(postPaginationRaw.pageSize || POST_PAGE_SIZE),
      pageCount: Number(postPaginationRaw.pageCount || 1),
      total: Number(postPaginationRaw.total || 0),
    };

    return res.render('pages/Post', { category, slug, data });
  } catch (error) {
    console.error('Lỗi tải page-contact:', error.message);
    if (error.response?.data) {
      console.error('Strapi error detail:', JSON.stringify(error.response.data, null, 2));
    }
    return res.status(404).render('pages/404', { category, slug });
  }
}
module.exports = renderPage;
