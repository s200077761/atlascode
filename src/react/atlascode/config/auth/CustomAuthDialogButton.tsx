import { SmallRadioWithLabel, SwitchWithLabel } from '@atlassianlabs/guipi-core-components';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Grid,
    IconButton,
    RadioGroup,
    TextField
} from '@material-ui/core';
import DomainIcon from '@material-ui/icons/Domain';
import Visibility from '@material-ui/icons/Visibility';
import VisibilityOff from '@material-ui/icons/VisibilityOff';
import React, { useContext, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
    BasicAuthInfo,
    emptyAuthInfo,
    emptyUserInfo,
    Product,
    ProductBitbucket,
    SiteInfo
} from '../../../../atlclients/authInfo';
import { validateUrl } from '../../util/fieldValidators';
import { ConfigControllerContext } from '../configController';

type CustomAuthDialogButtonProps = {
    product: Product;
};

type FormFields = {
    baseUrl: string;
    contextPathEnabled: boolean;
    customSSLType: string;
    contextPath: string;
    username: string;
    password: string;
    customSSLEnabled: boolean;
    sslCertPaths: string;
    pfxPath: string;
    pfxPassphrase: string;
};

interface AuthFormState {
    authFormOpen: boolean;
    showPassword: boolean;
    showPFXPassphrase: boolean;
}

const emptyAuthFormState: AuthFormState = {
    authFormOpen: false,
    showPassword: false,
    showPFXPassphrase: false
};

const normalizeContextPath = (cPath: string): string | undefined => {
    if (!cPath || cPath.trim() === '' || cPath.trim() === '/') {
        return undefined;
    }
    return '/' + cPath.replace(/^\/+/g, '').split('/');
};

export const CustomAuthDialogButton: React.FunctionComponent<CustomAuthDialogButtonProps> = ({ product }) => {
    const loginText = `Add Custom ${product.name} Site`;
    const controller = useContext(ConfigControllerContext);
    const [authFormState, updateState] = useState(emptyAuthFormState);

    const { register, handleSubmit, watch, errors, formState } = useForm<FormFields>({
        mode: 'onChange',
        defaultValues: {
            customSSLType: 'customServerSSL',
            baseUrl: ''
        }
    });

    const watches = watch(['baseUrl', 'contextPathEnabled', 'customSSLEnabled', 'customSSLType']);

    const isCustomUrl = (data?: string) => {
        if (!data) {
            return false;
        }
        const url = new URL(data);

        return (
            !url.hostname.endsWith('atlassian.net') &&
            !url.hostname.endsWith('jira.com') &&
            !url.hostname.endsWith('jira-dev.com') &&
            !url.hostname.endsWith('bitbucket.org') &&
            !url.hostname.endsWith('bb-inf.net')
        );
    };

    const helperText =
        product.key === ProductBitbucket.key
            ? 'You can enter a cloud or server url like https://jiracloud.atlassian.net or https://jira.mydomain.com'
            : 'You can enter a cloud or server url like https://bitbucket.org or https://bitbucket.mydomain.com';

    const handleSave = (data: any) => {
        const customSSLCerts =
            data.customSSLEnabled && data.customSSLType === 'customServerSSL' ? data.sslCertPaths : undefined;
        const pfxCert = data.customSSLEnabled && data.customSSLType === 'customClientSSL' ? data.pfxPath : undefined;
        const pfxPassphrase =
            data.customSSLEnabled && data.customSSLType === 'customClientSSL' ? data.pfxPassphrase : undefined;
        const contextPath = data.contextPathEnabled ? normalizeContextPath(data.contextPath) : undefined;

        const url = new URL(data.baseUrl);

        const siteInfo: SiteInfo = {
            host: url.host,
            protocol: url.protocol,
            product: product,
            customSSLCertPaths: customSSLCerts,
            pfxPath: pfxCert,
            pfxPassphrase: pfxPassphrase,
            contextPath: contextPath
        };

        if (!isCustomUrl(data.baseUrl)) {
            controller.login(siteInfo, emptyAuthInfo);
        } else {
            const authInfo: BasicAuthInfo = {
                username: data.username,
                password: data.password,
                user: emptyUserInfo
            };

            controller.login(siteInfo, authInfo);
        }

        updateState(emptyAuthFormState);
    };

    const handleDialogClose = () => {
        updateState({ ...authFormState, authFormOpen: false });
    };

    return (
        <div>
            <Button
                color="primary"
                startIcon={<DomainIcon />}
                onClick={() => updateState({ ...authFormState, authFormOpen: true })}
            >
                {loginText}
            </Button>

            <Dialog fullWidth maxWidth="md" open={authFormState.authFormOpen} onClose={handleDialogClose}>
                <DialogTitle>Authenticate</DialogTitle>
                <DialogContent>
                    <DialogContentText>{`Add ${product.name} Site`}</DialogContentText>
                    <Grid container direction="column" spacing={2}>
                        <Grid item>
                            <TextField
                                required
                                autoFocus
                                autoComplete="off"
                                margin="dense"
                                id="baseUrl"
                                name="baseUrl"
                                label="Base URL"
                                helperText={errors.baseUrl ? errors.baseUrl.message : helperText}
                                fullWidth
                                error={!!errors.baseUrl}
                                inputRef={register({
                                    required: 'Base URL is required',
                                    validate: (value: string) => validateUrl('Base URL', value)
                                })}
                            />
                        </Grid>
                        {!errors.baseUrl && isCustomUrl(watches.baseUrl) && (
                            <React.Fragment>
                                <Grid item>
                                    <SwitchWithLabel
                                        size="small"
                                        color="primary"
                                        id="contextPathEnabled"
                                        name="contextPathEnabled"
                                        value="contextPathEnabled"
                                        inputRef={register}
                                        label="Use context path"
                                    />
                                </Grid>
                                {watches.contextPathEnabled && (
                                    <Box marginLeft={3}>
                                        <Grid item>
                                            <TextField
                                                required
                                                autoFocus
                                                margin="dense"
                                                id="contextPath"
                                                name="contextPath"
                                                label="Context path"
                                                helperText={
                                                    errors.contextPath
                                                        ? errors.contextPath.message
                                                        : 'The context path your server is mounted at (e.g. /issues or /jira)'
                                                }
                                                fullWidth
                                                error={!!errors.contextPath}
                                                inputRef={register({
                                                    required: 'Context path is required'
                                                })}
                                            />
                                        </Grid>
                                    </Box>
                                )}
                                <Grid item>
                                    <TextField
                                        required
                                        margin="dense"
                                        id="username"
                                        name="username"
                                        label="Username"
                                        helperText={errors.username ? errors.username.message : undefined}
                                        fullWidth
                                        error={!!errors.username}
                                        inputRef={register({
                                            required: 'Username is required'
                                        })}
                                    />
                                </Grid>
                                <Grid item>
                                    <TextField
                                        required
                                        margin="dense"
                                        id="password"
                                        name="password"
                                        label="Password"
                                        type={authFormState.showPassword ? 'text' : 'password'}
                                        helperText={errors.password ? errors.password.message : undefined}
                                        fullWidth
                                        error={!!errors.password}
                                        inputRef={register({
                                            required: 'Password is required'
                                        })}
                                        InputProps={{
                                            endAdornment: (
                                                <IconButton
                                                    onClick={() =>
                                                        updateState({
                                                            ...authFormState,
                                                            showPassword: !authFormState.showPassword
                                                        })
                                                    }
                                                    onMouseDown={(event: React.MouseEvent<HTMLButtonElement>) =>
                                                        event.preventDefault()
                                                    }
                                                >
                                                    {authFormState.showPassword ? (
                                                        <Visibility fontSize="small" />
                                                    ) : (
                                                        <VisibilityOff fontSize="small" />
                                                    )}
                                                </IconButton>
                                            )
                                        }}
                                    />
                                </Grid>
                                <Grid item>
                                    <SwitchWithLabel
                                        size="small"
                                        color="primary"
                                        id="customSSLEnabled"
                                        name="customSSLEnabled"
                                        value="customSSLEnabled"
                                        inputRef={register}
                                        label="Use Custom SSL Settings"
                                    />
                                </Grid>

                                {watches.customSSLEnabled && (
                                    <Box marginLeft={3}>
                                        <Grid item>
                                            <RadioGroup
                                                id="customSSLType"
                                                name="customSSLType"
                                                defaultValue="customServerSSL"
                                            >
                                                <SmallRadioWithLabel
                                                    color="primary"
                                                    value="customServerSSL"
                                                    inputRef={register}
                                                    label="Use custom CA certificate(s) (e.g. a self-signed cert)"
                                                />
                                                <SmallRadioWithLabel
                                                    value="customClientSSL"
                                                    color="primary"
                                                    inputRef={register}
                                                    label="Use custom client-side certificates (CA certificates bundled in PKCS#12 (pfx)"
                                                />
                                            </RadioGroup>
                                        </Grid>
                                    </Box>
                                )}

                                {watches.customSSLEnabled && watches.customSSLType === 'customServerSSL' && (
                                    <Box marginLeft={3}>
                                        <Grid item>
                                            <TextField
                                                required
                                                margin="dense"
                                                id="sslCertPaths"
                                                name="sslCertPaths"
                                                label="sslCertPaths"
                                                helperText={
                                                    errors.sslCertPaths
                                                        ? errors.sslCertPaths.message
                                                        : 'The full absolute path to your custom certificates separated by commas'
                                                }
                                                fullWidth
                                                error={!!errors.sslCertPaths}
                                                inputRef={register({
                                                    required: 'Custom SSL certificate path(s)  is required'
                                                })}
                                            />
                                        </Grid>
                                    </Box>
                                )}

                                {watches.customSSLEnabled && watches.customSSLType === 'customClientSSL' && (
                                    <Box marginLeft={3}>
                                        <Grid item>
                                            <TextField
                                                required
                                                margin="dense"
                                                id="pfxPath"
                                                name="pfxPath"
                                                label="pfxPath"
                                                helperText={
                                                    errors.pfxPath
                                                        ? errors.pfxPath.message
                                                        : 'The full absolute path to your custom pfx file'
                                                }
                                                fullWidth
                                                error={!!errors.pfxPath}
                                                inputRef={register({
                                                    required: 'Custom PFX certificate path'
                                                })}
                                            />
                                        </Grid>
                                        <Grid item>
                                            <TextField
                                                margin="dense"
                                                id="pfxPassphrase"
                                                name="pfxPassphrase"
                                                label="PFX passphrase"
                                                type={authFormState.showPFXPassphrase ? 'text' : 'password'}
                                                helperText="The passphrase used to decrypt the pfx file (if required)"
                                                fullWidth
                                                inputRef={register}
                                                InputProps={{
                                                    endAdornment: (
                                                        <IconButton
                                                            onClick={() =>
                                                                updateState({
                                                                    ...authFormState,
                                                                    showPFXPassphrase: !authFormState.showPFXPassphrase
                                                                })
                                                            }
                                                            onMouseDown={(event: React.MouseEvent<HTMLButtonElement>) =>
                                                                event.preventDefault()
                                                            }
                                                        >
                                                            {authFormState.showPFXPassphrase ? (
                                                                <Visibility fontSize="small" />
                                                            ) : (
                                                                <VisibilityOff fontSize="small" />
                                                            )}
                                                        </IconButton>
                                                    )
                                                }}
                                            />
                                        </Grid>
                                    </Box>
                                )}
                            </React.Fragment>
                        )}
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button
                        disabled={!formState.isValid}
                        onClick={handleSubmit(handleSave)}
                        variant="contained"
                        color="primary"
                    >
                        Save Site
                    </Button>
                    <Button onClick={handleDialogClose} color="primary">
                        Cancel
                    </Button>
                </DialogActions>
                <Box marginBottom={2} />
            </Dialog>
        </div>
    );
};
