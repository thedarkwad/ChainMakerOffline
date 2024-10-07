export interface Duration {
    days: number;
    months: number;
    years: number;
}

export enum GID {
    Character,
    Jump,
    Purchase,
    AltForm,
    Supplement,
    PurchaseGroup,
    PurchaseCategory
}

export enum LID {
    OriginCategory,
    Currency,
    PurchaseSubtype
}


export type Id<T extends LID | GID> = number;

export type PersistentList<A extends LID | GID, T>= Record<Id<A>, T>;

export function getFreeId<A extends LID | GID>(l : PersistentList<A, any>) : Id<A> {
    if (Object.keys(l).length == 0) return 0; 
    return Math.max(...Object.keys(l).map(Number)) + 1;
}

export function persistentAdd<T>(x : T, l : PersistentList<any, T>) : Id<any> {
    let id = getFreeId(l);
    l[id] = x;
    return id;
}

export type IdCorrespondence<A extends LID | GID, B extends GID>= Record<Id<A>, Id<B>[]>;
export type IdMap<A extends LID | GID, B>= Record<Id<A>, B>;
export type IdMap2<A extends LID | GID, B extends LID | GID, C>= Record<Id<A>, Record<Id<B>, C>>;