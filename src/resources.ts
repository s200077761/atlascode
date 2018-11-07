import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as Handlebars from 'handlebars';

export class Resources {
    static icons: Map<string, vscode.Uri> = new Map();
    static charlesCert: string;
    static html: Map<string,Handlebars.TemplateDelegate> = new Map();
    static htmlNotFound: Handlebars.TemplateDelegate = Handlebars.compile(`<!DOCTYPE html>
    <html lang="en">
    <body>
    Resource not found: {{resource}}
    </body>
    </html>`);
}

export function registerResources(vscodeContext: vscode.ExtensionContext) {
    Resources.icons.set('add', vscode.Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'bitbucket', 'add-circle.svg'))));
    Resources.icons.set('edit', vscode.Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'bitbucket', 'edit-filled.svg'))));
    Resources.icons.set('delete', vscode.Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'bitbucket', 'blocker.svg'))));
    Resources.icons.set('detail', vscode.Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'bitbucket', 'detail-view.svg'))));
    Resources.charlesCert = vscodeContext.asAbsolutePath('charles-ssl-proxying-certificate.pem');

    
    
    Resources.html.set('reactHtml', Handlebars.compile(fs.readFileSync(vscodeContext.asAbsolutePath(path.join('resources', 'html', 'reactView.html'))).toString()));
}

export function generateWebviewHtml(extensionPath: string): string {
    const manifest = require(path.join(extensionPath, 'build', 'asset-manifest.json'));
    const mainScript = manifest['main.js'];
    const mainStyle = manifest['main.css'];

    const scriptPathOnDisk = vscode.Uri.file(path.join(extensionPath, 'build', mainScript));
    const scriptUri = scriptPathOnDisk.with({ scheme: 'vscode-resource' });
    const stylePathOnDisk = vscode.Uri.file(path.join(extensionPath, 'build', mainStyle));
    const styleUri = stylePathOnDisk.with({ scheme: 'vscode-resource' });

    // Use a nonce to whitelist which scripts can be run
    const nonce = getNonce();

    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="utf-8">
				<meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
				<meta name="theme-color" content="#000000">
				<title>React App</title>
				<link rel="stylesheet" type="text/css" href="${styleUri}">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src vscode-resource: https:; script-src 'nonce-${nonce}';style-src vscode-resource: 'unsafe-inline' http: https: data:;">
				<base href="${vscode.Uri.file(path.join(extensionPath, 'build')).with({ scheme: 'vscode-resource' })}/">
			</head>

			<body>
				<noscript>You need to enable JavaScript to run this app.</noscript>
				<div id="root"></div>
				
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
}

function getNonce() {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}