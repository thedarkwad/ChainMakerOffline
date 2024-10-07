import LZString from "lz-string";
import Chain from "./Chain";
import importV1Chain from "./ImportV1";
import { Action } from "./DataManager";


export function exportChainFragment(fragment: any) {
    return JSON.stringify(fragment, (
        (key, value) =>
        (key == "chain" ? undefined :
            value instanceof Set ? [...value] :
                value
        )));
}

export function importChain(rawObject: any) {
    if (rawObject[1] && rawObject[1].VersionNumber == "1.0")
        return importV1Chain(rawObject[1], Number(rawObject[0] + 1));
    let chain = (new Chain()).deserialize(rawObject);

    for (let jump of Object.values(chain.jumps)) {
        if (Object.keys(jump.supplementPurchases).length == 0) {
            jump.supplementPurchases = {};
            jump.characters.forEach((id) => jump.supplementPurchases[id] = Object.fromEntries(Object.keys(chain.supplements).map(id2 => [id2, []])));
            chain.pushUpdate({
                dataField: ["jumps", jump.id, "supplementPurchases"],
                action: Action.New
            });
        }
    }

    for (let characterId of chain.characterList) {
        if (!chain.purchaseGroups[characterId]) {
            chain.purchaseGroups[characterId] = {};
            chain.pushUpdate({
                dataField: ["purchaseGroups"],
                action: Action.Update
            });
        }
    }



    for (let pId in chain.purchases) {
        if (Number(pId) != chain.purchases[pId]._id) {
            chain.purchases[pId]._id = Number(pId);
            chain.pushUpdate({
                dataField: ["purchases", pId, "_id"],
                action: Action.Update
            });
        }
    }
    return chain;
}
