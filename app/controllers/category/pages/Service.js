const { buildHumanResourceLink, normalizeSingleComponent } = require("../../shared/content");
const { fetchStrapiEntry, hydrateRelatedItems } = require("../../shared/strapi");
const { markdownToHtml } = require("../../../../config/rich-text");
const SERVICE_QUERY = {
  populate: {
    banner: { populate: '*' },
    seo: { populate: '*' },
    info : { populate: '*' },
    numbers: { populate: '*' },
    human_resources: { populate: '*' },
  },
};
const renderPage = async ({ res, category, slug, axios, qs, strapiBase, toAbsoluteUrl }) => {
    try {
        const strapiContext = { axios, qs, strapiBase };
        const query = qs.stringify(SERVICE_QUERY, { encodeValuesOnly: true });
        const response = await axios.get(`${strapiBase}/api/page-service?${query}`);
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

        const info = normalizeSingleComponent(data.info);
        data.info = {
          ...info,
          urlPhoto: toAbsoluteUrl ? toAbsoluteUrl(info?.photo, '/img/1.jpg') : '/img/1.jpg',
          descriptionHtml: markdownToHtml(info?.description || ''),
        };

        const numbers = normalizeSingleComponent(data.numbers);
        const numberSetRef = normalizeSingleComponent(numbers?.items);
        const numberSetIdentifier = numberSetRef?.documentId || numberSetRef?.id;
        const numberSet = await fetchStrapiEntry(strapiContext, "achievement-sets", numberSetIdentifier, {
          populate: { items: { populate: "*" } },
        });

        data.numbers = {
          ...numbers,
          title: numberSet?.title || numberSetRef?.title || '',
          backgroundUrl: toAbsoluteUrl ? toAbsoluteUrl(numbers?.background, './img/15.png') : './img/15.png',
          items: Array.isArray(numberSet?.items) ? numberSet.items : [],
        };

        const humanResource = normalizeSingleComponent(data.human_resources);
        const hydratedHumanResourceItems = await hydrateRelatedItems(
          strapiContext,
          humanResource?.items,
          "human-resources",
          (item) => ({
            ...item,
            photoUrl: toAbsoluteUrl ? toAbsoluteUrl(item?.photo, "/img/default-achievement.png") : "/img/default-achievement.png",
            detailLink: buildHumanResourceLink(item),
          }),
        );

        data.human_resources = {
          ...humanResource,
          iconUrl: toAbsoluteUrl ? toAbsoluteUrl(humanResource?.icon, "/img/default-customer.png") : "/img/default-customer.png",
          items: hydratedHumanResourceItems,
        };

        return res.render("pages/Service", { category, slug, data });
    
    } catch (error) {
        console.error("Lỗi tải page-service:", error.message);
        if (error.response?.data) {
            console.error("Strapi error detail:", JSON.stringify(error.response.data, null, 2));
        }
        return res.status(404).render("pages/404", { category, slug });
    }
};

module.exports = renderPage;
