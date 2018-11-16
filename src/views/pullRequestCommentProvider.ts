import * as vscode from 'vscode';
import { PullRequestNodeDataProvider } from './pullRequestNodeDataProvider';

export class PullRequestCommentProvider implements vscode.DocumentCommentProvider {
    private _onDidChangeCommentThreads: vscode.EventEmitter<vscode.CommentThreadChangedEvent> = new vscode.EventEmitter<vscode.CommentThreadChangedEvent>();
    public onDidChangeCommentThreads: vscode.Event<vscode.CommentThreadChangedEvent> = this._onDidChangeCommentThreads.event;

    async provideDocumentComments(document: vscode.TextDocument, token: vscode.CancellationToken): Promise<vscode.CommentInfo> {
        const { commentThreads } = JSON.parse(document.uri.query);
        if (!commentThreads || commentThreads.length === 0) {
            return {
                commentingRanges: [],
                threads: []
            };
        }

        let threads: vscode.CommentThread[] = [];
        commentThreads
            .forEach((c: Bitbucket.Schema.Comment[]) => threads.push({
                comments: c.map(cc => {
                    return {
                        userName: cc.user!.display_name!,
                        body: new vscode.MarkdownString(cc.content!.raw),
                        commentId: String(cc.id!)
                    };
                }),
                range: new vscode.Range(c[0].inline!.from! || c[0].inline!.to!, 0, c[0].inline!.to! || c[0].inline!.from!, 0),
                resource: vscode.Uri.parse(`${PullRequestNodeDataProvider.SCHEME}://${document.fileName}`),
                threadId: String(c[0].id!),
                collapsibleState: vscode.CommentThreadCollapsibleState.Expanded
            }));
        return {
            commentingRanges: [new vscode.Range(0, 0, document.lineCount, 0)],
            threads: threads
        };
    }

    async createNewCommentThread(document: vscode.TextDocument, range: vscode.Range, text: string, token: vscode.CancellationToken): Promise<vscode.CommentThread> {
        return Promise.reject();
    }
    async replyToCommentThread(document: vscode.TextDocument, range: vscode.Range, commentThread: vscode.CommentThread, text: string, token: vscode.CancellationToken): Promise<vscode.CommentThread> {
        return Promise.reject();
    }
}

const prDocumentCommentProvider = new PullRequestCommentProvider();

export function getPRDocumentCommentProvider(): PullRequestCommentProvider {
    return prDocumentCommentProvider;
}