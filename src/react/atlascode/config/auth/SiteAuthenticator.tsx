import { Box, Button, Grid } from '@material-ui/core';
import DomainIcon from '@material-ui/icons/Domain';
import React, { memo, useCallback, useContext } from 'react';
import { Product } from '../../../../atlclients/authInfo';
import { SiteWithAuthInfo } from '../../../../lib/ipc/toUI/config';
import { CloudAuthButton } from './CloudAuthButton';
import { SiteList } from './SiteList';
import { AuthDialogControllerContext } from './useAuthDialog';
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
            [authDialogController, product]
        );

        return (
            <Box flexGrow={1}>
                <Grid container direction="column" spacing={2}>
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
            </Box>
        );
    }
);
