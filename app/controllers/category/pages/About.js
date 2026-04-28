const { normalizeSingleComponent, buildHumanResourceLink } = require("../../shared/content");
const { fetchStrapiEntry, hydrateRelatedItems } = require("../../shared/strapi");
const { markdownToHtml } = require("../../../../config/rich-text");

const ABOUT_QUERY = {
  populate: {
    banner: { populate: "*" },
    info: { populate: "*" },
    seo: { populate: "*" },

    blocks: {
      on: {
        "about.uu-diem": {
          populate: {
            items: {
              populate: {
                icon: { populate: "*" },
              },
            },
          },
        },
        "shares.thanh-tuu": { populate: "*" },
        "about.lich-su-hinh-thanh": {
          populate: {
            items: {
              populate: {
                photo: { populate: "*" },
              },
            },
          },
        },
        "shares.doi-tac": {
          populate: "*"
        },
        "homepage.giai-phap-nhan-su": {
          populate: "*"
        },
        "shares.chung-chi-chung-nhan": { populate: "*" },
        "about.doi-ngu-quan-ly": {
          populate: "*"
        },
      },
    },
  },
};

const hydrateBlock = async (block, { toAbsoluteUrl, axios, qs, strapiBase }) => {
  const componentKey = (block?.__component || "").toLowerCase();
  const context = { axios, qs, strapiBase };

  if (componentKey === "about.uu-diem") {
    const items = Array.isArray(block?.items) ? block.items : [];
    return {
      ...block,
      items: items.map((item) => ({
        ...item,
        iconUrl: toAbsoluteUrl(item?.icon, ""),
      })),
    };
  }
  const relatedItems = Array.isArray(block?.items) ? block.items : [];

  if (componentKey === "shares.thanh-tuu") {
    const relationItems = block?.item ? [block.item] : relatedItems;
    const entries = await hydrateRelatedItems(context, relationItems, "achievement-sets", (entry) => entry);
    const entry = entries[0] || null;

    return {
      ...block,
      title: entry?.title || "",
      icon: entry?.icon || "arrow-up-right",
      items: Array.isArray(entry?.items)
        ? entry.items.map((item) => ({
          ...item,
          photoUrl: toAbsoluteUrl(item?.photo, "/img/default-achievement.png"),
        }))
        : [],
    };
  }

  if (componentKey === "shares.doi-tac") {
    const entries = await hydrateRelatedItems(
      context,
      relatedItems,
      "partner-sets",
      (entry) => entry,
      { populate: { item_logos: { populate: "*" } } }
    );
    const entry = entries[0] || null;

    return {
      ...block,
      title: entry?.title || "",
      items: Array.isArray(entry?.item_logos)
        ? entry.item_logos.map((item) => ({
          ...item,
          photoUrl: toAbsoluteUrl(item?.photo, "/img/default-customer.png"),
        }))
        : [],
    };
  }

  if (componentKey === "about.lich-su-hinh-thanh") {
    const hydratedItems = await hydrateRelatedItems(
      context,
      relatedItems,
      "share-histories",
      (item) => ({
        ...item,
        photoUrl: toAbsoluteUrl(item?.photo, "/img/default-achievement.png"),
      }),
    );

    return {
      ...block,
      title: block?.title || "",
      items: hydratedItems,
    };
  }
  if (componentKey === "homepage.giai-phap-nhan-su") {
    const hydratedItems = await hydrateRelatedItems(
      context,
      block?.items,
      "human-resources",
      (item) => ({
        ...item,
        photoUrl: toAbsoluteUrl(item?.photo, "./img/default-achievement.png"),
        detailLink: buildHumanResourceLink(item),
      }),
    );

    const newData = {
      ...block,
      iconUrl: toAbsoluteUrl(block?.icon, "/img/default-customer.png"),
      items: hydratedItems,
    };
    return newData;
  }
  if (componentKey === "about.doi-ngu-quan-ly") {
    const hydratedItems = await hydrateRelatedItems(
      context,
      block?.items,
      "event-participants",
      (item) => ({
        ...item,
        photoUrl: toAbsoluteUrl(item?.photo, "/img/1.jpg"),
      }),
    );

    return {
      ...block,
      title: block?.title || "",
      items: hydratedItems,
    };
  }
  if (componentKey === "shares.chung-chi-chung-nhan") {
    const relationItems = block?.item ? [block.item] : relatedItems;
    const entries = await hydrateRelatedItems(
      context,
      relationItems,
      "share-certificates",
      (entry) => entry,
      { populate: { items: { populate: "*" } } }
    );
    const entry = entries[0] || null;

    return {
      ...block,
      title: entry?.title || "",
      items: Array.isArray(entry?.items)
        ? entry.items.map((item) => ({
          ...item,
          photoUrl: toAbsoluteUrl(item?.photo, "/img/default-customer.png"),
        }))
        : [],
    };
  }
  return block;
};

module.exports = async ({ res, category, slug, axios, qs, strapiBase, toAbsoluteUrl }) => {
  try {
    const query = qs.stringify(ABOUT_QUERY, { encodeValuesOnly: true });
    const response = await axios.get(`${strapiBase}/api/page-about?${query}`);
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
      urlPhoto: toAbsoluteUrl(banner.photo),
    };

    const info = normalizeSingleComponent(data.info);
    data.info = {
      ...info,
      descriptionHtml: markdownToHtml(info?.description || ""),
    };
    data.blocks = await Promise.all(
      (Array.isArray(data.blocks) ? data.blocks : []).map((block) =>
        hydrateBlock(block, { toAbsoluteUrl, axios, qs, strapiBase })
      )
    );
    return res.render("pages/About", { category, slug, data });
  } catch (error) {
    console.error("Lỗi tải page-about:", error.message);
    if (error.response?.data) {
      console.error("Strapi error detail:", JSON.stringify(error.response.data, null, 2));
    }
    return res.status(404).render("pages/404", {
      category,
      slug,
    });
  }
};
