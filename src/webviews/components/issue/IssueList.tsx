import * as React from 'react';
import Button from '@atlaskit/button';
import TableTree from '@atlaskit/table-tree';
import Tooltip from '@atlaskit/tooltip';
import Lozenge from "@atlaskit/lozenge";
import { OpenJiraIssueAction } from '../../../ipc/issueActions';
import { MinimalIssue } from '../../../jira/jira-client/model/entities';


type ItemData = { issue: MinimalIssue, postMessage: (e: OpenJiraIssueAction) => void };

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
        <div style={{ width: '16px', height: '16px' }}><Tooltip content={data.issue.issueType.name}><img src={data.issue.issueType.iconUrl} /></Tooltip></div>
        <Button appearance="subtle-link" onClick={() => data.postMessage({ action: 'openJiraIssue', issueOrKey: data.issue })}>
            {data.issue.key}
        </Button>
    </div>;
const Summary = (data: ItemData) => <p style={{ display: "inline" }}>{data.issue.summary}</p>;
const Priority = (data: ItemData) => <div style={{ width: '16px', height: '16px' }}><Tooltip content={data.issue.priority.name}><img src={data.issue.priority.iconUrl} /></Tooltip></div>;
const StatusColumn = (data: ItemData) => <p style={{ display: "inline" }}><Lozenge appearence={colorToLozengeAppearanceMap[data.issue.status.statusCategory.colorName]}>{data.issue.status.name}</Lozenge></p>;

export default class IssueList extends React.Component<{ issues: MinimalIssue[], postMessage: (e: OpenJiraIssueAction) => void }, {}> {
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
                            postMessage: this.props.postMessage
                        }
                    };
                })}
            />
        );
    }
}