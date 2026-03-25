module.exports = ({ res, category, slug }) => {
  return res.render("pages/Default", { category, slug });
};

