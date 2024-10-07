import AltForm from "./AltForm";
import Chain from "./Chain";
import { Action } from "./DataManager";
import { PurchaseType } from "./Purchase";
import { GID, Id, getFreeId } from "./Types";

export interface CharacterSummary {
    name: string;
    primary: boolean;
    id: number;
    perkCount: number;
    itemCount: number;
}

export interface Personality {
    personality: string,
    motivation: string,
    likes: string,
    dislikes: string,
    quirks: string
}

export default class Character implements CharacterSummary {

    private _id!: Id<GID.Character>;

    name: string = "Jumper";
    gender: string = "Mysterious";
    originalAge: number = 15 + Math.floor(Math.random() * 20);
    personality: Personality = { personality: "", motivation: "", likes: "", dislikes: "", quirks: "" };
    background: { summary: string, description: string } = { summary: "Typical Universe Denizen", description: "" };

    notes: string = "";

    private _primary: boolean = false;

    originalForm: Id<GID.AltForm> = -1;

    perkCount: number = 0;
    itemCount: number = 0;

    chain!: Chain;

    get id(): Id<GID.Character> {
        return this._id;
    }

    public get primary(): boolean {
        return this._primary;
    }

    public set primary(value: boolean) {
        if (this._primary == value) return;
        this._primary = value;
        if (value) {
            for (let jId in this.chain.jumps) {
                this.chain.requestJump(Number(jId)).registerCharacter(this.id);
            }
            for (let pId in this.chain.purchases) {
                if (this.chain.requestPurchase(Number(pId)).type != PurchaseType.Companion) return;
                this.chain.requestPurchase(Number(pId)).importData!.characters.delete(this.id);
            }
        } else {
            for (let jId in this.chain.jumps) {
                this.chain.requestJump(Number(jId)).deregisterCharacter(this.id);
            }
        }
    }

    constructor(chain: Chain | null, id?: number) {
        if (chain === null)
            return;
        this.chain = chain;
        this._id = (id !== undefined) ? id : getFreeId<GID.Character>(chain.characters);
        chain.characters[this._id] = this;
        chain.characterList.push(this._id);
        chain.purchaseGroups[this._id] = {};

        this.chain.pushUpdate({
            dataField: ["characterList"],
            action: Action.Update
        });

        this.chain.pushUpdate({
            dataField: ["characters", this._id],
            action: Action.New
        });

        this.chain.pushUpdate({
            dataField: ["purchaseGroups", this._id],
            action: Action.New
        });

        this.originalForm = (new AltForm(chain, this._id)).id;

    }

    get trueAge(): number {
        let age = Number(this.originalAge) || 0;
        this.chain.jumpList.forEach((id) => {
            age += this.chain.jumps[id].characters.has(this._id) ?
                this.chain.jumps[id].duration.years + this.chain.jumps[id].duration.months / 12 + this.chain.jumps[id].duration.days / 365
                : 0;
        });
        return Math.round(age);
    }

    get jumpsMade(): number {
        let jumps = 0;
        this.chain.jumpList.forEach((id) => {
            jumps += this.chain.jumps[id].characters.has(this._id) ? 1 : 0;
        });
        return jumps;
    }

    get firstJump(): number {
        for (let id of this.chain.jumpList) {
            if (this.chain.jumps[id].characters.has(this._id))
                return id;
        }

        return -1;
    }



    deserialize(rawObject: any, chain: Chain) {
        Object.assign(this, rawObject);
        this.chain = chain;
        return this;
    }


}