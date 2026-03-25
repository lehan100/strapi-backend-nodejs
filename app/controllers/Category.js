const express = require("express");
const axios = require("axios");
const qs = require("qs");
const { strapiBase } = require("../../config/constants");
const { getCategoryPageController } = require("./category/pages");

const router = express.Router();

router.get("/:slug", async (req, res) => {
    try {
        const { slug } = req.params;
        const categoryQuery = qs.stringify({
            filters: {
                slug: { $eq: slug },
            },
            populate: "*",
            pagination: {
                page: 1,
                pageSize: 1,
            },
        }, {
            encodeValuesOnly: true,
        });

        const categoryResponse = await axios.get(`${strapiBase}/api/categories?${categoryQuery}`);
        const category = categoryResponse.data?.data?.[0] || null;
        if (!category) {
            return res.status(404).render("pages/Default", {
                category: null,
                slug,
            });
        }

        const targetPageRaw = (category.target_page || "").toString().trim();
        const pageController = getCategoryPageController(targetPageRaw);

        return pageController({
            req,
            res,
            axios,
            qs,
            strapiBase,
            category,
            slug,
            targetPageRaw,
        });
    } catch (error) {
        console.error("Category fetch error:", error.message);
        return res.status(500).render("pages/Default", {
            category: null,
            slug: req.params.slug,
        });
    }
});

module.exports = router;
