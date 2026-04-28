const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cookie = require('cookie-parser');
const session = require('express-session');
const axios = require('axios');
const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const i18nextMiddleware = require('i18next-http-middleware');
const {
  strapiBase,
  menuTermsDocumentId,
  menuPrivacyDocumentId,
  menuTermsId,
  menuPrivacyId,
} = require('./config/constants');
const i18nConfig = require('./config/i18n');
const { submitContactForm, submitEmailSubscribe } = require('./app/controllers/Form');
const { attachMenuIcons, parseMenuTreeResponse, resolvePolicyLinks } = require('./app/controllers/shared/menu');

const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookie());
app.use(session({ resave: true, saveUninitialized: true, secret: 'HR2B', cookie: { maxAge: 10000000 } }));

i18next
  .use(Backend)
  .use(i18nextMiddleware.LanguageDetector)
  .init(i18nConfig);

app.use(i18nextMiddleware.handle(i18next));
app.use((req, res, next) => {
  const cookieName = i18nConfig?.detection?.lookupCookie || 'hr2b_i18next';
  const cookieLangRaw = req.cookies?.[cookieName];
  const queryLangRaw = req.query?.lang;
  const requestedRaw = String(queryLangRaw || cookieLangRaw || req.language || '').trim().toLowerCase();
  const normalizedFromRequest = requestedRaw === 'vn' ? 'vi' : requestedRaw;

  const language = i18nConfig.supportedLngs.includes(normalizedFromRequest)
    ? normalizedFromRequest
    : i18nConfig.fallbackLng;

  if (language !== req.language) {
    req.i18n.changeLanguage(language);
  }

  if (!cookieLangRaw) {
    res.cookie(cookieName, language, { maxAge: 365 * 24 * 60 * 60 * 1000, httpOnly: false });
  }

  const translate = (...args) => {
    if (typeof req.t === 'function') return req.t(...args);
    return args[0];
  };

  res.locals.t = translate;
  res.locals._ = translate;
  res.locals.currentLanguage = language;
  next();
});

app.use((req, res, next) => {
  const status = String(req.query?.contact_status || '').trim().toLowerCase();
  const messages = {
    success: res.locals._('Gửi liên hệ thành công!'),
    error: res.locals._('Gửi liên hệ thất bại. Vui lòng thử lại.'),
    invalid: res.locals._('Vui lòng nhập đầy đủ thông tin bắt buộc.'),
  };

  res.locals.contactSubmitStatus = Object.prototype.hasOwnProperty.call(messages, status) ? status : '';
  res.locals.contactSubmitMessage = res.locals.contactSubmitStatus ? messages[res.locals.contactSubmitStatus] : '';
  next();
});

app.use((req, res, next) => {
  const status = String(req.query?.subscribe_status || '').trim().toLowerCase();
  const messages = {
    success: res.locals._('Đăng ký nhận tin thành công!'),
    error: res.locals._('Đăng ký thất bại. Vui lòng thử lại.'),
    invalid: res.locals._('Vui lòng nhập email hợp lệ.'),
  };

  res.locals.subscribeSubmitStatus = Object.prototype.hasOwnProperty.call(messages, status) ? status : '';
  res.locals.subscribeSubmitMessage = res.locals.subscribeSubmitStatus ? messages[res.locals.subscribeSubmitStatus] : '';
  next();
});

const handleLanguageSwitch = (req, res) => {
  const cookieName = i18nConfig?.detection?.lookupCookie || 'hr2b_i18next';
  const requested = String(req.params.lang || '').trim().toLowerCase();
  const normalized = requested === 'vn' ? 'vi' : requested;
  const language = i18nConfig.supportedLngs.includes(normalized) ? normalized : i18nConfig.fallbackLng;

  res.cookie(cookieName, language, { maxAge: 365 * 24 * 60 * 60 * 1000, httpOnly: false });
  return res.redirect(req.get('referer') || '/');
};

app.get('/language', handleLanguageSwitch);
app.get('/language/:lang', handleLanguageSwitch);

app.post('/contact/submit', submitContactForm);
app.post('/subscribe/submit', submitEmailSubscribe);

app.use(async (req, res, next) => {
  res.locals.termsLink = '#';
  res.locals.privacyLink = '#';

  try {
    res.locals.strapiBase = strapiBase;

    const [localesResponse, headResponse, headerResponse, footerResponse, headerMenuResponse, footerMenuResponse, bottomMenuResponse, categoriesIconResponse] = await Promise.all([
      axios.get(`${strapiBase}/api/i18n/locales`),
      axios.get(`${strapiBase}/api/head?populate[favicon][populate]=favicon`),
      axios.get(`${strapiBase}/api/header?populate[logo][populate]=logo`),
      axios.get(`${strapiBase}/api/footer?populate=*`),
      axios.get(`${strapiBase}/api/categories/menu-tree?position=is_header`),
      axios.get(`${strapiBase}/api/categories/menu-tree?position=is_footer`),
      axios.get(`${strapiBase}/api/categories/menu-tree?position=is_bottom`),
      axios.get(`${strapiBase}/api/categories?fields[0]=documentId&fields[1]=slug&fields[2]=icon&pagination[pageSize]=500`),
    ]);

    // Locales
    res.locals.locales = localesResponse.data || [];

    // Favicon
    const faviconObject = headResponse.data?.data?.favicon?.favicon;
    const faviconUrlRaw = faviconObject?.url || null;
    const faviconUrl = faviconUrlRaw
      ? (faviconUrlRaw.startsWith('http') ? faviconUrlRaw : strapiBase + faviconUrlRaw)
      : '/default-favicon.ico';
    res.locals.favicon = faviconUrl;

    // Header
    const logoObject = headerResponse.data?.data?.logo?.logo;
    const logoUrlRaw = logoObject?.url || null;
    const headerLogoUrl = logoUrlRaw
      ? (logoUrlRaw.startsWith('http') ? logoUrlRaw : strapiBase + logoUrlRaw)
      : '/default-logo.png';

    res.locals.headerLogo = headerLogoUrl;
    res.locals.companyName = headerResponse.data?.data?.logo?.company_name || 'HR2B';
    res.locals.text_search = headerResponse.data?.data?.text_search || '';

    // Footer
    res.locals.company = footerResponse.data?.data?.company || 'HR2B';
    res.locals.address = footerResponse.data?.data?.address || '';
    res.locals.phone = footerResponse.data?.data?.phone || '';
    res.locals.fax = footerResponse.data?.data?.fax || '';
    res.locals.sub_title = footerResponse.data?.data?.sub_title || '';
    res.locals.sub_text = footerResponse.data?.data?.sub_text || '';
    res.locals.copyright = footerResponse.data?.data?.copyright || '';

    // Menus
    const categoriesForIcon = categoriesIconResponse?.data?.data || [];
    res.locals.headerCategories = attachMenuIcons(parseMenuTreeResponse(headerMenuResponse.data), categoriesForIcon);
    res.locals.footerCategories = attachMenuIcons(parseMenuTreeResponse(footerMenuResponse.data), categoriesForIcon);
    res.locals.bottomCategories = attachMenuIcons(parseMenuTreeResponse(bottomMenuResponse.data), categoriesForIcon);

    const policyLinks = resolvePolicyLinks(res.locals.bottomCategories, {
      menuTermsDocumentId,
      menuPrivacyDocumentId,
      menuTermsId,
      menuPrivacyId,
    });
    res.locals.termsLink = policyLinks.termsLink;
    res.locals.privacyLink = policyLinks.privacyLink;

    next();
  } catch (error) {
    console.error('Loi trich xuat:', error.message);
    next();
  }
});

// Homepage
const home = require('./app/controllers/Home');
app.use('/', home);

// Category
const category = require('./app/controllers/Category');
app.use('/category', category);

// Post
const post = require('./app/controllers/Post');
app.use('/post', post);

app.listen(3100, () => {
  console.log('Server Stating...');
});
