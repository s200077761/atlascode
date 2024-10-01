import { Box, Button, Grid, Typography } from '@material-ui/core';
import React, { memo, useCallback, useContext } from 'react';

import { AuthDialogControllerContext } from './useAuthDialog';
import { CloudAuthButton } from './CloudAuthButton';
import DomainIcon from '@material-ui/icons/Domain';
import { Product } from '../../../../atlclients/authInfo';
import { SiteList } from './SiteList';
import { SiteWithAuthInfo } from '../../../../lib/ipc/toUI/config';

type SiteAuthenticatorProps = {
    product: Product;
    isRemote: boolean;
    sites: SiteWithAuthInfo[];
};

export const SiteAuthenticator: React.FunctionComponent<SiteAuthenticatorProps> = memo(
    ({ product, isRemote, sites }) => {
        const authDialogController = useContext(AuthDialogControllerContext);
        const openProductAuth = useCallback(() => {
            authDialogController.openDialog(product, undefined);
        }, [authDialogController, product]);

        const handleEdit = useCallback(
            (swa: SiteWithAuthInfo) => {
                authDialogController.openDialog(product, swa);
            },
            [authDialogController, product],
        );
        const useNewAuth = false;

        return (
            <Box flexGrow={1}>
                <Grid container direction="column" spacing={2}>
                    <Grid item hidden={isRemote === false || useNewAuth}>
                        <Typography>
                            <Box component="span" fontWeight="fontWeightBold">
                                ⚠️ Authentication cannot be done while running remotely
                            </Box>
                        </Typography>
                        <Typography>
                            To authenticate with a new site open this (or another) workspace locally. Accounts added
                            when running locally <em>will</em> be accessible during remote development.
                        </Typography>
                    </Grid>
                    <Grid item style={{ cursor: isRemote && !useNewAuth ? 'not-allowed' : 'default' }}>
                        <Grid
                            container
                            direction="column"
                            spacing={2}
                            style={{
                                pointerEvents: isRemote && !useNewAuth ? 'none' : 'inherit',
                                opacity: isRemote && !useNewAuth ? 0.6 : 'inherit',
                            }}
                        >
                            <Grid item>
                                <Grid container spacing={2}>
                                    <Grid item>
                                        <CloudAuthButton product={product} />
                                    </Grid>
                                    <Grid item>
                                        <Button color="primary" startIcon={<DomainIcon />} onClick={openProductAuth}>
                                            {`Add Custom ${product.name} Site`}
                                        </Button>
                                    </Grid>
                                </Grid>
                            </Grid>
                            <Grid item>
                                <SiteList product={product} sites={sites} editServer={handleEdit} />
                            </Grid>
                        </Grid>
                    </Grid>
                </Grid>
            </Box>
        );
    },
);
