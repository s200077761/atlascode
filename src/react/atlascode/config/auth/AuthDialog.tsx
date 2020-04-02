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
import Visibility from '@material-ui/icons/Visibility';
import VisibilityOff from '@material-ui/icons/VisibilityOff';
import React, { memo, useCallback, useContext, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
    BasicAuthInfo,
    emptyAuthInfo,
    emptyUserInfo,
    Product,
    ProductJira,
    SiteInfo
} from '../../../../atlclients/authInfo';
import { emptySiteWithAuthInfo, SiteWithAuthInfo } from '../../../../lib/ipc/toUI/config';
import { useFormValidation } from '../../common/form/useFormValidation';
import { ConfigControllerContext } from '../configController';
export type AuthDialogProps = {
    open: boolean;
    onClose: () => void;
    product: Product;
    authEntry?: SiteWithAuthInfo;
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
    showPassword: boolean;
    showPFXPassphrase: boolean;
}

const emptyAuthFormState: AuthFormState = {
    showPassword: false,
    showPFXPassphrase: false
};

const normalizeContextPath = (cPath: string): string | undefined => {
    if (!cPath || cPath.trim() === '' || cPath.trim() === '/') {
        return undefined;
    }
    return '/' + cPath.replace(/^\/+/g, '').split('/');
};

const isCustomUrl = (data?: string) => {
    console.log(`checking custom url: '${data}'`);
    if (!data) {
        return false;
    }

    try {
        const url = new URL(data);

        return (
            !url.hostname.endsWith('atlassian.net') &&
            !url.hostname.endsWith('jira.com') &&
            !url.hostname.endsWith('jira-dev.com') &&
            !url.hostname.endsWith('bitbucket.org') &&
            !url.hostname.endsWith('bb-inf.net')
        );
    } catch (e) {
        return false;
    }
};

export const AuthDialog: React.FunctionComponent<AuthDialogProps> = memo(({ open, onClose, product, authEntry }) => {
    const controller = useContext(ConfigControllerContext);
    const [authFormState, updateState] = useState(emptyAuthFormState);
    const customReg = useFormValidation();
    const defaultSiteWithAuth = authEntry ? authEntry : emptySiteWithAuthInfo;

    console.log('defaultSiteWithAuth', defaultSiteWithAuth);

    const defaultSSLType =
        defaultSiteWithAuth.site.pfxPath !== undefined && defaultSiteWithAuth.site.pfxPath !== ''
            ? 'customClientSSL'
            : 'customServerSSL';
    const defaultContextPathEnabled =
        defaultSiteWithAuth.site.contextPath !== undefined && defaultSiteWithAuth.site.contextPath !== '';

    const defaultSSLEnabled =
        defaultSiteWithAuth.site.customSSLCertPaths !== undefined && defaultSiteWithAuth.site.customSSLCertPaths !== '';

    const { register, handleSubmit, watch, errors, formState, control, getValues } = useForm<FormFields>({
        mode: 'onChange',
        defaultValues: {
            //baseUrl: defaultSiteWithAuth.site.baseLinkUrl,
            contextPathEnabled: defaultContextPathEnabled,
            customSSLEnabled: defaultSSLEnabled,
            customSSLType: defaultSSLType
        }
    });

    const watches = watch(['baseUrl', 'contextPathEnabled', 'customSSLEnabled', 'customSSLType'], {
        baseUrl: defaultSiteWithAuth.site.baseLinkUrl,
        contextPathEnabled: defaultContextPathEnabled,
        customSSLEnabled: defaultSSLEnabled,
        customSSLType: defaultSSLType
    });

    const helperText =
        product.key === ProductJira.key
            ? 'You can enter a cloud or server url like https://jiracloud.atlassian.net or https://jira.mydomain.com'
            : 'You can enter a cloud or server url like https://bitbucket.org or https://bitbucket.mydomain.com';

    const handleSave = useCallback(
        (data: any) => {
            const customSSLCerts =
                data.customSSLEnabled && data.customSSLType === 'customServerSSL' ? data.sslCertPaths : undefined;
            const pfxCert =
                data.customSSLEnabled && data.customSSLType === 'customClientSSL' ? data.pfxPath : undefined;
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
            onClose();
        },
        [controller, onClose, product]
    );

    const preventClickDefault = useCallback((event: React.MouseEvent<HTMLButtonElement>) => event.preventDefault(), []);

    console.log('watches', watches);
    console.log('values', getValues());

    return (
        <Dialog fullWidth maxWidth="md" open={open} onClose={onClose}>
            <DialogTitle>Authenticate</DialogTitle>
            <DialogContent>
                <DialogContentText>{`Add ${product.name} Site`}</DialogContentText>
                <Grid container direction="column" spacing={2}>
                    <Grid item>
                        <TextField
                            name="baseUrl"
                            defaultValue={defaultSiteWithAuth.site.baseLinkUrl}
                            required
                            autoFocus
                            autoComplete="off"
                            margin="dense"
                            id="baseUrl"
                            label="Base URL"
                            helperText={errors.baseUrl ? errors.baseUrl.message : helperText}
                            fullWidth
                            inputRef={customReg}
                            error={!!errors.baseUrl}
                        />
                    </Grid>
                    {!errors.baseUrl && isCustomUrl(watches.baseUrl) && (
                        <React.Fragment>
                            <Grid item>
                                <Controller
                                    control={control}
                                    name="contextPathEnabled"
                                    defaultValue={defaultContextPathEnabled}
                                    as={
                                        <SwitchWithLabel
                                            size="small"
                                            color="primary"
                                            id="contextPathEnabled"
                                            label="Use context path"
                                        />
                                    }
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
                                            defaultValue={defaultSiteWithAuth.site.contextPath}
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
                                    defaultValue={(defaultSiteWithAuth.auth as BasicAuthInfo).username}
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
                                    defaultValue={(defaultSiteWithAuth.auth as BasicAuthInfo).password}
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
                                                onMouseDown={preventClickDefault}
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
                                <Controller
                                    control={control}
                                    name="customSSLEnabled"
                                    defaultValue={defaultSSLEnabled}
                                    as={
                                        <SwitchWithLabel
                                            size="small"
                                            color="primary"
                                            id="customSSLEnabled"
                                            value="customSSLEnabled"
                                            label="Use Custom SSL Settings"
                                        />
                                    }
                                />
                            </Grid>

                            {watches.customSSLEnabled && (
                                <Box marginLeft={3}>
                                    <Grid item>
                                        <RadioGroup
                                            id="customSSLType"
                                            name="customSSLType"
                                            defaultValue={defaultSSLType}
                                        >
                                            <SmallRadioWithLabel
                                                color="primary"
                                                value="customServerSSL"
                                                inputRef={node => console.log('reffy1', node)}
                                                label="Use custom CA certificate(s) (e.g. a self-signed cert)"
                                            />
                                            <SmallRadioWithLabel
                                                value="customClientSSL"
                                                color="primary"
                                                inputRef={node => console.log('reffy2', node)}
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
                                            defaultValue={defaultSiteWithAuth.site.customSSLCertPaths}
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
                                            defaultValue={defaultSiteWithAuth.site.pfxPath}
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
                                            defaultValue={defaultSiteWithAuth.site.pfxPassphrase}
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
                                                        onMouseDown={preventClickDefault}
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
                <Button onClick={onClose} color="primary">
                    Cancel
                </Button>
            </DialogActions>
            <Box marginBottom={2} />
        </Dialog>
    );
});
