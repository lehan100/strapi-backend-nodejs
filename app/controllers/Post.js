const express = require('express');
const axios = require('axios');
const qs = require('qs');
const { strapiBase, strapiApiToken } = require('../../config/constants');
const { normalizeSingleComponent } = require('./shared/content');

const router = express.Router();

const pickSource = (item) => (item?.attributes ? { ...item.attributes, ...item } : (item || {}));

const toAbsoluteUrl = (media, fallback = '/img/1.jpg') => {
  const source = pickSource(media);
  const urlRaw = source?.url || source?.formats?.large?.url || source?.formats?.medium?.url || source?.formats?.small?.url || '';
  if (!urlRaw) return fallback;
  return urlRaw.startsWith('http') ? urlRaw : `${strapiBase}${urlRaw}`;
};



const normalizePostItem = (rawItem) => {
  const item = pickSource(rawItem);
  const category = pickSource(item.category);
  const createdAt = item.publishedAt || item.createdAt || null;

  return {
    id: item.id || item.documentId || '',
    documentId: item.documentId || '',
    name: item.name || '',
    slug: item.slug || '',
    description: item.description || '',
    content: item.content || '',
    categoryName: category.name || '',
    categorySlug: category.slug || '',
    categoryDocumentId: category.documentId || '',
    photoUrl: toAbsoluteUrl(item.photo, '/img/1.jpg'),
    createdAt,
    seo: normalizeSingleComponent(item.seo),
  };
};

const incrementPostHit = async (postRaw) => {
  const source = pickSource(postRaw);
  const postId = source?.id;
  if (!postId) return;

  const currentHit = Number(source?.hit || 0);
  const nextHit = Number.isFinite(currentHit) ? currentHit + 1 : 1;
  const headers = {};

  if (strapiApiToken) {
    headers.Authorization = `Bearer ${strapiApiToken}`;
  }

  try {
    await axios.put(
      `${strapiBase}/api/posts/${postId}`,
      { data: { hit: nextHit } },
      { headers },
    );
  } catch (error) {
    console.warn('Không thể cập nhật hit cho bài viết:', error.response?.data || error.message);
  }
};

const fetchPostBySlug = async (slug) => {
  const query = qs.stringify(
    {
      filters: {
        slug: { $eq: slug },
        active: { $eq: true },
      },
      populate: {
        photo: { populate: '*' },
        category: { populate: '*' },
        seo: { populate: '*' },
      },
      pagination: { page: 1, pageSize: 1 },
    },
    { encodeValuesOnly: true },
  );

  const response = await axios.get(`${strapiBase}/api/posts?${query}`);
  return response.data?.data?.[0] || null;
};

const fetchMostViewedPosts = async (excludeDocumentId = '') => {
  const filters = { active: { $eq: true } };
  if (excludeDocumentId) {
    filters.documentId = { $ne: excludeDocumentId };
  }

  const query = qs.stringify(
    {
      filters,
      sort: ['hit:desc', 'publishedAt:desc', 'createdAt:desc'],
      populate: {
        photo: { populate: '*' },
        category: { populate: '*' },
      },
      pagination: { page: 1, pageSize: 4 },
    },
    { encodeValuesOnly: true },
  );

  const response = await axios.get(`${strapiBase}/api/posts?${query}`);
  return response.data?.data || [];
};

const fetchRelatedPosts = async ({ excludeDocumentId = '', categoryDocumentId = '' }) => {
  const filters = { active: { $eq: true } };
  if (excludeDocumentId) {
    filters.documentId = { $ne: excludeDocumentId };
  }
  if (categoryDocumentId) {
    filters.category = { documentId: { $eq: categoryDocumentId } };
  }

  const query = qs.stringify(
    {
      filters,
      sort: ['publishedAt:desc', 'createdAt:desc'],
      populate: {
        photo: { populate: '*' },
        category: { populate: '*' },
      },
      pagination: { page: 1, pageSize: 6 },
    },
    { encodeValuesOnly: true },
  );

  const response = await axios.get(`${strapiBase}/api/posts?${query}`);
  return response.data?.data || [];
};

router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const postRaw = await fetchPostBySlug(slug);

    if (!postRaw) {
      return res.status(404).render('pages/404', { category: null, slug });
    }

    await incrementPostHit(postRaw);

    const post = normalizePostItem(postRaw);
    const [hotPostsRaw, relatedPostsRaw] = await Promise.all([
      fetchMostViewedPosts(post.documentId),
      fetchRelatedPosts({
        excludeDocumentId: post.documentId,
        categoryDocumentId: post.categoryDocumentId,
      }),
    ]);

    const hotPosts = hotPostsRaw.map(normalizePostItem).filter((item) => item.name);
    const relatedPosts = relatedPostsRaw.map(normalizePostItem).filter((item) => item.name);

    res.locals.pageTitle = post.seo?.metaTitle || post.name || '';
    res.locals.pageDescription = post.seo?.metaDescription || post.description || '';
    res.locals.pageKeywords = post.seo?.keywords || '';
    res.locals.ogTitle = post.seo?.ogTitle || post.name || '';
    res.locals.ogDescription = post.seo?.ogDescription || post.description || '';

    return res.render('post/detail', {
      post,
      hotPosts,
      relatedPosts,
      slug,
    });
  } catch (error) {
    console.error('Lỗi tải post detail:', error.message);
    if (error.response?.data) {
      console.error('Strapi error detail:', JSON.stringify(error.response.data, null, 2));
    }

    return res.status(404).render('pages/404', { category: null, slug: req.params.slug });
  }
});

module.exports = router;
