var path = require("path");

require("dotenv").load();

var express = require("express");
var favicon = require("serve-favicon");
var logger = require("morgan");
var busboy = require("connect-busboy");
var mongoose = require("mongoose");

var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "hbs");

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + "/public/favicon.ico"));
app.use(logger("dev"));
app.use(busboy());
app.use(express.static(path.join(__dirname, "public")));

// Connect to database
mongoose.connect("mongodb://localhost/visual-artwork-cluster");

// Load in models
require("./models/jobs");
require("./models/clusters");
require("./models/images");

var routes = require("./routes/index");
var jobs = require("./routes/jobs");

app.use("/", routes);
app.use("/job", jobs);
app.use("/images", express.static(
    path.join(__dirname, process.env.UPLOAD_DIR)));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error("Not Found");
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get("env") === "development") {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render("error", {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render("error", {
        message: err.message,
        error: {}
    });
});


module.exports = app;
