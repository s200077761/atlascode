import Button from '@atlaskit/button';
import { Checkbox } from '@atlaskit/checkbox';
import { CheckboxField, ErrorMessage, Field, HelperMessage } from '@atlaskit/form';
import Modal, { ModalTransition } from "@atlaskit/modal-dialog";
import { RadioGroup } from '@atlaskit/radio';
import React, { PureComponent } from "react";
import { AuthInfo, BasicAuthInfo, emptyAuthInfo, emptyUserInfo, Product, ProductBitbucket, SiteInfo } from "../../../atlclients/authInfo";
import * as FieldValidators from "../fieldValidators";

export default class AuthForm extends PureComponent<{
    product: Product;
    onCancel: () => void;
    onSave: (site: SiteInfo, authInfo: AuthInfo) => void;
}, {
    requiresCredentials: boolean;
    username: string;
    password: string;
    baseUrl: string;
    readyToSave: boolean;
    useCustomSSL: boolean;
    useContextPath: boolean;
    customSSLType: string;
    certPaths: string;
    pfxPath: string;
    pfxPassphrase: string;
    contextPath: string;
}> {

    private sslRadioOptions: any[] = [
        { name: 'customSSLType', label: 'Use custom CA certificate(s) (e.g. a self-signed cert)', value: 'customServerSSL' },
        { name: 'customSSLType', label: 'Use custom client-side certificates (CA certificates bundled in PKCS#12 (pfx)', value: 'customClientSSL' }
    ];

    constructor(props: any) {
        super(props);

        this.state = {
            baseUrl: "",
            username: "",
            password: "",
            requiresCredentials: false,
            readyToSave: false,
            useCustomSSL: false,
            useContextPath: false,
            customSSLType: 'customServerSSL',
            certPaths: '',
            pfxPath: '',
            pfxPassphrase: '',
            contextPath: '',
        };
    }

    isCloudUrl = (url: URL): boolean => {
        return (
            url.hostname.endsWith("atlassian.net")
            || url.hostname.endsWith("jira.com")
            || url.hostname.endsWith("jira-dev.com")
            || url.hostname.endsWith("bitbucket.org")
            || url.hostname.endsWith("bb-inf.net")
        );
    };

    setReadyToSave = (needsCreds: boolean) => {
        let credsAreGood = true;
        if (needsCreds) {
            credsAreGood =
                FieldValidators.validateString(this.state.username, undefined) === undefined
                && FieldValidators.validateString(this.state.password, undefined) === undefined;
        }
        const readyToSave = FieldValidators.validateRequiredUrl(this.state.baseUrl, undefined) === undefined && credsAreGood;

        this.setState({ readyToSave: readyToSave });
    };

    onBaseUrlChange = (e: any) => {
        if (FieldValidators.validateRequiredUrl(e.target.value, undefined) === undefined) {
            const url = new URL(e.target.value);
            const needsCreds = !this.isCloudUrl(url);
            this.setState(
                { baseUrl: e.target.value, requiresCredentials: needsCreds },
                () => this.setReadyToSave(needsCreds)
            );
        }

    };

    onUsernameChange = (e: any) => {
        this.setState(
            { username: e.target.value },
            () => this.setReadyToSave(true)
        );
    };

    onPasswordChange = (e: any) => {
        this.setState(
            { password: e.target.value },
            () => this.setReadyToSave(true)
        );
    };

    onSave = () => {
        const url = new URL(this.state.baseUrl);

        const customSSLCerts = (this.state.useCustomSSL && this.state.customSSLType === 'customServerSSL') ? this.state.certPaths : undefined;
        const pfxCert = (this.state.useCustomSSL && this.state.customSSLType === 'customClientSSL') ? this.state.pfxPath : undefined;
        const pfxPassphrase = (this.state.useCustomSSL && this.state.customSSLType === 'customClientSSL') ? this.state.pfxPassphrase : undefined;
        const contextPath = (this.state.useContextPath) ? this.normalizeContextPath(this.state.contextPath) : undefined;
        const siteInfo = {
            host: url.host,
            protocol: url.protocol,
            product: this.props.product,
            customSSLCertPaths: customSSLCerts,
            pfxPath: pfxCert,
            pfxPassphrase: pfxPassphrase,
            contextPath: contextPath,
        };

        if (!this.state.requiresCredentials) {
            this.props.onSave(siteInfo, emptyAuthInfo);
        } else {
            const authInfo: BasicAuthInfo = {
                username: this.state.username,
                password: this.state.password,
                user: emptyUserInfo
            };

            this.props.onSave(siteInfo, authInfo);
        }
    };

    normalizeContextPath(cPath: string): string | undefined {
        if (!cPath || cPath.trim() === '' || cPath.trim() === '/') {
            return undefined;
        }
        return '/' + cPath.replace(/^\/+/g, '');
    }

    onCustomSSLChange = (e: any) => {
        this.setState({ useCustomSSL: e.target.checked });
    };

    onCustomSSLTypeChange = (e: any) => {
        this.setState({ customSSLType: e.target.value, certPaths: '', pfxPath: '', pfxPassphrase: '' });
    };

    onCertPathsChange = (e: any) => {
        this.setState(
            { certPaths: e.target.value },
            () => this.setReadyToSave(true)
        );
    };

    onPfxPathChange = (e: any) => {
        this.setState(
            { pfxPath: e.target.value },
            () => this.setReadyToSave(true)
        );
    };

    onPfxPassphraseChange = (e: any) => {
        this.setState(
            { pfxPassphrase: e.target.value },
            () => this.setReadyToSave(true)
        );
    };

    onContextPathEnableChange = (e: any) => {
        this.setState({ useContextPath: e.target.checked });
    };

    onContextPathChange = (e: any) => {
        this.setState(
            { contextPath: e.target.value },
            () => this.setReadyToSave(true)
        );
    };

    render() {
        const heading = `Add ${this.props.product.name} Site`;
        let helperText = "You can enter a cloud or server url like https://jiracloud.atlassian.net or https://jira.mydomain.com";
        if (this.props.product.key === ProductBitbucket.key) {
            helperText = "You can enter a cloud or server url like https://bitbucket.org or https://bitbucket.mydomain.com";
        }

        return (
            <ModalTransition>
                <Modal
                    onClose={this.props.onCancel}
                    heading={heading}
                    shouldCloseOnEscapePress={false}
                    className="modalClass"
                >
                    <Field label='Base Url'
                        isRequired={true}
                        id='baseUrl-input'
                        name='baseUrl-input'
                        defaultValue=""
                        validate={FieldValidators.validateRequiredUrl}>
                        {
                            (fieldArgs: any) => {
                                let errDiv = <span />;
                                if (fieldArgs.error === 'EMPTY') {
                                    errDiv = <ErrorMessage>Base URL is required</ErrorMessage>;
                                }
                                if (fieldArgs.error === 'NOT_URL') {
                                    errDiv = <ErrorMessage>Base URL must be a valid absolute URL</ErrorMessage>;
                                }
                                if (!fieldArgs.error) {
                                    errDiv = <HelperMessage>{helperText}</HelperMessage>;
                                }
                                return (
                                    <div>
                                        <input {...fieldArgs.fieldProps}
                                            style={{ width: '100%', display: 'block' }}
                                            className='ac-inputField'
                                            onChange={FieldValidators.chain(fieldArgs.fieldProps.onChange, this.onBaseUrlChange)} />
                                        {errDiv}
                                    </div>
                                );
                            }
                        }
                    </Field>
                    {
                        this.state.requiresCredentials &&
                        <div>
                            <CheckboxField
                                name='contextPath-enabled'
                                id='contextPath-enabled'
                                value='contextPath.enabled'>
                                {
                                    (fieldArgs: any) => {
                                        return (
                                            <Checkbox {...fieldArgs.fieldProps}
                                                label='Use context path'
                                                onChange={FieldValidators.chain(fieldArgs.fieldProps.onChange, this.onContextPathEnableChange)}
                                                isChecked={this.state.useContextPath}
                                            />
                                        );
                                    }
                                }
                            </CheckboxField>
                            {this.state.useContextPath &&
                                <Field label='Context path'
                                    isRequired={true}
                                    id='contextPath-input'
                                    name='contextPath-input'
                                    defaultValue=''>
                                    {
                                        (fieldArgs: any) => {
                                            return (
                                                <div>
                                                    <input {...fieldArgs.fieldProps}
                                                        style={{ width: '100%', display: 'block' }}
                                                        className='ac-inputField'
                                                        onChange={FieldValidators.chain(fieldArgs.fieldProps.onChange, this.onContextPathChange)} />
                                                    <HelperMessage>
                                                        The context path your server is mounted at (e.g. /issues or /jira)
                                                    </HelperMessage>
                                                </div>
                                            );
                                        }
                                    }
                                </Field>

                            }
                            <Field label='Username'
                                isRequired={true}
                                id='username-input'
                                name='username-input'
                                defaultValue=""
                                validate={FieldValidators.validateString}>
                                {
                                    (fieldArgs: any) => {
                                        let errDiv = <span />;
                                        if (fieldArgs.error === 'EMPTY') {
                                            errDiv = <ErrorMessage>Username is required</ErrorMessage>;
                                        }
                                        return (
                                            <div>
                                                <input {...fieldArgs.fieldProps}
                                                    style={{ width: '100%', display: 'block' }}
                                                    className='ac-inputField'
                                                    onChange={FieldValidators.chain(fieldArgs.fieldProps.onChange, this.onUsernameChange)} />
                                                {errDiv}
                                            </div>
                                        );
                                    }
                                }
                            </Field>
                            <Field label='Password'
                                isRequired={true}
                                id='password-input'
                                name='password-input'
                                defaultValue=""
                                validate={FieldValidators.validateString}>
                                {
                                    (fieldArgs: any) => {
                                        let errDiv = <span />;
                                        if (fieldArgs.error === 'EMPTY') {
                                            errDiv = <ErrorMessage>Password is required</ErrorMessage>;
                                        }
                                        if (!fieldArgs.error && this.props.product.key === ProductBitbucket.key) {
                                            errDiv = <HelperMessage>
                                                You can use an app password generated in your profile or your password
                                            </HelperMessage>;
                                        }
                                        return (
                                            <div>
                                                <input {...fieldArgs.fieldProps}
                                                    type='password'
                                                    style={{ width: '100%', display: 'block' }}
                                                    className='ac-inputField'
                                                    onChange={FieldValidators.chain(fieldArgs.fieldProps.onChange, this.onPasswordChange)} />
                                                {errDiv}
                                            </div>
                                        );
                                    }
                                }
                            </Field>
                            <CheckboxField
                                name='custom-ssl-enabled'
                                id='custom-ssl-enabled'
                                value='custom.ssl.enabled'>
                                {
                                    (fieldArgs: any) => {
                                        return (
                                            <Checkbox {...fieldArgs.fieldProps}
                                                label='Use Custom SSL Settings'
                                                onChange={FieldValidators.chain(fieldArgs.fieldProps.onChange, this.onCustomSSLChange)}
                                                isChecked={this.state.useCustomSSL}
                                            />
                                        );
                                    }
                                }
                            </CheckboxField>
                            {this.state.useCustomSSL &&
                                <Field defaultValue={this.state.customSSLType} label='' id='customSSLType' name='customSSLType'>
                                    {
                                        (fieldArgs: any) => {
                                            return (<RadioGroup {...fieldArgs.fieldProps}
                                                onChange={FieldValidators.chain(fieldArgs.fieldProps.onChange, this.onCustomSSLTypeChange)}
                                                options={this.sslRadioOptions} />);
                                        }
                                    }
                                </Field>
                            }

                            {this.state.useCustomSSL && this.state.customSSLType === 'customServerSSL' &&
                                <Field label='Custom SSL certificate path(s)'
                                    isRequired={true}
                                    id='sslCertPaths-input'
                                    name='sslCertPaths-input'
                                    defaultValue="">
                                    {
                                        (fieldArgs: any) => {
                                            return (
                                                <div>
                                                    <input {...fieldArgs.fieldProps}
                                                        style={{ width: '100%', display: 'block' }}
                                                        className='ac-inputField'
                                                        onChange={FieldValidators.chain(fieldArgs.fieldProps.onChange, this.onCertPathsChange)} />
                                                    <HelperMessage>
                                                        The full absolute path to your custom certificates separated by commas
                                                    </HelperMessage>
                                                </div>
                                            );
                                        }
                                    }
                                </Field>

                            }

                            {this.state.useCustomSSL && this.state.customSSLType === 'customClientSSL' &&
                                <div>
                                    <Field label='Custom PFX certificate path'
                                        isRequired={true}
                                        id='pfxPath-input'
                                        name='pfxPath-input'
                                        defaultValue="">
                                        {
                                            (fieldArgs: any) => {
                                                return (
                                                    <div>
                                                        <input {...fieldArgs.fieldProps}
                                                            style={{ width: '100%', display: 'block' }}
                                                            className='ac-inputField'
                                                            onChange={FieldValidators.chain(fieldArgs.fieldProps.onChange, this.onPfxPathChange)} />
                                                        <HelperMessage>
                                                            The full absolute path to your custom pfx file
                                                        </HelperMessage>
                                                    </div>
                                                );
                                            }
                                        }
                                    </Field>
                                    <Field label='PFX passphrase'
                                        isRequired={false}
                                        id='pfxPassphrase-input'
                                        name='pfxPassphrase-input'
                                        defaultValue="">
                                        {
                                            (fieldArgs: any) => {
                                                return (
                                                    <div>
                                                        <input {...fieldArgs.fieldProps}
                                                            style={{ width: '100%', display: 'block' }}
                                                            className='ac-inputField'
                                                            onChange={FieldValidators.chain(fieldArgs.fieldProps.onChange, this.onPfxPassphraseChange)} />
                                                        <HelperMessage>
                                                            The passphrase used to decrypt the pfx file (if required)
                                                        </HelperMessage>
                                                    </div>
                                                );
                                            }
                                        }
                                    </Field>
                                </div>
                            }
                        </div>
                    }
                    <div style={{
                        marginTop: '24px',
                        marginBottom: '24px',
                        display: 'flex',
                        justifyContent: 'flex-end'
                    }}>
                        <div style={{ display: 'inline-flex', marginRight: '4px', marginLeft: '4px;' }}>
                            <Button
                                className='ac-button'
                                isDisabled={!this.state.readyToSave}
                                onClick={this.onSave}
                            >Save</Button>
                        </div>
                        <div style={{ display: 'inline-flex', marginRight: '4px', marginLeft: '4px;' }}>
                            <Button
                                className='ac-button'
                                onClick={this.props.onCancel}
                            >Cancel</Button>
                        </div>
                    </div>
                </Modal>
            </ModalTransition>
        );
    }
}
