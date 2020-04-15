import { Grid, makeStyles, Typography } from '@material-ui/core';
import React from 'react';
import { ProductBitbucket, ProductJira } from '../../../atlclients/authInfo';
import { SiteWithAuthInfo } from '../../../lib/ipc/toUI/config';
import { AltCloudAuthButton } from './AltCloudAuthButton';
import { AltServerAuthButton } from './AltServerAuthButton';

const useStyles = makeStyles(theme => ({
    root: {
        flexGrow: 1
    }
}));

type SimpleSiteAuthenticatorProps = {
    enableBitbucket: boolean;
    enableJira: boolean;
    bitbucketSites: SiteWithAuthInfo[];
    jiraSites: SiteWithAuthInfo[];
    onFinished: () => void;
};

export const SimpleSiteAuthenticator: React.FunctionComponent<SimpleSiteAuthenticatorProps> = ({
    enableBitbucket,
    enableJira,
    bitbucketSites,
    jiraSites,
    onFinished
}) => {
    const classes = useStyles();

    if ((!enableJira || jiraSites.length > 0) && (!enableBitbucket || bitbucketSites.length > 0)) {
        onFinished();
    }

    return (
        <div className={classes.root}>
            <Grid container spacing={3}>
                {enableBitbucket && bitbucketSites.length === 0 && (
                    <React.Fragment>
                        <Grid item xs={12}>
                            <Typography variant="h1" align="center">
                                Authenticate with {ProductBitbucket.name}
                            </Typography>
                        </Grid>

                        <Grid item xs={6} alignItems={'flex-end'}>
                            <AltCloudAuthButton product={ProductBitbucket} />
                        </Grid>
                        <Grid item xs={6} alignItems={'flex-end'}>
                            <AltServerAuthButton product={ProductBitbucket} />
                        </Grid>
                    </React.Fragment>
                )}
                {enableJira && (bitbucketSites.length > 0 || !enableBitbucket) && jiraSites.length === 0 && (
                    <React.Fragment>
                        <Grid item xs={12}>
                            <Typography variant="h1" align="center">
                                Authenticate with {ProductJira.name}
                            </Typography>
                        </Grid>

                        <Grid item xs={6} alignItems={'flex-end'}>
                            <AltCloudAuthButton product={ProductJira} />
                        </Grid>
                        <Grid item xs={6} alignItems={'flex-end'}>
                            <AltServerAuthButton product={ProductJira} />
                        </Grid>
                    </React.Fragment>
                )}
                <Grid item xs={12}>
                    <Typography variant="h3" align="center">
                        Additional sites can be added later
                    </Typography>
                </Grid>
            </Grid>
        </div>
    );
};
