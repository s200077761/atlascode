import { CodeLens, Range, Position, TextDocument, CancellationToken } from "vscode";
import { parseJiraIssueKeys } from "./issueKeyParser";
import { Container } from "../container";

interface LensMatch {
    document: TextDocument;
    text: string;
    range: Range;
}

export function provideCodeLenses(document: TextDocument, token: CancellationToken): CodeLens[] {
    if (!Container.config.jira.todoIssues.enabled) {
        return [];
    }

    const matches = findTodos(document);
    return matches.map(match => {
        const insertionPoint = new Position(match.range.end.line, match.range.end.character + 1);
        return new CodeLens(match.range, {
            title: 'Create Jira Issue',
            command: 'atlascode.jira.createIssue',
            arguments: [{ fromCodeLens: true, summary: match.text, uri: document.uri, insertionPoint: insertionPoint }]
        });
    });
}

function findTodos(document: TextDocument) {
    const triggers = Container.config.jira.todoIssues.triggers;
    const matches: LensMatch[] = [];
    for (let i = 0; i < document.lineCount; i++) {
        const line = document.lineAt(i).text;
        for (var j = 0; j < triggers.length; j++) {
            const word = triggers[j];
            const index = line.indexOf(word);
            if (index >= 0) {
                const issueKeys = parseJiraIssueKeys(line);
                if (issueKeys.length === 0) {
                    const range = new Range(new Position(i, index), new Position(i, index + word.length - 1));
                    const ersatzSummary = line.substr(index + word.length).trim();
                    matches.push({ document: document, text: ersatzSummary, range: range });
                }
            }
        }
    }
    return matches;
}
