import DB from "../repos/DB";
import { randomUUID } from "crypto";
import assert from "assert";

export interface IItemInst {
    id: string;
    itemId: string;
    categoryId: string;
}

function create({
    itemId,
    categoryId,
    id,
}: {
    itemId: string;
    categoryId: string;
    id?: string;
}): IItemInst {
    return {
        id: id ?? randomUUID(),
        itemId,
        categoryId,
    };
}

function isInstance(inst: unknown): boolean {
    return (
        !!inst &&
        typeof inst === "object" &&
        "id" in inst &&
        typeof inst.id === "string" &&
        "categoryId" in inst &&
        typeof inst.categoryId === "string" &&
        "itemId" in inst &&
        typeof inst.itemId === "string"
    );
}

function from(arg: object): IItemInst {
    assert(isInstance(arg), "Invalid instance shape");
    return create(arg as IItemInst);
}

async function joined(arg: object) {
    const instance: IItemInst = from(arg);

    const ctg = await DB.Get.category(instance.categoryId);
    const item = await DB.Get.item(instance.itemId);

    return {
        id: instance.id,
        categoryName: ctg?.name,
        itemName: item?.name,
    };
}

export default {
    create,
    isInstance,
    from,
    joined,
};
