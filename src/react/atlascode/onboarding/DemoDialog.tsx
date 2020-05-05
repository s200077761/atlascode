import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    lighten,
    makeStyles,
    Typography,
} from '@material-ui/core';
import Skeleton from '@material-ui/lab/Skeleton';
import React, { useCallback, useState } from 'react';

const useStyles = makeStyles((theme) => ({
    dialogGifBox: {
        maxWidth: '100%',
        maxHeight: '100%',
        borderWidth: 3,
        borderStyle: 'solid',
        borderColor: 'DeepSkyBlue',
    },
    cancelButton: {
        color: theme.palette.type === 'dark' ? lighten(theme.palette.text.primary, 1) : theme.palette.text.primary,
        '&:hover': {
            color: theme.palette.type === 'dark' ? lighten(theme.palette.text.primary, 1) : 'white',
        },
    },
}));

export type DemoDialogProps = {
    modalTitle: string;
    modalGifLink: string;
    modalVisibility: boolean;
    onClose: () => void;
    action: () => void;
};

export const DemoDialog: React.FunctionComponent<DemoDialogProps> = ({
    modalTitle,
    modalGifLink,
    modalVisibility,
    onClose,
    action,
}) => {
    const classes = useStyles();
    const [imageLoaded, setImageLoaded] = useState(false);

    const handleModalClose = useCallback(() => {
        onClose();
    }, [onClose]);

    const handleModalAction = useCallback(() => {
        action();
        onClose();
    }, [action, onClose]);

    const handleImageLoaded = useCallback((): void => {
        setImageLoaded(true);
    }, []);

    return (
        <Dialog fullWidth={true} maxWidth="md" open={modalVisibility} onClose={handleModalClose}>
            <DialogTitle disableTypography>
                <Typography variant="h1">{modalTitle}</Typography>
            </DialogTitle>
            <DialogContent>
                <Box hidden={imageLoaded}>
                    <Skeleton variant="rect" width="100%" height="400px" />
                </Box>
                <Box hidden={!imageLoaded}>
                    <img
                        aria-label={`Gif showing "${modalTitle}" action`}
                        className={classes.dialogGifBox}
                        src={modalGifLink}
                        onLoad={handleImageLoaded}
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleModalAction} variant="contained" color="primary">
                    Try it!
                </Button>
                <Button onClick={handleModalClose}>
                    <Box className={classes.cancelButton}>Cancel</Box>
                </Button>
            </DialogActions>
        </Dialog>
    );
};
