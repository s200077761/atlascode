import * as React from "react";
import { Field, ErrorMessage } from '@atlaskit/form';
import { FieldValidators, chain } from '../fieldValidators';

export default class CreatePRTitleSummary extends React.Component<{ title: string, summary: string, onTitleChange: (e: any) => void, onSummaryChange: (e: any) => void }> {

    constructor(props: any) {
        super(props);
    }

    render() {
        return (
            <div className='ac-vpadding'>
                <Field label='Title'
                    isRequired={true}
                    id='title'
                    name='title'
                    validate={FieldValidators.validateString}
                    defaultValue={this.props.title}
                >
                    {
                        (fieldArgs: any) => {
                            let errDiv = <span />;
                            if (fieldArgs.error === 'EMPTY') {
                                errDiv = <ErrorMessage>Title is required</ErrorMessage>;
                            }
                            return (
                                <div>
                                    <input {...fieldArgs.fieldProps}
                                        style={{ width: '100%', display: 'block' }}
                                        className='ac-inputField'
                                        onChange={chain(fieldArgs.fieldProps.onChange, this.props.onTitleChange)} />
                                    {errDiv}
                                </div>
                            );
                        }
                    }
                </Field>
                <Field label='Summary'
                    isRequired={false}
                    id='summary'
                    name='summary'
                    defaultValue={this.props.summary}
                >
                    {
                        (fieldArgs: any) => {
                            return (
                                <textarea {...fieldArgs.fieldProps}
                                    className='ac-textarea'
                                    rows={5}
                                    onChange={chain(fieldArgs.fieldProps.onChange, this.props.onSummaryChange)} />
                            );
                        }
                    }
                </Field>
            </div>
        );
    }
}