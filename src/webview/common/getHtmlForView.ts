import { readFileSync } from 'fs';
import { join as pathJoin } from 'path';
import { Uri } from 'vscode';
import { Resources } from '../../resources';

export function getHtmlForView(extensionPath: string, baseUri: Uri, cspSource: string, viewId: string): string {
    const manifest = JSON.parse(readFileSync(pathJoin(extensionPath, 'build', 'asset-manifest.json')).toString());
    const mainScript = manifest[`mui.js`];

    const tmpl = Resources.html.get('reactWebviewHtml');

    if (tmpl) {
        return tmpl({
            view: viewId,
            scriptUri: `build/${mainScript}`,
            baseUri: baseUri,
            cspSource: cspSource,
        });
    } else {
        return Resources.htmlNotFound({ resource: 'reactWebviewHtml' });
    }
}
