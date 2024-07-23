import http from "http";
import HttpResponse from "./HttpResponse";
import Router from "./Router";
import { HttpError, HttpRequest } from "./types";
import Layer from "./Layer";

class App extends Router {
    constructor() {
        super();
    }

    dispatch = (req: HttpRequest, res: HttpResponse) => {
        let idx = 0;

        const next = (err?: HttpError): void => {
            if (idx >= this.stack.length) {
                return res.status(404).send("Default error message");
            }

            const layer = this.stack[idx++] as Layer;

            // Execute any non-route handling middleware
            if (!layer.route) {
                if (err && layer.errorHandler) {
                    return layer.errorHandler(err, req, res, next);
                }

                if (layer.handler) {
                    return layer.handler(req, res, next);
                }
            }

            const match =
                req.url === layer.route && req.method === layer.method;

            if (match) {
                layer.handler && layer.handler(req, res, next);
            } else if (err) {
                next(err);
            } else {
                next();
            }
        };

        next();
    };

    begin = (req: http.IncomingMessage, res: http.ServerResponse): void => {
        const httpResponse = new HttpResponse(res);

        this.dispatch(req, httpResponse);
    };

    listen = (port: number, cb?: () => any): void => {
        const server = http.createServer(this.begin);
        server.listen(port, cb);
    };
}

export default function createApplication(): App {
    return new App();
}
