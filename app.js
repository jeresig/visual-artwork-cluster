"use strict";

const path = require("path");

require("dotenv").load();

const express = require("express");
const logger = require("morgan");
const busboy = require("connect-busboy");
const mongoose = require("mongoose");

const app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "hbs");

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + "/public/favicon.ico"));
app.use(logger("dev"));
app.use(busboy());
app.use(express.static(path.join(__dirname, "public")));

// Connect to database
mongoose.connect(process.env.MONGO_URL);

// Load in models
require("./models/jobs");
require("./models/clusters");
require("./models/images");

const routes = require("./routes/index");
const jobs = require("./routes/jobs");
const clusters = require("./routes/clusters");

app.use("/", routes);
app.use("/job", jobs);
app.use("/cluster", clusters);
app.use("/images", express.static(
    path.join(__dirname, process.env.UPLOAD_DIR)));

// catch 404 and forward to error handler
app.use((req, res, next) => {
    const err = new Error("Not Found");
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get("env") === "development") {
    app.use((error, req, res, next) => {
        res.status(error.status || 500);
        res.render("error", {
            message: error.message,
            error,
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use((error, req, res, next) => {
    res.status(error.status || 500);
    res.render("error", {
        message: error.message,
        error: {},
    });
});


module.exports = app;
