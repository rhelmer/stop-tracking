# Stop Tracking
Firefox Add-on providing Tracking Protection UI for advanced users.

Enables Firefox's built-in Tracking Protection features, and provides
the ability to quickly and easily disable/enable and provide comments
and screenshots on sites that don't work correctly.

Installing this add-on will:

 1. disable any built-in adblockers
 2. automatically enable tracking protection (via the pref)
 3. show a low-priority infobar when tracking elements are detected.

The infobar prompts users to report a problem (with optional screenshot).

TODO:
 * implement report page (overlay content)
 * remember sites which have already been reported or infobar dismissed
 * add report invocation button to control center location
 * either prompt for permission or notify about disabling existing adblockers

# Requirements

  Node version 5+
  Firefox 45+

## Install test collection server
  npm install

## Install Firefox `jpm` add-ons tool globally
  npm install -g jpm

# Running

## Run test collection server (in background)
  npm start &

## Start Nightly Firefox with fresh profile and add-on installed
  jpm --addon-dir=firefox run -b <path_to_nightly>

# Packaging

## Produce a XPI file for uploading to addons.mozilla.org
  jpm --addon-dir=firefox xpi
