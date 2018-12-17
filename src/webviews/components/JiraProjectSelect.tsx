import React from 'react';
import { AsyncSelect } from '@atlaskit/select';
import { WorkingProject } from '../../config/model';

type myProps = { initialOptions: WorkingProject[], selectedOption:WorkingProject, onSelect:(selected:WorkingProject)=>void, onQuery:(input:string) => Promise<any> };
export default class JiraProjectSelect extends React.Component<myProps, WorkingProject> {
    constructor(props: any) {
        super(props);
        this.state = props.selectedOption;
        console.log(this.state);
        console.log(props.selectedOption);
    }

    optionLabel = (option:WorkingProject) => {
        return option.name;
    }

    optionValue = (option:WorkingProject) => {
        return option.key;
    }

    // async load function using callback (promises also supported)
    loadOptions = (inputValue:string) => {
        return this.props.onQuery(inputValue);
    }

    componentWillReceiveProps(props:myProps) {
        this.setState(props.selectedOption);
    }

    handleChange = (selectedValue:WorkingProject) => {
        this.setState(selectedValue);
        this.props.onSelect(selectedValue);
    }

    render() {
        return (
            <AsyncSelect
                className="ak-select-container"
                classNamePrefix="ak-select"
                getOptionLabel={this.optionLabel}
                getOptionValue={this.optionValue}
                value={this.state}
                onChange={this.handleChange}
                defaultOptions={this.props.initialOptions}
                loadOptions={this.loadOptions}
                placeholder="Choose a Project"
            />
        );
    }
}

