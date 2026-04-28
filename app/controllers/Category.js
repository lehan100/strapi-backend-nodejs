const express = require('express');
const axios = require('axios');
const qs = require('qs');
const { strapiBase } = require('../../config/constants');
const { getCategoryPageController } = require('./category/pages');
const { toAbsoluteUrl } = require('../../config/media');

const router = express.Router();

const getCategoryIdentifier = (category) =>
  category?.documentId || category?.id || category?.attributes?.documentId || category?.attributes?.id || '';

const pickString = (obj, keys = []) => {
  for (const key of keys) {
    const value = obj?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
};

const toBreadcrumbUrl = (item) => {
  const explicitUrl = pickString(item, ['url', 'link', 'path', 'href']);
  if (explicitUrl) return explicitUrl;

  const slug = pickString(item, ['slug']);
  const pageType = pickString(item, ['page_type', 'pageType']);

  if (pageType === 'homepage' || slug === '/' || slug === 'home') {
    return '/';
  }

  if (!slug) return '';
  if (slug.startsWith('/')) return slug;

  return `/category/${slug}`;
};

const normalizeBreadcrumbItem = (raw) => {
  const source = raw?.attributes ? { ...raw.attributes, ...raw } : raw || {};
  const name = pickString(source, ['name', 'title']);

  if (!name) return null;

  return {
    name,
    slug: pickString(source, ['slug']),
    url: toBreadcrumbUrl(source),
  };
};

const normalizeBreadcrumbPayload = (payload) => {
  const candidates = [
    payload?.data,
    payload?.data?.data,
    payload?.data?.items,
    payload?.items,
    payload,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.map(normalizeBreadcrumbItem).filter(Boolean);
    }
  }

  return [];
};

const fetchBreadcrumbTrail = async ({ slug, documentId }) => {
  if (!slug && !documentId) return [];

  const endpoints = [];
  if (slug) {
    endpoints.push(`${strapiBase}/api/categories/breadcrumb/slug/${encodeURIComponent(slug)}?position=is_header`);
  }
  if (documentId) {
    endpoints.push(`${strapiBase}/api/categories/breadcrumb/document/${encodeURIComponent(documentId)}?position=is_header`);
  }

  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(endpoint);
      const items = normalizeBreadcrumbPayload(response.data);
      if (items.length > 0) return items;
    } catch (error) {
      // Thu endpoint tiep theo neu co
    }
  }

  return [];
};

router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const requestedLocale = String(res.locals.currentLanguage || req.language || '').trim();
    const localeCandidates = [requestedLocale, 'vi', 'en', 'all'].filter(Boolean);

    let category = null;
    for (const locale of localeCandidates) {
      const categoryQuery = qs.stringify(
        {
          filters: {
            slug: { $eq: slug },
          },
          populate: '*',
          pagination: {
            page: 1,
            pageSize: 1,
          },
          locale,
        },
        {
          encodeValuesOnly: true,
        },
      );

      const categoryResponse = await axios.get(`${strapiBase}/api/categories?${categoryQuery}`);
      category = categoryResponse.data?.data?.[0] || null;
      if (category) break;
    }

    if (!category) {
      return res.status(404).render('pages/404', { category: null, slug });
    }

    const documentId = getCategoryIdentifier(category);
    let breadcrumbTrail = await fetchBreadcrumbTrail({ slug, documentId });

    if (!breadcrumbTrail.length && category?.name) {
      breadcrumbTrail = [{ name: category.name, slug, url: '' }];
    }

    const targetPageRaw = (category.target_page || '').toString().trim();
    const pageController = getCategoryPageController(targetPageRaw);

    return pageController({
      req,
      res,
      axios,
      qs,
      strapiBase,
      category,
      breadcrumbTrail,
      slug,
      targetPageRaw,
      toAbsoluteUrl,
    });
  } catch (error) {
    console.error('Category fetch error:', error.message);
    return res.status(404).render('pages/404', { category: null, slug: req.params.slug });
  }
});

module.exports = router;
