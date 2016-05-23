"use strict";

let reportsServer = "http://localhost:5000/upload";
let productName = "TrackingProtection";
// FIXME get this from the addon
let version = "0.0.2";

function submitReport(comments, url, screenshot) {
    let serverURL = reportsServer;
    let xhr = new XMLHttpRequest();

    let form = {
        "ProductName": productName,
        "Version": version,
        "Comments": comments,
        "URL": url,
    };
    if (screenshot && document.getElementById("screenshot").checked) {
        form["screenshot"] = screenshot;
    }

    xhr.open("POST", serverURL, true);
    let boundary=Math.random().toString().substr(2);
    xhr.setRequestHeader("content-type",
        "multipart/form-data; charset=utf-8; boundary=" + boundary);

    let multipart = "";
    for (let key in form) {
        multipart += "--" + boundary +
            "\r\nContent-Disposition: form-data; name=\"" + key + "\"" +
            "\r\nContent-type: text/plain" +
            "\r\n\r\n" + form[key] + "\r\n";
    }
    multipart += "--" + boundary + "--\r\n";

    let status = document.getElementById("status");
    xhr.onreadystatechange = () => {
        if (xhr.readyState == 4) {
          if (xhr.status == 200) {
            console.log("report id:", xhr.responseText);
            status.textContent = "report sent, thanks!";
            let textarea = document.getElementById("report-content");
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
  let comments = document.getElementById("report-content").value;
  let url = window.opener.gBrowser.currentURI.spec;
  // FIXME probably need to use frame script to get this
  let screenshot = "test123";
  submitReport(comments, url, screenshot);
});
