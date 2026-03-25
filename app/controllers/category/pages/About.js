module.exports = ({ res, category, slug }) => {
  return res.render("pages/About", { category, slug });
};

