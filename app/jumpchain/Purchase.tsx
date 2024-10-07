import Chain from "./Chain";
import Character from "./Character";
import { Action } from "./DataManager";
import { exportChainFragment } from "./ImportExport";
import Jump, { DrawbackOverride, PurchaseSubtype } from "./Jump";
import LayoutManager, { E, LineBreak, MarkupFragment, T } from "./LayoutManager";
import { GID, Id, IdMap, IdMap2, LID, getFreeId } from "./Types";

export const enum PurchaseType {
    Perk,
    Item,
    Companion,
    Drawback,
    Scenario,
    Supplement,
    Subsystem,
    ChainDrawback,
    SupplementImport
}

export const DefaultSubtype: Record<PurchaseType, Id<LID.PurchaseSubtype> | undefined> = {
    [PurchaseType.Perk]: 0,
    [PurchaseType.Item]: 1,
    [PurchaseType.Companion]: 2,
    [PurchaseType.Drawback]: undefined,
    [PurchaseType.Scenario]: undefined,
    [PurchaseType.Supplement]: undefined,
    [PurchaseType.Subsystem]: undefined,
    [PurchaseType.ChainDrawback]: undefined,
    [PurchaseType.SupplementImport]: undefined
}

export enum CostModifier {
    Full,
    Reduced,
    Free,
    Custom
}

export interface Buyoff {
    characterId: Id<GID.Character>;
    jumpId: Id<GID.Jump>;
}

interface CompanionImportData {
    characters: Set<Id<GID.Character>>;
    allowances: IdMap<LID.Currency, number>;
    stipend: IdMap2<LID.Currency, LID.PurchaseSubtype, number>;
}


interface SupplementImportData {
    characters: Set<Id<GID.Character>>;
    allowance: number;
    percentage: number;
}

export interface PurchaseGroup {
    type: PurchaseType;
    name: string;
    description: string;
    components: Id<GID.Purchase>[];
}

export default class Purchase {
    private _characterId!: Id<GID.Character>;

    private _jumpId!: Id<GID.Jump>;

    public _id!: Id<GID.Purchase>;

    chain!: Chain;

    name: string = "";
    description: string = "";

    value: number = 0;
    currency: Id<LID.Currency> = 0;
    costModifier: CostModifier = CostModifier.Full;
    purchaseValue?: number;

    tags: string[] = [];
    category: Id<GID.PurchaseCategory>[] = [];
    private _type: PurchaseType = PurchaseType.Perk;

    subtype?: Id<LID.PurchaseSubtype>;

    private _purchaseGroup?: Id<GID.PurchaseGroup>;

    duration?: number;
    buyoff?: Buyoff;

    reward?: string;
    itemStipend?: number;
    companionStipend?: number;

    private _importData?: CompanionImportData | undefined;
    private _supplementImportData?: SupplementImportData | undefined;

    supplement?: Id<GID.Supplement>;

    get purchaseGroup(): Id<GID.PurchaseGroup> | undefined {
        return this._purchaseGroup;
    }

    set purchaseGroup(id: Id<GID.PurchaseGroup> | undefined) {
        if (this._purchaseGroup == id) return;
        if (id !== undefined) {
            this.chain.purchaseGroups[this.characterId][id].components.push(this.id);
            this.chain.pushUpdate({
                dataField: ["purchaseGroups", this.characterId, id, "components"],
                action: Action.Update
            });
        }
        if (this._purchaseGroup !== undefined) {
            this.chain.purchaseGroups[this.characterId][this._purchaseGroup].components =
                this.chain.purchaseGroups[this.characterId][this._purchaseGroup].components.filter(
                    (i: Id<GID.Purchase>) => i != this.id
                );
            this.chain.pushUpdate({
                dataField: ["purchaseGroups", this.characterId, this._purchaseGroup, "components"],
                action: Action.Update
            });
        }
        this._purchaseGroup = id;
    }

    public get characterId(): Id<GID.Character> {
        return this._characterId;
    }

    set characterId(id: Id<GID.Character>) {
        if (this._characterId === undefined) this._characterId = id;
        else throw "Cannot reassign ID.";
    }

    get id(): Id<GID.Purchase> {
        return this._id;
    }

    public get importData(): CompanionImportData | undefined {
        return this._importData;
    }
    public set importData(value: CompanionImportData | undefined) {
        this._importData = value;
        for (let charId of this._importData!.characters)
            this.chain.requestJump(this.jumpId).registerCharacter(charId);
    }

    public get supplementImportData(): SupplementImportData | undefined {
        return this._supplementImportData;
    }
    public set supplementImportData(value: SupplementImportData | undefined) {
        this._supplementImportData = value;
    }

    public get type(): PurchaseType {
        return this._type;
    }
    public set type(value: PurchaseType) {
        if (value == this._type) return;

        if (this._type == PurchaseType.Item) {
            this.chain.characters[this.characterId].itemCount -= 1;
            this.chain.pushUpdate({
                dataField: ["characters", this.characterId, "itemCount"],
                action: Action.Update
            });
        }
        if (this._type == PurchaseType.Perk) {
            this.chain.characters[this.characterId].perkCount -= 1;
            this.chain.pushUpdate({
                dataField: ["characters", this.characterId, "perkCount"],
                action: Action.Update
            });
        }

        if (value == PurchaseType.Item) {
            this.chain.characters[this.characterId].itemCount += 1;
            this.chain.pushUpdate({
                dataField: ["characters", this.characterId, "itemCount"],
                action: Action.Update
            });
        }

        if (value == PurchaseType.Perk) {
            this.chain.characters[this.characterId].perkCount += 1;
            this.chain.pushUpdate({
                dataField: ["characters", this.characterId, "perkCount"],
                action: Action.Update
            });
        }

        this._type = value;
    }

    exportForDisplay(jumpId: number, jumperId: number): MarkupFragment {

        let jump = this.chain.requestJump(jumpId);
        let originalCostMod = this.costModifier;
        let originalPurchaseValue = this.purchaseValue;
        let originalValue = this.value;
        let override = jump?.drawbackOverrides?.[jumperId]?.[this.id]?.override;
        if (jump?.drawbackOverrides?.[jumperId]?.[this.id]) {
            this.costModifier = jump.drawbackOverrides[jumperId][this.id].modifier;
            this.purchaseValue = jump.drawbackOverrides[jumperId][this.id].purchaseValue;
        }

        if (this.type == PurchaseType.ChainDrawback && !this.chain.characters[jumperId].primary && !this.chain.chainSettings.chainDrawbacksForCompanions)
            this.value = this.companionStipend || 0;

        let costModifierString = "";
        switch (this.costModifier) {
            case CostModifier.Reduced:
                costModifierString = " [reduced]";
                break;
            case CostModifier.Free:
                costModifierString = " [free]";
                break;
            case CostModifier.Custom:
                costModifierString = (this.purchaseValue! > this.value) ? ` [increased from ${this.value}]` : ` [decreased from ${this.value}]`;
                break;
        }

        let costPrefix = "";
        switch (override) {
            case DrawbackOverride.Enabled:
                break;
            case DrawbackOverride.Excluded:
                break;
            case DrawbackOverride.BoughtOffTemp:
                costPrefix = "temporarily bought off for ";
                break;
            case DrawbackOverride.BoughtOffPermanent:
                costPrefix = "permanently bought off for ";
                break;
        }

        let firstLine: MarkupFragment = [
            E(T.Bold, {}, this.name),
            { space: 1 },
            E(T.Italic, {}, `(${costPrefix}${this.cost} ${this.jumpId !== undefined && this.jumpId >= 0 ?
                jump.currency(this.currency).abbrev
                : "CP"}${costModifierString})`),
            E([], { verbose: true }, ":", { space: 1 })
        ];

        let body: MarkupFragment[] = [E([], { verbose: true }, this.description)];

        if (this.importData) {

            body.push([LineBreak, E(T.Underlined, {}, "Characters Imported:"), { space: 1 }, Array.from(this.importData!.characters).map((charId, index) => {
                return ((index != 0) ? ", " : "") + this.chain.characters[charId].name
            }),]);

            let relevantCurrencies = Object.keys(this.importData.allowances).map(Number
            ).filter((currId) => this.importData!.allowances[currId] ||
                Object.keys(this.importData!.stipend[currId]).map(Number).some((id) => this.importData!.stipend[currId][id]));

            body.push([LineBreak, E(T.Underlined, {}, "Points:"), { space: 1 }, !relevantCurrencies.length ? "None"
                : relevantCurrencies.map((id, index) =>
                    [
                        E([], {}, (index > 0) ? [";", { space: 1 }] : [], `${this.importData!.allowances[id]} ${jump.currency(id).abbrev}`),
                        Object.keys(this.importData!.stipend[id]).map(Number).filter((stId) => (this.importData!.stipend[id][stId] != 0)).map((stId, index, a) =>
                            `${index == 0 ? " with" : ","}${index == a.length - 1 && index != 0 ? " and" : ""
                            } ${this.importData!.stipend[id][stId]} ${jump.currency(id).abbrev} ${jump.purchaseSubtype(stId).name} Stipend`
                        )
                    ]
                )]
            );

        }

        if (this.reward) {
            body.push([LineBreak, E(T.Underlined, {}, "Rewards:"), { space: 1 }, this.reward])
        }

        this.costModifier = originalCostMod;
        this.purchaseValue = originalPurchaseValue;
        this.value = originalValue;

        return [firstLine, body];
    }

    public get jumpId(): Id<GID.Jump> {
        return this._jumpId;
    }

    set jumpId(id: Id<GID.Jump>) {
        if (this._jumpId === undefined) this._jumpId = id;
        else throw "Cannot reassign ID.";
    }

    get cost(): number {
        switch (this.costModifier) {
            case CostModifier.Full: return this.value;
            case CostModifier.Reduced: return Math.floor(this.value * 0.5);
            case CostModifier.Free: return 0;
            case CostModifier.Custom: return this.purchaseValue!;
        }
    }

    constructor(chain: Chain | null, type: PurchaseType, jump: Jump | undefined, characterId: Id<GID.Character>, supplement?: Id<GID.Supplement>,
        subsystemData?: { subsystem: Id<LID.PurchaseSubtype>, parent: Id<GID.Purchase> }, id?: Id<GID.Purchase>) {

        if (chain == null)
            return;

        if (id !== undefined && chain.requestPurchase(id) !== undefined) {
            id = getFreeId<GID.Purchase>(chain.purchases);
        }

        this.chain = chain;
        if (type == PurchaseType.Item) {
            chain.characters[characterId].itemCount += 1;
            chain.pushUpdate({
                dataField: ["characters", characterId, "itemCount"],
                action: Action.Update
            });
        } else if (type == PurchaseType.Perk) {
            chain.characters[characterId].perkCount += 1;
            chain.pushUpdate({
                dataField: ["characters", characterId, "perkCount"],
                action: Action.Update
            });
        }

        this._id = (id !== undefined) ? id : getFreeId<GID.Purchase>(chain.purchases);
        chain.purchases[this._id] = this;

        chain.pushUpdate({
            dataField: ["purchases", this._id],
            action: Action.New
        });

        if (id == undefined)
            if ([PurchaseType.Scenario, PurchaseType.Drawback].includes(type)) {
                jump!.drawbacks[characterId].push(this.id);
                chain.pushUpdate({
                    dataField: ["jumps", jump!.id, "drawbacks", characterId],
                    action: Action.Update
                });
            }
            else if (type == PurchaseType.ChainDrawback) {
                chain.chainDrawbacks.push(this.id);
                chain.pushUpdate({
                    dataField: ["chainDrawbacks"],
                    action: Action.Update
                });
            }
            else if ([PurchaseType.Supplement, PurchaseType.SupplementImport].includes(type)) {
                jump!.supplementPurchases[characterId][supplement!].push(this.id);
                chain.pushUpdate({
                    dataField: ["jumps", jump!.id, "supplementPurchases", characterId],
                    action: Action.Update
                });
            }
            else {
                jump!.purchases[characterId].push(this.id);
                chain.pushUpdate({
                    dataField: ["jumps", jump!.id, "purchases", characterId],
                    action: Action.Update
                });
            }

        this.supplement = supplement;

        if (type == PurchaseType.Subsystem) {
            let sumId = jump!.subsystemSummaries[characterId][subsystemData!.subsystem].findIndex((sum) => sum.id == subsystemData!.parent);
            jump!.subsystemSummaries[characterId][subsystemData!.subsystem][sumId].subpurchases.push(this.id);
            chain.pushUpdate({
                dataField: ["jumps", jump!.id, "subsystemSummaries", characterId, subsystemData!.subsystem, sumId, "subpurchases"],
                action: Action.Update
            });
        }
        this._characterId = characterId;
        this._jumpId = jump ? jump.id : -1;

        this._type = type;
        this.subtype = DefaultSubtype[type];
        switch (type) {
            case PurchaseType.Subsystem:
                this.subtype = subsystemData!.subsystem;
                break;
            case PurchaseType.Drawback:
                this.duration = 1;
                break;
            case PurchaseType.Scenario:
                this.duration = 1;
                this.reward = "";
                break;
            case PurchaseType.Companion:
                this._importData = {
                    characters: new Set(),
                    allowances: Object.fromEntries(jump!.listCurrencies().map((cId) => [cId, 0])),
                    stipend: Object.fromEntries(jump!.listCurrencies().map(
                        (cId) =>
                            [cId, Object.fromEntries(jump!.listPurchaseSubtypes().map((stId) => [stId, 0]))]
                    ))
                };
                break;
            case PurchaseType.SupplementImport:
                this._supplementImportData = {
                    characters: new Set(),
                    allowance: 0,
                    percentage: 0
                };
                break;

        }
    }

    exportForClipboard() {
        let rawObject = JSON.parse(exportChainFragment(this));
        delete rawObject._jumpId;
        delete rawObject._characterId;
        return rawObject;
    }

    deserialize(rawObject: any, chain: Chain) {
        Object.assign(this, rawObject);

        if (this._importData) {
            this._importData.characters = new Set(this._importData.characters);
        }

        if (this._supplementImportData) {
            this._supplementImportData.characters = new Set(this._supplementImportData.characters);
        }

        this.chain = chain;
        return this;
    }



}