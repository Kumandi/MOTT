const express = require("express");
const path = require("path");
const { getRouter } = require("stremio-addon-sdk");
const addonInterface = require("./addon");

const app = express();
const port = process.env.PORT || 7000;

app.use(express.static(path.join(__dirname)));
app.use("/", getRouter(addonInterface));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(port, () => {
  console.log(`MOTT running on port ${port}`);
  console.log(`http://127.0.0.1:${port}/manifest.json`);
});
