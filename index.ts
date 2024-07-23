import { HttpError, HttpRequest, Next } from "./lib/types";
import HttpResponse from "./lib/HttpResponse";
import express from "./lib/App";

const app = express();

// Logger middleware
app.use((req: HttpRequest, res: HttpResponse, next: Next) => {
    const method = req.method;
    const url = req.url;

    console.log(`${method}: http://localhost:5000${url}`);
    next();
});

// app.use(
//     app.static(path.resolve("views"), {
//         routePath: "/homepage",
//     }),
// );

app.get("/", (req: HttpRequest, res: HttpResponse) => {
    res.status(200).json({ hello: "world" });
});

app.get("/api", (req: HttpRequest, res: HttpResponse) => {
    throw new Error("LOL");
    res.status(200).json({ foo: "bar" });
});

app.get("/users", (req: HttpRequest, res: HttpResponse) => {
    res.status(200).send("hello world");
});

app.use((err: HttpError, req: HttpRequest, res: HttpResponse, next: Next) => {
    throw new Error("Lol but again");
    res.status(500).send(err.message);
});

app.use((err: HttpError, req: HttpRequest, res: HttpResponse, next: Next) => {
    res.status(500).send(err.message);
});

app.listen(5000, () => {
    console.log("Server listening on port 5000");
});
