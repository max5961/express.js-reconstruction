import Layer from "./Layer";
import {
    HttpRequest,
    Handler,
    ErrorHandler,
    AppMethod,
    Next,
    HttpError,
} from "./types";
import HttpResponse from "./HttpResponse";
import EventEmitter from "events";
import fs from "fs";
import path from "path";
import assert from "assert";

type MiddlewareMethod = (
    route: string,
    handler: Function | Function[],
    ...argsHandlers: Function[]
) => void;

type Done = (err?: HttpError) => void;

export default class Router extends EventEmitter {
    public stack: Layer[];
    public base: string;
    public router: Router | null;

    public get!: MiddlewareMethod;
    public post!: MiddlewareMethod;
    public put!: MiddlewareMethod;
    public delete!: MiddlewareMethod;

    constructor() {
        super();
        this.stack = [];
        this.router = null;
        this.base = "/";
    }

    appendRoute(path: string): void {
        if (this.base.endsWith("/")) {
            const length = this.base.length;
            this.base = this.base.slice(0, length);
        }

        this.base.concat("", path);
    }

    dispatch = (req: HttpRequest, res: HttpResponse, done: Next) => {
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

            const match =
                req.url === layer.route && req.method === layer.method;

            if (match) {
                return layer.handler && layer.handler(req, res, next);
            } else if (err) {
                next(err);
            } else {
                next();
            }
        };

        next();
    };

    use(
        routeOrHandler: string | Function | Function[],
        handlerOrRouter?: Router | Function | Function[],
        ...args: Function[]
    ): Router {
        assert(routeOrHandler !== "", "Route argument cannot be ''");

        const route =
            typeof routeOrHandler === "string" ? routeOrHandler : undefined;

        // app.use(cb, cb, cb) || app.use([cb, cb, cb]);
        if (!route && !(handlerOrRouter instanceof Router)) {
            assert(typeof routeOrHandler !== "string");
            const handlers: Function[] = [];

            if (Array.isArray(routeOrHandler)) {
                handlers.push(...routeOrHandler);
            } else {
                handlers.push(routeOrHandler);
            }

            if (handlerOrRouter && Array.isArray(handlerOrRouter)) {
                handlers.push(...handlerOrRouter);
            } else if (handlerOrRouter) {
                handlers.push(handlerOrRouter);
            }

            handlers.push(...args);

            for (const handler of handlers) {
                const layer = new Layer();
                if (handler.length > 3) {
                    layer.addErrorHandler(handler as ErrorHandler);
                } else {
                    layer.addHandler(handler as Handler);
                }
                this.stack.push(layer);
            }

            // for express.static or other middleware that accepts a path argument
        } else if (handlerOrRouter && !(handlerOrRouter instanceof Router)) {
            const handlers: Function[] = Array.isArray(handlerOrRouter)
                ? handlerOrRouter
                : [handlerOrRouter, ...args];

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
        }

        // All combinations besides app.use("/path", routerInstance) or
        // app.use(routerInstance) have been handled
        else if (handlerOrRouter instanceof Router) {
            const router = handlerOrRouter;

            // Append route to router.base (which is by default "/");
            router.appendRoute(route || "");

            // Append middleware to this current Routers stack that will
            // execute the middleware in the routers stack
            const handler = (
                req: HttpRequest,
                res: HttpResponse,
                done: Next,
            ) => {
                return this.dispatch(req, res, done);
            };

            const layer = new Layer().addHandler(handler);

            this.stack.push(layer);
        } else {
            // Could get rid of this, but its best to keep it for devel and
            // would notify the user why a handler was not executing
            throw new Error("Invalid function signature");
        }

        return this;
    }

    static(filePath: string) {
        const files = fs.readdirSync(filePath);

        return files.map((file) => {
            return (route: string) => {
                let getRoute = route;
                if (file !== "index.html") {
                    getRoute = `${route}/${file}`;
                }

                const handler = (
                    req: HttpRequest,
                    res: HttpResponse,
                    next: Next,
                ): void => {
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
