import { RefreshButton } from '@atlassianlabs/guipi-core-components';
import { AppBar, Button, Container, Grid, Paper, Toolbar, Typography } from '@material-ui/core';
import React from 'react';
import { ErrorDisplay } from '../common/ErrorDisplay';
import { PMFDisplay } from '../common/pmf/PMFDisplay';
import { BitbucketIssueControllerContext, useBitbucketIssueController } from './bitbucketIssueController';

const BitbucketIssuePage: React.FunctionComponent = () => {
    const [state, controller] = useBitbucketIssueController();

    return (
        <BitbucketIssueControllerContext.Provider value={controller}>
            <Container maxWidth="xl" hidden={state.issue.data.id === ''}>
                <AppBar position="relative">
                    <Toolbar>
                        <Typography variant="h3">Bitbucket issue</Typography>
                        <RefreshButton loading={state.isSomethingLoading} onClick={controller.refresh} />
                    </Toolbar>
                </AppBar>
                <Grid container spacing={1}>
                    <Grid item xs={12} md={9} lg={10} xl={10}>
                        <Paper>
                            <ErrorDisplay />
                            <PMFDisplay postMessageFunc={controller.postMessage} />
                            <Button>{state.issue.data.id}</Button>
                        </Paper>
                    </Grid>
                </Grid>
            </Container>
        </BitbucketIssueControllerContext.Provider>
    );
};

export default BitbucketIssuePage;
