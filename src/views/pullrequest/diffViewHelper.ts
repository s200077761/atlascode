import * as vscode from 'vscode';
import { Comment, FileChange, FileStatus, PaginatedComments, PullRequest } from '../../bitbucket/model';
import { Container } from '../../container';
import { Logger } from '../../logger';
import { PullRequestNodeDataProvider } from '../pullRequestNodeDataProvider';
import { PullRequestCommentController } from './prCommentController';
import { PRFileDiffQueryParams } from './pullRequestNode';

export interface DiffViewArgs {
    diffArgs: any[];
    fileDisplayData: {
        prUrl: string;
        fileDisplayName: string;
        fileChangeStatus: FileStatus;
        numberOfComments: number;
    }
}

export async function getInlineComments(allComments: Comment[]): Promise<Map<string, Comment[][]>> {
    const inlineComments = allComments.filter(c => c.inline && c.inline.path);
    const threads: Map<string, Comment[][]> = new Map();
    inlineComments.forEach(val => {
        if (!threads.get(val.inline!.path)) {
            threads.set(val.inline!.path, []);
        }
        threads.get(val.inline!.path)!.push(traverse(val));
    });
    return threads;
};

function traverse(n: Comment): Comment[] {
    let result: Comment[] = [];
    result.push(n);
    for (let i = 0; i < n.children.length; i++) {
        result.push(...traverse(n.children[i]));
    }
    return result;
};

export async function getArgsForDiffView(allComments: PaginatedComments, fileChange: FileChange, pr: PullRequest, commentController: PullRequestCommentController): Promise<DiffViewArgs> {
    const remotePrefix = pr.workspaceRepo ? `${pr.workspaceRepo.mainSiteRemote.remote.name}/` : '';
    // Use merge base to diff from common ancestor of source and destination.
    // This will help ignore any unrelated changes in destination branch.
    const destination = `${remotePrefix}${pr.data.destination!.branchName}`;
    // TODO Handle case when source and destination remotes are not the same
    //const source = `${pr.sourceRemote ? pr.sourceRemote.name : pr.remote.name}/${pr.data.source!.branchName}`;
    const source = `${remotePrefix}${pr.data.source!.branchName}`;
    let mergeBase = pr.data.destination!.commitHash;
    try {
        if (pr.workspaceRepo) {
            const scm = Container.bitbucketContext.getRepositoryScm(pr.workspaceRepo.rootUri);
            if (scm) {
                mergeBase = await scm.getMergeBase(destination, source);
            }
        }
    } catch (e) {
        Logger.debug('error getting merge base: ', e);
    }

    const lhsFilePath = fileChange.oldPath;
    const rhsFilePath = fileChange.newPath;

    let fileDisplayName = '';
    const comments: Comment[][] = [];

    const commentsMap = await getInlineComments(allComments.data);

    if (rhsFilePath && lhsFilePath && rhsFilePath !== lhsFilePath) {
        fileDisplayName = `${lhsFilePath} → ${rhsFilePath}`;
        comments.push(...(commentsMap.get(lhsFilePath) || []));
        comments.push(...(commentsMap.get(rhsFilePath) || []));
    } else if (rhsFilePath) {
        fileDisplayName = rhsFilePath;
        comments.push(...(commentsMap.get(rhsFilePath) || []));
    } else if (lhsFilePath) {
        fileDisplayName = lhsFilePath;
        comments.push(...(commentsMap.get(lhsFilePath) || []));
    }

    //@ts-ignore
    if (fileChange.status === 'merge conflict') {
        fileDisplayName = `⚠️ CONFLICTED: ${fileDisplayName}`;
    }

    let lhsCommentThreads: Comment[][] = [];
    let rhsCommentThreads: Comment[][] = [];

    comments.forEach((c: Comment[]) => {
        const parentComment = c[0];
        if (parentComment.inline!.from) {
            lhsCommentThreads.push(c);
        } else {
            rhsCommentThreads.push(c);
        }
    });

    const repoUri = pr.workspaceRepo ? pr.workspaceRepo.rootUri : '';

    const lhsQueryParam = {
        query: JSON.stringify({
            site: pr.site,
            lhs: true,
            prHref: pr.data.url,
            prId: pr.data.id,
            participants: pr.data.participants,
            repoUri: repoUri,
            branchName: pr.data.destination!.branchName,
            commitHash: mergeBase,
            path: lhsFilePath,
            commentThreads: lhsCommentThreads
        } as PRFileDiffQueryParams)
    };
    const rhsQueryParam = {
        query: JSON.stringify({
            site: pr.site,
            lhs: false,
            prHref: pr.data.url,
            prId: pr.data.id,
            participants: pr.data.participants,
            repoUri: repoUri,
            branchName: pr.data.source!.branchName,
            commitHash: pr.data.source!.commitHash,
            path: rhsFilePath,
            commentThreads: rhsCommentThreads
        } as PRFileDiffQueryParams)
    };

    const lhsUri = vscode.Uri.parse(`${PullRequestNodeDataProvider.SCHEME}://${fileDisplayName}`).with(lhsQueryParam);
    const rhsUri = vscode.Uri.parse(`${PullRequestNodeDataProvider.SCHEME}://${fileDisplayName}`).with(rhsQueryParam);

    const diffArgs = [
        async () => {
            commentController.provideComments(lhsUri);
            commentController.provideComments(rhsUri);
        },
        lhsUri,
        rhsUri,
        fileDisplayName
    ];

    return {
        diffArgs: diffArgs,
        fileDisplayData: {
            prUrl: pr.data.url,
            fileDisplayName: fileDisplayName,
            fileChangeStatus: fileChange.status,
            numberOfComments: comments.length ? comments.length : 0
        }
    };
}