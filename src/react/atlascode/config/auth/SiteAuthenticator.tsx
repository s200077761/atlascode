import { Box, Button, Grid, Typography } from '@material-ui/core';
import CloudIcon from '@material-ui/icons/Cloud';
import DomainIcon from '@material-ui/icons/Domain';
import React, { memo, useCallback, useContext } from 'react';
import { Product } from '../../../../atlclients/authInfo';
import { SiteWithAuthInfo } from '../../../../lib/ipc/toUI/config';
import { CloudAuthButton } from './CloudAuthButton';
import { SiteList } from './SiteList';
import { AuthDialogControllerContext } from './useAuthDialog';
import { CodeEntryDialogControllerContext } from './useCodeEntryDialog';
type SiteAuthenticatorProps = {
    product: Product;
    isRemote: boolean;
    sites: SiteWithAuthInfo[];
    useNewAuth: boolean;
};

export const SiteAuthenticator: React.FunctionComponent<SiteAuthenticatorProps> = memo(
    ({ product, isRemote, sites, useNewAuth }) => {
        const authDialogController = useContext(AuthDialogControllerContext);
        const openProductAuth = useCallback(() => {
            authDialogController.openDialog(product, undefined);
        }, [authDialogController, product]);
        const codeEntryDialogController = useContext(CodeEntryDialogControllerContext);
        const openCodeDialog = useCallback(() => {
            codeEntryDialogController.openDialog(product);
        }, [codeEntryDialogController, product]);

        const handleEdit = useCallback(
            (swa: SiteWithAuthInfo) => {
                authDialogController.openDialog(product, swa);
            },
            [authDialogController, product]
        );

        return (
            <Box flexGrow={1}>
                <Grid container direction="column" spacing={2}>
                    <Grid item hidden={isRemote === false}>
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
                    <Grid item style={{ cursor: isRemote ? 'not-allowed' : 'default' }}>
                        <Grid
                            container
                            direction="column"
                            spacing={2}
                            style={{
                                pointerEvents: isRemote ? 'none' : 'inherit',
                                opacity: isRemote ? 0.6 : 'inherit',
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
                                    {useNewAuth && (
                                        <Grid item>
                                            <Button color="primary" startIcon={<CloudIcon />} onClick={openCodeDialog}>
                                                {`Manually Add ${product.name} Code`}
                                            </Button>
                                        </Grid>
                                    )}
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
    }
);
