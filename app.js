const bodyParser = require("body-parser");
const compression = require("compression");
const config = require("config");
const cors = require("cors");
const express = require("express");
const expressMongoDb = require("express-mongo-db");
const { graphqlExpress, graphiqlExpress } = require("apollo-server-express");
const { HttpError, ObjectNotExistError } = require("./libs/errors");
const logger = require("morgan");
const winston = require("winston");
const passport = require("passport");
const passportStrategies = require("./libs/passport-strategies");
const { jwtStrategy } = require("./utils/passport-strategies");

const ModelManager = require("./models/manager");
const routes = require("./routes");
const schema = require("./schema");

const app = express();

// We are behind the proxy
app.set("trust proxy", 1);

// Enable compress the traffic
if (app.get("env") === "production") {
    app.use(compression());
}

// winston logging setup
if (app.get("env") === "test" || app.get("env") === "developement") {
    winston.remove(winston.transports.Console);
}

if (app.get("env") !== "test") {
    app.use(logger("dev"));
}
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(expressMongoDb(config.get("MONGODB_URI")));
app.use(require("./middlewares").expressRedisDb(config.get("REDIS_URL")));
app.use((req, res, next) => {
    req.manager = new ModelManager(req.db);
    next();
});

if (config.get("CORS_ANY") === "TRUE") {
    app.use(cors());
} else {
    app.use(
        cors({
            origin: [/\.goodjob\.life$/],
        })
    );
}

app.use((req, res, next) => {
    winston.info(req.originalUrl, {
        ip: req.ip,
        ips: req.ips,
        query: req.query,
    });
    next();
});

app.use(passport.initialize());
passport.use(passportStrategies.legacyFacebookTokenStrategy());
passport.use(jwtStrategy());
app.use((req, res, next) => {
    passport.authenticate("jwt", { session: false }, (err, user) => {
        if (user) {
            req.user = user;
        }
        next();
    })(req, res, next);
});
app.use("/", routes);

if (app.get("env") === "development") {
    app.get("/graphiql", graphiqlExpress({ endpointURL: "/graphql" }));
}
app.use(
    "/graphql",
    graphqlExpress(({ db, manager }) => ({ schema, context: { db, manager } }))
);

// catch 404 and forward to error handler
app.use((req, res, next) => {
    next(new HttpError("Not Found", 404));
});

// error handlers

// logging any error except HttpError
app.use((err, req, res, next) => {
    if (err instanceof ObjectNotExistError) {
        next(new HttpError("Not Found", 404));
        return;
    }

    if (err instanceof HttpError) {
        next(err);
        return;
    }

    winston.warn(req.originalUrl, {
        ip: req.ip,
        ips: req.ips,
        message: err.message,
        error: err,
    });

    next(err);
});

// development error handler
// will print stacktrace
if (app.get("env") === "development") {
    // eslint-disable-next-line
    app.use((err, req, res, next) => {
        if (err instanceof HttpError) {
            winston.warn(req.originalUrl, {
                ip: req.ip,
                ips: req.ips,
                message: err.message,
                error: err,
            });
        }

        res.status(err.status || 500);
        res.send({
            message: err.message,
            error: err,
        });
    });
}

// production error handler
// no stacktraces leaked to user
// eslint-disable-next-line
app.use((err, req, res, next) => {
    res.status(err.status || 500);
    res.send({
        message: err.message,
        error: {},
    });
});

module.exports = app;
