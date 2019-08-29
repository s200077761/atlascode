import * as React from 'react';
import Button from '@atlaskit/button';
import Form, { FormFooter, Field, ErrorMessage, HelperMessage, CheckboxField } from '@atlaskit/form';
import { FieldValidators, chain } from '../fieldValidators';
import { DatePicker } from '@atlaskit/datetime-picker';
import { Checkbox } from '@atlaskit/checkbox';
import { format } from 'date-fns';

interface WorklogData {
    comment: string;
    started: string;
    timeSpent: string;
    newEstimate?: string;
    adjustEstimate: string;

}

type MyState = {
    comment: string;
    started: string;
    timeSpent: string;
    newEstimate: string;
    autoAdjust: boolean;
    savingDisabled: boolean;
};

type MyProps = {
    onSave: (data: any) => void;
    onCancel: () => void;
    originalEstimate: string;
};

const emptyForm = {
    comment: '',
    started: '',
    timeSpent: '',
    newEstimate: '',
    autoAdjust: true,
};

export default class WorklogForm extends React.Component<MyProps, MyState> {

    constructor(props: any) {
        super(props);
        this.state = {
            ...emptyForm,
            savingDisabled: true,
        };
    }

    handleClose = () => {
        this.setState({ ...emptyForm });
        this.props.onCancel();
    }

    disableSaving = (): boolean => {
        return (
            this.state.comment.trim() === ''
            || this.state.started === ''
            || this.state.timeSpent.trim() === ''
            || (!this.state.autoAdjust && this.state.newEstimate.trim() === '')
        );
    }

    handleSave = (formData: any) => {

        const worklog: WorklogData = {
            comment: formData.comment,
            started: format(new Date(formData.started), 'YYYY-MM-DDTHH:mm:ss.SSSZZ'),
            timeSpent: formData.timeSpent,
            adjustEstimate: (formData.autoAdjust) ? 'auto' : 'new'
        };

        if (!formData.autoAdjust) {
            worklog.newEstimate = formData.newEstimate;
        }

        if (this.props.onSave) {
            this.props.onSave(worklog);
        }

        this.handleClose();
    }

    render() {
        const defaultDate = (this.state.started.trim() !== '') ? this.state.started : format(Date.now(), 'YYYY-MM-DD');
        const newEstimateValidator = (this.state.autoAdjust) ? undefined : FieldValidators.validateString;
        return (
            <div>
                <Form
                    name="worklog-form"
                    onSubmit={this.handleSave}
                >
                    {(frmArgs: any) => {
                        return (<form {...frmArgs.formProps}>
                            <Field label='Description'
                                isRequired={true}
                                id='comment'
                                name='comment'
                                defaultValue={this.state.comment}
                                validate={FieldValidators.validateString}>
                                {
                                    (fieldArgs: any) => {
                                        let errDiv = <span />;
                                        if (fieldArgs.error === 'EMPTY') {
                                            errDiv = <ErrorMessage>Description is required</ErrorMessage>;
                                        }
                                        return (
                                            <div>
                                                <textarea {...fieldArgs.fieldProps}
                                                    style={{ width: '100%', display: 'block' }}
                                                    className='ac-textarea'
                                                    rows={3}
                                                    onChange={chain(fieldArgs.fieldProps.onChange, (item: any) => {
                                                        this.setState({ comment: item.target.value, }, () => {
                                                            this.setState({ savingDisabled: this.disableSaving() });
                                                        });
                                                    })}
                                                />
                                                {errDiv}
                                            </div>
                                        );
                                    }
                                }
                            </Field>
                            <Field
                                label='Date'
                                id='started'
                                name='started'
                                isRequired={true}
                                validate={FieldValidators.validateString}
                                defaultValue={defaultDate}
                            >
                                {
                                    (fieldArgs: any) => {
                                        let errDiv = <span />;
                                        if (fieldArgs.error === 'EMPTY') {
                                            errDiv = <ErrorMessage>Date is required</ErrorMessage>;
                                        }
                                        return (
                                            <div>
                                                <DatePicker
                                                    {...fieldArgs.fieldProps}
                                                    className="ac-select-container"
                                                    selectProps={{ className: "ac-select-container", classNamePrefix: "ac-select" }}
                                                    onChange={chain(fieldArgs.fieldProps.onChange, (item: any) => {
                                                        this.setState({ started: item }, () => {
                                                            this.setState({ savingDisabled: this.disableSaving() });
                                                        });
                                                    })}
                                                />
                                                {errDiv}
                                            </div>
                                        );
                                    }
                                }
                            </Field>
                            <Field label='Time spent'
                                id='timeSpent'
                                name='timeSpent'
                                isRequired={true}
                                defaultValue={this.state.timeSpent}
                                validate={FieldValidators.validateString}>
                                {
                                    (fieldArgs: any) => {
                                        let errDiv = <span />;
                                        if (fieldArgs.error === 'EMPTY') {
                                            errDiv = <ErrorMessage>Time spent is required</ErrorMessage>;
                                        }
                                        return (
                                            <div>
                                                <input {...fieldArgs.fieldProps}
                                                    style={{ width: '100%', display: 'block' }}
                                                    className='ac-inputField'
                                                    onChange={chain(fieldArgs.fieldProps.onChange, (item: any) => {
                                                        this.setState({ timeSpent: item.target.value, }, () => {
                                                            this.setState({ savingDisabled: this.disableSaving() });
                                                        });
                                                    })}
                                                />
                                                <HelperMessage>(eg. 3w 4d 12h)</HelperMessage>
                                                {errDiv}
                                            </div>
                                        );
                                    }
                                }
                            </Field>
                            <CheckboxField
                                name='autoAdjust'
                                id='autoAdjust'
                                value='autoAdjust'
                                defaultIsChecked={this.state.autoAdjust}>
                                {
                                    (fieldArgs: any) => {
                                        return (
                                            <Checkbox {...fieldArgs.fieldProps}
                                                label='Auto adjust remaining estimate'
                                                onChange={chain(fieldArgs.fieldProps.onChange, (item: any) => {
                                                    this.setState({ autoAdjust: item.target.checked, }, () => {
                                                        this.setState({ savingDisabled: this.disableSaving() });
                                                    });
                                                })}
                                            />
                                        );
                                    }
                                }
                            </CheckboxField>
                            <Field label='Remaining estimate'
                                id='newEstimate'
                                name='newEstimate'
                                isRequired={!this.state.autoAdjust}
                                defaultValue={this.state.newEstimate}
                                validate={newEstimateValidator}>
                                {
                                    (fieldArgs: any) => {
                                        let errDiv = <span />;
                                        if (fieldArgs.error === 'EMPTY') {
                                            errDiv = <ErrorMessage>Remaining estimate is required</ErrorMessage>;
                                        }
                                        return (
                                            <div>
                                                <div className='ac-flex'>
                                                    <input {...fieldArgs.fieldProps}
                                                        disabled={this.state.autoAdjust}
                                                        style={{ width: '100%', display: 'block' }}
                                                        className='ac-inputField'
                                                        onChange={chain(fieldArgs.fieldProps.onChange, (item: any) => {
                                                            this.setState({ newEstimate: item.target.value, }, () => {
                                                                this.setState({ savingDisabled: this.disableSaving() });
                                                            });
                                                        })}
                                                    />
                                                </div>
                                                <HelperMessage>(eg. 3w 4d 12h) original estimate {this.props.originalEstimate}</HelperMessage>
                                                {errDiv}
                                            </div>
                                        );
                                    }
                                }
                            </Field>
                            <FormFooter actions={{}}>
                                <div style={{ display: 'inline-flex', marginRight: '4px', marginLeft: '4px;' }}>
                                    <Button type="submit"
                                        className='ac-button'
                                        isDisabled={this.state.savingDisabled}
                                    >Submit</Button>
                                </div>
                                <div style={{ display: 'inline-flex', marginRight: '4px', marginLeft: '4px;' }}>
                                    <Button
                                        className='ac-button'
                                        onClick={this.handleClose}
                                    >Cancel</Button>
                                </div>
                            </FormFooter>
                            <div style={{ height: '20px' }} />
                        </form>);
                    }}
                </Form>
            </div>
        );
    }
}