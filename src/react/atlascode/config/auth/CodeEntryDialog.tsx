import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Grid,
    TextField,
    Typography,
} from '@material-ui/core';
import React, { memo, useCallback, useState } from 'react';
import { Product } from '../../../../atlclients/authInfo';
export type CodeEntryDialogProps = {
    open: boolean;
    doClose: () => void;
    onExited: () => void;
    save: (code: string) => void;
    product: Product;
};

interface CodeEntryFormState {
    showPassword: boolean;
    showPFXPassphrase: boolean;
}

const emptyCodeEntryFormState: CodeEntryFormState = {
    showPassword: false,
    showPFXPassphrase: false,
};

export const CodeEntryDialog: React.FunctionComponent<CodeEntryDialogProps> = memo(
    ({ open, doClose, onExited, save, product }) => {
        const [state, updateState] = useState(emptyCodeEntryFormState);
        const [code, updateCode] = useState('');

        console.log(state);

        const handleCodeChange = useCallback(
            (event: React.ChangeEvent<{ name?: string | undefined; value: any }>) => {
                console.log(`code at update: ${event.target.value}`);
                updateCode(event.target.value);
                console.log(`code after update: ${event.target.value}`);
            },
            [updateCode]
        );

        const handleSave = useCallback(
            (data: any) => {
                console.log(`code at save: ${code}`);
                save(code);
                updateState(emptyCodeEntryFormState);
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
                    <Grid container direction="column" spacing={2}>
                        <Grid item>
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
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button disabled={false} onClick={handleSave} variant="contained" color="primary">
                        Save Site
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
