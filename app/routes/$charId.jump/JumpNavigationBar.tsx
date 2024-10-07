import { NavLink, useParams } from "@remix-run/react";
import { FunctionComponent, ReactNode } from "react";
import Chain from "~/jumpchain/Chain";
import { CompanionAccess } from "~/jumpchain/ChainSupplement";
import { PurchaseType } from "~/jumpchain/Purchase";

const NavItem: FunctionComponent<{ text: string, address: string }> = ({ text, address }) => {
    let sharedClasses = "roomy-cell subtle-rounded hspaced clickable";
    let activeClasses = "active-navlink medium-highlight mild-outline";
    let inactiveClasses = "inactive-navlink text-highlight-h mild-outline-h faint-highlight-h";
    return (<NavLink end className={({ isActive }) => `${sharedClasses} ${isActive ? activeClasses : inactiveClasses}`}
        to={address}>
        <span className="def out-of-flow center-text-align" style={{ left: 0, right: 0 }}>{text}</span>
        <span className="alternate bold">{text}</span>
    </NavLink>);
}

const Component: FunctionComponent<{ chain: Chain, jumperId: number, jumpId: number }> = ({ chain, jumperId, jumpId }) => {

    let params = useParams();
    let chainId = params.chain!;

    let supplementNavs: ReactNode[] = [];

    let nextJumpIndex = chain.jumpList.findIndex((jId) => jumpId == jId);
    while (nextJumpIndex < chain.jumpList.length && (chain.jumpList[nextJumpIndex] == jumpId ||
        chain.jumps[chain.jumpList[nextJumpIndex]].parentJump == jumpId ||
        (
            chain.jumps[jumpId].parentJump !== undefined
            && chain.jumps[jumpId].parentJump >= 0
            && chain.jumps[jumpId].parentJump == chain.jumps[chain.jumpList[nextJumpIndex]].parentJump
        )))
        nextJumpIndex++;

    for (let chainSupplement of Object.values(chain.supplements)) {
        if (chain.characters[jumperId].primary || chainSupplement.companionAccess == CompanionAccess.Available
            || chainSupplement.companionAccess == CompanionAccess.Communal
            || (chainSupplement.companionAccess == CompanionAccess.Partial && chain.jumpList.some((jId, index) =>
                index < nextJumpIndex && (
                    chain.jumps[jId].supplementPurchases[jumperId]?.[chainSupplement.id]?.length > 0 ||
                    Array.from(chain.jumps[jId].characters).some(
                        (charId) => chain.jumps[jId].supplementPurchases[charId]?.[chainSupplement.id]?.some?.(pId =>
                            chain.purchases[pId].supplementImportData?.characters?.has?.(jumperId)
                        )
                    )
                )

            ))

        )
            supplementNavs.push(<NavItem
                text={chainSupplement.name}
                address={`/chain/${chainId}/${jumperId}/jump/${jumpId}/supp/${chainSupplement.id}`}
                key={`Supp${chainSupplement.id}`}
            />
            );
    }

    let subsystemNavs: ReactNode[] = [];
    let jump = chain.requestJump(jumpId);
    for (let stId of jump.listPurchaseSubtypes()) {
        let subtype = jump.purchaseSubtype(stId);
        if (subtype.subsystem)
            subsystemNavs.push(<NavItem
                text={subtype.name}
                address={`/chain/${chainId}/${jumperId}/jump/${jumpId}/subsystem/${stId}`}
                key={`Sub${stId}`}
            />)
    }

    let pureSupplement = !jump.useAltForms
        && !jump.useNarratives
        && !jump.originCategoryList.length
        && !Object.values(jump.notes).some(a => a.length != 0);


    return (<nav className="flex-left faint-text">
        {pureSupplement ? [] :
            <NavItem text="Setting & Origin" address={`/chain/${chainId}/${jumperId}/jump/${jumpId}`} />
        }
        <NavItem text="Perks & Items" address={`/chain/${chainId}/${jumperId}/jump/${jumpId}/purchases`} />
        <NavItem text="Companions" address={`/chain/${chainId}/${jumperId}/jump/${jumpId}/companions`} />
        <NavItem text="Drawbacks & Scenarios" address={`/chain/${chainId}/${jumperId}/jump/${jumpId}/drawbacks`} />
        {subsystemNavs}
        {jump.useSupplements ? supplementNavs : []}
        <NavItem text="Config" address={`/chain/${chainId}/${jumperId}/jump/${jumpId}/config`} />
    </nav>);

}

export default Component;