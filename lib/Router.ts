import Layer from "./Layer";
import {
    Req,
    Res,
    Handler,
    ErrorHandler,
    AppMethod,
    Next,
    HttpError,
} from "./types";
import EventEmitter from "events";
import fs from "fs";
import path from "path";
import assert from "assert";

type MiddlewareMethod = (
    route: string,
    handler: Function | Function[],
    ...argsHandlers: Function[]
) => void;

export default class Router extends EventEmitter {
    public stack: Layer[];
    public base: string;
    public routers: Router[];
    public debug: boolean;

    public get!: MiddlewareMethod;
    public post!: MiddlewareMethod;
    public put!: MiddlewareMethod;
    public delete!: MiddlewareMethod;

    constructor() {
        super();
        this.stack = [];
        this.routers = [];
        this.base = "/";
        this.debug = false;
    }

    /* Returns the Layer route appended to the Route, but does not modify
     * the base route.
     * Used with isMatch to match Request URLS to Layer Routes */
    getRoute(path: string): string {
        assert(path.startsWith("/"));

        const route = this.base + path;

        if (route.endsWith("/")) {
            return route.slice(0, route.length - 1);
        }

        return route;
    }

    prependRoute(path: string): void {
        assert(path.startsWith("/"));

        this.base = path + this.base;

        if (this.base.endsWith("/")) {
            this.base = this.base.slice(0, this.base.length - 1);
        }
    }

    /* Make sure every nested router has the correct path prepended */
    prependRouters(route: string): void {
        if (!this.routers.length) return;

        this.routers.forEach((router) => {
            router.prependRoute(route);
            router.prependRouters(route);
        });
    }

    dispatch = (req: Req, res: Res, done: Next) => {
        let idx = 0;
        let sync = 0;

        if (this.stack.length === 0) {
            return done();
        }

        const next = (err?: HttpError) => {
            // Middleware passed in 'router' to 'next'.  Exit router
            if (err && err === "router") {
                return done();
            }

            // Middleware passed in 'route' to 'next'.  Exit current route
            if (err && err === "route") {
                // Still not sure why Express source code does 'done' here, or
                // even the use case of this feature.
                return next();
            }

            const layer = this.stack[idx++];

            // We are at the end of the stack, exit to the next router
            if (!layer) {
                return done(err);
            }

            /* Prevent call stack overflow.  Once a stack size of 100 is reached,
             * every Router iteration will wait until the call stack is empty
             * before proceeding */
            if (++sync > 100) {
                return setImmediate(next, err);
            }

            /* Before doing route and method checks, make sure any non-route
             * handling middleware has a chance to be executed */
            if (!layer.doesHandleRoutes()) {
                if (err && typeof err != "string") {
                    return (
                        layer.errorHandler &&
                        layer.errorHandler(err, req, res, next)
                    );
                }

                if (layer.handler) {
                    return layer.handler(req, res, next);
                }
            }

            const match = this.isMatch(req, layer);

            if (match && !err) {
                return layer.handler && layer.handler(req, res, next);
            } else if (err) {
                next(err);
            } else {
                next();
            }
        };

        next();
    };

    isMatch(req: Req, layer: Layer): boolean {
        if (!layer.route) return false;
        const route = this.getRoute(layer.route);

        // if (this.debug) {
        //     console.log(
        //         `url: ${req.url} | route: ${route} || method: ${req.method} | layermethod: ${layer.method}`,
        //     );
        // }

        return req.url === route && req.method === layer.method;
    }

    handleUseNoRoute(
        handler: Function | Function[],
        ...args: Function[]
    ): Router {
        const allHandlers: Function[] = [];

        if (Array.isArray(handler)) {
            allHandlers.push(...handler);
        } else {
            allHandlers.push(handler);
        }

        if (handler && Array.isArray(handler)) {
            allHandlers.push(...handler);
        } else if (handler) {
            allHandlers.push(handler);
        }

        allHandlers.push(...args);

        allHandlers.forEach((h) => {
            const layer = new Layer();
            if (h.length > 3) {
                layer.addErrorHandler(h as ErrorHandler);
            } else {
                layer.addHandler(h as Handler);
            }
            this.stack.push(layer);
        });

        return this;
    }

    handleUseWithRoute(
        route: string,
        handler: Function | Function[],
        ...args: Function[]
    ): Router {
        const handlers: Function[] = Array.isArray(handler)
            ? handler
            : [handler, ...args];

        this.stack.push(
            ...handlers.map((handler) => {
                const layer = new Layer();

                if (handler.length === 1) {
                    // For express.static. Returns a Layer, but needed a way
                    // to get a dynamic route argument into each layer.
                    return handler(route);
                } else if (handler.length === 4) {
                    layer.addErrorHandler(handler as ErrorHandler);
                } else {
                    layer.addHandler(handler as Handler);
                }

                route && layer.addRoute(route);
                layer.addMethod("GET");

                return layer;
            }),
        );

        return this;
    }

    handleUseRouter(route: string | undefined, router: Router): Router {
        this.routers.push(router);

        // Append route to router.base (which is by default "/");
        // router.prependRoute(route || "/");

        // router.routers.forEach((r) => {
        //     r.prependRoute(router.base);
        // });
        this.prependRouters(route || "");

        // Append middleware to this current Routers stack that will
        // execute the middleware in the routers stack
        const handler = (req: Req, res: Res, done: Next) => {
            router.dispatch(req, res, done);
        };

        const layer = new Layer().addHandler(handler);

        this.stack.push(layer);

        return this;
    }

    use(
        routeOrHandler: string | Function | Function[],
        handlerOrRouter?: Router | Function | Function[],
        ...args: Function[]
    ): Router {
        assert(routeOrHandler !== "", "Route argument cannot be ''");

        const route =
            typeof routeOrHandler === "string" ? routeOrHandler : undefined;

        if (!route && !(handlerOrRouter instanceof Router)) {
            assert(typeof routeOrHandler !== "string");
            return this.handleUseNoRoute(routeOrHandler!, ...args);
        } else if (handlerOrRouter && !(handlerOrRouter instanceof Router)) {
            assert(typeof route === "string");
            return this.handleUseWithRoute(route, handlerOrRouter, ...args);
        } else if (handlerOrRouter instanceof Router) {
            return this.handleUseRouter(route, handlerOrRouter);
        } else {
            throw new Error("Invalid function signature");
        }
    }

    static(filePath: string) {
        const files = fs.readdirSync(filePath);

        return files.map((file) => {
            return (route: string) => {
                let getRoute = route;
                if (file !== "index.html") {
                    getRoute = `${route}/${file}`;
                }

                const handler = (req: Req, res: Res, next: Next): void => {
                    res.status(200).sendFile(
                        path.resolve(`${filePath}/${file}`),
                    );
                };

                return new Layer()
                    .addMethod("GET")
                    .addHandler(handler)
                    .addRoute(getRoute);
            };
        });
    }
}

// These all require a path argument.
(["get", "post", "put", "delete"] as Lowercase<AppMethod>[]).forEach(
    (method) => {
        Router.prototype[method] = function (
            route: string,
            handler: Function | Function[],
            ...argsHandlers: Function[]
        ): Router {
            const stack = this.stack;
            const allHandlers = [];
            if (Array.isArray(handler)) {
                allHandlers.push(...handler);
            } else {
                allHandlers.push(handler);
            }

            allHandlers.push(...argsHandlers);

            stack.push(
                ...allHandlers.map((handler) => {
                    const layer = new Layer()
                        .addMethod(method.toUpperCase() as AppMethod)
                        .addRoute(route);

                    if (handler.length > 3) {
                        layer.addErrorHandler(handler as ErrorHandler);
                    } else {
                        layer.addHandler(handler as Handler);
                    }

                    return layer;
                }),
            );

            return this;
        };
    },
);
