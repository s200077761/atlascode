import * as React from "react";
import { VerticalPadding } from "../styles";
import { Field, ErrorMessage } from '@atlaskit/form';
import { FieldValidators, chain } from '../fieldValidators';

export default class CreatePRTitleSummary extends React.Component<{ title?: string, summary?: string, onTitleChange: (e: any) => void, onSummaryChange: (e: any) => void }, {}> {

    constructor(props: any) {
        super(props);
    }

    render() {
        return (
            <VerticalPadding>
                <Field label='Title' 
                        isRequired={true} 
                        id='title' 
                        name='title' 
                        validate={FieldValidators.validateString}
                        defaultValue={this.props.title}
                        >
            {
                ( fieldArgs:any) => {
                    let errDiv = <span/>;
                    if(fieldArgs.error === 'EMPTY'){
                        errDiv = <ErrorMessage>Title is required</ErrorMessage>;
                    }
                    return (
                        <div>
                        <input {...fieldArgs.fieldProps} 
                            style={{width:'100%', display:'block'}} 
                            className='ak-inputField' 
                            onChange={chain(fieldArgs.fieldProps.onChange, this.props.onTitleChange)}/>
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
                ( fieldArgs:any) => {
                    return (
                        <textarea {...fieldArgs.fieldProps}
                                className='ak-textarea'
                                rows={3}
                                onChange={chain(fieldArgs.fieldProps.onChange, this.props.onSummaryChange)}/>
                    );
                }
            }
            </Field>
            </VerticalPadding>
        );
    }
}