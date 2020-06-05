import { MinimalIssue, Transition } from '@atlassianlabs/jira-pi-common-models';
import Handlebars from 'handlebars';
import { DetailedSiteInfo } from '../../atlclients/authInfo';
import { clientForSite } from '../../bitbucket/bbUtils';
import { emptyRepo, Repo, WorkspaceRepo } from '../../bitbucket/model';
import { StartWork } from '../../config/model';
import { Container } from '../../container';
import { ConfigSection, ConfigSubSection } from '../../lib/ipc/models/config';
import { StartWorkActionApi } from '../../lib/webview/controller/startwork/startWorkActionApi';
import { Branch, RefType } from '../../typings/git';

export class VSCStartWorkActionApi implements StartWorkActionApi {
    getWorkspaceRepos(): WorkspaceRepo[] {
        return Container.bitbucketContext?.getAllRepositories() || [];
    }

    async getRepoDetails(wsRepo: WorkspaceRepo): Promise<Repo> {
        const site = wsRepo.mainSiteRemote.site;
        if (!site) {
            return emptyRepo;
        }
        const client = await clientForSite(wsRepo.mainSiteRemote.site!);
        const repoDetails = await client.repositories.get(site);
        return repoDetails;
    }

    async getRepoScmState(
        wsRepo: WorkspaceRepo
    ): Promise<{ localBranches: Branch[]; remoteBranches: Branch[]; hasSubmodules: boolean }> {
        const scm = Container.bitbucketContext.getRepositoryScm(wsRepo.rootUri)!;

        return {
            localBranches: scm.state.refs.filter((ref) => ref.type === RefType.Head && ref.name),
            remoteBranches: scm.state.refs.filter((ref) => ref.type === RefType.RemoteHead && ref.name),
            hasSubmodules: scm.state.submodules.length > 0,
        };
    }

    async assignAndTransitionIssue(issue: MinimalIssue<DetailedSiteInfo>, transition?: Transition): Promise<void> {
        const client = await Container.clientManager.jiraClient(issue.siteDetails);
        await client.assignIssue(issue.key, issue.siteDetails.userId);
        if (transition !== undefined && issue.status.id !== transition.to.id) {
            await client.transitionIssue(issue.key, transition.id);
        }
    }

    async createOrCheckoutBranch(
        wsRepo: WorkspaceRepo,
        destinationBranch: string,
        sourceBranch: Branch,
        remote: string
    ): Promise<void> {
        const scm = Container.bitbucketContext.getRepositoryScm(wsRepo.rootUri)!;

        // checkout if a branch exists already
        try {
            await scm.fetch(remote, sourceBranch.name);
            await scm.getBranch(destinationBranch);
            await scm.checkout(destinationBranch);
            return;
        } catch (_) {}

        // checkout if there's a matching remote branch (checkout will track remote branch automatically)
        try {
            await scm.getBranch(`remotes/${remote}/${destinationBranch}`);
            await scm.checkout(destinationBranch);
            return;
        } catch (_) {}

        // no existing branches, create a new one
        await scm.createBranch(
            destinationBranch,
            true,
            `${sourceBranch.type === RefType.RemoteHead ? 'remotes/' : ''}${sourceBranch.name}`
        );
        await scm.push(remote, destinationBranch, true);
        return;
    }

    getStartWorkConfig(): StartWork {
        return {
            useCustomTemplate: Container.config.jira.startWork.useCustomTemplate,
            customTemplate: Container.config.jira.startWork.customTemplate,
            useCustomPrefixes: Container.config.jira.startWork.useCustomPrefixes,
            customPrefixes: Container.config.jira.startWork.customPrefixes,
        };
    }

    openSettings(section?: ConfigSection, subsection?: ConfigSubSection): void {
        Container.settingsWebviewFactory.createOrShow(
            section ? { section: section, subSection: subsection } : undefined
        );
    }

    buildBranchName(prefix: string, issueKey: string, summary: string): string {
        const template = Handlebars.compile(Container.config.jira.startWork.customTemplate);
        summary = summary.substring(0, 50).trim().toLowerCase().replace(/\W+/g, '-');
        return template({ prefix: prefix, issueKey: issueKey, summary: summary });
    }

    closePage() {
        Container.startWorkWebviewFactory.hide();
    }
}
