import http from "http";
import HttpResponse from "./HttpResponse";
import App from "./App";

/* The app[method] names */
export type AppMethod = "GET" | "POST" | "PUT" | "DELETE" | "ALL" | "USE";

export type Req = http.IncomingMessage & {
    app: App;
    body?: any;
    params?: any;
};

export type Res = HttpResponse;

export type HttpError = Error & { status?: number } & { [key: string]: string };

export type Next = (err?: HttpError | "router" | "route") => void;
export type Handler = (req: Req, res: Res, next: Next) => void;
export type ErrorHandler = (
    err: HttpError,
    req: Req,
    res: Res,
    next: Next,
) => void;
export type RouterHandler = (err?: HttpError) => Handler;
