import * as React from 'react';
import Button from '@atlaskit/button';
import TableTree from '@atlaskit/table-tree';
import Tooltip from '@atlaskit/tooltip';
import Lozenge from "@atlaskit/lozenge";
import { MinimalIssueOrKeyAndSiteOrKey, IssueLinkIssue } from '../../../jira/jira-client/model/entities';

type ItemData = { issue: IssueLinkIssue, onIssueClick: (issueOrKey: MinimalIssueOrKeyAndSiteOrKey) => void };

const colorToLozengeAppearanceMap = {
    neutral: 'default',
    purple: 'new',
    blue: 'inprogress',
    red: 'removed',
    yellow: 'moved',
    green: 'success',
};

const IssueKey = (data: ItemData) =>
    <div className='ac-flex-space-between'>
        <div style={{ width: '16px', height: '16px' }}><Tooltip content={data.issue.issuetype.name}><img src={data.issue.issuetype.iconUrl} /></Tooltip></div>
        <Button appearance="subtle-link" onClick={() => data.onIssueClick(data.issue.key)}>
            {data.issue.key}
        </Button>
    </div>;
const Summary = (data: ItemData) => <p style={{ display: "inline" }}>{data.issue.summary}</p>;
const Priority = (data: ItemData) => <div style={{ width: '16px', height: '16px' }}><Tooltip content={data.issue.priority.name}><img src={data.issue.priority.iconUrl} /></Tooltip></div>;
const StatusColumn = (data: ItemData) => <p style={{ display: "inline" }}><Lozenge appearence={colorToLozengeAppearanceMap[data.issue.status.statusCategory.colorName]}>{data.issue.status.name}</Lozenge></p>;

export default class IssueList extends React.Component<{ issues: IssueLinkIssue[], onIssueClick: (issueOrKey: MinimalIssueOrKeyAndSiteOrKey) => void }, {}> {
    constructor(props: any) {
        super(props);
    }

    render() {
        return (
            <TableTree
                columns={[IssueKey, Summary, Priority, StatusColumn]}
                columnWidths={['150px', '100%', '20px', '150px']}
                items={this.props.issues.map(issue => {
                    return {
                        id: issue.key,
                        content: {
                            issue: issue,
                            onIssueClick: this.props.onIssueClick
                        }
                    };
                })}
            />
        );
    }
}