import { Outlet, useNavigate, useOutletContext, useParams } from "@remix-run/react";
import JumpNavigationBar from "./$charId.jump/JumpNavigationBar";
import Chain from "~/jumpchain/Chain";
import { FunctionComponent, MouseEvent, useEffect, useRef, useState } from "react";
import SummaryNavigationBar from "./$charId.summary/SummaryNavigationBar";
import FloatingButtonRow, { Direction, IconColor, IconSize } from "~/components/FloatingButton";
import Multiselect from "~/components/Multiselect";
import { PurchaseType } from "~/jumpchain/Purchase";
import CheckBox from "~/components/Checkbox";
import ChainSupplement, { CompanionAccess } from "~/jumpchain/ChainSupplement";
import { GID, Id, IdMap2 } from "~/jumpchain/Types";
import { mergeQueryResults, mergeQueryResultsByTag, QueryParams, queryPurchases } from "./$charId.summary/SearchUtilities";
import { PurchaseSummary } from "~/components/jumpchain/PurchaseSummary";
import Collapsable from "~/components/Collapsable";
import React from "react";
import { PurchaseGroupCard } from "~/components/jumpchain/PurchaseGroupCard";

let maximumPerksPerPage = 200;
let maximumTagsPerPage = 20;
let maximumPerksPerTag = 15;

const PurchaseMiniDisplay: FunctionComponent<{ maxPageSize: number, items: Id<GID.Purchase>[], chain: Chain, keyPrefix?: string }> = (p) => {

    const [page, setPage] = useState(0);

    let groups: IdMap2<GID.Character, GID.PurchaseGroup, Id<GID.Purchase>> = {};
    p.items.forEach(
        (pId) => {
            let purchase = p.chain.requestPurchase(pId);
            if (purchase.purchaseGroup === undefined) return;
            if (!groups[purchase.characterId])
                groups[purchase.characterId] = {};
            if (groups[purchase.characterId][purchase.purchaseGroup] !== undefined) return;
            groups[purchase.characterId][purchase.purchaseGroup] = pId;
        }
    )

    let numPages = Math.ceil(p.items.length / p.maxPageSize);

    if (page >= numPages && page != 0)
        setPage(Math.min(numPages - 1, 0));

    let sharedClasses = "roomy-cell subtle-rounded hspaced clickable bold";
    let activeClasses = "active-navlink medium-highlight mild-outline";
    let inactiveClasses = "inactive-navlink text-highlight-h mild-outline-h faint-highlight-h";

    let pageSelect = (
        <div className="spanning vcentered center-text-align vspaced">
            <span className={`${sharedClasses} ${inactiveClasses}`} onClick={() => setPage(Math.max(page - 1, 0))}>←</span>
            {[...Array(numPages).keys()].map((p) =>
                <span className={`${sharedClasses} ${page == p ? activeClasses : inactiveClasses}`} onClick={() => setPage(p)} key={`${p}_page_select`}>
                    {p + 1}
                </span>
            )}
            <span className={`${sharedClasses} ${inactiveClasses}`} onClick={() => setPage(Math.min(page + 1, numPages - 1))}>→</span>
        </div>
    );

    let itemDisplay = p.items.slice(page * p.maxPageSize, (page + 1) * p.maxPageSize).map(
        (pId) => {
            let purchase = p.chain.requestPurchase(pId);
            return purchase.purchaseGroup === undefined ?
                <PurchaseSummary chain={p.chain} purchaseId={pId} key={`${p.keyPrefix || ""}${pId}`} /> :
                (groups[purchase.characterId][purchase.purchaseGroup] == pId ?
                    <PurchaseGroupCard chain={p.chain} charId={purchase.characterId} pgId={purchase.purchaseGroup}
                        rerender={ () => {} }
                        summary={true} />
                    : []
                )
        }
    );

    return (<>
        {numPages > 1 ? pageSelect : []}
        {itemDisplay}
    </>);

}

export default function Index() {

    const params = useParams();
    const [chain,] = useOutletContext<[Chain, () => void]>();
    let charId = Number(params.charId);
    let chainId = String(params.chain);
    let suppId = Number(params.suppId);

    let navigate = useNavigate();

    useEffect(() => {
        setPrimaryCategories([]);
        setPage(0);
        doSearch({
            characterId: charId,
            pools: [{ type: PurchaseType.Supplement, categories: [-1, ...Object.keys(chain.supplements[suppId].purchaseCategories).map(Number)], supplement: suppId }],
            term: ""
        });
    }, [params.suppId]);

    useEffect(() => {
        if (chain.characters[charId].primary || chain.supplements[suppId].companionAccess != CompanionAccess.Unavailable) {
            setPage(0);
            doSearch({ ...searchQuery, characterId: charId });
        } else {
            navigate(`/chain/${chainId}/${charId}/summary`)
        }
    }, [params.charId, params.suppId]);

    const [primaryCategories, setPrimaryCategories] = useState<number[]>([]);
    const [autoexpandTags, setAutoexpandTags] = useState<boolean>();
    const [chronologicalMode, setChronologicalMode] = useState<boolean>(true)
    const [page, setPage] = useState<number>(0);
    const [[searchQuery, searchResults], setSearchData] = useState<[QueryParams, { [key: number]: Id<GID.Purchase>[] }[]]>([{
        characterId: charId,
        pools: [{ type: PurchaseType.Supplement, categories: [-1, ...Object.keys(chain.supplements[suppId].purchaseCategories).map(Number)], supplement: suppId }],
        term: ""
    }, []]);
    const searchRef = useRef<HTMLInputElement>(null);

    if (chronologicalMode && autoexpandTags)
        setAutoexpandTags(false);

    if (searchResults.length == 0) {
        setSearchData([searchQuery, queryPurchases(chain, searchQuery)]);
        return <></>;
    }

    let doSearch = (query: QueryParams) =>
        setSearchData(([prevQuery, prevResults]) => [query, queryPurchases(chain, query, prevQuery, prevResults)]);

    let searchBar = (
        <span className="roomy-cell rounded-rect searchbar">
            <input
                ref={searchRef}
                autoFocus
                type="text"
                autoComplete="off"
                name="query"
                className="big-margin-left vcentered large-text"
                style={{ width: "14rem", position: "relative", top: "-1.5px", left: "4px" }}
                value={searchQuery?.term}
                onChange={() => {
                    if (!searchRef.current) return;
                    doSearch({ ...searchQuery, term: searchRef.current.value })
                }}
            />
            <FloatingButtonRow buttons={[{
                onClick: () => { },
                icon: "search"
            }]} position={Direction.Left} unclickable color={IconColor.Light} size={IconSize.Small} />
        </span>
    );

    let categories = Object.entries(chain.supplements[suppId].purchaseCategories);

    let categorySelect = <Multiselect
        name={"category"}
        options={Object.fromEntries(categories.map(
            ([id, name]) => [id, { name: name }]
        ))}
        value={Object.fromEntries(categories.map(
            ([id,]) => [id, primaryCategories.includes(Number(id))]
        ))}
        onChange={(data) => {
            let cats = Object.keys(data).map(Number).filter((id) => data[id]);
            setPrimaryCategories(cats);
            doSearch({
                term: searchQuery.term,
                pools: [{
                    categories: cats.length > 0 ? cats : [-1, ...Object.keys(chain.supplements[suppId].purchaseCategories).map(Number)],
                    type: PurchaseType.Supplement,
                    supplement: suppId
                }],
                characterId: charId
            });
        }}
        placeholder="All Categories"
        overflow="Multi-Category"
        separator=" &"
        title="Perks"
        inline
        className="extra-big-margin-left"
    />;


    let modeSelect = <Multiselect
        name={"tag"}
        options={{ 0: { name: "Chronological View" }, 1: { name: "Tag View" } }}
        value={{ 0: chronologicalMode, 1: !chronologicalMode }}
        inline
        className="margin-left"
        onChange={(e) => { setChronologicalMode(!!e[0]) }}
        roomy
        single
    />;

    let noResultsFound = <div className="center-text-align roomy-cell">No Purchases Matching Query!</div>

    let resultsDisplay;
    let numPages: number;
    let numResults: number;

    if (chronologicalMode) {
        let mergedResults = mergeQueryResults(chain, searchResults);
        numResults = Object.keys(mergedResults).length;
        numPages = Math.ceil(numResults / maximumPerksPerPage);

        let groups: IdMap2<GID.Character, GID.PurchaseGroup, Id<GID.Purchase>> = {};
        mergedResults.forEach(
            (pId) => {
                let purchase = chain.requestPurchase(pId);
                if (purchase.purchaseGroup === undefined) return;
                if (!groups[purchase.characterId])
                    groups[purchase.characterId] = {};
                if (groups[purchase.characterId][purchase.purchaseGroup] !== undefined) return;
                groups[purchase.characterId][purchase.purchaseGroup] = pId;
            }
        );

        resultsDisplay = <div className="light-shade vspaced extra-roomy-cell subtle-rounded">
            {mergedResults.slice(page * maximumPerksPerPage, (page + 1) * maximumPerksPerPage).map(
                (pId) => {
                    let purchase = chain.requestPurchase(pId);
                    return purchase.purchaseGroup === undefined ?
                        <PurchaseSummary chain={chain} purchaseId={pId} key={`chrono${pId}`} /> :
                        (groups[purchase.characterId][purchase.purchaseGroup] == pId ?
                            <PurchaseGroupCard chain={chain} charId={purchase.characterId} pgId={purchase.purchaseGroup}
                                rerender={() => { }}
                                summary={true} />
                            : []
                        )
                }
            )}
        </div>;
    } else {
        let mergedResults = mergeQueryResultsByTag(chain, searchResults, searchQuery.term);
        numResults = Object.keys(mergedResults).length;
        numPages = Math.ceil(numResults / maximumTagsPerPage);

        resultsDisplay = <div className="vspaced hover-container-alt" key={`${suppId}_results1`}>
            <FloatingButtonRow buttons={[{
                onClick: () => { setAutoexpandTags(!autoexpandTags); },
                icon: autoexpandTags ? "collapse" : "expand"
            }]}
                position={Direction.OffTopRight}
                color={IconColor.Light}
                size={IconSize.Small}
                hoverAlt
            />
            {Object.keys(mergedResults).slice(page * maximumTagsPerPage, (page + 1) * maximumTagsPerPage).map((tag) => (
                <Collapsable clickable
                    head={
                        <div className="bold center-text-align faint-highlight compact-cell medium-highlight-h">
                            {tag || "Untagged"} [{mergedResults[tag].length} Purchase{mergedResults[tag].length > 1 ? "s" : ""}]
                        </div>
                    }
                    body={
                        <div className="big-margin-right big-margin-left" style={{ paddingBottom: "0.5rem" }}>
                            <PurchaseMiniDisplay maxPageSize={maximumPerksPerTag} items={mergedResults[tag]} chain={chain} keyPrefix={tag} />
                        </div>
                    }
                    key={`${tag}_container_${autoexpandTags}`}
                    default={autoexpandTags}
                    openClass="light-shade vspaced subtle-rounded mild-outline"
                />
            ))}
        </div>;
    }


    if (page >= numPages && page != 0)
        setPage(Math.min(numPages - 1, 0));

    let sharedClasses = "roomy-cell subtle-rounded hspaced clickable bold";
    let activeClasses = "active-navlink medium-highlight mild-outline";
    let inactiveClasses = "inactive-navlink text-highlight-h mild-outline-h faint-highlight-h";

    let pageSelect = (
        <div className="spanning vcentered center-text-align">
            {numPages > 1 ? <>
                <span className={`${sharedClasses} ${inactiveClasses}`} onClick={() => setPage(Math.max(page - 1, 0))} >←</span>
                {[...Array(numPages).keys()].map((p) =>
                    <span className={`${sharedClasses} ${page == p ? activeClasses : inactiveClasses}`} onClick={() => setPage(p)} key={`${p}_page_select`}>
                        {p + 1}
                    </span>
                )}
                <span className={`${sharedClasses} ${inactiveClasses}`} onClick={() => setPage(Math.min(page + 1, numPages - 1))}>→</span></> : []
            }
            {modeSelect}
        </div>
    );

    return <React.Fragment key={suppId + "-Supp"}>
        <div className="roomy-cell bright-highlight subtle-rounded vspaced vcentered" style={{ rowGap: "0.2rem" }}>
            {searchBar}
            {categorySelect}
        </div>
        <div key={suppId + "-Supp"}>
            {numResults > 0 ? <>
                {pageSelect}
                {resultsDisplay}
                {pageSelect}
            </> : noResultsFound}
        </div>
    </React.Fragment>

}