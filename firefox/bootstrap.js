/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { utils: Cu, interfaces: Ci, classes: Cc } = Components;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/AddonManager.jsm");

const ADBLOCKERS = ["uBlock0@raymondhill.net"];

function showInfobar(gBrowser) {
  let notificationBox = gBrowser.getNotificationBox();
  let notification = notificationBox.getNotificationWithValue("stop-tracking-request");
  // TODO clear any infoboxes for previous sites loaded in this tab
  if (!notification) {
    let message = `Tracking Protection active for ${gBrowser.currentURI.host}, how does this page look?`;
    let buttons = [{
      label: "Report a problem",
      callback: function () {
        console.log("report problem with tracking protection");
        // TODO hook up report
      }
    }];
    let notificationBar = notificationBox.appendNotification(
                            message, "stop-tracking-request", "",
                            notificationBox.PRIORITY_INFO_LOW,
                            buttons);
    notificationBar.persistence = 1;
  }
}

function attachInfobar(domWindow) {
  if (domWindow.gBrowser && domWindow.gBrowser.tabContainer) {
    let gBrowser = domWindow.gBrowser;
    gBrowser.tabContainer.addEventListener("load", function (evt) {
      let doc = evt.target.ownerDocument;
      let win = evt.target.ownerGlobal;
      let elem = doc.getElementById("tracking-blocked");
      if (win.getComputedStyle(elem).getPropertyValue("display") != "none") {
        showInfobar(gBrowser);
      }
    }, true);
  }
}

let windowListener = {
  onOpenWindow: aWindow => {
    let domWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindow);
    domWindow.addEventListener("load", function () {
      domWindow.removeEventListener("load", this, false);
      attachInfobar(domWindow);
    }, false);
  },
};

function startup() {
  // disable existing ad blockers
  // FIXME use promise here
  AddonManager.getAddonsByTypes(["extension"], (addons => {
    for (let addon of addons) {
      if (addon) {
        for (let blocked of ADBLOCKERS) {
          if (addon.id == blocked) {
            // TODO should notify users that adblockers are disabled
            console.log(`disabling ad blocker ${addon.id}`);
            addon.userDisabled = true;
          }
        }
      }
    }
  }));

  // enable built-in tracking protection
  Services.prefs.setBoolPref("privacy.trackingprotection.enabled", true);

  // attach listener to existing browser windows
  let windows = Services.wm.getEnumerator("navigator:browser");
  while (windows.hasMoreElements()) {
    // TODO does this also attach to existing tabs?
    let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
    attachInfobar(domWindow);
  }

  // attach listener to any new windows
  Services.wm.addListener(windowListener);
}
function shutdown() {
  // disable built-in tracking protection
  Services.prefs.setBoolPref("privacy.trackingprotection.enabled", false);

  // remove listener from existing windows
  let windows = Services.wm.getEnumerator("navigator:browser");
  while (windows.hasMoreElements()) {
    let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
    // TODO remove listeners
  }

  // stop listening for new windows
  Services.wm.removeListener(windowListener);

  // FIXME only enable adblockers that we actually disabled
  // FIXME use promise here
  AddonManager.getAddonsByTypes(["extension"], (addons => {
    for (let addon of addons) {
      if (addon) {
        for (let blocked of ADBLOCKERS) {
          if (addon.id == blocked) {
            console.log(`enabling ad blocker ${addon.id}`);
            addon.userDisabled = false;
          }
        }
      }
    }
  }));
}
function install() {}
function uninstall() {}
