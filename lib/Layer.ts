import Router from "./Router";
import {
    Req,
    Res,
    Handler,
    AppMethod,
    Next,
    ErrorHandler,
    HttpError,
    RouterHandler,
} from "./types";

export default class Layer {
    public route!: string | null;
    public method!: AppMethod;
    public handler!: Handler | null;
    public errorHandler!: ErrorHandler | null;
    public routerHandler!: RouterHandler | null;
    private _isMod: boolean;

    constructor() {
        this.route = null;
        this.handler = null;
        this.errorHandler = null;
        this.routerHandler = null;
        this._isMod = false;
    }

    get isMod(): boolean {
        return this._isMod;
    }

    addRoute(route: string): Layer {
        this.route = route;
        return this;
    }

    addMethod(method: AppMethod): Layer {
        this.method = method;
        this._isMod = true;
        return this;
    }

    addHandler(handler: Handler): Layer {
        this.handler = (req: Req, res: Res, next: Next) => {
            try {
                handler(req, res, next);
            } catch (err) {
                next(err);
            }
        };

        this._isMod = true;
        return this;
    }

    addErrorHandler(errorHandler: ErrorHandler): Layer {
        this.errorHandler = (
            err: HttpError,
            req: Req,
            res: Res,
            next: Next,
        ) => {
            try {
                errorHandler(err, req, res, next);
            } catch (err) {
                next(err);
            }
        };

        return this;
    }

    addRouterHandler(routerHandler: RouterHandler): Layer {
        this.routerHandler = routerHandler;
        return this;
    }

    doesHandleRoutes(): boolean {
        return this.route !== null;
    }
}
