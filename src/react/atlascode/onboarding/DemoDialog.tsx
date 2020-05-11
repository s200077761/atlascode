import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    lighten,
    makeStyles,
    Tooltip,
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
    modalDescription?: React.ReactNode;
    modalVisibility: boolean;
    onClose: () => void;
    action: () => void;
    actionNotAvailable?: boolean; //Sometimes meaningful actions are not available so the 'Try it!' button should be disabled
};

export const DemoDialog: React.FunctionComponent<DemoDialogProps> = ({
    modalTitle,
    modalGifLink,
    modalDescription,
    modalVisibility,
    onClose,
    action,
    actionNotAvailable,
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
                <Box hidden={!modalDescription}>
                    <DialogContentText>
                        <Typography variant="h4">{modalDescription}</Typography>
                    </DialogContentText>
                </Box>
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
                <Tooltip
                    title={
                        actionNotAvailable
                            ? `Automatic action not available for '${modalTitle}'`
                            : 'Click to perform this action automatically'
                    }
                >
                    <span>
                        <Button
                            disabled={actionNotAvailable}
                            onClick={handleModalAction}
                            variant="contained"
                            color="primary"
                        >
                            Try it!
                        </Button>
                    </span>
                </Tooltip>
                <Button onClick={handleModalClose}>
                    <Box className={classes.cancelButton}>Cancel</Box>
                </Button>
            </DialogActions>
        </Dialog>
    );
};
