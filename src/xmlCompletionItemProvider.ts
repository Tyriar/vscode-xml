'use strict';

import {CancellationToken, CompletionItem, CompletionItemProvider, Position, Range, TextDocument, Uri} from 'vscode';
import {Xsd} from './xsd';
import {getXPath} from './xmlUtils'

export class XmlCompletionItemProvider implements CompletionItemProvider {
    private xsd = new Xsd();

    public provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken): Promise<CompletionItem[]> {
        let xsdUri: Uri = this.getXsdUri(document);
        if (!xsdUri) {
            // No schema
            return Promise.resolve([]);
        }

        console.log('provideCompletionItems');

        this.xsd.load(document.uri, xsdUri);
        //xsd.load options.editor.getPath(), newUri, =>
        //  @lastXsdUri = newUri
        return Promise.resolve(this.getSuggestions(document, position, token));

        /*console.log(document, position, token);
        let result: CompletionItem[] = [];
        let suggestion = new CompletionItem('testLabel');
        suggestion.documentation = 'testDocumentation';
        suggestion.detail = 'testDetail';
        result.push(suggestion);
        return Promise.resolve(result);*/
    }

    private getSuggestions(document: TextDocument, position: Position, token: CancellationToken): Promise<CompletionItem[]> {
        if (this.isTagName(document, position)) {
            console.log('getTagNameCompletions');
            return Promise.resolve(this.getTagNameCompletions(document, position, token));
        } else if (this.isClosingTagName(document, position)) {
            return Promise.resolve(this.getClosingTagNameCompletions(document, position));
        }
    }

    private isTagName(document: TextDocument, position: Position) {
        return this.textBeforeWordEquals(document, position, '<');
    }

    private isClosingTagName(document: TextDocument, position: Position) {
        return this.textBeforeWordEquals(document, position, '</');
    }

    private textBeforeWordEquals(document: TextDocument, position: Position, textToMatch: string) {
        let wordRange = document.getWordRangeAtPosition(position);
        let wordStart = wordRange ? wordRange.start : position;
        if (wordStart.character < textToMatch.length) {
            // Not enough room to match
            return false;
        }
        console.log('********* textBeforeWordEquals', wordStart);
        let charBeforeWord = document.getText(new Range(new Position(wordStart.line, wordStart.character - textToMatch.length), wordStart));
        console.log('********* textBeforeWordEquals charBeforeWord=' + charBeforeWord);
        return charBeforeWord === textToMatch;
    }

    private getTagNameCompletions(document: TextDocument, position: Position, token: CancellationToken): CompletionItem[] {
        let completions: CompletionItem[] = [];
        // Get the children of the current XPath tag.
        let xPath = getXPath(document, position);
        console.log('getTagNameCompletions -> xpath', xPath);
        let children = this.xsd.getChildren(xPath);

        // Apply a filter with the current prefix and return.
        console.log('getTagNameCompletions -> children', children);
        children.forEach((child) => {
            let suggestion = new CompletionItem(child.displayText);
            suggestion.detail = child.rightLabel;
            completions.push(suggestion);
        });
        return completions;
    }

    private getClosingTagNameCompletions(document: TextDocument, position: Position): CompletionItem[] {
        let xPath = getXPath(document, position);
        let parentTag = xPath[xPath.length - 1];
        let suggestion = new CompletionItem(parentTag);
        suggestion.detail = 'Closing tag';
        return [suggestion];
    }

    private getXsdUri(document: TextDocument): Uri {
        let xmlValidation = /xmlns:xsi="http:\/\/www.w3.org\/2001\/XMLSchema-instance"/;
        let xsdPattern = /xsi:noNamespaceSchemaLocation="(.+)"/;
        let xsdWithNamespacePattern = /xsi:schemaLocation="\S+\s+(.+)"/;
        let text = document.getText();
        if (text.match(xmlValidation)) {
            let xsdMatch = text.match(xsdPattern);
            if (xsdMatch) {
                return Uri.parse(xsdMatch[1]);
            } else {
                let xsdWithNamespaceMatch = text.match(xsdWithNamespacePattern);
                if (xsdWithNamespaceMatch) {
                    return Uri.parse(xsdWithNamespaceMatch[1]);
                } 
            }
        }
        return null;
    }
}