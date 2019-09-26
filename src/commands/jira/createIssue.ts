import { window, workspace, WorkspaceEdit, Uri, Position, ViewColumn, Range } from 'vscode';
import { Repository } from "../../typings/git";
import { Container } from '../../container';
import { startIssueCreationEvent } from '../../analytics';
import { CommentData, BBData } from '../../webviews/createIssueWebview';
import { parseGitUrl, urlForRemote, clientForRemote, firstBitbucketRemote, siteDetailsForRemote } from '../../bitbucket/bbUtils';
import { BitbucketIssue } from '../../bitbucket/model';

export interface TodoIssueData {
    summary: string;
    uri: Uri;
    insertionPoint: Position;
}

export function createIssue(data: Uri | TodoIssueData | BitbucketIssue | undefined) {
    if (isTodoIssueData(data)) {
        const partialIssue = {
            summary: data.summary,
            description: descriptionForUri(data.uri),
            uri: data.uri,
            position: data.insertionPoint,
            onCreated: annotateComment,
        };
        Container.createIssueWebview.createOrShow(ViewColumn.Beside, partialIssue);
        startIssueCreationEvent('todoComment').then(e => { Container.analyticsClient.sendTrackEvent(e); });
        return;
    } else if (isUri(data) && data.scheme === 'file') {
        Container.createIssueWebview.createOrShow(ViewColumn.Active, { description: descriptionForUri(data) });
        startIssueCreationEvent('contextMenu').then(e => { Container.analyticsClient.sendTrackEvent(e); });
        return;
    } else if (isBBIssueData(data)) {
        const partialIssue = {
            summary: `BB #${data.data.id} - ${data.data.title}`,
            description: `created from Bitbucket issue: ${data.data.links!.html!.href!}`,
            bbIssue: data,
            onCreated: updateBBIssue,
        };
        Container.createIssueWebview.createOrShow(ViewColumn.Beside, partialIssue);
        startIssueCreationEvent('todoComment').then(e => { Container.analyticsClient.sendTrackEvent(e); });
        return;
    }

    Container.createIssueWebview.createOrShow();
    startIssueCreationEvent('explorer').then(e => { Container.analyticsClient.sendTrackEvent(e); });
}

function isTodoIssueData(a: any): a is TodoIssueData {
    return a && (<TodoIssueData>a).insertionPoint !== undefined;
}

function isBBIssueData(a: any): a is BitbucketIssue {
    return a && (<BitbucketIssue>a).data !== undefined && (<BitbucketIssue>a).data.title !== undefined;
}

function isUri(a: any): a is Uri {
    return a && (<Uri>a).fsPath !== undefined;
}

function annotateComment(data: CommentData) {
    const we = new WorkspaceEdit();

    const summary = data.summary && data.summary.length > 0 ? ` ${data.summary}` : '';
    we.insert(data.uri, data.position, ` [${data.issueKey}]${summary}`);
    workspace.applyEdit(we);
}

async function updateBBIssue(data: BBData) {
    const bbApi = await clientForRemote(data.bbIssue.remote);
    await bbApi.issues!.postComment(data.bbIssue, `Linked to ${data.issueKey}`);

    const comps = await bbApi.issues!.getAvailableComponents(data.bbIssue.data.repository!.links!.html!.href!);
    if (comps && Array.isArray(comps)) {
        const injiraComp = comps.find(comp => comp.name === 'triaged');
        if (injiraComp && data.bbIssue.data.component !== injiraComp) {
            await bbApi.issues!.postNewComponent(data.bbIssue, injiraComp.name!);
        }
    }
}

function descriptionForUri(uri: Uri) {
    const linesText = getLineRange();

    const repos = Container.bitbucketContext.getAllRepositories();

    const urls = repos
        .map((repo) => bitbucketUrlsInRepo(repo, uri, linesText))
        .filter(url => url !== undefined);

    if (urls.length === 0) {
        return `${workspace.asRelativePath(uri)}${linesText}`;
    }

    const selectionText = getSelectionText();

    return urls.join('\r') + selectionText;
}

function bitbucketUrlsInRepo(repo: Repository, fileUri: Uri, linesText: string): string | undefined {
    const head = repo.state.HEAD;
    if (!head || head.name === undefined) {
        return undefined;
    }
    const rootPath = repo.rootUri.path;
    const filePath = fileUri.path;
    if (!filePath.startsWith(repo.rootUri.path)) {
        return undefined;
    }
    const relativePath = filePath.replace(rootPath, "");
    if (Container.bitbucketContext.isBitbucketRepo(repo)) {
        const remote = firstBitbucketRemote(repo);
        const parsed = parseGitUrl(urlForRemote(remote));
        const site = siteDetailsForRemote(remote)!;
        const commit = head.upstream && head.ahead && head.ahead > 0 ? head.name : head.commit;
        if (commit) {
            return site.isCloud
                ? `${site.baseLinkUrl}/${parsed.owner}/${parsed.name}/src/${commit}${relativePath}${linesText ? `#lines-${linesText}` : ''}`
                : `${site.baseLinkUrl}/projects/${parsed.owner}/repos/${parsed.name}/browse${relativePath}?at=${commit}${linesText ? `#${linesText.replace(':', '-')}` : ''}`;
        }
    }

    return undefined;
}

function getLineRange(): string {
    const editor = window.activeTextEditor;
    if (!editor || !editor.selection) {
        return "";
    }
    const selection = editor.selection;
    // vscode provides 0-based line numbers but Bitbucket line numbers start with 1.
    if (selection.start.line === selection.end.line) {
        return `${selection.start.line + 1}`;
    }
    return `${selection.start.line + 1}:${selection.end.line + 1}`;
}

function getSelectionText(): string {
    const editor = window.activeTextEditor;
    if (!editor || !editor.selection) {
        return "";
    }

    let result = "";
    const selection = editor.selection;
    if (selection.start.line === selection.end.line) {
        result = editor.document.lineAt(selection.start.line).text;
    } else {
        result = editor.document.getText(new Range(editor.selection.start, editor.selection.end));
    }

    return `\r{code}${result}{code}`;
}
