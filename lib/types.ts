import http from "http";
import HttpResponse from "./HttpResponse";

/* The Request.url methods */
// export type RequestMethod = "GET" | "POST" | "PUT" | "DELETE";

/* The app[method] names */
export type AppMethod = "GET" | "POST" | "PUT" | "DELETE" | "USE";

/* These are the types used to start the lifecycle and will be promptly
 * extended or referred to by the the HttpResponse and HttpRequest types afterwards */
// export type HttpResponse = http.ServerResponse;
// export type HttpRequest = http.IncomingMessage;

export type HttpRequest = http.IncomingMessage & {
    body?: any;
    params?: any;
};

export type Next = () => void;
export type Handler = (req: HttpRequest, res: HttpResponse, next: Next) => void;
export type HttpError = Error & { [key: string]: string };
export type ErrorHandler = (
    err: HttpError,
    req: HttpRequest,
    res: HttpResponse,
    next: Next,
) => void;
