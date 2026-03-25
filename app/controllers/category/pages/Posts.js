module.exports = ({ res, category, slug }) => {
  return res.render("pages/Posts", { category, slug });
};

