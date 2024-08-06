import { randomUUID } from "crypto";
import assert from "assert";

export interface ICategory {
    id: string;
    name: string;
}

function create({ name, id }: { name: string; id?: string }): ICategory {
    return {
        id: id ?? randomUUID(),
        name,
    };
}

function isCategory(category: unknown): boolean {
    return (
        !!category &&
        typeof category === "object" &&
        "id" in category &&
        typeof category.id === "string" &&
        "name" in category &&
        typeof category.name === "string"
    );
}

function from(arg: object): ICategory {
    assert(isCategory(arg), "Invalid category shape");
    return create(arg as ICategory);
}

export default {
    create,
    isCategory,
    from,
};
