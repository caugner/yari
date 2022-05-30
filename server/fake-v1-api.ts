/**
 * The purpose of these routes is to respond with a JSON payload on
 * requests that come in to localhost:5042/api/v1/*
 *
 * You can read more about it in the docs/proxying.md document.
 */

// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'fs'.
const fs = require("fs");
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'path'.
const path = require("path");

// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'express'.
const express = require("express");

// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'router'.
const router = express();

router.get("*", (req, res) => {
  const folder = path.resolve("./fake-v1-api");
  if (!fs.existsSync(folder)) {
    throw new Error(
      `If you're going to fake v1 API requests you have to create the folder: ${folder}`
    );
  }
  const filepath = path.join(folder, `${req.url.slice(1)}.json`);

  if (fs.existsSync(filepath)) {
    const payload = fs.readFileSync(filepath);
    res.json(JSON.parse(payload));
  } else {
    console.warn(`Tried to fake ${req.url} but ${filepath} doesn't exist.`);
    res.status(404).json({ folder, filepath });
  }
});

module.exports = router;
