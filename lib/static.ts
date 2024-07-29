import fs from "fs";
import path from "path";
import { Req, Res, Next } from "./types";
import Layer from "./Layer";

type Return = ((route: string) => Layer)[];

function expressStatic(dirPath: string): Return {
    const files = fs.readdirSync(dirPath);

    return files.map((file) => {
        return (route: string) => {
            let getRoute = route;
            if (file !== "index.html") {
                if (route.endsWith("/")) {
                    getRoute = `${route.slice(1)}/${file}`;
                } else {
                    getRoute = `${route}/${file}`;
                }
            }

            const handler = (req: Req, res: Res, next: Next): void => {
                res.status(200).sendFile(path.resolve(`${dirPath}/${file}`));
            };

            return new Layer()
                .addMethod("GET")
                .addHandler(handler)
                .addRoute(getRoute);
        };
    });
}

export default expressStatic;
