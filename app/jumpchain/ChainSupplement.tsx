import Chain from "./Chain";
import { Action } from "./DataManager";
import { GID, Id, PersistentList, getFreeId } from "./Types";

export enum CompanionAccess {
    Unavailable,
    Available,
    Communal,
    Partial
}


export default class ChainSupplement {
    private _id!: Id<GID.Supplement>;

    chain!: Chain;
    name: string = "[untitled supplement]";
    investmentRatio: number = 100;
    maxInvestment: number = 0;
    initialStipend: number = 0;
    perJumpStipend: number = 0;
    companionAccess: CompanionAccess = CompanionAccess.Available;
    currency: string = "SP";
    url?: string;
    purchaseCategories: PersistentList<Id<GID.PurchaseCategory>, string> = {};
    itemLike: boolean = false;

    public get id(): Id<GID.Supplement> {
        return this._id;
    }

    constructor(chain: Chain | null, id?: Id<GID.Supplement>) {
        if (chain === null)
            return;

        this._id = (id !== undefined) ? id : getFreeId<GID.Supplement>(chain.supplements);
        this.chain = chain;

        chain.supplements[this._id] = this;

        this.chain.pushUpdate({
            dataField: ["supplements", this._id],
            action: Action.New
        });


        for (let jId in this.chain.jumps) {
            Object.values(this.chain.requestJump(Number(jId)).supplementPurchases).forEach(
                purchases => { purchases[this._id] = []; }
            );
            Object.values(this.chain.requestJump(Number(jId)).supplementInvestments).forEach(
                purchases => { purchases[this._id] = 0; }
            );

            this.chain.pushUpdate({
                dataField: ["jumps", jId, "supplementPurchases"],
                action: Action.Update
            });
            this.chain.pushUpdate({
                dataField: ["jumps", jId, "supplementInvestments"],
                action: Action.Update
            });

        }

    }

    deserialize(rawObject: any, chain: Chain) {
        Object.assign(this, rawObject);
        this.chain = chain;
        return this;
    }


}