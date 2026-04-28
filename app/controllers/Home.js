const axios = require("axios");
const express = require("express");
const moment = require("moment");
const qs = require("qs");
const { strapiBase } = require("../../config/constants");
const {  toAbsoluteUrl } = require("../../config/media");
const { markdownToHtml } = require("../../config/rich-text");
const { normalizeSingleComponent, buildHumanResourceLink } = require("./shared/content");
const { fetchStrapiEntry, hydrateRelatedItems } = require("./shared/strapi");

const router = express.Router();

const HOME_QUERY = {
    populate: {
        video: { populate: "*" },
        seo: { populate: "*" },
        blocks: { populate: "*" },
    },
};
const getEventDateParts = (timeStart) => {
    const date = timeStart ? moment(timeStart) : null;
    if (!date || !date.isValid()) {
        return {
            eventDay: "--",
            eventMonthText: "Tháng --",
            eventYear: "----",
        };
    }

    return {
        eventDay: date.format("DD"),
        eventMonthText: `Tháng ${date.format("MM")}`,
        eventYear: date.format("YYYY"),
    };
};

const getEventStatusText = (timeStart, timeEnd) => {
    const now = moment();
    const start = timeStart ? moment(timeStart) : null;
    const end = timeEnd ? moment(timeEnd) : null;

    if (!start || !start.isValid()) return "";

    if (now.isBefore(start)) return "Sắp diễn ra";
    if (end && end.isValid() && now.isAfter(end)) return "Đã diễn ra";
    return "Đang diễn ra";
};

const strapiContext = { axios, qs, strapiBase };

const stripHtml = (value) => String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const buildExcerpt = (value, maxLength = 180) => {
    const text = stripHtml(markdownToHtml(value));
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength).trimEnd()}...`;
};

const resolveFirstRelatedIdentifier = (block) => {
    const single = block?.item;
    if (single?.documentId || single?.id) {
        return single.documentId || single.id;
    }

    const list = Array.isArray(block?.items) ? block.items : [];
    if (list[0]?.documentId || list[0]?.id) {
        return list[0].documentId || list[0].id;
    }

    return null;
};

const safeHydrateBlock = async (block) => {
    try {
        return await hydrateBlock(block);
    } catch (error) {
        console.error("Hydrate block lỗi:", block?.__component || "unknown", error?.message || error);
        return block || {};
    }
};

const buildHomeFallbackData = () => ({
    videoUrl: "/default-video.mp4",
    videoHeading: "",
    videoTitle: "",
    videoButtonText: "",
    videoButtonLink: "#",
    blocks: [],
});

const hydrateBlock = async (block) => {
    const componentKey = (block?.__component || "").toLowerCase();

    if (componentKey === "homepage.about") {
        return {
            ...block,
            aboutPhoto: toAbsoluteUrl(block?.photo, "./img/default-logo.png"),
            aboutBackground: toAbsoluteUrl(block?.background, "./img/edge-1-no-noise.png"),
            descriptionHtml: markdownToHtml(block?.description || ""),
        };
    }

    if (componentKey === "homepage.giai-phap-nhan-su") {
        const hydratedItems = await hydrateRelatedItems(strapiContext, block?.items, "human-resources", (item) => ({
            ...item,
            photoUrl: toAbsoluteUrl(item?.photo, "./img/default-achievement.png"),
            detailLink: buildHumanResourceLink(item),
        }));

        return {
            ...block,
            iconUrl: toAbsoluteUrl(block?.icon, "/img/default-customer.png"),
            items: hydratedItems,
        };
    }

    if (componentKey === "homepage.tin-tuc") {
        const hydratedItems = await hydrateRelatedItems(strapiContext, block?.items, "posts", (item) => ({
            ...item,
            photoUrl: toAbsoluteUrl(item?.photo, "/img/default-customer.png"),
            publishedAt: item.publishedAt ? moment(item.publishedAt).format("DD/MM/YYYY") : null,
            excerpt: buildExcerpt(item?.description || item?.content || "", 180),
        }));

        return {
            ...block,
            items: hydratedItems,
        };
    }

    if (componentKey === "homepage.su-kien") {
        const hydratedItems = await hydrateRelatedItems(strapiContext, block?.items, "events", (item) => ({
            ...item,
            photoUrl: toAbsoluteUrl(item?.photo, "/img/default-customer.png"),
            ...getEventDateParts(item.time_start),
            eventStatusText: getEventStatusText(item.time_start, item.time_end),
        }));

        return {
            ...block,
            backgroundUrl: toAbsoluteUrl(block?.background, "/img/default-customer.png"),
            items: hydratedItems,
        };
    }

    const firstRelatedIdentifier = resolveFirstRelatedIdentifier(block);

    if (!firstRelatedIdentifier) {
        return {
            ...block,
            items: [],
        };
    }

    if (componentKey === "shares.thanh-tuu") {
        const entry = await fetchStrapiEntry(strapiContext, "achievement-sets", firstRelatedIdentifier, {
            populate: { items: { populate: "*" } },
        });

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

    if (componentKey === "shares.video") {
        const entry = await fetchStrapiEntry(strapiContext, "video-sets", firstRelatedIdentifier, {
            populate: { items: { populate: "*" } },
        });

        return {
            ...block,
            title: entry?.title || "",
            items: Array.isArray(entry?.items)
                ? entry.items.map((item) => ({
                      ...item,
                      photoUrl: toAbsoluteUrl(item?.photo, "/img/default-customer.png"),
                      videoUrl: toAbsoluteUrl(item?.video, ""),
                  }))
                : [],
        };
    }

    if (componentKey === "shares.khach-hang") {
        const entry = await fetchStrapiEntry(strapiContext, "customer-sets", firstRelatedIdentifier, {
            populate: { item_logos: { populate: "*" } },
        });

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

    if (componentKey === "shares.doi-tac") {
        const entry = await fetchStrapiEntry(strapiContext, "partner-sets", firstRelatedIdentifier, {
            populate: { item_logos: { populate: "*" } },
        });

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

    if (componentKey === "shares.cam-nhan-khach-hang") {
        const entry = await fetchStrapiEntry(strapiContext, "feedback-sets", firstRelatedIdentifier, {
            populate: {
                background_left: { populate: "*" },
                background_right: { populate: "*" },
                items: { populate: "*" },
            },
        });

        return {
            ...block,
            title: entry?.title || "",
            backgroundLeftUrl: toAbsoluteUrl(entry?.background_left, "./img/edge-3.png"),
            backgroundRightUrl: toAbsoluteUrl(entry?.background_right, "./img/edge-4.png"),
            items: Array.isArray(entry?.items)
                ? entry.items.map((item) => ({
                      ...item,
                      avatarUrl: toAbsoluteUrl(item?.avatar, "/img/default-customer.png"),
                  }))
                : [],
        };
    }

    return block;
};

router.get("/", async (req, res) => {
    try {
        const query = qs.stringify(HOME_QUERY, { encodeValuesOnly: true });
        const response = await axios.get(strapiBase + "/api/homepage?" + query);
        const data = response.data?.data || {};

        const video = data.video || {};
        data.videoUrl = toAbsoluteUrl(video?.media, "/default-video.mp4");
        data.videoHeading = video?.description || "";
        data.videoTitle = video?.title || "";
        data.videoButtonText = video?.button_text || "";
        data.videoButtonLink = video?.button_link || "#";

        const seo = data.seo || {};
        res.locals.pageTitle = seo.metaTitle || "";
        res.locals.pageDescription = seo.metaDescription || "";
        res.locals.pageKeywords = seo.keywords || "";
        res.locals.ogTitle = seo.ogTitle || "";
        res.locals.ogDescription = seo.ogDescription || "";

        data.blocks = await Promise.all((Array.isArray(data.blocks) ? data.blocks : []).map(safeHydrateBlock));
        return res.render("home/index", { data });
    } catch (error) {
        console.error("Lỗi tải homepage:", error?.message || error);
        if (error?.stack) {
            console.error(error.stack);
        }
        if (error.response?.data) {
            console.error("Strapi error detail:", JSON.stringify(error.response.data, null, 2));
        }
        return res.status(200).render("home/index", { data: buildHomeFallbackData() });
    }
});

module.exports = router;
