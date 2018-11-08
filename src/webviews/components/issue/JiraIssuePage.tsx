import * as React from 'react';
import { BreadcrumbsStateless, BreadcrumbsItem } from '@atlaskit/breadcrumbs';
import DropdownMenu, { DropdownItemGroup, DropdownItem } from '@atlaskit/dropdown-menu';
import Lozenge from '@atlaskit/lozenge';
import Arrow from '@atlaskit/icon/glyph/arrow-right';
import styled from 'styled-components';
import Page, { Grid, GridColumn } from '@atlaskit/page';
import { WebviewComponent } from '../WebviewComponent';
import { IssueData } from '../../../ipc/issueMessaging';
import { Action, Alert } from '../../../ipc/messaging';
import { JiraIssue } from '../../../jira/jiraIssue';

type Emit = Action | Alert;
const emptyIssueData:IssueData =  {
    type:'',
    key: '',
    id: '',
    self: '',
    description: '',
    summary: '',
    status: JiraIssue.emptyStatus,
    issueType: JiraIssue.emptyIssueType,
    reporter: JiraIssue.emptyUser,
    assignee: JiraIssue.emptyUser,
    comments: [],
    labels: [],
    attachments: [],
    transitions: []
};

export default class JiraIssuePage extends WebviewComponent<Emit, IssueData, {},IssueData> {
    constructor(props: any) {
        super(props);
        this.state = emptyIssueData;
    }

    componentUpdater = (data: IssueData) => { };

    public onMessageReceived(e: IssueData) {
        console.log("got message from vscode", e);
        this.state = e;
        this.componentUpdater(e);
    }

    componentWillMount() {
        this.componentUpdater = (data) => { 
            this.setState(data); 
        };
    }

    onStatusClick(item:any) {
        console.log("got item",item);
    }
    render() {
        const issue = this.state;
        const JiraItem = styled.div`
        align-items: center;
        display: flex;
        width: 105px;
        `;
        if (!issue) { return <div></div>; }
        let statusItems:any[] = [];

        issue.transitions.forEach(transition => {
            if(issue.status.id !== transition.to.id){
                statusItems.push(
                    <DropdownItem
                        id={transition.name}
                        onClick={this.onStatusClick(transition)}
                        elemAfter={
                        <JiraItem>
                            <Arrow label="" size="small" />
                            <Lozenge appearance="success">{transition.to.name}</Lozenge>
                        </JiraItem>
                        }>
                        {transition.name}
                    </DropdownItem>
                );
            }
        });

        return (
            <Page>
                <Grid>
                    <GridColumn medium={8}>
                    <BreadcrumbsStateless onExpand={() => {}}>
                        <BreadcrumbsItem text={issue.key} key={issue.key} />
                        <BreadcrumbsItem text="Parent page" key="Parent page" />
                    </BreadcrumbsStateless>
                        <h2>{issue.summary}</h2>
                        <p>{issue.description}</p>
                    </GridColumn>

                    <GridColumn medium={4}>
                        <h2>Status</h2>
                        <DropdownMenu
                            triggerType="button"
                            trigger={issue.status.name}
                            triggerButtonProps={{appearance:'primary'}}
                        >
                            <DropdownItemGroup>
                               {statusItems}
                            </DropdownItemGroup>
                        </DropdownMenu>
                    </GridColumn>
                    
                </Grid>
            </Page>
        );
    }
}