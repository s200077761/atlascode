import * as React from 'react';
import Button from '@atlaskit/button';
import TableTree from '@atlaskit/table-tree';
import Tooltip from '@atlaskit/tooltip';
import Lozenge from "@atlaskit/lozenge";
import { MinimalIssueLink, MinimalIssueOrKeyAndSite, IssueLinkIssue } from '../../../jira/jira-client/model/entities';
import { colorToLozengeAppearanceMap } from '../colors';

interface LinkedIssuesProps {
    issuelinks: MinimalIssueLink[];
    onIssueClick: (issueOrKey: MinimalIssueOrKeyAndSite) => void;
    onDelete: (issueLink: any) => void;
}

type ItemData = {
    linkDescription: string,
    issue: IssueLinkIssue,
    onIssueClick: (issueOrKey: MinimalIssueOrKeyAndSite) => void,
    onDelete: (issueLink: any) => void;
};

const IssueKey = (data: ItemData) =>
    <div className='ac-flex-space-between'>
        <p style={{ display: "inline" }}><em style={{ position: 'absolute', bottom: '2.25em' }}>{data.linkDescription}</em></p>
        <div style={{ width: '16px', height: '16px' }}><Tooltip content={data.issue.issuetype.name}><img src={data.issue.issuetype.iconUrl} /></Tooltip></div>
        <Button appearance="subtle-link" onClick={() => data.onIssueClick({ siteDetails: data.issue.siteDetails, key: data.issue.key })}>
            {data.issue.key}
        </Button>
    </div>;
const Summary = (data: ItemData) => <p style={{ display: "inline" }}>{data.issue.summary}</p>;
const Priority = (data: ItemData) => <div style={{ width: '16px', height: '16px' }}><Tooltip content={data.issue.priority.name}><img src={data.issue.priority.iconUrl} /></Tooltip></div>;
const StatusColumn = (data: ItemData) => {
    const lozColor: string = colorToLozengeAppearanceMap[data.issue.status.statusCategory.colorName];
    return (<Lozenge appearance={lozColor}>{data.issue.status.name}</Lozenge>);

};
// const Delete = (data: ItemData) => {
//     return (<div className='ac-delete' onClick={() => data.onDelete(data.issue)}>
//         <TrashIcon label='trash' />
//     </div>);
// };

export const LinkedIssues: React.FunctionComponent<LinkedIssuesProps> = ({ issuelinks, onIssueClick, onDelete }) => {
    return (
        <TableTree
            columns={[IssueKey, Summary, Priority, StatusColumn]}
            columnWidths={['150px', '100%', '20px', '150px']}
            items={issuelinks.map(issuelink => {
                return {
                    id: issuelink.id,
                    content: {
                        linkDescription: issuelink.inwardIssue ? issuelink.type.inward : issuelink.type.outward,
                        issue: issuelink.inwardIssue || issuelink.outwardIssue,
                        onIssueClick: onIssueClick,
                        onDelete: onDelete,
                    }
                };
            })}
        />
    );
};