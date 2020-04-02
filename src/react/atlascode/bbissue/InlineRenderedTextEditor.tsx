import { InlineTextEditor } from '@atlassianlabs/guipi-core-components';
import { Grid, Link, TextFieldProps, Typography } from '@material-ui/core';
import React, { useState } from 'react';

type InlineTextEditorProps = {
    onSave?: (value: string) => void;
    onCancel?: (initialValue: string, value: string) => void;
    hideLabelOnBlur?: boolean;
    saveDisabled?: (value: string) => boolean;
    renderedHtml: string;
};

const InlinedRenderedTextEditor: React.FC<TextFieldProps & InlineTextEditorProps> = (
    props: TextFieldProps & InlineTextEditorProps
) => {
    const [isEditing, setIsEditing] = useState(false);

    return isEditing ? (
        <InlineTextEditor
            fullWidth
            multiline
            rows={4}
            defaultValue={props.defaultValue}
            onSave={(value: string) => {
                setIsEditing(false);
                props.onSave?.(value);
            }}
            onCancel={() => setIsEditing(false)}
        />
    ) : (
        <Grid container spacing={1} direction="column">
            <Grid item>
                <Typography variant="body1" dangerouslySetInnerHTML={{ __html: props.renderedHtml }}></Typography>
            </Grid>
            <Grid item>
                <Link href="#" onClick={() => setIsEditing(true)}>
                    Edit
                </Link>
            </Grid>
        </Grid>
    );
};

export default InlinedRenderedTextEditor;
