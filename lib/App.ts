import http from "http";
import EventEmitter from "events";
import Layer from "./Layer";
import HttpResponse from "./HttpResponse";
import { HttpRequest, Handler, AppMethod, HttpError } from "./types";
import assert from "assert";

type RouteMiddlewareMethod = (path: string, handler: Handler) => void;
type MiddlewareMethod = (handler: Handler) => void;

class App extends EventEmitter {
    public stack: Layer[];

    public get!: RouteMiddlewareMethod;
    public post!: RouteMiddlewareMethod;
    public put!: RouteMiddlewareMethod;
    public delete!: RouteMiddlewareMethod;
    public use!: MiddlewareMethod;

    constructor() {
        super();
        this.stack = [];
    }

    dispatch = (req: HttpRequest, res: HttpResponse) => {
        let idx = 0;

        const next = (err?: HttpError): void => {
            if (idx >= this.stack.length) {
                return res.status(404).send("Page cannot be found");
            }

            const layer = this.stack[idx++] as Layer;

            // Execute any non-route handling middleware
            if (layer.route === null) {
                return layer.handler(req, res, next);
            }

            const match =
                req.url === layer.route && req.method === layer.method;

            if (match) {
                layer.handler(req, res, next);
            } else {
                next();
            }
        };

        next();
    };

    begin = (req: http.IncomingMessage, res: http.ServerResponse): void => {
        this.dispatch(req, new HttpResponse(res));
    };

    listen = (port: number, cb?: () => any): void => {
        const server = http.createServer(this.begin);
        server.listen(port, cb);
    };
}

// Will Implement
class Route {}

(["get", "post", "put", "delete", "use"] as Lowercase<AppMethod>[]).forEach(
    (method) => {
        App.prototype[method] = function (
            pathOrHandler: string | Handler,
            handlerOrRoute?: Handler,
        ): App {
            const stack = this.stack as Layer[];
            const layer = new Layer().addMethod(
                method.toUpperCase() as AppMethod,
            );

            /* (path, callback)*/
            if (
                typeof pathOrHandler === "string" &&
                typeof handlerOrRoute === "function"
            ) {
                assert(
                    handlerOrRoute !== undefined,
                    "Missing middleware argument",
                );
                const route = pathOrHandler;
                const handler = handlerOrRoute;
                layer.addRoute(route).addHandler(handler);

                /* (path, Route)*/
            } else if (
                typeof pathOrHandler === "string" &&
                handlerOrRoute instanceof Route
            ) {
                // 1. Need to prepend path to Route
                // 2. Need to configure Route Layers and spread them into App stack
                /* (callback)*/
            } else if (typeof pathOrHandler === "function") {
                layer.addHandler(pathOrHandler);
            }

            layer.isMod && stack.push(layer);
            return this;
        };
    },
);

export default function createApplication(): App {
    return new App();
}
