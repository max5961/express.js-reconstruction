import http from "http";
import HttpResponse from "./HttpResponse";
import Router from "./Router";
import { HttpError, HttpRequest } from "./types";
import Layer from "./Layer";

/*
 * App needs to NOT extend router, but instead needs to create a Router instance
 * upon instantiation.  Also upon instantiation, the App must call this.router.dispatch
 * itself to kick things off.  Since the App instance is always the base Router,
 * this grants us the opportunity to handle any Errors that get passed down to us
 * in any way to end things, or create a 'default response'. In Express the default
 * response is `Cannot ${req.method} ${req.url}` */

/* Note in addition to executing this.router.dispatch, we will also need to
 * make sure that the app/router.use(path, router) modifies the Router instance
 * root path */

/* Note, at runtime the script executes and modifies the Router instance base
 * path when the script reaches the use method that 'uses' the Router. Then it
 * need to push a Layer onto its stack that curries in the 'next' function
 * from the outer instance into the Router instance and dispatches the Router
 * instance */

/*
 * It would also be helpful to make Router a callable class such that we
 * could place it in app.use("/router-route", router); */
class App extends Router {
    constructor() {
        super();
    }

    dispatch = (req: HttpRequest, res: HttpResponse) => {
        let idx = 0;

        const next = (err?: HttpError): void => {
            if (idx >= this.stack.length) {
                if (err) {
                    console.log("ayooooo");
                    return res.status(500).send(err.stack ?? err.message);
                }
                return res.status(404).send("404 Not Found");
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
