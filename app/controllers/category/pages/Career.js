
const { normalizeSingleComponent } = require("../../shared/content");
const { markdownToHtml } = require("../../../../config/rich-text");

const toDescriptionHtml = (value) => {
  const text = String(value || "").trim();
  if (/<[a-z][\s\S]*>/i.test(text)) return text;
  return markdownToHtml(value);
};

const CAREER_QUERY = {
  populate: {
    banner: { populate: '*' },
    seo: { populate: '*' },
    // Avoid strict component UID keys here; content model may vary by environment.
    blocks: {
     populate: "*",
      on: {
        'career.lam-viec-tai-nha-linh-hoat': { 
          populate: {
            items: {
              populate: {
                photo: { populate: "*" },
              },
            },
          },
        },
        'career.lam-viec-tai-nha': { 
          populate: {
            items: {
              populate: {
                photo: { populate: "*" },
              },
            },
          },
        },
        'career.goc-chia-se': { 
          populate: {
            items: {
              populate: {
                photo: { populate: "*" },
              },
            },
          },
        },
        'career.tuyen-dung-nhu-the-nao': { 
          populate: {
            items: {
              populate: {
                photo: { populate: "*" },
              },
            },
          },
        },
        'career.image-galaxy': { 
          populate: {
            items: {
              populate: {
                photo: { populate: "*" },
              },
            },
          },
        },
      }
    },
  },
};
const hydrateBlock = async (block, { toAbsoluteUrl, axios, qs, strapiBase }) => {
  const componentKey = (block?.__component || "").toLowerCase();

  if (componentKey === "career.lam-viec-tai-nha-linh-hoat") {
   const items = Array.isArray(block?.items) ? block.items : [];
   return {
      ...block,
      items: items.map((item) => ({
        ...item,
        photoUrl: toAbsoluteUrl(item?.photo, ""),
        descriptionHtml: toDescriptionHtml(item?.description),
      })),
    };
  }
  if (componentKey === "career.lam-viec-tai-nha") {
   const items = Array.isArray(block?.items) ? block.items : [];
   return {
      ...block,
      items: items.map((item) => ({
        ...item,
        photoUrl: toAbsoluteUrl(item?.photo, ""),
        descriptionHtml: toDescriptionHtml(item?.description),
      })),
    };
  }
  if (componentKey === "career.goc-chia-se") {
   const items = Array.isArray(block?.items) ? block.items : [];
   return {
      ...block,
      items: items.map((item) => ({
        ...item,
        photoUrl: toAbsoluteUrl(item?.photo, ""),
        descriptionHtml: toDescriptionHtml(item?.description),
      })),
    };
  }
  if (componentKey === "career.tuyen-dung-nhu-the-nao") {
   const items = Array.isArray(block?.items) ? block.items : [];
   return {
      ...block,
      items: items.map((item) => ({
        ...item,
        photoUrl: toAbsoluteUrl(item?.photo, ""),
        descriptionHtml: toDescriptionHtml(item?.description),
      })),
    };
  }
  if (componentKey === "career.image-galaxy") {
   const items = Array.isArray(block?.items) ? block.items : [];
   return {
      ...block,
      items: items.map((item) => ({
        ...item,
        photoUrl: toAbsoluteUrl(item?.photo, "")
      })),
    };
  }
  //console.log(block);
  return block;
};
const renderPage = async ({ res, category, slug, axios, qs, strapiBase, toAbsoluteUrl }) => {
  try {
    const query = qs.stringify(CAREER_QUERY, { encodeValuesOnly: true });
    const response = await axios.get(`${strapiBase}/api/page-career?${query}`);
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
    data.blocks = await Promise.all(
      (Array.isArray(data.blocks) ? data.blocks : []).map((block) =>
        hydrateBlock(block, { toAbsoluteUrl, axios, qs, strapiBase })
      )
    );
    return res.render("pages/Career", { category, slug, data });
  } catch (error) {
    console.error("Lỗi tải page-career:", error.message);
    if (error.response?.data) {
      console.error("Strapi error detail:", JSON.stringify(error.response.data, null, 2));
    }
    return res.status(404).render("pages/404", {
      category,
      slug,
    });
  }
};
module.exports = renderPage;
