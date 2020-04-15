import { Box, Button, darken, lighten, makeStyles, Theme, Typography } from '@material-ui/core';
import React from 'react';

const useStyles = makeStyles((theme: Theme) => ({
    demoBox: {
        padding: theme.spacing(2),
        paddingBottom: theme.spacing(3),
    },
    button: {
        textTransform: 'none',
        backgroundColor:
            theme.palette.type === 'dark'
                ? lighten(theme.palette.background.paper, 0.02)
                : darken(theme.palette.background.paper, 0.02),
    },
}));

export type DemoButtonProps = {
    gifLink: string;
    description: string;
    productIcon: React.ReactNode;
};

export const DemoButton: React.FunctionComponent<DemoButtonProps> = ({ gifLink, description, productIcon }) => {
    const classes = useStyles();

    return (
        <Button className={classes.button}>
            <Box className={classes.demoBox}>
                <img style={{ maxWidth: '100%', maxHeight: 'auto' }} src={gifLink} />
                <Typography variant="h3" align="left" style={{ marginTop: '20px' }}>
                    {description} {productIcon}
                </Typography>
            </Box>
        </Button>
    );
};

export default DemoButton;
