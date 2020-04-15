import { Box, Button, makeStyles, Tooltip, Typography } from '@material-ui/core';
import StorageIcon from '@material-ui/icons/Storage';
import React, { useCallback, useContext } from 'react';
import { Product } from '../../../atlclients/authInfo';
import { AuthDialogControllerContext } from '../config/auth/useAuthDialog';

const useStyles = makeStyles(theme => ({
    box: {
        textAlign: 'center',
        width: 'inherit',
        height: 'inherit',
        backgroundColor: 'inherit'
    },
    icon: {
        fontSize: 100,
        color: 'white'
    },
    button: {
        padding: 0,
        textTransform: 'none',
        width: '100%',
        height: '100%',
        textAlign: 'center'
    },
    buttonSubtext: {
        marginBottom: 30,
        paddingLeft: theme.spacing(1),
        paddingRight: theme.spacing(1),
        color: '#7f8082'
    }
}));

type AltServerAuthButtonProps = {
    product: Product;
};

export const AltServerAuthButton: React.FunctionComponent<AltServerAuthButtonProps> = ({ product }) => {
    const classes = useStyles();
    const loginText = `Custom ${product.name}`;
    const subtext = 'For users with custom servers';
    const authDialogController = useContext(AuthDialogControllerContext);
    const openProductAuth = useCallback(() => {
        authDialogController.openDialog(product, undefined);
    }, [authDialogController, product]);

    return (
        <Tooltip title={'Opens a dialog window to log in with custom instance'}>
            <Button variant="contained" color="inherit" className={classes.button} onClick={openProductAuth}>
                <Box className={classes.box}>
                    <div className={classes.icon}>
                        {loginText} {<StorageIcon fontSize={'inherit'} />}
                    </div>
                    <Typography variant="h2" className={classes.buttonSubtext}>
                        {subtext}
                    </Typography>
                </Box>
            </Button>
        </Tooltip>
    );
};
