import { readFileSync } from 'fs';
import { join as pathJoin } from 'path';
import { Uri } from 'vscode';
import { Resources } from '../../resources';
export function getHtmlForView(extensionPath: string, viewId: string): string {
    const manifest = JSON.parse(readFileSync(pathJoin(extensionPath, 'build', 'asset-manifest.json')).toString());
    const mainScript = manifest[`mui.js`];

    const scriptUri = Uri.file(pathJoin(extensionPath, 'build', mainScript)).with({ scheme: 'vscode-resource' });
    const tmpl = Resources.html.get('reactWebviewHtml');

    if (tmpl) {
        return tmpl({
            view: viewId,
            scriptUri: scriptUri,
            baseUri: Uri.file(extensionPath).with({ scheme: 'vscode-resource' }),
        });
    } else {
        return Resources.htmlNotFound({ resource: 'reactWebviewHtml' });
    }
}
