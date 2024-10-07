import TurndownService from "turndown";
import Jump from "./Jump";
import Purchase from "./Purchase";
import { Id, LID } from "./Types";

export enum MarkupMode {
    BBCode,
    HTML,
    Markdown,
    Plaintext
}

export const LineBreak = "\n";

export enum T {
    Bold, Italic, Underlined, Link, List, ListItem, H1, H2, H3, P,
    H3NoBreak
}

export function E(tags: T | T[], params: { url?: string, verbose?: boolean }, ...children: MarkupFragment[]) {
    return {
        tags: Array.isArray(tags) ? tags : [tags],
        url: params.url,
        verbose: params.verbose,
        children: children
    }
}

export type MarkupFragment = string | MarkupFragment[] | { space: number } | { hrule: true } | {
    tags: T[]
    children: MarkupFragment[]
    url?: string
    verbose?: boolean
}

function encHTML(tag: T, text: string, url?: string) {
    switch (tag) {
        case T.ListItem:
            return `<li>${text}</li>\n`;
        case T.Bold:
            return `<b>${text}</b>`;
        case T.Italic:
            return `<i>${text}</i>`;
        case T.Underlined:
            return `<u>${text}</u>`;
        case T.Link:
            return `<a href="${url}">${text}</a>`;
        case T.List:
            return `\n<ul>\n${text}</ul>\n`;
        case T.H1:
            return `<h1>${text}</h1>\n`;
        case T.H2:
            return `<h2>${text}</h2>\n`;
        case T.H3:
        case T.H3NoBreak:
            return `<h3>${text}</h3>\n`;
        case T.P:
            return `<p>${text}</p>\n`;
    }
}

function encHRule(mode: MarkupMode) {
    switch (mode) {
        case MarkupMode.BBCode:
            return "[hr]\n";
        case MarkupMode.HTML:
            return "<hr />\n";
        case MarkupMode.Markdown:
            return "<hr />\n";
        case MarkupMode.Plaintext:
            return "\n-------\n";
    }
}

function encBBCode(tag: T, text: string, url?: string) {
    switch (tag) {
        case T.ListItem:
            return `[*]${text}\n`;
        case T.Bold:
            return `[b]${text}[/b]`;
        case T.Italic:
            return `[i]${text}[/i]`;
        case T.Underlined:
            return `[u]${text}[/u]`;
        case T.Link:
            return `[URL="${url}"]${text}[/URL]`;
        case T.List:
            return `\n[LIST]\n${text}[/LIST]\n`;
        case T.H1:
            return `[h1]${text}[/h1]\n`;
        case T.H2:
            return `[h2]${text}[/h2]\n`;
        case T.H3:
            return `[h3]${text}[/h3]\n`;
        case T.H3NoBreak:
            return `[h3]${text}[/h3]`;
        case T.P:
            return `${text}\n\n`;
    }
}

function encMarkdown(tag: T, text: string, url?: string) {
    switch (tag) {
        case T.ListItem:
            return `<li>${text}</li>\n`;
        case T.Bold:
            return `<b>${text}</b>`;
        case T.Italic:
            return `<i>${text}</i>`;
        case T.Underlined:
            return `<i><b>${text}</b></i>`;
        case T.Link:
            return `<a href="${url}">${text}</a>`;
        case T.List:
            return `\n<ul>\n${text}</ul>\n`;
        case T.H1:
            return `<h1>${text}</h1>\n`;
        case T.H2:
            return `<h1>${text}</h1>\n`;
        case T.H3:
        case T.H3NoBreak:
            return `<h1>${text}</h1>\n`;
        case T.P:
            return `<p>${text}</p>\n`;
    }
}

function encPlaintext(tag: T, text: string, listDepth: number, url?: string) {
    switch (tag) {
        case T.ListItem:
            return '   '.repeat(listDepth) + `- ${text}\n`;
        case T.Bold:
        case T.Italic:
        case T.Underlined:
            return `${text}`;
        case T.H1:
        case T.H2:
        case T.H3:
        case T.List:
            return `\n` + '\t'.repeat(listDepth) + `${text}\n` + '\t'.repeat(listDepth);
        case T.H3NoBreak:
            return `${text}`;
        case T.Link:
            return `${text} (URL: ${url})`;
        case T.P:
            return `${text}\n\n`;

    }
}




export default class LayoutManager {
    markupMode: MarkupMode = MarkupMode.Markdown;
    abbreviate: boolean = false;

    exportFragment(frag: MarkupFragment, listDepth = 0, depth = 0): string {
        if (typeof frag == "string") {
            switch (this.markupMode) {
                case MarkupMode.HTML:
                case MarkupMode.Markdown:
                    return frag.replaceAll("\n", "<br/>\n");
                case MarkupMode.BBCode:
                    return frag;
                case MarkupMode.Plaintext:
                    return frag.replaceAll("\n", "\n" + "   ".repeat(listDepth));
            }
        }

        if ("hrule" in frag) {
            return encHRule(this.markupMode);
        }

        if ("space" in frag) {
            return " ".repeat(frag.space);
        }

        if (Array.isArray(frag))
            frag = { tags: [], children: frag };

        if (frag.verbose && this.abbreviate)
            return "";

        let list = frag.tags.includes(T.List);

        let childrenStrings = frag.children.map((f) => this.exportFragment(f, listDepth + (+list), depth + 1));
        let ret = childrenStrings.join("");
        let tags = [...frag.tags];
        while (tags.length > 0) {
            let tag = tags.pop()!;
            switch (this.markupMode) {
                case MarkupMode.BBCode:
                    ret = encBBCode(tag, ret, frag.url);
                    break;
                case MarkupMode.HTML:
                    ret = encHTML(tag, ret, frag.url);
                    break;
                case MarkupMode.Markdown:
                    ret = encMarkdown(tag, ret, frag.url);
                    break;
                case MarkupMode.Plaintext:
                    ret = encPlaintext(tag, ret, listDepth, frag.url);
                    break;
            }
        }
        if (this.markupMode == MarkupMode.Markdown && depth == 0) {
            ret = (new TurndownService()).turndown(ret);
        }
        return ret;

    }
}

export function exportPurchaseListForDisplay(purchaseList: Purchase[], jump: Jump, title: string, hideTitle?: boolean, currency?: string, total?: number)
    : [MarkupFragment, Record<Id<LID.Currency>, { value: number, itemStipend: number }>] {
    let summaries = Object.values(jump.subsystemSummaries).flatMap((r) => Object.values(r)).flat().map((summ) => summ.id);
    purchaseList = purchaseList.filter((p) => !summaries.includes(p.id));
    let purchaseTotal: Record<Id<LID.Currency>, { value: number, itemStipend: number }> = {};
    purchaseList.forEach((purchase) => {
        if (!purchaseTotal[purchase.currency])
            purchaseTotal[purchase.currency] = { value: 0, itemStipend: 0 };
        purchaseTotal[purchase.currency].value += purchase.cost;
        purchaseTotal[purchase.currency].itemStipend += purchase.itemStipend || 0;
    });

    let purchaseDisplay: MarkupFragment = !hideTitle ? [E(T.Bold, {}, `${title}`), { space: 1 }] : [];
    if (!hideTitle) {
        purchaseDisplay.push("[");

        purchaseDisplay.push(
            jump.listCurrencies().filter(cId => Object.keys(purchaseTotal).includes(String(cId))).map((cId, index) =>
                [
                    E([], {}, (index > 0) ? [";", { space: 1 }] : [], `${purchaseTotal[cId].value} ${currency || jump.currency(cId).abbrev}`),
                    purchaseTotal[cId].itemStipend ? ` with ${purchaseTotal[cId].itemStipend} ${currency || jump.currency(cId).abbrev} Item Stipend` : []
                ]
            )
        );

        if (total !== undefined) {
            purchaseDisplay.push(` out of ${total + (purchaseTotal[0]?.value || 0)} ${currency} available`);
        }

        purchaseDisplay.push("]:");
    }

    purchaseDisplay.push(E(
        T.List, {}, purchaseList.map((d) =>
            E(T.ListItem, {}, d.exportForDisplay(jump.id, d.characterId))
        )
    ));

    return [purchaseDisplay, purchaseTotal];
}