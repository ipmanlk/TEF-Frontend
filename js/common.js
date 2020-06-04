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

    static setReadOnly(selector, readOnly) {
        if (readOnly) {
            $(`${selector} .form-group`).children().each((i, el) => {
                if ($(el).data("editable") == true) {
                    $(el).attr("readonly", true);
                    $(el).attr("disabled", true);
                    $(el).addClass("no-outline");
                }
            });
        } else {
            $(`${selector} .form-group`).children().each((i, el) => {
                if ($(el).data("editable") == true) {
                    $(el).attr("readonly", false);
                    $(el).attr("disabled", false);
                    $(el).removeClass("no-outline");
                }
            });
        }
    }

    static print() {
        $("input[type=file]").hide();
        $("#fmButtons").hide();
        $("#tabHolder").hide();
        $(".form-control").addClass("form-control-no-border");
        $("select,.from-control").addClass("select-no-arrow");
        window.print();
        $("#fmButtons").show();
        $("#tabHolder").show();
        $("input[type=file]").show();
        $(".form-control").removeClass("form-control-no-border");
        $("select,.from-control").removeClass("select-no-arrow");
        return true;
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
        // send http requests and handle errors
        return new Promise((resolve, reject) => {
            const options = {
                type: method,
                contentType: "application/json; charset=utf-8",
                url: `http://localhost:3000${path}`,
                data: data,
                dataType: "json"
            }

            // send json on post bodies
            if (method == "POST" || method == "PUT" || method == "DELETE") {
                options.data = JSON.stringify(data);
            }

            const req = $.ajax(options);

            req.done((res) => {
                if (res.status == undefined) return;
                
                if (res.status) {
                    resolve(res);
                } else {
                    console.log(res);
                    try {
                        mainWindow.showOutputModal("Error", `common.js ${res.msg}`);
                        if (res.type == "auth") {
                            window.location = "noauth.html"
                        }
                    } catch (e) { }
                    reject(res.msg);
                }
            });

            req.fail((jqXHR, textStatus) => {
                // if no json response is recived, ignore
                if (jqXHR.responseJSON == undefined) return;

                try {
                    mainWindow.showOutputModal("Error", jqXHR.responseJSON.msg);
                    if (jqXHR.responseJSON.type == "auth") {
                        window.location = "noauth.html"
                    }
                } catch (e) {
                    console.log(e);
                    mainWindow.showOutputModal("Error", `Unable to retrive data from the server: ${textStatus}`);
                }
                reject(textStatus);
            });
        });
    }
}