//
// * compare-files
// * https://github.com/floydpink/atom-compare-files
// *
// * Copyright (c) 2014 floydpink
// * Licensed under the MIT license.
//

'use strict';

var plugin = module.exports;
var _ = require('lodash');
var diff = require('diff');
var fs = require('fs');
var path = require('path');
var temp = require('temp').track(true);
var util = require('util');

var resetStatusBar = function () {
  atom.workspaceView.statusBar.find('#compare-files-status-bar').remove();
};

var setStatusMessage = function (message, type) {
  resetStatusBar();
  atom.workspaceView.statusBar.appendLeft('<span id="compare-files-status-bar" class="inline-block ' + type + '">' + message + '</span>');
  _.delay(resetStatusBar, 5000); // Clear the status bar after 5 seconds
};

var compare = function () {
  var selectedItems = atom.workspaceView.find('.tree-view .file.selected');

  if (selectedItems.size() !== 2) {
    setStatusMessage('Compare Files: Select the two files to compare in the tree view.', 'warn');
    return;
  }

  var selectedFilePaths = atom.workspaceView.find('.tree-view').view().selectedPaths();

  var tmpCompareFile = temp.path({suffix : '.diff'});

  var file1 = selectedFilePaths[0];
  var file2 = selectedFilePaths[1];

  var filename1 = path.basename(file1);
  var filename2 = path.basename(file2);

  var fileContents1 = fs.readFileSync(file1).toString();
  var fileContents2 = fs.readFileSync(file2).toString();

  var diffContents = diff.createPatch('', fileContents1, fileContents2);

  fs.writeFile(tmpCompareFile, diffContents, {}, function () {
    atom.workspace.open(tmpCompareFile, {activatePane : true});
    setStatusMessage(util.format('Compare Files: Diff between %s and %s', filename1, filename2), 'info');
    temp.cleanup();
  });

};

plugin.activate = function () {
  return atom.workspaceView.command('compare-files:compare', compare);
};
