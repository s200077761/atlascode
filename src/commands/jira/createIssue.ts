import { window, workspace } from 'vscode';
import { Repository } from "../../typings/git";
import { Container } from '../../container';
import { PullRequestApi, GitUrlParse } from '../../bitbucket/pullRequests';

export function createIssue(data?: any) {
    if (data && data['scheme'] === 'file') {
        const fullPath = data['fsPath'];

        const linesText = getLineRange();

        const repos = Container.bitbucketContext.getAllRepositores();

        const urlArrays = repos.map((repo) => {
            return bitbucketUrlsInRepo(repo, fullPath, linesText);
        });
        const urls = urlArrays.reduce((p, c) => {
            return p.concat(c);
        }, []);
        if (urls.length === 0) {
            Container.createIssueWebview.createOrShow({ description: `${workspace.asRelativePath(fullPath)}${linesText}` });
        } else if (urls.length === 1) {
            const description = urls[0];
            Container.createIssueWebview.createOrShow({ description: description });
        } else {
            const description = urls.join('\r');
            Container.createIssueWebview.createOrShow({ description: description });
        }
    } else {
        Container.createIssueWebview.createOrShow();
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
