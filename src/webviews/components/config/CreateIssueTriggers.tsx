import React from "react";
import { Checkbox } from '@atlaskit/checkbox';
import { CheckboxField } from '@atlaskit/form';
import Button from "@atlaskit/button";
import Tooltip from '@atlaskit/tooltip';
import TrashIcon from '@atlaskit/icon/glyph/trash';
import { ButtonGroup } from "@atlaskit/button";
import { ConfigData } from "../../../ipc/configMessaging";
import { chain } from '../fieldValidators';
import Tag from "@atlaskit/tag";

type changeObject = { [key: string]: any };

export default class CreateIssueTriggers extends React.Component<
    {
        configData: ConfigData,
        onConfigChange: (changes: changeObject, removes?: string[]) => void
    }, {}> {

    constructor(props: any) {
        super(props);
    }

    private htmlForTrigger(trigger: string, index: number) {
        return (
            <div id="trigger-row" >
                <input className='ac-inputField-inline'
                    id="jira-todoTrigger-input"
                    name="jira-todoIssues-trigger"
                    type="string"
                    value={trigger}
                    onChange={(e: any) => this.handleTriggerChange(e.target.value, index)}
                    disabled={!this.props.configData.config.jira.todoIssues.enabled} />

                <ButtonGroup>
                    <Tooltip content="Delete">
                        <Button
                            className="ac-button"
                            iconBefore={<TrashIcon label="delete" />}
                            onClick={() => {
                                this.deleteTrigger(index);
                            }}
                        />
                    </Tooltip>
                </ButtonGroup>
            </div>
        );
    }

    copyTriggers = () => {
        return this.props.configData.config.jira.todoIssues.triggers.slice();
    }

    handleTriggerChange = (trigger: string, index: number) => {
        const triggers = this.copyTriggers();
        triggers[index] = trigger;
        this.setState({ triggers: triggers });
        this.publishChanges(triggers);
    }

    deleteTrigger = (index: number) => {
        const triggers = this.copyTriggers();
        triggers.splice(index, 1);
        this.setState({ triggers: triggers });
        this.publishChanges(triggers);
    }

    publishChanges = async (triggers: string[]) => {
        const changes = Object.create(null);
        changes['jira.todoIssues.triggers'] = triggers;
        if (this.props.onConfigChange) {
            this.props.onConfigChange(changes);
        }
    }

    onNewTrigger = () => {
        const triggers = this.copyTriggers();
        triggers.push('');
        this.setState({ triggers: triggers });
        this.publishChanges(triggers);
    }

    onCheckboxChange = (e: any) => {
        const changes = Object.create(null);
        changes[e.target.value] = e.target.checked;
        if (this.props.onConfigChange) {
            this.props.onConfigChange(changes);
        }
    }

    render() {
        const triggers = this.props.configData.config.jira.todoIssues.triggers;
        return (
            <React.Fragment>
                <CheckboxField
                    name='jira-todoIssues-enabled'
                    id='jira-todoIssues-enabled'
                    value='jira.todoIssues.enabled'>
                    {
                        (fieldArgs: any) => {
                            return (
                                <Checkbox {...fieldArgs.fieldProps}
                                    label='Prompt to create Jira issues for TODO comments'
                                    onChange={chain(fieldArgs.fieldProps.onChange, this.onCheckboxChange)}
                                    isChecked={this.props.configData.config.jira.todoIssues.enabled}
                                />
                            );
                        }
                    }
                </CheckboxField>
                <div>
                    {triggers.map((trigger: string, index: number) => {
                        return this.htmlForTrigger(trigger, index); return <Tag text={trigger} />;
                    })}
                </div>
                <Button className="ac-button" onClick={this.onNewTrigger}>
                    Add Trigger
                </Button>
            </React.Fragment>
        );
    }
}
