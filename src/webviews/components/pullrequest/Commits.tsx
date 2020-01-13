import Button from '@atlaskit/button';
import TableTree from '@atlaskit/table-tree';
import Tooltip from '@atlaskit/tooltip';
import * as React from 'react';
import distanceInWordsToNow from 'date-fns/distance_in_words_to_now';
import differenceInWeeks from 'date-fns/difference_in_weeks';
import format from 'date-fns/format';
import { Commit } from '../../../bitbucket/model';

const style = { fontFamily: 'monospace' };

type ColumnProps = { ts: string; href: string; hash: string; message: string };

const Hash = (props: ColumnProps) => (
    <Button appearance="subtle-link" href={props.href}>
        <span style={style}>{props.hash}</span>
    </Button>
);
const Message = (props: ColumnProps) => (
    <Tooltip content={props.message}>
        <p style={{ display: 'inline' }}>{props.message.trim().split('\n')[0]}</p>
    </Tooltip>
);
const Timestamp = (props: ColumnProps) => {
    const d = new Date(props.ts);
    const isLessThanWeekAgo = differenceInWeeks(d, new Date()) === 0;
    return (
        <Tooltip content={d.toLocaleString()}>
            <p>{isLessThanWeekAgo ? distanceInWordsToNow(d, { addSuffix: true }) : format(d, 'YYYY-MM-DD')}</p>
        </Tooltip>
    );
};

export const Commits: React.FunctionComponent<{ commits: Commit[] }> = props => {
    const commitsData = props.commits.map(commit => {
        return {
            hash: commit.hash,
            message: commit.message,
            href: commit.url,
            ts: commit.ts
        };
    });

    return (
        <TableTree
            columns={[Hash, Message, Timestamp]}
            columnWidths={['120px', '100%', '180px']}
            items={commitsData.map(c => {
                const props: ColumnProps = {
                    hash: c.hash.substring(0, 8),
                    message: c.message,
                    href: c.href,
                    ts: c.ts
                };
                return { id: c.hash, content: props };
            })}
        />
    );
};
