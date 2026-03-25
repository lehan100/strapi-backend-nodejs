module.exports = ({ res, category, slug }) => {
  return res.render("pages/Career", { category, slug });
};

