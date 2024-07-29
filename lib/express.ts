import App from "./App";
import HttpResponse from "./HttpResponse";
import Router from "./Router";
import json from "./jsonBodyParser";
import urlencoded from "./urlencoded";
import * as Types from "./types";
import http from "http";

const begin =
    (req: Types.Req, res: Types.Res, app: App) => (err?: Types.HttpError) => {
        req.app = app;

        if (err && typeof err !== "string") {
            err.status && res.status(err.status);

            if (err.stack) {
                return res.send(err.stack);
            }

            return res.send(err.message);
        }

        res.status(404).send(`Cannot ${req.method} ${req.url}`);
    };

interface Express {
    (): App;
    json: typeof json;
    Router: typeof Router;
    urlencoded: typeof urlencoded;
}

const express: Express = (): App => {
    const app = new App();

    app.on(
        App.IncomingRequest,
        (req: http.IncomingMessage, serverRes: http.ServerResponse) => {
            const res = new HttpResponse(req, serverRes, app);

            const done = begin(req as Types.Req, res, app);

            app.dispatch(req as Types.Req, res, done);
        },
    );

    return app;
};

express.json = json;
express.Router = Router;
express.urlencoded = urlencoded;

export default express;
export { Router, begin };
export * from "./types";
