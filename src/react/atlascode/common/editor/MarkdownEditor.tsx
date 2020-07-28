import { Box, Button, Grid, makeStyles, Theme } from '@material-ui/core';
import { buildMenuItems, exampleSetup } from 'prosemirror-example-setup';
import { emDash, InputRule, inputRules } from 'prosemirror-inputrules';
import { defaultMarkdownSerializer, MarkdownSerializer, schema as markdownSchema } from 'prosemirror-markdown';
import { addMentionNodes, getMentionsPlugin } from 'prosemirror-mentions';
import { Schema } from 'prosemirror-model';
import { EditorState, Plugin, PluginKey } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import React, { useCallback, useEffect, useRef } from 'react';
import { User } from '../../../../bitbucket/model';

function markInputRule(regexp: RegExp, markType: any, getAttrs: any) {
    return new InputRule(regexp, (state: EditorState, match: string[], start: number, end: number) => {
        const attrs = getAttrs instanceof Function ? getAttrs(match) : getAttrs;
        const tr = state.tr;
        const completeMatch = match[0];
        const prefix = match.length > 2 ? match[1] : '';
        const text = match.length > 2 ? match[2] : match[1];
        if (text) {
            const textStart = start + completeMatch.indexOf(text);
            const textEnd = textStart + text.length;
            if (textEnd < end) {
                tr.delete(textEnd, end);
            }
            if (textStart > start) {
                tr.delete(start + prefix.length, textStart);
            }
            end = start + prefix.length + text.length;
        }

        tr.addMark(start + prefix.length, end, markType.create(attrs));
        tr.removeStoredMark(markType); // Do not continue with mark.
        return tr;
    });
}

const buildInputRules = (schema: any) => {
    const result = [];
    let type: any;

    if ((type = schema.marks.strong)) {
        result.push(markInputRule(/(?:\*\*)([^\*_]+)(?:\*\*|__)$/, type, undefined));
        result.push(markInputRule(/(?:__)([^_]+)(?:__)$/, type, undefined));
    }
    if ((type = schema.marks.em)) {
        result.push(markInputRule(/(^|[^\*])(?:\*)([^\*]+)(?:\*)$/, type, undefined));
        result.push(markInputRule(/(^|[^_])(?:_)([^_]+)(?:_)$/, type, undefined));
    }

    return result;
};

var schema = new Schema({
    nodes: addMentionNodes(markdownSchema.spec.nodes),
    marks: markdownSchema.spec.marks,
});

// https://github.com/ProseMirror/prosemirror-markdown/blob/master/src/to_markdown.js
const mdSerializer = new MarkdownSerializer(
    {
        ...defaultMarkdownSerializer.nodes,
        mention: (state: any, node: any) => {
            state.write(node.attrs.id);
        },
    },
    defaultMarkdownSerializer.marks
);

/**
 * IMPORTANT: outer div's "suggestion-item-list" class is mandatory. The plugin uses this class for querying.
 * IMPORTANT: inner div's "suggestion-item" class is mandatory too for the same reasons
 */
var getMentionSuggestionsHTML = (items: any[]) =>
    '<div class="suggestion-item-list">' +
    items.map((i) => '<div class="suggestion-item">' + i.name + '</div>').join('') +
    '</div>';

const reactPropsKey = new PluginKey('reactProps');

function reactProps(initialProps: any) {
    return new Plugin({
        key: reactPropsKey,
        state: {
            init: () => initialProps,
            apply: (tr, prev) => tr.getMeta(reactPropsKey) || prev,
        },
    });
}

// https://github.com/mui-org/material-ui/blob/master/packages/material-ui/src/OutlinedInput/OutlinedInput.js
const useStyles = makeStyles(
    (theme: Theme) =>
        ({
            editor: {
                borderWidth: 1,
                borderStyle: 'solid',
                borderColor: theme.palette.type === 'light' ? 'rgba(0, 0, 0, 0.23)' : 'rgba(255, 255, 255, 0.23)',
                borderRadius: theme.shape.borderRadius,
                '&:hover': {
                    borderColor: theme.palette.text.primary,
                },
                '&:focus-within': {
                    borderColor: theme.palette.primary.main,
                    borderWidth: 2,
                },
            },
        } as const)
);

interface PropsType {
    onSave: any;
    fetchUsers: (input: string) => Promise<User[]>;
}

export const Editor: React.FC<PropsType> = (props: PropsType) => {
    const classes = useStyles();

    const viewHost = useRef<HTMLDivElement>(null);
    const view = useRef<EditorView | null>(null);

    const clearEditor = useCallback(() => {
        const slice = view.current?.state.doc.slice(0);
        const tr = view.current!.state.tr.delete(0, slice?.size || 0);
        view.current?.dispatch(tr);
    }, []);

    const handleSave = useCallback(() => {
        const mdContent: string = mdSerializer.serialize(view.current!.state.doc);
        if (mdContent.trim().length > 0) {
            props.onSave(mdContent);
        }

        clearEditor();
    }, [clearEditor, props]);

    useEffect(() => {
        // initial render
        const menuItems = buildMenuItems(schema);
        const state = EditorState.create({
            schema,
            //doc: defaultMarkdownParser.parse(defaultContent),
            plugins: [
                // https://github.com/joelewis/prosemirror-mentions
                getMentionsPlugin({
                    getSuggestions: async (type: any, text: string, done: any) => {
                        if (type === 'mention') {
                            const users = await props.fetchUsers(text);
                            done(
                                users.map((u) => ({
                                    name: u.displayName,
                                    id: u.mention,
                                    email: u.emailAddress || '',
                                }))
                            );
                        }
                    },
                    getSuggestionsHTML: (items: any[], type: any) => {
                        if (type === 'mention') {
                            return getMentionSuggestionsHTML(items);
                        } else {
                            return <></>;
                        }
                    },
                }),
                reactProps(props),
                ...exampleSetup({
                    schema,
                    menuContent: [
                        [menuItems.toggleStrong, menuItems.toggleEm, menuItems.toggleCode],
                        [menuItems.wrapBulletList, menuItems.wrapOrderedList, menuItems.wrapBlockQuote],
                    ],
                }),
                inputRules({ rules: [emDash, ...buildInputRules(schema)] }),
            ],
        });
        const currView = new EditorView(viewHost.current!, { state });
        view.current = currView;
        return () => currView.destroy();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        // every render
        if (view.current) {
            const tr = view.current.state.tr.setMeta(reactPropsKey, props);
            view.current.dispatch(tr);
        }
    });

    return (
        <Grid container spacing={1} direction="column">
            <Grid item>
                {/* https://github.com/mui-org/material-ui/issues/17010 */}
                <Box minHeight="8em" className={classes.editor} {...({ ref: viewHost } as any)} />
            </Grid>
            <Grid item>
                <Grid container spacing={1}>
                    <Grid item>
                        <Button variant="contained" color="primary" onClick={handleSave}>
                            Save
                        </Button>
                    </Grid>
                    <Grid item>
                        <Button variant="contained" onClick={clearEditor}>
                            Cancel
                        </Button>
                    </Grid>
                </Grid>
            </Grid>
        </Grid>
    );
};
