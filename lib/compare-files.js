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
var url = require('url');
var util = require('util');
var CompareFilesView = require('./compare-files-view');

var resetStatusBar = function () {
  atom.workspaceView.statusBar.find('#compare-files-status-bar').remove();
};

var setStatusMessage = function (message, type) {
  resetStatusBar();
  atom.workspaceView.statusBar.appendLeft('<span id="compare-files-status-bar" class="inline-block ' + type + '">' + message + '</span>');
  _.delay(resetStatusBar, 5000); // Clear the status bar after 5 seconds
};

var registerOpener = function () {
  atom.workspace.registerOpener(function (uriToOpen) {
    var parsedUrl = url.parse(uriToOpen);
    var protocol = parsedUrl.protocol;
    var host = parsedUrl.host;
    var pathname = parsedUrl.pathname;

    if (pathname) {
      pathname = decodeURI(pathname);
    }
    if (protocol !== 'compare-files:') {
      return;
    }
    if (host === 'editor') {
      return new CompareFilesView({
        filesName : pathname.substring(1)
      });
    }
  });
};

var compare = function () {
  var selectedItems = atom.workspaceView.find('.tree-view .file.selected');

  if (selectedItems.size() !== 2) {
    setStatusMessage('Compare Files: Select the two files to compare in the tree view.', 'warn');
    return;
  }

  var selectedFilePaths = atom.workspaceView.find('.tree-view').view().selectedPaths();

  var uri = util.format('compare-files://editor/%s...%s', selectedFilePaths[0], selectedFilePaths[1]);

  atom.workspace.
      open(uri, { searchAllPanes : true }).
      done(function (compareFilesView) {
        if (compareFilesView instanceof CompareFilesView) {
          _.delay(function () {
            compareFilesView.renderDiffContent();
            setStatusMessage(util.format('Compare Files: Diff between %s and %s',
                compareFilesView.filename1, compareFilesView.filename2), 'info');
          }, 100);
        }
      });
};

plugin.activate = function () {
  registerOpener();
  return atom.workspaceView.command('compare-files:compare', compare);
};
