import * as React from 'react';
import Button from '@atlaskit/button';
import Page, { Grid, GridColumn } from '@atlaskit/page';
import PageHeader from '@atlaskit/page-header';
import Panel from '@atlaskit/panel';
import { WebviewComponent } from '../WebviewComponent';
import { CreatePRData, CreatePullRequestResult, isCreatePullRequestResult, isCreatePRData, CommitsResult, isCommitsResult } from '../../../ipc/prMessaging';
import { InlineFlex, VerticalSpacer, TextFieldStyles, TextAreaStyles } from '../styles';
import Select from '@atlaskit/select';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import Tooltip from '@atlaskit/tooltip';
import { CheckoutCommand, CreatePullRequest, FetchDetails } from '../../../ipc/prActions';
import Commits from './Commits';

type Emit = CheckoutCommand | CreatePullRequest | FetchDetails;
type Receive = CreatePRData | CreatePullRequestResult | CommitsResult;

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
                            fontStyle: 'italic',
                        }}
                    >
                        <InlineFlex>
                            {`tracking upstream ${option.value.upstream ? option.value.upstream.remote + '/' + option.value.upstream.name : 'none'}`}
                            <Tooltip content={`ahead by ${option.value.ahead} commits, behind by ${option.value.behind} commits`}>
                                <div>↑ {option.value.ahead} ↓ {option.value.behind}</div>
                            </Tooltip>
                        </InlineFlex>
                    </div>
                ) : null}
            </div>
        );
    }
    return option.label;
};

export default class CreatePullRequestPage extends WebviewComponent<Emit, Receive, {}, {data: CreatePRData, title: string, summary: string, repo?: any, sourceBranch?: any, destinationBranch?: any, commits: Bitbucket.Schema.Commit[], isCreateButtonLoading: boolean, result?: string}> {
    constructor(props: any) {
        super(props);
        this.state = { data: {type: 'createPullRequest', repositories: []}, title: 'Pull request title', summary: '', commits: [], isCreateButtonLoading: false };
    }

    handleTitleChange = (e: any) => {
        this.setState({ title: e.target.value });
    }

    handleSummaryChange = (e: any) => {
        this.setState({ summary: e.target.value });
    }

    handleCheckout = () => {
        this.postMessage({
            action: 'checkoutCommand'
        });
    }

    handleRepoChange = (newValue: any) => {
        this.setState({ repo: newValue });
        this.handleSourceBranchChange(null);
        this.handleDestinationBranchChange(null);
    }

    handleSourceBranchChange = (newValue: any) => {
        this.setState({ sourceBranch: newValue }, this.handleBranchChange);
    }

    handleDestinationBranchChange = (newValue: any) => {
        this.setState({ destinationBranch: newValue }, this.handleBranchChange);
    }

    handleBranchChange = () => {
        if (this.state.repo && this.state.sourceBranch && this.state.destinationBranch && this.state.sourceBranch.value !== this.state.destinationBranch.value) {
            this.postMessage({
                action: 'fetchDetails',
                repoUri: this.state.repo!.value,
                title: this.state.title,
                summary: this.state.summary,
                sourceBranch: this.state.sourceBranch!.value,
                destinationBranch: this.state.destinationBranch!.value
            });
        } else {
            this.setState({commits: []});
        }
    }

    handleCreatePR = () => {
        this.setState({isCreateButtonLoading: true});
        this.postMessage({
            action: 'createPullRequest',
            repoUri: this.state.repo!.value,
            title: this.state.title,
            summary: this.state.summary,
            sourceBranch: this.state.sourceBranch!.value,
            destinationBranch: this.state.destinationBranch!.value
        });
    }

    onMessageReceived(e: Receive): void {
        if (isCreatePullRequestResult(e)) {
            this.setState({isCreateButtonLoading: false, result: e.url});
        }
        if (isCommitsResult(e)) {
            this.setState({commits: e.commits});
        }
        if (isCreatePRData(e)) {
            this.setState({ data: e });

            if (this.state.repo === undefined && e.repositories.length > 0) {
                const firstRepo = e.repositories[0];
                const sourceBranch = firstRepo.branches[0];
                let destinationBranch = firstRepo.branches[0];
                if (firstRepo.mainbranch) {
                    destinationBranch = firstRepo.branches.find(b => b.name === firstRepo.mainbranch) || destinationBranch;
                }
                this.setState({
                    repo: { label: firstRepo.uri.split('/').pop(), value: firstRepo.uri },
                    sourceBranch: { label: sourceBranch.name, value: sourceBranch },
                    destinationBranch: { label: destinationBranch.name, value: destinationBranch }
                });
            }
        }
    }

    render() {
        const actionsContent = (
            <InlineFlex>
                <Button className='ak-button' onClick={this.handleCheckout}>Checkout</Button>
            </InlineFlex>
        );

        return (
            <div className='bitbucket-page'>
                <Page>
                    <Grid>
                        <GridColumn>
                            <PageHeader actions={actionsContent}>
                                <p>Create pull request</p>
                            </PageHeader>

                            <label htmlFor="title">Title</label>
                            <Textfield name="title" defaultValue="Pull request title" onChange={this.handleTitleChange} isInvalid={!this.state.title || this.state.title.trim().length === 0}
                                theme={(theme:any, props:any) => ({
                                    ...theme(props),
                                    ...TextFieldStyles
                                  })
                                }
                            />

                            <label>Summary</label>
                            <TextArea onChange={this.handleSummaryChange}
                                theme={(theme:any, props:any) => ({
                                    ...theme(props),
                                    ...TextAreaStyles
                                  })
                                }/>

                            <VerticalSpacer />
                            <label>Repository</label>
                            <Select
                                className="single-select"
                                classNamePrefix="react-select" 
                                options={this.state.data.repositories.map(repo => { return {label: repo.uri.split('/').pop(), value: repo.uri}; })} 
                                onChange={this.handleRepoChange}
                                placeholder='Loading...'
                                value={this.state.repo} />

                            <div>
                                <label>Source branch</label>
                                <Select
                                    formatOptionLabel={formatOptionLabel}
                                    className="single-select"
                                    classNamePrefix="react-select"
                                    options={
                                        this.state.repo
                                            ? this.state.data.repositories.find(repo => repo.uri === this.state.repo!.value)!.branches.map(branch => {
                                                return {
                                                    label: `${branch.name}`,
                                                    value: branch
                                                };
                                            })
                                            : []
                                    }
                                    onChange={this.handleSourceBranchChange}
                                    value={this.state.sourceBranch} />

                                <label>Destination branch</label>
                                <Select
                                    className="single-select"
                                    classNamePrefix="react-select"
                                    options={this.state.repo ? this.state.data.repositories.find(repo => repo.uri === this.state.repo!.value)!.branches.map(branch => { return { label: branch.name, value: branch }; }) : []}
                                    onChange={this.handleDestinationBranchChange}
                                    value={this.state.destinationBranch} />
                            </div>

                            {this.state.commits.length > 0 &&
                                <Panel isDefaultExpanded header={<h3>Commits</h3>}>
                                    <Commits type={''} currentBranch={''} commits={this.state.commits} />
                                </Panel>
                            }
                            {
                                this.state.result
                                    ? <p>Created pull request - <Button apprarance='link' href={this.state.result}>{this.state.result}</Button></p>
                                    : <Button className='ak-button' isLoading={this.state.isCreateButtonLoading} onClick={this.handleCreatePR}>Create</Button>
                            }
                        </GridColumn>
                    </Grid>
                </Page>
            </div>
        );
    }
}