import * as React from "react";
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import { VerticalPadding, TextFieldStyles, TextAreaStyles } from "../styles";

export default class CreatePRTitleSummary extends React.Component<{ title?: string, summary?: string, onTitleChange: (e: any) => void, onSummaryChange: (e: any) => void }, {}> {
    constructor(props: any) {
        super(props);
    }

    render() {
        return (
            <VerticalPadding>
                <label htmlFor="title">Title</label>
                <Textfield name="title" defaultValue="Pull request title" onChange={this.props.onTitleChange} isInvalid={!this.props.title || this.props.title.trim().length === 0}
                    theme={(theme: any, props: any) => ({
                        ...theme(props),
                        ...TextFieldStyles
                    })
                    }
                />

                <label>Summary</label>
                <TextArea resize='auto' minimumRows={3}
                    onChange={this.props.onSummaryChange}
                    theme={(theme: any, props: any) => ({
                        ...theme(props),
                        ...TextAreaStyles
                    })
                    } />
            </VerticalPadding>
        );
    }
}