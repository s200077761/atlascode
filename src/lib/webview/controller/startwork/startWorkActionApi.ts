import { MinimalIssue, Transition } from '@atlassianlabs/jira-pi-common-models';
import { DetailedSiteInfo } from '../../../../atlclients/authInfo';
import { Repo, WorkspaceRepo } from '../../../../bitbucket/model';
import { Branch } from '../../../../typings/git';

export interface StartWorkActionApi {
    getWorkspaceRepos(): WorkspaceRepo[];
    getRepoDetails(repo: WorkspaceRepo): Promise<Repo>;
    getRepoScmState(
        repo: WorkspaceRepo
    ): Promise<{ localBranches: Branch[]; remoteBranches: Branch[]; hasSubmodules: boolean }>;
    assignAndTransitionIssue(issue: MinimalIssue<DetailedSiteInfo>, transition?: Transition): Promise<void>;
    createOrCheckoutBranch(
        wsRepo: WorkspaceRepo,
        destinationBranch: string,
        sourceBranch: Branch,
        remote: string
    ): Promise<void>;
    closePage(): void;
}
