import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import { DetailedSiteInfo } from '../../../../atlclients/authInfo';
import {
    ApprovalStatus,
    BitbucketIssue,
    BitbucketSite,
    BuildStatus,
    Comment,
    Commit,
    FileChange,
    FileDiff,
    MergeStrategy,
    PullRequest,
    Reviewer,
    User,
} from '../../../../bitbucket/model';

export interface PullRequestDetailsActionApi {
    fetchUsers(site: BitbucketSite, query: string, abortKey?: string): Promise<User[]>;
    updateSummary(pr: PullRequest, text: string): Promise<PullRequest>;
    updateTitle(pr: PullRequest, text: string): Promise<PullRequest>;
    getCurrentUser(pr: PullRequest): Promise<User>;
    getPR(pr: PullRequest): Promise<PullRequest>;
    updateCommits(pr: PullRequest): Promise<Commit[]>;
    updateReviewers(pr: PullRequest, newReviewers: User[]): Promise<Reviewer[]>;
    updateApprovalStatus(pr: PullRequest, status: ApprovalStatus): Promise<ApprovalStatus>;
    checkout(pr: PullRequest): Promise<string>;
    getCurrentBranchName(pr: PullRequest): string;
    getFileDiffs(pr: PullRequest): Promise<{ fileDiffs: FileDiff[]; diffsToChangesMap: Map<string, FileChange> }>;
    openDiffViewForFile(pr: PullRequest, fileChange: FileChange): Promise<void>;
    updateBuildStatuses(pr: PullRequest): Promise<BuildStatus[]>;
    updateMergeStrategies(pr: PullRequest): Promise<MergeStrategy[]>;
    fetchRelatedJiraIssues(
        pr: PullRequest,
        commits: Commit[],
        comments: Comment[]
    ): Promise<MinimalIssue<DetailedSiteInfo>[]>;
    fetchRelatedBitbucketIssues(pr: PullRequest, commits: Commit[], comments: Comment[]): Promise<BitbucketIssue[]>;
    merge(
        pr: PullRequest,
        mergeStrategy: MergeStrategy,
        commitMessage: string,
        closeSourceBranch: boolean,
        issues: (MinimalIssue<DetailedSiteInfo> | BitbucketIssue)[]
    ): Promise<PullRequest>;
}
