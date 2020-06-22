import { Container } from '@material-ui/core';
import React from 'react';
import { PullRequestDetailsControllerContext, usePullRequestDetailsController } from './pullRequestDetailsController';

//const useStyles = makeStyles((theme: Theme) => ({}));

export const PullRequestDetailsPage: React.FunctionComponent = () => {
    //const classes = useStyles();
    const [state, controller] = usePullRequestDetailsController();
    console.log(state);

    return (
        <PullRequestDetailsControllerContext.Provider value={controller}>
            <Container maxWidth="xl">{/* Page contents go here */}</Container>
        </PullRequestDetailsControllerContext.Provider>
    );
};

export default PullRequestDetailsPage;
