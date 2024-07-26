import { HttpError, HttpRequest, Next } from "./lib/types";
import HttpResponse from "./lib/HttpResponse";
import express from "./lib/App";
import path from "path";
import Router from "./lib/Router";

const app = express();

// Logger middleware
app.use((req: HttpRequest, res: HttpResponse, next: Next) => {
    const method = req.method;
    const url = req.url;

    console.log(`${method}: http://localhost:5000${url}`);
    next();
});

app.use("/homepage", app.static(path.resolve("views")));

app.get("/", async (req: HttpRequest, res: HttpResponse) => {
    await Promise.resolve(5);
    res.status(200).json({ hello: "world" });
});

app.get("/api", (req: HttpRequest, res: HttpResponse) => {
    // throw new Error("LOL");
    res.status(200).json({ foo: "bar" });
});

/* USERS ROUTER */
const usersRouter = new Router();
usersRouter.get("/", (req: HttpRequest, res: HttpResponse) => {
    res.status(200).send("users");
});
usersRouter.get("/foo", (req: HttpRequest, res: HttpResponse) => {
    res.status(200).send("users/foo");
});

/* NESTED ROUTER */
/* The problem with this is that the route only gets updated when it gets used,
 * app.use(path, router) will need to trigger a recursive chain */
const nestedRouter = new Router();
nestedRouter.get("/", (req: HttpRequest, res: HttpResponse) => {
    res.status(200).send("/users/nested");
});
nestedRouter.get("/foo", (req: HttpRequest, res: HttpResponse) => {
    res.status(200).send("/users/nested/foo");
});

// Right now, usersRouter is still /, so we aren't routing /users/nested, but just /nested
usersRouter.use("/nested", nestedRouter);

app.use("/users", usersRouter);

app.use((err: HttpError, req: HttpRequest, res: HttpResponse, next: Next) => {
    throw new Error("Lol but again");
    console.log(err);
    res.status(500).send("error message placeholder");
});

// app.use((err: HttpError, req: HttpRequest, res: HttpResponse, next: Next) => {
//     res.status(500).send(err.stack ?? err.toString());
// });

app.listen(5000, () => {
    console.log("Server listening on port 5000");
});
