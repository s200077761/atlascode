import * as vscode from 'vscode';
import * as path from 'path';

export class Resources {
    static icons: Map<string, vscode.Uri> = new Map();
    static charlesCert: string;
}

export function registerResources(vscodeContext: vscode.ExtensionContext) {
    Resources.icons.set('add', vscode.Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'bitbucket', 'add-circle.svg'))));
    Resources.icons.set('edit', vscode.Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'bitbucket', 'edit-filled.svg'))));
    Resources.icons.set('delete', vscode.Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'bitbucket', 'blocker.svg'))));
    Resources.icons.set('detail', vscode.Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'bitbucket', 'detail-view.svg'))));
    Resources.charlesCert = vscodeContext.asAbsolutePath('charles-ssl-proxying-certificate.pem');
}
