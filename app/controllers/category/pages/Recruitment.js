module.exports = ({ res, category, slug }) => {
  return res.render("pages/Recruitment", { category, slug });
};

