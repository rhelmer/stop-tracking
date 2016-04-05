# Stop Tracking
Firefox Add-on providing Tracking Protection UI for advanced users.

Enables Firefox's built-in Tracking Protection features, and provides
the ability to quickly and easily disable/enable and provide comments
and screenshots on sites that don't work correctly.

# Requirements

  Node version 5+
  Firefox 45+

## Install Firefox add-on tool jpm
  npm install jpm -g

## Install test collection server
  npm install

## Run test collection server (in background)
  npm start &

## Run Firefox with tracking add-on
  jpm run

## Generate XPI file for installing, uploading to addons.mozilla.org etc.
  jpm xpi
