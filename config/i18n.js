const path = require('path');

module.exports = {
  fallbackLng: 'vi',
  supportedLngs: ['vi', 'vn', 'en'],
  preload: ['vi', 'vn', 'en'],
  ns: ['translation'],
  defaultNS: 'translation',
  backend: {
    loadPath: path.join(__dirname, '..', 'locales/{{lng}}/{{ns}}.json'),
  },
  detection: {
    order: ['querystring', 'cookie'],
    lookupQuerystring: 'lang',
    lookupCookie: 'hr2b_i18next',
    caches: ['cookie'],
  },
  interpolation: {
    escapeValue: false,
  },
};
