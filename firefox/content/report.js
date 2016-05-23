"use strict";

var reportsServer = "http://localhost:5000/upload";
var productName = "TrackingProtection";
// FIXME get this from the addon
var version = "0.0.2";

function submitReport(comments, url, screenshot) {
    var serverURL = reportsServer;
    var xhr = new XMLHttpRequest();

    var form = {
        "ProductName": productName,
        "Version": version,
        "Comments": comments,
        "URL": url,
    };
    if (screenshot && document.getElementById("screenshot").checked) {
        form["screenshot"] = screenshot;
    }

    xhr.open("POST", serverURL, true);
    var boundary=Math.random().toString().substr(2);
    xhr.setRequestHeader("content-type",
        "multipart/form-data; charset=utf-8; boundary=" + boundary);

    var multipart = "";
    for (var key in form) {
        multipart += "--" + boundary +
            "\r\nContent-Disposition: form-data; name=\"" + key + "\"" +
            "\r\nContent-type: text/plain" +
            "\r\n\r\n" + form[key] + "\r\n";
    }
    multipart += "--" + boundary + "--\r\n";

    var status = document.getElementById("status");
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
          if (xhr.status == 200) {
            console.log("report id:", xhr.responseText);
            status.textContent = "report sent, thanks!";
            var textarea = document.getElementById("report-content");
            textarea.value = "";
          } else {
            status.textContent = "error submitting report, please try again.";
          }
        }
    };
    xhr.send(multipart);
    status.textContent = "sending report...";
}

document.getElementById("report").addEventListener("click", evt => {
  // FIXME test
  let comments = document.getElementById("report-content").value;
  let url = window.opener.gBrowser.currentURI.spec;
  let screenshot = "test123";
  submitReport(comments, url, screenshot);
});
