import { Handler, AppMethod, HttpRequest, Next } from "./types";
import HttpResponse from "./HttpResponse";

export default class Layer {
    public route!: string | null;
    public method!: AppMethod;
    public handler!: Handler;
    private _isMod: boolean;

    constructor() {
        this.route = null;
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
        this.handler = async (
            req: HttpRequest,
            res: HttpResponse,
            next: Next,
        ) => {
            Promise.resolve(handler(req, res, next)).catch(next);
        };
        this._isMod = true;
        return this;
    }

    doesHandleRoutes(): boolean {
        return this.route !== null;
    }
}
