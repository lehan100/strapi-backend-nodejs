const axios = require('axios');
const { strapiBase, strapiApiToken, strapiContactSubmissionPath } = require('../../../config/constants');

const normalizeArrayField = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
};

const redirectWithStatus = (req, res, status) => {
  const referer = req.get('referer') || '/contact';
  const separator = referer.includes('?') ? '&' : '?';
  return res.redirect(`${referer}${separator}contact_status=${status}`);
};

const submitContactForm = async (req, res) => {
  const fullName = String(req.body?.fullname || '').trim();
  const company = String(req.body?.company || '').trim();
  const phone = String(req.body?.phone || '').trim();
  const email = String(req.body?.email || '').trim();
  const requirements = String(req.body?.requirements || '').trim();
  const userType = String(req.body?.['user-type'] || 'client').trim();
  const agreeTerms = !!req.body?.['agree-terms'];
  const services = normalizeArrayField(req.body?.services);
  const source = String(req.body?.source || '').trim();

  if (!fullName || !phone || !email) {
    return redirectWithStatus(req, res, 'invalid');
  }

  const payload = {
    full_name: fullName,
    company,
    phone,
    email,
    requirements,
    user_type: userType,
    services,
    agree_terms: agreeTerms,
    source,
    submitted_at: new Date().toISOString(),
    page_url: req.get('referer') || '',
  };

  try {
    const headers = {};
    if (strapiApiToken) {
      headers.Authorization = `Bearer ${strapiApiToken}`;
    }

    await axios.post(
      `${strapiBase}${strapiContactSubmissionPath}`,
      { data: payload },
      { headers },
    );

    return redirectWithStatus(req, res, 'success');
  } catch (error) {
    console.error('Contact submit error:', error.response?.data || error.message);
    return redirectWithStatus(req, res, 'error');
  }
};

module.exports = {
  submitContactForm,
};
