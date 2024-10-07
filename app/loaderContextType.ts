import type * as remix from "@remix-run/node"
import { GlobalSettings } from "./root"

export type LoadContext = {
	chain: string | undefined,
    currentVersion: Number,
    tempImagesPath: string
}

export type LoaderFunctionArgs = Omit<remix.LoaderFunctionArgs, "context"> & {
	context: LoadContext
}

export type ActionFunctionArgs = Omit<remix.ActionFunctionArgs, "context"> & {
	context: LoadContext
}


export type IpcAPI = {
    onChainRequest: (func: () => void) => void,
    updateChain: (chainDump: string) => void,
    onSettingsUpdate: (func: (settings: Partial<GlobalSettings>) => void) => void,
    onRequestExport: (func: () => void) => void,
    requestOpen: () => void,
    requestNew: (f: Object) => void   
}