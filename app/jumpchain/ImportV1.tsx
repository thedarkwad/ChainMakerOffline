import AltForm, { LengthUnit, WeightUnit } from "./AltForm";
import ChainSupplement, { CompanionAccess } from "./ChainSupplement";
import Character from "./Character";
import Jump, { Currency, DrawbackOverride, Origin, OriginCategory, PurchaseSubtype } from "./Jump";
import Purchase, { CostModifier, PurchaseType } from "./Purchase";
import { GID, Id, persistentAdd, PersistentList } from "./Types";
import Chain from "./Chain";
import { isNetworkErrorResponse } from "@remix-run/react/dist/data";

const oldPurchaseTypes = {
    "Perk": 0,
    "Item": 1,
    "Companion": 2,
    "Supplement": 3,
    "Subsystem": 4
};

const oldCostModifiers = {
    "Full": 0,
    "Reduced": 1,
    "Free": 2
};

const oldCompanionAccess = {
    Unavailable: 0,
    Available: 1,
    Communal: 2
}



function convertOldAltForm(chain: Chain, altForm: any, unusedId: number): AltForm {
    if (altForm.JumpId !== undefined && altForm.JumpId >= 0 && !chain.requestJump(altForm.JumpId).characters.has(altForm.JumperID)) {
        // createDummyCompanionImport(chain.requestJump(altForm.JumpId), altForm.JumperID, unusedId);
        chain.requestJump(altForm.JumpId).registerCharacter(altForm.JumperID);
    }
    let af = new AltForm(chain, Number(altForm.JumperID), Number(altForm.JumpID), Number(altForm.ID));
    af.name = altForm.Name;
    af.height = { unit: altForm.HeightImperial ? LengthUnit.Inches : LengthUnit.Centimeters, value: Number(altForm.HeightInUnits) };
    af.weight = { unit: altForm.WeightImperial ? WeightUnit.Pounds : WeightUnit.Kilograms, value: Number(altForm.WeightInUnits) };
    af.capabilities = altForm.Capabilities;
    af.sex = altForm.Sex;
    af.species = altForm.Species;
    af.physicalDescription = altForm.PersonalDescription;

    return af;

}

function convertOldCostModifier(cM: number | string): CostModifier {
    cM = Number(cM);
    switch (cM) {
        case oldCostModifiers.Full:
            return CostModifier.Full;
        case oldCostModifiers.Reduced:
            return CostModifier.Reduced;
        case oldCostModifiers.Free:
            return CostModifier.Free;
    }
    return CostModifier.Full;
}

function convertOldCompanionAccess(cA: number | string): CompanionAccess {
    cA = Number(cA);
    switch (cA) {
        case oldCompanionAccess.Available:
            return CompanionAccess.Available;
        case oldCompanionAccess.Communal:
            return CompanionAccess.Communal;
        case oldCompanionAccess.Unavailable:
            return CompanionAccess.Unavailable;
    }
    return CompanionAccess.Unavailable;
}


function convertOldPurchaseType(x: number | string): PurchaseType {
    x = Number(x);
    switch (x) {
        case oldPurchaseTypes.Perk:
            return PurchaseType.Perk;
        case oldPurchaseTypes.Item:
            return PurchaseType.Item;
        case oldPurchaseTypes.Companion:
            return PurchaseType.Companion;
        case oldPurchaseTypes.Supplement:
            return PurchaseType.Supplement;
        case oldPurchaseTypes.Subsystem:
            return PurchaseType.Subsystem;
    }
    return PurchaseType.Perk;
}

function createDummyCompanionImport(jump: Jump, characterId: Id<GID.Character>, id: number) {
    if (jump.characters.has(characterId)) return;
    let primaryJumper = jump.chain.characterList.find((id) => jump.chain.characters[id].primary);
    let newPurchase = new Purchase(jump.chain, PurchaseType.Companion, jump, primaryJumper! || jump.chain.characterList[0],
        undefined,
        undefined, id);
    newPurchase.name = `Dummy Import [${jump.chain.characters[characterId].name}]`;
    newPurchase.description = "Version 1.0 of this save file had been given purchases without being imported."
    newPurchase.importData = { ...newPurchase.importData!, characters: new Set([characterId]) };
    jump.chain.purchases[id] = newPurchase;
    jump.purchases[primaryJumper!].push(id);
}

export default function importV1Chain(oldChain: any, unusedId: number): Chain {
    if (oldChain.VersionNumber != "1.0") throw "Wrong Version!";
    let chain = new Chain();
    chain.name = oldChain.Name;

    chain.purchaseCategories![PurchaseType.Perk] =
        Object.fromEntries(
            oldChain.PurchaseCategories[oldPurchaseTypes.Perk].map((x: any, i: number) => [i, x.Name])
        ) as PersistentList<GID.PurchaseCategory, string>;
    chain.purchaseCategories![PurchaseType.Item] =
        Object.fromEntries(
            oldChain.PurchaseCategories[oldPurchaseTypes.Item].map((x: any, i: number) => [i, x.Name])
        ) as PersistentList<GID.PurchaseCategory, string>;

    chain.bankSettings.enabled = oldChain.Bank.Enabled;
    chain.bankSettings.maxDeposit = oldChain.Bank.MaxDeposit;
    chain.bankSettings.depositRatio = oldChain.Bank.DepositRatio;
    chain.bankSettings.interestRate = oldChain.Bank.InterestRate;

    for (let cId in oldChain.Characters) {
        let oldChar = oldChain.Characters[cId];
        let newChar = new Character(chain, Number(cId));
        newChar.name = oldChar.Name
        newChar.gender = oldChar.Gender;
        newChar.originalAge = Number(oldChar.OriginalAge);
        newChar.personality = {
            personality: oldChar.Personality,
            motivation: oldChar.Motivation,
            dislikes: oldChar.Dislikes,
            likes: oldChar.Likes,
            quirks: oldChar.Quirks
        };
        newChar.background = {
            summary: oldChar.OriginalBackground.Summary,
            description: oldChar.OriginalBackground.Description
        }
        newChar.primary = Boolean(oldChar.Primary);
        newChar.originalForm = convertOldAltForm(chain, oldChar.OriginalForm, 0).id;
    }

    if (!chain.characterList.some(id => chain.characters[id].primary))
        chain.characters[chain.characterList[0]].primary = true;

    for (let oldS of oldChain.Supplements) {
        let newS = new ChainSupplement(chain, oldS.ID);
        newS.name = oldS.Name;
        newS.url = oldS.URL || undefined;
        newS.currency = oldS.Currency;
        newS.investmentRatio = Number(oldS.InvestmentRatio);
        newS.initialStipend = Number(oldS.InitialStipend);
        newS.maxInvestment = Number(oldS.MaxInvestment);
        newS.perJumpStipend = Number(oldS.PerJumpStipend);
        newS.companionAccess = convertOldCompanionAccess(oldS.CompanionAccess);
        newS.purchaseCategories = Object.fromEntries(
            oldS.PurchaseCategories.map((x: { Name: string; }, i: any) => [Number(i), x.Name])
        );
        newS.itemLike = oldS.ItemLike;

    }

    for (let oldJ of oldChain.Jumps) {
        let newJ: Jump = new Jump(chain, Number(oldJ.ID));
        newJ.clear();
        newJ.name = oldJ.Name;
        newJ.url = oldJ.URL || undefined;

        for (let cId in oldJ.Currencies) {
            let oldCurrency = oldJ.Currencies[cId];
            let currency: Currency = {
                abbrev: oldCurrency.Abbrev,
                name: oldCurrency.Name,
                budget: oldCurrency.Budget,
                essential: oldCurrency.Essential
            };
            newJ.newCurrency(currency, Number(oldCurrency.ID));
        }

        for (let stId_string in oldJ.PurchaseSubTypes) {
            let stId: number = Number(stId_string);
            if (oldJ.PurchaseSubTypes[stId].Hidden) continue;
            let oldSt = oldJ.PurchaseSubTypes[stId];
            let purchaseSubtype: PurchaseSubtype = {
                currency: Number(oldSt.Currency),
                essential: oldSt.Essential,
                name: oldSt.Name,
                stipend: Number(oldSt.Stipend),
                type: convertOldPurchaseType(oldSt.Type),
                subsystem: !!oldSt.Subsystem
            };
            newJ.newPurchaseSubtype(purchaseSubtype, stId);
        }

        newJ.bankDeposits = oldJ["BankDeposits"];

        for (let oCId in oldJ.OriginCategories) {
            let oC = oldJ.OriginCategories[oCId];
            newJ.addOriginCategory({ name: oC.Name, singleLine: oC.Single, default: oC.Def }, Number(oCId));
        }

        newJ.duration = { days: oldJ.Length.Days, months: oldJ.Length.Months, years: oldJ.Length.Years };

        for (let charId in oldJ.SubsystemAccess) {
            for (let stId in oldJ.SubsystemAccess[charId]) {
                newJ.subsystemSummaries[Number(charId)][Number(stId)] = newJ.subsystemSummaries[Number(charId)][Number(stId)] || [];
                newJ.subsystemSummaries[Number(charId)][Number(stId)].push({
                    id: Number(oldJ.SubsystemAccess[charId][stId].PurchaseID),
                    stipend: Number(oldJ.SubsystemAccess[charId][stId].Stipend),
                    currency: newJ.purchaseSubtype(Number(stId)).currency,
                    subpurchases: []
                });
            }
        }

        for (let oldP of oldJ.Purchases) {
            if (!oldP) continue;
            if (convertOldPurchaseType(oldP.InternalType) == PurchaseType.Supplement && !(oldP.Supplement?.ID in chain.supplements))
                continue;
            let newP: Purchase = new Purchase(
                chain,
                convertOldPurchaseType(oldP.InternalType),
                newJ,
                Number(oldP.JumperID),
                oldP.Supplement?.ID == undefined ? undefined : Number(oldP.Supplement?.ID),
                (convertOldPurchaseType(oldP.InternalType) == PurchaseType.Subsystem) ?
                    { subsystem: Number(oldP.Subtype), parent: Number(oldJ.SubsystemAccess[oldP.JumperID][oldP.Subtype].PurchaseID) } :
                    undefined,
                Number(oldP.ID)
            );
            newP.name = oldP.Name;
            newP.currency = Number(oldP.Currency);
            newP.description = oldP.Description;
            newP.value = oldP.Value;
            newP.costModifier = convertOldCostModifier(oldP.CostModifier);
            newP.tags = oldP.Tags;
            newP.subtype = oldP.Subtype;

            for (let id in chain.purchaseCategories[newP.type]) {
                if (oldP.Category.includes(chain.purchaseCategories[newP.type][id])) {
                    newP.category.push(Number(id));
                }
            }

            oldP.Duration = Number(oldP.Duration);
            if (oldP.Duration && oldP.Duration > 0) newP.duration = oldP.Duration;
            if (oldP.Temporary) newP.duration = 1;

            if (newP.type == PurchaseType.Supplement) {
                for (let id in chain.supplements[newP.supplement!].purchaseCategories) {
                    if (oldP.Category.includes(chain.supplements[newP.supplement!].purchaseCategories[id])) {
                        newP.category.push(Number(id));
                    }
                }
            }

            if (newP.type == PurchaseType.Companion) {
                newP.importData = {
                    characters: new Set(oldP.CompanionIDs.map(Number)),
                    allowances: oldP.Allowances,
                    stipend: oldP.Stipends
                };

            }

            chain.purchases[newP.id] = newP;
            if (newP.supplement == undefined) {
                if (!newJ.characters.has(newP.characterId)) {
                    // createDummyCompanionImport(newJ, newP.characterId, unusedId++);
                    newJ.registerCharacter(newP.characterId);
                }
                newJ.purchases[newP.characterId].push(newP.id);
            }
            else {
                newJ.supplementPurchases[newP.characterId][newP.supplement].push(newP.id);
            }



        }

        for (let aF of oldJ.PhysicalForms) {
            convertOldAltForm(chain, aF, unusedId++);
        }


        for (let oldD of oldJ.Drawbacks) {
            let newD: Purchase = new Purchase(
                chain,
                Number(oldD.Type) == 0 ? PurchaseType.Drawback : PurchaseType.Scenario,
                newJ,
                Number(oldD.JumperID),
                undefined,
                undefined,
                Number(oldD.ID)
            );
            newD.name = oldD.Name;
            newD.description = oldD.Description;
            newD.currency = Number(oldD.Currency);
            newD.value = oldD.Value;
            newD.costModifier = convertOldCostModifier(oldD.CostModifier);
            newD.reward = oldD.Reward || undefined;

            newD.duration = 1;

            chain.purchases[newD.id] = newD;
            if (!newJ.characters.has(newD.characterId)) {
                // createDummyCompanionImport(newJ, newD.characterId, unusedId++);
                newJ.registerCharacter(newD.characterId);
            }
            newJ.drawbacks[newD.characterId].push(newD.id);

        }

        for (let charId of newJ.characters) {
            let n = oldJ.Narratives[charId];
            newJ.narratives[Number(charId)] = { goals: n.Goals, challenges: n.Challenges, accomplishments: n.Accomplishments }
            if (chain.characters[charId].primary)
                newJ.drawbackOverrides[charId] = Object.fromEntries(oldJ.ExcludedDrawbacks.map((n: number) => [n, {
                    override: DrawbackOverride.Excluded,
                    modifier: CostModifier.Free
                }]
                ));
        }

        if (oldJ.ParentJumpID >= 0) newJ.parentJump = oldJ.ParentJumpID;

        newJ.supplementInvestments = Object.fromEntries(
            Object.entries(oldJ.SupplementInvestments).map(([i, x]: [string, any]) => [Number(i),
            Object.fromEntries(
                Object.entries(x).map(([j, y]) => [Number(j), Number(y)]))
            ])
        );

        for (let charId in oldJ.Origins) {
            if (!newJ.characters.has(Number(charId))) continue;
            newJ.origins[Number(charId)] = Object.fromEntries(Object.entries(oldJ.Origins[charId]).map(
                ([catId, origin]: [string, any]) => [Number(catId),
                {
                    cost: Number(origin.Cost),
                    summary: origin.Name,
                    description: origin.Description
                }
                ]
            )
            );
        }
        chain.jumps[newJ.id] = newJ;
    }


    for (let oldChainDrawback of oldChain.Drawbacks) {
        let newD: Purchase = new Purchase(
            chain,
            PurchaseType.ChainDrawback,
            undefined,
            -1,
            undefined,
            undefined,
            Number(oldChainDrawback.ID)
        );
        newD.name = oldChainDrawback.Name;
        newD.description = oldChainDrawback.Description;
        newD.currency = Number(oldChainDrawback.Currency);
        newD.value = oldChainDrawback.Value;
        newD.costModifier = convertOldCostModifier(oldChainDrawback.CostModifier);
        newD.itemStipend = oldChainDrawback.ItemStipend;
        newD.companionStipend = oldChainDrawback.CompanionStipend;

        newD.duration = -1;

        chain.purchases[newD.id] = newD;
        chain.chainDrawbacks.push(newD.id);

    }

    [...oldChain.Notes, ...oldChain.HouseRules].forEach((oldNote: { Title: string, Text: string }) => {
        let id = persistentAdd<{ title: string, body: string }>({ title: oldNote.Title, body: oldNote.Text }, chain.notes);
        chain.notes[id].id = id;
        chain.notesList.push(id);
    });

    chain.chainSettings.altForms = oldChain.AltFormSetting == 4;
    chain.chainSettings.narratives = oldChain.NarrativeSetting == 6 ? "enabled" :
        oldChain == 7 ? "restricted" : "disabled";

    chain.characterList.sort((id1, id2) => +(chain.characters[id2].primary) - +(chain.characters[id1].primary));
    chain.recountPerks();

    chain.current = true;
    return chain;
}