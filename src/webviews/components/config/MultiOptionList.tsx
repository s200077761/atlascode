import React from 'react';
import { Checkbox } from '@atlaskit/checkbox';
import { CheckboxField } from '@atlaskit/form';
import Button from '@atlaskit/button';
import Tooltip from '@atlaskit/tooltip';
import TrashIcon from '@atlaskit/icon/glyph/trash';
import { ButtonGroup } from '@atlaskit/button';
import { chain } from '../fieldValidators';
import Tag from '@atlaskit/tag';
import debounce from 'lodash.debounce';

type changeObject = { [key: string]: any };

export default class MultiOptionList extends React.Component<
    {
        onConfigChange: (changes: changeObject, removes?: string[]) => void;
        enabledConfig: string;
        optionsConfig: string;
        enabledValue: boolean;
        enabledDescription: string;
        promptString: string;
        options: string[];
    },
    {
        options: string[];
    }
> {
    constructor(props: any) {
        super(props);
        this.state = { options: props.options };
    }

    componentWillReceiveProps(props: any) {
        if (this.state.options.length === 0) {
            this.setState({ options: props.options });
        }
    }

    private htmlForOption(option: string, index: number) {
        return (
            <div id="multi-option-row" key={index}>
                <input
                    className="ac-inputField-inline"
                    id="multi-option-input"
                    name="multi-option-option"
                    type="string"
                    value={option}
                    onChange={(e: any) => this.handleOptionChange(e.target.value, index)}
                />
                <ButtonGroup>
                    <Tooltip content="Delete">
                        <Button
                            className="ac-button"
                            iconBefore={<TrashIcon label="delete" />}
                            onClick={() => {
                                this.deleteOption(index);
                            }}
                        />
                    </Tooltip>
                </ButtonGroup>
            </div>
        );
    }

    handleOptionChange = (option: string, index: number) => {
        const options = [...this.state.options];
        options[index] = option;
        this.setState({ options: options });
        this.publishChanges();
    };

    deleteOption = (index: number) => {
        const options = [...this.state.options];
        options.splice(index, 1);
        this.setState({ options: options });
        this.publishChanges();
    };

    publishChanges = debounce(() => {
        const options = this.state.options;
        const changes = Object.create(null);
        changes[this.props.optionsConfig] = options;
        if (this.props.onConfigChange) {
            this.props.onConfigChange(changes);
        }
    }, 400);

    onNewOption = () => {
        const options = [...this.state.options];
        options.push('');
        this.setState({ options: options });
        this.publishChanges();
    };

    onCheckboxChange = (e: any) => {
        const changes = Object.create(null);
        changes[e.target.value] = e.target.checked;
        if (this.props.onConfigChange) {
            this.props.onConfigChange(changes);
        }
    };

    render() {
        const options = this.state.options;
        return (
            <React.Fragment>
                <CheckboxField name="options-enabled" id="options-enabled" value={this.props.enabledConfig}>
                    {(fieldArgs: any) => {
                        return (
                            <Checkbox
                                {...fieldArgs.fieldProps}
                                label={this.props.enabledDescription}
                                onChange={chain(fieldArgs.fieldProps.onChange, this.onCheckboxChange)}
                                isChecked={this.props.enabledValue}
                            />
                        );
                    }}
                </CheckboxField>
                <div>
                    {options.map((option: string, index: number) => {
                        return this.htmlForOption(option, index);
                        return <Tag text={option} />;
                    })}
                </div>
                <Button className="ac-button" onClick={this.onNewOption}>
                    {this.props.promptString}
                </Button>
            </React.Fragment>
        );
    }
}
