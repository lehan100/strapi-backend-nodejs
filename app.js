const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cookie = require('cookie-parser');
const session = require('express-session');
const qs = require('qs');
const axios = require('axios');
const { strapiBase } = require('./config/constants');
const app = express();
app.set("view engine", "pug");
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookie())
app.use(session({ resave: true, saveUninitialized: true, secret: "HR2B", cookie: { maxAge: 10000000 } }))
app.use(async (req, res, next) => {
    try {
        res.locals.strapiBase = strapiBase;
        const locales = await axios.get(strapiBase + '/api/i18n/locales');
        res.locals.locales = locales.data || [];
        // Favicon
        const head = await axios.get(strapiBase + '/api/head?populate[favicon][populate]=favicon');
        const faviconObject = head.data?.data?.favicon?.favicon;
        const faviconUrlRaw = faviconObject?.url || null;
        const faviconUrl = faviconUrlRaw
            ? (faviconUrlRaw.startsWith('http') ? faviconUrlRaw : strapiBase + faviconUrlRaw)
            : '/default-favicon.ico';
        res.locals.favicon = faviconUrl;
        // Header
        const header = await axios.get(strapiBase + '/api/header?populate[logo][populate]=logo');
        const logoObject = header.data?.data?.logo?.logo;
        const logoUrlRaw = logoObject?.url || null;
        const headerLogoUrl = logoUrlRaw
            ? (logoUrlRaw.startsWith('http') ? logoUrlRaw : strapiBase + logoUrlRaw)
            : '/default-logo.png';
        res.locals.headerLogo = headerLogoUrl;
        res.locals.companyName = header.data?.data?.logo?.company_name || 'HR2B';
        res.locals.text_search = header.data?.data?.text_search || '';
        // Footer
        const footer = await axios.get(strapiBase + '/api/footer?populate=*');
        res.locals.company = footer.data?.data?.company || 'HR2B';
        res.locals.address = footer.data?.data?.address || '';
        res.locals.phone = footer.data?.data?.phone || '';
        res.locals.fax = footer.data?.data?.fax || '';
        res.locals.text_search = header.data?.data?.text_search || '';
        res.locals.sub_title = footer.data?.data?.sub_title || '';
        res.locals.sub_text = footer.data?.data?.sub_text || '';
        res.locals.copyright = footer.data?.data?.copyright || '';
        //Category
        const queryCategoryHeader = qs.stringify({
            populate: '*',
            sort: ['order:asc'],
            filters: {
                positions: {
                    is_header: { $eq: true }
                }
            }
        }, {
            encodeValuesOnly: true,
        });
        const queryCategoryFooter = qs.stringify({
            populate: '*',
            sort: ['order:asc'],
            filters: {
                positions: {
                    is_footer: { $eq: true }
                }
            }
        }, {
            encodeValuesOnly: true,
        });
        const queryCategoryBottom = qs.stringify({
            populate: '*',
            filters: {
                positions: {
                    is_bottom: { $eq: true }
                }
            }
        }, {
            encodeValuesOnly: true,
        });
        const categoryHeader = await axios.get(strapiBase + '/api/categories?' + queryCategoryHeader);
        const categoryFooter = await axios.get(strapiBase + '/api/categories?' + queryCategoryFooter);
        const categoryBottom = await axios.get(strapiBase + '/api/categories?' + queryCategoryBottom);

        const normalizeCategories = (items = []) =>
            (Array.isArray(items) ? items : []).map((item) => ({
                ...item,
                slug: (item.page_type === 'homepage' ? '/' : "/category/" + item.slug || ''),
            }));
        res.locals.headerCategories = normalizeCategories(categoryHeader.data?.data);
        res.locals.footerCategories = normalizeCategories(categoryFooter.data?.data);
        res.locals.bottomCategories = normalizeCategories(categoryBottom.data?.data);

        next();
    } catch (error) {
        console.error("Lỗi trích xuất:", error.message);
        next();
    }
});

//Homepage
const home = require("./app/controllers/Home");
app.use("/", home);
//Category
const category = require("./app/controllers/Category");
app.use("/category", category);
//Post
const post = require("./app/controllers/Post");
app.use("/post", post);
app.listen(3100, () => {
    console.log("Server Stating...");
})
