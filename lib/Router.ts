import Layer from "./Layer";
import {
    HttpRequest,
    Handler,
    ErrorHandler,
    AppMethod,
    HttpError,
} from "./types";
import assert from "assert";

type MiddlewareMethod = (
    pathOrHandler: string | Handler | ErrorHandler,
    handlerOrRouter?: Handler | ErrorHandler | Router,
) => void;

type Done = (err?: HttpError) => void;

export default class Router {
    public stack: Layer[];
    public base: string;

    public get!: MiddlewareMethod;
    public post!: MiddlewareMethod;
    public put!: MiddlewareMethod;
    public delete!: MiddlewareMethod;
    public use!: MiddlewareMethod;

    constructor() {
        this.stack = [];
        this.base = "/";
    }
}

(["get", "post", "put", "delete", "use"] as Lowercase<AppMethod>[]).forEach(
    (method) => {
        Router.prototype[method] = function (
            pathOrHandler: string | Handler | ErrorHandler,
            handlerOrRouter: Handler | ErrorHandler | Router | undefined,
        ): Router {
            const stack = this.stack;
            const layer = new Layer().addMethod(
                method.toUpperCase() as AppMethod,
            );

            /* (path, callback)*/
            if (
                typeof pathOrHandler === "string" &&
                typeof handlerOrRouter === "function"
            ) {
                assert(
                    handlerOrRouter !== undefined,
                    "Missing middleware argument",
                );
                const route = pathOrHandler;
                const handler = handlerOrRouter;
                layer.addRoute(route);

                layer.addHandler(handler as Handler);

                /* (path, Router)*/
            } else if (
                typeof pathOrHandler === "string" &&
                handlerOrRouter instanceof Router
            ) {
                // 1. Need to prepend path to Router
                // 2. Push router to routerStack
                /* (callback)*/
            } else if (typeof pathOrHandler === "function") {
                const handler = pathOrHandler as Handler | ErrorHandler;

                if (handler.length >= 4) {
                    layer.addErrorHandler(handler as ErrorHandler);
                } else {
                    layer.addHandler(handler as Handler);
                }
            }

            layer.isMod && stack.push(layer);
            return this;
        };
    },
);
