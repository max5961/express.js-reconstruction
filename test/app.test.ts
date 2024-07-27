import App from "../lib/App";
import createApplication, { begin, Router } from "../lib/express";
import HttpResponse from "../lib/HttpResponse";
import { Req, Res } from "../lib/types";
import http from "node:http";

function newTest(
    route: string = "/",
    method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
): [Req, Res, Router] {
    const req = { method, url: route } as Req;
    const res = {} as Res;
    Object.setPrototypeOf(res, HttpResponse.prototype);

    return [req, res, new Router()];
}

describe("Route", () => {
    it("This should fail", () => {
        const [req, res, router] = newTest();

        router.get("/", (req, res) => {
            throw new Error("fuark");
        });

        router.dispatch(req, res, () => {});
    });
});
