import http from "http";
import HttpResponse from "./HttpResponse";
import { HttpError, HttpRequest } from "./types";
import Router from "./Router";

class App extends Router {
    constructor() {
        super();
    }

    static IncomingRequest: string = "INCOMING_REQUEST";

    startResponse = (
        req: http.IncomingMessage,
        res: http.ServerResponse,
    ): void => {
        this.emit(App.IncomingRequest, req, res);
    };

    listen = (port: number, cb?: () => any): void => {
        const server = http.createServer(this.startResponse);
        server.listen(port, cb);
    };
}

export default function createApplication(): App {
    const app = new App();

    app.on(
        App.IncomingRequest,
        (req: http.IncomingMessage, serverRes: http.ServerResponse) => {
            // The final next/done which is the default error handler or handles
            // any unhandled Requests.
            const res = new HttpResponse(serverRes);

            const done = (err?: HttpError) => {
                if (err && typeof err !== "string") {
                    err.status && res.status(err.status);

                    if (err.stack) {
                        return res.send(err.stack);
                    }

                    return res.send(err.message);
                }

                res.status(404).send(`Cannot ${req.method} ${req.url}`);
            };

            app.dispatch(req as HttpRequest, res, done);
        },
    );

    return app;
}
