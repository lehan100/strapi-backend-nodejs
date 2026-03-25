const axios = require("axios");
const express = require("express");
const moment = require("moment");
const qs = require("qs");
const { strapiBase } = require("../../config/constants");

const router = express.Router();

const HOME_QUERY = {
    populate: {
        video: { populate: "*" },
        seo: { populate: "*" },
        about: { populate: "*" },
        achievements: {
            populate: "*",
            filters: { active: { $eq: true } },
        },
        human_resources: {
            populate: "*",
            filters: { active: { $eq: true } },
        },
        customers: { populate: "*" },
        fedbacks: { populate: "*" },
        partners: { populate: "*" },
        posts: {
            populate: "*",
            filters: { active: { $eq: true } },
        },
        events: {
            populate: "*",
            filters: { active: { $eq: true } },
        },
        videos: { populate: "*" },
    },
};

const toAbsoluteUrl = (fileUrl, fallback = "") => {
    if (!fileUrl) return fallback;
    return fileUrl.startsWith("http") ? fileUrl : strapiBase + fileUrl;
};

const mapMediaList = (items, imageField, outputField, fallbackImage) => {
    if (!Array.isArray(items)) return [];

    return items.map((item) => ({
        ...item,
        [outputField]: toAbsoluteUrl(item?.[imageField]?.url, fallbackImage),
    }));
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

router.get("/", async (req, res) => {
    try {
        const query = qs.stringify(HOME_QUERY, { encodeValuesOnly: true });
        const response = await axios.get(strapiBase + "/api/homepage?" + query);
        const data = response.data?.data || {};

        const video = data.video || {};
        data.videoUrl = toAbsoluteUrl(video?.media?.url, "/default-video.mp4");
        data.videoTitle = video?.title || "";
        data.videoButtonText = video?.button_text || "";
        data.videoButtonLink = video?.button_link || "#";

        const seo = data.seo || {};
        res.locals.pageTitle = seo.metaTitle || "";
        res.locals.pageDescription = seo.metaDescription || "";
        res.locals.pageKeywords = seo.keywords || "";
        res.locals.ogTitle = seo.ogTitle || "";
        res.locals.ogDescription = seo.ogDescription || "";

        const about = data.about || {};
        data.about = {
            ...about,
            aboutPhoto: toAbsoluteUrl(about?.photo?.url, "/default-logo.png"),
        };

        data.achievements = mapMediaList(data.achievements, "photo", "photoUrl", "/img/default-achievement.png");
        data.human_resources = mapMediaList(data.human_resources, "photo", "photoUrl", "/img/default-human-resource.png");
        data.customers = mapMediaList(data.customers, "photo", "photoUrl", "/img/default-customer.png");
        data.fedbacks = mapMediaList(data.fedbacks, "avatar", "avatarUrl", "/img/default-customer.png");
        data.partners = mapMediaList(data.partners, "photo", "photoUrl", "/img/default-customer.png");
        data.events = mapMediaList(data.events, "photo", "photoUrl", "/img/default-customer.png").map((item) => ({
            ...item,
            ...getEventDateParts(item.time_start),
            eventStatusText: getEventStatusText(item.time_start, item.time_end),
        }));
        data.videos = mapMediaList(data.videos, "photo", "photoUrl", "/img/default-customer.png");

        data.posts = mapMediaList(data.posts, "photo", "photoUrl", "/img/default-customer.png").map((item) => ({
            ...item,
            publishedAt: item.publishedAt ? moment(item.publishedAt).format("DD/MM/YYYY") : null,
        }));

        return res.render("home/index", { data });
    } catch (error) {
        console.error("Lỗi tải homepage:", error.message);
        return res.render("home/index", { data: {} });
    }
});

module.exports = router;
