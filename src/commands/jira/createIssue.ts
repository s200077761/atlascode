import { window, workspace, WorkspaceEdit, Uri, Position, ViewColumn } from 'vscode';
import { Repository } from "../../typings/git";
import { Container } from '../../container';
import { PullRequestApi, GitUrlParse } from '../../bitbucket/pullRequests';

export interface TodoIssueData {
    summary: string;
    uri: Uri;
    insertionPoint: Position;
}

export function createIssue(data: Uri | TodoIssueData | undefined) {
    if (isTodoIssueData(data)) {
        const partialIssue = {
            summary: data.summary,
            description: descriptionForUri(data.uri),
            uri: data.uri,
            position: data.insertionPoint,
            onCreated: annotateComment,
        };
        Container.createIssueWebview.createOrShow(ViewColumn.Beside, partialIssue);
        return;
    } else if (isUri(data) && data.scheme === 'file') {
        Container.createIssueWebview.createOrShow(ViewColumn.Active, { description: descriptionForUri(data) });
        return;
    }
    Container.createIssueWebview.createOrShow();
}

function isTodoIssueData(a: any): a is TodoIssueData {
    return a && (<TodoIssueData>a).insertionPoint !== undefined;
}

function isUri(a: any): a is Uri {
    return a && (<Uri>a).fsPath !== undefined;
}

function annotateComment(file: Uri, position: Position, issueKey: string) {
    const we = new WorkspaceEdit();

    we.insert(file, position, ` [${issueKey}]`);
    workspace.applyEdit(we);
}

function descriptionForUri(uri: Uri) {
    var fullPath = uri.fsPath;

    const linesText = getLineRange();

    const repos = Container.bitbucketContext.getAllRepositores();

    const urlArrays = repos.map((repo) => {
        return bitbucketUrlsInRepo(repo, fullPath, linesText);
    });
    const urls = urlArrays.reduce((p, c) => {
        return p.concat(c);
    }, []);
    if (urls.length === 0) {
        return `${workspace.asRelativePath(fullPath)}${linesText}`;
    } else if (urls.length === 1) {
        return urls[0];
    } else {
        return urls.join('\r');
    }
}

function bitbucketUrlsInRepo(repo: Repository, fullPath: string, linesText: string): string[] {
    const head = repo.state.HEAD;
    if (!head) {
        return [];
    }
    const rootPath = repo.rootUri.fsPath;
    if (!fullPath.includes(rootPath)) {
        return [];
    }
    const relativePath = fullPath.replace(rootPath, "");
    if (Container.bitbucketContext.isBitbucketRepo(repo)) {
        const remotes = PullRequestApi.getBitbucketRemotes(repo);
        const branch = head.commit;
        return remotes.map((remote) => {
            const parsed = GitUrlParse(remote.fetchUrl! || remote.pushUrl!);
            if (branch) {
                const url = `https://bitbucket.org/${parsed.owner}/${parsed.name}/src/${branch}${relativePath}${linesText}`;
                return url;
            }
            return undefined;
        }).filter(r => {
            return (r !== undefined);
        }) as string[];
    }
    return [];
}

function getLineRange(): string {
    const editor = window.activeTextEditor;
    if (!editor || !editor.selection) {
        return "";
    }
    const selection = editor.selection;
    // vscode provides 0-based line numbers but Bitbucket line numbers start with 1.
    if (selection.start.line === selection.end.line) {
        return `#lines-${selection.start.line + 1}`;
    }
    return `#lines-${selection.start.line + 1}:${selection.end.line + 1}`;
}
