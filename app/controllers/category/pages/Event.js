module.exports = ({ res, category, slug }) => {
  return res.render("pages/Events", { category, slug });
};

