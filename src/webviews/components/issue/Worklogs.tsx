import * as React from 'react';
import TableTree from '@atlaskit/table-tree';
import { Worklog, WorklogContainer } from '../../../jira/jira-client/model/entities';
import Avatar from '@atlaskit/avatar';

type ItemData = { worklog: Worklog };

const Comment = (data: ItemData) => <p style={{ display: "inline" }}>{data.worklog.comment}</p>;
const TimeSpent = (data: ItemData) => <p style={{ display: "inline" }}>{data.worklog.timeSpent}</p>;
const Author = (data: ItemData) => {
    let avatar = (data.worklog.author.avatarUrls && data.worklog.author.avatarUrls['16x16']) ? data.worklog.author.avatarUrls['16x16'] : '';
    return (
        <div className='ac-flex'><Avatar size='small' borderColor='var(--vscode-dropdown-foreground)!important' src={avatar} /><span style={{ marginLeft: '4px' }}>{data.worklog.author.displayName}</span></div>
    );
};


export default class Worklogs extends React.Component<{ worklogs: WorklogContainer }, {}> {
    constructor(props: any) {
        super(props);
    }

    render() {
        return (
            <TableTree
                columns={[Author, Comment, TimeSpent]}
                columnWidths={['100%', '100%', '150px']}
                items={this.props.worklogs.worklogs.map(worklog => {
                    return {
                        id: worklog.id,
                        content: {
                            worklog: worklog,
                        }
                    };
                })}
            />
        );
    }
}