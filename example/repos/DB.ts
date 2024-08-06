import Instance, { IItemInst } from "../models/ItemInstanceSchema";
import Item, { IItem } from "../models/ItemSchema";
import Category, { ICategory } from "../models/CategorySchema";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert";

interface Data {
    instances: {
        [instanceId: string]: Omit<IItemInst, "id">;
    };
    items: {
        [itemId: string]: Omit<IItem, "id">;
    };
    categories: {
        [categoryId: string]: Omit<ICategory, "id">;
    };
}

let DB_PATH = path.resolve("./example/repos/database.json");
if (process.env.TEST) {
    DB_PATH = path.resolve("./example/repos/testDatabase.json");
}

async function openDb(): Promise<Data> {
    const data = await fs.readFile(DB_PATH, "utf-8");
    return JSON.parse(data) as Data;
}

async function saveDb(data: Data): Promise<void> {
    const json = JSON.stringify(data, null, 4);
    await fs.writeFile(DB_PATH, json, "utf-8");
}

async function clearDb(): Promise<void> {
    const data = {
        categories: {},
        items: {},
        instances: {},
    };

    await saveDb(data);
}

class Insert {
    // insert one category
    async category(data: ICategory): Promise<void> {
        const newCtg: ICategory = Category.from(data);

        const db: Data = await openDb();

        const newCtgName = newCtg.name.toUpperCase();
        for (const [_, val] of Object.entries(db.categories)) {
            // category already exists
            if (val.name.toUpperCase() === newCtgName) {
                return;
            }
        }

        db.categories[newCtg.id] = { name: newCtg.name };

        await saveDb(db);
    }

    // insert one item
    async item(data: IItem): Promise<void> {
        const newItem: IItem = Item.from(data);

        const db: Data = await openDb();

        const newItemName = newItem.name.toUpperCase();
        for (const [_, val] of Object.entries(db.items)) {
            // item already exists
            if (val.name.toUpperCase() === newItemName) {
                if (val.categoryId === newItem.categoryId) {
                    return;
                }
            }
        }

        db.items[newItem.id] = {
            name: newItem.name,
            price: newItem.price,
            categoryId: newItem.categoryId,
        };

        await saveDb(db);
    }

    // insert one instance
    async instance(data: IItemInst): Promise<void> {
        const inst: IItemInst = Instance.from(data);

        const db: Data = await openDb();

        if (inst.id in db.instances) return;

        const itemId = inst.itemId;
        const categoryId = inst.categoryId;

        db.instances[inst.id] = { itemId, categoryId };

        await saveDb(db);
    }
}

class Get {
    /* Get instance with a given id */
    async instance(instanceId: string): Promise<IItemInst | null> {
        const db: Data = await openDb();

        if (!(instanceId in db.instances)) {
            return null;
        }

        const instance = db.instances[instanceId];

        return {
            id: instanceId,
            itemId: instance.itemId,
            categoryId: instance.categoryId,
        };
    }

    /* Get all instances containing a given category id */
    async instancesByCategory(
        ctgId: string,
    ): Promise<ReturnType<typeof Instance.joined>[] | null> {
        const db: Data = await openDb();

        if (!(ctgId in db.categories)) {
            return null;
        }

        return this.instancesByConditional(db, (cid: string) => cid === ctgId);
    }

    /* Get all instances containing a given item id */
    async instancesByItem(
        itemId: string,
    ): Promise<ReturnType<typeof Instance.joined>[] | null> {
        const db: Data = await openDb();

        if (!(itemId in db.items)) {
            return null;
        }

        return this.instancesByConditional(
            db,
            (_: string, iid: string) => iid === itemId,
        );
    }

    /* Get all instances containing a certain item id and category id*/
    async instancesByItemAndCategory(
        ctgId: string,
        itemId: string,
    ): Promise<ReturnType<typeof Instance.joined>[] | null> {
        const db: Data = await openDb();

        if (!(ctgId in db.categories) || !(itemId in db.items)) {
            return null;
        }

        return this.instancesByConditional(db, (cid: string, iid: string) => {
            return cid === ctgId && iid === itemId;
        });
    }

    /* Helper function for instancesBy...*/
    async instancesByConditional(
        db: Data,
        bool: (cid: string, iid: string) => boolean,
    ): Promise<ReturnType<typeof Instance.joined>[]> {
        const instances: ReturnType<typeof Instance.joined>[] = [];

        for (const [instId, inst] of Object.entries(db.instances)) {
            if (bool(inst.categoryId, inst.itemId)) {
                const instance: IItemInst = {
                    id: instId,
                    categoryId: inst.categoryId,
                    itemId: inst.categoryId,
                };

                instances.push(Instance.joined(instance));
            }
        }

        return instances;
    }

    /* Get Category by a given id */
    async category(ctgId: string): Promise<ICategory | null> {
        const db: Data = await openDb();

        if (!(ctgId in db.categories)) {
            return null;
        }

        const ctg = db.categories[ctgId];

        return {
            id: ctgId,
            name: ctg.name,
        };
    }

    /* Get all Categories */
    async allCategories(): Promise<ICategory[]> {
        const db: Data = await openDb();

        return Object.keys(db.categories).map((key) => {
            const category = db.categories[key] as ICategory;
            category.id = key;

            return category;
        });
    }

    /* Get Item by a given id */
    async item(itemId: string): Promise<IItem | null> {
        const db: Data = await openDb();

        if (!(itemId in db.items)) {
            return null;
        }

        const item = db.items[itemId];

        return {
            id: itemId,
            categoryId: item.categoryId,
            price: item.price,
            name: item.name,
        };
    }

    /* Get all Items */
    async allItems(): Promise<IItem[]> {
        const db: Data = await openDb();

        return Object.keys(db.items).map((itemKey) => {
            const item = db.items[itemKey] as IItem;
            item.id = itemKey;

            return item;
        });
    }

    /* Get all Items with their count */
    async allItemsWithCount(): Promise<ItemWCount[]> {
        const db: Data = await openDb();

        const itemIdCounts = Object.keys(db.instances)
            .map((instanceKey) => {
                const instance = db.instances[instanceKey] as IItemInst;
                instance.id = instanceKey;

                return instance;
            })
            .reduce(
                (acc, curr) => {
                    if (curr.itemId in acc) {
                        ++acc[curr.itemId];
                    } else {
                        acc[curr.itemId] = 1;
                    }

                    return acc;
                },
                {} as { [itemId: string]: number },
            );

        const r: ItemWCount[] = [];

        for (const itemId of Object.keys(itemIdCounts)) {
            const item = await this.item(itemId);
            assert(item !== null);

            const itemJoined = await Item.joined(item);

            const itemWCount: ItemWCount = {
                ...itemJoined,
                count: itemIdCounts[itemId],
            };

            r.push(itemWCount);
        }

        return r;
    }

    async itemsByCategoryWithCount(ctgId: string): Promise<ItemWCount[]> {
        const allItems: ItemWCount[] = await this.allItemsWithCount();
        const ctg = await this.category(ctgId);

        if (!ctg) {
            return [];
        }

        return allItems.filter((item) => item.category === ctg.name);
    }
}

type ItemWCount = Awaited<ReturnType<typeof Item.joined>> & { count: number };

export default {
    openDb,
    saveDb,
    clearDb,
    Insert: new Insert(),
    Get: new Get(),
};
