import { Commands } from '../commands';
import { iconSet } from '../resources';
import { BaseTreeDataProvider } from './Explorer';
import { AbstractBaseNode } from './nodes/abstractBaseNode';
import { InternalLinkNode } from './nodes/internalLinkNode';
import { IssueNode } from './nodes/issueNode';
import { LinkNode } from './nodes/linkNode';

export class HelpDataProvider extends BaseTreeDataProvider {
    constructor() {
        super();
    }

    getTreeItem(element: AbstractBaseNode) {
        return element.getTreeItem();
    }

    async getChildren(element: IssueNode | undefined) {
        return [
            new LinkNode(
                'Get Started',
                'Check out our quick-start guide',
                iconSet.ATLASSIANICON,
                'https://confluence.atlassian.com/bitbucket/getting-started-with-vs-code-969520759.html'
            ),
            new LinkNode(
                'What is JQL?',
                'Learn about Jira Query Language',
                iconSet.JIRAICON,
                'https://www.atlassian.com/blog/jira-software/jql-the-most-flexible-way-to-search-jira-14'
            ),
            new LinkNode(
                'Contribute',
                'Create pull requests for this extension',
                iconSet.PULLREQUEST,
                'https://bitbucket.org/atlassianlabs/atlascode/src/devel/'
            ),
            new LinkNode(
                'Report an Issue',
                'Report and vote on issues',
                iconSet.ISSUES,
                'https://bitbucket.org/atlassianlabs/atlascode/issues?status=new&status=open'
            ),
            new InternalLinkNode(
                'Explore Features',
                'Overwhelmed? Check out some of the most common features, all in one place',
                iconSet.SEARCH,
                {
                    command: Commands.ShowExploreSettings,
                    title: 'Open Explore Page',
                }
            ),
        ];
    }
}
