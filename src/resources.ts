import fs from 'fs';
import Handlebars from 'handlebars';
import path from 'path';
import { ExtensionContext, Uri } from 'vscode';

export class Resources {
    static pipelinesSchemaPath: string = '';
    static icons: Map<string, Uri | { light: Uri; dark: Uri }> = new Map();
    static charlesCert: string;
    static html: Map<string, Handlebars.TemplateDelegate> = new Map();
    static htmlNotFound: Handlebars.TemplateDelegate = Handlebars.compile(`<!DOCTYPE html>
    <html lang="en">
    <body>
    Resource not found: {{resource}}
    </body>
    </html>`);
}

export function registerResources(vscodeContext: ExtensionContext) {
    Resources.icons.set(
        'add-circle',
        Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'bitbucket', 'add-circle.svg')))
    );
    Resources.icons.set(
        'edit',
        Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'bitbucket', 'edit-filled.svg')))
    );
    Resources.icons.set(
        'delete',
        Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'bitbucket', 'blocker.svg')))
    );
    Resources.icons.set(
        'detail',
        Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'bitbucket', 'detail-view.svg')))
    );
    Resources.icons.set(
        'warning',
        Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'bitbucket', 'warning.svg')))
    );

    Resources.icons.set('pullrequests', {
        light: Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'light', 'pullrequests.svg'))),
        dark: Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'dark', 'pullrequests.svg')))
    });
    Resources.icons.set('preferences', {
        light: Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'light', 'preferences.svg'))),
        dark: Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'dark', 'preferences.svg')))
    });
    Resources.icons.set('search', {
        light: Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'light', 'search.svg'))),
        dark: Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'dark', 'search.svg')))
    });
    Resources.icons.set('add', {
        light: Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'light', 'add.svg'))),
        dark: Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'dark', 'add.svg')))
    });
    Resources.icons.set('issues', Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'issues.svg'))));

    Resources.icons.set(
        'pending',
        Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'pipelines', 'icon-pending.svg')))
    );
    Resources.icons.set(
        'building',
        Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'pipelines', 'icon-building.svg')))
    );
    Resources.icons.set(
        'success',
        Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'pipelines', 'icon-success.svg')))
    );
    Resources.icons.set(
        'failed',
        Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'pipelines', 'icon-failed.svg')))
    );
    Resources.icons.set(
        'stopped',
        Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'pipelines', 'icon-stopped.svg')))
    );
    Resources.icons.set(
        'paused',
        Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'pipelines', 'icon-paused.svg')))
    );

    Resources.charlesCert = vscodeContext.asAbsolutePath('charles-ssl-proxying-certificate.pem');

    Resources.html.set(
        'reactHtml',
        Handlebars.compile(
            fs.readFileSync(vscodeContext.asAbsolutePath(path.join('resources', 'html', 'reactView.html'))).toString()
        )
    );
    Resources.html.set(
        'statusBarText',
        Handlebars.compile(
            fs.readFileSync(vscodeContext.asAbsolutePath(path.join('resources', 'html', 'statusbar.html'))).toString()
        )
    );
    Resources.html.set(
        'authSuccessHtml',
        Handlebars.compile(
            fs
                .readFileSync(vscodeContext.asAbsolutePath(path.join('resources', 'html', 'auth-success.html')))
                .toString()
        )
    );
    Resources.html.set(
        'authFailureHtml',
        Handlebars.compile(
            fs
                .readFileSync(vscodeContext.asAbsolutePath(path.join('resources', 'html', 'auth-failure.html')))
                .toString()
        )
    );

    Resources.pipelinesSchemaPath = path
        .join(vscodeContext.extensionPath, 'resources', 'schemas', 'pipelines-schema.json')
        .toString();
}
