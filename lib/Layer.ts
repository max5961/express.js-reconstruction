import {
    Handler,
    AppMethod,
    HttpRequest,
    Next,
    ErrorHandler,
    HttpError,
} from "./types";
import HttpResponse from "./HttpResponse";

export default class Layer {
    public route!: string | null;
    public method!: AppMethod;
    public handler!: Handler | null;
    public errorHandler!: ErrorHandler | null;
    private _isMod: boolean;

    constructor() {
        this.route = null;
        this.handler = null;
        this.errorHandler = null;
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
        this.handler = (req: HttpRequest, res: HttpResponse, next: Next) => {
            const asyncHandler = async () => handler(req, res, next);
            return Promise.resolve(asyncHandler()).catch((err) => {
                next(err);
            });
        };

        this._isMod = true;
        return this;
    }

    addErrorHandler(errorHandler: ErrorHandler): Layer {
        this.errorHandler = async (
            err: HttpError,
            req: HttpRequest,
            res: HttpResponse,
            next: Next,
        ) => {
            const asyncHandler = async () => errorHandler(err, req, res, next);
            return Promise.resolve(asyncHandler()).catch(next);
        };

        return this;
    }

    doesHandleRoutes(): boolean {
        return this.route !== null;
    }
}
