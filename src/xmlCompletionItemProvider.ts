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
    this.xsd.load(document.uri, xsdUri);
    return Promise.resolve(this.getSuggestions(document, position, token));
  }

  private getSuggestions(document: TextDocument, position: Position, token: CancellationToken): Promise<CompletionItem[]> {
    if (this.isTagName(document, position)) {
      return Promise.resolve(this.getTagNameCompletions(document, position, token));
    } else if (this.isClosingTagName(document, position)) {
      return Promise.resolve(this.getClosingTagNameCompletions(document, position));
    } else if (this.isAttributeValue(document, position)) {
      return Promise.resolve(this.getAttributeValueCompletions(document, position));
    } else if (this.isAttribute(document, position)) {
      return Promise.resolve(this.getAttributeCompletions(document, position));
    }/* else if (this.isTagValue(document, position)) {
      return Promise.resolve(this.getValuesCompletions(document, position));
    }*/
    return Promise.resolve([]);
  }

  private isTagName(document: TextDocument, position: Position): boolean {
    return this.textBeforeWordEquals(document, position, '<');
  }

  private isClosingTagName(document: TextDocument, position: Position): boolean {
    return this.textBeforeWordEquals(document, position, '</');
  }

  // Check if the cursor is about complete the value of an attribute.
  private isAttributeValue(document: TextDocument, position: Position): boolean {
    let wordRange = document.getWordRangeAtPosition(position);
    let wordStart = wordRange ? wordRange.start : position;
    let wordEnd = wordRange ? wordRange.end : position;
    if (wordStart.character === 0 || wordEnd.character > document.lineAt(wordEnd.line).text.length - 1) {
      return false;
    }
    // TODO: This detection is very limited, only if the char before the word is ' or "
    let rangeBefore = new Range(wordStart.line, wordStart.character - 1, wordStart.line, wordStart.character);
    if (document.getText(rangeBefore).match(/'|"/)) {
      return true;
    }
    return false;
  }

  private isAttribute(document: TextDocument, position: Position): boolean {
    let wordRange = document.getWordRangeAtPosition(position);
    let wordStart = wordRange ? wordRange.start : position;
    let text = document.getText();
    return text.lastIndexOf('<', document.offsetAt(wordStart)) > text.lastIndexOf('>', document.offsetAt(wordStart));
  }

  private textBeforeWordEquals(document: TextDocument, position: Position, textToMatch: string) {
    let wordRange = document.getWordRangeAtPosition(position);
    let wordStart = wordRange ? wordRange.start : position;
    if (wordStart.character < textToMatch.length) {
      // Not enough room to match
      return false;
    }
    let charBeforeWord = document.getText(new Range(new Position(wordStart.line, wordStart.character - textToMatch.length), wordStart));
    return charBeforeWord === textToMatch;
  }

  private getTagNameCompletions(document: TextDocument, position: Position, token: CancellationToken): CompletionItem[] {
    let completions: CompletionItem[] = [];
    // Get the children of the current XPath tag.
    let xPath = getXPath(document, position);
    let children = this.xsd.getChildren(xPath);

    // Apply a filter with the current prefix and return.
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

  private getAttributeValueCompletions(document: TextDocument, position: Position): CompletionItem[] {
    let completions: CompletionItem[] = [];

    // Get the attribute name
    let wordRange = document.getWordRangeAtPosition(position);
    let wordStart = wordRange ? wordRange.start : position;
    let line = document.getText(new Range(wordStart.line, 0, wordStart.line, wordStart.character));
    let attrNamePattern = /[\.\-:_a-zA-Z0-9]+=/g;
    let match = line.match(attrNamePattern);
    if (match) {
      let attrName = match.reverse()[0];
      attrName = attrName.slice(0, -1);

      // Get the XPath
      let xpath = getXPath(document, position);

      // Get the children of the XPath
      let children = this.xsd.getAttributeValues(xpath, attrName);

      // Apply a filter with the current prefix and return.
      children.forEach((child) => {
        let suggestion = new CompletionItem(child.displayText);
        suggestion.detail = child.rightLabel;
        completions.push(suggestion);
      });
    }
    return completions;
  }

  private getAttributeCompletions(document: TextDocument, position: Position): CompletionItem[] {
    console.log('getAttributeCompletions');
    let completions: CompletionItem[] = [];

    // Get the attributes of the current XPath tag.
    let attributes = this.xsd.getAttributes(getXPath(document, position));

    completions = attributes.map((attr) => {
      let suggestion = new CompletionItem(attr.displayText);
      suggestion.detail = attr.rightLabel;
      completions.push(suggestion);
      return suggestion;
    });

    //# Apply a filter with the current prefix and return.
    return completions
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
