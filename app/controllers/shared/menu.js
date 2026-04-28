const pickString = (obj, keys = []) => {
  for (const key of keys) {
    const value = obj?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
};

const toMenuUrl = (item) => {
  const explicitUrl = pickString(item, ['url', 'link', 'path', 'href']);
  if (explicitUrl) return explicitUrl;

  const slug = pickString(item, ['slug']);
  const pageType = pickString(item, ['page_type', 'pageType']);

  if (pageType === 'homepage' || slug === '/' || slug === 'home') {
    return '/';
  }

  if (!slug) return '#';
  if (slug.startsWith('/')) return slug;

  return `/category/${slug}`;
};

const getMenuChildrenRaw = (item) => {
  const candidates = [item?.children, item?.childrens, item?.items, item?.subcategories, item?.sub_categories];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
    if (candidate?.data && Array.isArray(candidate.data)) return candidate.data;
  }
  return [];
};

const normalizeMenuItem = (raw) => {
  const source = raw?.attributes ? { ...raw.attributes, ...raw } : raw || {};
  const childrenRaw = getMenuChildrenRaw(source);
  const children = childrenRaw
    .map(normalizeMenuItem)
    .filter((item) => item && item.name);

  return {
    id: source?.id || '',
    documentId: pickString(source, ['documentId']) || '',
    name: pickString(source, ['name', 'title']),
    icon: pickString(source, ['icon']),
    slug: pickString(source, ['slug']),
    url: toMenuUrl(source),
    children,
  };
};

const parseMenuTreeResponse = (payload) => {
  const candidates = [
    payload?.data,
    payload?.data?.data,
    payload?.data?.items,
    payload?.items,
    payload?.menu,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.map(normalizeMenuItem).filter((item) => item && item.name);
    }
  }

  return [];
};

const flattenMenuItems = (items = []) => {
  const result = [];
  const stack = Array.isArray(items) ? [...items] : [];

  while (stack.length > 0) {
    const item = stack.shift();
    if (!item) continue;
    result.push(item);

    if (Array.isArray(item.children) && item.children.length > 0) {
      stack.unshift(...item.children);
    }
  }

  return result;
};

const resolvePolicyLinks = (bottomCategories = [], options = {}) => {
  const {
    menuTermsDocumentId = '',
    menuPrivacyDocumentId = '',
    menuTermsId = '',
    menuPrivacyId = '',
  } = options;

  const bottomTreeItems = Array.isArray(bottomCategories) ? bottomCategories : [];
  const bottomItems = flattenMenuItems(bottomTreeItems);

  const termsItem = bottomItems.find((item = {}) => {
    const itemDocumentId = String(item.documentId || '').trim();
    const itemId = String(item.id || '').trim();
    return (
      (menuTermsDocumentId && itemDocumentId === String(menuTermsDocumentId).trim()) ||
      (menuTermsId && itemId === String(menuTermsId).trim())
    );
  });

  const privacyItem = bottomItems.find((item = {}) => {
    const itemDocumentId = String(item.documentId || '').trim();
    const itemId = String(item.id || '').trim();
    return (
      (menuPrivacyDocumentId && itemDocumentId === String(menuPrivacyDocumentId).trim()) ||
      (menuPrivacyId && itemId === String(menuPrivacyId).trim())
    );
  });

  return {
    termsLink: termsItem?.url || '#',
    privacyLink: privacyItem?.url || '#',
  };
};

const buildCategoryIconMap = (categories = []) => {
  const map = new Map();
  const list = Array.isArray(categories) ? categories : [];

  for (const item of list) {
    const docId = String(item.documentId || '');
    const slug = String(item.slug || '');
    const icon = item.icon || '';
    if (docId) map.set(`doc:${docId}`, icon);
    if (slug) map.set(`slug:${slug}`, icon);
  }

  return map;
};

const attachMenuIcons = (items = [], categories = []) => {
  const iconMap = buildCategoryIconMap(categories);
  const source = Array.isArray(items) ? items : [];

  const walk = (nodes = []) => nodes.map((item = {}) => {
    const docId = String(item.documentId || '');
    const slug = String(item.slug || '');
    const mappedIcon = (docId && iconMap.get(`doc:${docId}`))
      || (slug && iconMap.get(`slug:${slug}`))
      || '';

    return {
      ...item,
      icon: mappedIcon || item.icon || '',
      children: walk(item.children),
    };
  });

  return walk(source);
};

module.exports = {
  attachMenuIcons,
  parseMenuTreeResponse,
  resolvePolicyLinks,
};
