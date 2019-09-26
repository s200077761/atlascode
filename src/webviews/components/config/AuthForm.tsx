import React, { PureComponent } from "react";
import Modal, { ModalTransition } from "@atlaskit/modal-dialog";
import { Field, ErrorMessage, HelperMessage } from '@atlaskit/form';
import { FieldValidators, chain } from "../fieldValidators";
import Button from '@atlaskit/button';
import { AuthInfo, SiteInfo, Product, ProductBitbucket, emptyUserInfo, emptyAuthInfo, BasicAuthInfo } from "../../../atlclients/authInfo";

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
}> {

    constructor(props: any) {
        super(props);

        this.state = {
            baseUrl: "",
            username: "",
            password: "",
            requiresCredentials: false,
            readyToSave: false,
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
    }

    setReadyToSave = (needsCreds: boolean) => {
        let credsAreGood = true;
        if (needsCreds) {
            credsAreGood =
                FieldValidators.validateString(this.state.username, undefined) === undefined
                && FieldValidators.validateString(this.state.password, undefined) === undefined;
        }
        const readyToSave = FieldValidators.validateRequiredUrl(this.state.baseUrl, undefined) === undefined && credsAreGood;

        this.setState({ readyToSave: readyToSave });
    }

    onBaseUrlChange = (e: any) => {
        if (FieldValidators.validateRequiredUrl(e.target.value, undefined) === undefined) {
            const url = new URL(e.target.value);
            const needsCreds = !this.isCloudUrl(url);
            this.setState(
                { baseUrl: e.target.value, requiresCredentials: needsCreds },
                () => this.setReadyToSave(needsCreds)
            );
        }

    }

    onUsernameChange = (e: any) => {
        this.setState(
            { username: e.target.value },
            () => this.setReadyToSave(true)
        );
    }

    onPasswordChange = (e: any) => {
        this.setState(
            { password: e.target.value },
            () => this.setReadyToSave(true)
        );
    }

    onSave = () => {
        const url = new URL(this.state.baseUrl);

        const siteInfo = {
            hostname: url.host,
            product: this.props.product
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
    }

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
                                            onChange={chain(fieldArgs.fieldProps.onChange, this.onBaseUrlChange)} />
                                        {errDiv}
                                    </div>
                                );
                            }
                        }
                    </Field>
                    {
                        this.state.requiresCredentials &&
                        <div>
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
                                                    onChange={chain(fieldArgs.fieldProps.onChange, this.onUsernameChange)} />
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
                                                    onChange={chain(fieldArgs.fieldProps.onChange, this.onPasswordChange)} />
                                                {errDiv}
                                            </div>
                                        );
                                    }
                                }
                            </Field>
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
