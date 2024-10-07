import { ActionFunctionArgs, TypedResponse } from "@remix-run/node";
import { Form, json, Link, MetaFunction, Outlet, useFetcher, useLoaderData, useLocation, useNavigate, useNavigation, useOutletContext, useParams, useSubmit } from "@remix-run/react";
import { createContext, createRef, FunctionComponent, MutableRefObject, ReactNode, useContext, useEffect, useRef, useState } from "react";
import { toast, ToastContainer, Zoom } from "react-toastify";
import CheckBox from "~/components/Checkbox";
import Multiselect from "~/components/Multiselect";
import Chain from "~/jumpchain/Chain";
import { exportChainFragment, importChain } from "~/jumpchain/ImportExport";
import { JumpExportParams } from "~/jumpchain/Jump";
import LayoutManager, { MarkupFragment, MarkupMode } from "~/jumpchain/LayoutManager";
import { GID, Id } from "~/jumpchain/Types";
import { IpcAPI, LoaderFunctionArgs } from "~/loaderContextType";
import { GlobalSettings } from "~/root";

export async function loader({ context }: LoaderFunctionArgs) {
    return { chainDump: context.chain, versionNumber: context.currentVersion };
}

export const meta: MetaFunction<typeof loader> = ({
    data,
}) => {
    return [{ title: `${JSON.parse(data.chainDump).name} | ChainMaker` }];
};

export type ClipboardData = {
    purchase: Object;
    key: string;
    originalJump: Id<GID.Jump>
};

export const rerenderTitleContext = createContext<() => void>(() => { });
export const purchaseClipboardContext = createContext<MutableRefObject<ClipboardData[]>>({ current: [] });

let ExportTextButton: FunctionComponent<{ chain: Chain, imperial: boolean, mode: MarkupMode, exportParams: JumpExportParams, target: ExportTarget, brevity: boolean }>
    = ({ chain, mode, exportParams, target, brevity, imperial }) => {
        let [file, setFile] = useState<File>(new File([""], ""));
        let [counter, setCounter] = useState(0);
        let aRef = createRef<HTMLAnchorElement>();

        let params = useParams();
        let actualCharId = Number(params.charId!);
        let jumpId = Number(params.jId);


        useEffect(() => {
            if (counter > 0) aRef.current?.click();
        }, [counter]);

        return <>
            <a href={URL.createObjectURL(file)} download={file.name} ref={aRef} />
            <input type="submit" className="spanning clickable roomy-cell subtle-rounded mild-outline center-text-align medium-highlight" value={"Export"}
                onClick={
                    () => {
                        let layout = new LayoutManager();
                        layout.markupMode = mode;
                        layout.abbreviate = brevity;
                        let fileName: string = "";
                        let body: MarkupFragment = [];
                        switch (target) {
                            case ExportTarget.CurrentJump:
                                fileName = `${chain.jumps[jumpId].name} [${chain.characters[actualCharId].name || "Character"}]`;
                                body = chain.requestJump(jumpId).exportForDisplay(actualCharId, exportParams, imperial);
                                break;
                            case ExportTarget.AllJumps:
                                fileName = `${chain.characters[actualCharId].name || "Character"}'s Journey`;
                                body = chain.jumpList.filter(jId => chain.jumps[jId].characters.has(actualCharId)).map((jId) => [
                                    chain.requestJump(jId).exportForDisplay(actualCharId, exportParams, imperial),
                                    { hrule: true }
                                ]);
                                break;
                            case ExportTarget.CharacterSummary:
                                break;
                        }

                        fileName = fileName.replace(/[^-._~\/\?#\[\]@!$&'\(\)\*\+,;=a-zA-Z0-9 ]/g, '_') + (layout.markupMode == MarkupMode.HTML) ? ".html" : ".txt";
                        setFile(new File([layout.exportFragment(body)], fileName));
                        setCounter((x) => { return x + 1 });
                    }
                } />
        </>
    }

enum ExportTarget {
    CurrentJump,
    AllJumps,
    CharacterSummary
}

export default function Index() {

    const navigate = useNavigate();
    const loadIndicator = useNavigation();
    const location = useLocation();

    let loaded = useRef(false);

    let clipboardData = useRef<ClipboardData[]>([]);

    const [settings, setSettings] = useState<GlobalSettings>({ autosave: true, theme: "blue", fontSize: 1, imperialUnits: true, compact: false });

    const rerender = useOutletContext<() => void>();

    useEffect(() => {
        if (localStorage.getItem("settings"))
            setSettings(JSON.parse(localStorage.getItem("settings")!));
        else {
            setSettings({ ...settings, theme: window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)') ? "neon" : "blue" });
        }
        loaded.current = true;
    }, [localStorage.getItem("settings")]);

    const [chain, setChain] = useState<Chain | undefined>();
    const [currentOverlay, setCurrentOverlay] = useState<"save" | "export" | "settings" | undefined>(undefined);
    const [exportParams, setExportParams] = useState<{ mode: MarkupMode, params: JumpExportParams }>({ mode: MarkupMode.HTML, params: {} });
    const [brevity, setBrevity] = useState(false);
    const [singleJumpExport, setSingleJumpExport] = useState(true);
    const loaderData = useLoaderData<typeof loader>();
    let params = useParams();
    let chainId = params.chain!;
    let actualCharId = params.charId;
    let jumpId = params.jId;

    useEffect(() => {
        if (location.pathname !== '/' && location.pathname.slice(-1)[0] === '/') {
            navigate(`${location.pathname.slice(0, -1)}${location.search}${location.hash}`, { state: location.state, replace: true });
        }
    }, [location]);

    // useEffect(() => {
    //     try {
    //         (async () => {
    //             if (!chainSource.current) {
    //                 navigate("/");
    //             }
    //             if (chainSource.current instanceof FileSystemFileHandle) {
    //                 if ((await chainSource.current!.queryPermission({ mode: "read" })) !== "granted" &&
    //                     (await chainSource.current!.requestPermission({ mode: "read" })) !== "granted") {
    //                     toast.error("Missing permissions to save at this location.", {
    //                         position: "top-center",
    //                         autoClose: 7000,
    //                         hideProgressBar: true,
    //                     });
    //                     return;
    //                 }
    //                 const chain = JSON.parse(await (await chainSource.current!.getFile()).text());
    //                 setChain(importChain(chain));
    //             }
    //             if (chainSource.current instanceof Chain) {
    //                 setChain(chainSource.current);
    //             }
    //         })();
    //     } catch (e) {
    //         if ((e instanceof Error)) {
    //             toast.error(e.message, {
    //                 position: "top-center",
    //                 autoClose: 7000,
    //                 hideProgressBar: true,
    //             });
    //         }
    //     }
    // }, [chainId]);


    useEffect(() => {
        if (!loaderData) return;
        let rawChain = JSON.parse(loaderData.chainDump);
        setChain(importChain(rawChain));
        navigate(`/chain/${(+chainId) + 1}`);
    }, [loaderData.versionNumber]);

    useEffect(() => {
        if (!chain) return;
        let ipcApi = (window as unknown as { api: IpcAPI }).api;
        ipcApi.onChainRequest(
            () => {
                ipcApi.updateChain(exportChainFragment(chain));
                chain.manager.updates = [];
            }
        );
    }, [chain])

    useEffect(() => {
        let ipcApi = (window as unknown as { api: IpcAPI }).api;
        ipcApi.onRequestExport(
            () => {
                if (params.charId) {
                    setCurrentOverlay("export");
                }
            }
        );
    }, [actualCharId === undefined])

    // useEffect(() => {
    //     if (!chain || !settings.autosave) return;
    //     let s = setInterval(() => {
    //         save(false, true);
    //     }, 60000);
    //     return () => {
    //         clearInterval(s);
    //     }
    // }, [settings.autosave]);

    if (!chain) {
        return <></>;
    }

    let charId = Number(params.charId || (chain && chain.characterList[0]));

    let openMenu = <div className="right-weighted-column" >
        {actualCharId === undefined ? [] : <>
            <div className="spanning compact-cell">
                <div className="center-text-align large-text bold extra-roomy-cell">Export For Display</div>
            </div>
            <div className="horizontally-roomy spanning">
                <Multiselect name={"target"} options={jumpId ? {
                    [ExportTarget.AllJumps]: { name: "All Jumps" },
                    [ExportTarget.CurrentJump]: { name: "Current Jump" }
                } : {
                    [ExportTarget.AllJumps]: { name: "All Jumps" },
                }} value={jumpId && chain.requestJump(Number(jumpId)).characters.has(charId) ? {
                    [ExportTarget.AllJumps]: !singleJumpExport,
                    [ExportTarget.CurrentJump]: singleJumpExport
                } : {
                    [ExportTarget.AllJumps]: true,
                }}
                    onChange={(data) => {
                        setSingleJumpExport(!data[ExportTarget.AllJumps])
                    }}
                    width="100%"
                    single />
            </div>
            <div className="horizontally-roomy spanning">
                <Multiselect name={"brevity"} options={{
                    0: { name: "Abbreviated" },
                    1: { name: "Verbose" },
                }} value={{
                    0: brevity,
                    1: !brevity,
                }}
                    width="100%"
                    single
                    onChange={(data) =>
                        setBrevity(!!data[0])
                    }
                />
            </div>
            <div className="horizontally-roomy spanning">
                <Multiselect name={"format"} options={{
                    [MarkupMode.BBCode]: { name: "BBCode" },
                    [MarkupMode.Markdown]: { name: "Reddit" },
                    [MarkupMode.HTML]: { name: "HTML" },
                    [MarkupMode.Plaintext]: { name: "Plaintext" },
                }} value={{
                    [MarkupMode.BBCode]: exportParams.mode == MarkupMode.BBCode,
                    [MarkupMode.Markdown]: exportParams.mode == MarkupMode.Markdown,
                    [MarkupMode.HTML]: exportParams.mode == MarkupMode.HTML,
                    [MarkupMode.Plaintext]: exportParams.mode == MarkupMode.Plaintext
                }} title="Format"
                    width="100%"
                    single
                    onChange={(data) =>
                        setExportParams((p) => { return { params: p.params, mode: Number(Object.keys(data).find(key => !!data[key])) }; })}
                />
            </div>
            <div className="vspaced-half-big spanning center-text-align bold">Optional Components:</div>
            <div className="row clickable" onClick={() => {
                setExportParams((p) => {
                    return { mode: p.mode, params: { ...p.params, listAltForms: !p.params.listAltForms } };
                });
            }}
                style={
                    chain.chainSettings.altForms ?
                        {} : { display: "none" }
                }>

                <span className="right-align-self">
                    <CheckBox
                        name={"altformExport"}
                        value={!!exportParams.params.listAltForms}
                        onChange={(data) => { setExportParams((p) => { return { mode: p.mode, params: { ...p.params, listAltForms: data } }; }); return undefined; }}
                    />
                </span>
                <span className={exportParams.params.listAltForms ? "" : "faint-text"}>Alt-Forms</span>
            </div>
            <div className="row clickable" onClick={() => {
                setExportParams((p) => {
                    return { mode: p.mode, params: { ...p.params, listNarrative: !p.params.listNarrative } };
                });
            }}
                style={
                    chain.chainSettings.narratives == "enabled" ||
                        (chain.characters[charId].primary && chain.chainSettings.narratives == "restricted") ?
                        {} : { display: "none" }
                }>
                <span className="right-align-self">
                    <CheckBox
                        name={"narrativesExport"}
                        value={!!exportParams.params.listNarrative}
                    />
                </span>
                <span className={exportParams.params.listNarrative ? "" : "faint-text"}>Narratives</span>
            </div>
            <div className="row clickable" onClick={() => {
                setExportParams((p) => {
                    return { mode: p.mode, params: { ...p.params, listChainDrawbacks: !p.params.listChainDrawbacks } };
                });
            }}>

                <span className="right-align-self">
                    <CheckBox
                        name={"chainDrawbackExport"}
                        value={!!exportParams.params.listChainDrawbacks}
                    />
                </span>
                <span className={exportParams.params.listChainDrawbacks ? "" : "faint-text"}>Chain Drawbacks</span>
            </div>
            <div className="row clickable" onClick={() => {
                setExportParams((p) => {
                    return { mode: p.mode, params: { ...p.params, listSupplementPurchases: !p.params.listSupplementPurchases } };
                });
            }}>
                <span className="right-align-self">
                    <CheckBox
                        name={"chainSupplementExport"}
                        value={!!exportParams.params.listSupplementPurchases}
                    />
                </span>
                <span className={exportParams.params.listSupplementPurchases ? "" : "faint-text"}>Chain Supplements</span>
            </div>
            <div className="spanning roomy-cell" style={{ marginTop: "0.5rem" }}>
                <ExportTextButton
                    chain={chain}
                    mode={exportParams.mode}
                    exportParams={exportParams.params}
                    brevity={brevity}
                    imperial={settings.imperialUnits}
                    target={singleJumpExport ? ExportTarget.CurrentJump : ExportTarget.AllJumps}
                />
            </div></>}
    </div>;

    return !loaded.current ? [] : (<>
        {chain ? <rerenderTitleContext.Provider value={rerender}>
            <purchaseClipboardContext.Provider value={clipboardData}>
                {currentOverlay ? <div className="full-overlay" style={{ zIndex: 100 }}>
                    <div className="full-overlay medium-highlight" style={{ opacity: 0.4 }} onClick={() => setCurrentOverlay(undefined)} />
                    <div className="light-shade bright-outline overlay extra-roomy-cell subtle-rounded" style={{ minWidth: "300px" }}>
                        {openMenu}
                    </div> : []
                </div> : []}
                <header className="bottom-hrule flex-left neutral-highlight">

                    <Link to={`/chain/${chainId}/${charId}/jump/${chain.jumpList[0]}`} className={`tall-cell horizontally-roomy vcentered clickable neutral-button ${location.pathname.includes("jump") ? "active-button" : ""}`}>
                        Jump Itinerary
                    </Link>
                    <Link to={`/chain/${chainId}/${charId}/summary`} className={`tall-cell horizontally-roomy vcentered clickable neutral-button ${location.pathname.includes("summary") ? "active-button" : ""}`}>
                        Traveler Manifest
                    </Link>
                    <Link to={`/chain/${chainId}/${charId}/items`}
                        className={`tall-cell horizontally-roomy vcentered clickable neutral-button ${location.pathname.includes("items") ? "active-button" : ""}`}>
                        Cosmic Cache
                    </Link>
                    <Link to={`/chain/${chainId}/config`}
                        className={`tall-cell horizontally-roomy vcentered clickable neutral-button ${!location.pathname.includes("jump") && location.pathname.includes("config") ? "active-button" : ""}`}>
                        Chain Settings
                    </Link>


                </header>
                <Outlet context={chain} />
                {
                    loadIndicator.state == "loading" ?
                        < div style={{ position: "fixed", left: "0", right: "0", top: "0", height: "6px" }} className="bright-highlight stretch-loader" />
                        : []
                }
            </purchaseClipboardContext.Provider>
        </rerenderTitleContext.Provider >
            : []

        }</>
    );
}
