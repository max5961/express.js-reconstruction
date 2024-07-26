import App from "./App";
import HttpResponse from "./HttpResponse";
import Router from "./Router";
import * as Types from "./types";
import http from "http";

export default function createApplication(): App {
    const app = new App();

    app.on(
        App.IncomingRequest,
        (req: http.IncomingMessage, serverRes: http.ServerResponse) => {
            const res = new HttpResponse(serverRes);

            /* The final next/done.  Handles all unhandled requests or errors */
            const done = (err?: Types.HttpError) => {
                if (err && typeof err !== "string") {
                    err.status && res.status(err.status);

                    if (err.stack) {
                        return res.send(err.stack);
                    }

                    return res.send(err.message);
                }

                res.status(404).send(`Cannot ${req.method} ${req.url}`);
            };

            app.dispatch(req as Types.Req, res, done);
        },
    );

    return app;
}

export { Router };
export * from "./types";
