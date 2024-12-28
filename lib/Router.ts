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
import assert from "assert";

export default class Router extends EventEmitter {
    public stack: Layer[];
    public base: string;
    public routers: Router[];
    public debug: boolean;

    public get!: VerbArgs;
    public post!: VerbArgs;
    public put!: VerbArgs;
    public delete!: VerbArgs;
    public all!: VerbArgs;

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

        let base = this.base;
        if (base.endsWith("/")) {
            base = base.slice(0, base.length - 1);
        }

        if (path.endsWith("/")) {
            path = path.slice(0, path.length - 1);
        }

        if (base + path === "") return "/";
        return base + path;
    }

    prependRoute(path: string): void {
        assert(path.startsWith("/"));
        assert(this.base.startsWith("/"));

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

        const next = (err?: HttpError | "router" | "route") => {
            if (this.stack.length === 0) {
                return done(err);
            }

            // Middleware passed in 'router' to 'next'.  Exit router
            if (err && err === "router") {
                return done();
            }

            // Middleware passed in 'route' to 'next'.  Exit current route
            if (err && err === "route") {
                return next();
            }

            const layer = this.stack[idx++];

            // We are at the end of the stack, exit to the next router
            if (!layer) {
                return done(err);
            }

            // This is a Router, and we need to make sure it has access to the
            // Error object if there is one
            if (layer.routerHandler) {
                const handler = layer.routerHandler(err) as Handler;
                layer.addHandler(handler);
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
                if (err && typeof err != "string" && layer.errorHandler) {
                    return layer.errorHandler(err, req, res, next);
                } else if (layer.handler) {
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

    // if (this.debug) {
    //     console.log(
    //         `url: ${req.url} | route: ${route} || method: ${req.method} | layermethod: ${layer.method}`,
    //     );
    // }
    isMatch(req: Req, layer: Layer): boolean {
        if (!layer.route) return false;
        const route = this.getRoute(layer.route);
        const { params, paramRt, isSameLen } = this.getRouteParams(
            route,
            req.url || "",
        );

        req.params = params;

        if (layer.method === "ALL" && req.url === paramRt) return true;

        return req.url === paramRt && req.method === layer.method;
    }

    getRouteParams(
        route: string,
        reqRoute: string,
    ): {
        params: { [key: string]: string };
        paramRt: string;
        isSameLen: boolean;
    } {
        const L = route.split("/");
        const R = reqRoute.split("/");

        const params: { [key: string]: string } = {};

        for (let i = 0; i < L.length; ++i) {
            if (L[i].startsWith(":")) {
                params[L[i].slice(1)] = R[i];
                L[i] = R[i];
            }
        }

        return {
            params,
            paramRt: L.join("/"),
            isSameLen: L.length === R.length,
        };
    }

    handleUseNoRoute(
        handler: Function | Function[],
        handlerOrRouter: Function | Function[] | undefined,
        ...args: Function[]
    ): void {
        const allHandlers: Function[] = [];

        if (Array.isArray(handler)) {
            allHandlers.push(...handler);
        } else {
            allHandlers.push(handler);
        }

        if (Array.isArray(handlerOrRouter)) {
            allHandlers.push(...handlerOrRouter);
        } else if (handlerOrRouter) {
            allHandlers.push(handlerOrRouter);
        }

        allHandlers.push(...args);

        for (const h of allHandlers) {
            // For express.static
            if (h.length === 1) {
                const layer = h("/") as Layer;
                this.stack.push(layer);
                continue;
            }

            const layer = new Layer();

            if (h.length > 3) {
                layer.addErrorHandler(h as ErrorHandler);
            } else {
                layer.addHandler(h as Handler);
            }

            this.stack.push(layer);
        }
    }

    handleUseWithRoute(
        route: string,
        handler: Function | Function[],
        ...args: Function[]
    ): void {
        const handlers: Function[] = Array.isArray(handler)
            ? handler
            : [handler, ...args];

        this.stack.push(
            ...handlers.map((h) => {
                const layer = new Layer();

                if (h.length === 1) {
                    // For express.static. Returns a Layer, but needed a way
                    // to get a dynamic route argument into each layer.
                    return h(route);
                } else if (h.length === 4) {
                    layer.addErrorHandler(h as ErrorHandler);
                } else {
                    layer.addHandler(h as Handler);
                }

                route && layer.addRoute(route);
                layer.addMethod("GET");

                return layer;
            }),
        );
    }

    handleUseRouter(route: string | undefined, router: Router): void {
        this.routers.push(router);

        this.prependRouters(route || "");

        /* Entry point to execute the nested router's stack.  It needs access to
         * the current router's error state to allow for error state to fall
         * through routers. */
        const routerHandler =
            (err?: HttpError) => (req: Req, res: Res, done: Next) => {
                if (err) {
                    router.dispatch(req, res, () => done(err));
                } else {
                    router.dispatch(req, res, done);
                }
            };

        const layer = new Layer().addRouterHandler(routerHandler);

        this.stack.push(layer);
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
            this.handleUseNoRoute(routeOrHandler, handlerOrRouter, ...args);
        } else if (handlerOrRouter && !(handlerOrRouter instanceof Router)) {
            assert(typeof route === "string");
            this.handleUseWithRoute(route, handlerOrRouter, ...args);
        } else if (handlerOrRouter instanceof Router) {
            this.handleUseRouter(route, handlerOrRouter);
        } else {
            throw new Error("Invalid function signature");
        }

        return this;
    }

    route(rtPath: string): Router {
        const router = new Router();
        this.use(rtPath, router);
        return router;
    }
}

type VerbArgs = (
    routeOrHandler: string | Function | Function[],
    handler?: Function | Function[],
    ...argsHandlers: Function[]
) => Router;

// These all require a path argument.
(["get", "post", "put", "delete", "all"] as Lowercase<AppMethod>[]).forEach(
    (method) => {
        Router.prototype[method] = function (
            routeOrHandler: string | Function | Function[],
            handler?: Function | Function[],
            ...argsHandlers: Function[]
        ): Router {
            let route = routeOrHandler;
            if (typeof routeOrHandler !== "string") {
                route = "/";
            }

            assert(typeof route === "string");

            const stack = this.stack;
            const allHandlers = [];

            if (typeof routeOrHandler === "function") {
                allHandlers.push(routeOrHandler);
            } else if (Array.isArray(routeOrHandler)) {
                allHandlers.push(...routeOrHandler);
            }

            if (handler && typeof handler === "function") {
                allHandlers.push(handler);
            } else if (handler && Array.isArray(handler)) {
                allHandlers.push(...handler);
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
