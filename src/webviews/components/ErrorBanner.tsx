import * as React from 'react';
import SectionMessage from '@atlaskit/section-message';

export default class ErrorBanner extends React.Component<{ errorDetails: any, onDismissError: () => void }, { errorDetails: any }> {
    constructor(props: any) {
        super(props);
        this.state = {
            errorDetails: this.props.errorDetails
        };
    }

    componentWillReceiveProps(nextProps: any) {
        this.setState({
            errorDetails: nextProps.errorDetails
        });
    }

    render() {
        let errorMarkup = [];

        if (typeof this.state.errorDetails === 'object') {
            Object.keys(this.state.errorDetails).forEach(key => {
                errorMarkup.push(<p className='force-wrap'><b>{key}:</b><span className='force-wrap' style={{ marginLeft: '5px' }}>{this.state.errorDetails[key]}</span></p>);
            });
        } else {
            errorMarkup.push(<p className='force-wrap'>{this.state.errorDetails}</p>);
        }

        return (
            <SectionMessage
                appearance="warning"
                title="Something went wrong"
                actions={[{ text: 'Dismiss', onClick: () => { this.setState({ errorDetails: undefined }); this.props.onDismissError(); } }]}>
                <div>{errorMarkup}</div>
            </SectionMessage>
        );
    }
}