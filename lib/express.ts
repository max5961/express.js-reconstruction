import { create } from "domain";
import App from "./App";
import HttpResponse from "./HttpResponse";
import Router from "./Router";
import json from "./jsonBodyParser";
import * as Types from "./types";
import http from "http";

const begin = (req: Types.Req, res: Types.Res) => (err?: Types.HttpError) => {
    if (err && typeof err !== "string") {
        err.status && res.status(err.status);

        if (err.stack) {
            return res.send(err.stack);
        }

        return res.send(err.message);
    }

    res.status(404).send(`Cannot ${req.method} ${req.url}`);
};

interface CreateApplication {
    (): App;
    json: typeof json;
    Router: typeof Router;
}

const createApplication: CreateApplication = (): App => {
    const app = new App();

    app.on(
        App.IncomingRequest,
        (req: http.IncomingMessage, serverRes: http.ServerResponse) => {
            const res = new HttpResponse(req, serverRes);

            const done = begin(req as Types.Req, res);

            app.dispatch(req as Types.Req, res, done);
        },
    );

    return app;
};

createApplication.json = json;
createApplication.Router = Router;

export default createApplication;
export { Router, begin };
export * from "./types";
