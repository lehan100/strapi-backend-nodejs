const axios = require('axios');
const { strapiBase, strapiApiToken, strapiEmailSubscribePath } = require('../../../config/constants');

const redirectWithStatus = (req, res, status) => {
  const referer = req.get('referer') || '/';
  const separator = referer.includes('?') ? '&' : '?';
  return res.redirect(`${referer}${separator}subscribe_status=${status}`);
};

const submitEmailSubscribe = async (req, res) => {
  const email = String(req.body?.email || '').trim();

  if (!email) {
    return redirectWithStatus(req, res, 'invalid');
  }

  const payload = {
    email,
  };

  try {
    const headers = {};
    if (strapiApiToken) {
      headers.Authorization = `Bearer ${strapiApiToken}`;
    }

    await axios.post(
      `${strapiBase}${strapiEmailSubscribePath}`,
      { data: payload },
      { headers },
    );

    return redirectWithStatus(req, res, 'success');
  } catch (error) {
    console.error('Subscribe submit error:', error.response?.data || error.message);
    return redirectWithStatus(req, res, 'error');
  }
};

module.exports = {
  submitEmailSubscribe,
};
