import { Box, Grid } from '@material-ui/core';
import React from 'react';
import { DetailedSiteInfo, Product } from '../../../../atlclients/authInfo';
import { CloudAuthButton } from './CloudAuthButton';
import { CustomAuthDialogButton } from './CustomAuthDialogButton';
import { SiteList } from './SiteList';

type SiteAuthenticatorProps = {
    product: Product;
    isRemote: boolean;
    sites: DetailedSiteInfo[];
};

export const SiteAuthenticator: React.FunctionComponent<SiteAuthenticatorProps> = ({ product, isRemote, sites }) => {
    return (
        <Box flexGrow={1}>
            <Grid container direction="column">
                <Grid item>
                    <Grid container spacing={2}>
                        <Grid item>
                            <CloudAuthButton product={product} />
                        </Grid>
                        <Grid item>
                            <CustomAuthDialogButton product={product} />
                        </Grid>
                    </Grid>
                </Grid>
                <Grid item>
                    <SiteList product={product} sites={sites} />
                </Grid>
            </Grid>
        </Box>
    );
};
