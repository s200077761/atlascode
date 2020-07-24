import { Avatar, Box, Chip, Tooltip } from '@material-ui/core';
import ArrowRightAltIcon from '@material-ui/icons/ArrowRightAlt';
import * as React from 'react';
import { Repo, User } from '../../../bitbucket/model';

type BranchInfoProps = {
    source: { repo: Repo; branchName: string; commitHash: string };
    destination: { repo: Repo; branchName: string; commitHash: string };
    author: User;
};

export const BranchInfo: React.FunctionComponent<BranchInfoProps> = ({ source, destination, author }) => {
    let sourcePrefix = '';
    let destinationPrefix = '';
    if (source.repo.url !== destination.repo.url) {
        sourcePrefix = source.repo.fullName + ':';
        destinationPrefix = destination.repo.fullName + ':';
    }

    const sourceBranch = sourcePrefix + source.branchName;
    const targetBranch = destinationPrefix + destination.branchName;

    return (
        <React.Fragment>
            <Box style={{ display: 'flex', alignItems: 'center' }}>
                <Chip
                    avatar={
                        <Tooltip title={author.displayName}>
                            <Avatar alt={author.displayName} src={author.avatarUrl} />
                        </Tooltip>
                    }
                    color="primary"
                    label={sourceBranch}
                />
                <ArrowRightAltIcon />
                <Chip color="primary" label={targetBranch} />
            </Box>
        </React.Fragment>
    );
};
