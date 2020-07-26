class FormUtil {
    static validateElementValue(elementValidationInfo) {
        // create selector name for ui element id
        const selector = `#${elementValidationInfo.attribute}`;

        // get value of element id
        const value = $(selector).val();

        // create RegExp object from regex string
        const regex = new RegExp(elementValidationInfo.regex);

        // if value is optional and not set, ignore
        if (elementValidationInfo.optional && value.trim() == "") {
            $(selector).parent().removeClass("has-error has-success");
            $(selector).parent().children("span").remove();
            return true;
        }

        // check form values with each regex
        if (!regex.test(value)) {
            $(selector).parent().removeClass("has-success");
            $(selector).parent().addClass("has-error");
            $(selector).parent().children("span").remove();
            $(selector).parent().append(`<span class="glyphicon glyphicon-remove form-control-feedback"></span>`);
            return false;
        } else {
            $(selector).parent().removeClass("has-error");
            $(selector).parent().addClass("has-success");
            $(selector).parent().children("span").remove();
            $(selector).parent().append(`<span class="glyphicon glyphicon-ok form-control-feedback"></span>`);
            return true;
        }
    }

    static enableRealtimeValidation(validationInfo) {
        // provide freedback when user interact with form elements
        validationInfo.forEach(vi => {
            $(`#${vi.attribute}`).on("keyup change", () => {
                this.validateElementValue(vi);
            });
        });
    }

    // make an form read only
    static setReadOnly(selector, readOnly) {
        if (readOnly) {
            $(`${selector} .form-group`).children().each((i, el) => {
                if ($(el).data("editable") == true) {
                    $(el).attr("readonly", true);
                    $(el).attr("disabled", true);
                    $(el).addClass("no-outline");
                    $(".form-group").removeClass("has-error has-success");
                    $(".form-group").children(".form-control-feedback").remove();
                }

                // fix for empty inputs
                if (($(el).is("input") || $(el).is("textarea")) && $(el).val().trim() == "") {
                    try {
                        $(el).val("Not Provided.");
                    } catch { }
                }
            });

            // hide required labels
            $("label span.required").addClass("required-hidden");

        } else {
            $(`${selector} .form-group`).children().each((i, el) => {
                if ($(el).data("editable") == true) {
                    $(el).attr("readonly", false);
                    $(el).attr("disabled", false);
                    $(el).removeClass("no-outline");
                }

                if (($(el).is("input") || $(el).is("textarea")) && $(el).val().trim() == "Not Provided.") {
                    try {
                        $(el).val("");
                    } catch { }
                }
            });

            // show required labels
            $("label span.required").removeClass("required-hidden");
        }
    }

    // print a form
    static printForm(formId, title) {
        let table = `<table class="table table-striped">
        <tr><td colspan="2"><h3>${title}</h3></tr>`
        $(`#${formId} label`).each((i, el) => {
            let type;
            let label, data;

            const firstChild = $(el);
            const secondChild = $(el).next();


            if ($(secondChild).prop('nodeName') == "INPUT") {
                type = "text";
                label = $(firstChild).text();
                data = $(secondChild).val();
            }

            if ($(secondChild).prop('nodeName') == "SELECT") {
                type = "text";
                label = $(firstChild).text();
                data = $(`#${$(secondChild).attr("id")} option:selected`).text();
            }

            if ($(secondChild).prop('nodeName') == "IMG") {
                type = "image";
                label = $(firstChild).text();
                data = `<img src="${$(secondChild).attr("src")}" width="100px"></img>`
            }

            if (!type) return;

            table += `<tr>
                        <td style="width:30%">${label.replace("*", "")}</td>
                        <td>${data}</td>
                    <tr>`
        });

        table += "</table>";

        // create new window and print the table
        const stylesheet = "http://localhost:3000/lib/bootstrap/css/bootstrap.min.css";
        const win = window.open("", "Print", "width=500,height=300");
        win.document.write(`<html><head><link rel="stylesheet" href="${stylesheet}"></head><body>${table}</body></html>`);
        setTimeout(() => {
            win.document.close();
            win.print();
            win.close();
        }, 500);
    }

    // select an option in a dropdown using value
    static selectDropdownOptionByValue(dropdownId, optionValue) {
        $(`#${dropdownId}`).children("option").each(function () {
            $(this).removeAttr("selected");

            // get the value of current option element
            const currentValue = $(this).attr("value");

            // check if current value is equal to given value
            if (currentValue == optionValue) {
                $(this).attr("selected", "selected");
            }
        });
    }

    // select an option in a dropdown using text
    static selectDropdownOptionByText(dropdownId, optionText) {
        $(`#${dropdownId}`).children("option").each(function () {
            $(this).removeAttr("selected");

            // get the text of current option element
            const currentText = $(this).text();

            // check if current text is equal to given text
            if (currentText == optionText) {
                $(this).attr("selected", "selected");
            }
        });
    }
}

class ImageUtil {
    static getURLfromBuffer(buffer) {
        // create image url from buffer data recived from server
        const arrayBufferView = new Uint8Array(buffer.data);
        const blob = new Blob([arrayBufferView], { type: "image/png" });
        const urlCreator = window.URL || window.webkitURL;
        const imageUrl = urlCreator.createObjectURL(blob);
        return imageUrl;
    }

    static getBase64FromFile(file) {
        // create a base64 string from a file object
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }
}

class Request {
    static send(path, method, data = {}) {
        // this promise will never reject to prevent unhandled promise rejections
        return new Promise((resolve, reject) => {

            // options for sending http requests
            const options = {
                type: method,
                contentType: "application/json; charset=utf-8",
                url: `http://localhost:3000${path}`,
                data: data,
                dataType: "json"
            }

            // send json strings on POST, PUT & DELETE requests
            if (method == "POST" || method == "PUT") {
                options.data = JSON.stringify(data);
            }

            // don't send a body for delete reqeusts
            if (method == "DELETE") {
                delete options["data"];
                options["url"] += `?${jQuery.param(data)}`;
            }

            // create a new request with options
            const req = $.ajax(options);

            // when request is complete
            req.done((res) => {

                // if response doesn't have a status propery, ignore it
                if (res.status == undefined) return;

                // if response status is true, resovle the promoise
                if (res.status) {
                    resolve(res);

                } else {
                    // log the response
                    console.log(res);

                    // show error modal when status of the response is false
                    try {
                        mainWindow.showOutputModal("Error", `${res.msg}<br/><br/>Route: ${options.url}`);

                        // check if this is an authentication error (when logged out)
                        if (res.type == "auth") {
                            window.location = "noauth.html"
                        }
                    } catch (e) { }

                    // resolve the promise with false status
                    resolve({ status: false });
                }
            });

            // if request failed to complete
            req.fail((jqXHR, textStatus) => {
                // if no json response is recived, ignore it
                if (jqXHR.responseJSON == undefined) return;

                // show error modal 
                try {
                    mainWindow.showOutputModal("Error", jqXHR.responseJSON.msg);

                    // check if this is an authentication error (when logged out or session empty)
                    if (jqXHR.responseJSON.type == "auth") {
                        window.location = "noauth.html"
                    }
                } catch (e) {

                    // if no error msg is present to show, just show a generic error modal
                    console.log(e);
                    mainWindow.showOutputModal("Error", `Unable to retrive data from the server: ${textStatus}`);
                }

                // resolve the promise with false status
                resolve({ status: false });
            });
        });
    }
}

// Misc functions for useful tasks

// capitalazie first letters of words in a given string
String.prototype.capitalize = function () {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

// get today in inputtype=date compatible format
Date.prototype.today = function () {
    const now = new Date();
    const day = ("0" + now.getDate()).slice(-2);
    const month = ("0" + (now.getMonth() + 1)).slice(-2);
    return (now.getFullYear() + "-" + (month) + "-" + (day));
}