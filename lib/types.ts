import http from "http";
import HttpResponse from "./HttpResponse";

/* The app[method] names */
export type AppMethod = "GET" | "POST" | "PUT" | "DELETE" | "ALL" | "USE";

export type Req = http.IncomingMessage & {
    body?: any;
    params?: any;
};

export type Res = HttpResponse;

export type HttpError =
    | (Error & { status?: number } & { [key: string]: string })
    | "router"
    | "route";

export type Next = (err?: HttpError) => void;
export type Handler = (req: Req, res: Res, next: Next) => void;
export type ErrorHandler = (
    err: HttpError,
    req: Req,
    res: Res,
    next: Next,
) => void;
export type RouterHandler = (err?: HttpError) => Handler;
