import { ActionFunctionArgs, redirect, TypedResponse } from "@remix-run/node";
import { Form, useFetcher, useLoaderData, useNavigate, useNavigation, useOutletContext, useSubmit } from "@remix-run/react";
import { nanoid } from "nanoid";
import { createRef, MutableRefObject, ReactNode, useEffect, useState } from "react"
import { toast } from "react-toastify";
import CheckBox from "~/components/Checkbox";
import Chain from "~/jumpchain/Chain";
import ChainSupplement, { CompanionAccess } from "~/jumpchain/ChainSupplement";
import Character from "~/jumpchain/Character";
import { exportChainFragment } from "~/jumpchain/ImportExport";
import importV1Chain from "~/jumpchain/ImportV1";
import Jump from "~/jumpchain/Jump";
import { PurchaseType } from "~/jumpchain/Purchase";
import { IpcAPI, LoaderFunctionArgs } from "~/loaderContextType";

export const meta = () => {
    return [{ title: `ChainMaker | Jumpchain Character Sheet` }];
};

export async function loader({ context }: LoaderFunctionArgs) {
    return context?.chain || "";
}

export const newChain = (body: FormData) => {
    let title = String(body.get("title"));
    let jumper = String(body.get("jumper"));
    let jumpName = String(body.get("jump"));
    let jumpURL = String(body.get("jumpURL"));
    let warehouseMod = !!Number(body.get("warehouseMod"));
    let bodyMod = !!Number(body.get("bodyMod"));

    let chain = new Chain();
    chain.name = title;
    let j = new Jump(chain);
    j.name = jumpName;
    if (jumpURL.length)
        j.url = jumpURL
    let c = new Character(chain);
    c.primary = true;
    c.name = jumper;

    chain.purchaseCategories[PurchaseType.Perk] = {
        0: "Physical",
        1: "Mental",
        2: "Social",
        3: "Magical",
        4: "Spiritual",
        5: "Skill",
        6: "Crafting",
        7: "Technological",
        8: "Luck",
        9: "Other",
        10: "Meta"
    }

    chain.purchaseCategories[PurchaseType.Item] = {
        0: "Weapons",
        1: "Apparel",
        2: "Equipment",
        3: "Materials",
        4: "Food & Drugs",
        5: "Media",
        6: "Wealth",
        7: "Vehicles",
        8: "Tools",
        9: "Locales",
        10: "Creatures",
        11: "Businesses & Contacts",
        12: "Other"
    }

    if (warehouseMod) {
        let warehouseMod = new ChainSupplement(chain);
        warehouseMod.name = "Personal Reality";
        warehouseMod.itemLike = true;
        warehouseMod.url = "https://docs.google.com/document/d/1yewhouqLvhI9LyFuK6ihZ1JAVX8AvGYb7CDJ1CVihtY/view";
        warehouseMod.currency = "WP";
        warehouseMod.companionAccess = CompanionAccess.Unavailable;
        warehouseMod.perJumpStipend = 50;
        warehouseMod.initialStipend = 500;
        warehouseMod.investmentRatio = 4;
        warehouseMod.maxInvestment = 1000;
        warehouseMod.purchaseCategories = {
            0: "Basics",
            1: "Utilities & Structures",
            2: "Cosmetic Upgrades",
            3: "Facilities",
            4: "Extensions",
            5: "Items & Equipment",
            6: "Companions",
            7: "Miscellaneous",
            8: "Limitations"
        }
    }

    if (bodyMod) {
        let bodyModSupp = new ChainSupplement(chain);
        bodyModSupp.name = "Body Mod";
        bodyModSupp.itemLike = false;
        bodyModSupp.url = "https://drive.google.com/file/d/1V9bPZTOgQ4VS9YJiEwEkabaX4GHzyiRf/view";
        bodyModSupp.currency = "EP";
        bodyModSupp.perJumpStipend = 0;
        bodyModSupp.initialStipend = 100;
        bodyModSupp.investmentRatio = 100;
        bodyModSupp.maxInvestment = 100;
        bodyModSupp.purchaseCategories = {
            0: "Basic",
            1: "Essence",
            2: "Physical",
            3: "Mental",
            4: "Spiritual",
            5: "Skill",
            6: "Supernatural",
            7: "Item",
            8: "Companion",
            9: "Drawback"
        }
    }
    return chain;
}

export default function Index() {

    let [useReality, setUseReality] = useState<boolean>(true);
    let [useBodyMod, setUseBodyMod] = useState<boolean>(true);
    let [currentTab, setTab] = useState<"new" | "migrate" | "importing" | undefined>(undefined);
    let [, setLocalChain] = useState(false);

    const loaderData = useLoaderData<typeof loader>();

    useEffect(() => {
        if (loaderData)
            navigate("/chain/0")
    }
        , []);

    let formRef = createRef<HTMLFormElement>();
    let jsonImportFetcher = useFetcher();
    let localMigrationFetcher = useFetcher();

    let navigate = useNavigate();
    let navigation = useNavigation();

    useEffect(() => {
        if (localStorage.getItem("chainDump") && localStorage.getItem("unusedID")) {
            setLocalChain(true);
        }
    }, [])

    useEffect(() => {
        if (localMigrationFetcher.state == "loading") {
            localStorage.removeItem("chainDump");
            localStorage.removeItem("unusedID");
        }
    }, [localMigrationFetcher.data, localMigrationFetcher.state])

    let openTab: ReactNode;
    if (currentTab == "new") {
        openTab =
            <div className="extra-roomy-cell mild-outline rounded-rect neutral-highlight vspaced-big">
                <div className="logo-text vspaced center-text-align">Create New Chain</div>
                <div className="right-weighted-column extra-roomy-cell">
                    <Form className="container" action="/api/new" ref={formRef} method="POST" onSubmit={(e) => {
                        let formData = new FormData(formRef.current);
                        let object = {};
                        formData.forEach((value, key) => object[key] = value);
                        (window as unknown as { api: IpcAPI }).api.requestNew(object);
                        e.preventDefault();
                    }}>
                        <span className="bold vcentered right-align-self">Chain Name:</span> <input className="compact-cell" defaultValue="[untitled chain]" autoFocus name="title" />
                        <span className="bold vcentered right-align-self">Jumper Name:</span> <input className="compact-cell vspaced" defaultValue="Jumper" name="jumper" />
                        <span className="bold vcentered right-align-self">Name of First Jump:</span> <input className="compact-cell" defaultValue="[untitled jump]" name="jump" />
                        <span className="bold vcentered right-align-self">Jumpdoc URL:</span> <input className="compact-cell vspaced" defaultValue="" placeholder="optional" name="jumpURL" />
                        <div className="vcentered center-text-align row clickable" onClick={() => setUseReality((a) => !a)}>
                            <span className="right-align-self"><CheckBox name={"warehouseMod"} value={useReality} /></span>
                            <span className="roomy-cell vcentered" >Use&nbsp;
                                <a className="text-highlight underline-h" href="https://docs.google.com/document/d/1yewhouqLvhI9LyFuK6ihZ1JAVX8AvGYb7CDJ1CVihtY/view" target="_blank" onClick={(e) => { e.stopPropagation(); }}> Personal Reality Supplement</a></span>
                        </div>
                        <div className="vcentered center-text-align clickable row" onClick={() => setUseBodyMod((a) => !a)}>
                            <span className="right-align-self"><CheckBox name={"bodyMod"} value={useBodyMod} /></span>
                            <span className="roomy-cell vcentered" >Use&nbsp;
                                <a className="text-highlight underline-h" href="https://drive.google.com/file/d/1V9bPZTOgQ4VS9YJiEwEkabaX4GHzyiRf/view" target="_blank" onClick={(e) => { e.stopPropagation(); }}> Essential Body Mod</a></span>
                        </div>
                        <div></div>
                        <input type="submit" value="Create!" className="clickable roomy-cell subtle-rounded mild-outline center-text-align medium-highlight"
                        />
                    </Form>
                </div>

            </div>
    } else {
        openTab = [];
    }

    return <><span className="logo-text logo-highlight extra-roomy-cell rounded-rect mild-outline vspaced"
        style={{ alignSelf: "center", boxShadow: "none", marginTop: "6rem" }}
    >
        ChainMaker
    </span>
        <div style={{ alignSelf: "center", maxWidth: "45rem" }} className="large-text extra-roomy-cell">
            {navigation.state != "idle" ?
                <div className="hcenter-down">
                    <div className="big-square loader" style={{ alignSelf: "center" }} />
                </div> :
                <>
                    <div className="flex-even">
                        <div className={`margin-right extra-roomy-cell big-square ${currentTab == "new" ? "heavy-medium" : "faint-text mild"}-outline rounded-rect neutral-highlight clickable`}
                            onClick={() => setTab((tab) => tab == "new" ? undefined : "new")}
                        >
                            <img src="/icons/multiple-pages-plus.svg" className="icon-light-no-h" />
                            New
                        </div>
                        <div className="margin-left extra-roomy-cell big-square mild-outline rounded-rect neutral-highlight clickable faint-text"
                            onClick={async () => {
                                (window as unknown as { api: IpcAPI }).api.requestOpen();
                            }}
                        >
                            {jsonImportFetcher.state == "idle" ? <img src="/icons/upload.svg" className="icon-light-no-h" /> :
                                <div className="loader" />
                            }
                            Open
                        </div>
                    </div>
                    <div className="hcenter-down">
                        {openTab}
                    </div></>}

        </div>
    </>


}