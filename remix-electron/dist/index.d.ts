import { ServerBuild, AppLoadContext } from '@remix-run/node';

type MaybePromise<T> = Promise<T> | T;
type GetLoadContextFunction = (request: Request) => MaybePromise<AppLoadContext | undefined>;
interface InitRemixOptions {
    serverBuild: ServerBuild | string;
    mode?: string;
    publicFolder?: string;
    altPublicFolder?: string;
    altFilePrefix?: string;
    altURLTransformer?: (s: string) => string;
    getLoadContext?: GetLoadContextFunction;
    esm?: boolean;
}
/**
 * Initialize and configure remix-electron
 *
 * @param options
 * @returns The url to use to access the app.
 */
declare function initRemix({ serverBuild: serverBuildOption, mode, publicFolder: publicFolderOption, altPublicFolder, altFilePrefix, altURLTransformer, getLoadContext, esm, }: InitRemixOptions): Promise<string>;

export { initRemix };
