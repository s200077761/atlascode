import { SimpleNode } from "./simpleNode";
import { Commands } from "../../commands";

export const emptyBitbucketNodes: SimpleNode[] = [
    new SimpleNode('No authenticated Bitbucket repositories found.'),
    new SimpleNode('Please make sure you have a project open that was cloned from Bitbucket.'),
    new SimpleNode('Please make sure you have authenticated with the remote.', { command: Commands.ShowConfigPage, title: "Login to Bitbucket" }),
    new SimpleNode('You can check your open repositories in the Source Control pane (Ctrl+Shift+G).'),
];