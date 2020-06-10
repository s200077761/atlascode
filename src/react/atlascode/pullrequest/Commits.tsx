import {
    Link,
    makeStyles,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableRow,
    Theme,
    Tooltip,
    Typography,
} from '@material-ui/core';
import { differenceInWeeks, distanceInWordsToNow, format } from 'date-fns';
import React from 'react';
import { Commit } from '../../../bitbucket/model';

const useStyles = makeStyles((theme: Theme) => ({
    monospace: {
        fontFamily: 'monospace',
    },
}));

export const Commits: React.FunctionComponent<{ commits: Commit[] }> = (props) => {
    const classes = useStyles();

    const commitsData = props.commits.map((commit) => {
        return {
            hash: commit.hash,
            message: commit.message,
            href: commit.url,
            ts: new Date(commit.ts),
        };
    });

    return (
        <TableContainer>
            <Table size="small" aria-label="commits list">
                <TableBody>
                    {commitsData.map((row) => (
                        <TableRow key={row.hash}>
                            <TableCell>
                                <Link href={row.href}>
                                    <Typography className={classes.monospace}>{row.hash.substring(0, 8)}</Typography>
                                </Link>
                            </TableCell>
                            <TableCell>
                                <Tooltip title={row.message} placement="bottom-start">
                                    <Typography>{row.message.trim().split('\n')[0]}</Typography>
                                </Tooltip>
                            </TableCell>
                            <TableCell>
                                <Tooltip title={row.ts.toLocaleString()}>
                                    <Typography>
                                        {differenceInWeeks(row.ts, new Date()) === 0
                                            ? distanceInWordsToNow(row.ts, { addSuffix: true })
                                            : format(row.ts, 'YYYY-MM-DD')}
                                    </Typography>
                                </Tooltip>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};
