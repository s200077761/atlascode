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
import { PostComment, CopyBitbucketIssueLink, PostChange, AssignToMe } from "../../../ipc/bitbucketIssueActions";
import { StatusMenu } from "./StatusMenu";
import Button from "@atlaskit/button";
import VidRaisedHandIcon from '@atlaskit/icon/glyph/vid-raised-hand';

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

type Emit = PostComment | PostChange | CopyBitbucketIssueLink | AssignToMe;
type Receive = BitbucketIssueData;

export default class BitbucketIssuePage extends WebviewComponent<Emit, Receive, {}, { data?: BitbucketIssueData, isStatusButtonLoading: boolean }> {
    constructor(props: any) {
        super(props);
        this.state = {
            isStatusButtonLoading: false
        };
    }

    public onMessageReceived(e: any) {
        if (e.type && e.type === 'updateBitbucketIssue') {
            this.setState({ data: e, isStatusButtonLoading: false });
        }
    }

    handleCopyLink = () => this.postMessage({ action: 'copyBitbucketIssueLink' });

    handleAssign = () => this.postMessage({ action: 'assign' });

    handleStatusChange = (newStatus: string, content?: string) => {
        this.setState({ isStatusButtonLoading: true });
        this.postMessage({ action: 'change', newStatus: newStatus, content: content });
    }
    handlePostComment = (content: string) => this.postMessage({ action: 'comment', content: content });

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
            {!(issue.assignee && issue.assignee!.account_id === this.state.data!.currentUser.account_id) &&
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
        if (!this.state.data) {
            return <Tooltip content='waiting for data...'><Spinner delay={500} size='large' /></Tooltip>;
        }

        const issue = this.state.data.issue as Bitbucket.Schema.Issue;
        return (
            <Page>
                <SizeDetector>
                    {({ width }: SizeMetrics) => {
                        return <Grid>
                            <GridColumn medium={width > 800 ? 9 : 12}>
                                <PageHeader
                                    actions={null}
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
                                    <Comments comments={this.state.data!.comments} currentUser={this.state.data!.currentUser} onComment={undefined} />
                                    <CommentForm currentUser={this.state.data!.currentUser!} visible={true} onSave={this.handlePostComment} />
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
