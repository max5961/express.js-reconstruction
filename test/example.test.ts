import DB from "../example/repos/DB";
import Category from "../example/models/CategorySchema";
import Instance from "../example/models/ItemInstanceSchema";
import Item from "../example/models/ItemSchema";
import { randomUUID } from "crypto";

/* Needs to run sequentially so everything runs in a single test */
test("Example DB.Insert and DB.Get methods", async () => {
    /* Clear Test Database*/
    await DB.clearDb();

    const cid1 = randomUUID();
    const iid1 = randomUUID();
    const insid1 = randomUUID();

    Promise.resolve().then();

    /* Category */
    const ctgName = "Bikes";
    const ctg = Category.create({ id: cid1, name: ctgName });
    await DB.Insert.category(ctg);
    const readCtg = await DB.Get.category(cid1);
    expect(readCtg).toEqual(ctg);

    /* Item */
    const itemName = "Street Racer 5000";
    const price = 99.99;
    const item = Item.create({
        id: iid1,
        name: itemName,
        categoryId: cid1,
        price,
    });
    await DB.Insert.item(item);
    const readItem = await DB.Get.item(iid1);
    expect(readItem).toEqual(item);

    /* Instance */
    const inst = Instance.create({
        id: insid1,
        categoryId: cid1,
        itemId: iid1,
    });
    await DB.Insert.instance(inst);
    const readInst = await DB.Get.instance(insid1);
    expect(readInst).toEqual(inst);

    /* Add Instances */
    for (let i = 0; i < 5; ++i) {
        const newInsid = randomUUID();
        const newInst = Instance.create({
            id: newInsid,
            categoryId: cid1,
            itemId: iid1,
        });

        await DB.Insert.instance(newInst);
        const readInst = await DB.Get.instance(newInsid);
        expect(readInst).toEqual(newInst);
    }

    /* Count Items with their Count */
    const bikes = await DB.Get.allItemsWithCount();
    expect(bikes).toEqual([
        {
            id: iid1,
            name: itemName,
            category: ctgName,
            price: price,
            count: 6,
        },
    ]);

    /* Add Guitar Amp category and instances*/
    const cid2 = randomUUID();
    const iid2 = randomUUID();

    const ctg2Name = "Guitar Amps";
    const ctg2 = Category.create({ id: cid2, name: ctg2Name });
    await DB.Insert.category(ctg2);
    const readCtg2 = await DB.Get.category(cid2);
    expect(readCtg2).toEqual(ctg2);

    const item2Name = "EVH 5150";
    const price2 = 1299.99;
    const item2 = Item.create({
        id: iid2,
        name: item2Name,
        categoryId: cid2,
        price: price2,
    });
    await DB.Insert.item(item2);
    const readItem2 = await DB.Get.item(iid2);
    expect(readItem2).toEqual(item2);

    for (let i = 0; i < 3; ++i) {
        const instId = randomUUID();
        const inst = Instance.create({
            id: instId,
            itemId: iid2,
            categoryId: cid2,
        });

        await DB.Insert.instance(inst);
    }

    /* Count Just Guitar Amp items */
    const guitarAmps = await DB.Get.itemsByCategoryWithCount(cid2);
    expect(guitarAmps).toEqual([
        {
            id: iid2,
            name: item2Name,
            category: ctg2Name,
            price: price2,
            count: 3,
        },
    ]);
});
