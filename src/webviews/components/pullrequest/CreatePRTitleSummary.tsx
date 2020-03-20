import { ErrorMessage, Field } from '@atlaskit/form';
import React, { useEffect, useState } from 'react';
import { Commit } from '../../../bitbucket/model';
import * as FieldValidators from '../fieldValidators';

type TitleSummaryProps = {
    sourceBranchName: string;
    commits: Commit[];
};

const createdFromAtlascodeFooter =
    '\n\n---\n_Created from_ [_Atlassian for VS Code_](https://marketplace.visualstudio.com/items?itemName=Atlassian.atlascode)';

export const CreatePRTitleSummary: React.FC<TitleSummaryProps> = (props: TitleSummaryProps) => {
    const [dirty, setDirty] = useState(false);
    const [title, setTitle] = useState('');
    const [summary, setSummary] = useState('');

    useEffect(() => {
        if (!dirty) {
            if (props.commits.length > 0) {
                setTitle(
                    props.commits.length === 1
                        ? props.commits[0].message!.split('\n', 1)[0].trim()
                        : props.sourceBranchName
                );
                setSummary(
                    props.commits.length === 1
                        ? `${props.commits[0]
                              .message!.substring(props.commits[0].message!.indexOf('\n') + 1)
                              .trimLeft()}${createdFromAtlascodeFooter}`
                        : `${props.commits
                              .map(c => `* ${c.message.trimRight()}`)
                              .join('\n\n')}${createdFromAtlascodeFooter}`
                );
            } else {
                setTitle(props.sourceBranchName);
                setSummary(createdFromAtlascodeFooter);
            }
        }
    }, [dirty, props]);

    return (
        <div className="ac-vpadding">
            <Field
                label="Title"
                isRequired={true}
                id="title"
                name="title"
                validate={FieldValidators.validateString}
                defaultValue={title}
            >
                {(fieldArgs: any) => {
                    let errDiv = <span />;
                    if (fieldArgs.error === 'EMPTY') {
                        errDiv = <ErrorMessage>Title is required</ErrorMessage>;
                    }
                    return (
                        <div>
                            <input
                                {...fieldArgs.fieldProps}
                                style={{ width: '100%', display: 'block' }}
                                className="ac-inputField"
                                onChange={FieldValidators.chain(fieldArgs.fieldProps.onChange, () => setDirty(true))}
                            />
                            {errDiv}
                        </div>
                    );
                }}
            </Field>
            <Field label="Summary" isRequired={false} id="summary" name="summary" defaultValue={summary}>
                {(fieldArgs: any) => {
                    return (
                        <textarea
                            {...fieldArgs.fieldProps}
                            className="ac-textarea"
                            rows={5}
                            onChange={FieldValidators.chain(fieldArgs.fieldProps.onChange, () => setDirty(true))}
                        />
                    );
                }}
            </Field>
        </div>
    );
};
