import DB from "../repos/DB";
import { randomUUID } from "crypto";
import assert from "assert";

export interface IItem {
    id: string;
    categoryId: string;
    name: string;
    price: number;
}

function create({
    categoryId,
    name,
    price,
    id,
}: {
    categoryId: string;
    name: string;
    price: number;
    id?: string;
}): IItem {
    return {
        id: id ?? randomUUID(),
        categoryId,
        name,
        price,
    };
}

function isItem(item: unknown): boolean {
    return (
        !!item &&
        typeof item === "object" &&
        "id" in item &&
        typeof item.id === "string" &&
        "categoryId" in item &&
        typeof item.categoryId === "string" &&
        "name" in item &&
        typeof item.name === "string" &&
        "price" in item &&
        typeof item.price === "number"
    );
}

function from(arg: object): IItem {
    assert(isItem(arg), "Invalid item shape");
    return create(arg as IItem);
}

async function joined(arg: object) {
    const item: IItem = from(arg);

    const ctg = await DB.Get.category(item.categoryId);

    return {
        id: item.id,
        name: item.name,
        price: item.price,
        category: ctg?.name,
    };
}

export default {
    create,
    isItem,
    from,
    joined,
};
