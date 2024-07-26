import http from "http";
import HttpResponse from "./HttpResponse";

/* The app[method] names */
export type AppMethod = "GET" | "POST" | "PUT" | "DELETE" | "USE";

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
export type Handler = (req: Req, res: Res, next: Next) => void | Promise<void>;
export type ErrorHandler = (
    err: HttpError,
    req: Req,
    res: Res,
    next: Next,
) => void | Promise<void>;

// export type H<Req = HttpRequest, Res = HttpResponse, N = Next> = (
//     req: Req,
//     res: Res,
//     next: N,
// ) => void | Promise<void>;

// export type H<T extends Function> = T extends { length: 4 }
//     ? ErrorHandler
//     : T extends { length: 1 }
//       ? (route: string) => Handler
//       : Handler;
//
// // Unfortunately, no way of inferring parameter types with adding a template arg
// const h: H<(req: HttpRequest, res: HttpResponse) => void | Promise<void>> = (req, res) => {
//     //
// }
