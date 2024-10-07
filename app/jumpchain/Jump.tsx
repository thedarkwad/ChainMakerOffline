// @ts-nocheck

import Chain from "./Chain";
import { CompanionAccess } from "./ChainSupplement";
import Character, { CharacterSummary } from "./Character";
import { Action } from "./DataManager";
import { E, exportPurchaseListForDisplay, LineBreak, MarkupFragment, T } from "./LayoutManager";
import Purchase, { CostModifier, DefaultSubtype, PurchaseType } from "./Purchase";
import { Duration, GID, Id, IdCorrespondence, LID, PersistentList, IdMap, IdMap2, getFreeId } from "./Types";

export interface JumpSummary {
    name: string;
    id: Id<GID.Jump>;
    characters: Set<Id<GID.Character>>;
    duration: Duration;
    bankDeposits: IdMap<GID.Character, number>;
    supplementPurchases: IdMap2<GID.Character, GID.Supplement, GID.Purchase[]>;
    supplementInvestments: IdMap2<GID.Character, GID.Supplement, number>;
    retainedDrawbacks: Record<Id<GID.Character>, Set<Id<GID.Purchase>>>;
    drawbackOverrides: IdMap2<GID.Character, GID.Purchase, { override: DrawbackOverride; modifier: CostModifier, purchaseValue?: number }>;
    parentJump?: number;
}

export interface JumpExportParams {
    listChainDrawbacks?: boolean;
    listSupplementPurchases?: boolean;
    listAltForms?: boolean;
    listNarrative?: boolean;
}

export enum DrawbackOverride {
    Enabled,
    Excluded,
    BoughtOffTemp,
    BoughtOffPermanent
}

export interface Currency {
    name: string;
    abbrev: string;
    budget: number;
    essential: boolean;
}

export interface OriginCategory {
    name: string;
    singleLine: boolean;
    default?: string;
}

export interface PurchaseSubtype {
    name: string;
    stipend: number;
    currency: Id<LID.Currency>;
    type: PurchaseType;
    essential?: boolean;
    subsystem?: boolean
}

export interface Origin {
    cost: number;
    summary: string;
    description?: string;
}

export interface NarrativeBlurb {
    goals: string,
    challenges: string,
    accomplishments: string
}

export interface SubsystemSummary {
    id: Id<GID.Purchase>,
    stipend: number,
    currency: Id<LID.Currency>,
    subpurchases: Id<GID.Purchase>[]
}

export default class Jump implements JumpSummary {
    name: string = "[untitled jump]";
    url?: string;
    characters: Set<Id<GID.Character>> = new Set();
    duration: Duration = { days: 0, months: 0, years: 10 };

    private _id!: Id<GID.Jump>;

    chain!: Chain;
    notes: IdMap<GID.Character, string> = {};

    bankDeposits: IdMap<GID.Character, number> = {};
    currencyExchanges: IdMap<GID.Character, { oCurrency: Id<LID.Currency>, tCurrency: Id<LID.Currency>, oAmmount: number, tAmmount: number }[]>
        = {};
    supplementPurchases: IdMap2<GID.Character, GID.Supplement, GID.Purchase[]> = {};
    supplementInvestments: IdMap2<GID.Character, GID.Supplement, number> = {};
    useSupplements: boolean = true;

    private originCategories: PersistentList<LID.OriginCategory, OriginCategory> = {
        0: { name: "Age", singleLine: true, default: "25" },
        1: { name: "Gender", singleLine: true, default: "Unknown" },
        2: { name: "Location", singleLine: false, default: "Unknown" },
        3: { name: "Origin", singleLine: false, default: "Drop-In" },

    };

    originCategoryList: Id<LID.OriginCategory>[] = [0, 1, 2, 3];

    private currencies: PersistentList<LID.Currency, Currency> = {
        0: { name: "Choice Points", abbrev: "CP", budget: 1000, essential: true }
    };

    private purchaseSubtypes: PersistentList<LID.PurchaseSubtype, PurchaseSubtype> = {
        [DefaultSubtype[PurchaseType.Perk]!]: { name: "Perk", stipend: 0, currency: 0, type: PurchaseType.Perk, essential: true },
        [DefaultSubtype[PurchaseType.Item]!]: { name: "Item", stipend: 0, currency: 0, type: PurchaseType.Item, essential: true },
        10: { name: "Power", stipend: 0, currency: 0, type: PurchaseType.Perk, essential: false },
        [DefaultSubtype[PurchaseType.Companion]!]: { name: "Companion Import", stipend: 0, currency: 0, type: PurchaseType.Companion, essential: true }
    };

    subsystemSummaries: IdMap2<GID.Character, LID.PurchaseSubtype, SubsystemSummary[]> = {};

    purchases: IdCorrespondence<GID.Character, GID.Purchase> = {};

    retainedDrawbacks: Record<Id<GID.Character>, Set<Id<GID.Purchase>>> = {};
    drawbacks: IdCorrespondence<GID.Character, GID.Purchase> = {};
    drawbackOverrides: IdMap2<GID.Character, GID.Purchase, { override: DrawbackOverride; modifier: CostModifier; purchaseValue?: number }> = {};

    origins: IdMap2<GID.Character, LID.OriginCategory, Origin> = {};
    altForms: IdCorrespondence<GID.Character, GID.AltForm> = {};
    useAltForms: boolean = true;

    narratives: IdMap<GID.Character, NarrativeBlurb> = {};
    useNarratives: boolean = true;

    budgets: IdMap2<GID.Character, LID.Currency, number> = {};
    stipends: IdMap2<GID.Character, LID.Currency, IdMap<LID.PurchaseSubtype, number>> = {};

    parentJump?: number;

    public get id() {
        return this._id;
    }

    listCurrencies(): Id<LID.Currency>[] {
        return Object.keys(this.currencies).map(Number);
    }

    currency(id: Id<LID.Currency>): Currency {
        return this.currencies[id];
    }

    newCurrency(c: Currency, id?: number): Id<LID.Currency> {
        let nId = (id !== undefined) ? id : getFreeId<LID.Currency>(this.currencies);
        this.currencies[nId] = c;
        this.chain.pushUpdate({
            dataField: ["jumps", this._id, "currencies", nId],
            action: Action.Delete
        });

        for (let cId in this.purchases) {
            for (let pId of this.purchases[cId]) {
                let p: Purchase = this.chain.purchases[pId];
                if (p.importData !== undefined) {
                    p.importData.allowances[nId] = 0;
                    p.importData.stipend[nId] = Object.fromEntries(
                        Object.keys(this.purchaseSubtypes).map((id) => [id, 0])
                    );
                    this.chain.pushUpdate({
                        dataField: ["purchases", pId, "_importData"],
                        action: Action.Update
                    });
                }
            }
        }

        return nId;
    }

    removeCurrency(cId: Id<LID.Currency>): void {
        let fieldPrefix = ["jumps", this.id];

        delete this.currencies[cId];
        this.chain.pushUpdate({
            dataField: fieldPrefix.concat(["currencies", cId]),
            action: Action.Delete
        });

        for (let charId in this.currencyExchanges) {
            if (!this.currencyExchanges[charId].length)
                continue;
            this.currencyExchanges[charId] = this.currencyExchanges[charId].filter((ex) => ![ex.oCurrency, ex.tCurrency].includes(cId));
            this.chain.pushUpdate({
                dataField: fieldPrefix.concat(["currencyExchanges", charId]),
                action: Action.Update
            });
        }

        for (let charId in this.purchases) {
            let allPurchases = this.purchases[charId].concat(this.drawbacks[charId]);
            for (let pId of allPurchases) {
                let p: Purchase = this.chain.requestPurchase(pId);
                if (p.currency == cId) {
                    p.currency = 0;
                    this.chain.pushUpdate({
                        dataField: ["purchases", pId, "currency"],
                        action: Action.Update
                    });
                }
                if (p.importData !== undefined) {
                    delete p.importData.allowances[cId];
                    delete p.importData.stipend[cId];
                    this.chain.pushUpdate({
                        dataField: ["purchases", pId, "_importData"],
                        action: Action.Update
                    });
                }
            }
        }

        for (let stId in this.purchaseSubtypes) {
            if (this.purchaseSubtypes[stId].currency == cId) {
                this.purchaseSubtypes[stId].currency = 0;
                this.chain.pushUpdate({
                    dataField: fieldPrefix.concat(["purchaseSubtypes", stId, "currency"]),
                    action: Action.Update
                });
            }
        }

    }

    recheckCharacterImports() {

        let characters = new Set<number>();
        for (let c of this.chain.characterList) {
            if (!this.chain.characters[c].primary)
                continue;
            characters.add(c)
            for (let pId of this.purchases[c]) {
                let purchase = this.chain.purchases[pId];
                if (purchase.importData)
                    purchase.importData.characters.forEach((newC) => characters.add(newC));
            }
        }

        for (let oldC of this.characters) {
            if (!characters.has(oldC))
                this.deregisterCharacter(oldC);
        }
        for (let newC of characters) {
            if (!this.characters.has(newC))
                this.registerCharacter(newC);
        }

        this.characters = characters;
    }

    getPreviouslyRetainedDrawbacks(charId: Id<GID.Character>, includeChainDrawbacks: boolean, excludeNonChain?: boolean): Id<GID.Purchase>[] {

        let jumpNum = this.chain.getJumpNumber(this.id);

        let retainedDrawbackIds: number[] = excludeNonChain ? [] : this.chain.getPreviousJumps(this.id).map(
            (id) => this.chain.jumps[id].retainedDrawbacks[charId] || new Set([])
        ).reduce(
            (u: number[], s: Set<number>) => u.concat(Array.from(s.values())), []
        );

        if (includeChainDrawbacks && (this.parentJump === undefined || this.parentJump < 0 || this.chain.chainSettings.chainDrawbacksSupplements))
            retainedDrawbackIds = retainedDrawbackIds.concat(this.chain.chainDrawbacks.filter((id) =>
                this.chain.chainSettings.chainDrawbacksForCompanions
                || this.chain.characters[charId].primary
                || this.chain.requestPurchase(id).companionStipend
            ));

        retainedDrawbackIds = retainedDrawbackIds.filter(
            (pId) => (this.chain.requestPurchase(pId).duration! < 0 ||
                (jumpNum - this.chain.getJumpNumber(this.chain.requestPurchase(pId).jumpId)
                    < this.chain.requestPurchase(pId).duration!)
            )
        );

        retainedDrawbackIds = retainedDrawbackIds.filter((id) =>
            !this.chain.requestPurchase(id).buyoff || (
                (this.chain.getJumpNumber(this.chain.requestPurchase(id).buyoff!.jumpId) > jumpNum) || (
                    this.chain.requestPurchase(id).buyoff!.jumpId == this._id && this.chain.requestPurchase(id).buyoff!.characterId == charId
                ))
        );


        return retainedDrawbackIds;

    }

    listPurchaseSubtypes(): Id<LID.PurchaseSubtype>[] {
        return Object.keys(this.purchaseSubtypes).map(Number);
    }

    purchaseSubtype(id: Id<LID.PurchaseSubtype>): PurchaseSubtype {
        return this.purchaseSubtypes[id];
    }

    updatePurchaseSubtype(id: number, st: PurchaseSubtype) {

        let fieldPrefix = ["jumps", this.id];
        this.chain.pushUpdate({
            dataField: fieldPrefix.concat(["purchaseSubtypes", id]),
            action: Action.Update
        });

        this.purchaseSubtypes[id].currency = st.currency;
        this.purchaseSubtypes[id].name = st.name;
        this.purchaseSubtypes[id].stipend = st.stipend;

        if (this.purchaseSubtypes[id].subsystem && !st.subsystem) {
            for (let charId of this.characters) {
                for (let summary of this.subsystemSummaries[charId][id]) {
                    summary.subpurchases.forEach((pId) => {
                        this.chain.requestPurchase(pId).type = st.type;
                        this.chain.pushUpdate({
                            dataField: ["purchases", pId, "_type"],
                            action: Action.Update
                        });
                    });
                    summary.subpurchases = [];
                    this.chain.deregisterPurchase(summary.id);
                }

                delete this.subsystemSummaries[charId][id];
                this.chain.pushUpdate({
                    dataField: fieldPrefix.concat(["subsystemSummaries", charId, id]),
                    action: Action.Delete
                });
            }
        }

        if (this.purchaseSubtypes[id].type != st.type || (st.subsystem && !this.purchaseSubtypes[id].subsystem)) {
            for (let charId of this.characters) {
                if (!st.subsystem || !this.purchaseSubtypes[id].subsystem) {
                    if (st.subsystem && !this.purchaseSubtypes[id].subsystem) {
                        this.subsystemSummaries[charId][id] = [];
                        this.chain.pushUpdate({
                            dataField: fieldPrefix.concat(["subsystemSummaries", charId, id]),
                            action: Action.New
                        });
                    }
                    for (let pId of this.purchases[charId]) {
                        let p = this.chain.requestPurchase(pId);
                        if (p.subtype != id) continue;
                        if (st.subsystem && !this.purchaseSubtypes[id].subsystem) {
                            if (!this.subsystemSummaries[charId][id].length) {
                                this.subsystemSummaries[charId][id] = [
                                    {
                                        id: (new Purchase(this.chain, st.type, this, charId)).id,
                                        stipend: 0,
                                        currency: 0,
                                        subpurchases: []
                                    }];
                                this.chain.pushUpdate({
                                    dataField: fieldPrefix.concat(["subsystemSummaries", charId, id]),
                                    action: Action.Update
                                });
                            }

                            this.subsystemSummaries[charId][id][0].subpurchases.push(pId);
                            p.type = PurchaseType.Subsystem;
                            p.category = [];

                            this.chain.pushUpdate({
                                dataField: ["purchases", p.id, "type"],
                                action: Action.Update
                            });
                            this.chain.pushUpdate({
                                dataField: ["purchases", p.id, "category"],
                                action: Action.Update
                            });

                        } else {
                            if (p.type != st.type) {
                                p.type = st.type;
                                p.category = [];
                                this.chain.pushUpdate({
                                    dataField: ["purchases", p.id, "type"],
                                    action: Action.Update
                                });
                                this.chain.pushUpdate({
                                    dataField: ["purchases", p.id, "category"],
                                    action: Action.Update
                                });
                            }

                        }

                    }
                } else {
                    for (let summ of this.subsystemSummaries[charId][id]) {
                        this.chain.requestPurchase(summ.id).type = st.type;
                        this.chain.requestPurchase(summ.id).subtype = DefaultSubtype[st.type]!;
                        this.chain.requestPurchase(summ.id).category = [];
                        this.chain.pushUpdate({
                            dataField: ["purchases", summ.id, "type"],
                            action: Action.Update
                        });
                        this.chain.pushUpdate({
                            dataField: ["purchases", summ.id, "category"],
                            action: Action.Update
                        });
                        this.chain.pushUpdate({
                            dataField: ["purchases", summ.id, "subtype"],
                            action: Action.Update
                        });

                    }
                }
            }
        }

        this.purchaseSubtypes[id].type = st.type;
        this.purchaseSubtypes[id].subsystem = st.subsystem;
    }

    newPurchaseSubtype(st: PurchaseSubtype, id?: number): Id<LID.PurchaseSubtype> {

        let fieldPrefix = ["jumps", this.id];

        let nId = (id !== undefined) ? id : getFreeId<LID.PurchaseSubtype>(this.purchaseSubtypes);

        this.purchaseSubtypes[nId] = st;
        this.chain.pushUpdate({
            dataField: fieldPrefix.concat(["purchaseSubtypes", nId]),
            action: Action.New
        });

        for (let charId of this.characters) {
            if (st.subsystem) {
                this.subsystemSummaries[charId][nId] = [];
                this.chain.pushUpdate({
                    dataField: fieldPrefix.concat(["subsystemSummaries", charId, nId]),
                    action: Action.New
                });

            }
            if (!(charId in this.purchases)) continue;
            for (let pId of this.purchases[charId]) {
                let p: Purchase = this.chain.requestPurchase(pId);
                if (p.importData !== undefined) {
                    for (let cId in this.currencies) {
                        p.importData.stipend[cId][nId] = 0;
                    }
                    this.chain.pushUpdate({
                        dataField: ["purchases", p.id, "_importData", "stipend"],
                        action: Action.Update
                    });
                }
            }
        }

        return nId;
    }

    removePurchaseSubtype(stId: Id<LID.PurchaseSubtype>): void {

        let fieldPrefix = ["jumps", this.id];

        for (let charId of this.characters) {
            if (stId in this.subsystemSummaries[charId]) {
                this.subsystemSummaries[charId][stId].forEach((summ) => { this.chain.deregisterPurchase(summ.id); });
                delete this.subsystemSummaries[charId][stId];
                this.chain.pushUpdate({
                    dataField: fieldPrefix.concat(["subsystemSummaries", charId, stId]),
                    action: Action.Delete
                });
            }
            for (let currId of this.listCurrencies())
                delete this.stipends[charId][currId][stId];
            if (!(charId in this.purchases)) continue;
            for (let pId of this.purchases[charId]) {
                let p: Purchase = this.chain.requestPurchase(pId);
                if (p.subtype == stId) {
                    p.subtype = DefaultSubtype[p.type];
                    this.chain.pushUpdate({
                        dataField: ["purchases", p.id, "subtype"],
                        action: Action.Update
                    });

                }
                if (p.importData !== undefined) {
                    this.chain.pushUpdate({
                        dataField: ["purchases", p.id, "_importData", "stipend"],
                        action: Action.Update
                    });
                    for (let cId in p.importData.stipend)
                        delete p.importData.stipend[cId][stId];
                }
            }
        }

        delete this.purchaseSubtypes[stId];
        this.chain.pushUpdate({
            dataField: fieldPrefix.concat(["purchaseSubtypes", stId]),
            action: Action.Delete
        });



    }

    addOriginCategory(oC: OriginCategory, id?: Id<LID.OriginCategory>): Id<LID.OriginCategory> {

        let fieldPrefix = ["jumps", this.id];

        let oCId = (id !== undefined) ? id : getFreeId<LID.OriginCategory>(this.originCategories);
        this.originCategories[oCId] = oC;

        this.chain.pushUpdate({
            dataField: fieldPrefix.concat(["originCategories", oCId]),
            action: Action.New
        });

        for (let charId in this.origins) {
            this.origins[charId][oCId] = { cost: 0, summary: oC.default || "" };
            if (!oC.singleLine) this.origins[charId][oCId].description = "";
            this.chain.pushUpdate({
                dataField: fieldPrefix.concat(["origins", charId, oCId]),
                action: Action.New
            });
        }
        this.originCategoryList.push(oCId);
        this.chain.pushUpdate({
            dataField: fieldPrefix.concat(["originCategoryList"]),
            action: Action.Update
        });
        return oCId;
    }

    removeOriginCategory(id: Id<LID.OriginCategory>): void {
        if (!(id in this.originCategories)) return;

        let fieldPrefix = ["jumps", this.id];

        delete this.originCategories[id];
        this.chain.pushUpdate({
            dataField: fieldPrefix.concat(["originCategories", id]),
            action: Action.Delete
        });

        for (let charId in this.origins) {
            delete this.origins[charId][id];
            this.chain.pushUpdate({
                dataField: fieldPrefix.concat(["origins", charId, id]),
                action: Action.Delete
            });
        }

        this.originCategoryList.splice(this.originCategoryList.indexOf(id), 1);
        this.chain.pushUpdate({
            dataField: fieldPrefix.concat(["originCategoryList"]),
            action: Action.Update
        });

    }

    originCategory(id: Id<LID.OriginCategory>): OriginCategory {
        return this.originCategories[id];
    }

    getStartingBudgets(charId: Id<GID.Character>): [IdMap<LID.Currency, number>, IdMap2<LID.Currency, LID.PurchaseSubtype, number>] {
        if (!this.characters.has(charId))
            return [{}, {}];
        let budgets = Object.fromEntries(this.listCurrencies().map((id) => [id, 0]));
        let stipends: IdMap2<LID.Currency, LID.PurchaseSubtype, number> = {};
        let char: CharacterSummary = this.chain.characters[charId];
        for (let currId in this.currencies) {
            stipends[currId] = {};
            budgets[currId] = (char.primary) ? this.currency(Number(currId)).budget : 0;
            for (let typeId in this.purchaseSubtypes) {
                let subtype = this.purchaseSubtypes[typeId];
                stipends[currId][typeId] = (Number(currId) == subtype.currency && char.primary) ? subtype.stipend : 0;
            }
        }

        if (char.primary) return [budgets, stipends];

        for (let charId2 of this.characters) {
            for (let pId of this.purchases[charId2]) {
                let p = this.chain.requestPurchase(pId);

                if (p.type != PurchaseType.Companion) continue;
                if (!p.importData!.characters.has(charId)) continue;

                for (let currId in p.importData!.allowances) {
                    budgets[currId] += p.importData!.allowances[currId];
                }
                for (let currId in p.importData!.stipend) {
                    for (let stId in p.importData!.stipend[currId]) {
                        stipends[currId][stId] += p.importData!.stipend[currId][stId];
                    }
                }

            }
        }

        return [budgets, stipends];
    }

    valuateRetainedDrawback(dId: Id<GID.Purchase>, charId: Id<GID.Purchase>): { value: number, itemStipend: number } {
        let p = this.chain.requestPurchase(dId);
        let originalCostMod = p.costModifier;
        let originalPurchaseValue = p.purchaseValue;
        p.costModifier = (this.drawbackOverrides[charId] && dId in this.drawbackOverrides[charId]) ? this.drawbackOverrides[charId][dId].modifier
            : p.costModifier;
        p.purchaseValue = (this.drawbackOverrides[charId] && dId in this.drawbackOverrides[charId]) ? this.drawbackOverrides[charId][dId].purchaseValue
            : p.purchaseValue;
        let ret: { value: number, itemStipend: number };
        switch (this.drawbackOverrides?.[charId]?.[dId]?.override) {
            case DrawbackOverride.BoughtOffPermanent:
            case DrawbackOverride.BoughtOffTemp:
                ret = { value: -p.cost, itemStipend: 0 };
                break;
            case DrawbackOverride.Excluded:
                ret = { value: 0, itemStipend: 0 };
                break;
            case DrawbackOverride.Enabled:
            default:
                ret = { value: p.cost, itemStipend: p.itemStipend || 0 };
        }
        p.costModifier = originalCostMod;
        p.purchaseValue = originalPurchaseValue;
        return ret;
    }

    recalculateBudgets() {

        // initialization
        for (let charId of this.characters) {
            [this.budgets[charId], this.stipends[charId]] = this.getStartingBudgets(charId);
        }

        // drawbacks & imports
        for (let charId of this.characters) {

            for (let pId of this.drawbacks[charId]) {
                let p = this.chain.requestPurchase(pId);
                this.budgets[charId][p.currency] += p.cost;
                this.stipends[charId][p.currency][DefaultSubtype[PurchaseType.Item]!] += p.itemStipend || 0;
            }

            for (let exchange of this.currencyExchanges[charId]) {
                this.budgets[charId][exchange.oCurrency] -= exchange.oAmmount;
                this.budgets[charId][exchange.tCurrency] += exchange.tAmmount;
            }

            // retained drawbacks
            for (let dId of this.getPreviouslyRetainedDrawbacks(charId, true)) {
                let drawback = this.chain.requestPurchase(dId);
                if (drawback.type != PurchaseType.ChainDrawback || this.chain.characters[charId].primary
                    || this.chain.chainSettings.chainDrawbacksForCompanions) {
                    let { value, itemStipend } = this.valuateRetainedDrawback(dId, charId);
                    this.budgets[charId][0] += value;
                    this.stipends[charId][0][DefaultSubtype[PurchaseType.Item]!] += itemStipend;
                } else {
                    this.budgets[charId][0] += this.chain.requestPurchase(dId).companionStipend || 0;
                }
            }


            //bank deposits
            this.budgets[charId][0] -= this.bankDeposits[charId];

            //supplement investments
            this.budgets[charId][0] -= Object.values(this.supplementInvestments[charId]).reduce((x: number, y: number) => x + y, 0);

            //stipends from subsystems
            for (let stId in this.subsystemSummaries[charId]) {
                this.subsystemSummaries[charId][stId].forEach((summ) => {
                    this.stipends[charId][summ.currency][stId] += summ.stipend;
                });
            }
        }

        // purchases & background/origins
        for (let charId of this.characters) {
            for (let ocId in this.originCategories) {
                this.budgets[charId][0] -= this.origins[charId][ocId].cost;
            }
            for (let pId of this.purchases[charId]) {
                let p = this.chain.requestPurchase(pId);
                if (p.type == PurchaseType.Supplement)
                    continue;
                let stipendCost = Math.max(Math.min(this.stipends[charId][p.currency][p.subtype!], p.cost), 0);
                this.stipends[charId][p.currency][p.subtype!] -= stipendCost;
                this.budgets[charId][p.currency] -= p.cost - stipendCost;
            }
        }
    }

    registerCharacter(cId: Id<GID.Character>): void {

        if (this.characters.has(cId)) return;

        let fieldPrefix = ["jumps", this.id];

        this.characters.add(cId);
        this.chain.pushUpdate({
            dataField: fieldPrefix.concat(["characters"]),
            action: Action.Update
        });

        this.bankDeposits[cId] = 0;
        this.chain.pushUpdate({
            dataField: fieldPrefix.concat(["bankDeposits", cId]),
            action: Action.New
        });

        this.supplementPurchases[cId] = {};
        this.supplementInvestments[cId] = {};
        this.subsystemSummaries[cId] = Object.fromEntries(Object.entries(this.purchaseSubtypes
        ).filter(([, st]) => st.subsystem
        ).map(([id, st]) => [id, []])
        );
        this.chain.pushUpdate({
            dataField: fieldPrefix.concat(["supplementPurchases", cId]),
            action: Action.New
        });
        this.chain.pushUpdate({
            dataField: fieldPrefix.concat(["supplementInvestments", cId]),
            action: Action.New
        });
        this.chain.pushUpdate({
            dataField: fieldPrefix.concat(["subsystemSummaries", cId]),
            action: Action.New
        });

        this.currencyExchanges[cId] = [];
        this.chain.pushUpdate({
            dataField: fieldPrefix.concat(["currencyExchanges", cId]),
            action: Action.New
        });

        this.notes[cId] = "";
        this.chain.pushUpdate({
            dataField: fieldPrefix.concat(["notes", cId]),
            action: Action.New
        });

        for (let suppId in this.chain.supplements) {
            this.supplementPurchases[cId][suppId] = [];
            this.supplementInvestments[cId][suppId] = 0;
        }
        this.chain.pushUpdate({
            dataField: fieldPrefix.concat(["supplementInvestments", cId]),
            action: Action.New
        });


        this.purchases[cId] = [];
        this.drawbacks[cId] = [];
        this.retainedDrawbacks[cId] = new Set();
        this.drawbackOverrides[cId] = {};
        this.altForms[cId] = [];
        this.narratives[cId] = { accomplishments: "", challenges: "", goals: "" };
        this.chain.pushUpdate({
            dataField: fieldPrefix.concat(["purchases", cId]),
            action: Action.New
        });
        this.chain.pushUpdate({
            dataField: fieldPrefix.concat(["drawbacks", cId]),
            action: Action.New
        });
        this.chain.pushUpdate({
            dataField: fieldPrefix.concat(["retainedDrawbacks", cId]),
            action: Action.New
        });
        this.chain.pushUpdate({
            dataField: fieldPrefix.concat(["drawbackOverrides", cId]),
            action: Action.New
        });
        this.chain.pushUpdate({
            dataField: fieldPrefix.concat(["altForms", cId]),
            action: Action.New
        });
        this.chain.pushUpdate({
            dataField: fieldPrefix.concat(["narratives", cId]),
            action: Action.New
        });


        this.origins[cId] = {};
        for (let id in this.originCategories) {
            this.origins[cId][id] = { cost: 0, summary: this.originCategories[id].default || "", description: "" };
        }
        this.chain.pushUpdate({
            dataField: fieldPrefix.concat(["origins", cId]),
            action: Action.New
        });



    }

    deregisterCharacter(cId: Id<GID.Character>): void {

        let fieldPrefix = ["jumps", this.id];

        for (let pId of this.purchases[cId]) {
            if (this.chain.purchases[pId] !== undefined)
                this.chain.deregisterPurchase(Number(pId));
        }

        for (let pId of this.drawbacks[cId]) {
            this.chain.deregisterPurchase(Number(pId));
        }


        this.characters.delete(cId);
        this.chain.pushUpdate({
            dataField: fieldPrefix.concat(["characters"]),
            action: Action.Update
        });

        delete this.bankDeposits[cId];
        this.chain.pushUpdate({
            dataField: fieldPrefix.concat(["bankDeposits", cId]),
            action: Action.Delete
        });


        delete this.supplementPurchases[cId];
        delete this.supplementInvestments[cId];
        delete this.subsystemSummaries[cId];
        this.chain.pushUpdate({
            dataField: fieldPrefix.concat(["supplementPurchases", cId]),
            action: Action.Delete
        });
        this.chain.pushUpdate({
            dataField: fieldPrefix.concat(["supplementInvestments", cId]),
            action: Action.Delete
        });
        this.chain.pushUpdate({
            dataField: fieldPrefix.concat(["subsystemSummaries", cId]),
            action: Action.Delete
        });

        delete this.currencyExchanges[cId];
        this.chain.pushUpdate({
            dataField: fieldPrefix.concat(["currencyExchanges", cId]),
            action: Action.Delete
        });

        delete this.notes[cId];
        this.chain.pushUpdate({
            dataField: fieldPrefix.concat(["notes", cId]),
            action: Action.Delete
        });

        delete this.purchases[cId];
        delete this.drawbacks[cId];
        delete this.drawbackOverrides[cId];
        delete this.retainedDrawbacks[cId];
        delete this.altForms[cId];
        delete this.narratives[cId];
        this.chain.pushUpdate({
            dataField: fieldPrefix.concat(["purchases", cId]),
            action: Action.Delete
        });
        this.chain.pushUpdate({
            dataField: fieldPrefix.concat(["drawbacks", cId]),
            action: Action.Delete
        });
        this.chain.pushUpdate({
            dataField: fieldPrefix.concat(["drawbackOverrides", cId]),
            action: Action.Delete
        });
        this.chain.pushUpdate({
            dataField: fieldPrefix.concat(["retainedDrawbacks", cId]),
            action: Action.Delete
        });
        this.chain.pushUpdate({
            dataField: fieldPrefix.concat(["altForms", cId]),
            action: Action.Delete
        });
        this.chain.pushUpdate({
            dataField: fieldPrefix.concat(["narratives", cId]),
            action: Action.Delete
        });

        delete this.origins[cId];
        this.chain.pushUpdate({
            dataField: fieldPrefix.concat(["origins", cId]),
            action: Action.Delete
        });

        delete this.budgets[cId];
        delete this.stipends[cId];

    }

    exportForDisplay(characterId: Id<GID.Character>, exportParams: JumpExportParams, imperial: boolean): MarkupFragment {
        let [budgets, stipends] = this.getStartingBudgets(characterId);
        if (!this.characters.has(characterId))
            return [];
        let firstLine =
            this.url ? E([T.H3, T.Link], { url: this.url }, this.name, ":") : E([T.H3], {}, this.name, ":");
        let startingBudgetsDisplay: MarkupFragment = [E(T.Italic, {}, "Starting Budget:"), { space: 1 },
        this.listCurrencies().map((id, index) =>
            [
                E([], {}, (index > 0) ? [";", { space: 1 }] : [], `${budgets[id]} ${this.currencies[id].abbrev}`),
                this.listPurchaseSubtypes().filter((stId) => (stipends?.[id]?.[stId])).map((stId, index, a) =>
                    `${index == 0 ? " with" : ","}${index == a.length - 1 && index != 0 ? " and" : ""} ${stipends[id][stId]} ${this.currencies[id].abbrev} ${this.purchaseSubtypes[stId].name} Stipend`
                )
            ]
        )];
        startingBudgetsDisplay.push(LineBreak);

        let chainDrawbacks = this.getPreviouslyRetainedDrawbacks(characterId, true, true);
        chainDrawbacks.filter((id) => !this.drawbackOverrides?.[characterId]?.[id] || this.drawbackOverrides[characterId][id].override != DrawbackOverride.Excluded);
        let chainDrawbackTotal = chainDrawbacks.map((id) => this.valuateRetainedDrawback(id, characterId)
        ).reduce((a, b) => { return { value: a.value + b.value, itemStipend: a.itemStipend + b.itemStipend }; }, { value: 0, itemStipend: 0 });
        let chainDrawbackDisplay: MarkupFragment = [E(T.Bold, {}, "Chain Drawbacks"), { space: 1 }, `[${chainDrawbackTotal.value} ${this.currencies[0].abbrev}`];
        if (chainDrawbackTotal.itemStipend != 0)
            chainDrawbackDisplay.push(` with ${chainDrawbackTotal.itemStipend} ${this.currencies[0].abbrev} Item Stipend`);
        chainDrawbackDisplay.push("]");
        if (exportParams.listChainDrawbacks)
            chainDrawbackDisplay.push([":", E(T.List, {}, ...chainDrawbacks.map((id) =>
                E(T.ListItem, {}, this.chain.requestPurchase(id).exportForDisplay(this.id, characterId))
            ))]);
        else
            chainDrawbackDisplay.push(LineBreak);

        let retainedDrawbacks = this.getPreviouslyRetainedDrawbacks(characterId, false, false);
        retainedDrawbacks.filter((id) => !this.drawbackOverrides[characterId][id] || this.drawbackOverrides[characterId][id].override != DrawbackOverride.Excluded);
        let retainedDrawbacksTotal = retainedDrawbacks.map((id) => this.valuateRetainedDrawback(id, characterId)
        ).reduce((a, b) => { return { value: a.value + b.value, itemStipend: a.itemStipend + b.itemStipend }; }, { value: 0, itemStipend: 0 });
        let retainedDrawbackDisplay: MarkupFragment[] = [E(T.Bold, {}, "Retained Drawbacks"), { space: 1 }, `[${retainedDrawbacksTotal.value} ${this.currencies[0].abbrev}`];
        if (retainedDrawbacksTotal.itemStipend != 0)
            retainedDrawbackDisplay.push(` with ${retainedDrawbacksTotal.itemStipend} ${this.currencies[0].abbrev} Item Stipend`);
        retainedDrawbackDisplay.push("]:");
        retainedDrawbackDisplay.push(E(T.List, {}, ...retainedDrawbacks.map((id) =>
            E(T.ListItem, {}, this.chain.requestPurchase(id).exportForDisplay(this.id, characterId))
        )));

        let bankDepositDisplay: MarkupFragment = [];
        if (this.bankDeposits[characterId] != 0) {
            if (this.bankDeposits[characterId] > 0) {
                bankDepositDisplay = [E([T.Italic], {}, "Bank Deposit:"), { space: 1 }, `${this.bankDeposits[characterId]} ${this.currencies[0].abbrev}`, LineBreak];
            } else {
                bankDepositDisplay = [E([T.Italic], {}, "Bank Withdrawal:"), { space: 1 }, `${-this.bankDeposits[characterId]} ${this.currencies[0].abbrev}`, LineBreak];
            }
        }
        for (let suppId of Object.keys(this.chain.supplements).map(Number)) {
            if (!this.supplementInvestments[characterId][suppId] ||
                (!this.chain.characters[characterId].primary && this.chain.supplements[suppId].companionAccess !== CompanionAccess.Available))
                continue;
            bankDepositDisplay.push([E([T.Italic], {}, `${this.chain.supplements[suppId].name} Investment:`),
            { space: 1 },
            `${this.supplementInvestments[characterId][suppId]} ${this.currencies[0].abbrev}`, LineBreak]);
        }
        bankDepositDisplay.push(LineBreak);


        let currencyExchanges: MarkupFragment[] = [];
        if (this.currencyExchanges[characterId].length) {
            currencyExchanges.push([E(T.Bold, {}, `Currency Exchanges:`)]);
            currencyExchanges.push(
                E(T.List, {}, this.currencyExchanges[characterId].map((ex) =>
                    E(T.ListItem, {}, `${ex.oAmmount} ${this.currencies[ex.oCurrency].abbrev} exchanged for ${ex.tAmmount} ${this.currencies[ex.tCurrency].abbrev}`)
                ))
            );
        }

        let drawbacks = this.drawbacks[characterId].map((id) => this.chain.requestPurchase(id)).filter((d) => d.type == PurchaseType.Drawback);
        let [drawbackDisplay, drawbackTotal] = exportPurchaseListForDisplay(drawbacks, this, "Drawbacks");

        let scenarios = this.drawbacks[characterId].map((id) => this.chain.requestPurchase(id)).filter((d) => d.type == PurchaseType.Scenario);
        let [scenarioDisplay, scenarioTotal] = exportPurchaseListForDisplay(scenarios, this, "Scenarios");

        let [finalBudgets, finalStipends] = [{ ...budgets }, { ...stipends }];
        finalBudgets[0] += chainDrawbackTotal.value + retainedDrawbacksTotal.value - this.bankDeposits[characterId];
        Object.keys(this.chain.supplements).map(Number).forEach((suppId) => { finalBudgets[0] -= this.supplementInvestments[characterId][suppId] })
        finalStipends[0][DefaultSubtype[PurchaseType.Item]!] += chainDrawbackTotal.itemStipend + retainedDrawbacksTotal.itemStipend;
        this.listCurrencies().forEach(
            (cId) => {

                if (cId in drawbackTotal) {
                    finalBudgets[cId] += drawbackTotal[cId].value;
                    finalStipends[cId][DefaultSubtype[PurchaseType.Item]!] += drawbackTotal[cId].itemStipend
                }

                if (cId in scenarioTotal) {
                    finalBudgets[cId] += scenarioTotal[cId].value;
                    finalStipends[cId][DefaultSubtype[PurchaseType.Item]!] += scenarioTotal[cId].itemStipend
                }
            }
        );

        this.currencyExchanges[characterId].forEach((ex) => {
            finalBudgets[ex.oCurrency] -= ex.oAmmount; finalBudgets[ex.tCurrency] += ex.tAmmount;
        });

        let finalBudgetsDisplay: MarkupFragment = [E(T.Underlined, {}, "Final Budget:"), { space: 1 },
        this.listCurrencies().map((id, index) =>
            [
                E([], {}, (index > 0) ? [";", { space: 1 }] : [], `${finalBudgets[id]} ${this.currencies[id].abbrev}`),
                this.listPurchaseSubtypes().filter((stId) => (finalStipends?.[id]?.[stId])).map((stId, index, a) =>
                    `${index == 0 ? " with" : ","}${index == a.length - 1 && index != 0 ? " and" : ""} ${finalStipends[id][stId]} ${this.currencies[id].abbrev} ${this.purchaseSubtypes[stId].name} Stipend`
                )
            ]
        )];

        let finalBudgetAltered = this.listCurrencies().some((id) => {
            if (budgets[id] != finalBudgets[id]) return true;
            return this.listPurchaseSubtypes().some((stId) => stipends[id][stId] != finalStipends[id][stId]);
        });

        let budgetDisplay =
            [
                E(T.H3, {}, "Budgets:"),
                startingBudgetsDisplay,
                bankDepositDisplay,
                currencyExchanges,
                chainDrawbackTotal.value || chainDrawbackTotal.itemStipend ? chainDrawbackDisplay : [],
                retainedDrawbacksTotal.value || retainedDrawbacksTotal.itemStipend ? retainedDrawbackDisplay : [],
                drawbacks.length ? drawbackDisplay : [],
                scenarios.length ? scenarioDisplay : [],
                finalBudgetAltered ? finalBudgetsDisplay : []
            ];

        let originDisplay: MarkupFragment = [
            E(T.H3NoBreak, {}, "Origin & Background:"),
            E(T.List, {},
                this.originCategoryList.map((oId) =>
                    E(T.ListItem, {},
                        E(T.Bold, {}, this.originCategories[oId].name, ":"), { space: 1 },
                        this.origins[characterId][oId].summary || "",
                        !this.origins[characterId][oId].cost ? [] :
                            E(T.Italic, {}, { space: 1 }, `[${this.origins[characterId][oId].cost} ${this.currencies[0].abbrev}]`),
                        E([], { verbose: true }, this.origins[characterId][oId].description && !this.originCategories[oId].singleLine ?
                            [LineBreak, this.origins[characterId][oId].description || ""]
                            : []
                        )
                    )
                )
            ),
            [
                E(T.Underlined, {}, "Total Cost:"),
                { space: 1 },
                `${this.originCategoryList.reduce(
                    (sum, id) => this.origins[characterId][id].cost + sum, 0)} ${this.currencies[0].abbrev}`,
                LineBreak
            ],
            (!this.narratives[characterId].goals && !this.narratives[characterId].accomplishments && !this.narratives[characterId].challenges)
                || !exportParams.listNarrative ||
                (this.chain.chainSettings.narratives == "disabled") || (!this.chain.characters[characterId].primary && this.chain.chainSettings.narratives == "restricted")
                ? [] : [
                    E(T.H3NoBreak, {}, "Narrative Summary:"),
                    E(T.List, {},
                        !this.narratives[characterId].goals ? [] : E(T.ListItem, {},
                            E(T.Bold, {}, "Goals:"), { space: 1 }, this.narratives[characterId].goals, LineBreak
                        ),
                        !this.narratives[characterId].challenges ? [] : E(T.ListItem, {},
                            E(T.Bold, {}, "Challenges:"), { space: 1 }, this.narratives[characterId].challenges, LineBreak
                        ),
                        !this.narratives[characterId].accomplishments ? [] : E(T.ListItem, {},
                            E(T.Bold, {}, "Accomplishments:"), { space: 1 }, this.narratives[characterId].accomplishments
                        )
                    )]
        ];

        if (exportParams.listAltForms && this.altForms[characterId].length) {
            originDisplay.push(
                E(T.H3NoBreak, {}, "Alt-Forms:"),
                E(T.List, {},
                    this.altForms[characterId].map((altFormId) =>
                        E(T.ListItem, {}, this.chain.altforms[altFormId].exportForDisplay(imperial)))
                )
            );

        }
        let subtypeDisplay: IdMap<LID.PurchaseSubtype, MarkupFragment> = {};
        let subtypeTotal: IdMap2<LID.PurchaseSubtype, LID.Currency, { value: number, itemStipend: number }> = {};
        let subtypePurchases: IdMap<LID.PurchaseSubtype, Purchase[]> = {};

        this.listPurchaseSubtypes().forEach((stId) => {
            subtypePurchases[stId] = this.purchases[characterId].map((id) => this.chain.requestPurchase(id)).filter((p) => p.subtype == stId);
            [subtypeDisplay[stId], subtypeTotal[stId]] = exportPurchaseListForDisplay(
                subtypePurchases[stId], this,
                this.purchaseSubtype(stId).type != PurchaseType.Companion ? this.purchaseSubtypes[stId].name : "Companion Imports"
            )
        }
        );

        this.listPurchaseSubtypes().forEach((stId) => {
            let summaries = this.subsystemSummaries[characterId]?.[stId];
            if (!summaries) return;
            let stipends: IdMap<LID.Currency, number> = {};
            subtypePurchases[stId] = summaries.map((summ) => this.chain.requestPurchase(summ.id));
            subtypeTotal[stId] = {};
            summaries.forEach((summ) => {
                let purchase = this.chain.requestPurchase(summ.id);
                if (!subtypeTotal[stId][purchase.currency])
                    subtypeTotal[stId][purchase.currency] = { value: 0, itemStipend: 0 };
                subtypeTotal[stId][purchase.currency].value += purchase.cost;
                summ.subpurchases.map(this.chain.requestPurchase).forEach((subP) => {
                    if (!subtypeTotal[stId][subP.currency])
                        subtypeTotal[stId][subP.currency] = { value: 0, itemStipend: 0 };
                    subtypeTotal[stId][subP.currency].value += subP.cost;
                });
                stipends[summ.currency] += summ.stipend;
            });

            subtypeDisplay[stId] = [E(T.Bold, {}, `${this.purchaseSubtypes[stId].name}`), { space: 1 }];
            subtypeDisplay[stId].push("[");

            subtypeDisplay[stId].push(
                this.listCurrencies().filter(cId => Object.keys(subtypeTotal[stId]).includes(String(cId))).map((cId, index) =>
                    [
                        E([], {}, (index > 0) ? [";", { space: 1 }] : [], `${subtypeTotal[stId][cId].value} ${this.currency(cId).abbrev}`),
                    ]
                )
            );

            if (Object.values(stipends).some(n => n)) {
                subtypeDisplay[stId].push("; with additional ",
                    this.listCurrencies().filter(cId => Object.keys(stipends).includes(String(cId))).map((cId, index) =>
                        [
                            E([], {}, (index > 0) ? [",", { space: 1 }] : [], `${stipends[cId]} ${this.currency(cId).abbrev} Stipend`),
                        ]
                    )
                )
            }

            subtypeDisplay[stId].push("]:");

            subtypeDisplay[stId].push(E(
                T.List, {}, summaries.map((summ) => {

                    let [subPurchasesDisplay, subPurchasesTotal] = exportPurchaseListForDisplay(summ.subpurchases.map(this.chain.requestPurchase), this, "", true)
                    let p = this.chain.requestPurchase(summ.id);

                    let relevantCurrencies = this.listCurrencies().filter(cId => Object.keys(subPurchasesTotal).includes(String(cId)));

                    return E(T.ListItem, {}, p.exportForDisplay(this.id, characterId), LineBreak,
                        summ.stipend ?
                            [E(T.Italic, {}, "Stipend:"), { space: 1 }, `${summ.stipend} ${this.currencies[summ.currency].abbrev}`, LineBreak]
                            : [],
                        E(T.Italic, {}, "Subpurchase Costs:"), { space: 1 },
                        relevantCurrencies.length ? relevantCurrencies.map((cId, index) =>
                            [
                                E([], {}, (index > 0) ? [";", { space: 1 }] : [], `${subPurchasesTotal[cId].value} ${this.currency(cId).abbrev}`),
                            ]
                        ) : "None",
                        subPurchasesDisplay
                    );
                }
                )));
        });

        let supplementDisplay: IdMap<GID.Supplement, MarkupFragment> = {};
        let supplementTotal: IdMap<GID.Supplement, number> = {};

        Object.keys(this.chain.supplements).map(Number).forEach((suppId) => {
            [supplementDisplay[suppId], supplementTotal[suppId]] = (([x, y]) => [x, y[0]?.value || 0])(exportPurchaseListForDisplay(
                this.supplementPurchases[characterId][suppId].map(id => this.chain.requestPurchase(id)), this,
                this.chain.supplements[suppId].name, false, this.chain.supplements[suppId].currency,
                this.chain.calulateSupplementBudget(characterId, this.id, suppId)
            ));
        }
        );

        let totalSpending = Object.fromEntries(this.listCurrencies().map((cId) =>
            [cId, this.listPurchaseSubtypes().reduce((acc, stId) => acc + (subtypeTotal[stId]?.[cId]?.value || 0), 0)]
        ));
        totalSpending[0] += this.originCategoryList.reduce(
            (sum, id) => this.origins[characterId][id].cost + sum, 0);

        let totalSpendingDisplay: MarkupFragment = E([], { verbose: true }, E(T.Underlined, {}, "Total Points Spent:"), { space: 1 }, this.listCurrencies().filter(id => totalSpending[id]).map((id, index) =>
            [
                E([], {}, (index > 0) ? [";", { space: 1 }] : [], `${totalSpending[id]} ${this.currencies[id].abbrev}`),
            ]
        ));

        if (!this.listCurrencies().filter(id => totalSpending[id]).length) {
            totalSpendingDisplay = [totalSpendingDisplay, "None"]
        }

        let purchasesDisplay =
            [
                E(T.H3, {}, "Purchases:"),
                this.listPurchaseSubtypes().filter((stId) => this.purchaseSubtype(stId).type == PurchaseType.Perk).map(
                    (id) => subtypePurchases[id].length ? subtypeDisplay[id] : []
                ),
                this.listPurchaseSubtypes().filter((stId) => this.purchaseSubtype(stId).type == PurchaseType.Item).map(
                    (id) => subtypePurchases[id].length ? subtypeDisplay[id] : []
                ),
                this.listPurchaseSubtypes().filter((stId) => this.purchaseSubtype(stId).type == PurchaseType.Companion).map(
                    (id) => subtypePurchases[id].length ? subtypeDisplay[id] : []
                ),
                !exportParams.listSupplementPurchases ? []
                    : Object.keys(this.chain.supplements).map(Number).filter((suppId) => this.supplementPurchases[characterId][suppId].length
                    ).map((suppId) => supplementDisplay[suppId]),
                totalSpendingDisplay
            ];

        this.recalculateBudgets();

        let remainingPointsDisplay: MarkupFragment = [E(T.Underlined, {}, "Remaining Points:"), { space: 1 },
        this.listCurrencies().map((id, index) =>
            [
                E([], {}, (index > 0) ? [";", { space: 1 }] : [], `${this.budgets[characterId][id]} ${this.currencies[id].abbrev}`),
                this.listPurchaseSubtypes().filter((stId) => (this.stipends[characterId][id][stId] != 0)).map((stId, index, a) =>
                    `${index == 0 ? " with" : ","}${index == a.length - 1 && index != 0 ? " and" : ""} ${this.stipends[characterId][id][stId]} ${this.currencies[id].abbrev} ${this.purchaseSubtypes[stId].name} Stipend`
                )
            ]
        )];

        return [
            firstLine,
            { hrule: true },
            budgetDisplay,
            { hrule: true },
            originDisplay,
            { hrule: true },
            purchasesDisplay,
            { hrule: true },
            remainingPointsDisplay
        ];
    }

    clear() {
        this.originCategories = {};
        this.originCategoryList = [];

        this.currencies = {};

        this.purchaseSubtypes = {};
    }

    constructor(chain: Chain | null, id?: number) {

        if (chain === null)
            return;

        this.chain = chain;

        if (id !== undefined && chain.requestJump(id) !== undefined) {
            id = getFreeId<GID.Jump>(chain.jumps);
        }

        this._id = (id !== undefined) ? id : getFreeId<GID.Jump>(chain.jumps);

        chain.jumps[this._id] = this;
        chain.jumpList.push(this._id);

        this.chain.pushUpdate({
            dataField: ["jumps", this._id],
            action: Action.New
        });
        this.chain.pushUpdate({
            dataField: ["jumpList"],
            action: Action.Update
        });


        for (let charId of chain.characterList) {
            if (chain.requestCharacter(charId).primary) {
                this.registerCharacter(charId);
            }
        }

    }

    deserialize(rawObject: any, chain: Chain) {
        Object.assign(this, rawObject);
        this.characters = new Set(this.characters);
        this.chain = chain;
        Object.keys(this.retainedDrawbacks).map(Number).forEach((charId) => this.retainedDrawbacks[charId] = new Set(this.retainedDrawbacks[charId]))
        return this;
    }


}