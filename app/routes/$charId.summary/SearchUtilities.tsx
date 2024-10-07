import Chain from "~/jumpchain/Chain";
import Purchase, { PurchaseType } from "~/jumpchain/Purchase";
import { GID, Id } from "~/jumpchain/Types";

export interface QueryParams {
    term: string;
    pools: { type: PurchaseType, supplement?: Id<GID.Supplement>, categories: Id<GID.PurchaseCategory>[] }[];
    upTo?: Id<GID.Jump>;
    characterId: Id<GID.Character>
}

// query should be all lowercase
function checkQuery(purchase: Purchase, type: PurchaseType, query: string, chainLength: number, chain: Chain) {
    if (purchase.type !== type) return false;
    if (purchase.duration && purchase.duration > 0 && purchase.duration <= chainLength) return false;
    if (purchase.name.toLowerCase().includes(query)) return true;
    for (let tag of purchase.tags)
        if (tag.toLowerCase().includes(query)) return true;
    if (purchase.description.toLowerCase().includes(query)) return true;
    if (purchase.purchaseGroup !== undefined) {
        let purchaseGroup = chain.purchaseGroups[purchase.characterId][purchase.purchaseGroup];
        if (purchaseGroup.name.toLowerCase().includes(query)) return true;
        if (purchaseGroup.description.toLowerCase().includes(query)) return true;
    }
    return false;
}

function getNumJumps(chain: Chain, upTo?: Id<GID.Jump>) {
    let numJumps: number;
    if (upTo === undefined)
        numJumps = chain.jumpList.length;
    else {
        numJumps = chain.jumpList.findIndex((id) => id == upTo);
        if (numJumps < 0) numJumps = chain.jumpList.length;
        while (numJumps < chain.jumpList.length) {
            if (chain.jumps[numJumps].parentJump !== undefined && chain.jumps[numJumps].parentJump! > -1)
                numJumps++;
            else
                break;
        }
    }
    return numJumps;

}

export function queryPurchases(chain: Chain, query: QueryParams,
    previousQuery?: QueryParams, previousResults?: { [key: number]: Id<GID.Purchase>[] }[])
    : { [key: number]: Id<GID.Purchase>[] }[] {

    query = { ...query, term: query.term.toLowerCase() };
    if (previousQuery) previousQuery = { ...previousQuery, term: previousQuery.term.toLowerCase() };

    let idSubpools: { [key: number]: Id<GID.Purchase>[] }[][] = [];
    let doSearch: boolean[][] = [];

    let numJumps = getNumJumps(chain, query.upTo);
    for (let pool of query.pools) {
        let previousPoolIndex = previousQuery?.pools?.findIndex((pPool) => pPool.supplement === pool.supplement && pPool.type === pool.type);
        if (previousPoolIndex === undefined) previousPoolIndex = -1;
        if (previousPoolIndex < 0 || previousQuery === undefined || !query.term.includes(previousQuery.term) || query.characterId != previousQuery.characterId) {
            idSubpools.push([Object.fromEntries(chain.jumpList.slice(0, numJumps).map(
                (jId) =>
                    [jId, (!chain.jumps[jId].characters.has(query.characterId) ? []
                        : (pool.type !== PurchaseType.Supplement ?
                            chain.requestJump(jId).purchases[query.characterId] :
                            chain.jumps[jId].supplementPurchases[query.characterId][pool.supplement!])
                    ).filter((pId) => pool.categories.includes(-1) || chain.requestPurchase(pId).category.some((c) => pool.categories.includes(c)))
                    ]
            ))
            ]);
            doSearch.push([true]);
            continue;
        }

        let previousPool = previousQuery.pools[previousPoolIndex];

        let prevNumJumps = getNumJumps(chain, previousQuery.upTo);

        let missingCategoriesSubPool = Object.fromEntries(chain.jumpList.slice(0, Math.min(numJumps, prevNumJumps)).map(
            (jId,) => [jId, (!chain.jumps[jId].characters.has(query.characterId) ? []
                : (pool.type !== PurchaseType.Supplement ?
                    chain.requestJump(jId).purchases[query.characterId] :
                    chain.jumps[jId].supplementPurchases[query.characterId][pool.supplement!])
            ).filter((pId) => (pool.categories.includes(-1) || chain.requestPurchase(pId).category.some((c) => pool.categories.includes(c)))
                && !previousPool.categories.includes(-1) && !chain.requestPurchase(pId).category.some((c) => previousPool.categories.includes(c)))
            ]));

        if (prevNumJumps < numJumps) {
            let missingJumpSubPool = Object.fromEntries(chain.jumpList.slice(prevNumJumps, numJumps).map(
                (jId,) => [jId, (!chain.jumps[jId].characters.has(query.characterId) ? []
                    : (pool.type !== PurchaseType.Supplement ?
                        chain.requestJump(jId).purchases[query.characterId] :
                        chain.jumps[jId].supplementPurchases[query.characterId][pool.supplement!])
                ).filter((pId) => pool.categories.includes(-1) || chain.requestPurchase(pId).category.some((c) => pool.categories.includes(c)))
                ]));
            idSubpools.push([previousResults![previousPoolIndex], missingJumpSubPool, missingCategoriesSubPool]);
            doSearch.push([query.term != previousQuery.term, true, true]);
        } else {
            let trimmedResults = Object.fromEntries(
                Object.entries(previousResults![previousPoolIndex]).filter(
                    ([jId,]) => chain.jumpList.slice(0, numJumps).includes(Number(jId))
                ).map(([jId, list]) => [jId, list.filter(
                    (pId) => pool.categories.includes(-1) || chain.requestPurchase(pId).category.some((c) => pool.categories.includes(c))
                )])
            );
            idSubpools.push([trimmedResults, missingCategoriesSubPool]);
            doSearch.push([query.term != previousQuery.term, true]);
        }
    }

    let chainLength = chain.getJumpNumber(chain.jumpList[chain.jumpList.length - 1]);

    return idSubpools.map((idSubpool, i) => {

        let retPool: { [key: number]: Id<GID.Purchase>[] } = {};

        for (let jId of chain.jumpList.slice(0, numJumps)) {
            retPool[Number(jId)] = idSubpool.map((jumpSubPool, j) => {
                if (!(Number(jId) in jumpSubPool)) return [];
                return !doSearch[i][j] ? jumpSubPool[Number(jId)]
                    : jumpSubPool[Number(jId)].filter(
                        (pId) => checkQuery(chain.requestPurchase(pId), query.pools[i].type, query.term, chainLength, chain)
                    );
            }).flat();
        }

        return retPool;

    });

}

export function mergeQueryResults(chain: Chain, results: { [key: number]: Id<GID.Purchase>[] }[]): Id<GID.Purchase>[] {
    let ret: Id<GID.Purchase>[] = [];
    for (let jId of chain.jumpList) {
        results.forEach((pool) => {
            if (Number(jId) in pool)
                ret = ret.concat(pool[jId]);
        });
    }
    return ret;
}

export function mergeQueryResultsByTag(chain: Chain, results: { [key: number]: Id<GID.Purchase>[] }[], searchTerm: string): { [key: string]: Id<GID.Purchase>[] } {

    searchTerm = searchTerm.toLowerCase();
    let ret: { [key: string]: Id<GID.Purchase>[] } = {};
    let untagged: Id<GID.Purchase>[] = [];
    for (let jId of chain.jumpList) {
        results.forEach((pool) => {
            pool[jId].forEach((pId) => {
                let p = chain.requestPurchase(pId);
                let matchingTags: string[] = [];
                let nonMatchingTags: string[] = [];
                p.tags.forEach((tag) => {
                    if (tag.toLowerCase().includes(searchTerm))
                        matchingTags.push(tag);
                    else
                        nonMatchingTags.push(tag);
                });

                (matchingTags.length ? matchingTags : nonMatchingTags).forEach((tag) => {
                    if (ret[tag] === undefined) ret[tag] = [];
                    ret[tag].push(pId);
                }
                );

                if (p.tags.length == 0) {
                    untagged.push(pId);
                }
            });
        });
    }
    if (untagged.length > 0) ret[""] = untagged;
    return ret;

} 