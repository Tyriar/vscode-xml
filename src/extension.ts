'use strict';

import * as vscode from 'vscode';
import {XmlCompletionItemProvider} from './xmlCompletionItemProvider';

export function activate(context: vscode.ExtensionContext) {
  let completionItemProviuder = vscode.languages.registerCompletionItemProvider('xml', new XmlCompletionItemProvider(), '<', '"', ' ', '/');
  context.subscriptions.push(completionItemProviuder);
}

export function deactivate() {
}
