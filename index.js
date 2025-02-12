const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const session = require("express-session");
const MemoryStore = require("memorystore")(session);
const expHbs = require("express-handlebars");
const moment = require("moment-timezone");
const helper = require("handlebars-helpers")();
const poll = require("./models/mainPoll");
require("dotenv").config();
require("./database"); // Ensure database connection works

const app = express();

// ✅ Session Configuration
app.use(
  session({
    cookie: { maxAge: 86400000 }, // 24 hours
    store: new MemoryStore({ checkPeriod: 86400000 }),
    secret: process.env.SESSION_SECRET || "1234asdf",
    resave: false,
    saveUninitialized: false,
  })
);

// ✅ Handlebars Setup
const hbs = expHbs.create({
  extname: "hbs",
  defaultLayout: "main",
  layoutsDir: path.join(__dirname, "views/layout"),
  helpers: helper,
  partialsDir: path.join(__dirname, "views/partials"),
});
app.engine("hbs", hbs.engine);
app.set("view engine", "hbs");

// ✅ Middleware
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// ✅ Check if user has already polled
const checkPolled = (req, res, next) => {
  req.session.polled = req.session.polled || [];
  if (req.session.polled.includes(req.query.name)) {
    console.log("Poll already voted. Redirecting...");
    return res.redirect(`/showPoll?name=${req.query.name}`);
  }
  next();
};

// ✅ Home Route
app.get("/", async (req, res) => {
  req.session.polled = req.session.polled || [];
  res.render("try", { home: "active" });
});

// ✅ Generate Poll Page
app.get("/genPoll", async (req, res) => {
  res.render("try_doPoll");
});

// ✅ Create Poll
app.post("/generatePoll", async (req, res) => {
  try {
    console.log(req.body);
    let ops = req.body.option.length;
    let val = new Array(ops).fill(0);
    let pollname = req.body.name.replace(/\s/g, "_");

    let pollNew = new poll({
      name: pollname,
      topic: req.body.topic,
      option: req.body.option,
      value: val,
    });

    await pollNew.save();
    console.log("Poll Created:", pollNew);
    res.redirect(`/showPoll?name=${pollname}`);
  } catch (error) {
    console.error("Error creating poll:", error);
    res.status(500).send("Error creating poll");
  }
});

// ✅ Check if Poll Exists
app.get("/checkPoll", async (req, res) => {
  try {
    const pollExists = await poll.findOne({ name: req.query.name });
    res.send({ exist: !!pollExists });
  } catch (error) {
    console.error("Error checking poll:", error);
    res.status(500).send("Error checking poll");
  }
});

// ✅ Show Poll Page
app.get("/showPoll", async (req, res) => {
  try {
    let pollData = await poll.findOne({ name: req.query.name });
    if (!pollData) return res.status(404).send("Poll not found");

    res.render("pollPage", {
      options: pollData.option,
      title: pollData.topic,
      creator: pollData.creator,
      dateGen: pollData.generatedOn,
      value: pollData.value,
      name: pollData.name,
    });
  } catch (error) {
    console.error("Error fetching poll:", error);
    res.status(500).send("Error fetching poll");
  }
});

// ✅ Get Poll Values (API)
app.get("/getPollVal", async (req, res) => {
  try {
    const pollData = await poll.find(
      { name: req.query.name },
      { value: 1, _id: 0, totalPolls: 1, topic: 1 }
    );
    res.send(pollData);
  } catch (error) {
    console.error("Error fetching poll values:", error);
    res.status(500).send("Error fetching poll values");
  }
});

// ✅ Vote in Poll
app.get("/pollfor", checkPolled, async (req, res) => {
  try {
    const data = await poll.findOne(
      { name: req.query.name },
      { topic: 1, option: 1, generatedOn: 1, _id: 1, value: 1, name: 1 }
    );
    if (!data) return res.status(404).send("Poll not found");

    res.render("viewPoll", { options: data.option, nameOf: data.topic, id: data.name });
  } catch (error) {
    console.error("Error fetching poll:", error);
    res.status(500).send("Error finding poll");
  }
});

// ✅ Submit Poll Vote
app.post("/submitOption", async (req, res) => {
  try {
    req.session.polled = req.session.polled || [];
    if (req.session.polled.includes(req.body.poll)) {
      console.log("Poll already polled. Redirecting...");
      return res.redirect(`/showPoll?name=${req.body.poll}`);
    }

    const pollData = await poll.findOne({ name: req.body.poll });
    if (!pollData) return res.status(404).send("Poll not found");

    pollData.value[req.body.ans]++;
    await poll.updateOne(
      { name: req.body.poll },
      { $inc: { totalPolls: 1 }, $set: { value: pollData.value } }
    );

    req.session.polled.push(req.body.poll);
    console.log("Vote saved.");
    res.redirect(`/showPoll?name=${req.body.poll}`);
  } catch (error) {
    console.error("Error submitting vote:", error);
    res.status(500).send("Error submitting vote");
  }
});

// ✅ Get Top Polls
app.get("/polls", async (req, res) => {
  try {
    const topPolls = await poll
      .find({}, { options: 0, generatedOn: 0, value: 0, _id: 0 })
      .sort({ totalPolls: -1 })
      .limit(5)
      .lean();

    res.render("try_polls", { poll: topPolls, polling: "active" });
  } catch (error) {
    console.error("Error fetching polls:", error);
    res.status(500).send("Error fetching polls");
  }
});

// ✅ Search Polls
app.get("/search", async (req, res) => {
  try {
    let regex = new RegExp(req.query["term"], "i");
    let searchResults = await poll
      .find({ $or: [{ topic: regex }, { name: regex }] }, { name: 1 })
      .sort({ generatedOn: -1 })
      .limit(5);

    res.jsonp(searchResults.map((user) => ({ name: user.name, label: user.name })));
  } catch (error) {
    console.error("Error searching polls:", error);
    res.status(500).send("Error searching polls");
  }
});


// ✅ Delete Poll
app.delete("/deletePoll", async (req, res) => {
  const pollName = req.query.name;
  if (!pollName) return res.status(400).json({ success: false, message: "Poll name is required" });

  try {
    const result = await poll.deleteOne({ name: pollName }); // ✅ Fixed here
    if (result.deletedCount > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, message: "Poll not found" });
    }
  } catch (error) {
    console.error("Error deleting poll:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// ✅ Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});
