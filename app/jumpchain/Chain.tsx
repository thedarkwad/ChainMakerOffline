import AltForm from "./AltForm";
import ChainSupplement, { CompanionAccess } from "./ChainSupplement";
import Character, { CharacterSummary } from "./Character";
import DataManager, { Action, Update } from "./DataManager";
import Jump, { JumpSummary } from "./Jump";
import Purchase, { PurchaseGroup, PurchaseType } from "./Purchase";
import { GID, Id, IdMap, PersistentList } from "./Types";


export interface BankSettings {
    enabled: boolean;
    maxDeposit: number;
    depositRatio: number;
    interestRate: number;
}

export default class Chain {
    purchases: PersistentList<GID.Purchase, Purchase> = {};
    characters: PersistentList<GID.Character, Character | CharacterSummary> = {};
    jumps: PersistentList<GID.Jump, Jump | JumpSummary> = {};
    altforms: PersistentList<GID.AltForm, AltForm> = {};
    chainDrawbacks: Id<GID.Purchase>[] = [];
    purchaseGroups: PersistentList<GID.Character, PersistentList<GID.PurchaseGroup, PurchaseGroup>> = {};
    supplements: PersistentList<GID.Supplement, ChainSupplement> = {};

    notesList: number[] = [];
    notes: Record<number, { title: string, body: string, id: number }> = {};

    manager: DataManager;
    current: boolean = false;

    purchaseCategories: Record<PurchaseType, PersistentList<GID.PurchaseCategory, string>> = {
        [PurchaseType.Perk]: {},
        [PurchaseType.Item]: {},
        [PurchaseType.Companion]: {},
        [PurchaseType.Drawback]: {},
        [PurchaseType.Scenario]: {},
        [PurchaseType.Supplement]: {},
        [PurchaseType.SupplementImport]: {},
        [PurchaseType.Subsystem]: {},
        [PurchaseType.ChainDrawback]: {}
    };

    jumpList: Id<GID.Jump>[] = [];
    characterList: Id<GID.Character>[] = [];

    name: string = "";
    versionNumber: string = "2.0";

    requestJump: (id: Id<GID.Jump>) => Jump;
    requestCharacter: (id: Id<GID.Character>) => Character;
    requestPurchase: (id: Id<GID.Purchase>) => Purchase;

    chainSettings: {
        chainDrawbacksForCompanions: boolean,
        chainDrawbacksSupplements: boolean,
        narratives: "enabled" | "disabled" | "restricted";
        altForms: boolean;

    } = {
            chainDrawbacksForCompanions: false,
            chainDrawbacksSupplements: true,
            narratives: "enabled",
            altForms: true
        };

    bankSettings: BankSettings = {
        enabled: false,
        maxDeposit: 200,
        depositRatio: 50,
        interestRate: 0
    };

    pushUpdate: (u: Update) => void;

    getJumpNumber(jId: Id<GID.Jump>): number {
        if (jId < 0) return 0;
        let n = -1;
        for (let id of this.jumpList) {
            if (this.jumps[id].parentJump === undefined) n++;
            if (id == jId) break;
        }
        return n;
    }

    getPreviousJumps(jId: Id<GID.Jump>, charId?: Id<GID.Character>): Id<GID.Jump>[] {
        return this.jumpList.slice(0, this.jumpList.findIndex(
            (jId2) => (jId2 === jId))
        ).filter((jId2) => charId == undefined || this.jumps[jId2].characters.has(charId));
    }

    makeSupplement(jId: Id<GID.Jump>) {
        if (this.jumps[jId].parentJump !== undefined)
            return;
        let i = this.jumpList.findIndex((id) => id == jId);
        if (i == 0) return;
        let siblings = [i];
        i++;
        while (i < this.jumpList.length && this.jumps[this.jumpList[i]].parentJump == jId) {
            siblings.push(i);
            i++;
        }

        i = siblings[0] - 1;

        while (this.jumps[this.jumpList[i]].parentJump !== undefined) {
            i--;
        }

        siblings.forEach((j) => {
            this.jumps[this.jumpList[j]].parentJump = this.jumpList[i];
            this.pushUpdate({
                dataField: ["jumps", this.jumpList[j], "parentJump"],
                action: Action.Update
            });

        });
    }

    calculateBankBalance(charId: Id<GID.Character>, jumpId: Id<GID.Jump>): number {
        if (!this.bankSettings.enabled) return 0;

        let ret = 0;
        let acc = 0;

        for (let jId of this.jumpList) {
            if (!this.jumps[jId].characters.has(charId))
                continue;
            if (this.jumps[jId].parentJump === undefined || this.jumps[jId].parentJump < 0) {
                ret += acc;
                ret *= 1 + this.bankSettings.interestRate / 100;
                ret = Math.floor(ret);
                acc = 0;
            }
            if (jId == jumpId || jId === this.jumps[jumpId].parentJump)
                return ret;
            acc += (this.jumps[jId].bankDeposits[charId] || 0) * (this.jumps[jId].bankDeposits[charId] >= 0 ? this.bankSettings.depositRatio / 100 : 1);
            acc = Math.min(acc, this.bankSettings.maxDeposit);
        }

        return ret;

    }

    getSupplementInvestment(charId: Id<GID.Character>, jId: Id<GID.Jump>, suppId: Id<GID.Supplement>, excludeJump?: boolean) {
        let ret = 0;
        let parentId = this.jumps[jId].parentJump === undefined || this.jumps[jId].parentJump < 0 ? jId : this.jumps[jId].parentJump;
        let charList = this.supplements[suppId].companionAccess == CompanionAccess.Communal ? this.characterList : [charId];
        for (let charId2 of charList) {
            let jumpNum = this.jumpList.findIndex(id => id == parentId);
            do {
                if (excludeJump && jId == this.jumpList[jumpNum])
                    continue;
                if (!this.jumps[this.jumpList[jumpNum]].characters.has(charId2)) continue;
                ret += this.jumps[this.jumpList[jumpNum]].supplementInvestments[charId2][suppId];
            } while (jumpNum < this.jumpList.length && this.jumps[this.jumpList[++jumpNum]]?.parentJump === parentId);
        }

        return ret;
    }

    calulateSupplementBudget(charId: Id<GID.Character>, jId: Id<GID.Jump>, suppId: Id<GID.Supplement>) {
        let supp = this.supplements[suppId];
        let ret = (supp.companionAccess != CompanionAccess.Partial || this.characters[charId].primary) ? supp.initialStipend : 0;

        let scalingImports: IdMap<GID.Character, number> = {};

        let characterList = supp.companionAccess == CompanionAccess.Communal ? this.characterList : [charId];
        let finalChunk = false;
        let currentChunkStipend = false;
        let parentId = this.jumps[jId].parentJump === undefined || this.jumps[jId].parentJump < 0 ? jId : this.jumps[jId].parentJump;
        let firstJump = true;
        for (let jumpId of this.jumpList) {
            let jump = this.requestJump(jumpId);
            if (jump.parentJump === undefined || jump.parentJump < 0)
                currentChunkStipend = false;
            if (finalChunk && jump.parentJump != parentId) break;
            if (jumpId == parentId || jump.parentJump == parentId) finalChunk = true;
            if (!currentChunkStipend && !firstJump && jump.useSupplements
                && (supp.companionAccess != CompanionAccess.Partial || this.characters[charId].primary)) {
                ret += supp.perJumpStipend;
                currentChunkStipend = true;
            }
            for (let charId2 of characterList) {
                if (!jump.characters.has(charId2)) continue;
                ret += Math.floor(jump.supplementInvestments[charId2][suppId] * supp.investmentRatio / 100);
                for (let pId of jump.supplementPurchases[charId2][suppId]) {
                    if (this.requestPurchase(pId).type == PurchaseType.Supplement || supp.companionAccess == CompanionAccess.Partial)
                        ret -= this.requestPurchase(pId).cost;
                }
            }
            if (supp.companionAccess == CompanionAccess.Partial && !this.characters[charId].primary) {
                for (let charId2 of jump.characters) {
                    jump.supplementPurchases[charId2][suppId].filter((pId) => this.purchases[pId].type == PurchaseType.SupplementImport).forEach(
                        (pId) => {
                            if (!this.purchases[pId].supplementImportData!.characters.has(charId)) return;
                            ret += this.purchases[pId].supplementImportData!.allowance;
                            scalingImports[charId2] = (scalingImports[charId2] || 0) + this.purchases[pId].supplementImportData!.percentage / 100;
                        }
                    )
                }
            }
            if (jump.useSupplements)
                firstJump = false;
        }

        for (let charId2 in scalingImports) {
            ret += Math.floor(scalingImports[charId2] * this.calulateSupplementBudget(Number(charId2), jId, suppId));
        }

        return ret;
    }


    getBankDeposit(charId: Id<GID.Character>, jId: Id<GID.Jump>, excludeJump?: boolean, multiply?: boolean) {
        let ret = 0;
        let parentId = this.jumps[jId].parentJump === undefined || this.jumps[jId].parentJump < 0 ? jId : this.jumps[jId].parentJump;
        let jumpNum = this.jumpList.findIndex(id => id == parentId);
        do {
            let nextJumpId = this.jumpList[jumpNum];
            if (excludeJump && jId == nextJumpId)
                continue;
            let add = (this.jumps[nextJumpId].bankDeposits[charId] || 0);
            if (multiply)
                add *= (this.jumps[nextJumpId].bankDeposits[charId] > 0 ? this.bankSettings.depositRatio / 100 : 1);
            else
                add *= (this.jumps[nextJumpId].bankDeposits[charId] > 0 ? 1 : 0);
            if (excludeJump)
                add = Math.max(0, add);
            ret += add;
        } while (jumpNum < this.jumpList.length && this.jumps[this.jumpList[++jumpNum]]?.parentJump === parentId);

        return ret;
    }


    makePrimaryJump(jId: Id<GID.Jump>) {
        if (this.jumps[jId].parentJump === undefined)
            return;

        this.jumps[jId].parentJump = undefined;
        let i = this.jumpList.findIndex((id) => id == jId);

        let j = i;
        while (this.jumps[this.jumpList[++j]].parentJump !== undefined && j <= this.jumpList.length);
        j--;

        if (j == i) return;

        this.jumpList.splice(j, 0, ...this.jumpList.splice(i, 1));

        this.pushUpdate({
            dataField: ["jumpList"],
            action: Action.Update
        });

        this.pushUpdate({
            dataField: ["jumps", jId, "parentJump"],
            action: Action.Delete
        });


    }

    deregisterAltform(afId: Id<GID.AltForm>) {
        let altForm = this.altforms[afId];

        delete this.altforms[afId];
        this.pushUpdate({
            dataField: ["altforms", afId],
            action: Action.Delete
        });

        if (altForm.jumpId === undefined || altForm.jumpId < 0) return;

        this.requestJump(altForm.jumpId!).altForms[altForm.characterId] = this.requestJump(altForm.jumpId!).altForms[altForm.characterId].filter((id) => id != afId);
        this.pushUpdate({
            dataField: ["jumps", altForm.jumpId!],
            action: Action.Update
        });
    }

    deregisterCharacter(charId: Id<GID.Character>) {
        let char = this.requestCharacter(charId);
        this.deregisterAltform(char.originalForm);

        delete this.purchaseGroups[charId];
        this.pushUpdate({
            dataField: ["purchaseGroups", charId],
            action: Action.Delete
        });

        for (let jId of this.jumpList) {
            if (this.requestJump(jId).characters.has(charId))
                this.requestJump(jId).deregisterCharacter(charId);
        }

        delete this.characters[charId];
        this.pushUpdate({
            dataField: ["characters", charId],
            action: Action.Delete
        });

        this.characterList = this.characterList.filter((id) => id != charId);
        this.pushUpdate({
            dataField: ["characterList"],
            action: Action.Update
        });

        for (let pId in this.purchases) {
            let p = this.purchases[pId];
            if (p.importData && p.importData.characters.has(charId)) {
                p.importData.characters.delete(charId);
                this.pushUpdate({
                    dataField: ["purchases", pId, "_importData", "characters"],
                    action: Action.Update
                });
            }
        }

    }

    deregisterPurchaseGroup(charId: Id<GID.Character>, pgId: Id<GID.PurchaseGroup>) {
        for (let pId of this.purchaseGroups[charId][pgId].components) {
            this.requestPurchase(pId).purchaseGroup = undefined;
            this.pushUpdate({
                dataField: ["purchases", pId, "purchaseGroup"],
                action: Action.Delete
            });
        }
        delete this.purchaseGroups[charId][pgId];
        this.pushUpdate({
            dataField: ["purchaseGroups", charId, pgId],
            action: Action.Delete
        });
    }


    deregisterChainSupplement(suppId: Id<GID.Supplement>) {

        for (let jId in this.jumps) {
            let jump = this.jumps[jId];
            jump.characters.forEach((id) => {
                [...jump.supplementPurchases[id][suppId]].forEach((pId) => this.deregisterPurchase(pId));
                delete jump.supplementPurchases[id][suppId];
                delete jump.supplementInvestments[id][suppId];
                this.pushUpdate({
                    dataField: ["jumps", jId, "supplementPurchases", suppId],
                    action: Action.Delete
                });
                this.pushUpdate({
                    dataField: ["jumps", jId, "supplementInvestments"],
                    action: Action.Update
                });
            });
        }

        delete this.supplements[suppId];
        this.pushUpdate(
            {
                dataField: ["supplements"],
                action: Action.Update
            }
        )
    }


    deregisterPurchase(pId: Id<GID.Purchase>) {
        let purchase = this.requestPurchase(pId);

        if (purchase.jumpId >= 0) {
            let jump = this.requestJump(purchase.jumpId);
            jump.purchases[purchase.characterId] = jump.purchases[purchase.characterId].filter((id) => (id != pId));
            jump.drawbacks[purchase.characterId] = jump.drawbacks[purchase.characterId].filter((id) => (id != pId));
            jump.retainedDrawbacks[purchase.characterId].delete(pId);

            if (purchase.supplement !== undefined) {
                jump.supplementPurchases[purchase.characterId][purchase.supplement] = jump.supplementPurchases[purchase.characterId][purchase.supplement].filter((id) => (id != pId));
                this.pushUpdate({
                    dataField: ["jumps", purchase.jumpId, "supplementPurchases", purchase.characterId, purchase.supplement],
                    action: Action.Update
                });
            }

            if (purchase.importData && purchase.importData.characters.size > 0) {
                let importedCharacters = new Set<number>();
                for (let characterId of jump.characters) {
                    for (let pId2 of jump.purchases[characterId]) {
                        if (this.requestPurchase(pId2).importData)
                            this.requestPurchase(pId2).importData!.characters.forEach((id) => importedCharacters.add(id));
                    }
                }
                jump.characters.forEach((id) => {
                    if (!importedCharacters.has(id) && !this.characters[id].primary)
                        jump.deregisterCharacter(id);
                });
            }

            for (let stId of jump.listPurchaseSubtypes()) {
                if (!jump.subsystemSummaries[purchase.characterId][stId])
                    continue;
                for (let summId in jump.subsystemSummaries[purchase.characterId][stId]) {
                    let summ = jump.subsystemSummaries[purchase.characterId][stId][summId];
                    if (summ.subpurchases.includes(purchase.id)) {
                        summ.subpurchases = summ.subpurchases.filter((id) => id != purchase.id);
                        this.pushUpdate({
                            dataField: ["jumps", purchase.jumpId, "subsystemSummaries", purchase.characterId, stId, summId, "subpurchases"],
                            action: Action.Update
                        });
                    }
                    if (summ.id != pId) continue;
                    summ.subpurchases.forEach((id) => this.deregisterPurchase(id));

                    this.pushUpdate({
                        dataField: ["jumps", purchase.jumpId, "subsystemSummaries", purchase.characterId, stId],
                        action: Action.Update
                    });
                }
                jump.subsystemSummaries[purchase.characterId][stId] = jump.subsystemSummaries[purchase.characterId][stId].filter((summ) => (summ.id != pId));
            }

        }

        if (purchase.purchaseGroup !== undefined) {
            this.purchaseGroups[purchase.characterId][purchase.purchaseGroup].components = 
            this.purchaseGroups[purchase.characterId][purchase.purchaseGroup].components.filter (id => id != purchase.id);
            this.pushUpdate({
                dataField: ["purchaseGroups", purchase.characterId, purchase.purchaseGroup, "components"],
                action: Action.Update
            });
        }

        if (purchase.type == PurchaseType.Perk) {
            this.characters[purchase.characterId].perkCount--;
            this.pushUpdate({
                dataField: ["characters", purchase.characterId, "perkCount"],
                action: Action.Update
            });
        }
        if (purchase.type == PurchaseType.Item) {
            this.characters[purchase.characterId].itemCount--;
            this.pushUpdate({
                dataField: ["characters", purchase.characterId, "itemCount"],
                action: Action.Update
            });
        }

        if ([PurchaseType.Item, PurchaseType.Perk, PurchaseType.Companion, PurchaseType.Subsystem].includes(purchase.type))
            this.pushUpdate({
                dataField: ["jumps", purchase.jumpId, "purchases", purchase.characterId],
                action: Action.Update
            });

        if ([PurchaseType.Drawback, PurchaseType.Scenario].includes(purchase.type)) {
            this.pushUpdate({
                dataField: ["jumps", purchase.jumpId, "drawbacks", purchase.characterId],
                action: Action.Update
            });

            this.pushUpdate({
                dataField: ["jumps", purchase.jumpId, "retainedDrawbacks", purchase.characterId],
                action: Action.Update
            });
        }

        if (PurchaseType.ChainDrawback == purchase.type) {
            this.chainDrawbacks = this.chainDrawbacks.filter((id) => (id != pId));
            this.pushUpdate({
                dataField: ["chainDrawbacks"],
                action: Action.Update
            });

        }

        if (purchase.type == PurchaseType.Drawback || purchase.type == PurchaseType.ChainDrawback) {
            this.jumpList.forEach((id) => {
                let j = this.jumps[id];
                for (let charId of j.characters)
                    if (pId in j.drawbackOverrides[charId])
                        delete j.drawbackOverrides[charId][pId];
            });
        }

        delete this.purchases[pId];
        this.pushUpdate({
            dataField: ["purchases", pId],
            action: Action.Delete
        });

    }

    deregisterJump(jId: Id<GID.Jump>) {
        let jump = this.requestJump(jId);


        for (let charId of jump.characters) {
            jump.drawbacks[Number(charId)].forEach((id) => {
                delete this.purchases[id];
                this.pushUpdate({
                    dataField: ["purchases", id],
                    action: Action.Delete
                });
            });
            jump.purchases[Number(charId)].forEach((id) => {
                if (this.purchases[id].type == PurchaseType.Perk) {
                    this.characters[this.purchases[id].characterId].perkCount--;
                    this.pushUpdate({
                        dataField: ["characters", this.purchases[id].characterId, "perkCount"],
                        action: Action.Update
                    });
                }
                if (this.purchases[id].type == PurchaseType.Item) {
                    this.characters[this.purchases[id].characterId].itemCount--;
                    this.pushUpdate({
                        dataField: ["characters", this.purchases[id].characterId, "itemCount"],
                        action: Action.Update
                    });
                }
                if (this.purchases[id].purchaseGroup !== undefined) {
                    this.purchaseGroups[this.purchases[id].characterId][this.purchases[id].purchaseGroup].components = 
                    this.purchaseGroups[this.purchases[id].characterId][this.purchases[id].purchaseGroup].components.filter (id2 => id2 != id);
                    this.pushUpdate({
                        dataField: ["purchaseGroups", this.purchases[id].characterId, this.purchases[id].purchaseGroup, "components"],
                        action: Action.Update
                    });
                }        
                delete this.purchases[id];
                this.pushUpdate({
                    dataField: ["purchases", id],
                    action: Action.Delete
                });
            });
            jump.altForms[Number(charId)].forEach((id) => {
                delete this.altforms[id];
                this.pushUpdate({
                    dataField: ["altforms", id],
                    action: Action.Delete
                });
            });
            for (let suppId in this.supplements) {
                jump.supplementPurchases[Number(charId)][Number(suppId)].forEach((id) => {
                    delete this.purchases[id];
                    this.pushUpdate({
                        dataField: ["purchases", id],
                        action: Action.Delete
                    });
                });
            }
            Object.keys(jump.drawbackOverrides[Number(charId)]).forEach((id) => {
                if (this.purchases[Number(id)].buyoff?.jumpId == jId) {
                    delete this.purchases[Number(id)].buyoff;
                    this.pushUpdate({
                        dataField: ["purchases", Number(id), "buyoff"],
                        action: Action.Delete
                    });
                }
            });
        }

        let index = 0;

        for (let i in this.jumpList) {
            let jId2 = this.jumpList[i];
            if (jId2 == jId)
                index = Number(i);
            if (this.jumps[jId2].parentJump == jId) {
                delete this.jumps[jId2].parentJump;
                this.pushUpdate({
                    dataField: ["jumps", jId2, "parentJump"],
                    action: Action.Delete
                });

            }
        }

        delete this.jumps[jId];
        this.jumpList.splice(index, 1);

        this.pushUpdate({
            dataField: ["jumps", jId],
            action: Action.Delete
        });
        this.pushUpdate({
            dataField: ["jumpList"],
            action: Action.Update
        });

    }

    recountPerks() {
        Object.values(this.characters).forEach((char) => {
            char.perkCount = 0;
            char.itemCount = 0;
            this.pushUpdate({
                dataField: ["characters", char.id, "perkCount"],
                action: Action.Update
            });
            this.pushUpdate({
                dataField: ["characters", char.id, "itemCount"],
                action: Action.Update
            });
        });

        for (let purchaseId in this.purchases) {
            let p = this.purchases[purchaseId];
            if (p.type == PurchaseType.Perk) {
                this.characters[p.characterId].perkCount++;
            }
            if (p.type == PurchaseType.Item) {
                this.characters[p.characterId].itemCount++;
            }

        }
    }

    deserialize(rawObject: any) {
        Object.assign(this, rawObject);


        Object.keys(this.altforms).map(Number).forEach((id) => { this.altforms[id] = (new AltForm(null, 0)).deserialize(rawObject.altforms[id], this); });
        Object.keys(this.characters).map(Number).forEach((id) => { this.characters[id] = (new Character(null).deserialize(rawObject.characters[id], this)); });
        Object.keys(this.jumps).map(Number).forEach((id) => { this.jumps[id] = (new Jump(null).deserialize(rawObject.jumps[id], this)); });
        Object.keys(this.supplements).map(Number).forEach((id) => { this.supplements[id] = (new ChainSupplement(null).deserialize(rawObject.supplements[id], this)); });
        Object.keys(this.purchases).map(Number).forEach((id) => { this.purchases[id] = (new Purchase(null, 0, undefined, 0).deserialize(rawObject.purchases[id], this)); });

        this.manager = new DataManager();
        this.requestJump = (id) => this.manager.requestJump(this, id);
        this.requestCharacter = (id) => this.manager.requestCharacter(this, id);
        this.requestPurchase = (id) => this.manager.requestPurchase(this, id);

        this.recountPerks();

        this.manager.updates = [];
        this.current = true;

        return this;
    }

    constructor(manager?: DataManager) {
        if (manager != undefined)
            this.manager = manager
        else
            this.manager = new DataManager();
        this.requestJump = (id) => this.manager.requestJump(this, id);
        this.requestCharacter = (id) => this.manager.requestCharacter(this, id);
        this.requestPurchase = (id) => this.manager.requestPurchase(this, id);
        this.pushUpdate = (u) => { this.current && this.manager.pushUpdate(u) };
    }

    removePurchaseCategory(type: PurchaseType, id: Id<GID.PurchaseCategory>, supp?: Id<GID.Supplement>) {
        for (let pId in this.purchases) {
            let p = this.purchases[pId];
            if (p.type == type && p.category.includes(id) && (!supp || p.supplement == supp)) {
                p.category = p.category.filter((cId) => cId != id);
                this.pushUpdate({
                    dataField: ["purchases", pId, "category"],
                    action: Action.Update
                });
            }
        }

        if (supp === undefined) {
            delete this.purchaseCategories[type][id];
            this.pushUpdate({
                dataField: ["purchaseCategories", type, id],
                action: Action.Delete
            });
        } else {
            delete this.supplements[supp].purchaseCategories[id];
            this.pushUpdate({
                dataField: ["supplements", supp, "purchaseCategories", id],
                action: Action.Delete
            });
        }

    }

}