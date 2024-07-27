import { Router } from "../lib/express";
import HttpResponse from "../lib/HttpResponse";
import { HttpError, Next, Req, Res } from "../lib/types";

describe("Testing works", () => {
    it("Request does not fail", () => {
        const { req, res, done, router } = newTest();

        router.get("/", (req: Req, res: Res, next: Next) => {
            next();
        });

        expect(() => {
            router.dispatch(req, res, done);
        }).not.toThrow();
    });

    it("Request fails", () => {
        const { req, res, done, router } = newTest();

        router.get("/", (req: Req, res: Res, next: Next) => {
            throw new Error("Fail");
            next();
        });

        expect(() => {
            router.dispatch(req, res, done);
        }).toThrow();
    });
});

describe("Router", () => {
    it("Does not cause stack overflow", () => {
        const { req, res, done, router } = newTest();

        for (let i = 0; i < 50000; ++i) {
            router.get("/", (req: Req, res: Res, next: Next) => {
                next();
            });
        }

        return new Promise<string>((resolve, reject) => {
            router.dispatch(req, res, (err?: HttpError) => {
                if (err) return resolve("err");
                resolve("clean");
            });
        }).then((str) => {
            expect(str).toBe("clean");
        });
    });

    it("Allows for nested Routing", () => {
        const { req, res, done, router } = newTest("/a/b/c/d");
        const mock = jest.fn();

        const dRouter = new Router();
        dRouter.get("/", (req: Req, res: Res, next: Next) => {
            mock();
            next();
        });

        const cRouter = new Router();
        cRouter.get("/", (req: Req, res: Res, next: Next) => {
            //
        });
        cRouter.use("/d", dRouter);

        const bRouter = new Router();
        bRouter.get("/", (req: Req, res: Res, next: Next) => {
            //
        });
        bRouter.use("/c", cRouter);

        const aRouter = new Router();
        aRouter.get("/", (req: Req, res: Res, next: Next) => {
            //
        });
        aRouter.use("/b", bRouter);

        router.use("/a", aRouter);

        router.dispatch(req, res, () => {
            expect(mock).toHaveBeenCalledTimes(1);
        });
    });

    it("Goes directly to default handler on Error", () => {
        const { req, res, done, router } = newTest();
        const mock = jest.fn();

        for (let i = 0; i < 10; ++i) {
            router.get("/", (req: Req, res: Res, next: Next) => {
                mock();
                if (i === 0) {
                    throw new Error();
                }
                next();
            });
        }

        router.dispatch(req, res, (err?: HttpError) => {
            if (err) {
                console.log("ayo error?");
            }
            expect(mock).toHaveBeenCalledTimes(1);
        });
    });
});

function newTest(
    route: string = "/",
    method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
): { req: Req; res: Res; router: Router; done: Next } {
    const req = { method, url: route } as Req;

    const res = {} as Res;
    Object.setPrototypeOf(res, HttpResponse.prototype);

    const done = (err?: HttpError) => {
        if (err) {
            throw new Error("Fail");
        }
    };

    const router = new Router();

    return { req, res, done, router };
}
