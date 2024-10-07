import Chain from "./Chain";
import { Action } from "./DataManager";
import { E, MarkupFragment, T } from "./LayoutManager";
import { getFreeId, GID, Id } from "./Types";

export enum LengthUnit {
    Inches,
    Feet,
    Miles,
    Centimeters,
    Meters,
    Kilometers
}

export enum WeightUnit {
    Pounds,
    Kilograms,
    Tons,
    Tonnes
}

export interface Length {
    value: number,
    unit: LengthUnit
}

export interface Weight {
    value: number,
    unit: WeightUnit
}

export const conversionsToCm = {
    [LengthUnit.Centimeters]: 1,
    [LengthUnit.Meters]: 100,
    [LengthUnit.Feet]: 30.48,
    [LengthUnit.Inches]: 2.54,
    [LengthUnit.Kilometers]: 100000,
    [LengthUnit.Miles]: 160934.4
}

export const conversionsToKg = {
    [WeightUnit.Kilograms]: 1,
    [WeightUnit.Pounds]: 0.45359237,
    [WeightUnit.Tonnes]: 1000,
    [WeightUnit.Tons]: 907.18474
}

export function lengthConversion(value: number, startingUnit: LengthUnit, endingUnit: LengthUnit) {
    return (value * conversionsToCm[startingUnit] / conversionsToCm[endingUnit])
}

export function weightConversion(value: number, startingUnit: WeightUnit, endingUnit: WeightUnit) {
    return (value * conversionsToKg[startingUnit] / conversionsToKg[endingUnit])
}


export function convertLength(l: Length, targetIsImperial: boolean): Length {
    let conversionChart = {
        "imperial": {
            [LengthUnit.Centimeters]: LengthUnit.Inches,
            [LengthUnit.Meters]: LengthUnit.Feet,
            [LengthUnit.Kilometers]: LengthUnit.Miles,
            [LengthUnit.Inches]: LengthUnit.Inches,
            [LengthUnit.Feet]: LengthUnit.Feet,
            [LengthUnit.Miles]: LengthUnit.Miles,
        }, "metric": {
            [LengthUnit.Centimeters]: LengthUnit.Centimeters,
            [LengthUnit.Meters]: LengthUnit.Meters,
            [LengthUnit.Kilometers]: LengthUnit.Kilometers,
            [LengthUnit.Inches]: LengthUnit.Centimeters,
            [LengthUnit.Feet]: LengthUnit.Meters,
            [LengthUnit.Miles]: LengthUnit.Kilometers,
        }
    };
    let targetUnit = conversionChart[targetIsImperial ? "imperial" : "metric"][l.unit];
    if (targetUnit == l.unit) return l;
    return { unit: targetUnit, value: lengthConversion(l.value, l.unit, targetUnit) };
}

export function convertWeight(l: Weight, targetIsImperial: boolean): Weight {
    let conversionChart = {
        "imperial": {
            [WeightUnit.Kilograms]: WeightUnit.Pounds,
            [WeightUnit.Tonnes]: WeightUnit.Tons,
            [WeightUnit.Pounds]: WeightUnit.Pounds,
            [WeightUnit.Tons]: WeightUnit.Tons
        }, "metric": {
            [WeightUnit.Kilograms]: WeightUnit.Kilograms,
            [WeightUnit.Tonnes]: WeightUnit.Tonnes,
            [WeightUnit.Pounds]: WeightUnit.Kilograms,
            [WeightUnit.Tons]: WeightUnit.Tonnes
        }
    };
    let targetUnit = conversionChart[targetIsImperial ? "imperial" : "metric"][l.unit];
    if (targetUnit == l.unit) return l;
    return { unit: targetUnit, value: weightConversion(l.value, l.unit, targetUnit) };
}



export function displayLength(l: Length, imperial: boolean) {

    let cmValue = l.value * conversionsToCm[l.unit];
    let big = cmValue > 150000;

    if (big && imperial) return `${+(cmValue / conversionsToCm[LengthUnit.Miles]).toFixed(2)} miles`;
    if (!big && imperial) {
        let totalIns = cmValue / conversionsToCm[LengthUnit.Inches];
        let feet = Math.floor(totalIns / 12);
        let ins = Math.floor(totalIns - feet * 12);
        return feet > 0 ? `${feet} ft${(ins > 0) ? ` ${ins} in` : ``}` : `${ins} in`;
    }
    if (big && !imperial) return `${+(cmValue / conversionsToCm[LengthUnit.Kilometers]).toFixed(2)} km`;
    if (!big && !imperial) {
        if (cmValue < 300)
            return `${cmValue.toFixed(0)} cm`;
        let meters = Math.floor(cmValue / 100);
        let cms = Math.floor(cmValue - 100 * meters);
        return `${meters} m ${cms} cm`;
    }

}

export function displayWeight(w: Weight, imperial: boolean) {

    let kgValue = w.value * conversionsToKg[w.unit];
    let big = kgValue > 1500;
    let veryBig = kgValue > 1500000;

    if (veryBig && imperial) return `${+(kgValue / conversionsToKg[WeightUnit.Tons] / 1000).toFixed(2)} kilotons`;
    if (big && imperial) return `${+(kgValue / conversionsToKg[WeightUnit.Tons]).toFixed(2)} tons`;
    if (!big && imperial) return `${+(kgValue / conversionsToKg[WeightUnit.Pounds]).toFixed(2)} lbs.`;

    if (veryBig && !imperial) return `${+(kgValue / conversionsToKg[WeightUnit.Tonnes] / 1000).toFixed(2)} kilotonnes`;
    if (big && !imperial) return `${+(kgValue / conversionsToKg[WeightUnit.Tonnes]).toFixed(2)} tonnes`;
    if (!big && !imperial) return `${+(kgValue / conversionsToKg[WeightUnit.Kilograms]).toFixed(2)} kg`;

}

export default class AltForm {
    characterId!: number;
    private _id!: number;
    chain!: Chain;
    jumpId?: Id<GID.Jump>;

    imageURL?: string = undefined;
    imageUploaded: boolean = false;

    public get id(): number {
        return this._id;
    }
    public set id(value: number) {
        this._id = value;
    }
    height!: Length;
    weight!: Weight;
    sex: string = "";
    name: string = "";
    species: string = "";
    physicalDescription: string = "";
    capabilities: string = "";

    constructor(chain: Chain | null, characterId: Id<GID.Character>, jumpId?: Id<GID.Jump>, id?: Id<GID.AltForm>) {

        if (chain === null)
            return;

        this.chain = chain;

        if ((id !== undefined && chain.requestJump(id) !== undefined) || (id != undefined && id < 0)) {
            id = getFreeId<GID.AltForm>(chain.altforms);
        }

        this.height = { value: Math.floor(Math.random() * 3000) / 100 + 50, unit: LengthUnit.Inches };
        this.weight = { value: Math.floor(Math.random() * 25000) / 100 + 80, unit: WeightUnit.Pounds };

        this._id = (id !== undefined) ? id : getFreeId<GID.AltForm>(chain.altforms);
        this.characterId = characterId;
        this.jumpId = jumpId;

        chain.altforms[this._id] = this;
        this.chain.pushUpdate({
            dataField: ["altforms", this._id],
            action: Action.New
        });

        if (jumpId != undefined && jumpId >= 0) {
            chain.requestJump(jumpId).altForms[characterId].push(this._id);
            this.chain.pushUpdate({
                dataField: ["jumps", jumpId, "altForms", characterId],
                action: Action.Update
            });
        }

    }

    deserialize(rawObject: any, chain: Chain) {
        Object.assign(this, rawObject);
        this.chain = chain;
        return this;
    }

    exportForDisplay(imperial: boolean): MarkupFragment[] {
        let title = [E(T.Bold, {}, `${this.name} [${this.species ? this.species + " Form" : "unknown species"}]`),
        E([], { verbose: true }, ":")
        ];
        let body = E(T.List, { verbose: true },
            this.imageURL?.startsWith("http://") || this.imageURL?.startsWith("https://") ?
                E(T.ListItem, {}, E(T.Link, { url: this.imageURL },
                    this.imageURL.length > 25 ? this.imageURL.substring(0, 25) + "..." : this.imageURL))
                : [],
            this.height.value > 0 || this.weight.value > 0 ? E(T.ListItem, {}, E(T.Italic, {}, "Height:"), { space: 1 }, displayLength(this.height, imperial)!, ";", { space: 1 }, E(T.Italic, {}, "Weight:"), { space: 1 }, displayWeight(this.weight, imperial)!) : [],
            this.physicalDescription ? E(T.ListItem, {}, E(T.Bold, {}, "Physical Description:"), { space: 1 }, this.physicalDescription) : [],
            this.capabilities ? E(T.ListItem, {}, E(T.Bold, {}, "Capabilities:"), { space: 1 }, this.capabilities) : []

        )
        return [title, body];
    }



}