import * as React from 'react';
import Button from '@atlaskit/button';
import Page, { Grid, GridColumn } from '@atlaskit/page';
import PageHeader from '@atlaskit/page-header';
import Panel from '@atlaskit/panel';
import { Checkbox } from '@atlaskit/checkbox';
import { WebviewComponent } from '../WebviewComponent';
import { CreatePRData, CreatePullRequestResult, isCreatePullRequestResult, isCreatePRData, CommitsResult, isCommitsResult, RepoData } from '../../../ipc/prMessaging';
import { InlineFlex, VerticalPadding } from '../styles';
import Select from '@atlaskit/select';
import { CreatePullRequest, FetchDetails } from '../../../ipc/prActions';
import Commits from './Commits';
import Arrow from '@atlaskit/icon/glyph/arrow-right';
import { Remote, Branch, Ref } from '../../../typings/git';
import BranchWarning from './BranchWarning';
import CreatePRTitleSummary from './CreatePRTitleSummary';

type Emit = CreatePullRequest | FetchDetails;
type Receive = CreatePRData | CreatePullRequestResult | CommitsResult;

const emptyRepoData: RepoData = { uri: '', remotes: [], localBranches: [], remoteBranches: []};
const formatOptionLabel = (option: any, { context }: any) => {
    if (context === 'menu') {
        return (
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <div>{option.label}</div>
                {option.value && option.value.upstream ? (
                    <div
                        style={{
                            fontSize: 12,
                            fontStyle: 'italic'
                        }}
                    >
                        <InlineFlex>
                            {`tracking upstream ${option.value.upstream.remote}'/'${option.value.upstream.name}`}
                        </InlineFlex>
                    </div>
                ) : null}
            </div>
        );
    }
    return option.label;
};

export default class CreatePullRequestPage extends WebviewComponent<Emit, Receive, {}, {
    data: CreatePRData,
    title: string,
    summary: string,
    repo?: { label: string, value: RepoData },
    remote?: { label: string, value: Remote },
    sourceBranch?: { label: string, value: Branch },
    sourceRemoteBranchName?: string,
    destinationBranch?: { label: string, value: Ref },
    pushLocalChanges: boolean,
    commits: Bitbucket.Schema.Commit[],
    isCreateButtonLoading: boolean,
    result?: string
}> {
    constructor(props: any) {
        super(props);
        this.state = { data: {type: 'createPullRequest', repositories: []}, title: 'Pull request title', summary: '', pushLocalChanges: false, commits: [], isCreateButtonLoading: false };
    }

    handleTitleChange = (e: any) => {
        this.setState({ title: e.target.value });
    }

    handleSummaryChange = (e: any) => {
        this.setState({ summary: e.target.value });
    }

    handleRepoChange = (newValue: { label: string, value: RepoData }) => {
        this.resetRepoAndRemoteState(newValue.value, newValue.value.remotes[0]);
    }

    handleRemoteChange = (newValue: { label: string, value: Remote }) => {
        this.resetRepoAndRemoteState(this.state.repo!.value, newValue.value);
    }

    resetRepoAndRemoteState = (repo: RepoData, remote: Remote) => {
        const remoteBranches = repo.remoteBranches.filter(branch => branch.remote === remote.name);

        const sourceBranch = repo.localBranches[0];
        let destinationBranch = remoteBranches[0];
        if (repo.mainbranch) {
            const mainRemoteBranch = repo.remoteBranches.find(b => b.remote === remote.name && b.name !== undefined && b.name.indexOf(repo.mainbranch!) !== -1);
            destinationBranch = mainRemoteBranch ? mainRemoteBranch : destinationBranch;
        }

        this.setState({
            repo: { label: repo.uri.split('/').pop()!, value: repo },
            remote: { label: remote.name, value: remote },
            sourceBranch: { label: sourceBranch.name!, value: sourceBranch },
            destinationBranch: { label: destinationBranch.name!, value: destinationBranch }
        }, this.handleBranchChange);
    }

    handleSourceBranchChange = (newValue: any) => {
        this.setState({ sourceBranch: newValue }, this.handleBranchChange);
    }

    handleDestinationBranchChange = (newValue: any) => {
        this.setState({ destinationBranch: newValue }, this.handleBranchChange);
    }

    handleBranchChange = () => {
        const sourceRemoteBranchName = this.state.remote && this.state.sourceBranch ? `${this.state.remote.value.name}/${this.state.sourceBranch.value.name}` : undefined;
        this.setState({commits: [], sourceRemoteBranchName: sourceRemoteBranchName});

        if (this.state.repo &&
            this.state.remote &&
            this.state.sourceBranch &&
            this.state.destinationBranch &&
            this.state.sourceBranch.value !== this.state.destinationBranch.value) {

            this.postMessage({
                action: 'fetchDetails',
                repoUri: this.state.repo!.value.uri,
                remote: this.state.remote!.value,
                title: this.state.title,
                summary: this.state.summary,
                sourceBranch: this.state.sourceBranch!.value,
                destinationBranch: this.state.destinationBranch!.value
            });
        }
    }

    handlePushLocalChangesChange = (e: any) => {
        this.setState({pushLocalChanges: e.target.checked});
    }

    handleCreatePR = () => {
        this.setState({isCreateButtonLoading: true});
        this.postMessage({
            action: 'createPullRequest',
            repoUri: this.state.repo!.value.uri,
            remote: this.state.remote!.value,
            title: this.state.title,
            summary: this.state.summary,
            sourceBranch: this.state.sourceBranch!.value,
            destinationBranch: this.state.destinationBranch!.value,
            pushLocalChanges: this.state.pushLocalChanges
        });
    }

    onMessageReceived(e: Receive): void {
        if (isCreatePullRequestResult(e)) {
            this.setState({isCreateButtonLoading: false, commits: [], result: e.url});
        }
        if (isCommitsResult(e)) {
            this.setState({commits: e.commits});
        }
        if (isCreatePRData(e)) {
            this.setState({ data: e });

            if (this.state.repo === undefined && e.repositories.length > 0) {
                const firstRepo = e.repositories[0];
                const firstRemote = firstRepo.remotes[0];
                this.resetRepoAndRemoteState(firstRepo, firstRemote);
            }
        }
    }

    render() {

        const repo = this.state.repo || {label:'', value: emptyRepoData};

        const actionsContent = (
            <InlineFlex>
                <Button className='ak-button' href={
                    repo && repo.value.href
                        ? `${repo.value.href}/pull-requests/new`
                        : `https://bitbucket.org/dashboard/overview`
                }>Create on bitbucket.org...</Button>
            </InlineFlex>
        );

        return (
            <div className='bitbucket-page'>
                <Page>
                    <Grid>
                        <GridColumn medium={12}>
                            <PageHeader actions={actionsContent}>
                                <p>Create pull request</p>
                            </PageHeader>
                        </GridColumn>

                        <GridColumn medium={6}>
                            <VerticalPadding>
                                <label>Repository</label>
                                <Select
                                    options={this.state.data.repositories.map(repo => { return { label: repo.uri.split('/').pop(), value: repo }; })}
                                    onChange={this.handleRepoChange}
                                    placeholder='Loading...'
                                    value={repo} />

                                {repo.value.remotes.length > 1 &&
                                    <React.Fragment>
                                        <label>Remote</label>
                                        <Select
                                            options={repo.value.remotes.map(remote => { return { label: remote.name, value: remote }; })}
                                            onChange={this.handleRemoteChange}
                                            value={this.state.remote} />
                                    </React.Fragment>
                                }
                            </VerticalPadding>
                        </GridColumn>
                        <GridColumn medium={12} />

                        <GridColumn medium={4}>
                            <label>Source branch (local)</label>
                            <Select
                                formatOptionLabel={formatOptionLabel}
                                options={repo.value.localBranches.map(branch => ({ label: branch.name, value: branch }))}
                                onChange={this.handleSourceBranchChange}
                                value={this.state.sourceBranch} />
                        </GridColumn>
                        <GridColumn medium={4}>
                            <label>Source branch (remote)</label>
                            <p>{this.state.sourceRemoteBranchName || 'Select source branch'}</p>
                        </GridColumn>
                        <GridColumn medium={12}>
                            <Checkbox
                                label={'Push latest changes from local to remote branch'}
                                isChecked={this.state.pushLocalChanges}
                                onChange={this.handlePushLocalChangesChange}
                                name="push-local-branch-enabled" />

                            <BranchWarning sourceRemoteBranchName={this.state.sourceRemoteBranchName} remoteBranches={repo.value.remoteBranches}/>
                        </GridColumn>
                        <GridColumn medium={6}>
                            <VerticalPadding>
                                <label>Destination branch</label>
                                <Select
                                    options={this.state.remote
                                        ? repo.value.remoteBranches.filter(branch => branch.remote === this.state.remote!.value.name)
                                            .map(branch => ({ label: branch.name, value: branch }))
                                        : []}
                                    onChange={this.handleDestinationBranchChange}
                                    value={this.state.destinationBranch} />
                            </VerticalPadding>
                        </GridColumn>

                        <GridColumn medium={12}>
                            <CreatePRTitleSummary title={this.state.title} summary={this.state.summary} onTitleChange={this.handleTitleChange} onSummaryChange={this.handleSummaryChange} />
                        </GridColumn>

                        <GridColumn medium={12}>
                            {this.state.result
                                ? <p>Created pull request - <Button apprarance='link' href={this.state.result}>{this.state.result}</Button></p>
                                : <Button className='ak-button' isLoading={this.state.isCreateButtonLoading} onClick={this.handleCreatePR}>Create</Button>
                            }
                        </GridColumn>

                        <GridColumn medium={12}>
                            {this.state.remote && this.state.sourceBranch && this.state.destinationBranch && this.state.commits.length > 0 &&
                                <Panel isDefaultExpanded header={<InlineFlex><h3>Commits</h3><p>{this.state.remote!.value.name}/{this.state.sourceBranch!.label} <Arrow label="" size="small" /> {this.state.destinationBranch!.label}</p></InlineFlex>}>
                                    <Commits type={''} currentBranch={''} commits={this.state.commits} />
                                </Panel>
                            }
                        </GridColumn>
                    </Grid>
                </Page>
            </div>
        );
    }
}