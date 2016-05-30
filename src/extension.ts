'use strict';

import * as vscode from 'vscode';
import {XmlCompletionItemProvider} from './xmlCompletionItemProvider';

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider('xml', new XmlCompletionItemProvider()));
}

export function deactivate() {
}