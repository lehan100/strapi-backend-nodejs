const { normalizeSingleComponent } = require('../../shared/content');

const CONTACT_QUERY = {
  populate: {
    banner: { populate: '*' },
    info: { populate: '*' },
    address: { populate: '*' },
    certification: { populate: { photo: { populate: '*' }, certification_items: { populate: '*' } } },
    seo: { populate: '*' },
  },
};

const renderPage = async ({ res, category, slug, axios, qs, strapiBase, toAbsoluteUrl }) => {
  try {
    const query = qs.stringify(CONTACT_QUERY, { encodeValuesOnly: true });
    const response = await axios.get(`${strapiBase}/api/page-contact?${query}`);
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

    const rawAddressItems = Array.isArray(data.address)
      ? data.address
      : (Array.isArray(data.addresses) ? data.addresses : []);

    data.addressItems = rawAddressItems.map((item) => ({
      title: item?.title || '',
      address: item?.address || '',
      phone: item?.phone || '',
      fax: item?.fax || '',
    }));

    const certification = data.certification || {};
    const certificationItems = Array.isArray(certification?.certification_items)
      ? certification.certification_items
      : [];

    data.certificationData = {
      title: certification?.title || '',
      titleRefix: certification?.title_refix || '',
      photoUrl: toAbsoluteUrl ? toAbsoluteUrl(certification?.photo, '/img/16.png') : '/img/16.png',
      items: certificationItems.map((item) => ({
        title: item?.title || '',
        code: item?.code || '',
      })),
    };

    return res.render('pages/Contact', { category, slug, data });
  } catch (error) {
    console.error('Lỗi tải page-contact:', error.message);
    if (error.response?.data) {
      console.error('Strapi error detail:', JSON.stringify(error.response.data, null, 2));
    }
    return res.status(404).render('pages/404', { category, slug });
  }
};

module.exports = renderPage;
