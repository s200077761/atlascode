import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    TextField,
    Typography,
} from '@material-ui/core';
import React, { memo, useCallback, useState } from 'react';
import { Product } from '../../../../atlclients/authInfo';
export type CodeEntryDialogProps = {
    open: boolean;
    doClose: () => void;
    save: (code: string) => void;
    product: Product;
};

export const CodeEntryDialog: React.FunctionComponent<CodeEntryDialogProps> = memo(
    ({ open, doClose, save, product }) => {
        const [code, updateCode] = useState('');

        const handleCodeChange = useCallback(
            (event: React.ChangeEvent<{ name?: string | undefined; value: any }>) => {
                updateCode(event.target.value);
            },
            [updateCode]
        );

        const handleSave = useCallback(
            (data: any) => {
                save(code);
                doClose();
            },
            [doClose, code, save]
        );

        return (
            <Dialog fullWidth maxWidth="md" open={open}>
                <DialogTitle>
                    <Typography variant="h4">Authorization Code</Typography>
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {`Add ${product.name} Site`} - If your sites were not automatically added after being redirected
                        you can manually paste the access code here.
                    </DialogContentText>
                    <TextField
                        name="authorizationCode"
                        defaultValue={''}
                        required
                        autoFocus
                        autoComplete="off"
                        margin="dense"
                        id="authorizationCode"
                        label="Authorization Code"
                        fullWidth
                        onChange={handleCodeChange}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleSave} variant="contained" color="primary">
                        Add Sites
                    </Button>
                    <Button onClick={doClose} color="primary">
                        Cancel
                    </Button>
                </DialogActions>
                <Box marginBottom={2} />
            </Dialog>
        );
    }
);
