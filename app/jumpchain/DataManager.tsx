import Chain from "./Chain";
import Character from "./Character";
import { exportChainFragment } from "./ImportExport";
import Jump from "./Jump";
import Purchase from "./Purchase";
import { GID, Id } from "./Types";

export type DataField = (string | number)[];

export enum Action {
    New,
    Update,
    Delete
}

export interface Update {
    dataField: DataField,
    action: Action
}


export default class DataManager {

    updates: Update[] = [];

    pushUpdate(u: Update) {
        let newUpdate: Update | undefined;
        let obsoleteUpdates: Set<number> = new Set();
        let pushUpdate = true;

        for (let i in this.updates) {
            let existingUpdate = this.updates[i];

            // u is equally general
            if (u.dataField.length == existingUpdate.dataField.length &&
                u.dataField.every((field, index) => (index < existingUpdate.dataField.length && field == existingUpdate.dataField[index]))
            ) {
                switch (existingUpdate.action) {
                    case Action.Delete:
                        newUpdate = {
                            dataField: u.dataField,
                            action: (u.action == Action.Delete) ? Action.Delete : Action.Update,
                        }
                        break;
                    case Action.New:
                        if (u.action == Action.Delete) {
                            pushUpdate = false;
                            break;
                        }
                        newUpdate = {
                            dataField: u.dataField,
                            action: Action.New,
                        }
                    case Action.Update:
                        newUpdate = {
                            dataField: u.dataField,
                            action: u.action,
                        }
                        break;
                }
                obsoleteUpdates.add(Number(i));
                break;
            }

            // u is more general
            if (u.dataField.every((field, index) => (index < existingUpdate.dataField.length && field == existingUpdate.dataField[index]))) {
                newUpdate = u;
                obsoleteUpdates.add(Number(i));
            }
            // u is more specific
            if (existingUpdate.dataField.every((field, index) => (index < u.dataField.length && field == u.dataField[index]))) {
                return;
            }
        }
        if (!newUpdate) newUpdate = u;

        this.updates = this.updates.filter((a, index) => { return !obsoleteUpdates.has(index); });
        if (pushUpdate)
            this.updates.push(newUpdate);
    }

    compileUpdates(chain: Chain): (Update & { data?: any })[] {
        let ret: (Update & { data?: any })[] = [];
        for (let update of this.updates) {
            let fieldPath = [...update.dataField];
            console.log(update);
            let finalValue = chain as any;
            if (update.action == Action.Delete) {
                ret.push(update);
                continue;
            }
            while (fieldPath.length > 0) {
                finalValue = finalValue[fieldPath.shift()!];
            }
            ret.push({ ...update, data: JSON.parse(exportChainFragment(finalValue)) });
        }
        return ret;
    }

    requestCharacter(chain: Chain, id: Id<GID.Character>): Character {
        return chain.characters[id] as Character;
    }

    requestJump(chain: Chain, id: Id<GID.Jump>): Jump {
        return chain.jumps[id] as Jump;
    }

    requestPurchase(chain: Chain, id: Id<GID.Purchase>): Purchase {
        return chain.purchases[id] as Purchase;
    }

}
