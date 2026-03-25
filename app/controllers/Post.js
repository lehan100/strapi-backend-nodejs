const express = require("express");
const router = express.Router();
router.get("/detail/:id", (req, res) => {
    res.render('post/detail');
});
module.exports = router;