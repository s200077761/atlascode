import * as React from "react";
import Page, { Grid, GridColumn } from '@atlaskit/page';
import PageHeader from '@atlaskit/page-header';
import SizeDetector from "@atlaskit/size-detector";
import { BreadcrumbsStateless, BreadcrumbsItem } from '@atlaskit/breadcrumbs';
import Spinner from '@atlaskit/spinner';
import Tooltip from '@atlaskit/tooltip';
import Panel from '@atlaskit/panel';
import Avatar, { AvatarItem } from "@atlaskit/avatar";
import Tag from "@atlaskit/tag";
import PriorityTrivialIcon from '@atlaskit/icon-priority/glyph/priority-trivial';
import PriorityBlockerIcon from '@atlaskit/icon-priority/glyph/priority-blocker';
import PriorityMajorIcon from '@atlaskit/icon-priority/glyph/priority-major';
import PriorityMinorIcon from '@atlaskit/icon-priority/glyph/priority-minor';
import PriorityCriticalIcon from '@atlaskit/icon-priority/glyph/priority-critical';
import LightbulbFilledIcon from '@atlaskit/icon/glyph/lightbulb-filled';
import TaskIcon from '@atlaskit/icon/glyph/task';
import Bug16Icon from '@atlaskit/icon-object/glyph/bug/16';
import Improvement16Icon from '@atlaskit/icon-object/glyph/improvement/16';
import { BitbucketIssueData } from "../../../ipc/bitbucketIssueMessaging";
import { WebviewComponent } from "../WebviewComponent";
import NavItem from "../issue/NavItem";
import Comments from "../pullrequest/Comments";
import CommentForm from "../pullrequest/CommentForm";
import { PostComment, CopyBitbucketIssueLink, PostChange, AssignToMe, OpenStartWorkPageAction, CreateJiraIssueAction } from "../../../ipc/bitbucketIssueActions";
import { StatusMenu } from "./StatusMenu";
import Button, { ButtonGroup } from "@atlaskit/button";
import VidRaisedHandIcon from '@atlaskit/icon/glyph/vid-raised-hand';
import OpenIcon from '@atlaskit/icon/glyph/open';
import { HostErrorMessage } from "../../../ipc/messaging";
import { RefreshIssueAction } from "../../../ipc/issueActions";
import Offline from "../Offline";
import ErrorBanner from "../ErrorBanner";

type SizeMetrics = {
    width: number;
    height: number;
};

const priorityIcon = {
    trivial: <PriorityTrivialIcon label='trivial' />,
    minor: <PriorityMinorIcon label='minor' />,
    major: <PriorityMajorIcon label='major' />,
    critical: <PriorityCriticalIcon label='critical' />,
    blocker: <PriorityBlockerIcon label='blocker' />
};

const typeIcon = {
    bug: <Bug16Icon label='bug' />,
    enhancement: <Improvement16Icon label='enhancement' />,
    proposal: <LightbulbFilledIcon label='proposal' primaryColor='0xFFAB00' />,
    task: <TaskIcon label='task' primaryColor='0x2684FF' />
};

type Emit = PostComment
    | PostChange
    | CopyBitbucketIssueLink
    | AssignToMe
    | RefreshIssueAction
    | OpenStartWorkPageAction
    | CreateJiraIssueAction;

type Receive = BitbucketIssueData | HostErrorMessage;

type MyState = {
    data: BitbucketIssueData;
    isStatusButtonLoading: boolean;
    isAnyCommentLoading: boolean;
    isErrorBannerOpen: boolean;
    isOnline: boolean;
    errorDetails: any;
};

const emptyIssueData = {
    type: "updateBitbucketIssue",
    issue: { type: "" },
    currentUser: {
        accountId: '',
        displayName: '',
        url: '',
        avatarUrl: ''
    },
    comments: [],
    hasMore: false,
    showJiraButton: false,
};

const emptyState = {
    data: emptyIssueData,
    isStatusButtonLoading: false,
    isAnyCommentLoading: false,
    isErrorBannerOpen: false,
    isOnline: true,
    errorDetails: undefined
};

export default class BitbucketIssuePage extends WebviewComponent<Emit, Receive, {}, MyState> {
    constructor(props: any) {
        super(props);
        this.state = emptyState;
    }

    public onMessageReceived(e: any) {
        switch (e.type) {
            case 'error': {
                this.setState({ isStatusButtonLoading: false, isAnyCommentLoading: false, isErrorBannerOpen: true, errorDetails: e.reason });
                break;
            }
            case 'updateBitbucketIssue': {
                this.setState({ data: e, isStatusButtonLoading: false, isAnyCommentLoading: false });
                break;
            }
            case 'onlineStatus': {
                let data = e.isOnline ? emptyState : this.state;
                this.setState({ ...data, ...{ isOnline: e.isOnline } });

                if (e.isOnline) {
                    this.postMessage({ action: 'refreshIssue' });
                }

                break;
            }
        }

    }

    handleCopyLink = () => this.postMessage({ action: 'copyBitbucketIssueLink' });

    handleAssign = () => this.postMessage({ action: 'assign' });

    handleStatusChange = (newStatus: string, content?: string) => {
        this.setState({ isStatusButtonLoading: true });
        this.postMessage({ action: 'change', newStatus: newStatus, content: content });
    }
    handlePostComment = (content: string) => {
        this.setState({ isAnyCommentLoading: true });
        this.postMessage({ action: 'comment', content: content });
    }

    handleDismissError = () => {
        this.setState({ isErrorBannerOpen: false, errorDetails: undefined });
    }

    renderDetails(issue: Bitbucket.Schema.Issue) {
        return <div style={{ padding: '2em' }}>
            <h3>Status</h3>
            <StatusMenu issue={issue} isStatusButtonLoading={this.state.isStatusButtonLoading} onHandleStatusChange={(newStatus: string) => this.handleStatusChange(newStatus)} />
            <h3>Type</h3>
            <div className='ac-inline-flex-hpad'>{typeIcon[issue.kind!]}<span style={{ paddingLeft: '1em' }}>{issue.kind}</span></div>
            <h3>Priority</h3>
            <div className='ac-inline-flex-hpad'>{priorityIcon[issue.priority!]}<span style={{ paddingLeft: '1em' }}>{issue.priority}</span></div>
            <h3>Assignee</h3>
            <Tooltip content={issue.assignee ? issue.assignee.display_name : 'Unassigned'}>
                <AvatarItem
                    avatar={<Avatar size='small' src={issue.assignee ? issue.assignee.links!.avatar!.href! : null} />}
                    primaryText={issue.assignee ? issue.assignee.display_name : 'Unassigned'}
                />
            </Tooltip>
            {!(issue.assignee && issue.assignee!.account_id === this.state.data!.currentUser.accountId) &&
                <Button appearance='subtle' onClick={this.handleAssign} iconBefore={<VidRaisedHandIcon label='assign-to-me' />}>Assign to me</Button>}
            <h3>Reporter</h3>
            <Tooltip content={issue.reporter ? issue.reporter.display_name : 'Unknown'}>
                <AvatarItem
                    avatar={<Avatar size='small' src={issue.reporter ? issue.reporter.links!.avatar!.href! : null} />}
                    primaryText={issue.reporter ? issue.reporter.display_name : 'Unknown'}
                />
            </Tooltip>
            <h3>Votes</h3>
            <Tag text={issue.votes} />
            <h3>Watchers</h3>
            <Tag text={issue.watches} />
        </div >;
    }

    render() {
        const issue = this.state.data.issue as Bitbucket.Schema.Issue;

        if (!issue.repository && !this.state.isErrorBannerOpen && this.state.isOnline) {
            return <Tooltip content='waiting for data...'><Spinner delay={500} size='large' /></Tooltip>;
        } else if (!issue.repository && !this.state.isOnline) {
            return <div><Offline /></div>;
        }


        return (
            <Page>
                {!this.state.isOnline &&
                    <Offline />
                }
                <SizeDetector>
                    {({ width }: SizeMetrics) => {
                        return <Grid>
                            <GridColumn medium={width > 800 ? 9 : 12}>
                                {this.state.isErrorBannerOpen &&
                                    <ErrorBanner onDismissError={this.handleDismissError} errorDetails={this.state.errorDetails} />
                                }
                                <PageHeader
                                    actions={<ButtonGroup>
                                        <Button className='ac-button' onClick={() => this.postMessage({ action: 'openStartWorkPage', issue: issue })}>Start work on issue...</Button>
                                        {this.state.data.showJiraButton &&
                                            <Button className='ac-button' onClick={() => this.postMessage({ action: 'createJiraIssue', issue: issue })}>Create Jira Issue</Button>
                                        }
                                    </ButtonGroup>}
                                    breadcrumbs={<BreadcrumbsStateless onExpand={() => { }}>
                                        <BreadcrumbsItem component={() => <NavItem text={issue.repository!.name!} href={issue.repository!.links!.html!.href} />} />
                                        <BreadcrumbsItem component={() => <NavItem text='Issues' href={`${issue.repository!.links!.html!.href}/issues`} />} />
                                        <BreadcrumbsItem component={() => <NavItem text={`Issue #${issue.id}`} href={issue.links!.html!.href} onCopy={this.handleCopyLink} />} />
                                    </BreadcrumbsStateless>}
                                >
                                    <p>{issue.title}</p>
                                </PageHeader>
                                <p dangerouslySetInnerHTML={{ __html: issue.content!.html! }} />

                                {width <= 800 && this.renderDetails(issue)}

                                <Panel isDefaultExpanded header={<h3>Comments</h3>} >
                                    {this.state.data!.hasMore &&
                                        <div className='ac-vpadding' style={{ textAlign: 'center' }}>
                                            <Button appearance='subtle' href={issue.links!.html!.href} iconAfter={<OpenIcon label='open-previous' />}>See previous comments</Button>
                                        </div>
                                    }
                                    <Comments comments={this.state.data!.comments} currentUser={this.state.data!.currentUser} isAnyCommentLoading={this.state.isAnyCommentLoading} onComment={undefined} />
                                    <CommentForm currentUser={this.state.data!.currentUser!} visible={true} isAnyCommentLoading={this.state.isAnyCommentLoading} onSave={this.handlePostComment} />
                                </Panel>
                            </GridColumn>

                            {width > 800 &&
                                <GridColumn medium={3}>
                                    {this.renderDetails(issue)}
                                </GridColumn>
                            }
                        </Grid>;
                    }}
                </SizeDetector>
            </Page>
        );
    }
}
