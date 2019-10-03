import * as React from 'react';

type Props = {
    label: string,
    onOpenEditor: () => void;
    disabled: boolean;
};

interface State {
}

export default class InlineWorklogLauncher extends React.Component<Props, State> {
    constructor(props: any) {
        super(props);
    }


    render() {
        return (
            <React.Fragment>
                <div className='label-and-button'>
                    <label className='ac-field-label' htmlFor='subtasks-editor'>{this.props.label}</label>
                    <button className='ac-inline-add-button'
                        onClick={this.props.onOpenEditor}
                        disabled={this.props.disabled}
                    />
                </div>
            </React.Fragment>
        );
    }
}