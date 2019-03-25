import * as React from "react";
import Page, { Grid, GridColumn } from '@atlaskit/page';
import PageHeader from '@atlaskit/page-header';
import Spinner from '@atlaskit/spinner';
import Tooltip from '@atlaskit/tooltip';
import { CreateBitbucketIssueData } from "../../../ipc/bitbucketIssueMessaging";
import { HostErrorMessage, Action } from "../../../ipc/messaging";
import { WebviewComponent } from "../WebviewComponent";
import { CreateBitbucketIssueAction } from "../../../ipc/bitbucketIssueActions";
import { ButtonGroup } from "@atlaskit/button";
import Button from "@atlaskit/button";
import Form, { FormFooter, Field, ErrorMessage } from '@atlaskit/form';
import Select from '@atlaskit/select';
import ErrorBanner from "../ErrorBanner";
import { FieldValidators } from "../fieldValidators";
import Offline from "../Offline";

type Emit = CreateBitbucketIssueAction | Action;
type Receive = CreateBitbucketIssueData | HostErrorMessage;
interface MyState extends CreateBitbucketIssueData {
    isSubmitButtonLoading: boolean;
    isErrorBannerOpen: boolean;
    errorDetails: any;
    isOnline: boolean;
}

const emptyState: MyState = {
    type: 'createBitbucketIssueData',
    repoData: [],
    isSubmitButtonLoading: false,
    isErrorBannerOpen: false,
    errorDetails: undefined,
    isOnline: true,
};
export default class CreateBitbucketIssuePage extends WebviewComponent<Emit, Receive, {}, MyState> {
    constructor(props: any) {
        super(props);
        this.state = emptyState;
    }

    public onMessageReceived(e: any) {
        switch (e.type) {
            case 'error': {
                this.setState({ isSubmitButtonLoading: false, isErrorBannerOpen: true, errorDetails: e.reason });
                break;
            }
            case 'createBitbucketIssueData': {
                const issueData = e as CreateBitbucketIssueData;
                this.setState({ ...issueData, ...{ isSubmitButtonLoading: false } });
                break;
            }
            case 'onlineStatus': {
                this.setState({ isOnline: e.isOnline });

                if (e.isOnline && (!Array.isArray(this.state.repoData) || this.state.repoData.length < 1)) {
                    this.postMessage({ action: 'refresh' });
                }

                break;
            }
        }
    }

    handleDismissError = () => {
        this.setState({ isErrorBannerOpen: false, errorDetails: undefined });
    }

    handleSubmit(e: any) {
        this.setState({ isSubmitButtonLoading: true });
        const { repo, title, description, kind, priority } = e;
        this.postMessage({
            action: 'create',
            title: title,
            description: description,
            href: repo.value.href,
            kind: kind.value,
            priority: priority.value
        });
    }

    render() {
        if ((!Array.isArray(this.state.repoData) || this.state.repoData.length === 0) && !this.state.isErrorBannerOpen && this.state.isOnline) {
            return <Tooltip content='waiting for data...'><Spinner delay={500} size='large' /></Tooltip>;
        } else if ((!Array.isArray(this.state.repoData) || this.state.repoData.length === 0) && !this.state.isOnline) {
            return <div><Offline /></div>;
        }

        return (
            <Page>
                <Form
                    name="create-bitbucket-issue-form"
                    onSubmit={(e: any) => this.handleSubmit(e)}
                >
                    {(frmArgs: any) => {
                        return (<form {...frmArgs.formProps}>
                            <Grid>
                                <GridColumn medium={9}>
                                    {!this.state.isOnline &&
                                        <Offline />
                                    }
                                    {this.state.isErrorBannerOpen &&
                                        <ErrorBanner onDismissError={this.handleDismissError} errorDetails={this.state.errorDetails} />
                                    }
                                    <PageHeader
                                        actions={<ButtonGroup>
                                            <Button className='ac-button' href={`${this.state.repoData[0].href}/issues`}>Create on bitbucket.org...</Button>
                                        </ButtonGroup>}
                                    >
                                        <p>Create Issue</p>
                                    </PageHeader>
                                </GridColumn>
                                <GridColumn medium={12} />

                                <GridColumn medium={9}>
                                    <Field defaultValue={''}
                                        label='Title'
                                        isRequired
                                        id='title'
                                        name='title'
                                        validate={FieldValidators.validateString}>
                                        {
                                            (fieldArgs: any) => (
                                                <React.Fragment>
                                                    <input
                                                        {...fieldArgs.fieldProps}
                                                        style={{ width: '100%', display: 'block' }}
                                                        className='ac-inputField' />
                                                    {fieldArgs.error && <ErrorMessage>Title is required</ErrorMessage>}
                                                </React.Fragment>
                                            )
                                        }
                                    </Field>
                                    <Field defaultValue={''}
                                        label='Description'
                                        id='description'
                                        name='description'>
                                        {
                                            (fieldArgs: any) => (
                                                <React.Fragment>
                                                    <textarea
                                                        {...fieldArgs.fieldProps}
                                                        style={{ width: '100%', display: 'block' }}
                                                        className='ac-textarea'
                                                        rows={3} />
                                                    {fieldArgs.error && <ErrorMessage>Title is required</ErrorMessage>}
                                                </React.Fragment>
                                            )
                                        }
                                    </Field>
                                </GridColumn>
                                <GridColumn medium={6}>
                                    <Field defaultValue={{ label: this.state.repoData[0].uri.split('/').pop(), value: this.state.repoData[0] }}
                                        label='Repository'
                                        isRequired
                                        id='repo'
                                        name='repo'>
                                        {
                                            (fieldArgs: any) => (
                                                <React.Fragment>
                                                    <Select
                                                        {...fieldArgs.fieldProps}
                                                        className="ac-select-container"
                                                        classNamePrefix="ac-select"
                                                        options={this.state.repoData.map(repo => { return { label: repo.uri.split('/').pop(), value: repo }; })}
                                                    />
                                                    {fieldArgs.error && <ErrorMessage>Issue type is required</ErrorMessage>}
                                                </React.Fragment>
                                            )
                                        }
                                    </Field>

                                    <Field defaultValue={{ label: 'bug', value: 'bug' }}
                                        label='Kind'
                                        isRequired
                                        id='kind'
                                        name='kind'>
                                        {
                                            (fieldArgs: any) => (
                                                <React.Fragment>
                                                    <Select
                                                        {...fieldArgs.fieldProps}
                                                        className="ac-select-container"
                                                        classNamePrefix="ac-select"
                                                        options={['bug', 'enhancement', 'proposal', 'task'].map(v => ({ label: v, value: v }))}
                                                    />
                                                    {fieldArgs.error && <ErrorMessage>Issue type is required</ErrorMessage>}
                                                </React.Fragment>
                                            )
                                        }
                                    </Field>

                                    <Field defaultValue={{ label: 'major', value: 'major' }}
                                        label='Priority'
                                        isRequired
                                        id='priority'
                                        name='priority'>
                                        {
                                            (fieldArgs: any) => (
                                                <React.Fragment>
                                                    <Select
                                                        {...fieldArgs.fieldProps}
                                                        className="ac-select-container"
                                                        classNamePrefix="ac-select"
                                                        options={['trivial', 'minor', 'major', 'critical', 'blocker'].map(v => ({ label: v, value: v }))}
                                                    />
                                                    {fieldArgs.error && <ErrorMessage>Issue type is required</ErrorMessage>}
                                                </React.Fragment>
                                            )
                                        }
                                    </Field>

                                    <FormFooter actions={{}}>
                                        <Button type='submit' className='ac-button' isLoading={this.state.isSubmitButtonLoading}>Submit</Button>
                                    </FormFooter>
                                </GridColumn>

                            </Grid>
                        </form>);
                    }}
                </Form>
            </Page >
        );
    }
}
