import path from "path";
import express, { Req, Res, HttpError, Next } from "../lib/express";
import aRouter from "./routes/aRouter";
const app = express();

// Logger middleware
app.use((req: Req, res: Res, next: Next) => {
    const method = req.method;
    const url = req.url;

    console.log(`${method}: http://localhost:5000${url}`);
    next();
});

app.get("/", (req: Req, res: Res) => {
    res.status(200).send("ayo");
});

app.use("/homepage", app.static(path.resolve("./example/views")));

app.use("/a", aRouter);

app.get("/foo", (req: Req, res: Res) => {
    res.redirect("bar");
});

app.get("/bar", (req: Req, res: Res) => {
    // Will ultimately redirect to /foo/bar
    res.redirect("/foo");
});

app.get("/foo/bar", (req: Req, res: Res) => {
    res.status(200).send("ayoooo");
});

app.use((err: HttpError, req: Req, res: Res, next: Next) => {
    res.status(500).send("error message placeholder");
});

export default app;
