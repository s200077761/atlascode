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

    Resources.icons.set('issues', vscode.Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'issues.svg'))));

    Resources.charlesCert = vscodeContext.asAbsolutePath('charles-ssl-proxying-certificate.pem');

    Resources.html.set('reactHtml', Handlebars.compile(fs.readFileSync(vscodeContext.asAbsolutePath(path.join('resources', 'html', 'reactView.html'))).toString()));
    Resources.html.set('statusBarText', Handlebars.compile(fs.readFileSync(vscodeContext.asAbsolutePath(path.join('resources', 'html', 'statusbar.html'))).toString()));
    Resources.html.set('authSuccessHtml', Handlebars.compile(fs.readFileSync(vscodeContext.asAbsolutePath(path.join('resources', 'html', 'auth-success.html'))).toString()));
    Resources.html.set('authFailureHtml', Handlebars.compile(fs.readFileSync(vscodeContext.asAbsolutePath(path.join('resources', 'html', 'auth-failure.html'))).toString()));
}
