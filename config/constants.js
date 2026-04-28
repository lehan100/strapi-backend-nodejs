const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

module.exports = {
    strapiBase: process.env.STRAPI_BASE || process.env.STRAPI_URL || 'http://localhost:1337',
    strapiApiToken: process.env.STRAPI_API_TOKEN || '',
    strapiContactSubmissionPath: process.env.STRAPI_CONTACT_SUBMISSION_PATH || '/api/contact-submissions',
    strapiEmailSubscribePath: process.env.STRAPI_EMAIL_SUBSCRIBE_PATH || '/api/email-subscribes',
    menuTermsDocumentId: process.env.MENU_TERMS_DOCUMENT_ID || '',
    menuPrivacyDocumentId: process.env.MENU_PRIVACY_DOCUMENT_ID || '',
    menuTermsId: process.env.MENU_TERMS_ID || '',
    menuPrivacyId: process.env.MENU_PRIVACY_ID || ''
};
