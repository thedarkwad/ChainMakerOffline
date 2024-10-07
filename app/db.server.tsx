import path from "path";
import { promises as fs } from "fs";

let tempSavePath = path.join(process.cwd(), ".tempSave.json", );

export async function newChain(chainDump: string) {
    await fs.writeFile(tempSavePath, chainDump, 'utf8');
}

export async function checkIfChainExists(accessString: string) {
    return true;
}