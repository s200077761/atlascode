import { Button, Grid, Typography } from '@material-ui/core';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import ErrorIcon from '@material-ui/icons/Error';
import ScheduleIcon from '@material-ui/icons/Schedule';
import * as React from 'react';
import { BuildStatus } from '../../../bitbucket/model';

const successIcon = <CheckCircleIcon style={{ color: 'green' }} />;
const inprogressIcon = <ScheduleIcon style={{ color: 'blue' }} />;
const errorIcon = <ErrorIcon style={{ color: 'red' }} />;

type PRBuildStatusProps = {
    buildStatuses: BuildStatus[];
    openBuildStatus: (buildStatus: BuildStatus) => void;
};

export const PRBuildStatus: React.FunctionComponent<PRBuildStatusProps> = ({ buildStatuses, openBuildStatus }) => {
    return (
        <Grid container direction="column" spacing={1}>
            {buildStatuses.map((status) => (
                <Grid item key={status.url}>
                    <Button
                        onClick={() => openBuildStatus(status)}
                        color={'primary'}
                        startIcon={
                            status.state === 'INPROGRESS'
                                ? inprogressIcon
                                : status.state === 'SUCCESSFUL'
                                ? successIcon
                                : errorIcon
                        }
                    >
                        <Typography variant={'button'}>{status.name}</Typography>
                    </Button>
                </Grid>
            ))}
        </Grid>
    );
};
