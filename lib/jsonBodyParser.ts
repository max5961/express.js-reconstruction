import { Res, Req, Next } from "./types";

const json = () => (req: Req, res: Res, next: Next) => {
    req.setEncoding("utf-8");
    req.body = "";

    const contentType = req.headers["content-type"];
    const len = req.headers["content-length"];

    if (!len) {
        return next();
    }

    req.on("data", (chunk: Buffer) => {
        req.body += chunk;
    });

    req.on("end", () => {
        if (contentType === "application/json") {
            req.body = JSON.parse(req.body);
        }
        next();
    });
};

export default json;
