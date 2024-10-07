import { FunctionComponent, useContext, useEffect, useRef, useState } from "react";
import EditableContainer, { EditableComponentProps } from "../EditableContainer";
import Collapsable from "../Collapsable";
import FloatingButtonRow, { Direction, IconColor, IconSize } from "../FloatingButton";
import Multiselect, { SelectOption } from "../Multiselect";
import TextareaAutosize from 'react-textarea-autosize';
import { GID, Id, LID } from "~/jumpchain/Types";
import Chain from "~/jumpchain/Chain";
import { FetcherWithComponents, Link, useFetcher, useParams } from "@remix-run/react";
import AltForm, { convertLength, convertWeight, displayLength, displayWeight, Length, lengthConversion, LengthUnit, Weight, weightConversion, WeightUnit } from "~/jumpchain/AltForm";
import { Action } from "~/jumpchain/DataManager";
import { toast } from "react-toastify";
import { ActionFunctionArgs, TypedResponse } from "@remix-run/node";
import { GlobalSettings } from "~/root";

export const AltFormCardView: FunctionComponent<EditableComponentProps<AltForm>
    & { rerender: () => void, essential?: boolean, showLink?: boolean, title?: string, loading: boolean }> = (p) => {

        let loaded = useRef(false);
        const [settings, setSettings] = useState<GlobalSettings>({ autosave: true, theme: "blue", fontSize: 1, imperialUnits: true, compact: false });

        useEffect(() => {
            if (localStorage.getItem("settings"))
                setSettings(JSON.parse(localStorage.getItem("settings")!));
            else {
                setSettings({ ...settings, theme: window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)') ? "neon" : "blue" });
            }
            loaded.current = true;
        }, []);
        let imperial = settings.imperialUnits;

        let params = useParams();
        let chainId = params.chain!;

        let chain = p.data.chain;

        let altMode = !p.data.physicalDescription && !p.data.capabilities && !!p.data.imageURL;
        let imageDisplay =
            p.data.imageURL ?
                <div className="spanning center-text-align vcentered">
                    {!p.loading ?
                        <a href={p.data.imageURL} target="_blank">
                            <img src={p.data.imageURL} className="rounded-rect" referrerPolicy="no-referrer" style={{ maxWidth: "100%", height: "20rem", objectFit: "cover" }} />
                        </a>
                        :
                        <div className="loader medium-square" />
                    }

                </div>
                : []
            ;

        let personalPhysiquePlaceholder = "What does this form look like? What color are it's eyes? It it tall or short? Young or old? Skinny or not?";
        let capabilitiesPlaceholder = "What makes this form special on a practical level? What can it do or not do, relative to other forms? How fast does it age?";

        let head = (<div className=
            {`medium-highlight bold center-text-align compact-cell spanning`}>
            {p.title || `${p.data.name} [${p.data.species ? p.data.species + " Form" : "unknown species"}]`}
        </div>);

        let body = <div className="spanning space-evenly roomy-cell">
            <FloatingButtonRow
                buttons={[
                    ...(!p.essential ? [({
                        onClick: (e: React.MouseEvent<HTMLElement>) => {
                            if (window.confirm("Are you sure you want to delete? This cannot be undone.")) {
                                chain.deregisterAltform(p.data.id); p.rerender();
                            } else {
                                e.stopPropagation();
                            }
                        }, icon: "trash"
                    })] : []),
                    { onClick: () => p.setActive!(true), icon: "pencil" }
                ]}
                color={IconColor.Light}
                size={IconSize.Small}
                position={Direction.TopRight}
                hover
            />

            <div className="space-evenly" style={altMode? {gridTemplateRows: "min-content auto"} : {}}>
                <div className="right-weighted-column roomy-cell" style={{ height: "fit-content" }}>
                    <span className="right-align-self bold">Name: </span> <span>{p.data.name || "[unnamed form]"}</span>
                    <span className="right-align-self bold">Sex: </span> <span>{p.data.sex || "[unknown sex]"}</span>
                    <span className="right-align-self bold">Species: </span> <span>{p.data.species || "[unknown species]"}</span>

                </div>
                <div className="right-weighted-column roomy-cell" style={{ height: "fit-content" }}>
                    <div className="no-mobile">&nbsp;</div><div className="no-mobile"></div>
                    <span className="right-align-self bold">Height: </span>
                    <span>{displayLength(p.data.height, imperial)}</span>
                    <span className="right-align-self bold">Weight: </span> <span>{displayWeight(p.data.weight, imperial)}</span>
                </div>
                {p.showLink ?
                    <div className="spanning faint-text small-text italic center-text-align" >
                        <span className="bold">From: </span><Link to={`/chain/${chainId}/${p.data.characterId}/jump/${p.data.jumpId}`} className="underline-h"> {chain.jumps[p.data.jumpId!].name || "[untitled jump]"} </Link>
                    </div>
                    : []}
                {!altMode ?
                    imageDisplay
                    : []
                }
            </div>
            <div>
                {!altMode ? <>
                    <div className="user-whitespace extra-big-margin-right"><span className="bold">Personal Physique:</span> <span
                        className={`${p.data.physicalDescription ? "" : "very-"}faint-text`}> {p.data.physicalDescription || personalPhysiquePlaceholder}</span></div>
                    <div className="user-whitespace vspaced"><span className="bold">Capabilities & Limitations:</span> <span
                        className={`${p.data.capabilities ? "" : "very-"}faint-text`}>{p.data.capabilities || capabilitiesPlaceholder}</span></div>
                </>
                    : imageDisplay
                }
            </div>
        </div >;

        return (
            <Collapsable
                head={head}
                body={body}
                class="subtle-rounded light-shade center-text vcentered medium-outline vspaced extra-big-margin-left extra-big-margin-right hover-container"
                default={true}
                clickable
                key={p.data.id + "view"}
            />
        )

    }

enum ImageMode {
    External,
    Upload,
    AlreadyUploaded,
    None
}

export const AltFormCardEdit: FunctionComponent<EditableComponentProps<AltForm>
    & { submit: () => void, rerender: () => void, essential?: boolean, showLink?: boolean, title?: string }> = (p) => {

        let loaded = useRef(false);
        const [settings, setSettings] = useState<GlobalSettings>({ autosave: true, theme: "blue", fontSize: 1, imperialUnits: true, compact: false });

        useEffect(() => {
            if (localStorage.getItem("settings"))
                setSettings(JSON.parse(localStorage.getItem("settings")!));
            else {
                setSettings({ ...settings, theme: window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)') ? "neon" : "blue" });
            }
            loaded.current = true;
        }, []);

        let chain = p.data.chain;
        let imperial = settings.imperialUnits;
        let params = useParams();
        let chainId = params.chain!;

        let [imageMode, setImageMode] = useState<ImageMode>(p.data.imageUploaded ? ImageMode.AlreadyUploaded
            : p.data.imageURL ? ImageMode.External : ImageMode.None);

        let convertedLength = convertLength(p.data.height, imperial);
        let convertedWeight = convertWeight(p.data.weight, imperial);

        let [height, setHeight] = useState(convertedLength);
        let [weight, setWeight] = useState(convertedWeight);
        let heightRef = useRef<HTMLInputElement>(null);
        let weightRef = useRef<HTMLInputElement>(null);

        if ([WeightUnit.Pounds, WeightUnit.Tons].includes(weight.unit) != imperial) {
            setHeight(convertLength(height, imperial));
            setWeight(convertWeight(weight, imperial));
            return <></>;
        }

        useEffect(() => {
            if (!heightRef.current || !weightRef.current) return;
            heightRef.current!.value = String(height.value);
            weightRef.current!.value = String(weight.value);
        }
            , [imperial]);

        let imageSelect;

        switch (imageMode) {
            case ImageMode.External:
                imageSelect = <>
                    <input name="url" className="roomy-cell" style={{ width: "8rem" }}
                        defaultValue={!p.data.imageURL ? "" :
                            !p.data.imageURL.includes("http") ? "" :
                                p.data.imageURL
                        }
                        placeholder="URL"
                        autoComplete="off" />
                    <div
                        className="vcentered center-text-align margin-left clickable subtle-rounded"
                        style={{ display: "inline-flex" }}
                        onClick={() => setImageMode(ImageMode.None)}>
                        <img className="icon-small icon-light" src="/icons/xmark.svg" />
                    </div>
                </>
                break;
            case ImageMode.AlreadyUploaded:
                imageSelect = <>
                    <span className="roomy-cell faint-text bold vcentered">Uploaded</span>
                    <div
                        className="vcentered center-text-align margin-left clickable subtle-rounded"
                        style={{ display: "inline-flex" }}
                        onClick={() => setImageMode(ImageMode.None)}>
                        <img className="icon-small icon-light" src="/icons/xmark.svg" />
                    </div>
                </>;
                break;

            case ImageMode.Upload:
                imageSelect = <>
                    <span className="roomy-cell faint-text bold vcentered">Ready To Upload</span>
                    <div
                        className="vcentered center-text-align margin-left clickable subtle-rounded"
                        style={{ display: "inline-flex" }}
                        onClick={() => setImageMode(ImageMode.None)}>
                        <img className="icon-small icon-light" src="/icons/xmark.svg" />
                    </div>
                </>;
                break;
            case ImageMode.None:
                imageSelect = <div className="vcentered center-text-align neutral-highlight-transparent mild-outline clickable subtle-rounded">
                    <div
                        className="right-align-self roomy-cell clickable subtle-rounded medium right-vrule text-highlight-h image-highlight-h"
                        style={{ display: "inline-flex" }}
                        onClick={() => setImageMode(ImageMode.External)}>
                        Link
                        <img className="icon-small margin-left" src="/icons/internet.svg" />
                    </div>

                    <label
                        htmlFor="file-upload"
                        className="right-align-self roomy-cell clickable subtle-rounded text-highlight-h image-highlight-h"
                        style={{ display: "inline-flex" }}>
                        Upload
                        <img className="icon-small" src="/icons/download.svg" />
                    </label>
                </div>;
                break;
        }

        let head = (<div className=
            {`medium-highlight bold center-text-align compact-cell spanning`}>
            {p.title || `${p.data.name} [${p.data.species ? p.data.species + " Form" : "unknown species"}]`}
        </div>);

        let body = <div className="spanning right-weighted-column-no-mobile roomy-cell">
            <FloatingButtonRow
                buttons={[
                    { onClick: () => { p.setActive!(false); }, icon: "arrow-back" },
                    ...(!p.essential ? [({
                        onClick: (e: React.MouseEvent<HTMLElement>) => {
                            if (window.confirm("Are you sure you want to delete? This cannot be undone.")) {
                                chain.deregisterAltform(p.data.id); p.rerender();
                            } else {
                                e.stopPropagation();
                            }
                        }, icon: "trash"
                    })] : []),
                    { onClick: p.submit, icon: "floppy-disk" },
                ]}
                color={IconColor.Light}
                size={IconSize.Small}
                position={Direction.TopRight} />

            <div className="">
                <div className="right-weighted-column roomy-cell" style={{ height: "fit-content" }}>
                    <span className="right-align-self bold">Name: </span> <span><input name="name" autoFocus className="compact-cell"
                        defaultValue={p.data.name} autoComplete="off" /></span>
                    <span className="right-align-self bold">Sex: </span> <span><input name="sex" className="compact-cell"
                        defaultValue={p.data.sex} autoComplete="off" /></span>
                    <span className="right-align-self bold">Species: </span> <span><input name="species" className="compact-cell"
                        defaultValue={p.data.species} autoComplete="off" /></span>
                    <span>&nbsp;</span><span></span>
                    <span className="right-align-self bold vcentered">Height: </span>
                    <span className="vcentered">
                        <input type="number" step="1" name="heightValue"
                            style={{ width: "4.5rem" }}
                            defaultValue={height.value || 0}
                            ref={heightRef}
                            onChange={(e) => setHeight({ value: +e.currentTarget.value || 0, unit: height.unit })}
                            className="compact-cell big-margin-right"
                        />
                        <Multiselect name={"heightUnit"} key={`${imperial}-height`} options={!imperial ?
                            { [LengthUnit.Centimeters]: { name: "cm" }, [LengthUnit.Meters]: { name: "m" }, [LengthUnit.Kilometers]: { name: "km" } } :
                            { [LengthUnit.Inches]: { name: "in" }, [LengthUnit.Feet]: { name: "ft" }, [LengthUnit.Miles]: { name: "mi" } }}
                            value={!imperial ?
                                {
                                    [LengthUnit.Centimeters]: height.unit == LengthUnit.Centimeters,
                                    [LengthUnit.Meters]: height.unit == LengthUnit.Meters,
                                    [LengthUnit.Kilometers]: height.unit == LengthUnit.Kilometers
                                } :
                                {
                                    [LengthUnit.Inches]: height.unit == LengthUnit.Inches,
                                    [LengthUnit.Feet]: height.unit == LengthUnit.Feet,
                                    [LengthUnit.Miles]: height.unit == LengthUnit.Miles
                                }}
                            onChange={(data) => {
                                let newUnit = +Object.keys(data).find((id) => data[id])!;
                                let convertedLength = lengthConversion(height.value, height.unit, newUnit);
                                heightRef.current!.value = String(convertedLength);
                                setHeight({ unit: newUnit, value: convertedLength });
                            }}
                            className="right-align-self-no-mobile"
                            single inline />
                    </span>
                    <span className="right-align-self bold vcentered">Weight: </span>
                    <span className="vcentered">
                        <input type="number" step="1" name="weightValue"
                            style={{ width: "4.5rem" }}
                            defaultValue={weight.value}
                            className="compact-cell big-margin-right"
                            onChange={(e) => setWeight({ value: +e.currentTarget.value || 0, unit: weight.unit })}
                            ref={weightRef}
                        />
                        <Multiselect name={"weightUnit"} key={`${imperial}-weight`} options={!imperial ?
                            { [WeightUnit.Kilograms]: { name: "kg" }, [WeightUnit.Tonnes]: { name: "t" } } :
                            { [WeightUnit.Pounds]: { name: "lb." }, [WeightUnit.Tons]: { name: "T" } }}
                            value={!imperial ?
                                { [WeightUnit.Kilograms]: weight.unit == WeightUnit.Kilograms, [WeightUnit.Tonnes]: weight.unit == WeightUnit.Tonnes } :
                                { [WeightUnit.Pounds]: weight.unit == WeightUnit.Pounds, [WeightUnit.Tons]: weight.unit == WeightUnit.Tons }}
                            onChange={(data) => {
                                let newUnit = +Object.keys(data).find((id) => data[id])!;
                                let convertedWeight = weightConversion(weight.value || 0, weight.unit, newUnit);
                                weightRef.current!.value = String(convertedWeight);
                                setWeight({ unit: newUnit, value: convertedWeight });
                            }}
                            className="right-align-self-no-mobile"
                            single inline />
                    </span>
                    <span className="right-align-self bold vcentered">Image:</span>
                    <div className="vcentered">
                        {imageSelect}
                        <input name="imageMode" value={imageMode} type="hidden" />
                        <input id="file-upload"
                            type="file"
                            name="imageFile"
                            onChange={(e) => {
                                if (e.currentTarget.value)
                                    setImageMode(ImageMode.Upload);
                            }}
                        />
                    </div>
                </div>

                {p.showLink ?
                    <div className="spanning faint-text small-text italic center-text-align" >
                        <span className="bold">From: </span><Link to={`//chain/${chainId}/${p.data.characterId}/jump/${p.data.jumpId}`} className="underline-h"> {chain.jumps[p.data.jumpId!].name || "[untitled jump]"} </Link>
                    </div>
                    : []}

            </div>
            <div>
                <div className="extra-big-margin-right"><span className="bold">Personal Physique:</span> <span
                    className={``}>
                    <TextareaAutosize className="spanning compact-cell" name="description" defaultValue={p.data.physicalDescription} />
                </span></div>
                <div className="vspaced extra-big-margin-right"><span className="bold">Capabilities & Limitations:</span> <span
                    className={``}>
                    <TextareaAutosize className="spanning compact-cell" name="capabilities" defaultValue={p.data.capabilities} />
                </span></div>
            </div>
        </div >;

        return (!loaded.current ? [] :
            <div className="subtle-rounded ui-highlight center-text vcentered medium-outline vspaced extra-big-margin-left extra-big-margin-right hover-container">
                {head}
                {body}
            </div>
        );


    }

const AltFormCard: FunctionComponent<{
    chain: Chain, altFormId: Id<GID.AltForm>,
    essential?: boolean,
    rerender: () => void,
    showLink?: boolean,
    title?: string,
}>
    = ({ chain, altFormId, essential, rerender, showLink, title }) => {

        let params = useParams();
        let chainId = String(params.chain);
        let fetcher = useFetcher<(a: ActionFunctionArgs) => TypedResponse<{
            success?: string,
            error?: string;
        }>
        >();

        let [loading, setLoading] = useState(false);

        useEffect(
            () => {
                switch (fetcher.state) {
                    case "idle":
                        if (fetcher.data?.error) {
                            chain.altforms[altFormId].imageURL = undefined;
                            chain.altforms[altFormId].imageUploaded = false;
                            toast.error(fetcher.data.error, {
                                position: "top-center",
                                autoClose: 7000,
                                hideProgressBar: true,
                            });
                        }
                        setLoading(false);
                        break;
                    case "loading":
                    case "submitting":
                        setLoading(true);
                }

            }
            , [fetcher.data, fetcher.state]);

        const get = () => {
            return chain.altforms[altFormId];
        }

        const set = (formData: { [x: string]: any }) => {

            chain.pushUpdate({
                dataField: ["altforms", altFormId],
                action: Action.Update
            });
            let altForm = chain.altforms[altFormId];
            altForm.name = formData.name;
            altForm.sex = formData.sex;
            altForm.species = formData.species;
            altForm.physicalDescription = formData.description;
            altForm.capabilities = formData.capabilities;
            formData.heightUnit = JSON.parse(formData.heightUnit);
            formData.weightUnit = JSON.parse(formData.weightUnit);
            altForm.height = { value: formData.heightValue, unit: +Object.keys(formData.heightUnit).find((id) => formData.heightUnit[id])! };
            altForm.weight = { value: formData.weightValue, unit: +Object.keys(formData.weightUnit).find((id) => formData.weightUnit[id])! };
            switch (Number(formData.imageMode)) {
                case ImageMode.External:
                    altForm.imageURL = formData.url.length ? formData.url : undefined;
                    altForm.imageUploaded = false;
                    break;
                case ImageMode.None:
                    altForm.imageURL = undefined;
                    if (altForm.imageUploaded) {
                        altForm.imageUploaded = false;
                    }
                    break;
                case ImageMode.Upload:
                    let fileExtension = (formData.imageFile as File).name.split(".").pop()!.toLowerCase();
                    altForm.imageURL = `/user_images/${chainId}/${altFormId}.${fileExtension}`;
                    let uploadData = new FormData();
                    uploadData.append("imageFile", formData.imageFile);
                    uploadData.append("chainId", chainId);
                    uploadData.append("altFormId", String(altForm.id));
                    fetcher.submit(uploadData,
                        {
                            action: "/api/uploadImage",
                            method: "POST",
                            encType: "multipart/form-data"
                        }
                    );
                    altForm.imageUploaded = true;
                    break;
                case ImageMode.AlreadyUploaded:
                    break;

            }
        }

        return <EditableContainer<AltForm,
            { rerender: () => void, essential?: boolean, showLink?: boolean, title?: string, loading: boolean },
            { rerender: () => void, essential?: boolean, showLink?: boolean, title?: string }>
            get={get}
            set={(data) => { set(data); }}
            active={false}
            display={AltFormCardView}
            edit={AltFormCardEdit}
            extraDisplayProps={{
                rerender: rerender,
                essential: essential,
                showLink: showLink,
                title: title,
                loading: loading
            }} extraEditProps={{
                rerender: rerender,
                essential: essential,
                showLink: showLink,
                title: title
            }}
            encType="multipart/form-data"
        />
    }



export { AltFormCard };