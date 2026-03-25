module.exports = ({ res, category, slug }) => {
  return res.render("pages/Contact", { category, slug });
};

