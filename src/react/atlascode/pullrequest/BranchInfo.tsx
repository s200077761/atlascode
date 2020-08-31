import { Chip, CircularProgress, Grid } from '@material-ui/core';
import ArrowRightAltIcon from '@material-ui/icons/ArrowRightAlt';
import * as React from 'react';
import { Repo, User } from '../../../bitbucket/model';

type BranchInfoProps = {
    source: { repo: Repo; branchName: string; commitHash: string };
    destination: { repo: Repo; branchName: string; commitHash: string };
    author: User;
    isLoading?: boolean;
};

export const BranchInfo: React.FunctionComponent<BranchInfoProps> = ({ source, destination, author, isLoading }) => {
    let sourcePrefix = '';
    let destinationPrefix = '';
    if (source.repo.url !== destination.repo.url) {
        sourcePrefix = source.repo.fullName + ':';
        destinationPrefix = destination.repo.fullName + ':';
    }

    const sourceBranch = sourcePrefix + source.branchName;
    const targetBranch = destinationPrefix + destination.branchName;

    return isLoading ? (
        <CircularProgress />
    ) : (
        <Grid container spacing={1} direction={'row'} justify="space-evenly" alignItems="center">
            <Grid item>
                <Chip clickable color="primary" label={sourceBranch} />
            </Grid>
            <Grid item>
                <ArrowRightAltIcon />
            </Grid>
            <Grid item>
                <Chip clickable color="primary" label={targetBranch} />
            </Grid>
        </Grid>
    );
};
