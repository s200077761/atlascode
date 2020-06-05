import { readFileSync } from 'fs';
import { join as pathJoin } from 'path';
import { Uri } from 'vscode';
import { Resources } from '../../resources';

export function getHtmlForView(baseUri: Uri, cspSource: string, viewId: string): string {
    const manifest = JSON.parse(readFileSync(pathJoin(baseUri.fsPath, 'build', 'asset-manifest.json')).toString());
    const mainScript = manifest[`mui.js`];

    const scriptUri = baseUri.with({ path: pathJoin(baseUri.path, 'build', mainScript) });
    const tmpl = Resources.html.get('reactWebviewHtml');

    if (tmpl) {
        return tmpl({
            view: viewId,
            scriptUri: scriptUri,
            baseUri: baseUri,
            cspSource: cspSource,
        });
    } else {
        return Resources.htmlNotFound({ resource: 'reactWebviewHtml' });
    }
}
