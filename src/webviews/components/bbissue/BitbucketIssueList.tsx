import * as React from 'react';
import Button from '@atlaskit/button';
import Tooltip from '@atlaskit/tooltip';
import TableTree from '@atlaskit/table-tree';
import { StateRenderer } from './StatusMenu';
import { OpenBitbucketIssueAction } from '../../../ipc/bitbucketIssueActions';
import { BitbucketIssueData } from '../../../bitbucket/model';
import { Remote } from '../../../typings/git';

type ItemData = { repoUri: string, remote: Remote, issue: BitbucketIssueData, postMessage: (e: OpenBitbucketIssueAction) => void };

const IssueKey = (data: ItemData) =>
    <div className='ac-flex-space-between'>
        <Button appearance="subtle-link" onClick={() => data.postMessage({ action: 'openBitbucketIssue', repoUri: data.repoUri, remote: data.remote, issue: data.issue })}>
            #{data.issue.id}
        </Button>
    </div>;
const Summary = (data: ItemData) => <p style={{ display: "inline" }}>{data.issue.title}</p>;
const Priority = (data: ItemData) => <Tooltip content={`priority: ${data.issue.priority}`}><p>{data.issue.priority}</p></Tooltip>;
const StatusColumn = (data: ItemData) => <p style={{ display: "inline" }}>{StateRenderer[data.issue.state!]}</p>;

export default class BitbucketIssueList extends React.Component<{ repoUri: string, remote: Remote, issues: BitbucketIssueData[], postMessage: (e: OpenBitbucketIssueAction) => void }, {}> {
    constructor(props: any) {
        super(props);
    }

    render() {
        return (
            <TableTree
                columns={[IssueKey, Summary, Priority, StatusColumn]}
                columnWidths={['100px', '100%', '60px', '150px']}
                items={this.props.issues.map(issue => {
                    return {
                        id: issue.id,
                        content: {
                            repoUri: this.props.repoUri,
                            remote: this.props.remote,
                            issue: issue,
                            postMessage: this.props.postMessage
                        }
                    };
                })}
            />
        );
    }
}