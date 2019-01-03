import * as React from 'react';
import Button from '@atlaskit/button';
import TableTree from '@atlaskit/table-tree';
import Tooltip from '@atlaskit/tooltip';
import { Status } from '@atlaskit/status';
import { Issue } from '../../../jira/jiraModel';
import { OpenJiraIssueAction } from '../../../ipc/issueActions';
import { InlineFlex } from '../styles';

type ItemData = { issue: Issue, postMessage: (e: OpenJiraIssueAction) => void};

const IssueKey = (data: ItemData) =>
    <InlineFlex>
        <div style={{ width: '16px', height: '16px' }}><Tooltip content={data.issue.issueType.name}><img src={data.issue.issueType.iconUrl} /></Tooltip></div>
        <Button appearance="subtle-link" onClick={() => data.postMessage({ action: 'openJiraIssue', issue: data.issue })}>
            {data.issue.key}
        </Button>
    </InlineFlex>;
const Summary = (data: ItemData) => <p style={{ display: "inline" }}>{data.issue.summary}</p>;
const Priority = (data: ItemData) => <div style={{ width: '16px', height: '16px' }}><Tooltip content={data.issue.priority.name}><img src={data.issue.priority.iconUrl} /></Tooltip></div>;
const StatusColumn = (data: ItemData) => <p style={{ display: "inline"}}><Status text={data.issue.status.name} color={data.issue.status.statusCategory.colorName} /></p>;

export default class IssueList extends React.Component<{issues: Issue[], postMessage: (e: OpenJiraIssueAction) => void}, {}> {
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