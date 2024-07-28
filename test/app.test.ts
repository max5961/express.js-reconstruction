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

describe("Router.getRoute(path)", () => {
    /* Each router has a 'base' property initialized to "/".  getRoute does not
     * modify the value of base, but returns base + path */
    const router = new Router();

    it("Appends /foo root route", () => {
        const joined = router.getRoute("/foo");
        expect(joined).toBe("/foo");
    });

    it("Appends /foo/bar/baz to root route", () => {
        const joined = router.getRoute("/foo/bar/baz");
        expect(joined).toBe("/foo/bar/baz");
    });

    it("Trims end of route", () => {
        const joined = router.getRoute("/foo/");
        expect(joined).toBe("/foo");
    });

    it("Appends /", () => {
        const joined = router.getRoute("/");
        expect(joined).toBe("/");
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
            mock();
            next();
        });
        cRouter.use("/d", dRouter);

        const bRouter = new Router();
        bRouter.get("/", (req: Req, res: Res, next: Next) => {
            mock();
            next();
        });
        bRouter.use("/c", cRouter);

        const aRouter = new Router();
        aRouter.get("/", (req: Req, res: Res, next: Next) => {
            mock();
            next();
        });
        aRouter.use("/b", bRouter);

        router.use("/a", aRouter);

        router.dispatch(req, res, () => {
            expect(mock).toHaveBeenCalledTimes(1);
        });
    });

    it("Catches error and goes directly to default handler on Error", () => {
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

    it("Handles get requests", () => {
        const { req, res, done, router } = newTest("/", "GET");
        const mock = jest.fn();
        router.get("/", (req: Req, res: Res, next: Next) => {
            mock();
            next();
        });

        router.dispatch(req, res, () => {
            expect(mock).toHaveBeenCalledTimes(1);
        });
    });

    it("Handles post requests", () => {
        const { req, res, done, router } = newTest("/", "POST");
        const mock = jest.fn();
        router.post("/", (req: Req, res: Res, next: Next) => {
            mock();
            next();
        });

        router.dispatch(req, res, () => {
            expect(mock).toHaveBeenCalledTimes(1);
        });
    });

    it("Handles put requests", () => {
        const { req, res, done, router } = newTest("/", "PUT");
        const mock = jest.fn();
        router.put("/", (req: Req, res: Res, next: Next) => {
            mock();
            next();
        });

        router.dispatch(req, res, () => {
            expect(mock).toHaveBeenCalledTimes(1);
        });
    });

    it("Handles delete requests", () => {
        const { req, res, done, router } = newTest("/", "DELETE");
        const mock = jest.fn();
        router.delete("/", (req: Req, res: Res, next: Next) => {
            mock();
            next();
        });

        router.dispatch(req, res, () => {
            expect(mock).toHaveBeenCalledTimes(1);
        });
    });

    it("Router.all handles all methods", () => {
        const { req, res, done, router } = newTest();
        const mock = jest.fn();

        router.all("/", (req: Req, res: Res, next: Next) => {
            mock();
            next();
        });

        new Promise((resolve) => {
            req.method = "GET";
            router.dispatch(req, res, () => {
                resolve(null);
            });
        })
            .then(() => {
                return new Promise((resolve) => {
                    req.method = "POST";
                    router.dispatch(req, res, () => {
                        resolve(null);
                    });
                });
            })
            .then(() => {
                return new Promise((resolve) => {
                    req.method = "PUT";
                    router.dispatch(req, res, () => {
                        resolve(null);
                    });
                });
            })
            .then(() => {
                return new Promise((resolve) => {
                    req.method = "DELETE";
                    router.dispatch(req, res, () => {
                        expect(mock).toHaveBeenCalledTimes(4);
                    });
                });
            });
    });

    it("Does not handle incorrect methods or routes", () => {
        const { req, res, done, router } = newTest("/", "GET");
        const mock = jest.fn();

        router.get("/foo", (req: Req, res: Res, next: Next) => {
            mock();
            next();
        });
        router.post("/", (req: Req, res: Res, next: Next) => {
            mock();
            next();
        });
        router.put("/", (req: Req, res: Res, next: Next) => {
            mock();
            next();
        });
        router.delete("/", (req: Req, res: Res, next: Next) => {
            mock();
            next();
        });

        // First dispatch with / and GET
        router.dispatch(req, res, () => {
            // Then dispatch with as /foo and POST
            req.method = "POST";
            req.url = "foo";

            router.dispatch(req, res, () => {
                expect(mock).not.toHaveBeenCalled();
            });
        });
    });
});

describe("router.route(path) allows for method chaining", () => {
    const { req, res, done, router } = newTest("/foo/bar", "GET");
    const allMock = jest.fn();
    const getMock = jest.fn();
    const postMock = jest.fn();
    const putMock = jest.fn();
    const delMock = jest.fn();

    router
        .route("/foo/bar")
        .all((req: Req, res: Res, next: Next) => {
            allMock();
            next();
        })
        .get((req: Req, res: Res, next: Next) => {
            getMock();
            next();
        })
        .post((req: Req, res: Res, next: Next) => {
            postMock();
            next();
        })
        .put((req: Req, res: Res, next: Next) => {
            putMock();
            next();
        })
        .delete((req: Req, res: Res, next: Next) => {
            delMock();
            next();
        });

    it("router.get works", () => {
        router.dispatch(req, res, () => {
            expect(getMock).toHaveBeenCalledTimes(1);
        });
    });
    it("router.post works", () => {
        req.method = "POST";
        router.dispatch(req, res, () => {
            expect(postMock).toHaveBeenCalledTimes(1);
        });
    });
    it("router.put works", () => {
        req.method = "PUT";
        router.dispatch(req, res, () => {
            expect(putMock).toHaveBeenCalledTimes(1);
        });
    });
    it("router.delete works", () => {
        req.method = "DELETE";
        router.dispatch(req, res, () => {
            expect(delMock).toHaveBeenCalledTimes(1);
        });
    });
    it("router.all works", () => {
        router.dispatch(req, res, () => {
            expect(allMock).toHaveBeenCalledTimes(5);
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
