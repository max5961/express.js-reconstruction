import { Next, Req, Res } from "./types";

const urlencoded = () => (req: Req, res: Res, next: Next) => {
    if (!req.url) {
        req.url = "/";
    }

    const regexResults = /(.*)\?(.*)/.exec(req.url);

    if (!regexResults) return next();

    req.url = regexResults[1];
    const searchParams = new URLSearchParams(regexResults[2]);

    req.body = {};
    for (const [k, v] of searchParams.entries()) {
        req.body[k] = v;
    }

    next();
};

export default urlencoded;
